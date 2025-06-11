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
    return JSON.parse(item); // Assume que o valor é um JSON string
  } catch (error) {
    console.error(
      `ESCOLAATUAL DEBUG: Erro ao parsear ${key} do localStorage:`,
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
    console.log(
      "ESCOLAATUAL DEBUG: Iniciando carregarNomeEscolaCondicionalmente. Path:",
      location.pathname
    );

    // 1. Definir rotas onde o nome da escola NÃO deve aparecer (ex: login, cadastro)
    const rotasIgnoradas = [
      "/",
      "/login",
      "/recuperar-senha",
      "/cadastro-professor",
      // Adicione outras rotas onde o cabeçalho não deve aparecer
    ];

    if (rotasIgnoradas.includes(location.pathname)) {
      console.log("ESCOLAATUAL DEBUG: Rota ignorada. Limpando nome da escola.");
      setNomeEscola("");
      return;
    }

    // 2. Verificar se há um usuário logado e se o perfil está autorizado a ter uma "escola ativa"
    const usuario = getLocalStorageSafe("usuarioLogado");
    console.log(
      "ESCOLAATUAL DEBUG: Usuário logado lido do localStorage:",
      usuario
    );

    // === MUDANÇA CRÍTICA: Incluindo "gestao", "desenvolvedor", "seme" na lista de perfis autorizados ===
    const perfisComEscolaAtiva = [
      "professor",
      "aee",
      "diretor",
      "diretor adjunto",
      "orientador pedagógico",
      "gestao", // Adicionado
      "desenvolvedor", // Adicionado
      "seme", // Adicionado
    ];
    console.log(
      "ESCOLAATUAL DEBUG: Perfis autorizados a exibir escola ativa:",
      perfisComEscolaAtiva
    );

    if (
      !usuario ||
      !perfisComEscolaAtiva.includes(usuario.perfil?.toLowerCase())
    ) {
      console.log(
        "ESCOLAATUAL DEBUG: Perfil não autorizado ou usuário não logado. Limpando nome da escola."
      );
      setNomeEscola("");
      return;
    }
    console.log(
      "ESCOLAATUAL DEBUG: Perfil autorizado detectado:",
      usuario.perfil
    );

    // 3. Obter o ID da escola ativa/visualizada do localStorage
    const escolaAtivaIdRaw = localStorage.getItem("escolaAtiva");
    let escolaAtivaId = null;
    console.log(
      "ESCOLAATUAL DEBUG: Valor bruto de 'escolaAtiva' no localStorage:",
      escolaAtivaIdRaw
    );

    if (escolaAtivaIdRaw) {
      try {
        escolaAtivaId = JSON.parse(escolaAtivaIdRaw);
        console.log(
          "ESCOLAATUAL DEBUG: 'escolaAtiva' parseada:",
          escolaAtivaId
        );
      } catch (e) {
        console.error(
          "ESCOLAATUAL DEBUG: Erro ao parsear 'escolaAtiva' do localStorage:",
          e
        );
        localStorage.removeItem("escolaAtiva"); // Remove item corrompido
        setNomeEscola("");
        return;
      }
    }

    // Se não há um ID de escola ativa válido no localStorage
    if (!escolaAtivaId) {
      console.log(
        "ESCOLAATUAL DEBUG: Nenhuma 'escolaAtiva' válida encontrada no localStorage."
      );
      setNomeEscola("Nenhuma escola selecionada"); // Ou apenas ""
      return;
    }
    console.log(
      "ESCOLAATUAL DEBUG: 'escolaAtivaId' a ser buscada no Firestore:",
      escolaAtivaId
    );

    // 4. Buscar o nome da escola no Firestore usando o ID
    try {
      const ref = doc(db, "escolas", escolaAtivaId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const dados = snap.data();
        setNomeEscola(dados.nome || "Escola desconhecida");
        console.log(
          "ESCOLAATUAL DEBUG: Nome da escola carregado do Firestore:",
          dados.nome
        );
      } else {
        setNomeEscola("Escola não encontrada no sistema");
        console.warn(
          `ESCOLAATUAL DEBUG: Escola com ID ${escolaAtivaId} não encontrada no Firestore.`
        );
      }
    } catch (error) {
      console.error(
        "ESCOLAATUAL DEBUG: Erro ao buscar dados da escola ativa no Firestore:",
        error
      );
      setNomeEscola("Erro ao carregar dados da escola");
    }
  }, [location.pathname]); // Dependência: re-executa o efeito quando a rota muda

  // Efeito para carregar o nome da escola na montagem e quando o localStorage muda
  useEffect(() => {
    carregarNomeEscolaCondicionalmente(); // Chama a função na montagem

    // Ouvinte para mudanças no localStorage (útil para logout/login em outra aba ou quando outro componente salva)
    const handleStorageChange = (e) => {
      console.log("ESCOLAATUAL DEBUG: Evento 'storage' detectado:", e.key);
      if (e.key === "escolaAtiva" || e.key === "usuarioLogado") {
        carregarNomeEscolaCondicionalmente(); // Recarrega o nome da escola
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Função de limpeza: remove o ouvinte de evento ao desmontar o componente
    return () => {
      console.log("ESCOLAATUAL DEBUG: Removendo ouvinte de 'storage'.");
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [carregarNomeEscolaCondicionalmente]); // Dependência: A função memoizada para recarregar

  // Só renderiza o componente se houver um nome de escola para mostrar
  // Se nomeEscola for uma string vazia "", não renderiza nada.
  if (!nomeEscola) {
    console.log("ESCOLAATUAL DEBUG: nomeEscola está vazio, retornando null.");
    return null;
  }

  return (
    <div style={escolaAtualStyles.container}>
      Escola Ativa: <strong>{nomeEscola}</strong>
    </div>
  );
}
