import React, { useEffect, useState, useCallback } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar";

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

function VerAvaliacoes() {
  // O estado agora armazena apenas a avaliação mais recente de CADA aluno
  const [avaliacoesPorAluno, setAvaliacoesPorAluno] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: null, texto: "" });
  // Armazena o ID e a coleção para exclusão (apenas da avaliação mais recente mostrada)
  const [avaliacaoParaExcluir, setAvaliacaoParaExcluir] = useState(null);
  const navigate = useNavigate();

  const usuarioLogado = JSON.parse(
    localStorage.getItem("usuarioLogado") || "{}"
  );
  const perfil = usuarioLogado.perfil;

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [avaliacoesIniciaisSnap, avaliacoesNovasSnap] = await Promise.all([
        getDocs(collection(db, "avaliacoesIniciais")),
        getDocs(collection(db, "avaliacoes")),
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
        // Normaliza o alunoId, garantindo que seja uma string
        const alunoId = a.alunoId || a.aluno?.id || "id-desconhecido";

        // Função auxiliar para obter a data como objeto Date
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

        // Se o aluno ainda não está no mapa OU se a avaliação atual é mais recente que a que está no mapa
        if (
          !avaliacoesMaisRecentes[alunoId] ||
          dataAtual > getDate(avaliacoesMaisRecentes[alunoId])
        ) {
          avaliacoesMaisRecentes[alunoId] = {
            ...a,
            alunoId: alunoId,
            colecao: a.tipo === "inicial" ? "avaliacoesIniciais" : "avaliacoes", // Adiciona a coleção de origem para exclusão
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
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Função para iniciar o processo de exclusão (substitui window.confirm)
  const iniciarExclusao = (avaliacao) => {
    setAvaliacaoParaExcluir(avaliacao);
    setMensagem({
      tipo: "confirmacao",
      texto: `Tem certeza que deseja excluir a ÚLTIMA avaliação de ${
        avaliacao.aluno?.nome || avaliacao.aluno || "deste aluno"
      }?`,
    });
  };

  // Função para confirmar a exclusão
  const confirmarExclusao = async () => {
    if (!avaliacaoParaExcluir) return;
    const { id, alunoId, colecao } = avaliacaoParaExcluir;

    setMensagem({ tipo: "info", texto: "Excluindo..." });
    try {
      await deleteDoc(doc(db, colecao, id));

      // Remove o aluno da lista, forçando a re-leitura (ou ajuste local)
      // Optamos por re-carregar os dados para garantir que se houver outra avaliação, ela apareça
      // Se a exclusão for da ÚLTIMA avaliação, o aluno deve sumir ou a penúltima deve aparecer.
      // O método mais seguro é re-executar o carregarDados.

      setAvaliacoesPorAluno((prev) =>
        prev.filter((a) => a.alunoId !== alunoId)
      ); // Remove temporariamente
      setMensagem({
        tipo: "sucesso",
        texto: "Avaliação excluída com sucesso! Recarregando lista...",
      });

      // Re-carrega para mostrar a penúltima avaliação, se houver
      await carregarDados();
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

  // Função que será usada pelo botão "Visualizar"
  const visualizarHistorico = (alunoId) => {
    // Leva para a tela de visualização que carrega a avaliação mais recente pelo ID do Aluno.
    navigate(`/avaliacao/${alunoId}`);
  };

  // Função que será usada pelo botão "Reavaliar"
  const iniciarReavaliacao = (alunoId) => {
    navigate(`/reavaliacao/${alunoId}`);
  };

  // Renderização do componente
  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <BotaoVoltar destino="/avaliacao-inicial" />
        <h2 style={estilos.titulo}>Avaliações Registradas por Aluno</h2>

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
            Nenhuma avaliação encontrada.
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
                        {(perfil === "gestao" || perfil === "aee") && (
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
                        )}
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

export default VerAvaliacoes;
