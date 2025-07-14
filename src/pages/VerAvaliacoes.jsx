import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar";

function VerAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const navigate = useNavigate();

  const usuarioLogado = JSON.parse(
    localStorage.getItem("usuarioLogado") || "{}"
  );
  const perfil = usuarioLogado.perfil;

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [
          avaliacoesIniciaisSnap,
          avaliacoesNovasSnap,
          alunosSnap,
          usuariosSnap,
        ] = await Promise.all([
          getDocs(collection(db, "avaliacoesIniciais")), // Leitura da coleção antiga
          getDocs(collection(db, "avaliacoes")), // Leitura da coleção nova
          getDocs(collection(db, "alunos")),
          getDocs(collection(db, "usuarios")),
        ]);

        const listaAvaliacoesIniciais = avaliacoesIniciaisSnap.docs.map(
          (doc) => ({
            id: doc.id,
            tipo: "inicial", // Adiciona um campo para identificar a origem
            ...doc.data(),
          })
        );

        const listaAvaliacoesNovas = avaliacoesNovasSnap.docs.map((doc) => ({
          id: doc.id,
          tipo: "nova", // Adiciona um campo para identificar a origem
          ...doc.data(),
        }));

        const todasAsAvaliacoes = [
          ...listaAvaliacoesIniciais,
          ...listaAvaliacoesNovas,
        ];

        const listaAlunos = alunosSnap.docs.map((doc) => doc.data());
        const listaUsuarios = usuariosSnap.docs.map((doc) => doc.data());

        setAvaliacoes(todasAsAvaliacoes);
        setAlunos(listaAlunos);
        setUsuarios(listaUsuarios);
      } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
        alert("Erro ao carregar avaliações.");
      }
    };

    carregarDados();
  }, []); // Dependências vazias para carregar uma vez ao montar

  const excluirAvaliacao = async (id, tipo) => {
    if (!window.confirm("Tem certeza que deseja excluir esta avaliação?"))
      return;
    try {
      const colecaoParaExcluir =
        tipo === "inicial" ? "avaliacoesIniciais" : "avaliacoes";
      await deleteDoc(doc(db, colecaoParaExcluir, id));
      setAvaliacoes((prev) => prev.filter((a) => a.id !== id));
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
      alert("Erro ao excluir.");
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <BotaoVoltar destino="/avaliacao-inicial" />
        <h2 style={estilos.titulo}>Avaliações Registradas</h2>

        <table style={estilos.tabela}>
          <thead>
            <tr>
              <th style={estilos.th}>Aluno</th>
              <th style={estilos.th}>Tipo</th>
              <th style={estilos.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {avaliacoes.map((a) => (
              <tr key={a.id}>
                {/* Lógica para lidar com 'aluno' sendo objeto ou string */}
                <td style={estilos.td}>
                  {typeof a.aluno === "object" && a.aluno !== null
                    ? a.aluno.nome // Se for um objeto com 'nome'
                    : a.aluno || "Aluno Desconhecido"}{" "}
                  {/* Se for string ou nulo/indefinido */}
                </td>
                <td style={estilos.td}>
                  {a.tipo === "inicial" ? "Inicial" : "Nova"}
                </td>
                <td style={estilos.td}>
                  <button
                    onClick={() => navigate(`/avaliacao/${a.id}`)}
                    style={estilos.botaoVisualizar}
                  >
                    Visualizar
                  </button>
                  {(perfil === "gestao" || perfil === "aee") && (
                    <>
                      <button
                        onClick={() => navigate(`/editar-avaliacao/${a.id}`)}
                        style={estilos.botaoEditar}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluirAvaliacao(a.id, a.tipo)}
                        style={estilos.botaoExcluir}
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
  },
  th: {
    backgroundColor: "#f1f1f1",
    padding: "12px",
    textAlign: "left",
    fontWeight: "bold",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #ccc",
    verticalAlign: "middle",
  },
  botaoVisualizar: {
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 12px",
    marginRight: "10px",
    cursor: "pointer",
  },
  botaoEditar: {
    backgroundColor: "#ffb703",
    color: "#000",
    border: "none",
    borderRadius: "6px",
    padding: "8px 12px",
    marginRight: "10px",
    cursor: "pointer",
  },
  botaoExcluir: {
    backgroundColor: "#e63946",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 12px",
    cursor: "pointer",
  },
};

export default VerAvaliacoes;
