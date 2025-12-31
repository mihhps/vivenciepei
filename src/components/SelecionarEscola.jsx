import React, { useEffect, useState, useMemo } from "react";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

// --- COMPONENTES DE INTERFACE ---
const SchoolIcon = () => (
  <svg
    className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const SkeletonItem = () => (
  <div className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
  </div>
);

export default function SelecionarEscola() {
  const [escolas, setEscolas] = useState([]);
  const [status, setStatus] = useState("loading");
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  const saudacao = useMemo(() => {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ LIMPEZA ESTRATÉGICA: Ao entrar aqui, o sistema "esquece" a escola anterior
        localStorage.removeItem("escolaAtiva");
        localStorage.removeItem("escolaId");

        const userStored = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!userStored?.uid) return navigate("/login");

        const userRef = doc(db, "usuarios", userStored.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserName(data.nome || "Professor");

          const escolasMap = data.escolas || {};
          const idsDasEscolas = Object.keys(escolasMap);

          if (idsDasEscolas.length === 0) {
            setStatus("empty");
            return;
          }

          const promessas = idsDasEscolas.map((id) =>
            getDoc(doc(db, "escolas", id))
          );
          const resultados = await Promise.all(promessas);

          const listaFinal = resultados
            .filter((s) => s.exists())
            .map((s) => ({ id: s.id, ...s.data() }));

          setEscolas(listaFinal);
          setStatus(listaFinal.length > 0 ? "success" : "empty");
        } else {
          setStatus("empty");
        }
      } catch (err) {
        setStatus("error");
      }
    };
    fetchData();
  }, [navigate]);

  // ✅ CORREÇÃO CRÍTICA NA SELEÇÃO
  const onSelect = (escola) => {
    // 1. Salva APENAS O ID (String). O Hook espera uma string, não um objeto JSON.
    localStorage.setItem("escolaAtiva", escola.id);
    localStorage.setItem("escolaId", escola.id);

    toast.success(`Acessando ${escola.nome}...`);

    // 2. Redireciona e força um reset de estado
    navigate("/painel-professor");

    // 3. ✅ O RELOAD É OBRIGATÓRIO AQUI:
    // Ele limpa o cache do React e garante que o Firebase busque alunos APENAS da nova escola.
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <header className="text-center mb-12">
          <img
            src="/logo-vivencie.png"
            className="h-20 mx-auto mb-8 drop-shadow-2xl"
            alt="Vivencie PEI"
          />
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {saudacao},{" "}
            <span className="text-blue-500">{userName.split(" ")[0]}</span>
          </h2>
          <p className="text-slate-500 mt-2 font-medium italic">
            Onde você vai atuar hoje?
          </p>
        </header>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {status === "loading" ? (
              <motion.div key="skeleton" className="space-y-4">
                <SkeletonItem />
                <SkeletonItem />
              </motion.div>
            ) : status === "success" ? (
              <motion.div key="list" className="space-y-4">
                {escolas.map((escola) => (
                  <motion.button
                    key={escola.id}
                    whileHover={{
                      scale: 1.02,
                      backgroundColor: "rgba(255,255,255,0.04)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(escola)}
                    className="w-full group flex items-center p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-blue-500/40 transition-all shadow-2xl text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center mr-5 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all">
                      <SchoolIcon />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors leading-tight">
                        {escola.nome || "Unidade Escolar"}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">
                        Clique para acessar
                      </p>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <div className="text-center p-12 rounded-3xl border border-dashed border-white/10">
                <p className="text-slate-500 text-sm mb-6">
                  Nenhuma unidade vinculada encontrada.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="text-blue-500 font-bold uppercase text-xs tracking-widest"
                >
                  Voltar ao Login
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
