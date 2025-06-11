// src/pages/MeuAcompanhamentoProfessor.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";
// ... (outros imports)
import { isAuthorized } from "../utils/authUtils"; // <-- Verifique esta linha
// ...

// Função auxiliar para formatar datas para exibição
const formatDate = (date) => {
  if (!date) return "N/A";
  return date.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/**
 * Componente que permite a um professor logado visualizar o status de PEI de seus próprios alunos.
 * Filtra alunos com base nas turmas e escolas vinculadas ao perfil do professor logado.
 */
export default function MeuAcompanhamentoProfessor() {
  const navigate = useNavigate();
  const [professorLogado, setProfessorLogado] = useState(null); // O professor logado
  const [alunosComStatusPei, setAlunosComStatusPei] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Usa useMemo para parsear os dados do usuário logado apenas uma vez
  // e extrair os IDs e nomes das escolas e turmas vinculadas ao perfil.
  const usuario = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuarioLogado"));
      // Mapeia escolas vinculadas para um array de objetos { id, nome }
      const escolasVinculadas =
        user?.escolas && typeof user.escolas === "object"
          ? Object.keys(user.escolas).map((id) => ({
              id,
              nome: user.escolas[id] || id,
            }))
          : [];
      // Mapeia turmas vinculadas para um array de nomes de turma
      const turmasVinculadas =
        user?.turmas && typeof user.turmas === "object"
          ? Object.keys(user.turmas)
          : [];
      return { ...user, escolasVinculadas, turmasVinculadas };
    } catch (e) {
      console.error("Erro ao parsear dados do usuário logado:", e);
      return null;
    }
  }, []);

  useEffect(() => {
    // 1. Verificação de Permissão do Usuário Logado
    // Apenas perfil 'professor' pode acessar esta página
    if (
      !usuario ||
      usuario.perfil !== "professor" ||
      !isAuthorized(usuario.perfil)
    ) {
      alert(
        "Você não tem permissão para acessar esta página. Acesso restrito a professores."
      );
      navigate("/"); // Redireciona para a página inicial
      return;
    }
    // Define o professor logado para exibição (nome, etc.)
    setProfessorLogado(usuario);

    // 2. Verificação de Vínculo de Escola e Turma do Professor Logado
    if (!usuario.escolasVinculadas || usuario.escolasVinculadas.length === 0) {
      setError(
        "Seu perfil de professor não está vinculado a nenhuma escola. Por favor, entre em contato com o administrador."
      );
      setLoading(false);
      return;
    }
    if (!usuario.turmasVinculadas || usuario.turmasVinculadas.length === 0) {
      setError(
        "Seu perfil de professor não está vinculado a nenhuma turma. Por favor, entre em contato com o administrador."
      );
      setLoading(false);
      return;
    }

    const carregarMeusDetalhes = async () => {
      setLoading(true);
      setError(null);
      try {
        const anoAtual = new Date().getFullYear();
        const hoje = new Date();

        // Determina os IDs de escola a serem usados nas queries (as escolas do próprio professor)
        // Limita a 10 para o operador 'in'
        let escolaIdsParaQuery = usuario.escolasVinculadas.map((e) => e.id);
        if (escolaIdsParaQuery.length > 10) {
          console.warn(
            `[MeuAcompanhamento] Professor tem ${escolaIdsParaQuery.length} escolas. A query 'in' será limitada às primeiras 10 escolas.`
          );
          escolaIdsParaQuery = escolaIdsParaQuery.slice(0, 10);
        }

        // Determina as turmas a serem usadas nas queries (as turmas do próprio professor)
        // Limita a 10 para o operador 'in'
        let turmasParaQuery = usuario.turmasVinculadas;
        if (turmasParaQuery.length > 10) {
          console.warn(
            `[MeuAcompanhamento] Professor tem ${turmasParaQuery.length} turmas. A query 'in' será limitada às primeiras 10 turmas.`
          );
          turmasParaQuery = turmasParaQuery.slice(0, 10);
        }

        // Checagem de arrays vazios antes de construir as queries com 'in'
        if (escolaIdsParaQuery.length === 0 || turmasParaQuery.length === 0) {
          setError(
            "Erro: Seu perfil de professor não tem escolas ou turmas válidas vinculadas. Não é possível carregar os alunos."
          );
          setLoading(false);
          return;
        }

        // 3. Buscar prazos anuais do PEI (necessário para a lógica de status)
        const qPrazos = query(
          collection(db, "prazosPEIAnuais"),
          where("anoLetivo", "==", anoAtual),
          limit(1)
        );
        const prazosSnap = await getDocs(qPrazos);
        const prazoAnualDoc = prazosSnap.empty
          ? null
          : prazosSnap.docs[0].data();

        if (!prazoAnualDoc) {
          setError(
            `Não foi encontrada uma configuração de prazos anual para o PEI do ano de ${anoAtual}. Por favor, entre em contato com a gestão.`
          );
          setLoading(false);
          return;
        }
        const dataLimiteCriacaoPEI =
          prazoAnualDoc.dataLimiteCriacaoPEI?.toDate() || null;
        const dataLimiteRevisao1Sem =
          prazoAnualDoc.dataLimiteRevisao1Sem?.toDate() || null;
        const dataLimiteRevisao2Sem =
          prazoAnualDoc.dataLimiteRevisao2Sem?.toDate() || null;

        const todosPrazosDefinidos = [
          dataLimiteCriacaoPEI,
          dataLimiteRevisao1Sem,
          dataLimiteRevisao2Sem,
        ].filter(Boolean);
        if (todosPrazosDefinidos.length === 0) {
          setError(
            `Nenhum prazo válido foi definido para o PEI do ano de ${anoAtual}. Por favor, entre em contato com a gestão.`
          );
          setLoading(false);
          return;
        }

        // 4. Buscar os ALUNOS deste professor (vinculados às suas turmas E escolas)
        const qAlunos = query(
          collection(db, "alunos"),
          where("turma", "in", turmasParaQuery), // Alunos das turmas do professor
          where("escolaId", "in", escolaIdsParaQuery) // Alunos das escolas do professor
        );
        const alunosSnap = await getDocs(qAlunos);
        const alunosList = alunosSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (alunosList.length === 0) {
          setError(
            "Nenhum aluno encontrado para suas turmas e escolas vinculadas."
          );
          setLoading(false);
          return;
        }

        // 5. Para cada aluno, verificar o status do PEI e das revisões detalhadamente
        const alunosComStatus = await Promise.all(
          alunosList.map(async (aluno) => {
            let statusPeiGeral = "Não iniciado";
            let statusRevisao1 = "N/A";
            let statusRevisao2 = "N/A";
            let dataUltimaAtualizacaoPei = null;

            // Busca o PEI mais recente do aluno (filtrando pela escola do professor)
            const qPei = query(
              collection(db, "peis"),
              where("alunoId", "==", aluno.id),
              where("anoLetivo", "==", anoAtual),
              where("escolaId", "in", escolaIdsParaQuery), // PEI da escola do professor
              orderBy("criadoEm", "desc"),
              limit(1)
            );
            const peiSnap = await getDocs(qPei);

            if (peiSnap.empty) {
              if (dataLimiteCriacaoPEI && hoje >= dataLimiteCriacaoPEI) {
                statusPeiGeral = "Atrasado - Sem PEI";
              } else {
                statusPeiGeral = "Aguardando Criação";
              }
              if (dataLimiteRevisao1Sem && hoje >= dataLimiteRevisao1Sem)
                statusRevisao1 = "Atrasado";
              if (dataLimiteRevisao2Sem && hoje >= dataLimiteRevisao2Sem)
                statusRevisao2 = "Atrasado";
            } else {
              const peiData = peiSnap.docs[0].data();
              const dataCriacaoPei = peiData.criadoEm
                ? peiData.criadoEm.toDate()
                : null;
              dataUltimaAtualizacaoPei = peiData.dataUltimaRevisao
                ? peiData.dataUltimaRevisao.toDate()
                : dataCriacaoPei;

              if (dataLimiteCriacaoPEI && hoje >= dataLimiteCriacaoPEI) {
                if (dataCriacaoPei && dataCriacaoPei <= dataLimiteCriacaoPEI) {
                  statusPeiGeral = "Criado no Prazo";
                } else if (
                  dataCriacaoPei &&
                  dataCriacaoPei > dataLimiteCriacaoPEI
                ) {
                  statusPeiGeral = "Criado (Atrasado)";
                } else {
                  statusPeiGeral = "Atrasado - Sem PEI";
                }
              } else {
                statusPeiGeral = "Aguardando Criação";
                if (dataCriacaoPei)
                  statusPeiGeral = "Criado (antes do prazo final)";
              }

              if (dataLimiteRevisao1Sem) {
                if (hoje >= dataLimiteRevisao1Sem) {
                  if (
                    dataUltimaAtualizacaoPei &&
                    dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem
                  ) {
                    statusRevisao1 = "Em dia (Feita)";
                  } else {
                    statusRevisao1 = "Atrasado";
                  }
                } else {
                  statusRevisao1 = "Aguardando";
                  if (
                    dataUltimaAtualizacaoPei &&
                    dataUltimaAtualizacaoPei >= dataLimiteCriacaoPEI
                  ) {
                    statusRevisao1 = "Feita (Aguardando prazo)";
                  }
                }
              }

              if (dataLimiteRevisao2Sem) {
                if (hoje >= dataLimiteRevisao2Sem) {
                  if (
                    dataUltimaAtualizacaoPei &&
                    dataUltimaAtualizacaoPei >= dataLimiteRevisao2Sem
                  ) {
                    statusRevisao2 = "Em dia (Feita)";
                  } else {
                    statusRevisao2 = "Atrasado";
                  }
                } else {
                  statusRevisao2 = "Aguardando";
                  if (
                    dataUltimaAtualizacaoPei &&
                    dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem
                  ) {
                    statusRevisao2 = "Feita (Aguardando prazo)";
                  }
                }
              }
            }

            return {
              ...aluno,
              statusPeiGeral,
              statusRevisao1,
              statusRevisao2,
              dataUltimaAtualizacaoPei,
            };
          })
        );
        setAlunosComStatusPei(alunosComStatus);
      } catch (err) {
        console.error("Erro ao carregar detalhes do professor:", err);
        setError(
          "Ocorreu um erro ao carregar seus dados de acompanhamento. Por favor, tente novamente. Detalhes: " +
            err.message
        );
      } finally {
        setLoading(false);
      }
    };

    carregarMeusDetalhes();
  }, [usuario, navigate]); // Dependências: recarrega se o usuário logado mudar

  if (loading) return <Loader />;
  if (error) return <div style={estilos.errorMessage}>{error}</div>;

  const temAlunosParaExibir = alunosComStatusPei.length > 0;

  return (
    <div style={estilos.container}>
      <div style={estilos.content}>
        <BotaoVoltar />
        <h1 style={estilos.title}>Meu Acompanhamento de PEIs</h1>
        {professorLogado && (
          <h2 style={estilos.subtitle}>Professor: {professorLogado.nome}</h2>
        )}

        <p style={{ marginBottom: "20px" }}>
          Status detalhado dos PEIs de seus alunos, com base nos prazos de
          criação e revisões.
        </p>

        {!temAlunosParaExibir && !loading ? (
          <div style={estilos.mensagemAviso}>
            Nenhum aluno encontrado para suas turmas e escolas vinculadas neste
            ano letivo, ou nenhum PEI criado/revisado para eles. Verifique suas
            vinculações de turmas e escolas.
          </div>
        ) : (
          <table style={estilos.table}>
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
              {alunosComStatusPei.map((aluno) => (
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

// Estilos (reutilizados dos outros componentes para consistência)
const estilos = {
  container: {
    minHeight: "100vh",
    background: "#f1f8fc",
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
    fontSize: "28px",
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#457b9d",
    marginBottom: "25px",
    fontSize: "22px",
    textAlign: "center",
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
    fontSize: "15px",
    fontWeight: "bold",
  },
  td: {
    padding: "12px 15px",
    borderBottom: "1px solid #ddd",
    fontSize: "14px",
    verticalAlign: "top",
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
  mensagemAviso: {
    color: "#ff9900",
    backgroundColor: "#fff3cd",
    padding: "10px",
    borderRadius: "5px",
    marginBottom: "20px",
    textAlign: "center",
    fontWeight: "bold",
  },
};
