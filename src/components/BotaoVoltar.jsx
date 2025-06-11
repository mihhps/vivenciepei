// src/components/BotaoVoltar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { FaArrowLeft } from "react-icons/fa";

// Estilos base com CSS-in-JS pattern
const estilosBase = {
  botao: {
    backgroundColor: "#6c757d",
    color: "white",
    padding: "8px 16px",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "20px",
    textDecoration: "none",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: "#5a6268",
    },
    "&:focus": {
      outline: "none",
      boxShadow: "0 0 0 3px rgba(108, 117, 125, 0.5)",
    },
  },
  icone: {
    fontSize: "14px",
  },
};

function BotaoVoltar({ destino, estiloPersonalizado, texto = "Voltar" }) {
  const navigate = useNavigate();

  const handleVoltar = () => {
    try {
      if (destino) {
        navigate(destino);
      } else if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/", { replace: true }); // Fallback para rota raiz
      }
    } catch (error) {
      console.error("Falha na navegação:", error);
      navigate("/", { replace: true }); // Fallback seguro
    }
  };

  return (
    <button
      onClick={handleVoltar}
      style={{ ...estilosBase.botao, ...estiloPersonalizado }}
      aria-label={texto === "Voltar" ? "Voltar para a página anterior" : texto}
      data-testid="botao-voltar"
    >
      <FaArrowLeft style={estilosBase.icone} />
      <span>{texto}</span>
    </button>
  );
}

BotaoVoltar.propTypes = {
  destino: PropTypes.string,
  estiloPersonalizado: PropTypes.object,
  texto: PropTypes.string,
};

BotaoVoltar.defaultProps = {
  texto: "Voltar",
};

export default BotaoVoltar;
