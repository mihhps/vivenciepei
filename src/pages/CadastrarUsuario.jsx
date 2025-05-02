import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

function CadastrarUsuario() {
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cargo, setCargo] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState("");

  const navigate = useNavigate();

  const handleSalvar = () => {
    if (!nomeCompleto || !cargo || !login || !senha || !tipo) {
      alert("Preencha todos os campos.");
      return;
    }

    const novoUsuario = {
      nome: nomeCompleto,
      cargo,
      login: login.trim().toLowerCase(),
      senha: senha.trim(),
      tipo: tipo.toLowerCase()
    };

    const usuariosSalvos = JSON.parse(localStorage.getItem("usuarios")) || [];
    usuariosSalvos.push(novoUsuario);
    localStorage.setItem("usuarios", JSON.stringify(usuariosSalvos));

    alert("Usuário cadastrado com sucesso!");
    navigate("/");
  };

  return (
    <div style={estilos.fundo}>
      <div style={estilos.container}>
        <BotaoVoltar />
        <h2 style={estilos.titulo}>Cadastrar Usuário</h2>

        <Campo label="Nome completo" value={nomeCompleto} setValue={setNomeCompleto} placeholder="Ex: Michelle Pollheim" />
        <Campo label="Cargo" value={cargo} setValue={setCargo} placeholder="Ex: Professora" />
        <Campo label="Login" value={login} setValue={setLogin} placeholder="Ex: michelle" />
        <Campo label="Senha" value={senha} setValue={setSenha} type="password" placeholder="******" />

        <div style={{ marginBottom: "25px" }}>
          <label><strong>Tipo de Acesso:</strong></label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={estilos.input}>
            <option value="">Selecione o tipo</option>
            <option value="gestao">Gestão</option>
            <option value="aee">AEE</option>
            <option value="professor">Professor</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>

        <button style={estilos.botao} onClick={handleSalvar}>Salvar</button>
      </div>
    </div>
  );
}

function Campo({ label, value, setValue, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label><strong>{label}:</strong></label>
      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={estilos.input}
        placeholder={placeholder}
      />
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
    padding: "30px"
  },
  container: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 0 30px rgba(0,0,0,0.2)",
    maxWidth: "500px",
    width: "100%"
  },
  titulo: {
    textAlign: "center",
    marginBottom: "25px",
    color: "#1d3557"
  },
  input: {
    width: "100%",
    padding: "10px",
    marginTop: "8px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px"
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
    cursor: "pointer"
  }
};

export default CadastrarUsuario;