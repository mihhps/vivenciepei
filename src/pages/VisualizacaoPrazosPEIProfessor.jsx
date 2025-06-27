import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom";

// --- HOOK CUSTOMIZADO PARA MENSAGENS ---
const useMessageSystem = () => {
  const [erro, setErro] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState(null);

  const exibirMensagem = useCallback((tipo, texto) => {
    if (tipo === "erro") {
      setErro(texto);
      setMensagemSucesso(null);
    } else if (tipo === "sucesso") {
      setMensagemSucesso(texto);
      setErro(null);
    }
    setTimeout(() => {
      setErro(null);
      setMensagemSucesso(null);
    }, 5000);
  }, []);

  return { erro, mensagemSucesso, exibirMensagem };
};

// --- FUNÇÕES AUXILIARES ---
// Função para formatar datas de forma robusta para exibição no PDF
const formatarDataParaInput = (dataFirebase) => {
  if (!dataFirebase) return ""; // Retorna string vazia para input type="date"

  let dateObj;
  try {
    if (typeof dataFirebase.toDate === "function") {
      // Firestore Timestamp
      dateObj = dataFirebase.toDate();
    } else if (dataFirebase instanceof Date) {
      // Objeto Date nativo
      dateObj = dataFirebase;
    } else if (typeof dataFirebase === "string") {
      // String (YYYY-MM-DD ou ISO)
      dateObj = new Date(dataFirebase);
    } else {
      return ""; // Caso de dado inesperado
    }

    if (isNaN(dateObj.getTime())) return ""; // Verifica se a data é válida

    const ano = dateObj.getFullYear();
    const mes = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const dia = dateObj.getDate().toString().padStart(2, "0");

    return `${ano}-${mes}-${dia}`; // Formato YYYY-MM-DD para input type="date"
  } catch (e) {
    console.error("Erro ao formatar data para input:", e);
    return "";
  }
};

