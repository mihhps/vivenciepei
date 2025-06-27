// src/pages/MeuAcompanhamentoProfessor.jsx

import React, { useState, useEffect } from "react";
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
import { useAuth } from "../context/AuthContext";

// Função auxiliar para formatar datas (mantida como está)
const formatDate = (date) => {
  if (!date) return "N/A";
  if (typeof date === "string") {
    date = new Date(date);
  }
  if (date.toDate && typeof date.toDate === "function") {
    date = date.toDate();
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "Data Inválida";
  }
  return date.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export default function MeuAcompanhamentoProfessor() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); // user é o objeto do usuário logado do AuthContext

  const [alunosComStatusPei, setAlunosComStatusPei] = useState([]);
  const [loading, setLoading] = useState(true); // Controla o carregamento dos dados da página
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Verifique se o AuthContext ainda está carregando ou se o usuário é nulo.
    // Se user é null E authLoading é false, significa que o usuário NÃO está logado.
    if (authLoading) {
      setLoading(true); // Mantém o loading ativo enquanto a autenticação carrega
      return;
    }

    // 2. Verificação de permissão: Agora, de forma mais robusta
    // user?.perfil?.trim() garante que perfil existe e remove espaços.
    // user.perfil !== "professor" verifica se o perfil não é "professor".
    if (!user || user.perfil?.trim() !== "professor") {
      alert("Acesso negado. Esta página é restrita a professores.");
      navigate("/");
      return; // Interrompe a execução do useEffect
    }

    // A partir daqui, sabemos que user está carregado e tem o perfil "professor".
    setLoading(true); // Inicia o loading para os dados da página

    // Extrai as informações diretamente do objeto 'user' do contexto
    const escolasVinculadas = user.escolas ? Object.keys(user.escolas) : [];
    const turmasVinculadas = user.turmas ? Object.keys(user.turmas) : [];

    if (escolasVinculadas.length === 0 || turmasVinculadas.length === 0) {
      setError(
        "Seu perfil de professor não está vinculado a nenhuma escola ou turma."
      );
      setLoading(false);
      return;
    }

    const carregarMeusDetalhes = async () => {
      setError(null); // Limpa erros anteriores
      try {
        const anoAtual = new Date().getFullYear();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const escolasParaQuery = escolasVinculadas.slice(0, 30);
        const turmasParaQuery = turmasVinculadas.slice(0, 30);

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
            `Nenhuma configuração de prazos encontrada para ${anoAtual}.`
          );
          setLoading(false);
          return;
        }

        const dataLimiteCriacaoPEI =
          prazoAnualDoc.dataLimiteCriacaoPEI?.toDate();
        const dataLimiteRevisao1Sem =
          prazoAnualDoc.dataLimiteRevisao1Sem?.toDate();
        const dataLimiteRevisao2Sem =
          prazoAnualDoc.dataLimiteRevisao2Sem?.toDate();

        const qAlunos = query(
          collection(db, "alunos"),
          where("turma", "in", turmasParaQuery),
          where("escolaId", "in", escolasParaQuery)
        );
        const alunosSnap = await getDocs(qAlunos);

        if (alunosSnap.empty) {
          setError("Nenhum aluno encontrado para suas turmas e escolas.");
          setLoading(false);
          return;
        }

        const alunosList = alunosSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const alunosComStatus = await Promise.all(
          alunosList.map(async (aluno) => {
            const qPei = query(
              collection(db, "peis"),
              where("alunoId", "==", aluno.id),
              where("anoLetivo", "==", anoAtual),
              // IMPORTANTE: Garante que o professor só busque PEIs que ele mesmo criou
              // ou que ele está autorizado a ver (depende de como 'professorId' é armazenado no PEI)
              // Se 'professorId' no PEI for o UID, então user.uid está correto aqui.
              where("criadorId", "==", user.email), // Assumindo que criadorId no PEI é o email
              orderBy("dataCriacao", "desc"), // Usar dataCriacao para ordernar, ou o campo que você usa
              limit(1)
            );
            const peiSnap = await getDocs(qPei);

            let statusPeiGeral = "Não iniciado";
            let statusRevisao1 = "N/A";
            let statusRevisao2 = "N/A";
            let dataUltimaAtualizacaoPei = null;
            let isAtrasadoRealmenteLocal = false; // Flag para status real de atraso

            const resetTimeLocal = (date) => {
              if (date instanceof Date) {
                const newDate = new Date(date.getTime());
                newDate.setHours(0, 0, 0, 0);
                return newDate;
              }
              return null;
            };

            const hojeZeradoLocal = resetTimeLocal(new Date());

            if (peiSnap.empty) {
              if (
                dataLimiteCriacaoPEI &&
                hojeZeradoLocal >= resetTimeLocal(dataLimiteCriacaoPEI)
              ) {
                statusPeiGeral = "Atrasado - Sem PEI";
              } else {
                statusPeiGeral = "Aguardando Criação";
              }
              if (
                dataLimiteRevisao1Sem &&
                hojeZeradoLocal >= resetTimeLocal(dataLimiteRevisao1Sem)
              )
                statusRevisao1 = "Atrasado (PEI não criado)";
              if (
                dataLimiteRevisao2Sem &&
                hojeZeradoLocal >= resetTimeLocal(dataLimiteRevisao2Sem)
              )
                statusRevisao2 = "Atrasado (PEI não criado)";
            } else {
              const peiData = peiSnap.docs[0].data();

              // Tratamento de datas
              const dataCriacaoPei =
                peiData?.dataCriacao instanceof Date // Se já é Date
                  ? peiData.dataCriacao
                  : peiData?.dataCriacao?.toDate instanceof Function // Se é Timestamp
                    ? peiData.dataCriacao.toDate()
                    : typeof peiData.dataCriacao === "string" // Se é string
                      ? new Date(peiData.dataCriacao)
                      : null;

              dataUltimaAtualizacaoPei =
                peiData?.dataUltimaRevisao instanceof Date
                  ? peiData.dataUltimaRevisao
                  : peiData?.dataUltimaRevisao?.toDate instanceof Function
                    ? peiData.dataUltimaRevisao.toDate()
                    : typeof peiData.dataUltimaRevisao === "string"
                      ? new Date(peiData.dataUltimaRevisao)
                      : null;

              dataUltimaAtualizacaoPei =
                dataUltimaAtualizacaoPei || dataCriacaoPei;

              // --- LÓGICA DE STATUS REPLICADA DA CLOUD FUNCTION ---
              if (dataLimiteCriacaoPEI) {
                if (hojeZeradoLocal >= resetTimeLocal(dataLimiteCriacaoPEI)) {
                  if (
                    dataCriacaoPei &&
                    resetTimeLocal(dataCriacaoPei) <=
                      resetTimeLocal(dataLimiteCriacaoPEI)
                  ) {
                    statusPeiGeral = "Criado no Prazo";
                  } else if (
                    dataCriacaoPei &&
                    resetTimeLocal(dataCriacaoPei) >
                      resetTimeLocal(dataLimiteCriacaoPEI)
                  ) {
                    statusPeiGeral = "Criado (Atrasado)";
                  } else {
                    statusPeiGeral =
                      "Atrasado - Sem PEI (Dados Inconsistentes)";
                  }
                } else {
                  statusPeiGeral = dataCriacaoPei
                    ? "Criado (antes do prazo final)"
                    : "Aguardando Criação";
                }
              } else {
                statusPeiGeral = dataCriacaoPei
                  ? "Criado (Prazo não definido)"
                  : "Não iniciado (Prazo não definido)";
              }

              if (dataCriacaoPei) {
                // Só avalia revisões se o PEI foi criado
                // Revisão 1
                if (dataLimiteRevisao1Sem) {
                  if (
                    hojeZeradoLocal >= resetTimeLocal(dataLimiteRevisao1Sem)
                  ) {
                    if (
                      dataUltimaAtualizacaoPei &&
                      resetTimeLocal(dataUltimaAtualizacaoPei) >=
                        resetTimeLocal(dataLimiteRevisao1Sem)
                    ) {
                      statusRevisao1 = "Em dia (Feita)";
                    } else {
                      statusRevisao1 = "Atrasado";
                    }
                  } else {
                    statusRevisao1 =
                      dataUltimaAtualizacaoPei &&
                      resetTimeLocal(dataUltimaAtualizacaoPei) >=
                        resetTimeLocal(dataCriacaoPei)
                        ? "Feita (Aguardando prazo)"
                        : "Aguardando";
                  }
                }

                // Revisão 2
                if (dataLimiteRevisao2Sem) {
                  if (
                    hojeZeradoLocal >= resetTimeLocal(dataLimiteRevisao2Sem)
                  ) {
                    if (
                      dataUltimaAtualizacaoPei &&
                      resetTimeLocal(dataUltimaAtualizacaoPei) >=
                        resetTimeLocal(dataLimiteRevisao2Sem)
                    ) {
                      statusRevisao2 = "Em dia (Feita)";
                    } else {
                      statusRevisao2 = "Atrasado";
                    }
                  } else {
                    statusRevisao2 =
                      dataUltimaAtualizacaoPei &&
                      resetTimeLocal(dataUltimaAtualizacaoPei) >=
                        resetTimeLocal(dataCriacaoPei) &&
                      (!dataLimiteRevisao1Sem ||
                        resetTimeLocal(dataUltimaAtualizacaoPei) >=
                          resetTimeLocal(dataLimiteRevisao1Sem))
                        ? "Feita (Aguardando prazo)"
                        : "Aguardando";
                  }
                }
              }
            } // Fim do if (peiSnap.empty) / else

            // Lógica para determinar se o aluno está REALMENTE atrasado
            if (
              statusPeiGeral.includes("Atrasado") ||
              statusRevisao1 === "Atrasado" ||
              statusRevisao2 === "Atrasado"
            ) {
              isAtrasadoRealmenteLocal = true;
            }

            return {
              ...aluno,
              statusPeiGeral,
              statusRevisao1,
              statusRevisao2,
              dataUltimaAtualizacaoPei: dataUltimaAtualizacaoPei
                ? formatDate(dataUltimaAtualizacaoPei)
                : "N/A",
              isAtrasadoRealmente: isAtrasadoRealmenteLocal,
            };
          })
        );
        setAlunosComStatusPei(alunosComStatus); // Exibe TODOS os alunos para o professor
      } catch (err) {
        console.error("Erro ao carregar acompanhamento:", err);
        setError("Ocorreu um erro ao carregar seus dados: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    carregarMeusDetalhes();
  }, [user, authLoading, navigate]); // Dependências

  // Renderização condicional para carregamento
  if (authLoading || loading) return <Loader />;

  // Renderização condicional para erro
  if (error) return <div style={estilos.errorMessage}>{error}</div>;

  const temAlunosParaExibir = alunosComStatusPei.length > 0;

  return (
    <div style={estilos.container}>
      <div style={estilos.content}>
        <BotaoVoltar />
        <h1 style={estilos.title}>Meu Acompanhamento de PEIs</h1>
        {user && <h2 style={estilos.subtitle}>Professor: {user.nome}</h2>}

        <p style={{ marginBottom: "20px" }}>
          Status detalhado dos PEIs de seus alunos, com base nos prazos de
          criação e revisões.
        </p>

        {!temAlunosParaExibir ? (
          <div style={estilos.mensagemAviso}>
            Nenhum aluno com PEI encontrado para suas turmas e escolas
            vinculadas.
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
                          ? "#dc3545"
                          : aluno.statusPeiGeral.includes("Criado")
                            ? "#28a745"
                            : "#ffc107",
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
                          : aluno.statusRevisao1.includes("Feita")
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
                          : aluno.statusRevisao2.includes("Feita")
                            ? "#28a745"
                            : "#ffc107",
                      }}
                    >
                      {aluno.statusRevisao2}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    {/* Aqui a data já vem formatada da lógica */}
                    {aluno.dataUltimaAtualizacaoPei}
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

// Seus estilos (mantidos como estão)
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
