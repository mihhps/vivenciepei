import React from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";

export default function Home() {
  const navigate = useNavigate();
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

  const estiloBotao = {
    padding: "12px 24px",
    margin: "6px 0",
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
      minHeight: "100vh",
      width: "100vw",
      backgroundColor: "#1d3557", // fundo azul igual ao botão
      display: "flex",
      justifyContent: "center",
      paddingTop: "60px",
      paddingBottom: "60px",
      overflowY: "auto",
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
        <img
          src="/logo-vivencie.png"
          alt="Logo Vivencie PEI"
          style={{
            width: "150px",
            height: "auto",
            objectFit: "contain",
            display: "block",
            margin: "0 auto 10px"
          }}
        />
        <h1 style={{ marginBottom: "10px", color: "#1d3557" }}>Vivencie PEI</h1>
        <p style={{ marginBottom: "20px" }}>
          Vivencie o crescimento, vivencie o PEI.<br />
          <strong>{usuarioLogado?.nome}</strong> — Perfil: <strong>{usuarioLogado?.perfil}</strong>
        </p>

        {/* Botões comuns */}
        <button style={estiloBotao} onClick={() => navigate("/criar-pei")}>Criar PEI</button>
        <button style={estiloBotao} onClick={() => navigate("/ver-alunos")}>Ver Alunos</button>
        <button style={estiloBotao} onClick={() => navigate("/ver-peis")}>Ver PEIs</button>
        <button style={estiloBotao} onClick={() => navigate("/avaliacao-inicial")}>Avaliação Inicial</button>

        {/* Botões exclusivos para gestão */}
        {usuarioLogado.perfil === "gestao" && (
          <>
            <button style={estiloBotao} onClick={() => navigate("/cadastrar-aluno")}>Cadastrar Alunos</button>
            <button style={estiloBotao} onClick={() => navigate("/cadastro-usuario")}>Cadastrar Usuários</button>
            <button style={estiloBotao} onClick={() => navigate("/vincular-escolas")}>Vincular Professores a Escolas</button>
            <button style={estiloBotao} onClick={() => navigate("/vincular-professores")}>Vincular Professores a Turmas</button>
            <button style={estiloBotao} onClick={() => navigate("/acompanhamento")}>Acompanhamento de Escolas</button>
            <button style={estiloBotao} onClick={() => navigate("/importar-alunos")}>Importar Alunos</button>
          </>
        )}

        {/* Botão exclusivo para AEE */}
        {usuarioLogado.perfil === "aee" && (
          <button style={estiloBotao} onClick={() => navigate("/anamnese-completa")}>Fazer Anamnese Completa</button>
        )}

        <BotaoSair />
      </div>
    </div>
  );
}