import React from "react";
import { useNavigate } from "react-router-dom";

function PainelProfessor() {
  const navigate = useNavigate();

  const sair = () => {
    localStorage.removeItem("usuarioLogado");
    navigate("/login");
  };

  return (
    <div style={styles.fullPage}>
      <button onClick={sair} style={styles.logout}>Sair</button>

      <div style={styles.card}>
        <img src="/logo-vivencie.png" alt="Logo Vivencie PEI" style={styles.logo} />
        <h1 style={styles.title}>Painel do Professor</h1>

        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={() => navigate("/ver-alunos")}>Ver Alunos</button>
          <button style={styles.button} onClick={() => navigate("/criar-pei")}>Gerar PEI</button>
          <button style={styles.button} onClick={() => navigate("/ver-peis")}>Ver PEIs</button>
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
    color: "#333",
    position: "relative"
  },
  logout: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "crimson",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px"
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
    marginBottom: "25px",
    color: "#1d3557"
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

export default PainelProfessor;