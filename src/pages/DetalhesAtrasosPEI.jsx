// src/pages/DetalhesAtrasosPEI.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore"; // Importa apenas doc e getDoc
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";
import { isAuthorized } from "../utils/authUtils";

// --- Funções Auxiliares (mantidas para consistência da exibição) ---

// Função auxiliar para formatar datas para exibição
const formatDate = (date) => {
  if (!date) return "N/A";
  // Garante que é um objeto Date, pois a Cloud Function pode retornar Timestamp
  if (date.toDate && typeof date.toDate === "function") {
    date = date.toDate();
  }
  return date.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// A função getPeiStatusDetails foi movida para o backend (Cloud Function).
// O frontend agora apenas consome os resultados dela.

// --- Componente Principal ---

export default function DetalhesAtrasosPEI() {
  const { professorId } = useParams();
  const navigate = useNavigate();
  const [professorResumo, setProfessorResumo] = useState(null); // Agora armazena o resumo completo
  const [alunosDetalhesPrazos, setAlunosDetalhesPrazos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Simula a obtenção do usuário de um AuthContext ou similar
  const getUsuarioLogado = useCallback(() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuarioLogado"));
      // Para o frontend, o filtro de escola será mais complexo se 'escolaId' no resumo é null.
      // O frontend pode exibir todos os professores e o usuário desenvolvedor pode filtrar em memória,
      // ou se for SEME, o usuário verá apenas os professores das suas escolas vinculadas (mas o resumo do professor é geral).
      // Por enquanto, esta parte não precisa de grandes mudanças aqui.
      const escolasVinculadas =
        user?.escolas && typeof user.escolas === "object"
          ? Object.keys(user.escolas).filter(
              (key) =>
                typeof user.escolas[key] === "string" ||
                typeof user.escolas[key] === "boolean"
            )
          : [];
      return { ...user, escolasVinculadas };
    } catch (e) {
      console.error("Erro ao parsear dados do usuário logado:", e);
      return null;
    }
  }, []);

  const usuario = useMemo(() => getUsuarioLogado(), [getUsuarioLogado]);

  useEffect(() => {
    // 1. Verificação de Permissão e Dados do Usuário
    if (!usuario || !isAuthorized(usuario.perfil)) {
      setErrorMessage("Você não tem permissão para acessar esta página.");
      setLoading(false);
      setTimeout(() => navigate("/"), 3000); // Navega após um pequeno delay
      return;
    }

    // A lógica de filtragem de escola vinculada ao usuário para esta página de detalhes
    // precisa ser reconsiderada, pois o resumo do professor é agora "geral" (escolaId: null).
    // O frontend pode decidir mostrar TODOS os detalhes do professor (se for dev)
    // ou filtrar os alunosDetalhesPrazos em memória pela escola do usuário (se for SEME).
    // Para simplificar, vou remover o filtro de "sem escolas vinculadas" aqui por enquanto,
    // já que o resumo do professor não tem um escolaId específico para filtrar.
    // O usuário SEME/escola verá o resumo GERAL do professor.

    // 2. Valida se o professorId foi fornecido na URL
    if (!professorId) {
      setErrorMessage("ID do professor não fornecido na URL.");
      setLoading(false);
      return;
    }

    const carregarDetalhesProfessor = async () => {
      setLoading(true);
      setErrorMessage(null); // Limpa mensagens anteriores

      try {
        // Agora, lemos o resumo do professor diretamente da coleção de agregação
        const professorResumoRef = doc(
          db,
          "acompanhamentoPrazosPEIResumo",
          professorId
        );
        const professorResumoSnap = await getDoc(professorResumoRef);

        if (!professorResumoSnap.exists()) {
          setErrorMessage(
            "Dados de acompanhamento para este professor não encontrados."
          );
          setLoading(false);
          return;
        }

        const professorData = {
          id: professorResumoSnap.id,
          ...professorResumoSnap.data(),
        };
        setProfessorResumo(professorData); // Armazena o resumo completo do professor

        // Usa o novo campo 'alunosDetalhesPrazos' do resumo, que vem pré-calculado
        const detalhesParaExibir = professorData.alunosDetalhesPrazos || [];
        setAlunosDetalhesPrazos(detalhesParaExibir);

        if (detalhesParaExibir.length === 0) {
          setErrorMessage(
            `Nenhum detalhe de PEI encontrado para os alunos deste professor. Todos em dia ou sem PEI no ano atual.`
          );
        }
      } catch (err) {
        console.error("Erro no carregamento dos detalhes do professor:", err);
        setErrorMessage(
          "Ocorreu um erro ao carregar os detalhes: " + err.message
        );
      } finally {
        setLoading(false);
      }
    };

    carregarDetalhesProfessor();
  }, [professorId, usuario, navigate]); // professorId, usuario, e navigate como dependências

  if (loading) return <Loader />;

  return (
    <div className="detalhes-container" style={estilos.container}>
      <div className="detalhes-card" style={estilos.card}>
        <BotaoVoltar />
        <h1 className="detalhes-title" style={estilos.title}>
          Detalhes dos PEIs -{" "}
          {professorResumo ? professorResumo.professorNome : "Carregando..."}{" "}
          {/* Usa professorNome do resumo */}
        </h1>

        <p style={{ marginBottom: "20px" }}>
          Esta tabela mostra o status detalhado dos PEIs de cada aluno sob
          responsabilidade deste professor, com base nos prazos de criação e
          revisões.
        </p>

        {errorMessage ? (
          <div className="detalhes-mensagem-aviso" style={estilos.errorMessage}>
            {errorMessage}
          </div>
        ) : alunosDetalhesPrazos.length === 0 ? (
          <div
            className="detalhes-mensagem-aviso"
            style={estilos.mensagemAviso}
          >
            Nenhum aluno com PEI encontrado para este professor, suas turmas ou
            escolas vinculadas, no ano letivo atual, ou todos estão em dia.
          </div>
        ) : (
          <table className="detalhes-table" style={estilos.table}>
            <thead>
              <tr>
                <th style={estilos.th}>Aluno</th>
                <th style={estilos.th}>Status Geral PEI</th>
                <th style={estilos.th}>1ª Revisão</th>
                <th style={estilos.th}>2ª Revisão</th>
                <th style={estilos.th}>Última Atualização PEI</th>
              </tr>
            </thead>
            <tbody>
              {/* Renderiza diretamente os detalhes dos alunos pré-calculados */}
              {alunosDetalhesPrazos.map((aluno) => (
                <tr key={aluno.id}>
                  <td style={estilos.td}>{aluno.nome}</td>
                  <td style={estilos.td}>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: aluno.statusPeiGeral.includes("Atrasado")
                          ? "#dc3545" // Vermelho
                          : aluno.statusPeiGeral.includes("Em dia") ||
                            aluno.statusPeiGeral.includes("Criado") ||
                            aluno.statusPeiGeral.includes("antes do prazo")
                          ? "#28a745" // Verde
                          : "#ffc107", // Amarelo
                      }}
                    >
                      {aluno.statusPeiGeral}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: aluno.statusRevisao1.includes("Atrasado")
                          ? "#dc3545"
                          : aluno.statusRevisao1.includes("Em dia") ||
                            aluno.statusRevisao1.includes("Feita")
                          ? "#28a745"
                          : "#ffc107",
                      }}
                    >
                      {aluno.statusRevisao1}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: aluno.statusRevisao2.includes("Atrasado")
                          ? "#dc3545"
                          : aluno.statusRevisao2.includes("Em dia") ||
                            aluno.statusRevisao2.includes("Feita")
                          ? "#28a745"
                          : "#ffc107",
                      }}
                    >
                      {aluno.statusRevisao2}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    {formatDate(aluno.dataUltimaAtualizacaoPei)}
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

// Estilos permanecem os mesmos
const estilos = {
  container: {
    background: "#f4f7f6",
    minHeight: "100vh",
    padding: "25px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: "#fff",
    maxWidth: "800px",
    margin: "0 auto",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    color: "#1d3557",
    marginBottom: "30px",
    fontSize: "2em",
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
    border: "1px solid #e63946",
  },
  mensagemAviso: {
    color: "#457b9d",
    backgroundColor: "#e0f2f7",
    padding: "15px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "normal",
    margin: "20px auto",
    maxWidth: "800px",
    border: "1px solid #a8dadc",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  },
  th: {
    backgroundColor: "#457b9d",
    color: "white",
    padding: "12px 15px",
    textAlign: "left",
    borderBottom: "2px solid #a8dadc",
  },
  td: {
    padding: "10px 15px",
    borderBottom: "1px solid #f0f0f0",
    backgroundColor: "#ffffff",
  },
};
