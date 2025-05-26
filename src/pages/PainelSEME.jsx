import React from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";
import BotaoVoltar from "../components/BotaoVoltar";

export default function PainelSEME() {
  const navigate = useNavigate();

  return (
    <div style={estilos.fundo}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <img src="/logo-vivencie.png" alt="Logo Vivencie PEI" style={estilos.logo} />
        <h2 style={estilos.titulo}>Painel da SEME</h2>

        <div style={estilos.botoes}>
          <button style={estilos.botao} onClick={() => navigate("/ver-alunos")}>
            Ver Alunos
          </button>
          <button style={estilos.botao} onClick={() => navigate("/ver-peis")}>
            Ver PEIs
          </button>
          <button style={estilos.botao} onClick={() => navigate("/ver-avaliacoes")}>
            Ver Avaliações Iniciais
          </button>
          <button style={estilos.botao} onClick={() => navigate("/vincular-escolas")}>
            Vincular Escolas a Professores
          </button>
          <button style={estilos.botao} onClick={() => navigate("/gerar-relatorios")}>
            Gerar PDF Consolidado
          </button>
            <button style={estiloBotao} onClick={() => navigate("/acompanhamento")}>
    Acompanhamento Escolar
  </button>
        </div>

        <BotaoSair />
      </div>
    </div>
  );
}

const estilos = {
  fundo: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "40px 20px"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "20px",
    padding: "40px",
    boxShadow: "0 0 30px rgba(0,0,0,0.2)",
    textAlign: "center",
    width: "100%",
    maxWidth: "500px"
  },
  logo: {
    width: "120px",
    marginBottom: "20px"
  },
  titulo: {
    color: "#1d3557",
    marginBottom: "30px"
  },
  botoes: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    marginBottom: "30px"
  },
  botao: {
    backgroundColor: "#1d3557",
    color: "#fff",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer"
  }
};