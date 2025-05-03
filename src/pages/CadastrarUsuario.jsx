import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";

export default function CadastroProfessor() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleCadastro = async () => {
    if (!nome || !email || !senha || !confirmarSenha) {
      alert("Preencha todos os campos.");
      return;
    }
    if (senha !== confirmarSenha) {
      alert("As senhas não coincidem.");
      return;
    }

    try {
      setCarregando(true);
      await createUserWithEmailAndPassword(auth, email.trim(), senha);

      await addDoc(collection(db, "usuarios"), {
        nome: nome.trim(),
        email: email.trim(),
        login: email.trim(),
        cargo: "Professor(a)",
        perfil: "professor"
      });

      alert("Cadastro realizado com sucesso!");
      navigate("/login");
    } catch (erro) {
      console.error(erro);
      alert("Erro ao cadastrar. Verifique se o e-mail já está em uso.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
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
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={estilos.input}
        />
        <input
          type="password"
          placeholder="Confirmar senha"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          style={estilos.input}
        />

        <button
          style={estilos.botao}
          onClick={handleCadastro}
          disabled={carregando}
        >
          {carregando ? "Cadastrando..." : "Cadastrar"}
        </button>

        <p style={{ marginTop: 15 }}>
          Já tem uma conta?{" "}
          <span
            style={{ color: "#1d3557", cursor: "pointer" }}
            onClick={() => navigate("/login")}
          >
            Voltar ao login
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
  },
  titulo: {
    fontSize: "24px",
    marginBottom: "20px",
    color: "#1d3557",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
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
};