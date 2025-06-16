import React, { useEffect, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useLocation } from "react-router-dom";
import { useLocalStorage } from "../hooks/useLocalStorage";

/**
 * Função auxiliar que centraliza a lógica para determinar o ID da escola a ser exibida.
 * @param {object} usuario O objeto do usuário logado.
 * @param {string | null} escolaAtivaStorage O ID da escola ativa vindo do localStorage.
 * @returns {string | null} O ID da escola a ser usado na busca, ou null.
 */
const getEscolaIdParaExibir = (usuario, escolaAtivaStorage) => {
  if (!usuario?.perfil) {
    return null;
  }

  let idEncontrado = null;
  const perfisComVinculoDireto = [
    "aee",
    "professor",
    "diretor",
    "diretor adjunto",
    "orientador pedagógico",
  ];

  // 1. Tenta encontrar um ID de escola diretamente vinculado ao perfil do usuário.
  if (perfisComVinculoDireto.includes(usuario.perfil.toLowerCase())) {
    if (usuario.escolaId) {
      idEncontrado = usuario.escolaId;
    } else if (
      usuario.escolasVinculadas &&
      Object.keys(usuario.escolasVinculadas).length > 0
    ) {
      // Pega a primeira escola da lista como padrão.
      idEncontrado = Object.keys(usuario.escolasVinculadas)[0];
    }
  }

  // 2. Retorna o ID encontrado ou, como fallback, o valor do localStorage.
  //    Isso garante que perfis de vínculo direto possam usar a escola ativa se não tiverem ID próprio,
  //    e que perfis globais (dev, seme, etc.) usem diretamente o valor do localStorage.
  return idEncontrado || escolaAtivaStorage;
};

// Objeto de estilos para o componente.
const escolaAtualStyles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    textAlign: "center",
    padding: "8px",
    fontSize: "14px",
    background: "#f8f9fa",
    color: "#1d3557",
    borderBottom: "1px solid #dee2e6",
    zIndex: 1000,
  },
};

/**
 * Componente que exibe o nome da escola ativa do usuário.
 * A lógica é reativa a mudanças de rota e no localStorage.
 */
export default function EscolaAtual() {
  const [nomeEscola, setNomeEscola] = useState("");
  const location = useLocation();

  // Hooks reativos para ler e sincronizar com o localStorage.
  const [usuarioLogado] = useLocalStorage("usuarioLogado", null);
  const [escolaAtiva, setEscolaAtiva] = useLocalStorage("escolaAtiva", null);

  const carregarNomeEscola = useCallback(async () => {
    const rotasIgnoradas = [
      "/",
      "/login",
      "/recuperar-senha",
      "/cadastro-professor",
      "/cadastro-usuario",
    ];
    if (rotasIgnoradas.includes(location.pathname) || !usuarioLogado) {
      setNomeEscola("");
      return;
    }

    const escolaId = getEscolaIdParaExibir(usuarioLogado, escolaAtiva);

    if (!escolaId) {
      const perfisGlobais = ["desenvolvedor", "seme", "gestao"];
      const msg = perfisGlobais.includes(usuarioLogado.perfil.toLowerCase())
        ? "(Nenhuma escola em visualização)"
        : "Nenhuma escola associada";
      setNomeEscola(msg);
      return;
    }

    try {
      const snap = await getDoc(doc(db, "escolas", escolaId));
      if (snap.exists()) {
        setNomeEscola(snap.data().nome || "Nome da escola não encontrado");
      } else {
        console.warn(
          `[EscolaAtual] Escola com ID ${escolaId} não encontrada no sistema.`
        );
        setNomeEscola("Escola não encontrada");
        // Autocorreção: se o ID inválido for o do localStorage, limpa-o.
        if (escolaId === escolaAtiva) {
          setEscolaAtiva(null);
        }
      }
    } catch (error) {
      console.error(
        "[EscolaAtual] Erro ao buscar dados da escola no Firestore:",
        error
      );
      setNomeEscola("Erro ao carregar dados da escola");
    }
  }, [location.pathname, usuarioLogado, escolaAtiva, setEscolaAtiva]);

  // Efeito que dispara a busca sempre que uma de suas dependências reativas mudar.
  useEffect(() => {
    carregarNomeEscola();
  }, [carregarNomeEscola]);

  // Renderização condicional: não mostra nada se não houver nome de escola.
  if (!nomeEscola) {
    return null;
  }

  return (
    <div style={escolaAtualStyles.container}>
      <strong>Escola Ativa:</strong> {nomeEscola}
    </div>
  );
}
