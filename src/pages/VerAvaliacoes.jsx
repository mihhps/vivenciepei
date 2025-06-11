// src/pages/VerAvaliacoes.jsx
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

  // ======================= CORREÇÃO APLICADA AQUI =======================
  // Tornamos a leitura do localStorage segura.
  // Se não houver usuário, ele usa um objeto vazio '{}' como padrão, evitando o erro.
  const usuarioLogado = JSON.parse(
    localStorage.getItem("usuarioLogado") || "{}"
  );
  const perfil = usuarioLogado.perfil;
  // ======================================================================

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [avaliacoesSnap, alunosSnap, usuariosSnap] = await Promise.all([
          getDocs(collection(db, "avaliacoesIniciais")),
          getDocs(collection(db, "alunos")),
          getDocs(collection(db, "usuarios")),
        ]);

        const listaAvaliacoes = avaliacoesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const listaAlunos = alunosSnap.docs.map((doc) => doc.data());
        const listaUsuarios = usuariosSnap.docs.map((doc) => doc.data());

        setAvaliacoes(listaAvaliacoes);
        setAlunos(listaAlunos);
        setUsuarios(listaUsuarios);
      } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
        alert("Erro ao carregar avaliações.");
      }
    };

    carregarDados();
  }, []);

  const excluirAvaliacao = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta avaliação?"))
      return;
    try {
      await deleteDoc(doc(db, "avaliacoesIniciais", id));
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
        <h2 style={estilos.titulo}>Avaliações Iniciais</h2>

        <table style={estilos.tabela}>
          <thead>
            <tr>
              <th style={estilos.th}>Aluno</th>
              <th style={estilos.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {avaliacoes.map((a) => (
              <tr key={a.id}>
                <td style={estilos.td}>{a.aluno}</td>
                <td style={estilos.td}>
                  <button
                    onClick={() => navigate(`/avaliacao/${a.id}`)}
                    style={estilos.botaoVisualizar}
                  >
                    Visualizar
                  </button>
                  {/* A verificação de perfil agora é segura */}
                  {(perfil === "gestao" || perfil === "aee") && (
                    <>
                      <button
                        onClick={() => navigate(`/editar-avaliacao/${a.id}`)}
                        style={estilos.botaoEditar}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluirAvaliacao(a.id)}
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
