import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom";
import { isAuthorized } from "../utils/authUtils";

/**
 * Componente para o acompanhamento dos prazos de criação e revisão de PEIs por professor.
 * Agora, ele lê dados pré-calculados de uma coleção de resumo no Firestore,
 * otimizando o carregamento para sistemas com muitos dados.
 */
export default function AcompanhamentoPrazosPei() {
  const [professoresComStatus, setProfessoresComStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [noDataMessage, setNoDataMessage] = useState(null);
  const [escolaAtivaId, setEscolaAtivaId] = useState(null);
  const [todasAsEscolas, setTodasAsEscolas] = useState([]); // Para as abas de dev/SEME
  const navigate = useNavigate();

  // Parseia os dados do usuário logado uma única vez
  const usuario = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuarioLogado"));
      const escolasVinculadas =
        user?.escolas && typeof user.escolas === "object"
          ? Object.keys(user.escolas).map((id) => ({
              id,
              nome: user.escolas[id] || id,
            }))
          : [];
      return { ...user, escolasVinculadas };
    } catch (e) {
      console.error(
        "Erro ao parsear dados do usuário logado no localStorage:",
        e
      );
      return null;
    }
  }, []);

  // Efeito para inicializar a escola ativa e verificar permissões
  useEffect(() => {
    if (!usuario || !isAuthorized(usuario.perfil)) {
      alert("Você não tem permissão para acessar esta página.");
      navigate("/");
      return;
    }

    if (
      usuario.perfil !== "desenvolvedor" &&
      (!usuario.escolasVinculadas || usuario.escolasVinculadas.length === 0)
    ) {
      setFetchError(
        "Seu perfil não está vinculado a nenhuma escola. Por favor, entre em contato com o administrador para vincular escolas ao seu perfil."
      );
      setLoading(false);
      return;
    }

    if (!escolaAtivaId) {
      if (usuario.perfil === "desenvolvedor") {
        setEscolaAtivaId("TODAS"); // Opção "Todas as Escolas" para desenvolvedores
      } else if (usuario.escolasVinculadas.length > 0) {
        setEscolaAtivaId(usuario.escolasVinculadas[0].id); // Primeira escola vinculada como padrão
      }
    }
  }, [usuario, navigate, escolaAtivaId]);

  // Efeito para carregar todas as escolas (apenas para desenvolvedores, uma vez)
  useEffect(() => {
    const fetchTodasEscolas = async () => {
      if (usuario?.perfil === "desenvolvedor" && todasAsEscolas.length === 0) {
        try {
          const qTodasEscolas = collection(db, "escolas");
          const todasEscolasSnap = await getDocs(qTodasEscolas);
          const escolas = todasEscolasSnap.docs.map((doc) => ({
            id: doc.id,
            nome: doc.data().nome || doc.id,
          }));
          setTodasAsEscolas(escolas);
        } catch (error) {
          console.error("Erro ao carregar todas as escolas:", error);
          setFetchError("Erro ao carregar lista de escolas. Tente novamente.");
        }
      }
    };
    fetchTodasEscolas();
  }, [usuario?.perfil, todasAsEscolas.length]);

  // Efeito principal para CARREGAR OS DADOS DO RESUMO PRÉ-CALCULADO
  useEffect(() => {
    if (!usuario || !isAuthorized(usuario.perfil)) return;
    if (usuario.perfil !== "desenvolvedor" && !escolaAtivaId) return;

    const carregarResumoPEI = async () => {
      setLoading(true);
      setFetchError(null);
      setNoDataMessage(null);

      try {
        let professoresQuery = collection(db, "acompanhamentoPrazosPEIResumo");

        // NOVO: NÃO USAMOS MAIS 'where("escolaId", "==", filterBySchoolId)' DIRETAMENTE AQUI
        // Porque o 'escolaId' no resumo agora é 'null'.
        // Em vez disso, vamos pegar TODOS os professores e filtrar em memória.

        // Opcional: Ordenar para que os professores atrasados apareçam primeiro
        professoresQuery = query(
          professoresQuery,
          orderBy("statusGeral", "desc")
        );

        const snapshot = await getDocs(professoresQuery);
        let professoresResumo = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // --- NOVA LÓGICA DE FILTRAGEM EM MEMÓRIA (AQUI!) ---
        let professoresFiltradosParaExibir = [];

        // 1. Se o usuário é desenvolvedor e selecionou "TODAS" as escolas
        if (usuario.perfil === "desenvolvedor" && escolaAtivaId === "TODAS") {
          professoresFiltradosParaExibir = professoresResumo;
        }
        // 2. Se o usuário é desenvolvedor e selecionou uma escola específica
        else if (usuario.perfil === "desenvolvedor" && escolaAtivaId) {
          professoresFiltradosParaExibir = professoresResumo.filter(
            (prof) =>
              prof.alunosDetalhesPrazos &&
              prof.alunosDetalhesPrazos.some(
                (aluno) => aluno.escolaId === escolaAtivaId
              )
          );
        }
        // 3. Se o usuário NÃO é desenvolvedor (ex: SEME, Diretor, Professor)
        else if (
          usuario.perfil !== "desenvolvedor" &&
          usuario.escolasVinculadas &&
          usuario.escolasVinculadas.length > 0
        ) {
          const escolasPermitidasIds = usuario.escolasVinculadas.map(
            (e) => e.id
          );
          professoresFiltradosParaExibir = professoresResumo.filter(
            (prof) =>
              prof.alunosDetalhesPrazos &&
              prof.alunosDetalhesPrazos.some((aluno) =>
                escolasPermitidasIds.includes(aluno.escolaId)
              )
          );
        }
        // 4. Caso contrário (ex: sem escolas vinculadas, ou erro na lógica)
        else {
          professoresFiltradosParaExibir = []; // Nenhuma escola para filtrar, então nenhum professor.
        }
        // --- FIM DA NOVA LÓGICA DE FILTRAGEM EM MEMÓRIA ---

        setProfessoresComStatus(professoresFiltradosParaExibir);

        if (professoresFiltradosParaExibir.length === 0) {
          const schoolName =
            todasAsEscolas.find((e) => e.id === escolaAtivaId)?.nome ||
            escolaAtivaId ||
            "a escola selecionada";
          setNoDataMessage(
            `Nenhum dado de acompanhamento encontrado para professores ${
              escolaAtivaId && escolaAtivaId !== "TODAS"
                ? `da escola "${schoolName}"`
                : "das escolas vinculadas ao seu perfil"
            }.`
          );
        } else if (
          professoresFiltradosParaExibir.every(
            (p) => p.alunosAtrasadosCount === 0
          )
        ) {
          setNoDataMessage(
            "Todos os professores e seus alunos estão em dia com os prazos do PEI para a escola selecionada. Não há atrasos a serem exibidos."
          );
        }
      } catch (err) {
        console.error(
          "Erro ao carregar dados de acompanhamento do resumo:",
          err
        );
        setFetchError(
          "Ocorreu um erro ao carregar os dados de acompanhamento. Por favor, tente novamente. Detalhes: " +
            err.message
        );
      } finally {
        setLoading(false);
      }
    };

    carregarResumoPEI();
  }, [usuario, navigate, escolaAtivaId, todasAsEscolas.length]); // Depende do perfil e do estado para evitar recargas desnecessárias

  // Função para navegar para os detalhes (mantém a mesma)
  const handleVerDetalhes = (professorData) => {
    navigate(`/acompanhamento-pei/${professorData.id}`, {
      state: {
        professorNome: professorData.professorNome, // Mudei para professorNome do resumo
        // O detalhesAtraso já vem do resumo, não precisa de professorData.nome
        detalhesAtraso: professorData.detalhesAtraso,
      },
    });
  };

  // Renderização condicional para Loader e Erros Críticos
  if (loading) return <Loader />;
  if (fetchError)
    return (
      <div className="error-message" style={estilos.errorMessage}>
        {fetchError}
      </div>
    );

  // Determina quais escolas mostrar nas abas
  const escolasParaAbas =
    usuario?.perfil === "desenvolvedor"
      ? todasAsEscolas
      : usuario?.escolasVinculadas || [];

  return (
    <div className="acompanhamento-container" style={estilos.container}>
      <div className="acompanhamento-content" style={estilos.content}>
        <BotaoVoltar />
        <h1 className="acompanhamento-title" style={estilos.title}>
          Acompanhamento de Prazos do PEI
        </h1>

        {/* Abas de escola para SEME e Desenvolvedor */}
        {(usuario?.perfil === "seme" || usuario?.perfil === "desenvolvedor") &&
          escolasParaAbas.length > 0 && (
            <div
              className="escola-tabs-container"
              style={estilos.escolaTabsContainer}
            >
              {usuario?.perfil === "desenvolvedor" && (
                <button
                  onClick={() => setEscolaAtivaId("TODAS")}
                  style={{
                    ...estilos.escolaTabButton,
                    ...(escolaAtivaId === "TODAS" &&
                      estilos.escolaTabButtonActive),
                  }}
                >
                  Todas as Escolas
                </button>
              )}
              {escolasParaAbas.map((escola) => (
                <button
                  key={escola.id}
                  onClick={() => setEscolaAtivaId(escola.id)}
                  style={{
                    ...estilos.escolaTabButton,
                    ...(escola.id === escolaAtivaId &&
                      estilos.escolaTabButtonActive),
                  }}
                >
                  {escola.nome || "Escola Desconhecida"}{" "}
                </button>
              ))}
            </div>
          )}

        <p style={{ marginBottom: "20px" }}>
          Esta página exibe o status de criação e revisão dos Planos de Ensino
          Individualizados (PEIs) para cada professor, com base nos prazos
          estabelecidos.
        </p>

        {/* Condicionalmente renderiza a mensagem "sem dados" ou a tabela */}
        {noDataMessage ? (
          <div className="no-data-message" style={estilos.noDataMessage}>
            {noDataMessage}
          </div>
        ) : (
          <table className="acompanhamento-table" style={estilos.table}>
            <thead>
              <tr>
                <th className="acompanhamento-th" style={estilos.th}>
                  Professor
                </th>
                <th className="acompanhamento-th" style={estilos.th}>
                  Status Geral
                </th>
                <th className="acompanhamento-th" style={estilos.th}>
                  Alunos em Atraso
                </th>
                <th className="acompanhamento-th" style={estilos.th}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {professoresComStatus.length > 0 ? (
                professoresComStatus.map((prof) => (
                  <tr key={prof.id}>
                    <td className="acompanhamento-td" style={estilos.td}>
                      {prof.professorNome}{" "}
                      {/* Mudei de prof.nome para prof.professorNome */}
                    </td>
                    <td className="acompanhamento-td" style={estilos.td}>
                      <span
                        style={{
                          fontWeight: "bold",
                          color:
                            prof.statusGeral === "Em dia"
                              ? "#28a745"
                              : "#dc3545",
                        }}
                      >
                        {prof.statusGeral}
                      </span>
                    </td>
                    <td className="acompanhamento-td" style={estilos.td}>
                      {prof.alunosAtrasadosCount > 0 ? (
                        <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                          {prof.alunosAtrasadosCount} aluno(s) atrasado(s)
                        </span>
                      ) : (
                        "Todos em dia."
                      )}
                    </td>
                    <td className="acompanhamento-td" style={estilos.td}>
                      <button
                        className="acompanhamento-button-action"
                        style={estilos.buttonAction}
                        onClick={() => handleVerDetalhes(prof)}
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={estilos.td}>
                    Nenhum professor encontrado para a escola selecionada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Seus estilos CSS permanecem os mesmos
const estilos = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    background: "#1d3557",
    padding: "40px 20px",
    fontFamily: "'Segoe UI', sans-serif",
  },
  content: {
    maxWidth: "1200px",
    margin: "0 auto",
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "16px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
  },
  title: {
    color: "#1d3557",
    marginBottom: "20px",
    fontSize: "24px",
    fontWeight: "600",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  },
  th: {
    backgroundColor: "#eaf2f7",
    color: "#1d3557",
    padding: "12px 15px",
    textAlign: "left",
    borderBottom: "2px solid #ddd",
    fontSize: "16px",
    fontWeight: "bold",
  },
  td: {
    padding: "12px 15px",
    borderBottom: "1px solid #ddd",
    fontSize: "14px",
    verticalAlign: "top",
  },
  buttonAction: {
    backgroundColor: "#457b9d",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
    fontSize: "14px",
  },
  errorMessage: {
    color: "#e63946",
    backgroundColor: "#ffe6e6",
    padding: "15px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "bold",
    margin: "20px auto",
    maxWidth: "800px",
  },
  noDataMessage: {
    color: "#555",
    backgroundColor: "#f0f0f0",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "normal",
    margin: "20px auto",
    fontStyle: "italic",
    maxWidth: "800px",
  },
  escolaTabsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "20px",
    justifyContent: "center",
    padding: "10px",
    backgroundColor: "#f8f8f8",
    borderRadius: "8px",
  },
  escolaTabButton: {
    padding: "8px 15px",
    borderRadius: "20px",
    border: "1px solid #a8dadc",
    backgroundColor: "#e0f2f7",
    color: "#1d3557",
    cursor: "pointer",
    fontWeight: "normal",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },
  escolaTabButtonActive: {
    backgroundColor: "#457b9d",
    color: "white",
    fontWeight: "bold",
    borderColor: "#457b9d",
  },
};
