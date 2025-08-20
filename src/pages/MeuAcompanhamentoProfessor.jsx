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
import styled from "styled-components";
// Importação do ícone de quebra-cabeça
import { FaPuzzlePiece } from "react-icons/fa";

// --- FUNÇÃO PARA IDENTIFICAR ALUNOS COM TEA ---
const verificaTea = (diagnostico) => {
  if (!diagnostico) return false;
  const diagnosticoLowerCase = diagnostico.toLowerCase();
  const palavrasChave = ["tea", "autismo", "espectro autista"];
  return palavrasChave.some((palavra) =>
    diagnosticoLowerCase.includes(palavra)
  );
};
// --- FIM DA FUNÇÃO DE VERIFICAÇÃO DE TEA ---

// Função auxiliar para formatar datas
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

// --- STYLED COMPONENTS ---

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const StudentCard = styled.div`
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease-in-out;
  position: relative;

  &:hover {
    transform: translateY(-5px);
  }
`;

const StudentName = styled.h3`
  color: #1d3557;
  font-size: 1.5em;
  margin-top: 0;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 10px; // Espaço entre o nome e o ícone
`;

const StudentInfo = styled.p`
  color: #457b9d;
  font-size: 1em;
  margin: 0;
`;

const StatusSection = styled.div`
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95em;
`;

const StatusLabel = styled.span`
  font-weight: bold;
  color: #1d3557;
  min-width: 120px;
`;

const StatusChip = styled.span`
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.85em;
  color: #fff;
  white-space: nowrap;
  text-align: center;
  background-color: ${(props) => {
    if (props.status.includes("Atrasado")) return "#e63946";
    if (props.status.includes("Criado") || props.status.includes("Feita"))
      return "#28a745";
    return "#ffc107";
  }};
`;

const AcaoButton = styled.button`
  background-color: #28a745;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 15px;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  margin-top: auto;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #218838;
  }
`;

const TeaIcon = styled(FaPuzzlePiece)`
  font-size: 1.1em;
  color: #457b9d;
`;

// --- FIM DOS STYLED COMPONENTS ---

export default function MeuAcompanhamentoProfessor() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [alunosComStatusPei, setAlunosComStatusPei] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user || user.perfil?.trim() !== "professor") {
      alert("Acesso negado. Esta página é restrita a professores.");
      navigate("/");
      return;
    }

    setLoading(true);

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
      setError(null);
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

        const alunosList = alunosSnap.docs.map((doc) => {
          const alunoData = doc.data();
          return {
            id: doc.id,
            ...alunoData,
            isTea: verificaTea(alunoData.diagnostico),
          };
        });

        const alunosComStatus = await Promise.all(
          alunosList.map(async (aluno) => {
            const qPei = query(
              collection(db, "peis"),
              where("alunoId", "==", aluno.id),
              where("anoLetivo", "==", anoAtual),
              where("criadorId", "==", user.email),
              orderBy("dataCriacao", "desc"),
              limit(1)
            );
            const peiSnap = await getDocs(qPei);

            let statusPeiGeral = "Não iniciado";
            let statusRevisao1 = "N/A";
            let statusRevisao2 = "N/A";
            let dataUltimaAtualizacaoPei = null;
            let isAtrasadoRealmenteLocal = false;

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

              const dataCriacaoPei =
                peiData?.dataCriacao instanceof Date
                  ? peiData.dataCriacao
                  : peiData?.dataCriacao?.toDate instanceof Function
                    ? peiData.dataCriacao.toDate()
                    : typeof peiData.dataCriacao === "string"
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
            }

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
        setAlunosComStatusPei(alunosComStatus);
      } catch (err) {
        console.error("Erro ao carregar acompanhamento:", err);
        setError("Ocorreu um erro ao carregar seus dados: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    carregarMeusDetalhes();
  }, [user, authLoading, navigate]);

  if (authLoading || loading) return <Loader />;

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
          <CardGrid>
            {alunosComStatusPei.map((aluno) => (
              <StudentCard key={aluno.id}>
                <StudentName>
                  {aluno.nome}
                  {aluno.isTea && <TeaIcon title="Aluno com TEA" />}
                </StudentName>
                <StudentInfo>Turma: {aluno.turma}</StudentInfo>
                <StatusSection>
                  <StatusItem>
                    <StatusLabel>Status Geral PEI:</StatusLabel>
                    <StatusChip status={aluno.statusPeiGeral}>
                      {aluno.statusPeiGeral}
                    </StatusChip>
                  </StatusItem>
                  <StatusItem>
                    <StatusLabel>1ª Revisão:</StatusLabel>
                    <StatusChip status={aluno.statusRevisao1}>
                      {aluno.statusRevisao1}
                    </StatusChip>
                  </StatusItem>
                  <StatusItem>
                    <StatusLabel>2ª Revisão:</StatusLabel>
                    <StatusChip status={aluno.statusRevisao2}>
                      {aluno.statusRevisao2}
                    </StatusChip>
                  </StatusItem>
                  <StatusItem>
                    <StatusLabel>Última Atualização:</StatusLabel>
                    <span>{aluno.dataUltimaAtualizacaoPei}</span>
                  </StatusItem>
                </StatusSection>
                {aluno.statusPeiGeral.includes("Atrasado - Sem PEI") && (
                  <AcaoButton
                    onClick={() =>
                      navigate("/criar-pei", {
                        state: { alunoParaSelecionar: aluno },
                      })
                    }
                  >
                    Criar PEI
                  </AcaoButton>
                )}
              </StudentCard>
            ))}
          </CardGrid>
        )}
      </div>
    </div>
  );
}

// Seus estilos (mantidos como estão, mas alguns não serão mais usados)
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
