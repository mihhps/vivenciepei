import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";

export default function BotaoSair() {
  const navigate = useNavigate();

  const handleSair = () => {
    auth.signOut()
      .then(() => {
        localStorage.removeItem("usuarioLogado");
        navigate("/"); // Redireciona para a tela institucional
      })
      .catch((error) => {
        console.error("Erro ao sair:", error);
        alert("Erro ao sair. Tente novamente.");
      });
  };

  return (
    <button
      onClick={handleSair}
      style={{
        marginTop: "2px",
        padding: "10px 20px",
        backgroundColor: "#e63946",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "bold"
      }}
    >
      Sair
    </button>
  );
}