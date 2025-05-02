import React from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  // Recupera o usuário logado e o tipo de perfil
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  const tipo = usuarioLogado?.perfil; // deve ser 'gestao', 'aee' ou 'professor'

  return (
    <div style={styles.fullPage}>
      <div style={styles.card}>
        <img src="/logo-vivencie.png" alt="Logo Vivencie PEI" style={styles.logo} />
        <h1 style={styles.title}>Vivencie PEI</h1>
        <p style={styles.subtitle}>Vivencie o crescimento, vivencie o PEI.</p>

        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={() => navigate("/criar-pei")}>Criar PEI</button>
          <button style={styles.button} onClick={() => navigate("/ver-alunos")}>Ver Alunos</button>
          <button style={styles.button} onClick={() => navigate("/ver-peis")}>Ver PEIs</button>
          <button style={styles.button} onClick={() => navigate("/avaliacao-inicial")}>Avaliação Inicial</button>

          {(tipo === "gestao" || tipo === "aee") && (
            <button style={styles.button} onClick={() => navigate("/cadastro-usuario")}>
              Cadastrar Professor
            </button>
          )}

          <button
            style={{ ...styles.button, backgroundColor: "crimson" }}
            onClick={() => {
              localStorage.removeItem("usuarioLogado");
              navigate("/login");
            }}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  fullPage: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(to bottom, #1d3557, #457b9d)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: "#333"
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 0 30px rgba(0,0,0,0.3)",
    width: "100%",
    maxWidth: "500px",
    textAlign: "center"
  },
  logo: {
    width: "100px",
    marginBottom: "15px"
  },
  title: {
    fontSize: "28px",
    marginBottom: "10px",
    color: "#1d3557"
  },
  subtitle: {
    fontSize: "16px",
    marginBottom: "25px",
    color: "#444"
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  button: {
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
    transition: "0.3s"
  }
};

export default Home;