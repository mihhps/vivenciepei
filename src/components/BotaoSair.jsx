import React from "react";
import { useNavigate } from "react-router-dom";

export default function BotaoSair() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("usuarioLogado");
    navigate("/login");
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        backgroundColor: "#e63946",
        color: "#fff",
        border: "none",
        padding: "10px 18px",
        borderRadius: "8px",
        fontWeight: "bold",
        cursor: "pointer",
        marginBottom: "20px"
      }}
    >
      Sair
    </button>
  );
}