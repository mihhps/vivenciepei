// src/pages/VincularEscolas.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getDocs, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase"; // Certifique-se que o caminho para o firebase config está correto
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar"; // Certifique-se que o caminho para o BotaoVoltar está correto

// --- Importar PropTypes ---
import * as PropTypesImport from "prop-types"; // Importa tudo de prop-types como um objeto

// --- IMPORTAR O ARQUIVO CSS ---
import "./VincularEscolas.css"; // Certifique-se que o caminho está correto

// --- Componente Auxiliar para renderizar os checkboxes de escolas ---
const EscolaCheckboxes = React.memo(
  ({ prof, escolas, edicoesPendentes, toggleEscola, salvarEscolas }) => {
    return (
      <>
        <div className="checkbox-container-list">
          {" "}
          {/* Usando a classe de lista */}
          {escolas.map((escola) => (
            <label key={escola.id} className="checkbox-label">
              <input
                type="checkbox"
                // CORREÇÃO: Usando parênteses para precedência do operador ??
                checked={
                  edicoesPendentes[prof.id]?.[escola.id] ??
                  !!prof.escolas?.[escola.id]
                }
                onChange={() => toggleEscola(prof.id, escola.id)}
              />
              <span>{escola.nome}</span>
            </label>
          ))}
        </div>
        {/* Exibir o botão salvar apenas se houver edições pendentes para este professor */}
        {edicoesPendentes[prof.id] &&
          Object.keys(edicoesPendentes[prof.id]).length > 0 && (
            <button
              onClick={() =>
                salvarEscolas(
                  prof.id,
                  edicoesPendentes[prof.id] || {} // Passa as edições pendentes para a função de salvar
                )
              }
              className="vinculacao-botao-base vinculacao-botao-salvar"
            >
              Salvar alterações
            </button>
          )}
      </>
    );
  }
);

// === ADICIONADO: VALIDAÇÃO DE PROPS PARA EscolaCheckboxes ===
EscolaCheckboxes.propTypes = {
  prof: PropTypesImport.default.object.isRequired, // 'prof' deve ser um objeto e é obrigatório
  escolas: PropTypesImport.default.array.isRequired, // 'escolas' deve ser um array e é obrigatório
  edicoesPendentes: PropTypesImport.default.object.isRequired, // 'edicoesPendentes' deve ser um objeto e é obrigatório
  toggleEscola: PropTypesImport.default.func.isRequired, // 'toggleEscola' deve ser uma função e é obrigatório
  salvarEscolas: PropTypesImport.default.func.isRequired, // 'salvarEscolas' deve ser uma função e é obrigatório
};

