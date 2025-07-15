import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // Certifique-se de que `auth` e `db` são importados corretamente
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar"; // Componente BotaoVoltar
import { PERFIS } from "../config/constants"; // Importa os PERFIS (usado para `perfil: "professor"`)

export default function CadastrarProfessor() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState(""); // Cargo do professor (disciplina, etc.)
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false); // Adicionado estado de loading
  const [erro, setErro] = useState(""); // Adicionado estado de erro para feedback ao usuário

  const navigate = useNavigate();

  const handleCadastro = async () => {
    setErro(""); // Limpa erros anteriores
    setLoading(true); // Ativa o loading

    if (!nome || !email || !senha || !cargo) {
      setErro("Por favor, preencha todos os campos.");
      setLoading(false);
      return;
    }

    if (senha.length < 6) {
      // Validação de senha
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      // 1. Cria o usuário no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );
      const novoUsuarioUid = userCredential.user.uid;

      // 2. Dados do professor a serem salvos no Firestore
      const dadosProfessorFirestore = {
        uid: novoUsuarioUid, // UID de autenticação
        nome: nome.trim(),
        email: email.trim(),
        cargo: cargo, // Cargo/Disciplina selecionada
        perfil: PERFIS.PROFESSOR, // Perfil fixo como 'professor' (usando a constante importada)
        escolas: {}, // Inicializa escolas como um objeto vazio
        turmas: {}, // Inicializa turmas como um objeto vazio
        dataCadastro: new Date().toISOString(), // Opcional: data de cadastro
      };

      // 3. Salva o documento do professor no Firestore usando o UID como ID do documento
      await setDoc(
        doc(db, "usuarios", novoUsuarioUid),
        dadosProfessorFirestore
      );

      // 4. Salva o professor recém-cadastrado no localStorage (opcional, pode não ser necessário aqui,
      // pois o usuário geralmente fará login após o cadastro)
      // Se você quer que ele esteja logado automaticamente após o cadastro, use AuthContext para isso.
      const professorParaLocalStorage = {
        ...dadosProfessorFirestore, // Copia todos os dados salvos no Firestore
        id: novoUsuarioUid, // Adiciona o ID do documento Firestore (que é o UID neste caso)
      };
      localStorage.setItem(
        "usuarioLogado",
        JSON.stringify(professorParaLocalStorage)
      );

      alert(
        "Professor cadastrado com sucesso! Você será redirecionado para a tela de login."
      );
      // Redireciona para a tela de login após o cadastro bem-sucedido
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

      setErro(mensagem);
    } finally {
      setLoading(false); // Desativa o loading
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        {/* Botão de Voltar - Posicionado no canto superior esquerdo */}
        <BotaoVoltar style={{ position: "absolute", top: 20, left: 20 }} />
        {/* Logo centralizado */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img
            src="/logo-vivencie.png"
            alt="Logo Vivencie PEI"
            style={estilos.logo}
          />
        </div>
        <h2 style={estilos.titulo}>Cadastro de Professor</h2>
        <input
          type="text"
          placeholder="Nome Completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={estilos.input}
          disabled={loading} // Desabilita durante o carregamento
          required
        />
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={estilos.input}
          disabled={loading} // Desabilita durante o carregamento
          required
        />
        <select
          value={cargo} // Cargo aqui é a disciplina
          onChange={(e) => setCargo(e.target.value)}
          style={estilos.select}
          disabled={loading} // Desabilita durante o carregamento
          required
        >
          <option value="">Selecione o Cargo/Disciplina</option>
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
            disabled={loading} // Desabilita durante o carregamento
            required
          />
          <button
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            style={estilos.botaoMostrar}
            disabled={loading} // Desabilita durante o carregamento
          >
            {mostrarSenha ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {erro && <p style={estilos.mensagemErro}>{erro}</p>}{" "}
        {/* Exibe mensagens de erro */}
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
    position: "relative", // Necessário para posicionar o BotaoVoltar
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
    boxSizing: "border-box", // Garante que padding e border estão incluídos na largura total
  },
  select: {
    width: "100%",
    padding: "12px",
    marginBottom: "16px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px",
    backgroundColor: "#fff",
    appearance: "none", // Remove setas padrão do select em alguns navegadores
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
    padding: "0", // Remover padding padrão do botão
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
    color: "#e63946", // Cor de erro
    backgroundColor: "#ffe0e0", // Fundo suave para o erro
    border: "1px solid #e63946",
    borderRadius: "6px",
    padding: "10px",
    marginBottom: "15px",
    fontSize: "14px",
    textAlign: "center",
  },
};
