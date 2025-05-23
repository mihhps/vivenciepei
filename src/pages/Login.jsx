import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !senha) {
      alert("Preencha e-mail e senha.");
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);

      const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
      const usuarios = usuariosSnapshot.docs.map(doc => doc.data());
      const usuario = usuarios.find(u => u.email === email.trim());

      if (!usuario) {
        alert("Usuário autenticado, mas não cadastrado no sistema.");
        return;
      }

      const usuarioCompleto = {
        ...usuario,
        uid: cred.user.uid,
        email: cred.user.email,
      };

      console.log("Usuário logado:", usuarioCompleto);

      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioCompleto));

      if (usuarioCompleto.perfil === "gestao") navigate("/painel-gestao");
      else if (usuarioCompleto.perfil === "aee") navigate("/painel-aee");
      else if (usuarioCompleto.perfil === "professor") navigate("/painel-professor");
      else navigate("/");
    } catch (error) {
      console.error("Erro no login:", error);
      alert("E-mail ou senha incorretos.");
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <img src="/logo-vivencie.png" alt="Logo Vivencie PEI" style={estilos.logo} />
        <h2 style={estilos.titulo}>Login</h2>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={estilos.input}
        />

        <div style={estilos.senhaWrapper}>
          <input
            type={mostrarSenha ? "text" : "password"}
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ ...estilos.input, marginBottom: 0 }}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            style={estilos.botaoMostrar}
          >
            {mostrarSenha ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        <button style={estilos.botao} onClick={handleLogin}>
          Entrar
        </button>

        <p style={{ marginTop: 20 }}>
          Ainda não tem conta?{" "}
          <span
            style={{ color: "#1d3557", cursor: "pointer", fontWeight: "bold" }}
            onClick={() => navigate("/cadastro-professor")}
          >
            Cadastre-se como professor
          </span>
        </p>
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
    fontFamily: "'Segoe UI', sans-serif"
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 0 30px rgba(0,0,0,0.2)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center"
  },
  logo: {
    width: "120px",
    marginBottom: "20px"
  },
  titulo: {
    fontSize: "24px",
    marginBottom: "30px",
    color: "#1d3557"
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px"
  },
  senhaWrapper: {
    position: "relative",
    marginBottom: "20px"
  },
  botaoMostrar: {
    position: "absolute",
    top: "50%",
    right: "10px",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#1976d2",
    cursor: "pointer",
    fontSize: "14px"
  },
  botao: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#1d3557",
    color: "#fff",
    fontSize: "16px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer"
  }
};