import React, { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../firebase";
import {
  addDoc,
  collection,
  getDoc,
  doc,
  query,
  getDocs,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaSave,
  FaMagic,
  FaPlus,
  FaCheckCircle,
  FaLightbulb,
  FaBrain,
  FaHeart,
  FaHandHoldingHeart,
  FaFolderOpen,
  FaTools,
  FaCommentDots,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getSugestaoPlanoAulaDUA } from "../services/geminiService";
import "../styles/CriarPlanoDUA.css";

const DUA_INFO = {
  inicio: {
    titulo: "Contexto da Aula",
    texto:
      "Defina o cenário da aprendizagem. Uma base sólida permite que a inclusão aconteça naturalmente.",
    dica: "Quanto mais detalhado o tema, melhor a IA consegue ajudar.",
    icon: <FaHandHoldingHeart size={40} />,
  },
  representacao: {
    titulo: "1. Representação",
    texto:
      "O 'O QUE'. Como a informação é apresentada aos alunos? Use múltiplos formatos.",
    dica: "Pense em alunos visuais, auditivos e cinestésicos.",
    icon: <FaBrain size={40} />,
    color: "#8b5cf6",
  },
  acao: {
    titulo: "2. Ação e Expressão",
    texto: "O 'COMO'. Como os alunos navegam e demonstram o que aprenderam?",
    dica: "Ofereça opções de resposta (oral, escrita, desenho, construção).",
    icon: <FaCheckCircle size={40} />,
    color: "#3b82f6",
  },
  engajamento: {
    titulo: "3. Engajamento",
    texto: "O 'PORQUÊ'. Como captar o interesse e manter a motivação?",
    dica: "Conecte com a realidade deles e promova a colaboração.",
    icon: <FaHeart size={40} />,
    color: "#ec4899",
  },
  finalizacao: {
    titulo: "Recursos e Detalhes",
    texto:
      "O que você vai precisar para essa aula acontecer? Registre os materiais e observações finais.",
    dica: "Liste tudo que precisa reservar com antecedência.",
    icon: <FaTools size={40} />,
    color: "#f59e0b",
  },
};

export default function CriarPlanoAulaDUA() {
  const navigate = useNavigate();
  const [etapaAtual, setEtapaAtual] = useState("inicio");
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Estados para dados do banco
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(true);

  // Configurações do Usuário e Ano (Baseado no seu Cadastro de Turma)
  const usuario = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado") || "{}"),
    []
  );
  const anoAtivo = Number(localStorage.getItem("anoExercicio")) || 2025;
  const escolaIdContexto = localStorage.getItem("escolaId");

  const [plano, setPlano] = useState({
    tituloAula: "",
    turmaId: "",
    turmaNome: "",
    conteudoTema: "",
    objetivoCurricularBNCC: "",
    representacao: [],
    acaoExpressao: [],
    engajamento: [],
    materiais: "",
    observacoes: "",
  });

  const [sugestoesIA, setSugestoesIA] = useState({
    representacao: [],
    acaoExpressao: [],
    engajamento: [],
  });

  // ✅ LÓGICA DE BUSCA DE TURMAS (IDÊNTICA AO CADASTRO DE TURMA)
  const fetchTurmas = useCallback(async () => {
    if (!escolaIdContexto) {
      toast.error("Nenhuma escola selecionada no contexto.");
      setLoadingTurmas(false);
      return;
    }

    setLoadingTurmas(true);
    try {
      // Busca dentro da subcoleção da escola específica
      const turmasRef = collection(db, "escolas", escolaIdContexto, "turmas");
      const snap = await getDocs(turmasRef);

      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Filtra pelo ano ativo (Lógica do seu Cadastro de Turma)
      const filtradas = data.filter(
        (t) => !t.ano || Number(t.ano) === anoAtivo
      );

      setTurmas(filtradas.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (e) {
      console.error("Erro ao carregar turmas:", e);
      toast.error("Erro ao carregar lista de turmas.");
    } finally {
      setLoadingTurmas(false);
    }
  }, [escolaIdContexto, anoAtivo]);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  const handleIA = async () => {
    if (!plano.conteudoTema || !plano.objetivoCurricularBNCC) {
      toast.warning("Preencha o tema e a BNCC primeiro!");
      return;
    }
    setCarregandoIA(true);
    try {
      const res = await getSugestaoPlanoAulaDUA(
        plano.conteudoTema,
        plano.objetivoCurricularBNCC,
        plano.turmaNome,
        usuario.cargo || "Professor"
      );
      setSugestoesIA(res);
      setEtapaAtual("representacao");
      toast.success("Estratégias sugeridas pela IA!");
    } catch (e) {
      toast.error("Erro ao conectar com a IA.");
    } finally {
      setCarregandoIA(false);
    }
  };

  const salvarPlano = async () => {
    if (!plano.tituloAula || !plano.turmaId) {
      toast.warning("Título e Turma são obrigatórios!");
      return;
    }
    setSalvando(true);
    try {
      await addDoc(collection(db, "planosAulaDUA"), {
        ...plano,
        criadorId: usuario.uid,
        criadorNome: usuario.nome || "Professor(a)",
        escolaId: escolaIdContexto,
        anoLetivo: anoAtivo,
        dataCriacao: serverTimestamp(),
        data: new Date().toISOString(),
      });
      toast.success("Plano DUA salvo com sucesso!");
      setTimeout(() => navigate("/ver-planos-aula"), 1500);
    } catch (e) {
      toast.error("Erro ao salvar o plano.");
    } finally {
      setSalvando(false);
    }
  };

  const toggleItem = (campo, valor) => {
    setPlano((prev) => {
      const lista = prev[campo];
      return lista.includes(valor)
        ? { ...prev, [campo]: lista.filter((i) => i !== valor) }
        : { ...prev, [campo]: [...lista, valor] };
    });
  };

  const infoAtual = DUA_INFO[etapaAtual];
  const steps = [
    "inicio",
    "representacao",
    "acao",
    "engajamento",
    "finalizacao",
  ];

  return (
    <div className="dua-premium-container">
      <ToastContainer theme="dark" />

      <header className="premium-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>

        <div className="progress-bar-container">
          <div className="steps-indicator">
            {steps.map((step, idx) => (
              <div
                key={step}
                className={`step-dot ${step === etapaAtual ? "active" : ""} ${
                  steps.indexOf(etapaAtual) > idx ? "completed" : ""
                }`}
                onClick={() => setEtapaAtual(step)}
              >
                {idx + 1}
              </div>
            ))}
          </div>
          <span className="step-label">{infoAtual.titulo}</span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            onClick={() => navigate("/ver-planos-aula")}
            className="btn-ghost-plans"
          >
            <FaFolderOpen />
            <span>Meus Planos</span>
          </button>

          <button
            type="button"
            className="btn-save-final"
            onClick={salvarPlano}
            disabled={salvando}
          >
            {salvando ? (
              <div className="loader-mini"></div>
            ) : (
              <>
                <FaSave />
                <span>Salvar Plano</span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="premium-grid">
        <section className="interaction-column">
          {etapaAtual === "inicio" && (
            <div className="form-inicio animate-slide-up">
              <div className="input-group">
                <label>Turma (Exercício {anoAtivo})</label>
                <select
                  value={plano.turmaId}
                  onChange={(e) => {
                    const t = turmas.find((x) => x.id === e.target.value);
                    setPlano({
                      ...plano,
                      turmaId: e.target.value,
                      turmaNome: t?.nome || "",
                    });
                  }}
                  disabled={loadingTurmas}
                >
                  <option value="">
                    {loadingTurmas
                      ? "Carregando turmas..."
                      : "Selecione a turma"}
                  </option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} - {t.turno}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Título da Aula</label>
                <input
                  type="text"
                  value={plano.tituloAula}
                  onChange={(e) =>
                    setPlano({ ...plano, tituloAula: e.target.value })
                  }
                  placeholder="Ex: Fotossíntese na Prática"
                />
              </div>

              <div className="input-group">
                <label>Tema / Objeto de Conhecimento</label>
                <textarea
                  rows={3}
                  value={plano.conteudoTema}
                  onChange={(e) =>
                    setPlano({ ...plano, conteudoTema: e.target.value })
                  }
                  placeholder="Sobre o que é a aula?"
                />
              </div>

              <div className="input-group">
                <label>Habilidade BNCC</label>
                <textarea
                  rows={2}
                  value={plano.objetivoCurricularBNCC}
                  onChange={(e) =>
                    setPlano({
                      ...plano,
                      objetivoCurricularBNCC: e.target.value,
                    })
                  }
                  placeholder="Códigos BNCC..."
                />
              </div>

              <button
                className="btn-magic-big"
                onClick={handleIA}
                disabled={carregandoIA}
              >
                {carregandoIA ? (
                  "A IA está analisando..."
                ) : (
                  <>
                    <FaMagic /> Gerar Sugestões DUA
                  </>
                )}
              </button>
            </div>
          )}

          {(etapaAtual === "representacao" ||
            etapaAtual === "acao" ||
            etapaAtual === "engajamento") && (
            <ChecklistSection
              itensSelecionados={
                plano[etapaAtual === "acao" ? "acaoExpressao" : etapaAtual]
              }
              sugestoes={
                sugestoesIA[
                  etapaAtual === "acao" ? "acaoExpressao" : etapaAtual
                ]
              }
              cor={infoAtual.color}
              onToggle={(item) =>
                toggleItem(
                  etapaAtual === "acao" ? "acaoExpressao" : etapaAtual,
                  item
                )
              }
              onRequestIA={handleIA}
            />
          )}

          {etapaAtual === "finalizacao" && (
            <div className="form-inicio animate-slide-up">
              <div className="input-group">
                <label>
                  <FaTools /> Recursos e Materiais
                </label>
                <textarea
                  rows={4}
                  value={plano.materiais}
                  onChange={(e) =>
                    setPlano({ ...plano, materiais: e.target.value })
                  }
                  placeholder="O que será usado?"
                />
              </div>
              <div className="input-group">
                <label>
                  <FaCommentDots /> Observações
                </label>
                <textarea
                  rows={4}
                  value={plano.observacoes}
                  onChange={(e) =>
                    setPlano({ ...plano, observacoes: e.target.value })
                  }
                  placeholder="Notas pedagógicas..."
                />
              </div>
            </div>
          )}

          {etapaAtual !== "inicio" && (
            <div className="nav-buttons">
              <button
                className="btn-prev"
                onClick={() =>
                  setEtapaAtual(steps[steps.indexOf(etapaAtual) - 1])
                }
              >
                Voltar
              </button>
              {etapaAtual !== "finalizacao" ? (
                <button
                  className="btn-next"
                  onClick={() =>
                    setEtapaAtual(steps[steps.indexOf(etapaAtual) + 1])
                  }
                >
                  Próximo
                </button>
              ) : (
                <button className="btn-finish" onClick={salvarPlano}>
                  Concluir
                </button>
              )}
            </div>
          )}
        </section>

        <aside
          className="educational-column"
          style={{ "--theme-color": infoAtual.color || "#3b82f6" }}
        >
          <div className="edu-card">
            <div className="edu-icon-circle">{infoAtual.icon}</div>
            <h2>{infoAtual.titulo}</h2>
            <p className="edu-text">{infoAtual.texto}</p>
            <div className="edu-tip-box">
              <FaLightbulb className="tip-icon" />
              <p>{infoAtual.dica}</p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

// Sub-componente Checklist
function ChecklistSection({
  itensSelecionados = [],
  sugestoes = [],
  cor,
  onToggle,
  onRequestIA,
}) {
  const [novo, setNovo] = useState("");
  const todosItens = Array.from(new Set([...itensSelecionados, ...sugestoes]));

  return (
    <div className="checklist-container">
      <div className="checklist-scroll">
        {todosItens.length === 0 && (
          <button className="btn-small-ghost" onClick={onRequestIA}>
            <FaMagic /> Sugerir com IA
          </button>
        )}
        {todosItens.map((item, idx) => (
          <div
            key={idx}
            className={`check-card ${
              itensSelecionados.includes(item) ? "active" : ""
            }`}
            onClick={() => onToggle(item)}
            style={{ "--accent-color": cor }}
          >
            <div className="check-icon">
              {itensSelecionados.includes(item) && <FaCheckCircle />}
            </div>
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="add-manual-row">
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Adicionar manual..."
          onKeyDown={(e) => e.key === "Enter" && (onToggle(novo), setNovo(""))}
        />
        <button
          onClick={() => {
            onToggle(novo);
            setNovo("");
          }}
        >
          <FaPlus />
        </button>
      </div>
    </div>
  );
}
