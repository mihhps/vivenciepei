import React, { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaDatabase,
  FaRocket,
  FaUndo,
  FaChalkboardTeacher,
  FaExclamationTriangle,
  FaArrowLeft,
  FaCogs,
  FaUserShield,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// Componentes Reutilizáveis
import BotaoVoltar from "../components/BotaoVoltar";
import "react-toastify/dist/ReactToastify.css";

// --- MOTOR DE PROGRESSÃO DE SÉRIE ---
const sugerirProximaTurma = (turmaAtual) => {
  if (!turmaAtual) return "";
  let t = turmaAtual.trim();
  // Infantil
  if (t.toUpperCase().includes("PRÉ I") && !t.toUpperCase().includes("PRÉ II"))
    return t.replace(/Pré\s*I/i, "Pré II");
  if (t.toUpperCase().includes("PRÉ II"))
    return t.replace(/Pré\s*II/i, "1º Ano");
  // Fundamental/Médio
  const match = t.match(/(\d+)º/);
  if (match) {
    const numeroAtual = parseInt(match[1]);
    if (numeroAtual === 9) return t.replace("9º Ano", "1º Ano E.M.");
    return t.replace(`${numeroAtual}º`, `${numeroAtual + 1}º`);
  }
  return t;
};

// --- COMPONENTE DE CARD DE FERRAMENTA ---
const ToolCard = ({ title, desc, icon, action, variant = "blue", loading }) => {
  const themes = {
    blue: "border-blue-500/20 hover:border-blue-500/50 text-blue-400 bg-blue-600",
    amber:
      "border-amber-500/20 hover:border-amber-500/50 text-amber-400 bg-amber-600",
    red: "border-red-500/20 hover:border-red-500/50 text-red-400 bg-red-600",
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`bg-white/[0.02] border backdrop-blur-3xl p-8 rounded-[40px] flex flex-col h-full transition-all ${
        themes[variant].split(" bg-")[0]
      }`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-white/5 ${
          themes[variant].split(" ")[2]
        }`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-black text-white mb-3 uppercase italic tracking-tighter">
        {title}
      </h3>
      <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-8 flex-1">
        {desc}
      </p>
      <button
        onClick={action}
        disabled={loading}
        className={`w-full py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:brightness-110 disabled:opacity-50 ${
          themes[variant].split(" bg-")[3]
        }`}
      >
        {loading ? "Processando..." : "Executar Operação"}
      </button>
    </motion.div>
  );
};

export default function FerramentasDados() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Configuração de Anos
  const ANO_ATUAL = 2025;
  const PROXIMO_ANO = 2026;

  // 1. Extrair Turmas dos Alunos (Corrige falta de turmas na escola)
  const extrairTurmas = async () => {
    const escolaId = prompt("Digite o ID da Escola para extrair as turmas:");
    if (!escolaId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "alunos"),
        where("escolaId", "==", escolaId),
        where("ano", "==", ANO_ATUAL)
      );
      const snap = await getDocs(q);
      const turmas = new Set();
      snap.docs.forEach((d) => {
        if (d.data().turma) turmas.add(d.data().turma.trim().toUpperCase());
      });

      const batch = writeBatch(db);
      turmas.forEach((nome) => {
        const ref = doc(collection(db, "escolas", escolaId, "turmas"));
        batch.set(ref, {
          nome,
          turno: "Matutino",
          ano: ANO_ATUAL,
          criadoEm: serverTimestamp(),
        });
      });
      await batch.commit();
      toast.success(`${turmas.size} turmas criadas com sucesso!`);
    } catch (e) {
      toast.error("Erro na extração de turmas.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Migração de Alunos (Cria CÓPIAS para 2026 com Avanço de Série)
  const migrarAlunos = async () => {
    const escolaId = prompt("Digite o ID da Escola para Migrar os Alunos:");
    if (!escolaId) return;
    if (
      !window.confirm(
        `Isso criará cópias de todos os alunos de ${ANO_ATUAL} para ${PROXIMO_ANO}. Confirmar?`
      )
    )
      return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "alunos"),
        where("escolaId", "==", escolaId),
        where("ano", "==", ANO_ATUAL)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);

      snap.docs.forEach((alunoDoc) => {
        const data = alunoDoc.data();
        const novaRef = doc(collection(db, "alunos"));
        batch.set(novaRef, {
          ...data,
          ano: PROXIMO_ANO,
          turma: sugerirProximaTurma(data.turma),
          dataMigracao: new Date().toISOString(),
          idReferenciaAnterior: alunoDoc.id,
        });
      });

      await batch.commit();
      toast.success(
        `${snap.size} alunos duplicados e promovidos para ${PROXIMO_ANO}!`
      );
    } catch (e) {
      toast.error("Erro na migração de alunos.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Migração de Professores (Atualiza anoAtivo para 2026)
  const migrarProfessores = async () => {
    if (
      !window.confirm(
        `Habilitar todos os professores ativos de ${ANO_ATUAL} para trabalharem em ${PROXIMO_ANO}?`
      )
    )
      return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "usuarios"),
        where("anoAtivo", "==", ANO_ATUAL)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);

      snap.docs.forEach((profDoc) => {
        batch.update(profDoc.ref, {
          anoAtivo: PROXIMO_ANO,
          [`turmas_${PROXIMO_ANO}`]: {}, // Inicializa o objeto de turmas do novo ano
        });
      });

      await batch.commit();
      toast.success(
        `${snap.size} profissionais habilitados para o ano ${PROXIMO_ANO}!`
      );
    } catch (e) {
      toast.error("Erro na migração de professores.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Restauração (Move de volta para 2025)
  const restaurar2025 = async () => {
    if (
      !window.confirm(
        "Atenção: Isso moverá TODOS os registros de 2026 de volta para 2025. Confirmar restauração?"
      )
    )
      return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "alunos"),
        where("ano", "==", PROXIMO_ANO)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { ano: ANO_ATUAL }));
      await batch.commit();
      toast.success("Registros restaurados para 2025!");
    } catch (e) {
      toast.error("Erro na restauração.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-8 md:p-16 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      <ToastContainer theme="dark" position="bottom-right" />

      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[700px] h-[700px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-16 flex items-center gap-8">
          <BotaoVoltar />
          <div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
              Engenharia de{" "}
              <span className="text-blue-500 text-glow">Dados</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">
              Central de Migrações e Manutenção do Ecossistema
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ToolCard
            title="Extrair Turmas"
            desc="Varre os alunos de uma escola e cria automaticamente as turmas no banco de dados."
            icon={<FaDatabase size={24} />}
            action={extrairTurmas}
            loading={loading}
          />

          <ToolCard
            title="Migrar Alunos"
            desc="Cria cópias dos alunos para 2026, avançando automaticamente a série escolar."
            variant="amber"
            icon={<FaRocket size={24} />}
            action={migrarAlunos}
            loading={loading}
          />

          <ToolCard
            title="Migrar Professores"
            desc="Habilita os profissionais para atuarem no próximo ano letivo, preservando histórico."
            variant="blue"
            icon={<FaChalkboardTeacher size={24} />}
            action={migrarProfessores}
            loading={loading}
          />

          <ToolCard
            title="Restaurar 2025"
            desc="Ação de reversão: move registros acidentalmente migrados de volta para o ano anterior."
            variant="red"
            icon={<FaUndo size={24} />}
            action={restaurar2025}
            loading={loading}
          />
        </div>

        <footer className="mt-24 p-12 border-t border-white/5 bg-white/[0.01] rounded-[50px] text-center">
          <div className="flex items-center justify-center gap-3 text-red-500 mb-6">
            <FaExclamationTriangle size={18} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">
              Protocolo de Segurança Ativo
            </span>
          </div>
          <p className="text-slate-500 text-[11px] font-medium max-w-2xl mx-auto leading-relaxed uppercase tracking-wider">
            Atenção: Estas ferramentas realizam escritas em massa no Firestore.
            Verifique as constantes de ano e IDs de escola antes de prosseguir.
            A duplicação de registros de alunos garante a integridade do
            histórico escolar anual.
          </p>
          <div className="mt-8 flex justify-center gap-4 opacity-30">
            <FaUserShield size={20} />
            <FaCogs size={20} />
          </div>
        </footer>
      </div>
    </div>
  );
}
