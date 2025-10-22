import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  limit,
  orderBy,
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";

// --- ROTAS ADAPTADAS PARA O MÓDULO INDIVIDUAL ---
const ROTA_PAINEL_INDIVIDUAL = "/painel-individual";
const ROTA_AVALIACAO_INICIAL = "/individual/avaliacao-inicial"; // Rota de início para a reavaliação (nova avaliação)

// --- FUNÇÕES AUXILIARES E ESTILOS MANTIDOS (Reaproveitados) ---

// Configuração de estilos
const estilos = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(to bottom, #1d3557, #457b9d)",
    padding: "40px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "30px",
    width: "95%",
    maxWidth: "800px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  titulo: {
    textAlign: "center",
    color: "#1d3557",
    marginBottom: "20px",
  },
  tabela: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  },
  th: {
    backgroundColor: "#f1f1f1",
    padding: "12px",
    textAlign: "left",
    fontWeight: "bold",
    border: "1px solid #ddd",
  },
  td: {
    padding: "12px",
    border: "1px solid #eee",
    verticalAlign: "middle",
  },
  botaoAcao: {
    border: "none",
    borderRadius: "6px",
    padding: "8px 12px",
    marginRight: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  botaoVisualizar: {
    backgroundColor: "#1d3557",
    color: "#fff",
  },
  botaoEditar: {
    backgroundColor: "#ffb703",
    color: "#000",
  },
  botaoExcluir: {
    backgroundColor: "#e63946",
    color: "#fff",
  },
  mensagem: {
    padding: "15px 20px",
    borderRadius: "8px",
    marginBottom: "15px",
    fontWeight: "bold",
    textAlign: "center",
  },
  erro: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    border: "1px solid #f5c6cb",
  },
  sucesso: {
    backgroundColor: "#d4edda",
    color: "#155724",
    border: "1px solid #c3e6cb",
  },
  info: {
    backgroundColor: "#cce5ff",
    color: "#004085",
    border: "1px solid #b8daff",
  },
};

