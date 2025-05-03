import React from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";

export default function Home() {
  const navigate = useNavigate();

  const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
  const nome = usuario?.nome || "Usuário";
  const perfil = usuario?.perfil || "";

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <img src="/logo-vivencie.png" alt="Logo Vivencie PEI" style={estilos.logo} />

        <h1 style={estilos.titulo}>Vivencie PEI</h1>
        <p style={estilos.subtitulo}>Vivencie o crescimento, vivencie o PEI.</p>

        <p style={estilos.usuarioInfo}>
          Bem-vindo(a), <strong>{nome}</strong> — Perfil: <strong>{perfil}</strong>
        </p>

        <div style={estilos.botoes}>
          <button style={estilos.botao} onClick={() => navigate("/criar-pei")}>Criar PEI</button>
          <button style={estilos.botao} onClick={() => navigate("/ver-alunos")}>Ver Alunos</button>
          <button style={estilos.botao} onClick={() => navigate("/ver-peis")}>Ver PEIs</button>
          <button style={estilos.botao} onClick={() => navigate("/avaliacao-inicial")}>Avaliação Inicial</button>
          <button style={estilos.botao} onClick={() => navigate("/cadastro-professor")}>Cadastrar Professor</button>
        </div>

        <BotaoSair />
      </div>
    </div>
  );
}

const estilos = {
  container: {
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "30px"
  },
  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "40px",
    width: "100%",
    maxWidth: "500px",
    textAlign: "center",
    boxShadow: "0 0 30px rgba(0,0,0,0.2)"
  },
  logo: {
    width: "100px",
    marginBottom: "20px"
  },
  titulo: {
    fontSize: "26px",
    color: "#1d3557",
    marginBottom: "5px"
  },
  subtitulo: {
    fontSize: "16px",
    color: "#333",
    marginBottom: "20px"
  },
  usuarioInfo: {
    fontSize: "16px",
    color: "#1d3557",
    marginBottom: "25px"
  },
  botoes: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "20px"
  },
  botao: {
    padding: "12px",
    backgroundColor: "#1d3557",
    color: "#fff",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer"
  }
};