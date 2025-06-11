// src/components/EscolaAtual.jsx

import React, { useEffect, useState, useCallback } from "react";
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
    return JSON.parse(item); // Assume que o valor é um JSON string
  } catch (error) {
    // Erros ao parsear do localStorage devem ser tratados silenciosamente em produção
    // ou logados sem serem bloqueadores.
    console.error(`Erro ao parsear ${key} do localStorage:`, error);
    return defaultValue;
  }
};

// Estilos movidos para um objeto CSS
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
    // 1. Definir rotas onde o nome da escola NÃO deve aparecer (ex: login, cadastro)
    const rotasIgnoradas = [
      "/",
      "/login",
      "/recuperar-senha",
      "/cadastro-professor",
    ];

    if (rotasIgnoradas.includes(location.pathname)) {
      setNomeEscola("");
      return;
    }

    // 2. Verificar se há um usuário logado e se o perfil está autorizado a ter uma "escola ativa"
    const usuario = getLocalStorageSafe("usuarioLogado");

    const perfisComEscolaAtiva = [
      "professor",
      "aee",
      "diretor",
      "diretor adjunto",
      "orientador pedagógico",
      "gestao",
      "desenvolvedor",
      "seme",
    ];

    if (
      !usuario ||
      !perfisComEscolaAtiva.includes(usuario.perfil?.toLowerCase())
    ) {
      setNomeEscola("");
      return;
    }

    // 3. Obter o ID da escola ativa/visualizada do localStorage
    const escolaAtivaIdRaw = localStorage.getItem("escolaAtiva");
    let escolaAtivaId = null;

    if (escolaAtivaIdRaw) {
      try {
        escolaAtivaId = JSON.parse(escolaAtivaIdRaw);
      } catch (e) {
        console.error("Erro ao parsear 'escolaAtiva' do localStorage:", e);
        localStorage.removeItem("escolaAtiva"); // Remove item corrompido
        setNomeEscola("");
        return;
      }
    }

    if (!escolaAtivaId) {
      setNomeEscola("Nenhuma escola selecionada");
      return;
    }

    // 4. Buscar o nome da escola no Firestore usando o ID
    try {
      const ref = doc(db, "escolas", escolaAtivaId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const dados = snap.data();
        setNomeEscola(dados.nome || "Escola desconhecida");
      } else {
        // Se o ID da escola não for encontrado no Firestore, mas estava no localStorage
        console.warn(
          `Escola com ID ${escolaAtivaId} não encontrada no Firestore.`
        );
        setNomeEscola("Escola não encontrada no sistema");
      }
    } catch (error) {
      console.error(
        "Erro ao buscar dados da escola ativa no Firestore:",
        error
      );
      setNomeEscola("Erro ao carregar dados da escola");
    }
  }, [location.pathname]); // Dependência: re-executa o efeito quando a rota muda

  // Efeito para carregar o nome da escola na montagem e reagir a mudanças no localStorage
  useEffect(() => {
    // Chama a função na montagem inicial e em mudanças de rota
    carregarNomeEscolaCondicionalmente();

    // Adiciona um pequeno atraso para re-verificar o localStorage.
    // Isso é um workaround para a situação onde a mudança acontece na mesma aba
    // e o evento 'storage' não é disparado para a própria janela que iniciou a mudança.
    const timeoutId = setTimeout(() => {
      carregarNomeEscolaCondicionalmente();
    }, 100); // Re-executa após 100ms

    // Ouvinte para mudanças no localStorage de OUTRAS abas/janelas
    const handleStorageChange = (e) => {
      if (e.key === "escolaAtiva" || e.key === "usuarioLogado") {
        carregarNomeEscolaCondicionalmente(); // Recarrega o nome da escola
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Função de limpeza: remove o ouvinte de evento e o timeout ao desmontar o componente
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [carregarNomeEscolaCondicionalmente]); // Dependência: A função memoizada para recarregar

  // Só renderiza o componente se houver um nome de escola para mostrar
  // Se nomeEscola for uma string vazia "", não renderiza nada.
  if (!nomeEscola) {
    return null;
  }

  return (
    <div style={escolaAtualStyles.container}>
      Escola Ativa: <strong>{nomeEscola}</strong>
    </div>
  );
}