// --- COMPONENTE PRINCIPAL ---
export default function VisualizacaoPrazosPEIProfessor() {
  const navigate = useNavigate();
  const { erro, mensagemSucesso, exibirMensagem } = useMessageSystem();

  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState(
    new Date().getFullYear()
  );
  const [dataLimiteCriacao, setDataLimiteCriacao] = useState("");
  const [dataLimiteRevisao1, setDataLimiteRevisao1] = useState("");
  const [dataLimiteRevisao2, setDataLimiteRevisao2] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Carrega e padroniza os dados do usuário logado uma única vez
  const usuarioLogado = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
      return { ...user, perfil: user.perfil?.toLowerCase()?.trim() || "" }; // Normaliza o perfil
    } catch (e) {
      console.error("Erro ao parsear dados do usuário logado:", e);
      return {};
    }
  }, []);

  // Define os perfis que podem ver esta página (com perfil já normalizado)
  const perfisComPermissaoDeVisualizacao = useMemo(
    () => ["professor", "aee", "gestao"],
    []
  );

  // --- EFEITO 1: Verificação de Permissão de Acesso à Página ---
  useEffect(() => {
    // Apenas executa depois que usuarioLogado foi inicializado
    if (Object.keys(usuarioLogado).length === 0) return;

    if (!perfisComPermissaoDeVisualizacao.includes(usuarioLogado.perfil)) {
      exibirMensagem(
        "erro",
        "Você não tem permissão para acessar esta página."
      );
      navigate("/");
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioLogado, navigate]); // Dependências: usuário logado e navigate

  // --- EFEITO 2: Carregamento de Prazos por Ano Letivo ---
  const buscarPrazos = useCallback(async () => {
    setCarregando(true);
    exibirMensagem(
      "sucesso",
      `Carregando prazos para ${anoLetivoSelecionado}...`
    ); // Mensagem de feedback
    try {
      const q = query(
        collection(db, "prazosPEIAnuais"),
        where("anoLetivo", "==", anoLetivoSelecionado)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const dadosPrazos = snapshot.docs[0].data();
        setDataLimiteCriacao(
          formatarDataParaInput(dadosPrazos.dataLimiteCriacaoPEI)
        );
        setDataLimiteRevisao1(
          formatarDataParaInput(dadosPrazos.dataLimiteRevisao1Sem)
        );
        setDataLimiteRevisao2(
          formatarDataParaInput(dadosPrazos.dataLimiteRevisao2Sem)
        );
        exibirMensagem(
          "sucesso",
          `Prazos para o ano letivo de ${anoLetivoSelecionado} carregados.`
        );
      } else {
        setDataLimiteCriacao("");
        setDataLimiteRevisao1("");
        setDataLimiteRevisao2("");
        exibirMensagem(
          "erro",
          `Nenhum prazo definido para o ano letivo de ${anoLetivoSelecionado}.`
        );
      }
    } catch (e) {
      console.error("Erro ao buscar prazos para professor:", e);
      exibirMensagem(
        "erro",
        "Erro ao carregar prazos. Verifique sua conexão ou tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }, [anoLetivoSelecionado, exibirMensagem]); // Dependências: anoLetivoSelecionado e exibirMensagem

  // Chama buscarPrazos quando o ano letivo selecionado muda ou após a permissão ser verificada
  useEffect(() => {
    // Garante que o usuário está autorizado antes de buscar os prazos
    if (perfisComPermissaoDeVisualizacao.includes(usuarioLogado.perfil)) {
      buscarPrazos();
    }
  }, [buscarPrazos, perfisComPermissaoDeVisualizacao, usuarioLogado.perfil]);

  // --- Renderização ---
  return (
    <div style={estilos.container} aria-busy={carregando}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h1 style={estilos.titulo}>Visualização de Prazos do PEI</h1>

        {erro && (
          <div style={estilos.mensagemErro} role="alert">
            {erro}
          </div>
        )}
        {mensagemSucesso && (
          <div style={estilos.mensagemSucesso} role="status">
            {mensagemSucesso}
          </div>
        )}

        <div style={estilos.inputGroup}>
          <label style={estilos.label} htmlFor="anoLetivoSelect">
            Ano Letivo:
          </label>
          <select
            id="anoLetivoSelect"
            value={anoLetivoSelecionado}
            onChange={(e) => setAnoLetivoSelecionado(Number(e.target.value))}
            style={estilos.input}
            disabled={carregando}
          >
            {[
              new Date().getFullYear() + 1,
              new Date().getFullYear(),
              new Date().getFullYear() - 1,
            ].map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </div>

        <div style={estilos.inputGroup}>
          <label style={estilos.label} htmlFor="dataLimiteCriacao">
            Data Limite Criação PEI:
          </label>
          <input
            type="date"
            id="dataLimiteCriacao"
            value={dataLimiteCriacao}
            style={estilos.input}
            disabled // Desabilitado para edição pelo professor
          />
        </div>
        <div style={estilos.inputGroup}>
          <label style={estilos.label} htmlFor="dataLimiteRevisao1">
            Data Limite 1ª Revisão:
          </label>
          <input
            type="date"
            id="dataLimiteRevisao1"
            value={dataLimiteRevisao1}
            style={estilos.input}
            disabled // Desabilitado para edição pelo professor
          />
        </div>
        <div style={estilos.inputGroup}>
          <label style={estilos.label} htmlFor="dataLimiteRevisao2">
            Data Limite 2ª Revisão:
          </label>
          <input
            type="date"
            id="dataLimiteRevisao2"
            value={dataLimiteRevisao2}
            style={estilos.input}
            disabled // Desabilitado para edição pelo professor
          />
        </div>

        {carregando && (
          <p style={estilos.carregandoTexto}>Carregando prazos...</p>
        )}
        {!dataLimiteCriacao &&
          !dataLimiteRevisao1 &&
          !dataLimiteRevisao2 &&
          !carregando && (
            <p style={estilos.nenhumPrazo}>
              Nenhum prazo definido para o ano letivo selecionado.
            </p>
          )}
      </div>
    </div>
  );
}

// --- Estilos para VisualizacaoPrazosPEIProfessor (pode reutilizar ou adaptar de GestaoPrazosPEI) ---
const estilos = {
  container: {
    background: "#f4f7f6",
    minHeight: "100vh",
    padding: "25px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: "#fff",
    maxWidth: "800px",
    margin: "0 auto",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  titulo: {
    textAlign: "center",
    color: "#1d3557",
    marginBottom: "30px",
    fontSize: "2em",
  },
  inputGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    fontSize: "1em",
    backgroundColor: "#e9ecef", // Estilo para campo desabilitado
    cursor: "not-allowed",
  },
  mensagemErro: {
    color: "#e63946",
    backgroundColor: "#ffe6e6",
    padding: "10px",
    borderRadius: "5px",
    marginBottom: "20px",
    textAlign: "center",
  },
  mensagemSucesso: {
    color: "#2a9d8f",
    backgroundColor: "#e6fff2",
    padding: "10px",
    borderRadius: "5px",
    marginBottom: "20px",
    textAlign: "center",
  },
  carregandoTexto: {
    textAlign: "center",
    color: "#555",
    fontStyle: "italic",
  },
  nenhumPrazo: {
    textAlign: "center",
    color: "#777",
    fontStyle: "italic",
  },
};
