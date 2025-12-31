// src/pages/DetalhesAcompanhamentoPei.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";
import { isAuthorized } from "../utils/authUtils";
import { useAuth } from "../context/AuthContext";

// Função auxiliar para formatar datas para exibição
const formatDate = (date) => {
  if (!date) return "N/A";
  // ✅ MUDANÇA AQUI: Adiciona tratamento para string ISO 8601
  if (typeof date === "string") {
    date = new Date(date);
  }
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

/**
 * Componente que exibe os detalhes do acompanhamento de PEI para um professor específico.
 * Carrega todos os alunos vinculados às turmas do professor e verifica o status de PEI de cada um.
 * Os dados exibidos são filtrados pela(s) escola(s) vinculada(s) ao usuário logado.
 * Perfis 'desenvolvedor', 'gestao' e 'aee' têm acesso amplo (não filtrado por escola vinculada ao próprio perfil)
 * se eles mesmos não tiverem escolas específicas vinculadas.
 */
// src/pages/DetalhesAcompanhamentoPei.jsx
// ... (imports permanecem os mesmos)

export default function DetalhesAcompanhamentoPei() {
  const { professorId } = useParams();
  const navigate = useNavigate();
  const [professor, setProfessor] = useState(null);
  const [alunosComPendenciaReal, setAlunosComPendenciaReal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [noDataMessage, setNoDataMessage] = useState(null);

  const [currentUserData, setCurrentUserData] = useState(null);
  const [initialUserLoadComplete, setInitialUserLoadComplete] = useState(false);

  useEffect(() => {
    let user = null;
    try {
      const userDataString = localStorage.getItem("usuarioLogado");
      if (userDataString) {
        user = JSON.parse(userDataString);
      }
      const escolasVinculadas =
        user?.escolas && typeof user.escolas === "object"
          ? Object.keys(user.escolas)
          : [];
      setCurrentUserData({ ...user, escolasVinculadas });
    } catch (e) {
      console.error("Erro ao parsear dados do usuário logado:", e);
      setCurrentUserData(null);
    } finally {
      setInitialUserLoadComplete(true);
    }
  }, []);

  useEffect(() => {
    if (!initialUserLoadComplete || !professorId) {
      if (initialUserLoadComplete && !professorId) {
        setLoading(false);
        setFetchError("ID do professor não fornecido na URL.");
      }
      return;
    }

    if (!currentUserData || !isAuthorized(currentUserData.perfil)) {
      alert("Você não tem permissão para acessar esta página.");
      navigate("/");
      return;
    }

    const perfisComAcessoAmplo = ["desenvolvedor", "gestao", "aee"];
    const usuarioTemEscolas =
      currentUserData.escolasVinculadas &&
      currentUserData.escolasVinculadas.length > 0;
    const isRestritoPorEscola =
      !perfisComAcessoAmplo.includes(currentUserData.perfil) ||
      usuarioTemEscolas;

    const carregarDetalhesAtrasos = async () => {
      setLoading(true);
      setFetchError(null);
      setNoDataMessage(null);

      try {
        // ✅ PASSO 1: Lê diretamente o resumo pré-calculado
        const resumoRef = doc(db, "acompanhamentoPrazosPEIResumo", professorId);
        const resumoSnap = await getDoc(resumoRef);

        if (!resumoSnap.exists()) {
          setFetchError(
            "Resumo de acompanhamento não encontrado para este professor. O sistema de cálculo pode não ter sido executado ainda."
          );
          setAlunosComPendenciaReal([]);
          setNoDataMessage(
            "Não há dados de acompanhamento para este professor. Verifique se o professor possui turmas e alunos vinculados."
          );
          return;
        }

        const resumoData = resumoSnap.data();
        setProfessor({ nome: resumoData.professorNome });

        // ✅ PASSO 2: Filtra os alunos do resumo
        let alunosFiltrados = resumoData.alunosDetalhesPrazos || [];

        // Aplica o filtro por escola se o perfil do usuário for restrito
        if (isRestritoPorEscola) {
          const escolasPermitidas = new Set(currentUserData.escolasVinculadas);
          alunosFiltrados = alunosFiltrados.filter((aluno) =>
            escolasPermitidas.has(aluno.escolaId)
          );
        }

        // ✅ PASSO 3: Filtra para mostrar APENAS os atrasados
        const alunosRealmenteAtrasados = alunosFiltrados.filter(
          (aluno) => aluno.isAtrasadoRealmente
        );

        setAlunosComPendenciaReal(alunosRealmenteAtrasados);

        if (alunosRealmenteAtrasados.length === 0) {
          setNoDataMessage(
            "Todos os PEIs dos alunos deste professor estão em dia ou foram realizados. Nenhuma pendência de atraso real."
          );
        }
      } catch (err) {
        console.error("Erro no carregamento dos detalhes do PEI:", err);
        setFetchError(
          "Ocorreu um erro ao carregar os detalhes do professor: " + err.message
        );
      } finally {
        setLoading(false);
      }
    };

    if (initialUserLoadComplete && professorId) {
      carregarDetalhesAtrasos();
    }
  }, [professorId, currentUserData, navigate, initialUserLoadComplete]);

  // Restante do código (JSX) permanece o mesmo.

  return (
    <div className="detalhes-container" style={estilos.container}>
      <div className="detalhes-card" style={estilos.card}>
        <BotaoVoltar />
        <h1 className="detalhes-title" style={estilos.title}>
          Detalhes dos PEIs com Pendências -{" "}
          {professor ? professor.nome : "Carregando..."}
        </h1>

        <p style={{ marginBottom: "20px" }}>
          Esta tabela mostra o status detalhado dos PEIs dos alunos com atrasos
          pendentes de realização, com base nos prazos de criação e revisões.
        </p>

        {noDataMessage ? (
          <div
            className="detalhes-mensagem-aviso"
            style={estilos.mensagemAviso}
          >
            {noDataMessage}
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
              {alunosComPendenciaReal.length > 0 ? (
                alunosComPendenciaReal.map((aluno) => (
                  <tr key={aluno.id}>
                    <td style={estilos.td}>{aluno.nome}</td>
                    <td style={estilos.td}>
                      <span
                        style={{
                          fontWeight: "bold",
                          color: aluno.statusPeiGeral.includes("Atrasado")
                            ? "#dc3545" // Vermelho
                            : aluno.statusPeiGeral.includes("Em dia") ||
                              aluno.statusPeiGeral.includes("Criado")
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
                            : aluno.statusRevisao1.includes("Concluído")
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
                            : aluno.statusRevisao2.includes("Concluído")
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
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={estilos.td}>
                    Nenhum aluno com pendência real para exibir.
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

// Estilos CSS inline para o componente
const estilos = {
  container: {
    background: "#1d3557",
    minHeight: "100vh",
    width: "100vw",
    padding: "25px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  card: {
    background: "#fff",
    maxWidth: "900px",
    width: "100%",
    margin: "20px",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    color: "#1d3557",
    marginBottom: "25px",
    fontSize: "24px",
    fontWeight: "bold",
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
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  th: {
    backgroundColor: "#eaf2f7",
    color: "#1d3557",
    padding: "12px 15px",
    textAlign: "left",
    borderBottom: "2px solid #ddd",
    borderRight: "1px solid #e0e0e0",
    fontSize: "15px",
    fontWeight: "bold",
  },
  td: {
    padding: "12px 15px",
    borderBottom: "1px solid #eee",
    fontSize: "14px",
    verticalAlign: "top",
    borderRight: "1px solid #f0f0f0",
    textAlign: "left",
  },
  mensagemAviso: {
    color: "#ff9900",
    backgroundColor: "#fff3cd",
    padding: "15px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "bold",
    margin: "20px auto",
    maxWidth: "800px",
    fontStyle: "italic",
  },
};
