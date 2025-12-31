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

// --- STYLED COMPONENTS (MANTIDOS IGUAIS) ---
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
  gap: 10px;
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

// --- COMPONENTE PRINCIPAL ---

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

    // =====================================================================
    // 1. LÓGICA DE SELEÇÃO DE ESCOLA (CORREÇÃO APLICADA AQUI)
    // =====================================================================

    // Tenta pegar a escola ativa do LocalStorage
    const escolaAtivaId = localStorage.getItem("escolaId");

    // Pega as escolas vinculadas ao usuário para validação
    const escolasVinculadasUsuario = user.escolas
      ? Object.keys(user.escolas)
      : [];

    // Define qual ID usar: O do storage (se válido) ou o primeiro da lista do usuário (fallback)
    let escolaParaBuscar = null;

    if (escolaAtivaId && escolasVinculadasUsuario.includes(escolaAtivaId)) {
      escolaParaBuscar = escolaAtivaId;
    } else if (escolasVinculadasUsuario.length > 0) {
      // Fallback: Se não tiver nada no storage ou for inválido, pega a primeira
      escolaParaBuscar = escolasVinculadasUsuario[0];
    }

    // Se depois disso tudo não tiver escola, erro.
    if (!escolaParaBuscar) {
      setError("Seu perfil não está vinculado a nenhuma escola.");
      setLoading(false);
      return;
    }

    // Turmas vinculadas (continua igual)
    const turmasVinculadas = user.turmas
      ? Object.keys(user.turmas).map((t) => t.trim().toLowerCase())
      : [];

    if (turmasVinculadas.length === 0) {
      setError("Você não possui turmas vinculadas nesta escola.");
      setLoading(false);
      return;
    }
    // =====================================================================

    const carregarMeusDetalhes = async () => {
      setError(null);
      try {
        const anoAtual = new Date().getFullYear();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Busca Prazos
        const qPrazos = query(
          collection(db, "prazosPEIAnuais"),
          where("anoLetivo", "==", anoAtual),
          limit(1)
        );
        const prazosSnap = await getDocs(qPrazos);
        const prazoAnualDoc = prazosSnap.empty
          ? null
          : prazosSnap.docs[0].data();

        // Datas limites (pode ser null se não tiver prazo configurado)
        const dataLimiteCriacaoPEI =
          prazoAnualDoc?.dataLimiteCriacaoPEI?.toDate();
        const dataLimiteRevisao1Sem =
          prazoAnualDoc?.dataLimiteRevisao1Sem?.toDate();
        const dataLimiteRevisao2Sem =
          prazoAnualDoc?.dataLimiteRevisao2Sem?.toDate();

        // =================================================================
        // 2. QUERY FILTRADA PELA ESCOLA SELECIONADA (CORREÇÃO)
        // =================================================================
        // Antigo: where("escolaId", "in", escolasVinculadas)
        // Novo: where("escolaId", "==", escolaParaBuscar)
        const qAlunos = query(
          collection(db, "alunos"),
          where("escolaId", "==", escolaParaBuscar)
        );
        const alunosSnap = await getDocs(qAlunos);

        if (alunosSnap.empty) {
          // Mensagem mais amigável
          setError("Nenhum aluno encontrado nesta unidade escolar.");
          setLoading(false);
          return;
        }

        const todosAlunosDaEscola = alunosSnap.docs.map((doc) => {
          const alunoData = doc.data();
          return {
            id: doc.id,
            ...alunoData,
            isTea: verificaTea(alunoData.diagnostico),
          };
        });

        // Filtra os alunos pelas turmas do professor
        const alunosFiltradosPorTurma = todosAlunosDaEscola.filter(
          (aluno) =>
            aluno.turma &&
            turmasVinculadas.includes(aluno.turma.trim().toLowerCase())
        );

        if (alunosFiltradosPorTurma.length === 0) {
          setError("Nenhum aluno das suas turmas encontrado nesta escola.");
          setLoading(false);
          return;
        }

        // Processa o status do PEI para cada aluno
        const alunosComStatus = await Promise.all(
          alunosFiltradosPorTurma.map(async (aluno) => {
            const qPei = query(
              collection(db, "peis"),
              where("alunoId", "==", aluno.id),
              where("anoLetivo", "==", anoAtual),
              where("criadorId", "==", user.email), // Garante que é o PEI deste prof
              orderBy("dataCriacao", "desc"),
              limit(1)
            );
            const peiSnap = await getDocs(qPei);

            let peiDocId = null;
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
              // Lógica simplificada de atraso se não existe PEI
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
              const peiDoc = peiSnap.docs[0];
              const peiData = peiDoc.data();
              peiDocId = peiDoc.id;

              const dataCriacaoPei = peiData?.dataCriacao?.toDate
                ? peiData.dataCriacao.toDate()
                : new Date(peiData.dataCriacao);

              dataUltimaAtualizacaoPei = peiData?.dataUltimaRevisao?.toDate
                ? peiData.dataUltimaRevisao.toDate()
                : peiData?.dataUltimaRevisao
                ? new Date(peiData.dataUltimaRevisao)
                : dataCriacaoPei;

              // --- Lógica de Status Geral ---
              if (dataLimiteCriacaoPEI) {
                if (hojeZeradoLocal >= resetTimeLocal(dataLimiteCriacaoPEI)) {
                  if (
                    dataCriacaoPei &&
                    resetTimeLocal(dataCriacaoPei) <=
                      resetTimeLocal(dataLimiteCriacaoPEI)
                  ) {
                    statusPeiGeral = "Criado no Prazo";
                  } else {
                    statusPeiGeral = "Criado (Atrasado)";
                  }
                } else {
                  statusPeiGeral = "Criado (antes do prazo)";
                }
              } else {
                statusPeiGeral = "Criado";
              }

              // --- Lógica de Revisões (Simplificada para brevidade) ---
              // ... (Sua lógica de revisão original estava OK, mantendo a estrutura básica)
              if (dataCriacaoPei) {
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
                    statusRevisao1 = "Aguardando prazo";
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
                    statusRevisao2 = "Aguardando prazo";
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
              peiDocId,
            };
          })
        );
        setAlunosComStatusPei(alunosComStatus);
      } catch (err) {
        console.error("Erro ao carregar acompanhamento:", err);
        setError("Ocorreu um erro ao carregar seus dados.");
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

        {/* Mostra qual escola está sendo exibida */}
        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "10px",
            fontSize: "12px",
          }}
        >
          Unidade Escolar ID: {localStorage.getItem("escolaId") || "Padrão"}
        </p>

        <p style={{ marginBottom: "20px" }}>
          Status detalhado dos PEIs de seus alunos nesta unidade.
        </p>

        {!temAlunosParaExibir ? (
          <div style={estilos.mensagemAviso}>
            Nenhum aluno encontrado nesta unidade escolar.
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
                    <StatusLabel>Status Geral:</StatusLabel>
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
                    <StatusLabel>Atualização:</StatusLabel>
                    <span>{aluno.dataUltimaAtualizacaoPei}</span>
                  </StatusItem>
                </StatusSection>

                {(aluno.statusPeiGeral.includes("Atrasado - Sem PEI") ||
                  aluno.isAtrasadoRealmente) && (
                  <AcaoButton
                    onClick={() => {
                      if (aluno.peiDocId) {
                        navigate(`/editar-pei/${aluno.peiDocId}`);
                      } else {
                        navigate("/criar-pei", {
                          state: { alunoParaSelecionar: aluno },
                        });
                      }
                    }}
                  >
                    {aluno.statusPeiGeral.includes("Atrasado - Sem PEI")
                      ? "Criar PEI"
                      : "Atualizar PEI"}
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
