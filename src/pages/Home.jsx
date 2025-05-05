// src/pages/Home.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";

export default function Home() {
  const navigate = useNavigate();
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

  const estiloBotao = {
    padding: "12px 24px",
    margin: "2px 0",
    backgroundColor: "#1d3557",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    width: "100%",
    cursor: "pointer"
  };

  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      background: "linear-gradient(to bottom, #00264d, #005b96)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      overflow: "auto",
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "40px",
        borderRadius: "20px",
        boxShadow: "0 0 30px rgba(0,0,0,0.2)",
        width: "100%",
        maxWidth: "420px",
        textAlign: "center"
      }}>
        <img src="/logo-vivencie.png" alt="Logo Vivencie PEI" style={{ width: "150px", marginBottom: "1px" }} />
        <h1 style={{ marginBottom: "1px", color: "#1d3557" }}>Vivencie PEI</h1>
        <p style={{ marginBottom: "1px" }}>
          Vivencie o crescimento, vivencie o PEI.<br />
          <strong>{usuarioLogado?.nome}</strong> — Perfil: <strong>{usuarioLogado?.perfil}</strong>
        </p>

        <button style={estiloBotao} onClick={() => navigate("/criar-pei")}>Criar PEI</button>
        <button style={estiloBotao} onClick={() => navigate("/ver-alunos")}>Ver Alunos</button>
        <button style={estiloBotao} onClick={() => navigate("/ver-peis")}>Ver PEIs</button>
        <button style={estiloBotao} onClick={() => navigate("/avaliacao-inicial")}>Avaliação Inicial</button>

        {(usuarioLogado.perfil === "gestao" || usuarioLogado.perfil === "aee") && (
          <button style={estiloBotao} onClick={() => navigate("/cadastro-usuario")}>Cadastrar Usuário</button>
        )}
        <BotaoSair />
      </div>
    </div>
  );
}