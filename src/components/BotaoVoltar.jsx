import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PropTypes from 'prop-types'; // Adicione esta importação

export default function BotaoVoltar({ estiloPersonalizado }) {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
  const tipo = usuario?.perfil;

  const handleVoltar = () => {
    if (location.state?.voltarPara) {
      navigate("/ver-peis", { state: { aba: location.state.voltarPara } });
    } else {
      const rotas = {
        professor: "/painel-professor",
        gestao: "/painel-gestao",
        aee: "/painel-aee"
      };
      
      navigate(rotas[tipo] || "/");
    }
  };

  // Estilo base com possibilidade de override
  const estiloBase = {
    padding: "10px 20px",
    backgroundColor: "#1d3557",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    ...estiloPersonalizado // Permite personalização
  };

  return (
    <button onClick={handleVoltar} style={estiloBase}>
      ← Voltar
    </button>
  );
}

BotaoVoltar.propTypes = {
  estiloPersonalizado: PropTypes.object
};