import React from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa";

export default function BotaoVoltar({ destino, texto = "Voltar" }) {
  const navigate = useNavigate();

  const handleVoltar = () => {
    try {
      // 1. Recupera o usuário para saber o "lar" dele
      const usuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
      const perfil = (usuario.perfil || "").toLowerCase().trim();

      const painelMap = {
        desenvolvedor: "/painel-dev",
        gestão: "/painel-gestao",
        gestao: "/painel-gestao",
        diretor: "/painel-gestao",
        diretor_adjunto: "/painel-gestao",
        orientador_pedagogico: "/painel-gestao",
        seme: "/painel-seme",
        aee: "/painel-aee",
        professor: "/painel-professor",
      };

      const meuPainelHome = painelMap[perfil] || "/";

      // ----------------------------------------------------------------------
      // LÓGICA DE NAVEGAÇÃO INTELIGENTE
      // ----------------------------------------------------------------------

      // Se eu passei um destino via prop (ex: "/outra-pagina"), eu vou para ele.
      if (destino) {
        navigate(destino);
        return;
      }

      // Se eu NÃO passei destino, mas tenho histórico, eu volto uma página.
      if (window.history.length > 2) {
        navigate(-1);
      } else {
        // Se cair direto na página (sem histórico), vai para o MEU painel correto.
        navigate(meuPainelHome);
      }
    } catch (error) {
      console.error("Falha na navegação:", error);
      navigate("/");
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05, x: -4 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleVoltar}
      className="flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-slate-200 hover:text-white hover:bg-white/10 hover:border-blue-500/50 transition-all group backdrop-blur-md shadow-xl"
      aria-label={texto}
    >
      <FaArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1 text-blue-400" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
        {texto}
      </span>
    </motion.button>
  );
}

BotaoVoltar.propTypes = {
  destino: PropTypes.string,
  texto: PropTypes.string,
};
