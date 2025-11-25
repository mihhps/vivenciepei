import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase"; // Presume que você tem este import
import {
  collection,
  serverTimestamp,
  getDoc,
  doc,
  query,
  getDocs,
  orderBy,
  updateDoc, // Para a edição
} from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaMagic,
  FaSave,
  FaSync,
  FaUsers,
  FaPlusCircle,
  FaArrowLeft,
  FaSpinner,
  FaExclamationTriangle,
  FaEdit,
} from "react-icons/fa";

// ⚠️ Seus imports de serviço e estilos
import { getSugestaoPlanoAulaDUA } from "../services/geminiService"; // Presume a existência deste serviço
import "../styles/DuaPlanos.css";

// =========================================================================
// HOOKS E COMPONENTES AUXILIARES (REUTILIZADOS)
// =========================================================================

// Componente placeholder para voltar
const BotaoVoltar = () => {
  const navigate = useNavigate();
  return (
    <button
      className="botao-voltar"
      onClick={() => navigate(-1)}
      aria-label="Voltar"
    >
      <FaArrowLeft /> Voltar
    </button>
  );
};

// Sistema de Mensagens
const useMessageSystem = () => {
  const [erro, setErro] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState(null);

  const exibirMensagem = useCallback((tipo, msg) => {
    if (tipo === "erro") {
      setErro(msg);
      setMensagemSucesso(null);
    } else if (tipo === "sucesso") {
      setMensagemSucesso(msg);
      setErro(null);
    }
    setTimeout(() => {
      setErro(null);
      setMensagemSucesso(null);
    }, 6000);
  }, []);

  return { exibirMensagem, erro, mensagemSucesso };
};

// Componente Principal Auxiliar: DUA Section
const DUASection = ({
  titulo,
  descricao,
  estado,
  setEstado,
  sugestoesIA,
  carregandoIA,
  onRegenerate,
  planoPreenchido,
}) => {
  const [novaEstrategia, setNovaEstrategia] = useState("");

  const handleToggle = (estrategia) => {
    if (estado.includes(estrategia)) {
      setEstado(estado.filter((e) => e !== estrategia));
    } else {
      setEstado([...estado, estrategia]);
    }
  };

  const handleAddManual = () => {
    const trimmed = novaEstrategia.trim();
    if (trimmed && !estado.includes(trimmed)) {
      setEstado([...estado, trimmed]);
      setNovaEstrategia("");
    }
  };

  const itensExibidos = useMemo(() => {
    const uniqueItems = new Set([...estado, ...sugestoesIA]);
    return Array.from(uniqueItems);
  }, [estado, sugestoesIA]);

  return (
    <fieldset className="dua-section" disabled={carregandoIA}>
      <legend>{titulo}</legend>
      <p className="info-text">{descricao}</p>

      <button
        type="button"
        onClick={onRegenerate}
        className="botao-gerar-ia"
        disabled={carregandoIA || !planoPreenchido}
      >
        <FaMagic /> {carregandoIA ? "Gerando..." : "Gerar Sugestões DUA com IA"}
      </button>
      {!planoPreenchido && (
        <p className="aviso-ia">
          Preencha a **Turma**, **Tema** e **Objetivo Curricular** para
          habilitar a IA.
        </p>
      )}

      {carregandoIA ? (
        <div className="loading-ia">
          <FaSync className="icon-spin" /> Gerando estratégias inclusivas e
          alinhadas à BNCC...
        </div>
      ) : (
        <>
          <div className="dua-checkboxes">
            {itensExibidos.map((sugestao, index) => (
              <div key={sugestao + index} className="dua-item">
                <input
                  type="checkbox"
                  id={`${titulo.replace(/\s/g, "-")}-${index}`}
                  checked={estado.includes(sugestao)}
                  onChange={() => handleToggle(sugestao)}
                />
                <label htmlFor={`${titulo.replace(/\s/g, "-")}-${index}`}>
                  {sugestao}
                  {sugestoesIA.includes(sugestao) &&
                    !estado.includes(sugestao) && (
                      <span className="tag-ia"> (Sugestão IA)</span>
                    )}
                </label>
              </div>
            ))}
          </div>

          <div className="dua-manual-add">
            <textarea
              placeholder="Adicionar outra estratégia DUA manualmente..."
              value={novaEstrategia}
              onChange={(e) => setNovaEstrategia(e.target.value)}
              rows="1"
            />
            <button
              type="button"
              onClick={handleAddManual}
              className="botao-adicionar"
            >
              <FaPlusCircle /> Adicionar
            </button>
          </div>
        </>
      )}
    </fieldset>
  );
};

