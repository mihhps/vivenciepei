import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";

export default function PainelDev() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("usuarioLogado");
    if (userData) {
      const user = JSON.parse(userData);
      setUsuarioLogado(user);
    }
  }, []);

  const botoes = [
    { label: "Cadastrar Aluno", rota: "/cadastrar-aluno" },
    { label: "Cadastrar Usuário", rota: "/cadastro-usuario" },
    { label: "Importar Alunos", rota: "/importar-alunos" },
    { label: "Ver Alunos", rota: "/ver-alunos" },
    { label: "Ver PEIs", rota: "/ver-peis" },
    { label: "Criar PEI", rota: "/criar-pei" },
    { label: "Avaliação Inicial", rota: "/avaliacao-inicial" },
    { label: "Anamnese", rota: "/anamnese-completa" },
    { label: "Acompanhamento Escolar", rota: "/acompanhamento" },
    { label: "Acompanhar Prazos PEI", rota: "/acompanhamento-prazos-pei" },
    { label: "Gerenciar Prazos PEI", rota: "/gestao-prazos-pei" },
    { label: "Vincular Turmas a Professores", rota: "/vincular-professores" },
    { label: "Vincular Escolas a Professores", rota: "/vincular-escolas" },
  ];

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
    cursor: "pointer",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: "#1d3557",
        display: "flex",
        justifyContent: "center",
        paddingTop: "60px",
        paddingBottom: "60px",
        overflowY: "auto",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 0 30px rgba(0,0,0,0.2)",
          width: "100%",
          maxWidth: "420px",
          textAlign: "center",
        }}
      >
        <img
          src="/logo-vivencie.png"
          alt="Logo Vivencie PEI"
          style={{
            width: "150px",
            height: "auto",
            objectFit: "contain",
            display: "block",
            margin: "0 auto 10px",
          }}
        />
        <h1 style={{ marginBottom: "10px", color: "#1d3557" }}>
          Painel da Desenvolvedora
        </h1>
        <p style={{ marginBottom: "20px" }}>
          Bem-vindo, <strong>{usuarioLogado?.nome || "Usuário"}</strong>
          <br />
          Perfil: <strong>Desenvolvedora</strong>
        </p>

        {botoes.map((botao, i) => (
          <button
            key={i}
            onClick={() => navigate(botao.rota)}
            style={estiloBotao}
          >
            {botao.label}
          </button>
        ))}

        <BotaoSair />
      </div>
    </div>
  );
}
