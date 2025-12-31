import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { getAuth, signOut } from "firebase/auth";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore"; // <--- ADICIONADO collection, query...
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCamera,
  FaUserCircle,
  FaCalendarAlt,
  FaSignOutAlt,
  FaExclamationTriangle,
  FaPlus,
  FaClock,
  FaClipboardList,
  FaLightbulb,
  FaRobot,
  FaLayerGroup,
  FaUsers,
} from "react-icons/fa";

import { verificarPrazosPEI } from "../src/services/peiStatusChecker";
import TrocarEscola from "../components/TrocarEscola";

import "react-toastify/dist/ReactToastify.css";
import "../styles/PainelProfessor.css";

// --- COMPONENTES DE INTERFACE ELITE ---

const TabButton = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`relative px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
      active ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
    }`}
  >
    {label}
    {active && (
      <motion.div
        layoutId="activeTabProf"
        className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] rounded-full"
      />
    )}
  </button>
);

const ActionCard = ({ title, onClick, icon, desc }) => (
  <motion.button
    whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.05)" }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex flex-col items-start p-6 bg-white/[0.02] border border-white/5 rounded-[30px] transition-all group hover:border-blue-500/30 shadow-xl"
  >
    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 mb-4 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <span className="text-[11px] font-black uppercase tracking-widest text-white mb-1">
      {title}
    </span>
    {desc && (
      <span className="text-[9px] text-slate-500 font-bold uppercase">
        {desc}
      </span>
    )}
  </motion.button>
);

