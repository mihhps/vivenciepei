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

    const perfisComAcessoAmploSeNaoVinculado = [
      "desenvolvedor",
      "gestao",
      "aee",
    ];
    if (
      !perfisComAcessoAmploSeNaoVinculado.includes(currentUserData.perfil) &&
      (!currentUserData.escolasVinculadas ||
        currentUserData.escolasVinculadas.length === 0)
    ) {
      setFetchError(
        "Seu perfil não está vinculado a nenhuma escola. Por favor, entre em contato com o administrador para vincular escolas ao seu perfil."
      );
      setLoading(false);
      return;
    }

    const carregarDetalhesAtrasos = async () => {
      setLoading(true);
      setFetchError(null);
      setNoDataMessage(null);

      try {
        const anoAtual = new Date().getFullYear();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const escolaIdsParaQuery =
          perfisComAcessoAmploSeNaoVinculado.includes(currentUserData.perfil) &&
          (!currentUserData.escolasVinculadas ||
            currentUserData.escolasVinculadas.length === 0)
            ? []
            : currentUserData.escolasVinculadas.slice(0, 10);

        const profDocRef = doc(db, "usuarios", professorId);
        const profDocSnap = await getDoc(profDocRef);

        if (!profDocSnap.exists()) {
          setFetchError("Professor não encontrado na base de dados.");
          return;
        }
        const profData = { id: profDocSnap.id, ...profDocSnap.data() };
        setProfessor(profData);

        let turmasDoProfessor =
          profData.turmas && typeof profData.turmas === "object"
            ? Object.keys(profData.turmas)
            : [];

        if (turmasDoProfessor.length === 0) {
          setAlunosComPendenciaReal([]);
          setNoDataMessage(
            "Nenhuma turma vinculada a este professor. Não é possível verificar o status dos alunos."
          );
          return;
        }

        let turmasParaQuery = [...turmasDoProfessor];
        if (turmasParaQuery.length > 10) {
          console.warn(
            `[DetalhesAcompanhamentoPei] Professor ${profData.nome} tem ${turmasParaQuery.length} turmas. A query 'in' de alunos será limitada às primeiras 10 turmas.`
          );
          turmasParaQuery = turmasParaQuery.slice(0, 10);
        }

        if (
          turmasParaQuery.length === 0 ||
          (escolaIdsParaQuery.length === 0 &&
            !perfisComAcessoAmploSeNaoVinculado.includes(
              currentUserData.perfil
            ))
        ) {
          setNoDataMessage(
            "Erro na consulta: Nenhuma turma ou escola válida definida para filtrar alunos. Verifique os dados do professor ou as vinculações de escola do seu perfil."
          );
          return;
        }

        let qAlunos = query(collection(db, "alunos"));
        qAlunos = query(qAlunos, where("turma", "in", turmasParaQuery));
        if (escolaIdsParaQuery.length > 0) {
          qAlunos = query(qAlunos, where("escolaId", "in", escolaIdsParaQuery));
        }

        const alunosSnap = await getDocs(qAlunos);
        const alunosList = alunosSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (alunosList.length === 0) {
          setAlunosComPendenciaReal([]);
          setNoDataMessage(
            `Nenhum aluno encontrado para as turmas: ${turmasParaQuery.join(
              ", "
            )} para sua(s) escola(s) vinculada(s).`
          );
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
          : prazosSnap.docs[0]?.data();

        if (!prazoAnualDoc) {
          setFetchError(
            `Não foi encontrada uma configuração de prazos anual para o PEI do ano de ${anoAtual}. Por favor, verifique a Gestão de Prazos.`
          );
          return;
        }
        const dataLimiteCriacaoPEI =
          prazoAnualDoc.dataLimiteCriacaoPEI?.toDate() || null;
        const dataLimiteRevisao1Sem =
          prazoAnualDoc.dataLimiteRevisao1Sem?.toDate() || null;
        const dataLimiteRevisao2Sem =
          prazoAnualDoc.dataLimiteRevisao2Sem?.toDate() || null;

        let alunosComStatus = [];
        alunosComStatus = await Promise.all(
          alunosList.map(async (aluno) => {
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

            let qPei = query(collection(db, "peis"));
            qPei = query(qPei, where("alunoId", "==", aluno.id));
            qPei = query(qPei, where("anoLetivo", "==", anoAtual));
            if (escolaIdsParaQuery.length > 0) {
              qPei = query(qPei, where("escolaId", "in", escolaIdsParaQuery));
            }
            qPei = query(qPei, orderBy("criadoEm", "desc"), limit(1));
            const peiSnap = await getDocs(qPei);

            if (peiSnap.empty) {
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
              const peiData = peiSnap.docs[0]?.data();

              // ✅ MUDANÇA AQUI: Tratar criadoEm como string ou Timestamp
              const dataCriacaoPei =
                peiData?.criadoEm instanceof Date // Se já é Date (pode vir de Timestamp.toDate())
                  ? peiData.criadoEm
                  : peiData?.criadoEm?.toDate instanceof Function // Se é Timestamp
                    ? peiData.criadoEm.toDate()
                    : typeof peiData.criadoEm === "string" // Se é string
                      ? new Date(peiData.criadoEm)
                      : null;

              // ✅ MUDANÇA AQUI: Tratar dataUltimaRevisao como string ou Timestamp
              dataUltimaAtualizacaoPei =
                peiData?.dataUltimaRevisao instanceof Date
                  ? peiData.dataUltimaRevisao
                  : peiData?.dataUltimaRevisao?.toDate instanceof Function
                    ? peiData.dataUltimaRevisao.toDate()
                    : typeof peiData.dataUltimaRevisao === "string"
                      ? new Date(peiData.dataUltimaRevisao)
                      : null;

              // Fallback para dataUltimaAtualizacaoPei se dataUltimaRevisao for nula
              dataUltimaAtualizacaoPei =
                dataUltimaAtualizacaoPei || dataCriacaoPei;

              // --- LÓGICA DE STATUS REPLICADA DA CLOUD FUNCTION ---
              if (dataLimiteCriacaoPEI) {
                if (hojeZeradoLocal >= dataLimiteCriacaoPEI) {
                  if (
                    dataCriacaoPei &&
                    resetTimeLocal(dataCriacaoPei) <= dataLimiteCriacaoPEI
                  ) {
                    statusPeiGeral = "Criado no Prazo";
                  } else if (
                    dataCriacaoPei &&
                    resetTimeLocal(dataCriacaoPei) > dataLimiteCriacaoPEI
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
                  if (hojeZeradoLocal >= dataLimiteRevisao1Sem) {
                    if (
                      dataUltimaAtualizacaoPei &&
                      resetTimeLocal(dataUltimaAtualizacaoPei) >=
                        dataLimiteRevisao1Sem
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
                  if (hojeZeradoLocal >= dataLimiteRevisao2Sem) {
                    if (
                      dataUltimaAtualizacaoPei &&
                      resetTimeLocal(dataUltimaAtualizacaoPei) >=
                        dataLimiteRevisao2Sem
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
                          dataLimiteRevisao1Sem)
                        ? "Feita (Aguardando prazo)"
                        : "Aguardando";
                  }
                }
              }
            } // Fim do if (peiSnap.empty) / else

            // ✅ LÓGICA FINAL PARA isAtrasadoRealmenteLocal (REPLICADA DA CLOUD FUNCTION)
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

            return {
              ...aluno,
              statusPeiGeral,
              statusRevisao1,
              statusRevisao2,
              dataUltimaAtualizacaoPei,
              isAtrasadoRealmente: isAtrasadoRealmenteLocal, // ✅ MUDANÇA: Inclui a flag calculada
            };
          })
        );
        // ✅ AQUI É A MUDANÇA FINAL: FILTRAR OS ALUNOS DETALHES PELO isAtrasadoRealmente
        const alunosRealmenteAtrasados = alunosComStatus.filter(
          (aluno) => aluno.isAtrasadoRealmente
        );
        setAlunosComPendenciaReal(alunosRealmenteAtrasados); // Atualiza o estado com a lista FILTRADA

        if (alunosRealmenteAtrasados.length === 0) {
          // MUDANÇA DE NOME DO ESTADO
          setNoDataMessage(
            `Todos os PEIs dos alunos deste professor estão em dia ou foram realizados, mesmo que com atraso. Nenhuma pendência de atraso real.`
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
    } else if (initialUserLoadComplete && !professorId) {
      setLoading(false);
      setFetchError("ID do professor não fornecido na URL. Verifique o link.");
    }
  }, [professorId, currentUserData, navigate, initialUserLoadComplete]);

  if (!initialUserLoadComplete) {
    return <Loader />;
  }

  if (loading) return <Loader />;
  if (fetchError) return <div style={estilos.errorMessage}>{fetchError}</div>;

  const temAlunosParaExibir = alunosComPendenciaReal.length > 0; // Verifica o comprimento da lista FILTRADA

  return (
    <div className="detalhes-container" style={estilos.container}>
      <div className="detalhes-card" style={estilos.card}>
        <BotaoVoltar />
        <h1 className="detalhes-title" style={estilos.title}>
          Detalhes dos PEIs com Pendências -{" "}
          {professor ? professor.nome : "Carregando..."}
        </h1>

        <p style={{ marginBottom: "20px" }}>
          Esta tabela mostra o status detalhado dos PEIs dos alunos **com
          atrasos pendentes de realização**, com base nos prazos de criação e
          revisões.
        </p>

        {noDataMessage ? (
          <div
            className="detalhes-mensagem-aviso"
            style={estilos.mensagemAviso}
          >
            {noDataMessage}
          </div>
        ) : !temAlunosParaExibir && !loading ? (
          <div
            className="detalhes-mensagem-aviso"
            style={estilos.mensagemAviso}
          >
            Todos os PEIs dos alunos deste professor estão em dia ou foram
            realizados, mesmo que com atraso. Nenhuma pendência de atraso real.
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
              {/* Renderiza a lista FILTRADA de alunos com pendência real */}
              {alunosComPendenciaReal.map((aluno) => (
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

// Estilos CSS inline para o componente
const estilos = {
  container: {
    background: "#1d3557",
    minHeight: "100vh",
    width: "100vw",
    padding: "25px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    display: "flex", // Adicionado para centralizar o card
    justifyContent: "center",
    alignItems: "flex-start", // Alinha ao topo
  },
  card: {
    background: "#fff",
    maxWidth: "900px",
    width: "100%", // Garante que o card ocupe a largura máxima
    margin: "20px", // Margem ao redor do card
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    color: "#1d3557",
    marginBottom: "25px",
    fontSize: "24px",
    fontWeight: "bold", // Use bold para negrito
  },
  // Este estilo não está mais sendo usado diretamente por uma <p> com mensagem fixa
  mensagem: {
    textAlign: "center",
    color: "#555",
    fontStyle: "italic",
    marginBottom: "20px",
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
  detalhesList: {
    // Estilos para listas de detalhes de atraso, se usadas
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  detalhesListItem: {
    // Estilos para itens de lista de detalhes de atraso
    color: "#dc3545",
    fontSize: "1em",
    marginBottom: "8px",
    backgroundColor: "#fff0f0",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ffcccc",
  },
  subtitulo: {
    // Estilo para subtítulos dentro do card
    color: "#1d3557",
    fontSize: "1.3em",
    marginBottom: "15px",
    fontWeight: "bold",
  },
  // ESTILOS DA TABELA
  table: {
    width: "100%",
    borderCollapse: "collapse", // Colapsa as bordas das células para uma aparência mais limpa
    marginTop: "20px",
    border: "1px solid #ddd", // Borda externa fina
    borderRadius: "8px", // Bordas arredondadas
    overflow: "hidden", // Garante que as bordas arredondadas funcionem com border-collapse
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", // Sombra suave para a tabela
  },
  th: {
    // Estilos para os cabeçalhos da tabela
    backgroundColor: "#eaf2f7", // Cor de fundo do cabeçalho
    color: "#1d3557", // Cor do texto do cabeçalho
    padding: "12px 15px", // Espaçamento interno
    textAlign: "left", // Alinhamento padrão à esquerda
    borderBottom: "2px solid #ddd", // Borda inferior do cabeçalho
    borderRight: "1px solid #e0e0e0", // Borda direita para separar colunas
    fontSize: "15px",
    fontWeight: "bold",
  },
  td: {
    // Estilos para as células da tabela
    padding: "12px 15px", // Espaçamento interno
    borderBottom: "1px solid #eee", // Borda inferior para separar linhas
    fontSize: "14px",
    verticalAlign: "top", // Alinha o conteúdo ao topo
    borderRight: "1px solid #f0f0f0", // Borda direita para separar colunas
    textAlign: "left", // Alinhamento padrão à esquerda
  },
  // Mensagens de aviso/sem dados
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
