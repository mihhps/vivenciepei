// src/components/EscolaAtual.jsx
import React, { useEffect, useState, useCallback } from "react"; // Adicionado useCallback
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useLocation } from "react-router-dom";

// Função utilitária para obter dados do localStorage de forma segura
const getLocalStorageSafe = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined || item === "undefined") {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error(
      `Erro ao parsear ${key} do localStorage em EscolaAtual:`,
      error
    );
    return defaultValue;
  }
};

// Estilos movidos para um objeto CSS separado ou idealmente para um arquivo .css
const escolaAtualStyles = {
  container: {
    textAlign: "center",
    padding: "6px",
    fontSize: "14px",
    background: "#f2f2f2",
    color: "#1d3557",
    borderBottom: "1px solid #ddd",
  },
};

export default function EscolaAtual() {
  const [nomeEscola, setNomeEscola] = useState("");
  const location = useLocation();

  // Função memoizada para carregar o nome da escola
  const carregarNomeEscolaCondicionalmente = useCallback(async () => {
    // 1. Definir rotas onde o nome da escola NÃO deve aparecer
    const rotasIgnoradas = [
      "/", // Raiz/Tela Inicial (ajuste se a tela inicial deve mostrar após login)
      "/login",
      "/recuperar-senha",
      "/cadastro-professor", // Ou qualquer outra rota que não exija escola ativa
    ];

    if (rotasIgnoradas.includes(location.pathname)) {
      setNomeEscola("");
      return;
    }

    // 2. Verificar se há um usuário logado e quais perfis podem ter escola ativa
    const usuario = getLocalStorageSafe("usuarioLogado");

    // === MUDANÇA CRÍTICA AQUI ===
    // Inclua todos os perfis que podem ter uma "escola ativa" aqui
    const perfisComEscolaAtiva = [
      "professor",
      "aee",
      "diretor",
      "diretor adjunto",
      "orientador pedagógico",
      // Adicione outros perfis se necessário
    ];

    if (
      !usuario ||
      !perfisComEscolaAtiva.includes(usuario.perfil?.toLowerCase())
    ) {
      setNomeEscola(""); // Limpa se não for um perfil relevante ou não estiver logado
      return;
    }

    // 3. Obter o ID da escola ativa/visualizada do localStorage
    // Recomendo que essa chave seja salva em VerAlunos.jsx ou outro local
    const escolaAtivaId = localStorage.getItem("escolaAtiva");
    // Ou, se você decide que todos os perfis relevantes sempre terão sua primeira escola vinculada como "ativa":
    // const escolaAtivaId = Object.keys(usuario.escolas || {})[0]; // Se a regra é sempre a primeira vinculada

    if (!escolaAtivaId) {
      // Perfil logado, mas NENHUMA escola ativa/visualizada selecionada no localStorage.
      setNomeEscola("Nenhuma escola selecionada"); // Ou apenas ""
      return;
    }

    // 4. Buscar o nome da escola no Firestore
    try {
      const ref = doc(db, "escolas", escolaAtivaId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const dados = snap.data();
        setNomeEscola(dados.nome || "Escola desconhecida");
      } else {
        setNomeEscola("Escola não encontrada no sistema");
        console.warn(
          `Escola com ID ${escolaAtivaId} não encontrada no Firestore.`
        );
      }
    } catch (error) {
      console.error("Erro ao buscar dados da escola ativa:", error);
      setNomeEscola("Erro ao carregar dados da escola");
    }
  }, [location.pathname]); // Dependências: re-executa ao mudar a rota

  useEffect(() => {
    carregarNomeEscolaCondicionalmente();

    // Ouvinte para mudanças no localStorage (útil para logout/login em outra aba)
    const handleStorageChange = (e) => {
      if (e.key === "escolaAtiva" || e.key === "usuarioLogado") {
        carregarNomeEscolaCondicionalmente();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [carregarNomeEscolaCondicionalmente]); // Dependência: A função memoizada para recarregar

  // Só renderiza o componente se houver um nome de escola para mostrar
  if (!nomeEscola) {
    return null;
  }

  return (
    <div style={escolaAtualStyles.container}>
      {" "}
      {/* Usando o objeto de estilos */}
      Escola Ativa: <strong>{nomeEscola}</strong>
    </div>
  );
}
