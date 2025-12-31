import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function BotaoLogout() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (dados) setUsuario(dados);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("usuarioLogado");
    navigate("/login");
  };

  if (!usuario) return null;

  return (
    <div style={estilos.container}>
      <div style={estilos.info}>
        <div>
          <strong>{usuario.nome?.split(" ")[0]}</strong>
        </div>
        <div style={estilos.cargo}>{usuario.cargo}</div>
      </div>
      <button onClick={handleLogout} style={estilos.botao}>
        Sair
      </button>
    </div>
  );
}

const estilos = {
  container: {
    position: "fixed",
    top: 20,
    right: 20,
    zIndex: 999,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  info: {
    backgroundColor: "#457b9d",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 14,
    textAlign: "right",
    lineHeight: 1.2,
  },
  cargo: {
    fontSize: 12,
    opacity: 0.9,
  },
  botao: {
    padding: "10px 16px",
    backgroundColor: "#e63946",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontWeight: "bold",
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
};

export default BotaoLogout;
