import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";

export default function BotaoSair() {
  const navigate = useNavigate();

  const handleSair = () => {
    // --- LOG CRÍTICO PARA CONFIRMAÇÃO ---
    console.log(
      "!!! BOTAO_SAIR: handleSair() disparado! Iniciando processo de logout e redirecionamento."
    );
    // --- FIM LOG CRÍTICO ---
    auth
      .signOut()
      .then(() => {
        localStorage.removeItem("usuarioLogado");
        console.log(
          "!!! BOTAO_SAIR: Logout bem-sucedido. localStorage 'usuarioLogado' limpo."
        ); // Log de sucesso no logout
        navigate("/"); // Redireciona para a tela institucional
      })
      .catch((error) => {
        console.error("!!! BOTAO_SAIR: Erro ao sair:", error);
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
        fontWeight: "bold",
      }}
    >
      Sair
    </button>
  );
}
