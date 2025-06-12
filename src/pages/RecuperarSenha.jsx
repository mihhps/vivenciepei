import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar"; // <--- Importe o BotaoVoltar

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");

  const handleRecuperarSenha = async () => {
    if (!email.trim()) {
      setMensagem("Por favor, digite um e-mail.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMensagem(
        "E-mail de redefinição de senha enviado. Verifique sua caixa de entrada."
      );
    } catch (error) {
      console.error("Erro ao enviar e-mail:", error);
      if (error.code === "auth/user-not-found") {
        setMensagem("Nenhum usuário encontrado com este e-mail.");
      } else {
        setMensagem("Erro ao tentar enviar e-mail. Tente novamente.");
      }
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <BotaoVoltar /> {/* <--- Adicione o BotaoVoltar aqui */}
        <h2 style={estilos.titulo}>Recuperar Senha</h2>
        <input
          type="email"
          placeholder="Digite seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={estilos.input}
        />
        <button style={estilos.botao} onClick={handleRecuperarSenha}>
          Enviar link de redefinição
        </button>
        {mensagem && <p style={estilos.mensagem}>{mensagem}</p>}
      </div>
    </div>
  );
}

const estilos = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 0 30px rgba(0,0,0,0.2)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
    position: "relative", // Adicione isso para posicionar o botão voltar se ele for absoluto
  },
  titulo: {
    fontSize: "24px",
    marginBottom: "20px",
    color: "#1d3557",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  botao: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#1d3557",
    color: "#fff",
    fontSize: "16px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
  },
  mensagem: {
    marginTop: "15px",
    color: "#1d3557",
    fontWeight: "bold",
  },
};
