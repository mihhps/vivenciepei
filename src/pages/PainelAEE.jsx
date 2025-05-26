import React from "react";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

function PainelAEE() {
  const navigate = useNavigate();

  const sair = () => {
    localStorage.removeItem("usuarioLogado");
    navigate("/");
  };

  return (
    <div style={containerStyle}>
      <h1>Painel do AEE</h1>
      <div style={buttonContainerStyle}>
        <button style={buttonStyle} onClick={() => navigate("/cadastrar-aluno")}>
          Cadastrar Alunos
        </button>

        <button style={buttonStyle} onClick={() => navigate("/anamnese-completa")}>
          Fazer Anamnese Completa
        </button>

        <button style={buttonStyle} onClick={() => navigate("/avaliacao-inicial")}>
          Avaliação Inicial
        </button>

        <button style={logoutButtonStyle} onClick={sair}>
          Sair
        </button>
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  backgroundColor: "#e0f7fa",
  padding: "30px",
  textAlign: "center",
};

const buttonContainerStyle = {
  marginTop: "30px",
};

const buttonStyle = {
  margin: "10px",
  padding: "15px 25px",
  fontSize: "16px",
  borderRadius: "5px",
  border: "none",
  backgroundColor: "#457b9d",
  color: "white",
  cursor: "pointer",
};

const logoutButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#e63946",
};

export default PainelAEE;