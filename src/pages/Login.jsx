import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { PERFIS } from "../config/constants";

// Importando o novo estilo Jakarta
import "../styles/LoginJakarta.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  // Limpeza inicial de segurança
  useEffect(() => {
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("escolaAtiva");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    if (!email || !senha) {
      setErro("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);
      const user = cred.user;

      const usuarioRef = doc(db, "usuarios", user.uid);
      const usuarioSnap = await getDoc(usuarioRef);

      if (!usuarioSnap.exists()) {
        setErro("Dados não encontrados no sistema. Contate o suporte.");
        setLoading(false);
        return;
      }

      const usuarioData = usuarioSnap.data();
      const usuarioCompleto = {
        ...usuarioData,
        uid: user.uid,
        email: user.email,
        id: usuarioSnap.id,
        turmas: usuarioData.turmas || {},
        escolas: usuarioData.escolas || {},
      };

      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioCompleto));

      switch (usuarioCompleto.perfil) {
        case PERFIS.GESTAO:
        case PERFIS.DIRETOR:
        case PERFIS.DIRETOR_ADJUNTO:
        case PERFIS.ORIENTADOR_PEDAGOGICO:
          navigate("/painel-gestao");
          break;
        case PERFIS.SEME:
          navigate("/painel-seme");
          break;
        case PERFIS.AEE:
          navigate("/painel-aee");
          break;
        case PERFIS.PROFESSOR: {
          const escolaIds = Object.keys(usuarioCompleto.escolas);
          if (escolaIds.length === 0) {
            setErro("Vínculo com escola não encontrado.");
            setLoading(false);
          } else if (escolaIds.length === 1) {
            localStorage.setItem("escolaAtiva", JSON.stringify(escolaIds[0]));
            navigate("/painel-professor");
          } else {
            localStorage.setItem(
              "escolasDisponiveis",
              JSON.stringify(escolaIds)
            );
            navigate("/selecionar-escola");
          }
          break;
        }
        case PERFIS.DESENVOLVEDOR:
          navigate("/painel-dev");
          break;
        default:
          setErro("Perfil desconhecido.");
          break;
      }
    } catch (error) {
      console.error("Login Error:", error.code);
      setErro("E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src="/logo-vivencie.png" alt="Logo" className="login-logo" />
        <h2 className="login-titulo">Vivencie PEI</h2>
        <p className="login-subtitulo">Acesse sua conta para continuar</p>

        <form onSubmit={handleLogin}>
          {erro && <div className="erro-alerta">{erro}</div>}

          <input
            type="email"
            placeholder="E-mail profissional"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            disabled={loading}
          />

          <div className="senha-wrapper">
            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="login-input"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="btn-mostrar-senha"
            >
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          <button type="submit" className="btn-entrar" disabled={loading}>
            {loading ? "Autenticando..." : "Entrar na Plataforma"}
          </button>
        </form>

        <div className="links-container">
          <p className="texto-apoio">
            <span
              style={{ cursor: "pointer" }}
              onClick={() => !loading && navigate("/recuperar-senha")}
              className="link-minimal"
            >
              Esqueceu sua senha?
            </span>
          </p>

          <p className="texto-apoio">
            Novo por aqui?{" "}
            <Link to="/cadastro-professor" className="link-minimal">
              Cadastre-se como Professor
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
