// src/pages/AcompanhamentoPrazosPei.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { useNavigate } from "react-router-dom";
import { isAuthorized } from "../utils/authUtils"; // Importa a função de permissão do arquivo de utilitário

/**
 * Componente para o acompanhamento dos prazos de criação e revisão de PEIs por professor.
 * Exibe o status "Em dia" ou "Atrasado" para cada professor, com uma contagem resumida de alunos em atraso.
 * A atribuição de alunos a professores é feita com base nas turmas do professor.
 * Os dados exibidos são filtrados pela(s) escola(s) vinculada(s) ao usuário logado, exceto para desenvolvedores,
 * que podem ver todas as escolas ou filtrar via abas.
 */
export default function AcompanhamentoPrazosPei() {
  const [professoresComStatus, setProfessoresComStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null); // Erros críticos na busca/processamento
  const [noDataMessage, setNoDataMessage] = useState(null); // Mensagem quando não há professores/alunos para exibir após filtros
  const [escolaAtivaId, setEscolaAtivaId] = useState(null); // ID da escola atualmente selecionada na aba
  const [todasAsEscolas, setTodasAsEscolas] = useState([]); // Lista de todas as escolas no sistema (para abas de dev)
  const navigate = useNavigate();

  // Usa useMemo para parsear os dados do usuário logado apenas uma vez
  // e extrair os IDs e nomes das escolas vinculadas ao perfil do usuário.
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
      return { ...user, escolasVinculadas };
    } catch (e) {
      console.error(
        "Erro ao parsear dados do usuário logado no localStorage:",
        e
      );
      return null;
    }
  }, []);

  // Efeito para inicializar escolaAtivaId e carregar dados
  useEffect(() => {
    // 1. Verificação de Permissão de Acesso à Página
    if (!usuario || !isAuthorized(usuario.perfil)) {
      alert("Você não tem permissão para acessar esta página.");
      navigate("/");
      return;
    }

    // 2. Verificação de Vínculo de Escola para Perfis Não-Desenvolvedores
    // Se o usuário não é desenvolvedor E não tem escolas vinculadas, mostra erro.
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

    // 3. Lógica para Inicializar a escolaAtivaId (qual aba de escola deve estar ativa por padrão)
    // Se o usuário é desenvolvedor:
    if (usuario.perfil === "desenvolvedor") {
      if (!escolaAtivaId) {
        setEscolaAtivaId("TODAS"); // ID especial para "todas as escolas" para desenvolvedores
      }
    }
    // Se o usuário é SEME ou tem múltiplas escolas vinculadas (mas não é dev)
    else if (usuario.escolasVinculadas.length > 1) {
      if (usuario.escolasVinculadas.length > 0 && !escolaAtivaId) {
        setEscolaAtivaId(usuario.escolasVinculadas[0].id); // Primeira escola vinculada como padrão para SEME/multi-escola
      }
    }
    // Se o usuário tem APENAS 1 escola vinculada (e não é dev)
    else if (usuario.escolasVinculadas.length === 1) {
      setEscolaAtivaId(usuario.escolasVinculadas[0].id); // Única escola vinculada como padrão
    }
    // carregarDadosEVerificarPrazos será chamado pelo useEffect abaixo.
  }, [usuario, navigate, escolaAtivaId]);

  // Efeito principal para carregar dados e verificar prazos
  useEffect(() => {
    // Só prossegue se o usuário estiver autorizado E a escola ativa estiver definida (ou for desenvolvedor com "TODAS")
    if (!usuario || !isAuthorized(usuario.perfil)) return;
    if (usuario.perfil !== "desenvolvedor" && !escolaAtivaId) return; // Espera escolaAtivaId ser definido se não for desenvolvedor

    /**
     * Função assíncrona para carregar os prazos do PEI, buscar professores e alunos,
     * e determinar o status de acompanhamento para cada professor.
     */
    const carregarDadosEVerificarPrazos = async () => {
      setLoading(true);
      setFetchError(null);
      setNoDataMessage(null); // Garante que a mensagem de "sem dados" é limpa no início de cada carregamento

      try {
        const anoAtual = new Date().getFullYear();
        const hoje = new Date();

        // === BLOCO: GARANTIR QUE TODAS AS ESCOLAS SÃO BUSCADAS OU ESTÃO NO ESTADO ===
        let currentTodasAsEscolasLocal = [];
        if (
          todasAsEscolas.length === 0 ||
          (usuario.perfil === "desenvolvedor" && todasAsEscolas.length === 0)
        ) {
          // Se o estado 'todasAsEscolas' está vazio (primeira carga ou se resetou)
          // OU se é desenvolvedor e o estado 'todasAsEscolas' está vazio (precisa buscar)
          const qTodasEscolas = collection(db, "escolas");
          const todasEscolasSnap = await getDocs(qTodasEscolas);
          currentTodasAsEscolasLocal = todasEscolasSnap.docs.map((doc) => ({
            id: doc.id,
            nome: doc.data().nome || doc.id,
          }));
          setTodasAsEscolas(currentTodasAsEscolasLocal);
        } else {
          currentTodasAsEscolasLocal = todasAsEscolas; // Usa o estado atual
        }
        // ==============================================================================

        // Determina o ID de escola a ser usado como filtro nas queries do Firebase.
        const filterBySchoolId =
          escolaAtivaId && escolaAtivaId !== "TODAS" ? escolaAtivaId : null;

        // 1. Busca os prazos anuais do PEI
        const qPrazos = query(
          collection(db, "prazosPEIAnuais"),
          where("anoLetivo", "==", anoAtual),
          limit(1) // Assume que há apenas um documento de prazos por ano
        );
        const prazosSnap = await getDocs(qPrazos);
        const prazoAnualDoc = prazosSnap.empty
          ? null
          : prazosSnap.docs[0].data();

        if (!prazoAnualDoc) {
          setFetchError(
            `Não foi encontrada uma configuração de prazos anual para o PEI do ano de ${anoAtual}. Por favor, configure-a na Gestão de Prazos.`
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
          setFetchError(
            `Nenhum prazo válido foi definido para o PEI do ano de ${anoAtual} na Gestão de Prazos.`
          );
          setLoading(false);
          return;
        }

        // 2. Busca todos os usuários com perfil de 'professor'
        let qProfessores = query(
          collection(db, "usuarios"),
          where("perfil", "==", "professor")
        );
        if (filterBySchoolId) {
          // Se há uma escola ativa selecionada (não 'TODAS' e não nulo)
          qProfessores = query(
            qProfessores,
            where(`escolas.${filterBySchoolId}`, "==", true)
          );
        }

        const professoresSnap = await getDocs(qProfessores);
        let professoresFiltradosPorEscola = professoresSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // === PONTO CHAVE PARA noDataMessage: Se não encontrar NENHUM professor após o filtro ===
        if (professoresFiltradosPorEscola.length === 0) {
          const schoolName =
            currentTodasAsEscolasLocal.find((e) => e.id === filterBySchoolId)
              ?.nome ||
            filterBySchoolId ||
            "a escola selecionada";
          setNoDataMessage(
            `Não foram encontrados professores vinculados ${
              filterBySchoolId
                ? `à escola "${schoolName}"`
                : "à(s) sua(s) escola(s) vinculada(s)"
            }.`
          );
          setLoading(false);
          return; // Sai da função após exibir a mensagem de "sem dados"
        }

        // Para cada professor filtrado, determinar o status do PEI
        const professoresComStatusFinal = await Promise.all(
          professoresFiltradosPorEscola.map(async (prof) => {
            let statusProfessor = "Em dia";
            let detalhesAtrasoPorAluno = [];

            // Pega as turmas vinculadas ao professor. Garante que prof.turmas é um objeto.
            let turmasDoProfessor =
              prof.turmas && typeof prof.turmas === "object"
                ? Object.keys(prof.turmas)
                : [];

            // Se o professor não tem turmas, ele está "Em dia" para PEIs
            if (turmasDoProfessor.length === 0) {
              return {
                ...prof,
                status: "Em dia",
                alunosAtrasadosCount: 0,
                detalhesAtraso: ["Nenhuma turma vinculada a este professor."],
              };
            }

            // --- TRATAMENTO PARA LIMITE DE 10 NO 'IN' DO FIRESTORE PARA TURMAS ---
            let turmasParaQuery = [...turmasDoProfessor];
            if (turmasParaQuery.length > 10) {
              console.warn(
                `[ACOMPANHAMENTO] Professor ${prof.nome} tem ${turmasParaQuery.length} turmas. A query 'in' de alunos será limitada às primeiras 10 turmas.`
              );
              turmasParaQuery = turmasParaQuery.slice(0, 10);
            }

            // Adiciona checagem robusta de array vazio para a query 'in' de turmas
            if (turmasParaQuery.length === 0) {
              return {
                ...prof,
                status: "Em dia",
                alunosAtrasadosCount: 0,
                detalhesAtraso: [
                  "Erro interno: Nenhuma turma válida encontrada para filtrar alunos (possível problema de dados do professor).",
                ],
              };
            }

            let qAlunosDoProfessor = query(
              collection(db, "alunos"),
              where("turma", "in", turmasParaQuery)
            );
            if (filterBySchoolId) {
              // Adiciona filtro por escola APENAS SE houver uma escola ativa
              qAlunosDoProfessor = query(
                qAlunosDoProfessor,
                where("escolaId", "==", filterBySchoolId)
              );
            }

            const alunosSnap = await getDocs(qAlunosDoProfessor);
            const alunosDoProfessor = alunosSnap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            if (alunosDoProfessor.length === 0) {
              const schoolName =
                currentTodasAsEscolasLocal.find(
                  (e) => e.id === filterBySchoolId
                )?.nome ||
                filterBySchoolId ||
                "a escola selecionada";
              return {
                ...prof,
                status: "Em dia",
                alunosAtrasadosCount: 0,
                detalhesAtraso: [
                  `Nenhum aluno encontrado nas turmas: ${turmasParaQuery.join(
                    ", "
                  )} para ${
                    filterBySchoolId
                      ? `a escola "${schoolName}"`
                      : "a(s) sua(s) escola(s) vinculada(s)"
                  }.`,
                ],
              };
            }

            // Para cada aluno, verificar seu status de PEI individualmente
            for (const aluno of alunosDoProfessor) {
              let alunoAtrasado = false;
              let motivoAtraso = "";
              let dataUltimaAtualizacaoPei = null;

              // Prepara a query para o PEI do aluno, condicionalmente incluindo filtro de escola
              let qPeiDoAluno = query(collection(db, "peis"));
              if (filterBySchoolId) {
                // Adiciona filtro por escola APENAS SE houver uma escola ativa
                qPeiDoAluno = query(
                  qPeiDoAluno,
                  where("escolaId", "==", filterBySchoolId)
                );
              }
              qPeiDoAluno = query(
                qPeiDoAluno,
                where("alunoId", "==", aluno.id),
                where("anoLetivo", "==", anoAtual),
                orderBy("criadoEm", "desc"),
                limit(1)
              );
              const peiSnap = await getDocs(qPeiDoAluno);

              if (peiSnap.empty) {
                if (dataLimiteCriacaoPEI && hoje > dataLimiteCriacaoPEI) {
                  alunoAtrasado = true;
                  motivoAtraso = `PEI de ${
                    aluno.nome
                  } não criado até o prazo de ${dataLimiteCriacaoPEI.toLocaleDateString(
                    "pt-BR"
                  )}`;
                }
              } else {
                const peiData = peiSnap.docs[0].data();
                const dataCriacaoPEIAluno = peiData.criadoEm?.toDate() || null;
                const dataUltimaRevisaoPEIAluno = peiData.dataUltimaRevisao
                  ? peiData.dataUltimaRevisao.toDate()
                  : dataCriacaoPEIAluno;

                dataUltimaAtualizacaoPei = dataUltimaRevisaoPEIAluno;

                if (dataLimiteCriacaoPEI && dataCriacaoPEIAluno) {
                  if (
                    hoje > dataLimiteCriacaoPEI &&
                    dataCriacaoPEIAluno > dataLimiteCriacaoPEI
                  ) {
                    alunoAtrasado = true;
                    motivoAtraso = `PEI de ${
                      aluno.nome
                    } criado após o prazo (${dataCriacaoPEIAluno.toLocaleDateString(
                      "pt-BR"
                    )} vs ${dataLimiteCriacaoPEI.toLocaleDateString("pt-BR")})`;
                  }
                } else if (
                  dataLimiteCriacaoPEI &&
                  !dataCriacaoPEIAluno &&
                  hoje > dataLimiteCriacaoPEI
                ) {
                  alunoAtrasado = true;
                  motivoAtraso = `PEI de ${aluno.nome} sem data de criação válida após o prazo.`;
                }

                if (
                  !alunoAtrasado &&
                  dataLimiteRevisao1Sem &&
                  hoje > dataLimiteRevisao1Sem
                ) {
                  if (
                    !dataUltimaRevisaoPEIAluno ||
                    dataUltimaRevisaoPEIAluno < dataLimiteRevisao1Sem
                  ) {
                    alunoAtrasado = true;
                    motivoAtraso = `PEI de ${
                      aluno.nome
                    }: 1ª revisão atrasada (última em ${
                      dataUltimaRevisaoPEIAluno
                        ? dataUltimaRevisaoPEIAluno.toLocaleDateString("pt-BR")
                        : "N/A"
                    } vs ${dataLimiteRevisao1Sem.toLocaleDateString("pt-BR")})`;
                  }
                }

                if (
                  !alunoAtrasado &&
                  dataLimiteRevisao2Sem &&
                  hoje > dataLimiteRevisao2Sem
                ) {
                  if (
                    !dataUltimaRevisaoPEIAluno ||
                    dataUltimaRevisaoPEIAluno < dataLimiteRevisao2Sem
                  ) {
                    alunoAtrasado = true;
                    motivoAtraso = `PEI de ${
                      aluno.nome
                    }: 2ª revisão atrasada (última em ${
                      dataUltimaRevisaoPEIAluno
                        ? dataUltimaRevisaoPEIAluno.toLocaleDateString("pt-BR")
                        : "N/A"
                    } vs ${dataLimiteRevisao2Sem.toLocaleDateString("pt-BR")})`;
                  }
                }
              }

              if (alunoAtrasado) {
                detalhesAtrasoPorAluno.push(motivoAtraso);
                statusProfessor = "Atrasado";
              }
            }

            return {
              ...prof,
              status: statusProfessor,
              detalhesAtraso: detalhesAtrasoPorAluno,
              alunosAtrasadosCount: detalhesAtrasoPorAluno.length,
            };
          })
        );

        setProfessoresComStatus(professoresComStatusFinal);
      } catch (err) {
        console.error(
          "Erro geral no carregamento de dados ou verificação de prazos:",
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

    carregarDadosEVerificarPrazos();
  }, [usuario, navigate, escolaAtivaId, todasAsEscolas.length]);

  const handleVerDetalhes = (professorData) => {
    navigate(`/acompanhamento-pei/${professorData.id}`, {
      state: {
        professorNome: professorData.nome,
        detalhesAtraso: professorData.detalhesAtraso,
      },
    });
  };

  if (loading) return <Loader />;
  if (fetchError)
    // Exibe erros de busca críticos
    return (
      <div className="error-message" style={estilos.errorMessage}>
        {fetchError}
      </div>
    );

  const escolasParaAbas =
    usuario.perfil === "desenvolvedor"
      ? todasAsEscolas
      : usuario.escolasVinculadas;

  return (
    <div className="acompanhamento-container" style={estilos.container}>
      <div className="acompanhamento-content" style={estilos.content}>
        <BotaoVoltar />
        <h1 className="acompanhamento-title" style={estilos.title}>
          Acompanhamento de Prazos do PEI
        </h1>

        {/* --- ABAS DE ESCOLA PARA PERFIL SEME E DESENVOLVEDOR --- */}
        {/* Mostra as abas se o usuário for SEME ou Desenvolvedor E houver escolas para selecionar */}
        {(usuario.perfil === "seme" || usuario.perfil === "desenvolvedor") &&
          escolasParaAbas.length > 0 && (
            <div
              className="escola-tabs-container"
              style={estilos.escolaTabsContainer}
            >
              {/* Opção "Todas as Escolas" visível apenas para desenvolvedor */}
              {usuario.perfil === "desenvolvedor" && (
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
              {/* Abas para escolas específicas */}
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
                  {/* Exibe o nome da escola ou um fallback */}
                </button>
              ))}
            </div>
          )}
        {/* --- FIM DAS ABAS DE ESCOLA --- */}

        <p style={{ marginBottom: "20px" }}>
          Esta página exibe o status de criação e revisão dos Planos de Ensino
          Individualizados (PEIs) para cada professor, com base nos prazos
          estabelecidos.
        </p>

        {/* Condicionalmente renderiza a mensagem "sem dados" ou a tabela de professores */}
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
              {/* Renderiza as linhas da tabela apenas se houver professoresComStatus */}
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
                            prof.status === "Em dia" ? "#28a745" : "#dc3545",
                        }}
                      >
                        {prof.status}
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
                // Este bloco `else` dentro do `tbody` é um fallback extra.
                // Em teoria, o `noDataMessage` já deveria ter pegado todos os casos de "nenhum professor".
                // Mantemos por segurança, mas ele deve ser raramente atingido.
                <tr>
                  <td colSpan="4" style={estilos.td}>
                    Nenhum professor encontrado para a escola selecionada.
                    (Fallback)
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

const estilos = {
  container: {
    minHeight: "100vh",
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
    // Estilo para mensagens de "sem dados"
    color: "#555",
    backgroundColor: "#f0f0f0",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "normal",
    margin: "20px auto",
    maxWidth: "800px",
    fontStyle: "italic",
  },
  // ESTILOS PARA ABAS DE ESCOLA
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
