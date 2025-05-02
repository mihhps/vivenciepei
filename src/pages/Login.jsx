import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";


function Login() {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuarioValido = usuarios.find(
      (u) =>
        u.login === usuarioLogado?.login &&
        u.senha === usuarioLogado?.senha
    );

    if (usuarioValido) {
      if (usuarioValido.tipo === "professor") {
        navigate("/painel-professor");
      } else {
        navigate("/");
      }
    } else {
      localStorage.removeItem("usuarioLogado"); // limpa login inválido
    }
  }, [navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    const loginFormatado = login.trim().toLowerCase();
    const senhaFormatada = senha.trim();

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuario = usuarios.find(
      (u) =>
        u.login.trim().toLowerCase() === loginFormatado &&
        u.senha.trim() === senhaFormatada
    );

    if (usuario) {
      localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
      if (usuario.tipo === "professor") {
        navigate("/painel-professor");
      } else {
        navigate("/");
      }
    } else {
      setErro(true);
    }
  };

  return (
    <div style={estilos.fundo}>
      <form onSubmit={handleLogin} style={estilos.card}>
        <img src="/logo-vivencie.png" alt="Logo Vivencie PEI" style={estilos.logo} />
        <h2 style={estilos.titulo}>Vivencie PEI</h2>

        <input
          type="text"
          placeholder="Login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          style={{
            ...estilos.input,
            borderColor: erro ? "red" : "#ccc",
          }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={{
            ...estilos.input,
            borderColor: erro ? "red" : "#ccc",
          }}
        />

        <button type="submit" style={estilos.botao}>
          Entrar
        </button>

        {erro && <p style={estilos.erro}>Usuário ou senha inválidos.</p>}
      </form>
    </div>
  );
}

const estilos = {
  fundo: {
    minHeight: "100vh",
    width: "100vw",
    background: "#1d3557",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "30px",
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0 0 20px rgba(0,0,0,0.2)",
  },
  logo: {
    width: "100px",
    marginBottom: "10px",
  },
  titulo: {
    marginBottom: "25px",
    color: "#1d3557",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  botao: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  erro: {
    color: "red",
    marginTop: "10px",
    fontSize: "14px",
  },
};

export default Login;