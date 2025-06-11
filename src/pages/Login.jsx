import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Importa os PERFIS do seu arquivo de configuração
// Linha correta
import { PERFIS } from "../config/constants";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    setErro("");
    if (!email || !senha) {
      setErro("Por favor, preencha e-mail e senha.");
      return;
    }

    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);
      const user = cred.user; // O objeto user da autenticação

      // Buscar os dados do usuário no Firestore usando o UID de autenticação
      const usuarioRef = doc(db, "usuarios", user.uid);
      const usuarioSnap = await getDoc(usuarioRef);

      if (!usuarioSnap.exists()) {
        setErro(
          "Usuário autenticado, mas dados não encontrados no sistema. Contate o suporte."
        );
        setLoading(false);
        return;
      }

      const usuarioDataDoFirestore = usuarioSnap.data(); // Dados do Firestore
      const usuarioCompletoParaSalvar = {
        // Copia todos os dados do Firestore
        ...usuarioDataDoFirestore,
        uid: user.uid, // Garante que o UID de autenticação está presente
        email: user.email, // Garante que o email de autenticação está presente
        // *** CAMPO CRÍTICO: ID DO DOCUMENTO FIRESTORE ***
        id: usuarioSnap.id, // O ID do documento no Firestore é userDocSnap.id
        // Garante que turmas e escolas são objetos vazios se não existirem
        turmas: usuarioDataDoFirestore.turmas || {},
        escolas: usuarioDataDoFirestore.escolas || {},
      };

      // *** SALVA O USUÁRIO COMPLETO NO LOCALSTORAGE AQUI, ANTES DO SWITCH ***
      // Isso garante que todos os perfis (Gestão, AEE, Professor, SEME, etc.)
      // terão o campo 'id' salvo corretamente.
      localStorage.setItem(
        "usuarioLogado",
        JSON.stringify(usuarioCompletoParaSalvar)
      );

      // Lógica de redirecionamento baseada no perfil
      switch (usuarioCompletoParaSalvar.perfil) {
        case PERFIS.GESTAO:
          navigate("/painel-gestao", {
            state: { usuario: usuarioCompletoParaSalvar },
          });
          break;
        case PERFIS.AEE:
          navigate("/painel-aee", {
            state: { usuario: usuarioCompletoParaSalvar },
          });
          break;
        case PERFIS.PROFESSOR: {
          const escolasObj = usuarioCompletoParaSalvar.escolas; // Use o objeto completo
          const escolaIds = Object.keys(escolasObj);

          if (escolaIds.length === 0) {
            setErro("Este professor não está vinculado a nenhuma escola.");
            // Não precisa de localStorage.setItem aqui, já foi salvo acima.
            // Poderíamos limpar o localStorage se quisermos impedir o acesso,
            // mas o PrivateRoute já vai pegar a falta de escolas vinculadas.
            setLoading(false);
            // Não faça navigate aqui se setErro foi chamado, o usuário precisa ver o erro
          } else if (escolaIds.length === 1) {
            localStorage.setItem("escolaAtiva", escolaIds[0]);
            navigate("/painel-professor", {
              state: { usuario: usuarioCompletoParaSalvar },
            });
          } else {
            // Multiplas escolas, redireciona para seleção de escola
            localStorage.setItem(
              "escolasDisponiveis",
              JSON.stringify(escolaIds)
            );
            navigate("/selecionar-escola", {
              state: { usuario: usuarioCompletoParaSalvar },
            });
          }
          break;
        }
        case PERFIS.SEME:
          navigate("/acompanhamento", {
            state: { usuario: usuarioCompletoParaSalvar },
          });
          break;
        case "desenvolvedor": // Adicionado para perfil desenvolvedor se tiver em PERFIS
          navigate("/painel-dev", {
            state: { usuario: usuarioCompletoParaSalvar },
          });
          break;
        default:
          setErro("Perfil de usuário desconhecido. Contate o suporte.");
          setTimeout(() => navigate("/"), 2000); // Redireciona após 2s
          break; // Garante que o switch não continue
      }
    } catch (error) {
      console.error("Erro no login:", error);
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        setErro("E-mail ou senha incorretos. Verifique e tente novamente.");
      } else {
        setErro(
          "Ocorreu um erro inesperado no login. Tente novamente mais tarde."
        );
      }
    } finally {
      setLoading(false); // Sempre desativa o loading
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <img
          src="/logo-vivencie.png"
          alt="Logo Vivencie PEI"
          style={estilos.logo}
        />
        <h2 style={estilos.titulo}>Login</h2>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={estilos.input}
          disabled={loading}
        />

        <div style={estilos.senhaWrapper}>
          <input
            type={mostrarSenha ? "text" : "password"}
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ ...estilos.input, marginBottom: 0 }}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            style={estilos.botaoMostrar}
            disabled={loading}
          >
            {mostrarSenha ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {erro && <p style={estilos.mensagemErro}>{erro}</p>}

        <button style={estilos.botao} onClick={handleLogin} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p
          style={{
            marginTop: "10px",
            color: "#1d3557",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
          onClick={() => !loading && navigate("/recuperar-senha")}
        >
          Esqueceu a senha?
        </p>

        <p style={{ marginTop: 20 }}>
          Ainda não tem conta?{" "}
          <Link
            to="/cadastro-professor"
            style={{
              color: "#1d3557",
              cursor: loading ? "default" : "pointer",
              fontWeight: "bold",
              textDecoration: "none",
              opacity: loading ? 0.6 : 1,
              pointerEvents: loading ? "none" : "auto",
            }}
          >
            Cadastre-se como professor
          </Link>
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
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "20px 0",
  },
  card: {
    backgroundColor: "#fff",
    padding: "30px 40px",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
  },
  logo: {
    width: "100px",
    marginBottom: "15px",
  },
  titulo: {
    fontSize: "22px",
    marginBottom: "25px",
    color: "#1d3557",
  },
  input: {
    width: "100%",
    padding: "12px 15px",
    marginBottom: "18px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "15px",
    boxSizing: "border-box",
  },
  senhaWrapper: {
    position: "relative",
    marginBottom: "18px",
  },
  botaoMostrar: {
    position: "absolute",
    top: "50%",
    right: "12px",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#1976d2",
    cursor: "pointer",
    fontSize: "14px",
    padding: "5px",
  },
  botao: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#1d3557",
    color: "#fff",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  mensagemErro: {
    color: "#D32F2F",
    backgroundColor: "#FFEBEE",
    border: "1px solid #D32F2F",
    borderRadius: "6px",
    padding: "10px",
    marginBottom: "15px",
    fontSize: "14px",
    textAlign: "center",
  },
};
