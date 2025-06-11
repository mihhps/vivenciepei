import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

// Importe perfilRedirectMap
import { PERFIS } from "../config/constants";
import { perfilRedirectMap } from "../config/routesConfig";

export default function CadastrarUsuario() {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState(""); // Este será o "Cargo" geral (Professora AEE, Gestão, etc.)
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [perfil, setPerfil] = useState(""); // Perfil selecionado pelo usuário (gestao, aee, professor, etc.)
  const [disciplina, setDisciplina] = useState(""); // Usado ESPECIFICAMENTE para disciplina de professor/AEE

  // --- NOVOS ESTADOS PARA FEEDBACK ---
  const [erro, setErro] = useState(null); // Estado para mensagens de erro
  const [sucesso, setSucesso] = useState(null); // Estado para mensagens de sucesso
  const [loadingCadastro, setLoadingCadastro] = useState(false); // Estado para indicar que o cadastro está em andamento
  // --- FIM DOS NOVOS ESTADOS ---

  const navigate = useNavigate();

  // Função para limpar mensagens de feedback após um tempo
  const limparFeedback = () => {
    setTimeout(() => {
      setErro(null);
      setSucesso(null);
    }, 5000); // Mensagem some após 5 segundos
  };

  const handleCadastro = async () => {
    setErro(null); // Limpar erros anteriores
    setSucesso(null); // Limpar sucessos anteriores

    // Validação de campos obrigatórios
    if (!nome || !email || !senha || !perfil) {
      setErro(
        "Por favor, preencha todos os campos obrigatórios (Nome, E-mail, Senha, Perfil)."
      );
      limparFeedback();
      return;
    }

    // Validação adicional baseada no perfil
    if (perfil === PERFIS.PROFESSOR || perfil === PERFIS.AEE) {
      if (!disciplina) {
        setErro("Por favor, selecione a disciplina para Professores ou AEE.");
        limparFeedback();
        return;
      }
    } else {
      // Se não for professor ou AEE, o campo 'disciplina' pode ser opcional ou não se aplicar.
      // Se o campo 'cargo' (input de texto) for obrigatório para TODOS, mantenha a validação abaixo
      if (!cargo) {
        // Se 'Cargo' é obrigatório para Gestão, Diretor, SEME
        setErro("Por favor, preencha o Cargo.");
        limparFeedback();
        return;
      }
    }

    setLoadingCadastro(true); // Ativa o estado de loading

    try {
      console.log("[CAD_USER_DEBUG] Iniciando cadastro...");
      // 1. Cria o usuário na Autenticação e pega o 'credential' que contém o uid
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );
      const novoUsuarioUid = cred.user.uid;
      console.log(
        "[CAD_USER_DEBUG] Usuário autenticado com UID:",
        novoUsuarioUid
      );

      // 2. Define os dados do usuário a serem salvos no Firestore
      const dadosUsuarioFirestore = {
        uid: novoUsuarioUid, // UID da autenticação
        nome: nome.trim(),
        email: email.trim(),
        // O cargo aqui será o 'cargo' geral (digitado), e a disciplina será a selecionada
        cargo: cargo.trim(),
        perfil: perfil, // Perfil selecionado no formulário (ex: 'professor', 'aee')
        // Salva a disciplina APENAS se for professor ou AEE, caso contrário, deixa vazio
        disciplina:
          perfil === PERFIS.PROFESSOR || perfil === PERFIS.AEE
            ? disciplina
            : "",
        escolas: {}, // Inicializa escolas como um objeto vazio
        turmas: {}, // Inicializa turmas como um objeto vazio
      };

      // 3. Salva o documento no Firestore usando o UID como ID do documento
      await setDoc(doc(db, "usuarios", novoUsuarioUid), dadosUsuarioFirestore);
      console.log(
        "[CAD_USER_DEBUG] Documento Firestore salvo com ID:",
        novoUsuarioUid
      );

      // 4. Salva o usuário no localStorage COM O ID DO DOCUMENTO FIRESTORE
      const usuarioParaLocalStorage = {
        ...dadosUsuarioFirestore, // Copia todos os dados salvos no Firestore
        id: novoUsuarioUid, // Adiciona o ID do documento Firestore (que é o UID neste caso)
      };
      localStorage.setItem(
        "usuarioLogado",
        JSON.stringify(usuarioParaLocalStorage)
      );
      console.log(
        "[CAD_USER_DEBUG] Usuário salvo no localStorage:",
        usuarioParaLocalStorage
      );

      setSucesso("Usuário cadastrado com sucesso!"); // Feedback de sucesso
      limparFeedback();

      // Limpar formulário após o cadastro
      setNome("");
      setCargo("");
      setEmail("");
      setSenha("");
      setPerfil("");
      setDisciplina("");

      // 5. Redireciona para o painel apropriado do perfil recém-cadastrado
      const rotaRedirecionamento = perfilRedirectMap[perfil];
      console.log("[CAD_USER_DEBUG] Perfil selecionado:", perfil);
      console.log(
        "[CAD_USER_DEBUG] Rota de redirecionamento mapeada:",
        rotaRedirecionamento
      );

      if (rotaRedirecionamento) {
        navigate(rotaRedirecionamento, {
          state: { usuario: usuarioParaLocalStorage },
        });
      } else {
        setErro(
          "Perfil de usuário não mapeado para redirecionamento. Redirecionando para a página inicial."
        );
        limparFeedback();
        navigate("/");
      }
    } catch (error) {
      console.error("Erro ao cadastrar usuário:", error);
      let mensagemErro = "Erro ao cadastrar. Verifique os dados e a conexão.";

      if (error.code === "auth/email-already-in-use") {
        mensagemErro = "Este e-mail já está em uso por outra conta.";
      } else if (error.code === "auth/weak-password") {
        mensagemErro = "A senha precisa ter no mínimo 6 caracteres.";
      }

      setErro(mensagemErro); // Exibe o erro na tela
      limparFeedback(); // Limpa a mensagem após um tempo
    } finally {
      setLoadingCadastro(false); // Desativa o estado de loading
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <div style={{ position: "absolute", top: 20, left: 20 }}>
          <BotaoVoltar />
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <img
            src="/logo-vivencie.png"
            alt="Logo Vivencie PEI"
            style={estilos.logo}
          />
        </div>
        <h2 style={estilos.titulo}>Cadastro de Usuário</h2>

        {/* --- Mensagens de Feedback --- */}
        {erro && (
          <p
            style={{
              color: "#e63946",
              backgroundColor: "#ffe6e6",
              padding: "10px",
              borderRadius: "5px",
              marginBottom: "15px",
              textAlign: "center",
            }}
          >
            {erro}
          </p>
        )}
        {sucesso && (
          <p
            style={{
              color: "#2a9d8f",
              backgroundColor: "#e6fff2",
              padding: "10px",
              borderRadius: "5px",
              marginBottom: "15px",
              textAlign: "center",
            }}
          >
            {sucesso}
          </p>
        )}
        {/* --- Fim das Mensagens de Feedback --- */}

        <input
          type="text"
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={estilos.input}
          disabled={loadingCadastro}
        />
        <input
          type="text"
          placeholder="Cargo (ex: Pedagoga, Diretor, Professor)"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          style={estilos.input}
          disabled={loadingCadastro}
        />
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={estilos.input}
          disabled={loadingCadastro}
        />
        <div style={estilos.senhaWrapper}>
          <input
            type={mostrarSenha ? "text" : "password"}
            placeholder="Senha (mínimo 6 caracteres)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ ...estilos.input, marginBottom: 0 }}
            disabled={loadingCadastro}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            style={estilos.botaoMostrar}
            disabled={loadingCadastro}
          >
            {mostrarSenha ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {/* Campo de seleção de Perfil */}
        <select
          value={perfil}
          onChange={(e) => setPerfil(e.target.value)}
          style={estilos.select}
          disabled={loadingCadastro}
        >
          <option value="">Selecione o tipo de perfil</option>
          <option value={PERFIS.GESTAO}>Gestão</option>
          <option value={PERFIS.AEE}>Professor AEE</option>
          <option value={PERFIS.PROFESSOR}>Professor</option>
          <option value={PERFIS.DIRETOR}>Diretor</option>
          <option value={PERFIS.DIRETOR_ADJUNTO}>Diretor Adjunto</option>
          <option value={PERFIS.ORIENTADOR_PEDAGOGICO}>
            Orientador Pedagógico
          </option>
          <option value={PERFIS.SEME}>SEME</option>
          {/* Adicione o perfil DESENVOLVEDOR se quiser cadastrá-lo pelo formulário */}
          {/* <option value={PERFIS.DESENVOLVEDOR}>Desenvolvedor</option> */}
        </select>

        {/* Campo de seleção de Disciplina (visível apenas para Professor e AEE) */}
        {(perfil === PERFIS.PROFESSOR || perfil === PERFIS.AEE) && (
          <select
            value={disciplina}
            onChange={(e) => setDisciplina(e.target.value)}
            style={estilos.select}
            disabled={loadingCadastro}
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
            <option value="COMUNICAÇÃO E LINGUAGEM">
              COMUNICAÇÃO E LINGUAGEM
            </option>
            <option value="AEE">AEE</option>{" "}
            {/* A disciplina "AEE" para o perfil AEE */}
          </select>
        )}

        <button
          style={estilos.botao}
          onClick={handleCadastro}
          disabled={loadingCadastro}
        >
          {loadingCadastro ? "Cadastrando..." : "Cadastrar"}
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
    background: "linear-gradient(to bottom, #00264d, #005b96)", // Alterado para combinar com outros painéis
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    position: "relative",
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 0 30px rgba(0,0,0,0.2)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
  },
  logo: {
    width: "100px",
    marginBottom: "20px",
  },
  titulo: {
    fontSize: "24px",
    marginBottom: "30px",
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
  senhaWrapper: {
    position: "relative",
    marginBottom: "20px",
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
    fontSize: "14px",
  },
  select: {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px",
    fontFamily: "'Segoe UI', sans-serif",
    backgroundColor: "#fff",
    color: "#333",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    // Adicionado ícone de seta para selects para melhorar a aparência
    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='gray' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    backgroundSize: "20px",
    cursor: "pointer",
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