function VerAvaliacoesIndividual() {
  // RENOMEADO
  const [avaliacoesPorAluno, setAvaliacoesPorAluno] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: null, texto: "" });
  const [avaliacaoParaExcluir, setAvaliacaoParaExcluir] = useState(null);
  const navigate = useNavigate();

  const usuarioLogado = JSON.parse(
    localStorage.getItem("usuarioLogado") || "{}"
  );
  // O perfil é sempre "individual" aqui, mas é mantido para consistência.
  const perfil = usuarioLogado.perfil;

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      // 1. QUERY DE AVALIAÇÕES: Filtra apenas pelas avaliações criadas por este usuário (professor individual)
      // Nota: Assumimos que o campo 'criadorId' foi salvo nas avaliações
      const peisQuery = query(
        collection(db, "avaliacoesIniciais"),
        where("criadorId", "==", usuarioLogado.email),
        orderBy("dataCriacao", "desc")
      );

      const novasQuery = query(
        collection(db, "avaliacoes"),
        where("criadorId", "==", usuarioLogado.email),
        orderBy("dataCriacao", "desc")
      );

      const [avaliacoesIniciaisSnap, avaliacoesNovasSnap] = await Promise.all([
        getDocs(peisQuery), // Query para avaliações iniciais
        getDocs(novasQuery), // Query para reavaliações
      ]);

      const listaAvaliacoesIniciais = avaliacoesIniciaisSnap.docs.map(
        (doc) => ({
          id: doc.id,
          tipo: "inicial",
          ...doc.data(),
        })
      );

      const listaAvaliacoesNovas = avaliacoesNovasSnap.docs.map((doc) => ({
        id: doc.id,
        tipo: "nova",
        ...doc.data(),
      }));

      const todasAsAvaliacoes = [
        ...listaAvaliacoesIniciais,
        ...listaAvaliacoesNovas,
      ];

      // Objeto para armazenar apenas a avaliação MAIS RECENTE de cada aluno
      const avaliacoesMaisRecentes = {};

      todasAsAvaliacoes.forEach((a) => {
        const alunoId = a.alunoId || a.aluno?.id || "id-desconhecido";

        const getDate = (item) => {
          if (
            item.dataCriacao &&
            typeof item.dataCriacao.toDate === "function"
          ) {
            return item.dataCriacao.toDate();
          }
          if (item.inicio) {
            return new Date(item.inicio);
          }
          return new Date(0);
        };
        const dataAtual = getDate(a);

        if (
          !avaliacoesMaisRecentes[alunoId] ||
          dataAtual > getDate(avaliacoesMaisRecentes[alunoId])
        ) {
          avaliacoesMaisRecentes[alunoId] = {
            ...a,
            alunoId: alunoId,
            colecao: a.tipo === "inicial" ? "avaliacoesIniciais" : "avaliacoes",
          };
        }
      });

      // Converte o objeto de volta para uma lista e ordena pelo nome do aluno
      const listaFinal = Object.values(avaliacoesMaisRecentes).sort((a, b) => {
        const nomeA = (
          typeof a.aluno === "object" && a.aluno !== null
            ? a.aluno.nome
            : a.aluno || ""
        ).toUpperCase();
        const nomeB = (
          typeof b.aluno === "object" && b.aluno !== null
            ? b.aluno.nome
            : b.aluno || ""
        ).toUpperCase();
        if (nomeA < nomeB) return -1;
        if (nomeA > nomeB) return 1;
        return 0;
      });

      setAvaliacoesPorAluno(listaFinal);
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
      setMensagem({ tipo: "erro", texto: "Erro ao carregar avaliações." });
    } finally {
      setLoading(false);
    }
  }, [usuarioLogado.email]); // Dependência do email para a query

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const iniciarExclusao = (avaliacao) => {
    setAvaliacaoParaExcluir(avaliacao);
    setMensagem({
      tipo: "confirmacao",
      texto: `Tem certeza que deseja excluir a ÚLTIMA avaliação de ${
        avaliacao.aluno?.nome || avaliacao.aluno || "deste aluno"
      }?`,
    });
  };

  const confirmarExclusao = async () => {
    if (!avaliacaoParaExcluir) return;
    const { id, alunoId, colecao } = avaliacaoParaExcluir;

    setMensagem({ tipo: "info", texto: "Excluindo..." });
    try {
      await deleteDoc(doc(db, colecao, id));

      setMensagens({
        tipo: "sucesso",
        texto: "Avaliação excluída com sucesso! Recarregando lista...",
      });

      await carregarDados(); // Re-carrega para mostrar a penúltima
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
      setMensagem({
        tipo: "erro",
        texto: "Erro ao excluir a avaliação. Verifique as permissões.",
      });
    } finally {
      setAvaliacaoParaExcluir(null);
      setTimeout(() => setMensagem({ tipo: null, texto: "" }), 3000);
    }
  };

  const cancelarExclusao = () => {
    setAvaliacaoParaExcluir(null);
    setMensagem({ tipo: null, texto: "" });
  };

  if (loading) {
    return (
      <div
        style={{
          ...estilos.container,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <p style={{ color: "#fff", fontSize: "1.2rem" }}>
          Carregando histórico de avaliações...
        </p>
      </div>
    );
  }

  const visualizarHistorico = (alunoId) => {
    // ROTA ADAPTADA para o módulo individual
    navigate(`/individual/visualizar-avaliacao/${alunoId}`);
  };

  const iniciarReavaliacao = (alunoId) => {
    // ROTA ADAPTADA para o módulo individual
    navigate(`/individual/reavaliacao/${alunoId}`);
  };

  // Renderização do componente
  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        {/* ROTA DE RETORNO ADAPTADA */}
        <BotaoVoltar destino={ROTA_PAINEL_INDIVIDUAL} />
        <h2 style={estilos.titulo}>Minhas Avaliações Registradas</h2>

        {/* MENSAGENS E CONFIRMAÇÃO DE EXCLUSÃO */}
        {mensagem.tipo && (
          <div
            style={{
              ...estilos.mensagem,
              ...(mensagem.tipo === "erro" && estilos.erro),
              ...(mensagem.tipo === "sucesso" && estilos.sucesso),
              ...(mensagem.tipo === "info" && estilos.info),
              ...(mensagem.tipo === "confirmacao" && estilos.info),
            }}
          >
            <p>{mensagem.texto}</p>
            {mensagem.tipo === "confirmacao" && (
              <div style={{ marginTop: "10px" }}>
                <button
                  onClick={confirmarExclusao}
                  style={{
                    ...estilos.botaoAcao,
                    ...estilos.botaoExcluir,
                    marginRight: "15px",
                  }}
                >
                  Sim, Excluir
                </button>
                <button
                  onClick={cancelarExclusao}
                  style={{
                    ...estilos.botaoAcao,
                    backgroundColor: "#ccc",
                    color: "#333",
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {avaliacoesPorAluno.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>
            Nenhuma avaliação encontrada na sua conta.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={estilos.tabela}>
              <thead>
                <tr>
                  <th style={estilos.th}>Aluno</th>
                  <th style={estilos.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {avaliacoesPorAluno.map((a) => {
                  const nomeAluno =
                    typeof a.aluno === "object" && a.aluno !== null
                      ? a.aluno.nome
                      : a.aluno || "Aluno Desconhecido";

                  return (
                    <tr key={a.alunoId}>
                      <td style={estilos.td}>{nomeAluno}</td>
                      <td style={estilos.td}>
                        <button
                          onClick={() => visualizarHistorico(a.alunoId)}
                          style={{
                            ...estilos.botaoAcao,
                            ...estilos.botaoVisualizar,
                          }}
                          title="Ver a última avaliação deste aluno"
                        >
                          Visualizar
                        </button>
                        {/* Ação de Reavaliar e Excluir é sempre permitida ao criador no fluxo individual */}
                        <>
                          <button
                            onClick={() => iniciarReavaliacao(a.alunoId)}
                            style={{
                              ...estilos.botaoAcao,
                              ...estilos.botaoEditar,
                            }}
                            title="Criar uma nova reavaliação para este aluno"
                          >
                            Reavaliar
                          </button>
                          <button
                            onClick={() => iniciarExclusao(a)}
                            style={{
                              ...estilos.botaoAcao,
                              ...estilos.botaoExcluir,
                            }}
                            title="Excluir a última avaliação deste aluno"
                          >
                            Excluir
                          </button>
                        </>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerAvaliacoesIndividual;
