// src/components/BotaoVoltar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import * as PropTypesImport from "prop-types"; // Importa tudo de prop-types como um objeto
import { FaArrowLeft } from "react-icons/fa";

// Estilos base com CSS-in-JS pattern (mantido aqui para simplicidade, mas pode ir para CSS)
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

// Componente de Botão Voltar
function BotaoVoltar({ destino, estiloPersonalizado, texto = "Voltar" }) {
  const navigate = useNavigate();

  const handleVoltar = () => {
    try {
      if (destino) {
        navigate(destino);
      } else if (window.history.length > 1) {
        navigate(-1); // Volta uma página no histórico
      } else {
        navigate("/", { replace: true }); // Fallback para rota raiz se não houver histórico
      }
    } catch (error) {
      console.error("Falha na navegação:", error);
      navigate("/", { replace: true }); // Fallback seguro em caso de erro
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

// Definição das PropTypes usando o objeto importado (PropTypesImport.default)
BotaoVoltar.propTypes = {
  destino: PropTypesImport.default.string,
  estiloPersonalizado: PropTypesImport.default.object,
  texto: PropTypesImport.default.string,
};

// Não é mais necessário o BotaoVoltar.defaultProps, pois o parâmetro padrão já é usado na função

export default BotaoVoltar;
