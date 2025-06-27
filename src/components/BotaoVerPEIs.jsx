import React from "react";
import { useNavigate } from "react-router-dom";

function BotaoVerPEIs() {
  const navigate = useNavigate();

  const handleVerPEIs = () => {
    navigate("/ver-peis"); // Assume que a rota para a página VerPEIs é /ver-peis
  };

  const buttonStyle = {
    backgroundColor: "#66CDAA", // <-- NOVO: Verde-água claro (Medium Aquamarine)
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    transition: "background-color 0.2s ease",
  };

  const buttonHoverStyle = {
    backgroundColor: "#48BFAA", // <-- NOVO: Um verde-água um pouco mais escuro para o hover
  };

  return (
    <button
      onClick={handleVerPEIs}
      style={buttonStyle}
      onMouseOver={(e) =>
        (e.currentTarget.style.backgroundColor =
          buttonHoverStyle.backgroundColor)
      }
      onMouseOut={(e) =>
        (e.currentTarget.style.backgroundColor = buttonStyle.backgroundColor)
      }
    >
      Ver PEIs
    </button>
  );
}

export default BotaoVerPEIs;
