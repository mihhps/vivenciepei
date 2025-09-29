import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
// 💡 NOVAS IMPORTAÇÕES DO FIRESTORE NECESSÁRIAS
import {
  doc,
  setDoc,
  query,
  where,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import { PERFIS } from "../config/constants";

export default function CadastrarProfessor() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState("");
  // 💡 NOVO ESTADO PARA O CÓDIGO DE ACESSO
  const [codigoConvite, setCodigoConvite] = useState("");

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const navigate = useNavigate();

  const handleCadastro = async () => {
    setErro("");
    setLoading(true);

    // 1. VALIDAÇÃO DE CAMPOS (incluindo o convite)
    if (!nome || !email || !senha || !cargo || !codigoConvite) {
      setErro(
        "Por favor, preencha todos os campos, incluindo o Código de Acesso."
      );
      setLoading(false);
      return;
    }

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      // 2. VERIFICAR E VALIDAR O CÓDIGO DE CONVITE NO FIRESTORE
      const convitesRef = collection(db, "convites");
      const q = query(
        convitesRef,
        // Procura pelo código e verifica se 'expirado' é false
        where("codigo", "==", codigoConvite.trim().toUpperCase()),
        where("expirado", "==", false)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErro("Código de Acesso inválido ou já foi utilizado.");
        setLoading(false);
        return; // Código inválido ou já usado, para a execução.
      }

      // Pega o documento do convite válido para uso futuro
      const conviteDoc = querySnapshot.docs[0];
      const conviteDocRef = doc(db, "convites", conviteDoc.id);

      // 3. CRIA O USUÁRIO NO FIREBASE AUTHENTICATION
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );
      const novoUsuarioUid = userCredential.user.uid;

      // 4. PREPARA E EXECUTA O BATCH (GARANTIA DE ATOMICIDADE)
      const batch = writeBatch(db);

      // A) MARCA O CONVITE COMO EXPIRADO/USADO
      batch.update(conviteDocRef, {
        expirado: true,
        dataUso: new Date().toISOString(),
        utilizadoPor: novoUsuarioUid,
      });

      // B) CRIA O DOCUMENTO DO PROFESSOR NO FIRESTORE
      const dadosProfessorFirestore = {
        uid: novoUsuarioUid,
        nome: nome.trim(),
        email: email.trim(),
        cargo: cargo,
        perfil: PERFIS.PROFESSOR,
        escolas: {},
        turmas: {},
        dataCadastro: new Date().toISOString(),
      };

      const usuarioDocRef = doc(db, "usuarios", novoUsuarioUid);
      batch.set(usuarioDocRef, dadosProfessorFirestore);

      // C) EXECUTA O BATCH: as duas operações devem ser bem-sucedidas.
      await batch.commit();

      // 5. FINALIZAÇÃO DE SUCESSO
      const professorParaLocalStorage = {
        ...dadosProfessorFirestore,
        id: novoUsuarioUid,
      };
      localStorage.setItem(
        "usuarioLogado",
        JSON.stringify(professorParaLocalStorage)
      );

      alert(
        "Professor cadastrado com sucesso! Você será redirecionado para a tela de login."
      );
      navigate("/login");
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      let mensagem =
        "Ocorreu um erro inesperado ao cadastrar. Tente novamente.";

      if (error.code === "auth/email-already-in-use") {
        mensagem =
          "Este e-mail já está cadastrado. Tente outro ou recupere a senha.";
      } else if (error.code === "auth/invalid-email") {
        mensagem = "O formato do e-mail é inválido.";
      } else if (error.code === "auth/weak-password") {
        mensagem = "A senha precisa ter pelo menos 6 caracteres.";
      } else if (error.code === "permission-denied") {
        mensagem =
          "Sem permissão para salvar no Firestore. Verifique as regras de segurança.";
      }
      // Outros erros...

      setErro(mensagem);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <BotaoVoltar style={{ position: "absolute", top: 20, left: 20 }} />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img
            src="/logo-vivencie.png"
            alt="Logo Vivencie PEI"
            style={estilos.logo}
          />
        </div>
        <h2 style={estilos.titulo}>Cadastro de Professor</h2>

        {/* Input do Código de Acesso/Convite */}
        <input
          type="text"
          placeholder="Código de Acesso/Convite" // 💡 NOVO INPUT
          value={codigoConvite}
          onChange={(e) => setCodigoConvite(e.target.value)}
          style={estilos.input}
          disabled={loading}
          required
        />

        {/* Demais Inputs */}
        <input
          type="text"
          placeholder="Nome Completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={estilos.input}
          disabled={loading}
          required
        />
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={estilos.input}
          disabled={loading}
          required
        />
        <select
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          style={estilos.select}
          disabled={loading}
          required
        >
          <option value="">Selecione o Cargo/Disciplina</option>
          {/* ... suas outras options */}
          <option value="Professor Regente">Professor Regente</option>
          <option value="Professor de Suporte">Professor de Suporte</option>
          <option value="Língua Portuguesa">Língua Portuguesa</option>
          <option value="Matemática">Matemática</option>
          <option value="História">História</option>
          <option value="Arte">Arte</option>
          <option value="Geografia">Geografia</option>
          <option value="Educação Física">Educação Física</option>
          <option value="Ciências">Ciências</option>
          <option value="Inglês">Inglês</option>
          <option value="Ensino Religioso">Ensino Religioso</option>
          <option value="Contação de Histórias">Contação de Histórias</option>
          <option value="Comunicação e Linguagem">
            Comunicação e Linguagem
          </option>
          <option value="Aee">Aee</option>
        </select>
        <div style={estilos.senhaWrapper}>
          <input
            type={mostrarSenha ? "text" : "password"}
            placeholder="Senha (mínimo 6 caracteres)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={estilos.input}
            disabled={loading}
            required
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
        <button
          style={estilos.botao}
          onClick={handleCadastro}
          disabled={loading}
        >
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
      </div>
    </div>
  );
}

// Seu objeto de estilos permanece o mesmo
const estilos = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    position: "relative",
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 0 30px rgba(0,0,0,0.2)",
    width: "100%",
    maxWidth: "450px",
    textAlign: "center",
  },
  logo: {
    width: "100px",
    marginBottom: "20px",
  },
  titulo: {
    fontSize: "24px",
    marginBottom: "20px",
    color: "#1d3557",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "16px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "12px",
    marginBottom: "16px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px",
    backgroundColor: "#fff",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666' width='20px' height='20px'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    backgroundSize: "20px",
    cursor: "pointer",
  },
  senhaWrapper: {
    position: "relative",
  },
  botaoMostrar: {
    position: "absolute",
    top: "50%",
    right: "12px",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#1d3557",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0",
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
    marginTop: "20px",
    transition: "background-color 0.2s ease",
    opacity: 1,
  },
  mensagemErro: {
    color: "#e63946",
    backgroundColor: "#ffe0e0",
    border: "1px solid #e63946",
    borderRadius: "6px",
    padding: "10px",
    marginBottom: "15px",
    fontSize: "14px",
    textAlign: "center",
  },
};
