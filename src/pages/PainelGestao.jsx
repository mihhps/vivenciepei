import React from "react";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

export default function PainelGestao() {
  const navigate = useNavigate();

  const sair = () => {
    localStorage.removeItem("usuarioLogado");
    navigate("/");
  };

  return (
    <div style={containerStyle}>
      <BotaoVoltar />

      <h1 style={tituloStyle}>Painel da Gestão</h1>

      <div style={buttonContainerStyle}>
        <button style={buttonStyle} onClick={() => navigate("/cadastrar-aluno")}>
          Cadastrar Alunos
        </button>

        <button style={buttonStyle} onClick={() => navigate("/cadastrar-usuario")}>
          Cadastrar Usuários
        </button>

        <button style={buttonStyle} onClick={() => navigate("/vincular-escolas")}>
          Vincular Escolas a Professores
        </button>

        <button style={buttonStyle} onClick={() => navigate("/gerar-relatorios")}>
          Visualizar Relatórios
        </button>

          <button style={estiloBotao} onClick={() => navigate("/acompanhamento")}>
    Acompanhamento Escolar
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