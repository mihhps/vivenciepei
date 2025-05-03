import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

export default function CadastrarProfessor() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const navigate = useNavigate();

  const handleCadastro = async () => {
    if (!nome || !email || !senha || !cargo) {
      alert("Preencha todos os campos.");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
      await addDoc(collection(db, "usuarios"), {
        uid: cred.user.uid,
        nome,
        email: email.trim(),
        cargo,
        perfil: "professor"
      });

      alert("Professor cadastrado com sucesso!");
      navigate("/login");
    } catch (error) {
      console.error("Erro ao cadastrar professor:", error);
      alert("Erro ao cadastrar. Tente novamente.");
    }
  };

  return (
    <div style={estilos.container}>
      {/* Botão Voltar no canto superior esquerdo */}
      <div style={{ position: "absolute", top: "30px", left: "30px" }}>
        <BotaoVoltar />
      </div>

      <div style={estilos.card}>
        <img src="/logo-vivencie.png" alt="Logo Vivencie PEI" style={estilos.logo} />
        <h2 style={estilos.titulo}>Cadastro de Professor</h2>

        <input
          type="text"
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={estilos.input}
        />

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

        <input
          type="text"
          placeholder="Cargo"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          style={estilos.input}
        />

        <button style={estilos.botao} onClick={handleCadastro}>
          Cadastrar
        </button>
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
    position: "relative"
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
    width: "100px",
    marginBottom: "20px"
  },
  titulo: {
    fontSize: "22px",
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