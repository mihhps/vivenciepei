import React from "react";
import { useNavigate } from "react-router-dom";

export default function BotaoVoltar() {
  const navigate = useNavigate();

  const handleVoltar = () => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    const tipo = usuario?.perfil;

    if (tipo === "professor") {
      navigate("/painel-professor");
    } else if (tipo === "gestao") {
      navigate("/painel-gestao");
    } else if (tipo === "aee") {
      navigate("/painel-aee");
    } else {
      navigate("/"); // fallback: tela institucional
    }
  };

  return (
    <button
      onClick={handleVoltar}
      style={{
        padding: "10px 20px",
        backgroundColor: "#1d3557",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "bold"
      }}
    >
      ← Voltar
    </button>
  );
}