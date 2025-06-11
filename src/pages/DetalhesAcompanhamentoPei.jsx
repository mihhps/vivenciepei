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
  const [alunosAtrasadosDetalhes, setAlunosAtrasadosDetalhes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [noDataMessage, setNoDataMessage] = useState(null);

  // Estado para indicar se o usuário já foi carregado/avaliado pelo useMemo
  const [currentUserData, setCurrentUserData] = useState(null);
  // Estado para controlar se o carregamento inicial do usuário do localStorage foi concluído
  const [initialUserLoadComplete, setInitialUserLoadComplete] = useState(false);

  // Usa useMemo para parsear os dados do usuário logado apenas uma vez
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

  // Efeito principal para carregar os detalhes do acompanhamento.
  // Esta função só será executada APÓS o usuário ter sido carregado (ou determinado como null).
  useEffect(() => {
    // Só prossegue se o carregamento inicial do usuário (do localStorage) já terminou E o professorId existe.
    if (!initialUserLoadComplete || !professorId) {
      if (initialUserLoadComplete && !professorId) {
        setLoading(false);
        setFetchError("ID do professor não fornecido na URL.");
      }
      return;
    }

    // 1. Verificação de Permissão do Usuário
    if (!currentUserData || !isAuthorized(currentUserData.perfil)) {
      alert("Você não tem permissão para acessar esta página.");
      navigate("/");
      return;
    }
    // 2. Para perfis que NÃO SÃO desenvolvedor, gestao ou aee, se não têm escolas, mostra erro e sai.
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

        // Determina os IDs de escola a serem usados nas queries.
        const escolaIdsParaQuery =
          perfisComAcessoAmploSeNaoVinculado.includes(currentUserData.perfil) &&
          (!currentUserData.escolasVinculadas ||
            currentUserData.escolasVinculadas.length === 0)
            ? []
            : currentUserData.escolasVinculadas.slice(0, 10);

        // 3. Buscar dados do professor
        const profDocRef = doc(db, "usuarios", professorId);
        const profDocSnap = await getDoc(profDocRef);

        if (!profDocSnap.exists()) {
          setFetchError("Professor não encontrado na base de dados.");
          return;
        }
        const profData = { id: profDocSnap.id, ...profDocSnap.data() };
        setProfessor(profData);

        // Extrai as turmas do professor (garantindo que prof.turmas é um objeto)
        let turmasDoProfessor =
          profData.turmas && typeof profData.turmas === "object"
            ? Object.keys(profData.turmas)
            : [];

        if (turmasDoProfessor.length === 0) {
          setAlunosAtrasadosDetalhes([]);
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

        // 5. Buscar alunos vinculados às turmas do professor (e à(s) escola(s) se o filtro for aplicado)
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
          setAlunosAtrasadosDetalhes([]);
          setNoDataMessage(
            `Nenhum aluno encontrado para as turmas: ${turmasParaQuery.join(
              ", "
            )} para sua(s) escola(s) vinculada(s).`
          );
          return;
        }

        // 6. Buscar prazos anuais do PEI
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

        // 7. Para cada aluno encontrado, verificar o status detalhado do PEI e das revisões
        const alunosComStatus = await Promise.all(
          alunosList.map(async (aluno) => {
            let statusPeiGeral = "Não iniciado";
            let statusRevisao1 = "N/A";
            let statusRevisao2 = "N/A";
            let dataUltimaAtualizacaoPei = null;

            let qPei = query(collection(db, "peis"));
            qPei = query(qPei, where("alunoId", "==", aluno.id));
            qPei = query(qPei, where("anoLetivo", "==", anoAtual));
            if (escolaIdsParaQuery.length > 0) {
              qPei = query(qPei, where("escolaId", "in", escolaIdsParaQuery));
            }
            qPei = query(qPei, orderBy("criadoEm", "desc"), limit(1));
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
              const peiData = peiSnap.docs[0]?.data();
              const dataCriacaoPei = peiData?.criadoEm?.toDate() || null;
              dataUltimaAtualizacaoPei =
                peiData?.dataUltimaRevisao?.toDate() || dataCriacaoPei;

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
        setAlunosAtrasadosDetalhes(alunosComStatus);
      } catch (err) {
        console.error("Erro no carregamento dos detalhes do PEI:", err);
        setFetchError(
          "Ocorreu um erro ao carregar os detalhes do professor: " + err.message
        );
      } finally {
        setLoading(false);
      }
    };

    // Chama a função de carregamento APENAS QUANDO initialUserLoadComplete é true E professorId existe
    if (initialUserLoadComplete && professorId) {
      carregarDetalhesAtrasos();
    } else if (initialUserLoadComplete && !professorId) {
      setLoading(false);
      setFetchError("ID do professor não fornecido na URL. Verifique o link.");
    }
  }, [professorId, currentUserData, navigate, initialUserLoadComplete]);

  // Renderização condicional para o estado inicial de carregamento do usuário
  if (!initialUserLoadComplete) {
    return <Loader />;
  }

  // Renderização condicional para estados de carregamento e erro crítico (fetchError)
  if (loading) return <Loader />;
  if (fetchError) return <div style={estilos.errorMessage}>{fetchError}</div>;

  // Verifica se há alunos para exibir na tabela, e se não é uma mensagem de texto (erro/aviso inicial)
  const temAlunosParaExibir =
    alunosAtrasadosDetalhes.length > 0 &&
    typeof alunosAtrasadosDetalhes[0] === "object";

  return (
    <div className="detalhes-container" style={estilos.container}>
      <div className="detalhes-card" style={estilos.card}>
        <BotaoVoltar />
        <h1 className="detalhes-title" style={estilos.title}>
          Detalhes dos PEIs com Pendências -{" "}
          {professor ? professor.nome : "Carregando..."}
        </h1>

        <p style={{ marginBottom: "20px" }}>
          Esta tabela mostra o status detalhado dos PEIs de cada aluno sob
          responsabilidade deste professor, com base nos prazos de criação e
          revisões.
        </p>

        {/* Condição para exibir a mensagem de "sem dados" ou a tabela */}
        {noDataMessage ? ( // Se noDataMessage está definido, exibe-o
          <div
            className="detalhes-mensagem-aviso"
            style={estilos.mensagemAviso}
          >
            {noDataMessage}
          </div>
        ) : !temAlunosParaExibir && !loading ? (
          // Este é o caso em que não há erro crítico nem noDataMessage explícito, mas a lista de alunos está vazia
          <div
            className="detalhes-mensagem-aviso"
            style={estilos.mensagemAviso}
          >
            Nenhum aluno com PEI encontrado para este professor, suas turmas ou
            escolas vinculadas, dentro da(s) escola(s) acessível(is) ao seu
            perfil. Verifique as atribuições e status dos PEIs.
          </div>
        ) : (
          // Se houver alunos para exibir (e não estamos em estado de carregamento ou erro), renderiza a tabela
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
              {alunosAtrasadosDetalhes.map((aluno) => (
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
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
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
    fontSize: "15px",
    fontWeight: "bold",
    borderRight: "1px solid #e0e0e0", // Borda direita para separar colunas
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
