import React from "react";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar"; // Importando o botão voltar

function PainelGestao() {
  const navigate = useNavigate();

  const sair = () => {
    localStorage.removeItem("usuarioLogado");
    navigate("/");
  };

  return (
    <div style={containerStyle}>
      <BotaoVoltar /> {/* Botão Voltar no topo */}

      <h1 style={{ marginBottom: "30px" }}>Painel da Gestão</h1>

      <div style={buttonContainerStyle}>
        <button style={buttonStyle} onClick={() => navigate("/cadastrar-aluno")}>
          Cadastrar Alunos
        </button>
        <button style={buttonStyle} onClick={() => navigate("/cadastrar-usuario")}>
          Cadastrar Usuários
        </button>
        <button style={buttonStyle} onClick={() => navigate("/gerar-relatorios")}>
          Visualizar Relatórios
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
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "15px",
  marginTop: "30px",
};

const buttonStyle = {
  width: "250px",
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

export default PainelGestao;