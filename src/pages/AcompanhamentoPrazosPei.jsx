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
      // Normaliza o perfil para comparação consistente
      const perfilNormalizado = user?.perfil?.toLowerCase()?.trim();
      const escolasVinculadas =
        user?.escolas && typeof user.escolas === "object"
          ? Object.keys(user.escolas).map((id) => ({
              id,
              nome: user.escolas[id] || id,
            }))
          : [];
      return { ...user, perfil: perfilNormalizado, escolasVinculadas };
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

    const fetchTodasEscolas = async () => {
      if (usuario.perfil === "desenvolvedor" && todasAsEscolas.length === 0) {
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
        setEscolaAtivaId("TODAS");
      } else if (usuario.escolasVinculadas.length > 0) {
        setEscolaAtivaId(usuario.escolasVinculadas[0].id);
      }
    }
  }, [usuario, navigate, escolaAtivaId, todasAsEscolas.length]);

  // Efeito principal para CARREGAR OS DADOS DO RESUMO PRÉ-CALCULADO
  useEffect(() => {
    if (!usuario || !isAuthorized(usuario.perfil)) return;
    if (usuario.perfil !== "desenvolvedor" && !escolaAtivaId) {
      if (
        usuario.perfil === "professor" &&
        (!usuario.escolasVinculadas || usuario.escolasVinculadas.length === 0)
      ) {
        setLoading(false);
        return;
      }
      if (!escolaAtivaId) {
        setLoading(true);
        return;
      }
    }

    const carregarResumoPEI = async () => {
      setLoading(true);
      setFetchError(null);
      setNoDataMessage(null);

      try {
        let professoresQueryRef = collection(
          db,
          "acompanhamentoPrazosPEIResumo"
        );

        professoresQueryRef = query(
          professoresQueryRef,
          orderBy("statusGeral", "desc")
        );

        const snapshot = await getDocs(professoresQueryRef);
        let professoresResumo = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        let professoresFiltradosParaExibir = [];

        if (usuario.perfil === "desenvolvedor" && escolaAtivaId === "TODAS") {
          professoresFiltradosParaExibir = professoresResumo;
        } else if (usuario.perfil === "desenvolvedor" && escolaAtivaId) {
          professoresFiltradosParaExibir = professoresResumo.filter(
            (prof) =>
              prof.alunosDetalhesPrazos &&
              prof.alunosDetalhesPrazos.some(
                (aluno) => aluno.escolaId === escolaAtivaId
              )
          );
        } else if (usuario.perfil === "professor") {
          // Professor deve ver APENAS SEUS PRÓPRIOS DADOS
          professoresFiltradosParaExibir = professoresResumo.filter(
            (prof) => prof.id === usuario.id
          );
        } else if (
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
        } else {
          professoresFiltradosParaExibir = [];
        }

        setProfessoresComStatus(professoresFiltradosParaExibir);
        console.log(
          "DEBUG AcompanhamentoPrazosPei: Professores após filtragem:",
          JSON.stringify(professoresFiltradosParaExibir, null, 2)
        );
        // --- Lógica revisada para setar a mensagem 'noDataMessage' ---
        if (professoresFiltradosParaExibir.length === 0) {
          let message = "Nenhum dado de acompanhamento encontrado.";
          if (usuario.perfil === "professor") {
            message =
              "Você ainda não possui dados de acompanhamento de PEI. Verifique se seus alunos têm PEIs cadastrados ou se o resumo foi processado.";
          } else if (escolaAtivaId && escolaAtivaId !== "TODAS") {
            const schoolName =
              todasAsEscolas.find((e) => e.id === escolaAtivaId)?.nome ||
              escolaAtivaId;
            message = `Nenhum dado de acompanhamento encontrado para professores da escola "${schoolName}".`;
          } else if (
            usuario.escolasVinculadas &&
            usuario.escolasVinculadas.length > 0
          ) {
            message =
              "Nenhum dado de acompanhamento encontrado para professores das escolas vinculadas ao seu perfil.";
          }
          setNoDataMessage(message);
        } else {
          // Se há professores para exibir (professoresFiltradosParaExibir.length > 0)
          // Apenas definimos noDataMessage se TODOS os professores exibidos estiverem em dia E o perfil não for 'professor'.
          // Para o professor, queremos que a tabela apareça mesmo que ele esteja em dia.
          if (
            professoresFiltradosParaExibir.every(
              (p) => p.alunosAtrasadosCount === 0
            ) &&
            usuario.perfil !== "professor"
          ) {
            setNoDataMessage(
              "Todos os professores e seus alunos estão em dia com os prazos do PEI para a escola selecionada. Não há atrasos a serem exibidos."
            );
          } else {
            setNoDataMessage(null); // Limpa a mensagem, para que a tabela seja exibida
          }
        }
        // --- Fim da lógica revisada para setar a mensagem 'noDataMessage' ---
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
  }, [usuario, escolaAtivaId, todasAsEscolas.length, isAuthorized]);

  // Função para navegar para os detalhes (mantém a mesma)
  const handleVerDetalhes = (professorData) => {
    navigate(`/acompanhamento-pei/${professorData.id}`, {
      state: {
        professorNome: professorData.professorNome,
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
        {noDataMessage && professoresComStatus.length === 0 ? ( // Adicionado condição para que a mensagem só apareça se não houver dados para a tabela
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
                    {/* Esta linha agora é uma fallback se por algum motivo
                        professoresComStatus.length for 0, mas noDataMessage
                        não foi setado. Idealmente, noDataMessage já cuidaria disso. */}
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
