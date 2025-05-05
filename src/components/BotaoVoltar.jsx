import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function BotaoVoltar() {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
  const tipo = usuario?.perfil;

  const handleVoltar = () => {
    if (location.state?.voltarPara) {
      // Voltar para VerPEIs com aba do aluno ativa
      navigate("/ver-peis", { state: { aba: location.state.voltarPara } });
    } else {
      if (tipo === "professor") {
        navigate("/painel-professor");
      } else if (tipo === "gestao") {
        navigate("/painel-gestao");
      } else if (tipo === "aee") {
        navigate("/painel-aee");
      } else {
        navigate("/"); // fallback
      }
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