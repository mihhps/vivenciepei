// src/pages/VincularEscolas.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getDocs, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase"; // Certifique-se que o caminho para o firebase config está correto
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import BotaoVoltar from "../components/BotaoVoltar"; // Certifique-se que o caminho para o BotaoVoltar está correto

// --- Importar PropTypes para validação de props (boa prática) ---
import PropTypes from "prop-types";

// --- Importar a biblioteca de notificações (Ex: react-toastify) ---
// Você precisará instalar: npm install react-toastify
import { toast, ToastContainer } from "react-toastify";
// Importe o CSS global dela no seu index.js ou App.js: import 'react-toastify/dist/ReactToastify.css';

// --- IMPORTAR O ARQUIVO CSS ---
import "./VincularEscolas.css";

// --- Componente Auxiliar para renderizar os checkboxes de escolas (agora tags) ---
const EscolaCheckboxes = React.memo(
  ({ prof, escolas, edicoesPendentes, toggleEscola, salvarEscolas }) => {
    // Verifica se há alguma edição pendente para este professor
    const hasPendingEdits = useMemo(() => {
      return (
        edicoesPendentes[prof.id] &&
        Object.keys(edicoesPendentes[prof.id]).length > 0
      );
    }, [edicoesPendentes, prof.id]);

    return (
      <>
        <div className="checkbox-container-list">
          {escolas.map((escola) => {
            // Verifica o estado atual de vínculo (original ou pendente)
            const isCurrentlyLinked = prof.escolas?.[escola.id] || false;
            const isPendingChange = edicoesPendentes[prof.id]?.[escola.id];

            // Determina o estado final (considerando a edição pendente)
            const isChecked =
              isPendingChange !== undefined
                ? isPendingChange
                : isCurrentlyLinked;

            return (
              <label key={escola.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isChecked} // Usa o estado final determinado
                  onChange={() =>
                    toggleEscola(prof.id, escola.id, isCurrentlyLinked)
                  }
                />
                <span>{escola.nome}</span>
              </label>
            );
          })}
        </div>
        {/* Exibir o botão salvar apenas se houver edições pendentes para este professor */}
        {hasPendingEdits && (
          <button
            onClick={() =>
              salvarEscolas(prof.id, edicoesPendentes[prof.id] || {})
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

// === VALIDAÇÃO DE PROPS PARA EscolaCheckboxes ===
EscolaCheckboxes.propTypes = {
  prof: PropTypes.object.isRequired,
  escolas: PropTypes.array.isRequired,
  edicoesPendentes: PropTypes.object.isRequired,
  toggleEscola: PropTypes.func.isRequired,
  salvarEscolas: PropTypes.func.isRequired,
};

// --- Componente Principal: VincularEscolas ---
export default function VincularEscolas() {
  const [professores, setProfessores] = useState([]);
  const [escolas, setEscolas] = useState([]);
  // escolaSelecionada pode ser null, um objeto escola, ou "semVinculo"
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  // Controla o modo de edição para a lista geral de professores de uma escola
  const [modoEdicaoGeral, setModoEdicaoGeral] = useState(false);
  // Formato: { profId: { escolaId: true/false } }
  const [edicoesPendentes, setEdicoesPendentes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // Estado para exibir mensagens de erro
  const navigate = useNavigate();

  // Efeito para verificação de autorização do usuário ao carregar a página
  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (
      !usuario ||
      !(usuario.perfil === "gestao" || usuario.perfil === "desenvolvedor")
    ) {
      toast.error("Apenas perfis autorizados podem acessar esta página.");
      navigate("/");
    }
  }, [navigate]);

  // Função para carregar dados de usuários (professores) e escolas do Firebase
  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Limpa qualquer erro anterior
    try {
      const usuariosSnap = await getDocs(collection(db, "usuarios"));
      const escolasSnap = await getDocs(collection(db, "escolas"));

      // Filtra usuários que são perfis de professores, diretores, diretores adjuntos, orientadores pedagógicos ou AEE
      const professoresFiltrados = usuariosSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((u) =>
          [
            "professor",
            "diretor",
            "diretor adjunto",
            "orientador pedagógico", // Perfil com espaço
            "orientador_pedagogico", // Perfil com underscore (adicionado para compatibilidade)
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
      // Prioriza a seleção de uma escola existente se houver, caso contrário, "semVinculo"
      if (!escolaSelecionada && escolasListadas.length > 0) {
        setEscolaSelecionada(escolasListadas[0]);
      } else if (!escolaSelecionada && escolasListadas.length === 0) {
        setEscolaSelecionada("semVinculo");
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados. Por favor, tente novamente.");
      toast.error("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [escolaSelecionada]); // escolaSelecionada é uma dependência para evitar loop de inicialização

  // Efeito para carregar dados na montagem inicial do componente
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Lógica para alternar o vínculo de uma escola para um professor nas edições pendentes
  // Agora recebe o estado original para facilitar a comparação
  const toggleEscola = useCallback(
    (profId, escolaId, isOriginallyLinked) => {
      setEdicoesPendentes((prev) => {
        const professorEdicoes = { ...(prev[profId] || {}) };

        // Se a escola já está nas edições pendentes, inverte seu estado
        // Caso contrário, define como o oposto do estado original
        const newState =
          professorEdicoes[escolaId] !== undefined
            ? !professorEdicoes[escolaId]
            : !isOriginallyLinked;

        // Se o novo estado for igual ao estado original, remove a edição pendente
        if (newState === isOriginallyLinked) {
          delete professorEdicoes[escolaId];
        } else {
          // Caso contrário, armazena o novo estado nas edições pendentes
          professorEdicoes[escolaId] = newState;
        }

        // Se não há mais edições pendentes para este professor, remove a entrada do professor
        if (Object.keys(professorEdicoes).length === 0) {
          const novo = { ...prev };
          delete novo[profId];
          return novo;
        }

        return { ...prev, [profId]: professorEdicoes };
      });
    },
    [] // Sem dependências complexas aqui, pois o estado original é passado como argumento
  );

  // Função para salvar as escolas vinculadas de um professor no Firebase
  const salvarEscolas = useCallback(
    async (profId, edicoesDoProfessor) => {
      setIsLoading(true);
      setError(null);
      try {
        const professorAtual = professores.find((p) => p.id === profId);
        if (!professorAtual) {
          throw new Error("Professor não encontrado para salvar.");
        }

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
        toast.success("Vínculos atualizados com sucesso!");
      } catch (err) {
        console.error("Erro ao salvar:", err);
        setError("Erro ao salvar vínculos. Por favor, tente novamente.");
        toast.error("Erro ao salvar vínculos. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    },
    [carregarDados, professores]
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
        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    );
  }

  return (
    <div className="vinculacao-container">
      <div className="vinculacao-card">
        <BotaoVoltar className="vinculacao-botao-base vinculacao-botao-voltar" />

        <h2 className="vinculacao-titulo">Vincular Escolas a Professores</h2>

        <div className="vinculacao-abas-container">
          {/* Mapeia todas as escolas para criar os botões de aba */}
          {escolas.map((escola) => (
            <button
              key={escola.id}
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
          {/* Botão para exibir professores sem vínculo */}
          <button
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

            <div className="vinculacao-lista">
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
                      <h4>
                        {prof.nome} ({prof.email}) -{" "}
                        {prof.perfil?.toUpperCase()}
                      </h4>
                      <EscolaCheckboxes
                        prof={prof}
                        escolas={escolas}
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
                    <p className="escolas-vinculadas-visualizacao">
                      Escolas:{" "}
                      {Object.keys(prof.escolas || {})
                        .map((id) => escolas.find((e) => e.id === id)?.nome)
                        .filter(Boolean) // Remove undefined se a escola não for encontrada
                        .join(", ") || "Nenhuma"}
                    </p>
                  </div>
                ))
              )}
            </div>

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
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}
