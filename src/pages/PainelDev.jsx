import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { getAuth, signOut } from "firebase/auth";
import { db } from "../firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalendarAlt,
  FaSignOutAlt,
  FaCogs,
  FaDatabase,
  FaExclamationTriangle,
  FaUserShield,
  FaCamera,
  FaUserCircle,
} from "react-icons/fa";

// Componentes e Estilos
import "react-toastify/dist/ReactToastify.css";
import "../styles/PainelDev.css"; // ✅ Caminho corrigido para sua pasta styles

// --- COMPONENTES DE INTERFACE ELITE ---

const TabButton = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`relative px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all ${
      active ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
    }`}
  >
    {label}
    {active && (
      <motion.div
        layoutId="activeTabDev"
        className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] rounded-full"
      />
    )}
  </button>
);

const ActionCard = ({ title, onClick, icon, variant = "default" }) => {
  const themes = {
    default:
      "bg-white/[0.02] border-white/5 hover:border-blue-500/40 text-slate-400 hover:text-blue-400",
    warning:
      "bg-amber-500/[0.02] border-amber-500/10 hover:border-amber-500/40 text-amber-500/60 hover:text-amber-500",
    danger:
      "bg-red-500/[0.02] border-red-500/10 hover:border-red-500/40 text-red-500/60 hover:text-red-500",
  };

  return (
    <motion.button
      whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.05)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-8 border rounded-[35px] transition-all group shadow-2xl ${themes[variant]}`}
    >
      <div className="mb-4 transform group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
        {title}
      </span>
    </motion.button>
  );
};

export default function PainelDev() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loadingRecalculo, setLoadingRecalculo] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("avaliacoes");
  const [migrando, setMigrando] = useState(false);

  const [anoExercicio, setAnoExercicio] = useState(
    Number(localStorage.getItem("anoExercicio")) || 2025
  );

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem("usuarioLogado");
    if (usuarioSalvo) {
      setUsuarioLogado(JSON.parse(usuarioSalvo));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // ✅ FUNÇÃO PARA ALTERAR O ANO DO SISTEMA
  const handleTrocarAno = (ano) => {
    setAnoExercicio(ano);
    localStorage.setItem("anoExercicio", ano);
    toast.info(`Sistema alternado para o Exercício ${ano}`);
    setTimeout(() => window.location.reload(), 800);
  };

  // ✅ FUNÇÃO PARA TROCAR A FOTO DE PERFIL
  const handleTrocarFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading("Fazendo upload da nova foto...");

    try {
      const storage = getStorage();
      const storageRef = ref(
        storage,
        `perfis/${usuarioLogado.uid || usuarioLogado.id}`
      );

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Atualiza Firestore
      await updateDoc(
        doc(db, "usuarios", usuarioLogado.uid || usuarioLogado.id),
        {
          fotoUrl: url,
          photoURL: url,
        }
      );

      // Atualiza LocalStorage e State
      const usuarioAtualizado = {
        ...usuarioLogado,
        fotoUrl: url,
        photoURL: url,
      };
      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioAtualizado));
      setUsuarioLogado(usuarioAtualizado);

      toast.update(toastId, {
        render: "Identidade visual atualizada!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      toast.update(toastId, {
        render: "Erro ao subir imagem.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  // --- FERRAMENTAS DE MANUTENÇÃO ---

  const recuperarAlunosPara2025 = async () => {
    if (!window.confirm("Restaurar registros de 2026 para 2025?")) return;
    setMigrando(true);
    try {
      const q = query(collection(db, "alunos"), where("ano", "==", 2026));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { ano: 2025 }));
      await batch.commit();
      toast.success(`${snap.size} registros restaurados!`);
    } catch (e) {
      toast.error("Erro na restauração.");
    } finally {
      setMigrando(false);
    }
  };

  const handleRecalcularTodosPrazos = async () => {
    setLoadingRecalculo(true);
    try {
      const user = getAuth().currentUser;
      const token = await user.getIdToken(true);
      await fetch("https://recalculartodosprazos-hc7r4cnuvq-rj.a.run.app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: { userId: user.uid } }),
      });
      toast.success("Recálculo disparado!");
    } catch (e) {
      toast.error("Falha na comunicação com o servidor.");
    } finally {
      setLoadingRecalculo(false);
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

      {/* EFEITOS DE BRILHO AO FUNDO */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* HEADER: BRANDING VIVENCIE PEI */}
      <header className="z-30 border-b border-white/5 bg-slate-950/40 backdrop-blur-2xl px-10 py-6 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-blue-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000" />
            <img
              src="/logo-vivencie.png"
              className="relative h-14 drop-shadow-2xl"
              alt="Logo"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="brand-main">
              VIVENCIE <span className="brand-accent">PEI</span>
            </h1>
            <div className="dev-panel-badge">
              <span className="dot" /> PAINEL DE ENGENHARIA
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* SELETOR DE EXERCÍCIO */}
          <div className="hidden md:flex items-center gap-3 bg-white/[0.03] border border-white/10 p-3 rounded-2xl">
            <FaCalendarAlt className="text-blue-500" size={14} />
            <select
              className="bg-transparent border-none text-white text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
              value={anoExercicio}
              onChange={(e) => handleTrocarAno(Number(e.target.value))}
            >
              <option value={2025}>Exercício 2025</option>
              <option value={2026}>Exercício 2026</option>
            </select>
          </div>

          {/* PERFIL DO USUÁRIO COM UPLOAD */}
          <div className="flex items-center gap-4 pl-8 border-l border-white/5">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-white leading-none">
                {usuarioLogado.nome}
              </p>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                Dev Root
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
        {/* NAVEGAÇÃO POR ABAS */}
        <div className="flex border-b border-white/5 mb-12 overflow-x-auto no-scrollbar">
          {["avaliacoes", "gestao", "acompanhamento", "admin"].map((tab) => (
            <TabButton
              key={tab}
              active={abaAtiva === tab}
              label={tab === "avaliacoes" ? "Pedagógico" : tab}
              onClick={() => setAbaAtiva(tab)}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={abaAtiva}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {abaAtiva === "avaliacoes" && (
              <>
                <ActionCard
                  title="Avaliação Inicial"
                  onClick={() => navigate("/avaliacao-inicial")}
                  icon={<IconDoc />}
                />
                <ActionCard
                  title="Interesses"
                  onClick={() =>
                    navigate("/nova-avaliacao/Avaliacaointeresses")
                  }
                  icon={<IconHeart />}
                />
                <ActionCard
                  title="Avaliação 0-3"
                  onClick={() => navigate("/nova-avaliacao-0a3")}
                  icon={<IconBaby />}
                />
                <ActionCard
                  title="Criar PEI"
                  onClick={() => navigate("/criar-pei")}
                  icon={<IconPlus />}
                />
                <ActionCard
                  title="PEI 0-3 Anos"
                  onClick={() => navigate("/criar-pei-0a3")}
                  icon={<IconStar />}
                />
                <ActionCard
                  title="Anamnese Completa"
                  onClick={() => navigate("/anamnese-completa")}
                  icon={<IconHistory />}
                />
              </>
            )}

            {abaAtiva === "gestao" && (
              <>
                <ActionCard
                  title="Ver Alunos"
                  onClick={() => navigate("/ver-alunos")}
                  icon={<IconUsers />}
                />
                <ActionCard
                  title="Importar Alunos"
                  onClick={() => navigate("/importar-alunos")}
                  icon={<IconCloud />}
                />
                <ActionCard
                  title="Ver Anamneses"
                  onClick={() => navigate("/anamnese")}
                  icon={<IconSearch />}
                />
                <ActionCard
                  title="Cadastrar Turma"
                  onClick={() => navigate("/cadastro-turmas")}
                  icon={<IconAcademic />}
                />
                <ActionCard
                  title="Vincular Professores"
                  onClick={() => navigate("/vincular-professores")}
                  icon={<IconLink />}
                />
                <ActionCard
                  title="Vincular Escolas"
                  onClick={() => navigate("/vincular-escolas")}
                  icon={<IconSchool />}
                />
              </>
            )}

            {abaAtiva === "acompanhamento" && (
              <>
                <ActionCard
                  title="Escolar"
                  onClick={() => navigate("/acompanhamento")}
                  icon={<IconChart />}
                />
                <ActionCard
                  title="AEE Seleção"
                  onClick={() => navigate("/acompanhamento-aee-selecao")}
                  icon={<IconTarget />}
                />
                <ActionCard
                  title="AEE Gestão"
                  onClick={() => navigate("/acompanhamento-gestao-selecao")}
                  icon={<IconBriefcase />}
                />
              </>
            )}

            {abaAtiva === "admin" && (
              <>
                <ActionCard
                  title="Conferência 2026"
                  onClick={() => navigate("/admin/relatorio-conferencia")}
                  icon={<IconReport />}
                />
                <ActionCard
                  title="Gerenciar Convites"
                  onClick={() => navigate("/admin/convites")}
                  icon={<IconKey />}
                />
                <ActionCard
                  title="Cadastrar Usuário"
                  onClick={() => navigate("/cadastro-usuario")}
                  icon={<IconUserPlus />}
                />
                <ActionCard
                  title="Central de Dados"
                  onClick={() => navigate("/admin/ferramentas-dados")}
                  icon={<IconDatabase />}
                  variant="warning"
                />
                <ActionCard
                  title={
                    loadingRecalculo ? "Calculando..." : "Recalcular Prazos"
                  }
                  variant="warning"
                  onClick={handleRecalcularTodosPrazos}
                  icon={<IconRefresh />}
                />
                <ActionCard
                  title={migrando ? "Processando..." : "Restaurar 2025"}
                  variant="warning"
                  onClick={recuperarAlunosPara2025}
                  icon={<IconTool />}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="z-30 p-8 border-t border-white/5 flex justify-between items-center bg-slate-950/40 backdrop-blur-2xl">
        <div className="flex items-center gap-4 opacity-40">
          <FaUserShield size={14} className="text-blue-500" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
            Ambiente de Engenharia Vivencie PEI
          </span>
        </div>
        <button onClick={handleSair} className="btn-sair-estilizado">
          <FaSignOutAlt /> Sair do Painel
        </button>
      </footer>
    </div>
  );
}

// --- ÍCONES SVG ---
const IconDoc = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconPlus = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 4v16m8-8H4"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconUsers = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconDatabase = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconRefresh = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconTool = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="3"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconHeart = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconBaby = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconStar = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconHistory = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconCloud = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconSearch = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconAcademic = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconLink = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconSchool = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconChart = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconTarget = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M13 10V3L4 14h7v7l9-11h-7z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconBriefcase = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconReport = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconKey = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconUserPlus = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
