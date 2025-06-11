// src/components/EscolaAtual.jsx
import React, { useEffect, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // Verifique o caminho
import { useLocation } from "react-router-dom";

// Função utilitária para obter dados do localStorage de forma segura
const getLocalStorageSafe = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined || item === "undefined") {
      return defaultValue;
    }
    // O JSON.parse é importante se você está salvando objetos/arrays no localStorage
    // Se você salva apenas o ID da escola como string, JSON.parse não é estritamente necessário para o ID,
    // mas é bom para consistência se outros itens forem objetos.
    return JSON.parse(item);
  } catch (error) {
    console.error(
      `Erro ao parsear ${key} do localStorage em EscolaAtual:`,
      error
    );
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
      "/", // Rota inicial/pública
      "/login",
      "/recuperar-senha",
      "/cadastro-professor",
      // Adicione outras rotas onde o cabeçalho não deve aparecer
    ];

    if (rotasIgnoradas.includes(location.pathname)) {
      setNomeEscola(""); // Limpa o nome da escola nessas páginas
      return;
    }

    // 2. Verificar se há um usuário logado e se o perfil está autorizado a ter uma "escola ativa"
    const usuario = getLocalStorageSafe("usuarioLogado");

    // === MUDANÇA: Incluindo "gestao" na lista de perfis autorizados ===
    const perfisComEscolaAtiva = [
      "professor",
      "aee",
      "diretor",
      "diretor adjunto",
      "orientador pedagógico",
      "gestao", // Adicionado o perfil 'gestao'
      "desenvolvedor", // Adicionado o perfil 'desenvolvedor'
      "seme", // Adicionado o perfil 'seme', se aplicável
    ];

    if (
      !usuario ||
      !perfisComEscolaAtiva.includes(usuario.perfil?.toLowerCase())
    ) {
      setNomeEscola(""); // Limpa se o usuário não for relevante ou não estiver logado
      return;
    }

    // 3. Obter o ID da escola ativa/visualizada do localStorage
    // Este ID DEVE ser salvo em outro lugar (ex: VerAlunos.jsx) após o usuário interagir
    const escolaAtivaIdRaw = localStorage.getItem("escolaAtiva");
    let escolaAtivaId = null;
    if (escolaAtivaIdRaw) {
      try {
        escolaAtivaId = JSON.parse(escolaAtivaIdRaw); // Se você salvar o ID como string direto, remova JSON.parse
      } catch (e) {
        console.error("Erro ao parsear escolaAtiva do localStorage:", e);
        localStorage.removeItem("escolaAtiva"); // Remove item corrompido
        setNomeEscola("");
        return;
      }
    }

    // Se não há um ID de escola ativa no localStorage
    if (!escolaAtivaId) {
      // Para perfis como AEE ou Professor que têm múltiplos vínculos,
      // você pode querer tentar pegar a primeira escola vinculada ao invés de "Nenhuma escola selecionada"
      // ou deixar que o componente que define a escola ativa cuide disso.
      // Por simplicidade, se nada estiver no localStorage, mostra "Nenhuma escola selecionada".
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
        setNomeEscola("Escola não encontrada no sistema");
        console.warn(
          `Escola com ID ${escolaAtivaId} não encontrada no Firestore.`
        );
      }
    } catch (error) {
      console.error("Erro ao buscar dados da escola ativa:", error);
      setNomeEscola("Erro ao carregar dados da escola");
    }
  }, [location.pathname]); // Dependência: re-executa o efeito quando a rota muda

  // Efeito para carregar o nome da escola na montagem e quando o localStorage muda
  useEffect(() => {
    carregarNomeEscolaCondicionalmente(); // Chama a função na montagem

    // Ouvinte para mudanças no localStorage (útil para logout/login em outra aba ou quando outro componente salva)
    const handleStorageChange = (e) => {
      // Verifica se a chave 'escolaAtiva' ou 'usuarioLogado' mudou
      if (e.key === "escolaAtiva" || e.key === "usuarioLogado") {
        carregarNomeEscolaCondicionalmente(); // Recarrega o nome da escola
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Função de limpeza: remove o ouvinte de evento ao desmontar o componente
    return () => {
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
