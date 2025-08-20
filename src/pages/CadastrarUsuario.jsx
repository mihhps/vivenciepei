import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

// Importe perfilRedirectMap
import { PERFIS } from "../config/constants";
import { perfilRedirectMap } from "../config/routesConfig";

export default function CadastrarUsuario() {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [perfil, setPerfil] = useState(""); // <--- A chave: o valor inicial é uma string vazia
  const [disciplina, setDisciplina] = useState("");

  // --- NOVOS ESTADOS PARA FEEDBACK ---
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [loadingCadastro, setLoadingCadastro] = useState(false);
  // --- FIM DOS NOVOS ESTADOS ---

  // --- NOVOS ESTADOS PARA ESCOLAS ---
  const [listaEscolas, setListaEscolas] = useState([]);
  const [escolasSelecionadas, setEscolasSelecionadas] = useState({});
  const [loadingEscolas, setLoadingEscolas] = useState(false);
  // --- FIM DOS NOVOS ESTADOS ---

  const navigate = useNavigate();

  // Função para limpar mensagens de feedback após um tempo
  const limparFeedback = () => {
    setTimeout(() => {
      setErro(null);
      setSucesso(null);
    }, 5000);
  };

  // Efeito para carregar a lista de escolas
  // ESTE EFEITO SEMPRE BUSCARÁ A LISTA DE ESCOLAS QUANDO A PÁGINA CARREGAR.
  useEffect(() => {
    const fetchEscolas = async () => {
      setLoadingEscolas(true);
      try {
        const querySnapshot = await getDocs(collection(db, "escolas"));
        const escolasData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          nome: doc.data().nome,
        }));
        setListaEscolas(escolasData);
      } catch (err) {
        console.error("Erro ao buscar escolas:", err);
        setErro("Não foi possível carregar a lista de escolas.");
      } finally {
        setLoadingEscolas(false);
      }
    };
    fetchEscolas();
  }, []);

  const handleCadastro = async () => {
    setErro(null);
    setSucesso(null);

    if (!nome || !email || !senha || !perfil) {
      setErro(
        "Por favor, preencha todos os campos obrigatórios (Nome, E-mail, Senha, Perfil)."
      );
      limparFeedback();
      return;
    }

    if (perfil === PERFIS.PROFESSOR || perfil === PERFIS.AEE) {
      if (!disciplina) {
        setErro("Por favor, selecione a disciplina para Professores ou AEE.");
        limparFeedback();
        return;
      }
    } else {
      if (!cargo) {
        setErro("Por favor, preencha o Cargo.");
        limparFeedback();
        return;
      }
    }

    // Validação de escola para perfis que precisam
    // AQUI A VARIÁVEL 'perfisComEscola' É DEFINIDA E VALIDADA
    const perfisComEscola = [
      PERFIS.GESTAO,
      PERFIS.AEE,
      PERFIS.PROFESSOR,
      PERFIS.DIRETOR,
      PERFIS.DIRETOR_ADJUNTO,
      PERFIS.ORIENTADOR_PEDAGOGICO,
    ];
    if (
      perfisComEscola.includes(perfil) &&
      Object.keys(escolasSelecionadas).length === 0
    ) {
      setErro("Por favor, selecione pelo menos uma escola.");
      limparFeedback();
      return;
    }

    setLoadingCadastro(true);

    try {
      console.log("[CAD_USER_DEBUG] Iniciando cadastro...");
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

      const dadosUsuarioFirestore = {
        uid: novoUsuarioUid,
        nome: nome.trim(),
        email: email.trim(),
        cargo: cargo.trim(),
        perfil: perfil,
        disciplina:
          perfil === PERFIS.PROFESSOR || perfil === PERFIS.AEE
            ? disciplina
            : "",
        escolas: escolasSelecionadas, // Agora salva as escolas selecionadas
        turmas: {},
      };

      await setDoc(doc(db, "usuarios", novoUsuarioUid), dadosUsuarioFirestore);
      console.log(
        "[CAD_USER_DEBUG] Documento Firestore salvo com ID:",
        novoUsuarioUid
      );

      const usuarioParaLocalStorage = {
        ...dadosUsuarioFirestore,
        id: novoUsuarioUid,
      };
      localStorage.setItem(
        "usuarioLogado",
        JSON.stringify(usuarioParaLocalStorage)
      );

      setSucesso("Usuário cadastrado com sucesso!");
      limparFeedback();

      setNome("");
      setCargo("");
      setEmail("");
      setSenha("");
      setPerfil("");
      setDisciplina("");
      setEscolasSelecionadas({});

      const rotaRedirecionamento = perfilRedirectMap[perfil];
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

      setErro(mensagemErro);
      limparFeedback();
    } finally {
      setLoadingCadastro(false);
    }
  };

  // Handler para selecionar/desselecionar escolas
  const handleSelecionarEscola = (e) => {
    const { value, checked } = e.target;
    setEscolasSelecionadas((prev) => {
      const newState = { ...prev };
      if (checked) {
        newState[value] = true;
      } else {
        delete newState[value];
      }
      return newState;
    });
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

        <select
          value={perfil}
          onChange={(e) => {
            setPerfil(e.target.value);
            setEscolasSelecionadas({}); // Limpa seleção de escolas ao mudar de perfil
            setDisciplina(""); // Limpa disciplina ao mudar de perfil
          }}
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
        </select>

        {/* Esta seção SÓ APARECE se o perfil for PROFESSOR ou AEE */}
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
            <option value="AEE">AEE</option>
          </select>
        )}

        {/* Esta seção SÓ APARECE se o perfil for um dos listados. */}
        {[
          PERFIS.GESTAO,
          PERFIS.AEE,
          PERFIS.PROFESSOR,
          PERFIS.DIRETOR,
          PERFIS.DIRETOR_ADJUNTO,
          PERFIS.ORIENTADOR_PEDAGOGICO,
        ].includes(perfil) && (
          <div style={estilos.escolaSelectContainer}>
            <h3 style={estilos.escolaSelectTitulo}>
              Selecione a(s) escola(s):
            </h3>
            {loadingEscolas ? (
              <p>Carregando escolas...</p>
            ) : (
              <div style={estilos.escolaCheckboxList}>
                {listaEscolas.map((escola) => (
                  <label key={escola.id} style={estilos.escolaCheckboxLabel}>
                    <input
                      type="checkbox"
                      value={escola.id}
                      checked={!!escolasSelecionadas[escola.id]}
                      onChange={handleSelecionarEscola}
                      disabled={loadingCadastro}
                      style={estilos.escolaCheckboxInput}
                    />
                    {escola.nome}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          style={estilos.botao}
          onClick={handleCadastro}
          disabled={loadingCadastro || loadingEscolas}
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
    background: "linear-gradient(to bottom, #00264d, #005b96)",
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
  // NOVOS ESTILOS PARA SELEÇÃO DE ESCOLAS
  escolaSelectContainer: {
    marginTop: "10px",
    marginBottom: "20px",
    textAlign: "left",
    border: "1px solid #ccc",
    borderRadius: "6px",
    padding: "10px",
    maxHeight: "150px",
    overflowY: "auto",
  },
  escolaSelectTitulo: {
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "10px",
    color: "#1d3557",
  },
  escolaCheckboxList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  escolaCheckboxLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    cursor: "pointer",
  },
  escolaCheckboxInput: {
    marginRight: "8px",
    cursor: "pointer",
  },
};
