import React, { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom";
import { isAuthorized } from "../utils/authUtils";

/**
 * Componente para o acompanhamento dos prazos de criação e revisão de PEIs por professor.
 */
export default function AcompanhamentoPrazosPei() {
  const [professoresComStatus, setProfessoresComStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [noDataMessage, setNoDataMessage] = useState(null);
  const [escolaAtivaId, setEscolaAtivaId] = useState(null);
  const [todasAsEscolas, setTodasAsEscolas] = useState([]);
  const navigate = useNavigate();

  const usuario = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuarioLogado"));
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
      console.error("Erro ao parsear dados do usuário:", e);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!usuario || !isAuthorized(usuario.perfil)) {
      alert("Você não tem permissão para acessar esta página.");
      navigate("/");
      return;
    }

    const fetchTodasEscolas = async () => {
      // ##### ALTERAÇÃO 2: Perfil SEME agora também carrega todas as escolas #####
      if (
        (usuario.perfil === "desenvolvedor" || usuario.perfil === "seme") &&
        todasAsEscolas.length === 0
      ) {
        try {
          const qTodasEscolas = query(
            collection(db, "escolas"),
            orderBy("nome")
          );
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
      !["desenvolvedor", "seme"].includes(usuario.perfil) &&
      (!usuario.escolasVinculadas || usuario.escolasVinculadas.length === 0)
    ) {
      setFetchError(
        "Seu perfil não está vinculado a nenhuma escola. Por favor, contate o administrador."
      );
      setLoading(false);
      return;
    }

    if (!escolaAtivaId) {
      if (usuario.perfil === "desenvolvedor" || usuario.perfil === "seme") {
        setEscolaAtivaId("TODAS");
      } else if (usuario.escolasVinculadas.length > 0) {
        setEscolaAtivaId(usuario.escolasVinculadas[0].id);
      }
    }
  }, [usuario, navigate, escolaAtivaId, todasAsEscolas.length]);

  useEffect(() => {
    if (!usuario || !isAuthorized(usuario.perfil)) return;
    if (!["desenvolvedor", "seme"].includes(usuario.perfil) && !escolaAtivaId) {
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
        const qResumo = query(
          collection(db, "acompanhamentoPrazosPEIResumo"),
          orderBy("statusGeral", "desc")
        );
        const snapshot = await getDocs(qResumo);
        const professoresResumo = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        let professoresFiltrados = [];
        const perfil = usuario.perfil;

        if (
          (perfil === "desenvolvedor" || perfil === "seme") &&
          escolaAtivaId === "TODAS"
        ) {
          professoresFiltrados = professoresResumo;
        } else if (
          (perfil === "desenvolvedor" || perfil === "seme") &&
          escolaAtivaId
        ) {
          professoresFiltrados = professoresResumo.filter((prof) =>
            prof.alunosDetalhesPrazos?.some(
              (aluno) => aluno.escolaId === escolaAtivaId
            )
          );
        } else if (perfil === "professor") {
          professoresFiltrados = professoresResumo.filter(
            (prof) => prof.id === usuario.id
          );
        } else if (usuario.escolasVinculadas?.length > 0) {
          professoresFiltrados = professoresResumo.filter((prof) =>
            prof.alunosDetalhesPrazos?.some(
              (aluno) => escolaAtivaId === aluno.escolaId
            )
          );
        }

        setProfessoresComStatus(professoresFiltrados);

        if (professoresFiltrados.length === 0) {
          let message = "Nenhum dado de acompanhamento encontrado.";
          if (perfil === "professor") {
            message = "Você ainda não possui dados de acompanhamento de PEI.";
          } else if (escolaAtivaId && escolaAtivaId !== "TODAS") {
            const schoolName =
              todasAsEscolas.find((e) => e.id === escolaAtivaId)?.nome ||
              "a escola selecionada";
            message = `Nenhum dado de acompanhamento encontrado para professores de ${schoolName}.`;
          }
          setNoDataMessage(message);
        } else {
          setNoDataMessage(null);
        }
      } catch (err) {
        console.error("Erro ao carregar resumo de acompanhamento:", err);
        setFetchError("Ocorreu um erro ao carregar os dados. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    if (escolaAtivaId) {
      carregarResumoPEI();
    }
    // ##### ALTERAÇÃO 1: Removido 'isAuthorized' da lista de dependências para evitar loop infinito #####
  }, [usuario, escolaAtivaId, todasAsEscolas]); // A dependência de 'todasAsEscolas' é importante para re-filtrar quando a lista muda

  const handleVerDetalhes = (professorData) => {
    navigate(`/acompanhamento-pei/${professorData.id}`, {
      state: {
        professorNome: professorData.professorNome,
        detalhesAtraso: professorData.detalhesAtraso,
      },
    });
  };

  if (loading) return <Loader />;
  if (fetchError)
    return (
      <div className="error-message" style={estilos.errorMessage}>
        {fetchError}
      </div>
    );

  const escolasParaAbas =
    usuario?.perfil === "desenvolvedor" || usuario?.perfil === "seme"
      ? todasAsEscolas
      : usuario?.escolasVinculadas || [];

  return (
    <div className="acompanhamento-container" style={estilos.container}>
      <div className="acompanhamento-content" style={estilos.content}>
        <BotaoVoltar />
        <h1 className="acompanhamento-title" style={estilos.title}>
          Acompanhamento de Prazos do PEI
        </h1>

        {(usuario?.perfil === "seme" || usuario?.perfil === "desenvolvedor") &&
          escolasParaAbas.length > 0 && (
            <div
              className="escola-tabs-container"
              style={estilos.escolaTabsContainer}
            >
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
                  {escola.nome || "Escola Desconhecida"}
                </button>
              ))}
            </div>
          )}

        <p style={{ marginBottom: "20px" }}>
          Esta página exibe o status de criação e revisão dos Planos de Ensino
          Individualizados (PEIs).
        </p>

        {noDataMessage ? (
          <div className="no-data-message" style={estilos.noDataMessage}>
            {noDataMessage}
          </div>
        ) : (
          <table className="acompanhamento-table" style={estilos.table}>
            <thead>
              <tr>
                <th style={estilos.th}>Professor</th>
                <th style={estilos.th}>Status Geral</th>
                <th style={estilos.th}>Alunos em Atraso</th>
                <th style={estilos.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {professoresComStatus.map((prof) => (
                <tr key={prof.id}>
                  <td style={estilos.td}>{prof.professorNome}</td>
                  <td style={estilos.td}>
                    <span
                      style={{
                        fontWeight: "bold",
                        color:
                          prof.statusGeral === "Em dia" ? "#28a745" : "#dc3545",
                      }}
                    >
                      {prof.statusGeral}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    {prof.alunosAtrasadosCount > 0 ? (
                      <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                        {prof.alunosAtrasadosCount} aluno(s)
                      </span>
                    ) : (
                      "Todos em dia."
                    )}
                  </td>
                  <td style={estilos.td}>
                    <button
                      style={estilos.buttonAction}
                      onClick={() => handleVerDetalhes(prof)}
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Estilos
const estilos = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    background: "#f0f2f5",
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
  table: { width: "100%", borderCollapse: "collapse", marginTop: "20px" },
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
    verticalAlign: "middle",
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
