import React, { useState } from "react";
import BotaoVoltar from "../components/BotaoVoltar";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

function CadastroAluno() {
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [turma, setTurma] = useState("");
  const [idade, setIdade] = useState("");

  const calcularIdade = (data) => {
    if (!data) return "";
    const hoje = new Date();
    const [ano, mes, dia] = data.split("-").map(Number);
    const nasc = new Date(ano, mes - 1, dia);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return `${idade} anos`;
  };

  const handleNascimentoChange = (e) => {
    const data = e.target.value;
    setNascimento(data);
    setIdade(calcularIdade(data));
  };

  const handleSalvar = async (e) => {
    e.preventDefault();

    if (!nome || !nascimento || !diagnostico || !turma) {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      await addDoc(collection(db, "alunos"), {
        nome,
        nascimento,
        diagnostico,
        turma
      });

      alert("Aluno cadastrado com sucesso!");

      setNome("");
      setNascimento("");
      setDiagnostico("");
      setTurma("");
      setIdade("");
    } catch (error) {
      console.error("Erro ao salvar no Firestore:", error);
      alert("Erro ao salvar aluno. Tente novamente.");
    }
  };

  return (
    <div style={containerStyle}>
      <BotaoVoltar />
      <h2 style={titulo}>Cadastro de Aluno</h2>
      <form onSubmit={handleSalvar}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          style={inputStyle}
          type="date"
          value={nascimento}
          onChange={handleNascimentoChange}
        />
        {idade && <p><strong>Idade:</strong> {idade}</p>}

        <input
          style={inputStyle}
          type="text"
          placeholder="Diagnóstico"
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
        />

        <input
          style={inputStyle}
          type="text"
          placeholder="Turma"
          value={turma}
          onChange={(e) => setTurma(e.target.value)}
        />

        <button type="submit" style={botaoSalvar}>Salvar</button>
      </form>
    </div>
  );
}

// Estilos
const containerStyle = {
  backgroundColor: "#ffffff",
  padding: "100px",
  borderRadius: "10px",
  maxWidth: "600px",
  margin: "0 auto",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)"
};

const titulo = {
  textAlign: "center",
  marginBottom: "20px",
  color: "#1d3557"
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "15px",
  borderRadius: "6px",
  border: "1px solid #ccc"
};

const botaoSalvar = {
  width: "100%",
  padding: "15px",
  backgroundColor: "#4CAF50",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "16px",
  cursor: "pointer"
};

export default CadastroAluno;