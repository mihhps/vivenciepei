// src/pages/VisualizacaoPrazosPEIProfessor.jsx

import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase"; // Importa sua instância do Firebase Firestore
import { collection, getDocs, query, where } from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar"; // Certifique-se de que este caminho está correto
import { useNavigate } from "react-router-dom"; // Para voltar para a página anterior

function VisualizacaoPrazosPEIProfessor() {
  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState(
    new Date().getFullYear()
  );
  const [dataLimiteCriacao, setDataLimiteCriacao] = useState("");
  const [dataLimiteRevisao1, setDataLimiteRevisao1] = useState("");
  const [dataLimiteRevisao2, setDataLimiteRevisao2] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState(null);
  const navigate = useNavigate();

  // --- Funções Auxiliares de UI ---
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

  // --- Funções de Carregamento de Prazos (similar à gestão) ---
  const buscarPrazos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    setMensagemSucesso(null); // Limpa mensagens anteriores
    try {
      const q = query(
        collection(db, "prazosPEIAnuais"),
        where("anoLetivo", "==", anoLetivoSelecionado)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const dadosPrazos = snapshot.docs[0].data();
        // Os campos do Firebase são strings de data (YYYY-MM-DD), o que é ideal para input type="date"
        setDataLimiteCriacao(dadosPrazos.dataLimiteCriacaoPEI || "");
        setDataLimiteRevisao1(dadosPrazos.dataLimiteRevisao1Sem || "");
        setDataLimiteRevisao2(dadosPrazos.dataLimiteRevisao2Sem || "");
        exibirMensagem(
          "sucesso",
          `Prazos para o ano letivo de ${anoLetivoSelecionado} carregados.`
        );
      } else {
        // Se não encontrar, limpa os campos para exibir como vazio
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
  }, [anoLetivoSelecionado, exibirMensagem]);

  // --- Efeito para carregar prazos e verificar permissão ---
  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
    // Verifica se o usuário tem permissão de 'professor' ou 'aee' ou 'gestao' para visualizar
    if (
      usuario.perfil !== "professor" &&
      usuario.perfil !== "aee" &&
      usuario.perfil !== "gestao"
    ) {
      exibirMensagem(
        "erro",
        "Você não tem permissão para acessar esta página."
      );
      navigate("/"); // Redireciona para a Home
      return;
    }
    buscarPrazos();
  }, [buscarPrazos, navigate, exibirMensagem]);

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
          {/* Professor pode selecionar o ano para ver prazos de anos anteriores/futuros */}
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
            disabled // <--- Desabilitado para edição pelo professor
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
            disabled // <--- Desabilitado para edição pelo professor
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
            disabled // <--- Desabilitado para edição pelo professor
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
// É uma boa prática reutilizar os estilos, mas copiei aqui para facilitar a visualização
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

export default VisualizacaoPrazosPEIProfessor;
