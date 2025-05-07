import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar";

function EditarAluno() {
  const { id } = useParams(); // id do documento do Firestore
  const navigate = useNavigate();
  const [dados, setDados] = useState({
    nome: "",
    nascimento: "",
    diagnostico: "",
    turma: ""
  });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarAluno() {
      try {
        const docRef = doc(db, "alunos", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          alert("Aluno não encontrado.");
          navigate("/ver-alunos");
          return;
        }

        setDados(docSnap.data());
        setCarregando(false);
      } catch (erro) {
        console.error("Erro ao buscar aluno:", erro);
        alert("Erro ao carregar dados do aluno.");
        navigate("/ver-alunos");
      }
    }

    buscarAluno();
  }, [id, navigate]);

  const salvar = async () => {
    try {
      const docRef = doc(db, "alunos", id);
      await updateDoc(docRef, dados);
      alert("Dados atualizados com sucesso!");
      navigate("/ver-alunos");
    } catch (erro) {
      console.error("Erro ao salvar:", erro);
      alert("Erro ao salvar dados.");
    }
  };

  if (carregando) return <p style={{ textAlign: "center", marginTop: 40 }}>Carregando...</p>;

  return (
    <div style={{ padding: "40px", backgroundColor: "#f7f7f7", minHeight: "100vh" }}>
      <BotaoVoltar />
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>Editar Aluno</h2>

      <div style={formContainer}>
        <label>Nome:</label>
        <input
          style={inputStyle}
          type="text"
          value={dados.nome}
          onChange={(e) => setDados({ ...dados, nome: e.target.value })}
        />

        <label>Data de Nascimento:</label>
        <input
          style={inputStyle}
          type="date"
          value={dados.nascimento}
          onChange={(e) => setDados({ ...dados, nascimento: e.target.value })}
        />

        <label>Diagnóstico:</label>
        <input
          style={inputStyle}
          type="text"
          value={dados.diagnostico}
          onChange={(e) => setDados({ ...dados, diagnostico: e.target.value })}
        />

        <label>Turma:</label>
        <input
          style={inputStyle}
          type="text"
          value={dados.turma}
          onChange={(e) => setDados({ ...dados, turma: e.target.value })}
        />

        <button onClick={salvar} style={btnSalvar}>Salvar</button>
      </div>
    </div>
  );
}

// Estilos
const formContainer = {
  maxWidth: "500px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  padding: "30px",
  borderRadius: "10px",
  boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "15px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const btnSalvar = {
  backgroundColor: "#4CAF50",
  color: "#fff",
  padding: "12px 20px",
  border: "none",
  borderRadius: "6px",
  fontSize: "16px",
  cursor: "pointer",
  width: "100%"
};

export default EditarAluno;