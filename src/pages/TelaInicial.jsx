import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function TelaInicial() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      {/* Luzes de fundo para profundidade */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[700px] z-10"
      >
        {/* CARD DE VIDRO (Igual ao Login e Selecionar Escola) */}
        <div className="bg-white/[0.02] border border-white/10 backdrop-blur-3xl rounded-[48px] p-10 md:p-16 shadow-2xl text-center relative overflow-hidden">
          {/* Brilho superior interno */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

          {/* Logo Centralizada com Glow */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-block mb-8"
          >
            <img
              src="/logo-vivencie.png"
              alt="Logo Vivencie PEI"
              className="h-32 w-auto drop-shadow-[0_0_35px_rgba(59,130,246,0.3)] mx-auto"
            />
          </motion.div>

          {/* Título Monumental */}
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-none mb-6">
            Vivencie <span className="text-blue-500">PEI</span>
          </h1>

          {/* Divisor Minimalista */}
          <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full mb-8 shadow-[0_0_15px_rgba(37,99,235,0.6)]" />

          {/* Subtítulo Acolhedor */}
          <p className="text-slate-400 text-base md:text-lg leading-relaxed font-medium mb-12 max-w-[500px] mx-auto">
            Criada para{" "}
            <span className="text-slate-200">apoiar quem educa</span> e acolher
            quem aprende. Uma gestão humanizada e estratégica para o crescimento
            de cada estudante.
          </p>

          {/* Botão Principal Estilizado */}
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "#2563eb" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/login")}
            className="w-full md:w-auto px-12 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_-12px_rgba(37,99,235,0.5)] transition-all"
          >
            Acessar Sistema
          </motion.button>

          {/* Footer do Card */}
          <div className="mt-12 pt-8 border-t border-white/5">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 italic">
              Exercício 2026 • Gestão Educacional Inclusiva
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
