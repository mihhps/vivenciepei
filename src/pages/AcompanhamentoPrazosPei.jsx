import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy, // Ainda útil se quiser ordenar o resumo
} from "firebase/firestore";
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
      // Carrega todas as escolas apenas se o usuário for desenvolvedor e ainda não as tiver carregado
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
  }, [usuario?.perfil, todasAsEscolas.length]); // Depende do perfil e do estado para evitar recargas desnecessárias

  // Efeito principal para CARREGAR OS DADOS DO RESUMO PRÉ-CALCULADO
  useEffect(() => {
    // Só prossegue se o usuário estiver autorizado E a escola ativa estiver definida (ou for desenvolvedor com "TODAS")
    if (!usuario || !isAuthorized(usuario.perfil)) return;
    if (usuario.perfil !== "desenvolvedor" && !escolaAtivaId) return; // Espera escolaAtivaId ser definido se não for desenvolvedor

    const carregarResumoPEI = async () => {
      setLoading(true);
      setFetchError(null);
      setNoDataMessage(null);

      try {
        let professoresQuery = collection(db, "acompanhamentoPrazosPEIResumo");

        const filterBySchoolId =
          escolaAtivaId && escolaAtivaId !== "TODAS" ? escolaAtivaId : null;

        // Aplica o filtro de escola na query
        if (filterBySchoolId) {
          professoresQuery = query(
            professoresQuery,
            where("escolaId", "==", filterBySchoolId)
          );
        } else if (usuario.perfil !== "desenvolvedor") {
          // Se não é desenvolvedor e não selecionou "TODAS", filtra pelas escolas do usuário
          const userSchoolIds = usuario.escolasVinculadas.map((e) => e.id);
          if (userSchoolIds.length > 0) {
            // ATENÇÃO: A query 'in' do Firestore tem um limite de 10 itens.
            // Se um usuário SEME estiver vinculado a mais de 10 escolas, esta query falhará.
            // Para cenários com >10 escolas por usuário, a agregação no backend precisa ser ainda mais inteligente,
            // talvez criando um documento de resumo por professor-escola ou usando uma Cloud Function auxiliar.
            if (userSchoolIds.length <= 10) {
              professoresQuery = query(
                professoresQuery,
                where("escolaId", "in", userSchoolIds)
              );
            } else {
              setFetchError(
                "Seu perfil está vinculado a um grande número de escolas. Não foi possível carregar todos os dados diretamente. Por favor, entre em contato com o suporte."
              );
              setLoading(false);
              return;
            }
          } else {
            setNoDataMessage(
              "Seu perfil não está vinculado a nenhuma escola para exibir dados de acompanhamento."
            );
            setLoading(false);
            return;
          }
        }

        // Opcional: Ordenar para que os professores atrasados apareçam primeiro
        professoresQuery = query(
          professoresQuery,
          orderBy("statusGeral", "desc")
        );
        // Assumindo que 'Atrasado' > 'Em dia' lexicograficamente, ou defina um campo numérico de prioridade no resumo.

        const snapshot = await getDocs(professoresQuery);
        const professoresResumo = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProfessoresComStatus(professoresResumo);

        if (professoresResumo.length === 0) {
          const schoolName =
            todasAsEscolas.find((e) => e.id === filterBySchoolId)?.nome ||
            filterBySchoolId ||
            "a escola selecionada";
          setNoDataMessage(
            `Nenhum dado de acompanhamento encontrado para professores ${
              filterBySchoolId
                ? `da escola "${schoolName}"`
                : "das escolas vinculadas ao seu perfil"
            }.`
          );
        } else if (
          professoresResumo.every((p) => p.alunosAtrasadosCount === 0)
        ) {
          // Mensagem mais amigável se todos estiverem em dia
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
  }, [usuario, navigate, escolaAtivaId, todasAsEscolas.length]);

  // Função para navegar para os detalhes (mantém a mesma)
  const handleVerDetalhes = (professorData) => {
    navigate(`/acompanhamento-pei/${professorData.id}`, {
      state: {
        professorNome: professorData.nome,
        // Passa os detalhes de atraso que já vêm do resumo do backend
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
      : usuario?.escolasVinculadas || []; // Garante que é um array para iteração

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
                      {prof.nome}
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