// --- Componente Principal: VincularEscolas ---
export default function VincularEscolas() {
  const [professores, setProfessores] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null); // Pode ser null, um objeto escola, ou "semVinculo"
  const [modoEdicaoGeral, setModoEdicaoGeral] = useState(false); // Controla o modo de edição para a lista geral de professores de uma escola
  const [edicoesPendentes, setEdicoesPendentes] = useState({}); // Formato: { profId: { escolaId: true/false } }
  const [isLoading, setIsLoading] = useState(true); // Estado de carregamento
  const [error, setError] = useState(null); // Estado para exibir mensagens de erro
  const navigate = useNavigate();

  // Efeito para verificação de autorização do usuário ao carregar a página
  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (
      !usuario ||
      !(usuario.perfil === "gestao" || usuario.perfil === "desenvolvedor")
    ) {
      alert("Apenas perfis autorizados podem acessar esta página.");
      navigate("/");
    }
  }, [navigate]); // navigate é uma dependência do useEffect

  // Função para carregar dados de usuários (professores) e escolas do Firebase
  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Limpa qualquer erro anterior
    try {
      const usuariosSnap = await getDocs(collection(db, "usuarios"));
      const escolasSnap = await getDocs(collection(db, "escolas"));

      // Filtra usuários que são perfis de professores ou AEE/diretores, etc.
      const professoresFiltrados = usuariosSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((u) =>
          [
            "professor",
            "diretor",
            "diretor adjunto",
            "orientador pedagógico",
            "aee",
          ].includes(u.perfil?.toLowerCase())
        );

      const escolasListadas = escolasSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProfessores(professoresFiltrados);
      setEscolas(escolasListadas);

      // Define a escola selecionada inicial se ainda não estiver definida
      if (!escolaSelecionada) {
        if (escolasListadas.length > 0) {
          setEscolaSelecionada(escolasListadas[0]); // Seleciona a primeira escola por padrão
        } else {
          setEscolaSelecionada("semVinculo"); // Ou "Professores sem vínculo" se não houver escolas
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [escolaSelecionada]); // escolaSelecionada é uma dependência para evitar loop de inicialização

  // Efeito para carregar dados na montagem inicial do componente
  useEffect(() => {
    carregarDados();
  }, [carregarDados]); // carregarDados é uma dependência porque é um useCallback

  // Lógica para alternar o vínculo de uma escola para um professor nas edições pendentes
  const toggleEscola = useCallback(
    (profId, escolaId) => {
      setEdicoesPendentes((prev) => {
        const professorEdicoes = { ...(prev[profId] || {}) };
        // Encontra o estado original de vínculo da escola para este professor
        const isCurrentlyLinked = professores.find((p) => p.id === profId)
          ?.escolas?.[escolaId];

        // Alterna o estado da escola para o professor
        if (professorEdicoes[escolaId] === undefined) {
          // Se não foi editado ainda, defina como o oposto do estado atual
          professorEdicoes[escolaId] = !isCurrentlyLinked;
        } else {
          // Se já foi editado, simplesmente alterna o estado atual na edição pendente
          professorEdicoes[escolaId] = !professorEdicoes[escolaId];
        }

        // Se o estado editado voltou a ser igual ao estado original, remova-o das edições pendentes
        if (professorEdicoes[escolaId] === isCurrentlyLinked) {
          delete professorEdicoes[escolaId];
        }

        // Se não há mais edições pendentes para este professor, remova a entrada do professor
        if (Object.keys(professorEdicoes).length === 0) {
          const novo = { ...prev };
          delete novo[profId];
          return novo;
        }

        return { ...prev, [profId]: professorEdicoes };
      });
    },
    [professores] // professores é uma dependência para acessar prof.escolas
  );

  // Função para salvar as escolas vinculadas de um professor no Firebase
  const salvarEscolas = useCallback(
    async (profId, edicoesDoProfessor) => {
      setIsLoading(true); // Ativa o loading para feedback visual
      setError(null); // Limpa erros anteriores
      try {
        const professorAtual = professores.find((p) => p.id === profId);
        if (!professorAtual)
          throw new Error("Professor não encontrado para salvar.");

        // Crie o objeto final de escolas combinando o estado original com as edições pendentes
        const escolasFinais = { ...(professorAtual.escolas || {}) };
        for (const escolaId in edicoesDoProfessor) {
          if (edicoesDoProfessor[escolaId] === true) {
            escolasFinais[escolaId] = true;
          } else if (edicoesDoProfessor[escolaId] === false) {
            delete escolasFinais[escolaId];
          }
        }

        // Atualiza o campo 'escolas' do documento do professor na coleção 'usuarios'
        await updateDoc(doc(db, "usuarios", profId), {
          escolas: escolasFinais,
        });

        // Remove as edições pendentes para o professor que foi salvo
        setEdicoesPendentes((prev) => {
          const novo = { ...prev };
          delete novo[profId];
          return novo;
        });

        await carregarDados(); // Recarrega os dados para refletir as mudanças mais recentes
        alert("Vínculos atualizados com sucesso!"); // Considere usar uma biblioteca de notificação mais amigável
      } catch (err) {
        console.error("Erro ao salvar:", err);
        setError("Erro ao salvar vínculos. Por favor, tente novamente.");
      } finally {
        setIsLoading(false); // Desativa o loading
      }
    },
    [carregarDados, professores] // carregarDados e professores são dependências
  );

  // Filtra professores com base na escola selecionada ou se estão sem vínculo
  const professoresFiltradosParaExibicao = useMemo(() => {
    if (escolaSelecionada === "semVinculo") {
      return professores.filter(
        (prof) => !prof.escolas || Object.keys(prof.escolas).length === 0
      );
    } else if (escolaSelecionada && typeof escolaSelecionada === "object") {
      return professores.filter((prof) =>
        Object.keys(prof.escolas || {}).includes(escolaSelecionada.id)
      );
    }
    return []; // Retorna um array vazio se nenhuma escola estiver selecionada ou estado inválido
  }, [professores, escolaSelecionada]);

  // Renderização do Loader global se a tela estiver carregando e não há erro principal
  if (isLoading && !error) {
    return <Loader />;
  }

  // Renderização da mensagem de erro principal se houver um erro
  if (error && !isLoading) {
    return (
      <div className="vinculacao-container">
        <BotaoVoltar />
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="vinculacao-container">
      <div className="vinculacao-card">
        {/* Usando as classes CSS refatoradas para o BotãoVoltar */}
        <BotaoVoltar className="vinculacao-botao-base vinculacao-botao-voltar" />

        <h2 className="vinculacao-titulo">Vincular Escolas a Professores</h2>

        <div className="vinculacao-abas-container">
          {escolas.map((escola) => (
            <button
              key={escola.id}
              // Aplicando a classe 'active' dinamicamente para a aba selecionada
              className={`vinculacao-aba ${
                escolaSelecionada?.id === escola.id ? "active" : ""
              }`}
              onClick={() => {
                setEscolaSelecionada(escola);
                setModoEdicaoGeral(false); // Sai do modo de edição geral ao mudar de aba
                setEdicoesPendentes({}); // Limpa edições pendentes ao mudar de aba
              }}
            >
              {escola.nome}
            </button>
          ))}
          <button
            // Aplicando a classe 'active' dinamicamente para a aba "Professores sem vínculo"
            className={`vinculacao-aba ${
              escolaSelecionada === "semVinculo" ? "active" : ""
            }`}
            onClick={() => {
              setEscolaSelecionada("semVinculo");
              setModoEdicaoGeral(false); // Sai do modo de edição geral ao mudar de aba
              setEdicoesPendentes({}); // Limpa edições pendentes ao mudar de aba
            }}
          >
            Professores sem vínculo
          </button>
        </div>

        {escolaSelecionada && (
          <>
            <h3 className="vinculacao-subtitulo">
              {escolaSelecionada === "semVinculo"
                ? "Professores sem vínculo"
                : `Professores vinculados à ${escolaSelecionada.nome}`}
            </h3>

            <ul className="vinculacao-lista">
              {/* Renderização condicional da lista de professores com base no modo de exibição/edição */}
              {/* O modo de edição para "sem vínculo" é sempre ativo */}
              {/* Para escolas específicas, a edição é ativada por modoEdicaoGeral */}
              {escolaSelecionada === "semVinculo" || modoEdicaoGeral ? (
                // Modo de Edição (para "sem vínculo" ou quando modoEdicaoGeral está ativo)
                professoresFiltradosParaExibicao.length === 0 ? (
                  <p className="info-message">
                    Nenhum professor encontrado{" "}
                    {escolaSelecionada === "semVinculo"
                      ? "sem vínculo."
                      : `vinculado a ${escolaSelecionada?.nome}`}
                    .
                  </p>
                ) : (
                  professoresFiltradosParaExibicao.map((prof) => (
                    <div key={prof.id} className="vinculacao-professor-card">
                      <h4>{`${prof.nome} (${
                        prof.email
                      }) - ${prof.perfil?.toUpperCase()}`}</h4>
                      <EscolaCheckboxes
                        prof={prof} // Passa o objeto prof completo
                        escolas={escolas} // Sempre passa a lista completa de todas as escolas
                        edicoesPendentes={edicoesPendentes}
                        toggleEscola={toggleEscola}
                        salvarEscolas={salvarEscolas}
                      />
                    </div>
                  ))
                )
              ) : // Modo de Visualização (apenas para escolas específicas quando modoEdicaoGeral está inativo)
              professoresFiltradosParaExibicao.length === 0 ? (
                <p className="info-message">
                  Nenhum professor encontrado vinculado a{" "}
                  {escolaSelecionada?.nome}.
                </p>
              ) : (
                professoresFiltradosParaExibicao.map((prof) => (
                  <div key={prof.id} className="vinculacao-professor-card">
                    <h4>
                      {prof.nome} ({prof.email})
                    </h4>
                    {/* Opcional: exibir as escolas já vinculadas de forma não editável aqui */}
                    {/* <p>Escolas: {Object.keys(prof.escolas || {}).map(id => escolas.find(e => e.id === id)?.nome).join(', ')}</p> */}
                  </div>
                ))
              )}
            </ul>

            {/* Botão de Edição Geral - Apenas para escolas específicas e quando não está no modo de edição */}
            {escolaSelecionada !== "semVinculo" && !modoEdicaoGeral && (
              <button
                className="vinculacao-botao-base vinculacao-botao"
                onClick={() => setModoEdicaoGeral(true)}
              >
                Editar vínculos de professores desta escola
              </button>
            )}

            {/* Botão de Cancelar Edição Geral - Apenas para escolas específicas e quando está no modo de edição */}
            {modoEdicaoGeral && escolaSelecionada !== "semVinculo" && (
              <button
                className="vinculacao-botao-base vinculacao-botao-cancelar"
                onClick={() => {
                  setModoEdicaoGeral(false);
                  setEdicoesPendentes({}); // Limpa edições pendentes ao cancelar
                  carregarDados(); // Recarrega os dados para restaurar o estado original
                }}
              >
                Cancelar edição
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
