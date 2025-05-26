import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

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

      await setDoc(doc(db, "usuarios", cred.user.uid), {
        nome,
        email: email.trim(),
        cargo,
        perfil: "professor",
        uid: cred.user.uid,
        escolas: []
      });

      alert("Professor cadastrado com sucesso!");
      navigate("/login");
    } catch (error) {
      console.error("Erro ao cadastrar:", error);

      let mensagem = "Erro ao cadastrar. Verifique os dados e tente novamente.";
      if (error.code === "auth/email-already-in-use") {
        mensagem = "Este e-mail já está cadastrado.";
      } else if (error.code === "auth/invalid-email") {
        mensagem = "O e-mail digitado é inválido.";
      } else if (error.code === "auth/weak-password") {
        mensagem = "A senha precisa ter pelo menos 6 caracteres.";
      } else if (error.code === "permission-denied") {
        mensagem = "Sem permissão para salvar no Firestore. Verifique as regras.";
      }

      alert(mensagem);
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <img src="/logo-vivencie.png" alt="Logo" style={estilos.logo} />
        <h2 style={estilos.titulo}>Cadastro de Professor</h2>

        <input
          type="text"
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={estilos.input}
        />

        <select
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          style={estilos.select}
        >
          <option value="">Selecione a disciplina</option>
          <option value="PROFESSOR REGENTE">PROFESSOR REGENTE</option>
          <option value="PROFESSOR DE SUPORTE">PROFESSOR DE SUPORTE</option>
          <option value="ARTE">ARTE</option>
          <option value="EDUCAÇÃO FÍSICA">EDUCAÇÃO FÍSICA</option>
          <option value="CONTAÇÃO DE HISTÓRIAS">CONTAÇÃO DE HISTÓRIAS</option>
          <option value="PORTUGUÊS">PORTUGUÊS</option>
          <option value="MATEMÁTICA">MATEMÁTICA</option>
          <option value="HISTÓRIA">HISTÓRIA</option>
          <option value="GEOGRAFIA">GEOGRAFIA</option>
          <option value="CIÊNCIAS">CIÊNCIAS</option>
          <option value="INGLÊS">INGLÊS</option>
          <option value="ENSINO RELIGIOSO">ENSINO RELIGIOSO</option>
          <option value="COMUNICAÇÃO E LINGUAGEM">COMUNICAÇÃO E LINGUAGEM</option>
        </select>

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
            style={estilos.input}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            style={estilos.botaoMostrar}
          >
            {mostrarSenha ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        <button onClick={handleCadastro} style={estilos.botao}>
          Cadastrar
        </button>

        <button onClick={() => navigate("/login")} style={estilos.voltar}>
          Voltar
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
    background: "linear-gradient(to right, #1d3557, #457b9d)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 0 30px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "450px",
    position: "relative",
    textAlign: "center"
  },
  logo: {
    width: "100px",
    marginBottom: "20px"
  },
  titulo: {
    fontSize: "24px",
    marginBottom: "20px",
    color: "#1d3557"
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "16px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px"
  },
  select: {
    width: "100%",
    padding: "12px",
    marginBottom: "16px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px",
    fontFamily: "'Segoe UI', sans-serif",
    backgroundColor: "#fff",
    color: "#333",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='gray' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    backgroundSize: "20px",
    cursor: "pointer"
  },
  senhaWrapper: {
    position: "relative"
  },
  botaoMostrar: {
    position: "absolute",
    top: "50%",
    right: "10px",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#1d3557",
    fontWeight: "bold",
    cursor: "pointer"
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
    marginTop: "20px"
  },
  voltar: {
    marginTop: "10px",
    background: "none",
    border: "none",
    color: "#1d3557",
    cursor: "pointer",
    textDecoration: "underline"
  }
};