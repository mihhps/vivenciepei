import React, { useEffect, useState, useCallback, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useLocation } from "react-router-dom";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { motion, AnimatePresence } from "framer-motion";
import { FaSchool } from "react-icons/fa";

// Função auxiliar movida para fora ou envolvida em tratamento de string
const getEscolaIdParaExibir = (usuario, escolaAtivaStorage) => {
  if (!usuario?.perfil) return null;

  // 🔥 Normalização: remove aspas extras e espaços
  const perfilLimpo = usuario.perfil.replace(/['"]+/g, "").toLowerCase().trim();

  // Se o usuário selecionou uma escola manualmente, ela tem prioridade
  if (escolaAtivaStorage && typeof escolaAtivaStorage === "string") {
    return escolaAtivaStorage.replace(/['"]+/g, ""); // Garante ID limpo
  }

  let idPadrao = null;
  const perfisComVinculoDireto = [
    "aee",
    "professor",
    "diretor",
    "diretor adjunto",
    "orientador pedagógico",
  ];

  if (perfisComVinculoDireto.includes(perfilLimpo)) {
    if (usuario.escolas && Object.keys(usuario.escolas).length > 0) {
      // Pega a primeira escola vinculada ao perfil
      idPadrao = Object.keys(usuario.escolas)[0];
    }
  }
  return idPadrao;
};

export default function EscolaAtual() {
  const [nomeEscola, setNomeEscola] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  // Hooks de LocalStorage
  const [usuarioLogado] = useLocalStorage("usuarioLogado", null);
  const [escolaAtiva] = useLocalStorage("escolaAtiva", null);

  const carregarNomeEscola = useCallback(async () => {
    const rotasIgnoradas = [
      "/",
      "/login",
      "/selecionar-escola",
      "/recuperar-senha",
      "/cadastro-professor",
      "/cadastro-usuario",
    ];

    // Se estiver em rota ignorada ou sem usuário, limpa e sai
    if (rotasIgnoradas.includes(location.pathname) || !usuarioLogado) {
      setNomeEscola("");
      return;
    }

    const escolaId = getEscolaIdParaExibir(usuarioLogado, escolaAtiva);

    // Tratamento para Perfis Globais (SEM unidade selecionada)
    if (!escolaId) {
      const perfilLimpo = usuarioLogado.perfil
        ?.replace(/['"]+/g, "")
        .toLowerCase()
        .trim();
      const perfisGlobais = ["desenvolvedor", "seme", "gestao"];

      if (perfisGlobais.includes(perfilLimpo)) {
        setNomeEscola("Visualização Global");
      } else {
        setNomeEscola("");
      }
      return;
    }

    try {
      setIsLoading(true);
      const snap = await getDoc(doc(db, "escolas", escolaId));
      if (snap.exists()) {
        setNomeEscola(snap.data().nome);
      } else {
        setNomeEscola("Unidade não localizada");
      }
    } catch (error) {
      console.error("Erro ao buscar nome da escola:", error);
      setNomeEscola("Erro de conexão");
    } finally {
      setIsLoading(false);
    }
  }, [location.pathname, usuarioLogado, escolaAtiva]);

  useEffect(() => {
    carregarNomeEscola();
  }, [carregarNomeEscola]);

  // Se não houver nome para exibir, não renderiza nada
  if (!nomeEscola) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={nomeEscola} // 🔥 Força re-animação quando o nome muda
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 w-full z-[9999] flex justify-center pointer-events-none"
      >
        <div className="mt-2 bg-slate-900/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-2xl pointer-events-auto">
          <FaSchool className="text-blue-500 text-xs" />

          <div className="flex flex-col">
            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none mb-1">
              Unidade Ativa
            </span>
            <span className="text-[10px] font-bold text-white uppercase tracking-tight leading-none">
              {isLoading ? (
                <span className="animate-pulse text-blue-400">
                  Sincronizando...
                </span>
              ) : (
                nomeEscola
              )}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
