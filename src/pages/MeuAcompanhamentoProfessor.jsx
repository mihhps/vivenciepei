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
import { isAuthorized } from "../utils/authUtils";

// Função auxiliar para formatar datas para exibição
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

/**
 * Componente que permite a um professor logado visualizar o status de PEI de seus próprios alunos.
 * Filtra alunos com base nas turmas e escolas vinculadas ao perfil do professor logado.
 */
export default function MeuAcompanhamentoProfessor() {
  const navigate = useNavigate();
  const [professorLogado, setProfessorLogado] = useState(null);
  const [alunosComStatusPei, setAlunosComStatusPei] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    console.log("Valor de usuario no useEffect:", usuario);
    if (
      !usuario ||
      usuario.perfil !== "professor" ||
      !isAuthorized(usuario.perfil)
    ) {
      alert(
        "Você não tem permissão para acessar esta página. Acesso restrito a professores."
      );
      navigate("/");
      return;
    }
    setProfessorLogado(usuario);

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
        hoje.setHours(0, 0, 0, 0);

        let escolaIdsParaQuery = usuario.escolasVinculadas.map((e) => e.id);
        if (escolaIdsParaQuery.length > 10) {
          console.warn(
            `[MeuAcompanhamento] Professor tem ${escolaIdsParaQuery.length} escolas. A query 'in' será limitada às primeiras 10 escolas.`
          );
          escolaIdsParaQuery = escolaIdsParaQuery.slice(0, 10);
        }

        let turmasParaQuery = usuario.turmasVinculadas;
        if (turmasParaQuery.length > 10) {
          console.warn(
            `[MeuAcompanhamento] Professor tem ${turmasParaQuery.length} turmas. A query 'in' será limitada às primeiras 10 turmas.`
          );
          turmasParaQuery = turmasParaQuery.slice(0, 10);
        }

        if (escolaIdsParaQuery.length === 0 || turmasParaQuery.length === 0) {
          setError(
            "Erro: Seu perfil de professor não tem escolas ou turmas válidas vinculadas. Não é possível carregar os alunos."
          );
          setLoading(false);
          return;
        }

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
          prazoAnualDoc.dataLimiteCriacaoPEI &&
          typeof prazoAnualDoc.dataLimiteCriacaoPEI.toDate === "function"
            ? prazoAnualDoc.dataLimiteCriacaoPEI.toDate()
            : null;
        const dataLimiteRevisao1Sem =
          prazoAnualDoc.dataLimiteRevisao1Sem &&
          typeof prazoAnualDoc.dataLimiteRevisao1Sem.toDate === "function"
            ? prazoAnualDoc.dataLimiteRevisao1Sem.toDate()
            : null;
        const dataLimiteRevisao2Sem =
          prazoAnualDoc.dataLimiteRevisao2Sem &&
          typeof prazoAnualDoc.dataLimiteRevisao2Sem.toDate === "function"
            ? prazoAnualDoc.dataLimiteRevisao2Sem.toDate()
            : null;

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

        console.log(
          `[MeuAcompanhamento] Buscando alunos para turmas: ${turmasParaQuery.join(
            ", "
          )} e escolas: ${escolaIdsParaQuery.join(", %20")}`
        ); // <<<< NOVO LOG 1
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

        console.log(
          `[MeuAcompanhamento] ${alunosList.length} alunos encontrados pela query.`
        ); // <<<< NOVO LOG 2

        if (alunosList.length === 0) {
          setError(
            "Nenhum aluno encontrado para suas turmas e escolas vinculadas."
          );
          setLoading(false);
          return;
        }

        // 5. Para cada aluno, verificar o status do PEI e das revisões detalhadamente
        // ✅ MUDANÇA: Inicializar alunosComStatus aqui para evitar ReferenceError
        let alunosComStatus = [];
        alunosComStatus = await Promise.all(
          alunosList.map(async (aluno) => {
            let statusPeiGeral = "Não iniciado";
            let statusRevisao1 = "N/A";
            let statusRevisao2 = "N/A";
            let dataUltimaAtualizacaoPei = null;

            // Função auxiliar para zerar a hora (duplicada da CF, mas necessária aqui)
            const resetTimeLocal = (date) => {
              if (date instanceof Date) {
                const newDate = new Date(date.getTime());
                newDate.setHours(0, 0, 0, 0);
                return newDate;
              }
              return null;
            };

            const hojeZeradoLocal = resetTimeLocal(new Date());

            console.log(
              `[MeuAcompanhamento] Buscando PEI para aluno ${aluno.nome} (ID: ${aluno.id}) no ano ${anoAtual} e escola: ${aluno.escolaId}`
            ); // <<<< NOVO LOG 3
            const qPei = query(
              collection(db, "peis"),
              where("alunoId", "==", aluno.id),
              where("anoLetivo", "==", anoAtual),
              where("escolaId", "in", escolaIdsParaQuery),
              orderBy("criadoEm", "desc"),
              limit(1)
            );
            const peiSnap = await getDocs(qPei);

            if (peiSnap.empty) {
              console.log(
                `[MeuAcompanhamento] PEI NÃO encontrado para ${aluno.nome}.`
              ); // <<<< NOVO LOG 4
              if (
                dataLimiteCriacaoPEI &&
                hojeZeradoLocal >= dataLimiteCriacaoPEI
              ) {
                statusPeiGeral = "Atrasado - Sem PEI";
              } else {
                statusPeiGeral = "Aguardando Criação";
              }
              if (
                dataLimiteRevisao1Sem &&
                hojeZeradoLocal >= dataLimiteRevisao1Sem
              )
                statusRevisao1 = "Atrasado (PEI não criado)";
              if (
                dataLimiteRevisao2Sem &&
                hojeZeradoLocal >= dataLimiteRevisao2Sem
              )
                statusRevisao2 = "Atrasado (PEI não criado)";
            } else {
              const peiData = peiSnap.docs[0].data();
              console.log(
                `[MeuAcompanhamento] PEI encontrado para ${aluno.nome}. Dados:`,
                peiData
              ); // <<<< NOVO LOG 5

              // ✅ CORREÇÃO DE DATAS: Tratar criadoEm e dataUltimaRevisao como string ou Timestamp
              const dataCriacaoPei =
                peiData.criadoEm instanceof Date
                  ? peiData.criadoEm
                  : peiData.criadoEm?.toDate instanceof Function
                    ? peiData.criadoEm.toDate()
                    : typeof peiData.criadoEm === "string"
                      ? new Date(peiData.criadoEm)
                      : null;

              dataUltimaAtualizacaoPei =
                peiData.dataUltimaRevisao instanceof Date
                  ? peiData.dataUltimaRevisao
                  : peiData.dataUltimaRevisao?.toDate instanceof Function
                    ? peiData.dataUltimaRevisao.toDate()
                    : typeof peiData.dataUltimaRevisao === "string"
                      ? new Date(peiData.dataUltimaRevisao)
                      : null;

              dataUltimaAtualizacaoPei =
                dataUltimaAtualizacaoPei || dataCriacaoPei; // Fallback

              // --- LÓGICA DE STATUS REPLICADA DA CLOUD FUNCTION ---
              if (dataLimiteCriacaoPEI) {
                if (hoje >= dataLimiteCriacaoPEI) {
                  if (
                    dataCriacaoPei &&
                    dataCriacaoPei <= dataLimiteCriacaoPEI
                  ) {
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
              } else {
                statusPeiGeral = dataCriacaoPei
                  ? "Criado (Prazo não definido)"
                  : "Não iniciado (Prazo não definido)";
              }

              if (dataCriacaoPei) {
                // Só avalia revisões se o PEI foi criado
                // Revisão 1
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

                // Revisão 2
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
            } // Fim do if (peiSnap.empty) / else

            // ✅ LÓGICA FINAL PARA isAtrasadoRealmenteLocal (REPLICADA DA CLOUD FUNCTION)
            let isAtrasadoRealmenteLocal = false; // Declaração dentro do escopo certo para esta lógica

            if (
              statusPeiGeral === "Atrasado - Sem PEI" ||
              statusPeiGeral === "Atrasado - Sem PEI (Dados Inconsistentes)" ||
              statusRevisao1 === "Atrasado" ||
              statusRevisao1 === "Atrasado (PEI não criado)" ||
              statusRevisao2 === "Atrasado" ||
              statusRevisao2 === "Atrasado (PEI não criado)"
            ) {
              isAtrasadoRealmenteLocal = true;
            }
            // Retorna o objeto completo com a flag
            return {
              ...aluno,
              statusPeiGeral,
              statusRevisao1,
              statusRevisao2,
              dataUltimaAtualizacaoPei,
              isAtrasadoRealmente: isAtrasadoRealmenteLocal,
            };
          })
        );
        // Filtra a lista final para exibir apenas os alunos com pendência real
        const alunosRealmenteAtrasados = alunosComStatus.filter(
          (aluno) => aluno.isAtrasadoRealmente
        );
        setAlunosComStatusPei(alunosRealmenteAtrasados); // Atualiza o estado com a lista FILTRADA
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
  }, [usuario, navigate]);

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
              {/* Renderiza a lista FILTRADA de alunos com pendência real */}
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