// HOOK: BUSCA DE TURMAS DO PROFESSOR (NO FIRESTORE)
const useProfessorTurmas = (usuarioLogado) => {
  const [turmasDoProfessor, setTurmasDoProfessor] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [escolaId, setEscolaId] = useState(null);

  const professorUid = usuarioLogado?.uid;
  const escolaAtivaStorage = localStorage.getItem("escolaAtiva");

  const fetchTurmas = useCallback(async () => {
    if (!professorUid) {
      setError("UID do professor não encontrado.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setTurmasDoProfessor([]);

    try {
      let idDaEscola = escolaAtivaStorage;

      const userRef = doc(db, "usuarios", professorUid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.escolas && Object.keys(userData.escolas).length > 0) {
          idDaEscola = Object.keys(userData.escolas)[0];
        }
      }

      if (!idDaEscola) {
        setError("Nenhuma escola ativa ou vinculada ao usuário.");
        setIsLoading(false);
        return;
      }

      setEscolaId(idDaEscola);

      // Busca as turmas associadas a esta professor E a esta escola
      const turmasRef = collection(db, "escolas", idDaEscola, "turmas");

      const q = query(turmasRef, orderBy("nome", "asc"));

      const querySnapshot = await getDocs(q);
      const turmas = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTurmasDoProfessor(turmas);
      if (turmas.length === 0) {
        setError("Nenhuma turma encontrada para esta escola.");
      }
    } catch (e) {
      console.error("Erro ao carregar dados do professor e turmas:", e);
      setError("Falha ao buscar turmas. Verifique a conexão.");
    } finally {
      setIsLoading(false);
    }
  }, [professorUid, escolaAtivaStorage]);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  return { turmasDoProfessor, isLoading, error, escolaId };
};

// =========================================================================
// COMPONENTE PRINCIPAL: EditarPlanoAulaDUA
// =========================================================================

export default function EditarPlanoAulaDUA() {
  const { id } = useParams();
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [carregando, setCarregando] = useState(false); // Salvar/Atualizar
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [carregandoPlano, setCarregandoPlano] = useState(true); // Carregamento do plano existente
  const navigate = useNavigate();

  const { exibirMensagem, erro, mensagemSucesso } = useMessageSystem();

  // 1. Obtém os dados do usuário do localStorage
  const usuarioLogado = useMemo(
    () =>
      JSON.parse(localStorage.getItem("usuarioLogado")) || {
        email: "professor@escola.com",
        nome: "Usuário Teste",
        cargo: "Professor Regente",
        uid: "abc12345",
      },
    []
  );

  // 2. CHAMA O HOOK DE BUSCA DE TURMAS
  const {
    turmasDoProfessor,
    isLoading: isLoadingTurmas,
    error: erroTurmas,
    escolaId,
  } = useProfessorTurmas(usuarioLogado);

  const [planoAula, setPlanoAula] = useState({
    tituloAula: "",
    data: new Date().toISOString().split("T")[0],
    turmaId: "",
    turmaNome: "",
    objetivoCurricularBNCC: "",
    conteudoTema: "",
    duracao: "",
    representacao: [],
    acaoExpressao: [],
    engajamento: [],
    materiais: "",
    observacoes: "",
  });

  const [sugestoesDUA, setSugestoesDUA] = useState({
    representacao: [],
    acaoExpressao: [],
    engajamento: [],
  });

  // LÓGICA DE BUSCA DO PLANO EXISTENTE
  useEffect(() => {
    if (!id || isLoadingTurmas) return; // Espera o ID e a lista de turmas

    const fetchPlano = async () => {
      setCarregandoPlano(true);
      try {
        const docRef = doc(db, "planosAulaDUA", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const dados = docSnap.data();

          // Popula o estado com os dados existentes
          setPlanoAula({
            tituloAula: dados.tituloAula || "",
            data: dados.data || new Date().toISOString().split("T")[0],
            turmaId: dados.turmaId || "",
            turmaNome: dados.turmaNome || "",
            objetivoCurricularBNCC: dados.objetivoCurricularBNCC || "",
            conteudoTema: dados.conteudoTema || "",
            duracao: dados.duracao || "",

            // Carrega as estratégias DUA existentes
            representacao: dados.representacao || [],
            acaoExpressao: dados.acaoExpressao || [],
            engajamento: dados.engajamento || [],

            materiais: dados.materiais || "",
            observacoes: dados.observacoes || "",
          });

          // Define a turma para o seletor
          setTurmaSelecionada(dados.turmaId || "");
        } else {
          exibirMensagem("erro", "Plano de aula não encontrado.");
          navigate("/ver-planos-aula");
        }
      } catch (error) {
        console.error("Erro ao carregar plano:", error);
        exibirMensagem("erro", "Falha ao carregar plano para edição.");
      } finally {
        setCarregandoPlano(false);
      }
    };
    fetchPlano();
  }, [id, isLoadingTurmas, exibirMensagem, navigate]);

  // Condição mínima para habilitar a IA
  const planoMinimoPreenchido = useMemo(() => {
    return (
      !!planoAula.turmaId &&
      !!planoAula.conteudoTema &&
      !!planoAula.objetivoCurricularBNCC
    );
  }, [
    planoAula.turmaId,
    planoAula.conteudoTema,
    planoAula.objetivoCurricularBNCC,
  ]);

  // Handle de Seleção de Turma
  const handleSelectTurma = (turmaId) => {
    const turma = turmasDoProfessor.find((t) => t.id === turmaId);
    setTurmaSelecionada(turmaId);
    setPlanoAula((p) => ({
      ...p,
      turmaId: turmaId,
      turmaNome: turma ? turma.nome : "",
    }));
  };

  // --- IA DUA ---
  const handleGerarSugestoesDUA = async () => {
    if (!planoMinimoPreenchido) {
      return exibirMensagem(
        "erro",
        "Preencha a Turma, o Tema e o Objetivo Curricular (BNCC) para usar a IA."
      );
    }

    setCarregandoIA(true);
    setSugestoesDUA({ representacao: [], acaoExpressao: [], engajamento: [] });

    try {
      const turmaNome = planoAula.turmaNome;
      const disciplinaProfessor = usuarioLogado.cargo;

      const { representacao, acaoExpressao, engajamento } =
        await getSugestaoPlanoAulaDUA(
          planoAula.conteudoTema,
          planoAula.objetivoCurricularBNCC,
          turmaNome,
          disciplinaProfessor
        );

      setSugestoesDUA({ representacao, acaoExpressao, engajamento });

      // Selecionar automaticamente as sugestões (sem repetir as já existentes)
      setPlanoAula((prev) => ({
        ...prev,
        representacao: Array.from(
          new Set([...prev.representacao, ...representacao.slice(0, 3)])
        ),
        acaoExpressao: Array.from(
          new Set([...prev.acaoExpressao, ...acaoExpressao.slice(0, 3)])
        ),
        engajamento: Array.from(
          new Set([...prev.engajamento, ...engajamento.slice(0, 3)])
        ),
      }));

      exibirMensagem(
        "sucesso",
        "Sugestões DUA alinhadas à BNCC geradas com sucesso!"
      );
    } catch (error) {
      exibirMensagem(
        "erro",
        `Erro na IA: Não foi possível gerar o plano. Tente novamente. Detalhes: ${error.message}`
      );
      console.error("Erro IA DUA:", error);
    } finally {
      setCarregandoIA(false);
    }
  };

  // --- LÓGICA DE ATUALIZAÇÃO DO PLANO ---
  const handleUpdatePlanoAulaDUA = async () => {
    if (!planoMinimoPreenchido || !planoAula.tituloAula) {
      return exibirMensagem(
        "erro",
        "Preencha o Título, Tema e Objetivo Curricular (BNCC)."
      );
    }
    if (!escolaId) {
      return exibirMensagem(
        "erro",
        "ID da escola não identificado. Recarregue a página."
      );
    }

    setCarregando(true);
    try {
      const planoRef = doc(db, "planosAulaDUA", id);

      const dadosParaAtualizar = {
        ...planoAula,
        atualizadoEm: serverTimestamp(), // Campo de data de atualização
      };

      await updateDoc(planoRef, dadosParaAtualizar);

      exibirMensagem("sucesso", "Plano de Aula DUA atualizado com sucesso!");

      // ✅ CORREÇÃO FINAL: Redireciona para a lista de planos
      navigate("/ver-planos-aula");
    } catch (err) {
      exibirMensagem("erro", `Erro ao atualizar Plano de Aula: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  };

  // --- RENDERIZAÇÃO CONDICIONAL PRINCIPAL ---
  if (isLoadingTurmas || carregandoPlano) {
    return (
      <div className="container-plano-dua">
        <div className="loading-state">
          <FaSpinner className="icon-spin" />{" "}
          {isLoadingTurmas
            ? "Buscando turmas e contexto..."
            : "Carregando plano de aula para edição..."}
        </div>
      </div>
    );
  }

  // --- ESTRUTURA JSX DA PÁGINA ---
  return (
    <div className="container-plano-dua" aria-busy={carregando}>
      <div className="card-header">
        <BotaoVoltar />
        <button
          className="botao-secundario"
          onClick={() => navigate("/ver-planos-aula")}
        >
          <FaUsers /> Ver Meus Planos
        </button>
      </div>
      <h1 className="titulo-principal">
        <FaEdit /> Editar Plano de Aula com DUA
      </h1>

      {erro && (
        <div className="mensagem-erro">
          <FaExclamationTriangle /> {erro}
        </div>
      )}
      {mensagemSucesso && (
        <div className="mensagem-sucesso">{mensagemSucesso}</div>
      )}

      {/* 1. SELETOR DE TURMA (Pré-selecionado) */}
      <div className="seletor-turma-contexto">
        <label htmlFor="selecionar-turma" className="form-label">
          Turma:
        </label>
        <select
          id="selecionar-turma"
          value={turmaSelecionada}
          onChange={(e) => handleSelectTurma(e.target.value)}
          disabled={carregando || carregandoIA || isLoadingTurmas}
          className="filter-select"
          required
        >
          <option value="">Selecione uma turma</option>
          {turmasDoProfessor.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}
            </option>
          ))}
        </select>
        {carregandoPlano && (
          <div className="feedback-loading">
            <FaSpinner className="spin" /> Carregando turma do plano...
          </div>
        )}
      </div>

      {turmaSelecionada ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdatePlanoAulaDUA();
          }}
        >
          <fieldset disabled={carregando || carregandoIA}>
            {/* 2. DADOS GERAIS E CONTEXTO (BNCC) */}
            <legend>Contexto Curricular (BNCC)</legend>
            <div className="form-group-row">
              <div className="form-group">
                <label>Título da Aula:</label>
                <input
                  type="text"
                  value={planoAula.tituloAula}
                  onChange={(e) =>
                    setPlanoAula((p) => ({ ...p, tituloAula: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-group-half">
                <label>Data:</label>
                <input
                  type="date"
                  value={planoAula.data}
                  onChange={(e) =>
                    setPlanoAula((p) => ({ ...p, data: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-group-half">
                <label>Duração Prevista (min):</label>
                <input
                  type="number"
                  placeholder="Ex: 50"
                  value={planoAula.duracao}
                  onChange={(e) =>
                    setPlanoAula((p) => ({ ...p, duracao: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>Conteúdo / Tema Central da Aula:</label>
              <textarea
                placeholder="Ex: O Ciclo da Água e a importância da preservação ambiental."
                value={planoAula.conteudoTema}
                onChange={(e) =>
                  setPlanoAula((p) => ({ ...p, conteudoTema: e.target.value }))
                }
                rows="2"
                required
              />
            </div>

            <div className="form-group">
              <label>Objetivo Curricular (BNCC) ou Geral:</label>
              <textarea
                placeholder="Ex: (EF03CI04) Identificar as principais características do Ciclo da Água, relacionando-o com o consumo consciente."
                value={planoAula.objetivoCurricularBNCC}
                onChange={(e) =>
                  setPlanoAula((p) => ({
                    ...p,
                    objetivoCurricularBNCC: e.target.value,
                  }))
                }
                rows="2"
                required
              />
            </div>
          </fieldset>

          {/* 3. SEÇÕES DUA (Integrando IA) */}
          <div className="dua-container">
            <h3 className="subtitulo-dua">
              Estratégias de Inclusão Baseadas no DUA
            </h3>

            {/* Repetição do DUASection para cada princípio */}
            <DUASection
              titulo="1. Princípio da REPRESENTAÇÃO"
              descricao="Garantir múltiplas formas de adquirir conhecimento. (Como o aluno recebe a informação?)"
              estado={planoAula.representacao}
              setEstado={(novoEstado) =>
                setPlanoAula((p) => ({ ...p, representacao: novoEstado }))
              }
              sugestoesIA={sugestoesDUA.representacao}
              carregandoIA={carregandoIA}
              onRegenerate={handleGerarSugestoesDUA}
              planoPreenchido={planoMinimoPreenchido}
            />
            {/* ... Ação e Expressão ... */}
            <DUASection
              titulo="2. Princípio da AÇÃO E EXPRESSÃO"
              descricao="Garantir múltiplas formas de demonstrar conhecimento. (Como o aluno mostra o que aprendeu?)"
              estado={planoAula.acaoExpressao}
              setEstado={(novoEstado) =>
                setPlanoAula((p) => ({ ...p, acaoExpressao: novoEstado }))
              }
              sugestoesIA={sugestoesDUA.acaoExpressao}
              carregandoIA={carregandoIA}
              onRegenerate={handleGerarSugestoesDUA}
              planoPreenchido={planoMinimoPreenchido}
            />
            {/* ... Engajamento ... */}
            <DUASection
              titulo="3. Princípio do ENGAJAMENTO"
              descricao="Garantir múltiplas formas de motivação e relevância. (Como manter o aluno interessado?)"
              estado={planoAula.engajamento}
              setEstado={(novoEstado) =>
                setPlanoAula((p) => ({ ...p, engajamento: novoEstado }))
              }
              sugestoesIA={sugestoesDUA.engajamento}
              carregandoIA={carregandoIA}
              onRegenerate={handleGerarSugestoesDUA}
              planoPreenchido={planoMinimoPreenchido}
            />
          </div>

          {/* 4. MATERIAIS E OBSERVAÇÕES FINAIS */}
          <fieldset disabled={carregando || carregandoIA}>
            <legend>Materiais e Observações Finais</legend>
            <div className="form-group">
              <label>Recursos e Materiais Necessários:</label>
              <textarea
                placeholder="Projetor, tablets, material tátil, modelos 3D, etc."
                value={planoAula.materiais}
                onChange={(e) =>
                  setPlanoAula((p) => ({ ...p, materiais: e.target.value }))
                }
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Observações/ Reflexões (Pós-Aula):</label>
              <textarea
                placeholder="O que observar durante e após a aula para avaliar a eficácia das estratégias."
                value={planoAula.observacoes}
                onChange={(e) =>
                  setPlanoAula((p) => ({ ...p, observacoes: e.target.value }))
                }
                rows="3"
              />
            </div>
          </fieldset>

          <button
            type="submit"
            className="botao-salvar-plano"
            disabled={carregando || carregandoIA}
          >
            {carregando ? (
              <>
                <FaSpinner className="spin-button" /> Atualizando Plano...
              </>
            ) : (
              <>
                <FaSave /> Salvar Alterações do Plano DUA
              </>
            )}
          </button>
        </form>
      ) : (
        !isLoadingTurmas &&
        !erroTurmas && (
          <div className="aviso-selecao">
            Selecione uma turma para editar o Plano de Aula DUA.
          </div>
        )
      )}
    </div>
  );
}
