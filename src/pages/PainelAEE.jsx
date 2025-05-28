// src/pages/PainelAee.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

export default function PainelAee() {
  const navigate = useNavigate();

  const sair = () => {
    localStorage.removeItem("usuarioLogado");
    navigate("/");
  };

  return (
    <div style={containerStyle}>
      <BotaoVoltar />
      <h1 style={tituloStyle}>Painel do Professor AEE</h1>

      <div style={buttonContainerStyle}>
        <button style={buttonStyle} onClick={() => navigate("/avaliacao-inicial")}>
          Avaliação Inicial
        </button>

        <button style={buttonStyle} onClick={() => navigate("/ver-alunos")}>
          Ver Alunos
        </button>

        <button style={buttonStyle} onClick={() => navigate("/ver-peis")}>
          Ver PEIs
        </button>

        <button style={buttonStyle} onClick={() => navigate("/criar-pei")}>
          Criar PEI
        </button>

        <button style={buttonStyle} onClick={() => navigate("/cadastrar-aluno")}>
          Cadastrar Alunos
        </button>

        <button style={buttonStyle} onClick={() => navigate("/vincular-professores-turmas")}>
          Vincular Professores a Turmas
        </button>

        <button style={buttonStyle} onClick={() => navigate("/importar-alunos")}>
          Importar Alunos
        </button>

        <button style={buttonStyle} onClick={() => navigate("/anamnese")}>
          Anamnese
        </button>

        <button style={logoutButtonStyle} onClick={sair}>
          Sair
        </button>
      </div>
    </div>
  );
}

// Estilos
const containerStyle = {
  minHeight: "100vh",
  backgroundColor: "#e0f7fa",
  padding: "30px",
  textAlign: "center",
  fontFamily: "'Segoe UI', sans-serif",
};

const tituloStyle = {
  marginBottom: "30px",
  fontSize: "28px",
  color: "#1d3557",
};

const buttonContainerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "15px",
  marginTop: "30px",
};

const buttonStyle = {
  width: "260px",
  padding: "15px",
  fontSize: "16px",
  borderRadius: "5px",
  border: "none",
  backgroundColor: "#1d3557",
  color: "white",
  cursor: "pointer",
};

const logoutButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#e63946",
};