export default function PainelProfessor() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [avisosPEI, setAvisosPEI] = useState(null);
  const [carregandoAvisos, setCarregandoAvisos] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("pei");

  const [anoExercicio, setAnoExercicio] = useState(
    localStorage.getItem("anoExercicio") || "2025"
  );

  const handleTrocarAno = (novoAno) => {
    setAnoExercicio(novoAno);
    localStorage.setItem("anoExercicio", novoAno);
    toast.info(`Exercício alterado para ${novoAno}`);
    setTimeout(() => window.location.reload(), 800);
  };

  const carregarDados = useCallback(async () => {
    setCarregandoAvisos(true);
    const userData = localStorage.getItem("usuarioLogado");

    if (!userData) {
      navigate("/login");
      return;
    }
    const currentUser = JSON.parse(userData);
    setUsuarioLogado(currentUser);

    try {
      // 1. Verificar se há escola selecionada
      const escolaId = localStorage.getItem("escolaId");
      const turmasDoProf = currentUser.turmas
        ? Object.keys(currentUser.turmas).map((t) => t.trim().toLowerCase())
        : [];

      if (!escolaId || turmasDoProf.length === 0) {
        // Se não tem escola ou turmas, não há pendências para mostrar
        setAvisosPEI(null);
        return;
      }

      // 2. Verificar se EXISTEM ALUNOS para este professor nesta escola
      // Só mostramos o aviso de atraso se houver alunos para criar PEI
      const qAlunos = query(
        collection(db, "alunos"),
        where("escolaId", "==", escolaId)
      );

      const alunosSnap = await getDocs(qAlunos);

      // Filtra no JS para garantir compatibilidade com as turmas
      const temAlunos = alunosSnap.docs.some((doc) => {
        const dados = doc.data();
        return (
          dados.turma && turmasDoProf.includes(dados.turma.trim().toLowerCase())
        );
      });

      if (!temAlunos) {
        // Se não tem alunos, não mostra aviso nenhum, mesmo que a data esteja atrasada
        console.log("Sem alunos nesta escola. Suprimindo avisos.");
        setAvisosPEI(null);
      } else {
        // Se TEM alunos, aí sim verificamos os prazos
        const status = await verificarPrazosPEI(
          Number(anoExercicio),
          currentUser.id
        );
        setAvisosPEI(status);
      }
    } catch (error) {
      console.error("Erro ao carregar avisos/dados:", error);
    } finally {
      setCarregandoAvisos(false);
    }
  }, [navigate, anoExercicio]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleTrocarFoto = async (event) => {
    const file = event.target.files[0];
    if (!file || !usuarioLogado) return;
    const toastId = toast.loading("Atualizando foto...");
    const uid = usuarioLogado.uid || usuarioLogado.id;
    const storageRef = ref(storage, `fotos-perfil/${uid}`);

    try {
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "usuarios", uid), {
        photoURL,
        fotoUrl: photoURL,
      });

      const usuarioAtualizado = {
        ...usuarioLogado,
        photoURL,
        fotoUrl: photoURL,
      };
      setUsuarioLogado(usuarioAtualizado);
      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioAtualizado));
      toast.update(toastId, {
        render: "Foto atualizada!",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
    } catch (error) {
      toast.update(toastId, {
        render: "Erro no upload",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    }
  };

  const handleSair = async () => {
    await signOut(getAuth());
    localStorage.clear();
    navigate("/login");
  };

  if (!usuarioLogado) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-['Plus_Jakarta_Sans'] relative overflow-hidden flex flex-col">
      <ToastContainer theme="dark" position="bottom-right" />

      {/* GLOWS */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* HEADER ELITE */}
      <header className="z-30 border-b border-white/5 bg-slate-950/40 backdrop-blur-2xl px-10 py-6 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <img
            src="/logo-vivencie.png"
            className="h-14 drop-shadow-2xl"
            alt="Vivencie"
          />
          <div className="flex flex-col">
            <h1 className="brand-main">
              VIVENCIE <span className="brand-accent">PEI</span>
            </h1>
            <div className="dev-panel-badge">
              <span className="dot" /> PAINEL DOCENTE
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-2xl">
            <FaCalendarAlt className="text-blue-500" size={12} />
            <select
              className="bg-transparent border-none text-white text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-4"
              value={anoExercicio}
              onChange={(e) => handleTrocarAno(e.target.value)}
            >
              <option value="2025" className="bg-slate-900">
                Exercício 2025
              </option>
              <option value="2026" className="bg-slate-900">
                Exercício 2026
              </option>
            </select>
          </div>

          <div className="flex items-center gap-4 pl-8 border-l border-white/5">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-white leading-none">
                {usuarioLogado.nome}
              </p>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                Professor(a)
              </p>
            </div>
            <label className="relative cursor-pointer group">
              <div className="w-12 h-12 rounded-2xl border-2 border-blue-500/20 overflow-hidden shadow-2xl bg-slate-800 flex items-center justify-center transition-all group-hover:border-blue-500/50">
                {usuarioLogado.fotoUrl || usuarioLogado.photoURL ? (
                  <img
                    src={usuarioLogado.fotoUrl || usuarioLogado.photoURL}
                    className="w-full h-full object-cover group-hover:opacity-40 transition-opacity"
                    alt="Perfil"
                  />
                ) : (
                  <FaUserCircle className="text-slate-500 text-3xl group-hover:opacity-40" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <FaCamera className="text-white text-xs" />
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleTrocarFoto}
              />
            </label>
          </div>
        </div>
      </header>

      <main className="flex-1 z-10 p-10 max-w-7xl mx-auto w-full">
        <AnimatePresence>
          {/* SÓ RENDERIZA O AVISO SE AVISOSPEI EXISTIR E ESTIVER ATRASADO */}
          {!carregandoAvisos && avisosPEI?.statusGeral === "Atrasado" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-5 bg-red-500/5 border border-red-500/20 rounded-[25px] flex items-center justify-between backdrop-blur-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                  <FaExclamationTriangle />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Pendências Detectadas
                  </h4>
                  <p className="text-[10px] font-bold text-red-500/70 uppercase">
                    Existem prazos de PEI vencidos para o ano {anoExercicio}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/meu-acompanhamento-pei")}
                className="px-6 py-2 bg-red-500 text-white text-[10px] font-black uppercase rounded-xl hover:bg-red-600 transition-colors"
              >
                Verificar Agora
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex border-b border-white/5 mb-10 overflow-x-auto no-scrollbar">
          <TabButton
            active={abaAtiva === "pei"}
            label="Plano de Ensino (PEI)"
            onClick={() => setAbaAtiva("pei")}
          />
          <TabButton
            active={abaAtiva === "avaliacoes"}
            label="Avaliações"
            onClick={() => setAbaAtiva("avaliacoes")}
          />
          <TabButton
            active={abaAtiva === "planejamento"}
            label="Planejamento IA"
            onClick={() => setAbaAtiva("planejamento")}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={abaAtiva}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {abaAtiva === "pei" && (
              <>
                <ActionCard
                  title="Meus Alunos"
                  desc="Listagem da Turma"
                  icon={<FaUsers />}
                  onClick={() => navigate("/ver-alunos")}
                />
                <ActionCard
                  title="Novo PEI"
                  desc="Iniciar documento"
                  icon={<FaPlus />}
                  onClick={() => navigate("/criar-pei")}
                />
                <ActionCard
                  title="Prazos"
                  desc="Cronograma anual"
                  icon={<FaClock />}
                  onClick={() => navigate("/prazos-professor")}
                />
                <ActionCard
                  title="Ver PEIs"
                  desc="Meus documentos"
                  icon={<FaClipboardList />}
                  onClick={() => navigate("/ver-peis")}
                />
              </>
            )}
            {abaAtiva === "avaliacoes" && (
              <>
                <ActionCard
                  title="Iniciais"
                  desc="Diagnóstico aluno"
                  icon={<FaLayerGroup />}
                  onClick={() => navigate("/ver-avaliacoes")}
                />
                <ActionCard
                  title="Interesses"
                  desc="Mapeamento"
                  icon={<FaLightbulb />}
                  onClick={() => navigate("/visualizar-interesses")}
                />
              </>
            )}
            {abaAtiva === "planejamento" && (
              <>
                <ActionCard
                  title="IA Adaptador"
                  desc="Adaptação de conteúdo"
                  icon={<FaRobot />}
                  onClick={() => navigate("/selecionar-aluno-adaptacao")}
                />
                <ActionCard
                  title="Plano DUA"
                  desc="Desenho Universal"
                  icon={<FaClipboardList />}
                  onClick={() => navigate("/criar-plano-dua")}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="z-30 p-8 border-t border-white/5 flex justify-between items-center bg-slate-950/40 backdrop-blur-2xl">
        <TrocarEscola />
        <button
          onClick={handleSair}
          className="group flex items-center gap-3 px-6 py-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-2xl transition-all"
        >
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">
            Sair
          </span>
          <FaSignOutAlt className="text-red-500 group-hover:translate-x-1 transition-transform" />
        </button>
      </footer>
    </div>
  );
}
