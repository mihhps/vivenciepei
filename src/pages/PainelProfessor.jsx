import React from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";
import TrocarEscola from "../components/TrocarEscola";

export default function PainelProfessor() {
  const navigate = useNavigate();

  return (
    <div style={estilos.fundo}>
      <div style={estilos.card}>
        <img src="/logo-vivencie.png" alt="Logo Vivencie PEI" style={estilos.logo} />
        <h2 style={estilos.titulo}>Painel do Professor</h2>

        <div style={estilos.botoes}>
  <button style={estilos.botao} onClick={() => navigate("/criar-pei")}>
    Criar PEI
  </button>
  <button style={estilos.botao} onClick={() => navigate("/ver-peis")}>
    Ver PEIs
  </button>
  <button style={estilos.botao} onClick={() => navigate("/ver-avaliacoes")}>
    Ver Avaliações Iniciais
  </button>
</div>

<TrocarEscola />  {/* AQUI ENTRA O NOVO BOTÃO */}

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
    fontFamily: "'Segoe UI', sans-serif"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "20px",
    padding: "40px",
    boxShadow: "0 0 20px rgba(0,0,0,0.2)",
    textAlign: "center",
    width: "100%",
    maxWidth: "500px"
  },
  logo: {
    width: "120px",
    marginBottom: "20px"
  },
  titulo: {
    color: "#003366",
    marginBottom: "30px"
  },
  botoes: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    marginBottom: "30px"
  },
  botao: {
    backgroundColor: "#00264d",
    color: "#fff",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer"
  }
};