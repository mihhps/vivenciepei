import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUserEdit,
  FaSearch,
  FaArrowRight,
  FaUserGraduate,
  FaSpinner,
  FaArrowLeft,
  FaIdCard,
  FaLayerGroup,
} from "react-icons/fa";

// Importe seu hook existente
import { useAlunos } from "../hooks/useAlunos";
import "../styles/SelecionarAlunoAdaptacao.css"; // CSS atualizado abaixo

export default function SelecionarAlunoAdaptacao() {
  const navigate = useNavigate();

  // Hook original mantido
  const { alunos = [], carregando, erro } = useAlunos();

  const [searchTerm, setSearchTerm] = useState("");

  const handleNavigateToEstudio = (alunoId) => {
    if (alunoId) navigate(`/adaptar/${alunoId}`);
  };

  // Filtragem Otimizada
  const filteredAlunos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return alunos;

    return alunos.filter(
      (aluno) =>
        aluno.nome?.toLowerCase().includes(term) ||
        aluno.turma?.toLowerCase().includes(term) ||
        aluno.diagnostico?.toLowerCase().includes(term)
    );
  }, [alunos, searchTerm]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-['Plus_Jakarta_Sans'] relative overflow-hidden flex flex-col">
      {/* GLOWS DE FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* HEADER ELITE */}
      <header className="z-30 px-8 py-6 border-b border-white/5 bg-slate-950/40 backdrop-blur-xl flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5 group"
          >
            <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-2">
              <FaUserEdit className="text-blue-500" /> Seleção de Aluno
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Iniciar Adaptação de Conteúdo
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 z-10 p-6 max-w-6xl mx-auto w-full flex flex-col gap-8">
        {/* BARRA DE BUSCA HERO */}
        <div className="relative w-full max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <FaSearch className="text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, turma ou diagnóstico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all shadow-2xl backdrop-blur-md"
            autoFocus
          />
        </div>

        {/* FEEDBACK DE CARREGAMENTO/ERRO */}
        {carregando && (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <FaSpinner className="animate-spin text-3xl text-blue-500 mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Carregando turma...
            </p>
          </div>
        )}

        {erro && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center text-sm font-bold">
            {erro}
          </div>
        )}

        {/* GRID DE CARDS */}
        {!carregando && !erro && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {filteredAlunos.length > 0 ? (
                filteredAlunos.map((aluno, index) => (
                  <AlunoCard
                    key={aluno.id}
                    aluno={aluno}
                    onClick={() => handleNavigateToEstudio(aluno.id)}
                    index={index}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-20">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
                    <FaUserGraduate size={24} />
                  </div>
                  <p className="text-slate-500 font-bold">
                    Nenhum aluno encontrado.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

// SUB-COMPONENTE: CARD DO ALUNO
const AlunoCard = ({ aluno, onClick, index }) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.03)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group flex flex-col items-start w-full text-left p-6 bg-slate-900/40 border border-white/5 rounded-[24px] hover:border-blue-500/30 transition-all shadow-lg backdrop-blur-sm relative overflow-hidden"
    >
      {/* Decorative Gradient */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full group-hover:bg-blue-500/10 transition-colors" />

      <div className="flex items-center gap-4 mb-4 z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-blue-500 font-black text-lg shadow-inner group-hover:scale-110 transition-transform duration-300">
          {aluno.fotoUrl ? (
            <img
              src={aluno.fotoUrl}
              alt={aluno.nome}
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            aluno.nome.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h3 className="text-sm font-bold text-white leading-tight group-hover:text-blue-400 transition-colors">
            {aluno.nome}
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mt-1">
            <FaIdCard className="text-slate-600" />
            {aluno.turma || "Sem Turma"}
          </span>
        </div>
      </div>

      <div className="w-full z-10">
        {aluno.diagnostico ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-[10px] font-bold text-blue-300 uppercase tracking-wide mb-4">
            <FaLayerGroup /> {aluno.diagnostico}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-4">
            Sem Diagnóstico Informado
          </div>
        )}

        <div className="w-full flex items-center justify-between pt-4 border-t border-white/5">
          <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
            Clique para adaptar
          </span>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <FaArrowRight size={10} />
          </div>
        </div>
      </div>
    </motion.button>
  );
};
