import React, { useState, useMemo } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  query,
  where,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import { PERFIS } from "../config/constants";

// Componentes Reutilizáveis
import BotaoVoltar from "../components/BotaoVoltar";
import "react-toastify/dist/ReactToastify.css";

const OPCOES_DISCIPLINAS = [
  "Professor Regente",
  "AEE",
  "Língua Portuguesa",
  "Matemática",
  "História",
  "Geografia",
  "Ciências",
  "Arte",
  "Educação Física",
  "Inglês",
  "Ensino Religioso",
  "Contação de Histórias",
  "Comunicação e Linguagem",
  "Suporte Pedagógico",
  "Sala de Recurso",
];

export default function CadastrarProfessor() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [disciplinas, setDisciplinas] = useState([]);
  const [codigoConvite, setCodigoConvite] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();
  const anoAtivo = useMemo(
    () => Number(localStorage.getItem("anoExercicio")) || 2025,
    []
  );

  const toggleDisciplina = (disc) => {
    setDisciplinas((prev) =>
      prev.includes(disc) ? prev.filter((i) => i !== disc) : [...prev, disc]
    );
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    if (
      !nome ||
      !email ||
      !senha ||
      disciplinas.length === 0 ||
      !codigoConvite
    ) {
      toast.warn("Por favor, preencha todos os campos.");
      return;
    }
    setLoading(true);

    try {
      const q = query(
        collection(db, "convites"),
        where("codigo", "==", codigoConvite.trim().toUpperCase()),
        where("expirado", "==", false)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast.error("Código de acesso inválido ou já utilizado.");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );
      const batch = writeBatch(db);
      batch.update(doc(db, "convites", querySnapshot.docs[0].id), {
        expirado: true,
        dataUso: new Date().toISOString(),
        utilizadoPor: userCredential.user.uid,
      });

      batch.set(doc(db, "usuarios", userCredential.user.uid), {
        uid: userCredential.user.uid,
        nome: nome.trim(),
        email: email.trim(),
        disciplinas,
        perfil: PERFIS.PROFESSOR,
        anoCadastro: anoAtivo,
        escolas: {},
        dataCadastro: new Date().toISOString(),
      });

      await batch.commit();
      toast.success("Cadastro realizado com sucesso!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      toast.error("Erro ao realizar o cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <ToastContainer theme="dark" position="bottom-right" />

      {/* Background Decorativo - Glows Mais Intensos */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl z-10"
      >
        <div className="bg-white/[0.03] border border-white/15 backdrop-blur-3xl rounded-[40px] p-10 shadow-2xl relative">
          <header className="text-center mb-10">
            <div className="absolute top-10 left-8">
              <BotaoVoltar />
            </div>
            <img
              src="/logo-vivencie.png"
              className="h-16 mx-auto mb-4 drop-shadow-2xl"
              alt="Logo"
            />
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">
              Criar Perfil
            </h2>
            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
              Acesso Exclusivo para Docentes
            </p>
          </header>

          <form onSubmit={handleCadastro} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 ml-1">
                Código de Convite
              </label>
              <input
                type="text"
                required
                value={codigoConvite}
                onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                placeholder="Ex: XXXX-XXXX"
                className="w-full bg-blue-500/10 border border-blue-500/30 rounded-2xl px-6 py-4 text-white placeholder:text-blue-200/40 focus:outline-none focus:border-blue-400 transition-all font-mono text-center tracking-widest"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-200 ml-1">
                  Nome
                </label>
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-400 focus:border-blue-400 outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-200 ml-1">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="E-mail Profissional"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-400 focus:border-blue-400 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200 ml-1">
                Áreas de Atuação
              </label>
              <div
                onClick={() => setIsModalOpen(true)}
                className="w-full min-h-[55px] bg-white/5 border border-white/15 rounded-2xl px-5 py-3 text-white cursor-pointer hover:border-blue-400 transition-all flex flex-wrap gap-2 items-center"
              >
                {disciplinas.length === 0 ? (
                  <span className="text-slate-300 text-sm">
                    Toque para selecionar as disciplinas...
                  </span>
                ) : (
                  disciplinas.map((d) => (
                    <span
                      key={d}
                      className="bg-blue-600/40 text-blue-50 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-blue-300/50"
                    >
                      {d}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-200 ml-1">
                Senha
              </label>
              <input
                type="password"
                placeholder="Mínimo 6 dígitos"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-400 focus:border-blue-400 outline-none transition-all"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs mt-4"
            >
              {loading ? "Processando..." : "Finalizar Cadastro"}
            </motion.button>
          </form>
        </div>
      </motion.div>

      {/* --- MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f172a] border border-white/20 w-full max-w-lg rounded-[40px] p-10 shadow-3xl relative z-10"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 p-2 rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">
                Disciplinas
              </h3>
              <p className="text-slate-200 text-[10px] mb-8 font-bold uppercase tracking-[0.25em]">
                Selecione suas áreas de atuação
              </p>
              <div className="max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                <div className="flex flex-wrap gap-2.5">
                  {OPCOES_DISCIPLINAS.map((disc) => (
                    <button
                      key={disc}
                      type="button"
                      onClick={() => toggleDisciplina(disc)}
                      className={`px-5 py-3 rounded-2xl text-[11px] font-bold transition-all border ${
                        disciplinas.includes(disc)
                          ? "bg-blue-600 border-blue-300 text-white shadow-lg"
                          : "bg-white/5 border-white/10 text-slate-100 hover:border-white/30"
                      }`}
                    >
                      {disc}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full mt-10 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]"
              >
                Confirmar ({disciplinas.length})
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
