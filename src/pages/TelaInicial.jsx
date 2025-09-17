import React from "react";
import { useNavigate } from "react-router-dom";

export default function TelaInicial() {
  const navigate = useNavigate();

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <img
          src="/logo-vivencie.png"
          alt="Logo Vivencie PEI"
          style={estilos.logo}
        />

        <h1 style={estilos.titulo}>Vivencie PEI</h1>
        <p style={estilos.subtitulo}>
          Criada para apoiar quem educa e acolher quem aprende, Vivencie PEI
          facilita a construção de Planos Educacionais Individualizados e
          acompanha, com carinho e estratégia, o crescimento de cada estudante.
        </p>

        <button onClick={() => navigate("/login")} style={estilos.botao}>
          Fazer Login
        </button>
      </div>
    </div>
  );
}

const estilos = {
  container: {
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    backgroundColor: "#fff",
    padding: "50px",
    borderRadius: "20px",
    boxShadow: "0 0 30px rgba(0,0,0,0.2)",
    textAlign: "center",
    maxWidth: "700px",
    width: "100%",
  },
  logo: {
    width: "240px",
    marginBottom: "10px",
    // ESTILOS ADICIONADOS PARA GARANTIR A CENTRALIZAÇÃO
    marginLeft: "auto",
    marginRight: "auto",
  },
  titulo: {
    fontSize: "50px",
    color: "#1d3557",
    marginTop: "0px",
    marginBottom: "0px",
  },
  subtitulo: {
    fontSize: "16px",
    color: "#333",
    marginBottom: "30px",
    lineHeight: "1.6",
  },
  botao: {
    padding: "12px 30px",
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
  },
};
