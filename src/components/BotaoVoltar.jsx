// src/components/BotaoVoltar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import * as PropTypesImport from "prop-types";
import { FaArrowLeft } from "react-icons/fa";

// Estilos base
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
  },
  icone: {
    fontSize: "14px",
  },
};

function BotaoVoltar({ destino, estiloPersonalizado, texto = "Voltar" }) {
  const navigate = useNavigate();

  const usuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
  const perfil = (usuario.perfil || "").toLowerCase().trim();

  const painelMap = {
    desenvolvedor: "/painel-dev",
    desenvolvedora: "/painel-dev",
    gestao: "/painel-gestao",
    aee: "/painel-aee",
    seme: "/acompanhamento",
    professor: "/painel-professor",
    diretor: "/painel-gestao",
    diretor_adjunto: "/painel-gestao",
    orientador_pedagogico: "/painel-gestao",
  };

  const destinoFinal = destino || painelMap[perfil] || "/";

  const handleVoltar = () => {
    try {
      navigate(destinoFinal);
    } catch (error) {
      console.error("Falha na navegação:", error);
      navigate("/", { replace: true });
    }
  };

  return (
    <button
      onClick={handleVoltar}
      style={{ ...estilosBase.botao, ...estiloPersonalizado }}
      aria-label={texto}
      data-testid="botao-voltar"
    >
      <FaArrowLeft style={estilosBase.icone} />
      <span>{texto}</span>
    </button>
  );
}

BotaoVoltar.propTypes = {
  destino: PropTypesImport.default.string,
  estiloPersonalizado: PropTypesImport.default.object,
  texto: PropTypesImport.default.string,
};

export default BotaoVoltar;
