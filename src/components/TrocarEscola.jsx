import React from "react";
import { useNavigate } from "react-router-dom";

export default function TrocarEscola() {
  const navigate = useNavigate();

  const handleTrocarEscola = () => {
    localStorage.removeItem("escolaAtiva");
    navigate("/selecionar-escola");
  };

  return (
    <button onClick={handleTrocarEscola} style={estilos.botao}>
      Trocar Escola
    </button>
  );
}

const estilos = {
  botao: {
    padding: "8px 16px",
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    marginTop: "10px"
  }
};