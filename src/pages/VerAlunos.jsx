import React, { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import {
  FaTrashAlt,
  FaPlus,
  FaSearch,
  FaRocket,
  FaArrowLeft,
  FaSchool,
} from "react-icons/fa";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useUserSchool } from "../hooks/useUserSchool";

import "react-toastify/dist/ReactToastify.css";
import "../styles/VerAlunos.css";

// --- FUNÇÕES AUXILIARES ---
const sugerirProximaTurma = (turmaAtual) => {
  if (!turmaAtual) return "";
  let t = turmaAtual.trim();
  const match = t.match(/(\d+)º/);
  if (match) {
    const numeroAtual = parseInt(match[1]);
    const proximoNumero = numeroAtual + 1;
    if (numeroAtual === 9) return t.replace("9º Ano", "1º Ano E.M.");
    return t.replace(`${numeroAtual}º`, `${proximoNumero}º`);
  }
  return t;
};

const ANO_ATUAL = 2025;
const ANO_PROXIMO = 2026;

export default function VerAlunos() {
  const navigate = useNavigate();
  // Hook que traz os dados do usuário (incluindo a escola padrão)
  const { userSchoolId, isLoadingUserSchool, canViewAllSchools } =
    useUserSchool();

  // --- ESTADOS ---
  const [alunos, setAlunos] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [processandoMigracao, setProcessandoMigracao] = useState(false);
  const [mostrarModalMigracao, setMostrarModalMigracao] = useState(false);
  const [alunosAnterior, setAlunosAnterior] = useState([]);
  const [selecionados, setSelecionados] = useState([]);

  // 1. Carregar lista de escolas (para exibir o nome correto no cabeçalho)
  useEffect(() => {
    const carregarEscolas = async () => {
      try {
        const eSnap = await getDocs(collection(db, "escolas"));
        setEscolas(eSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Erro escolas:", e);
      }
    };
    carregarEscolas();
  }, []);

  // 2. SINCRONIZAÇÃO INTELIGENTE (CORREÇÃO PARA PROF COM 2 ESCOLAS)
  useEffect(() => {
    // Só roda quando o perfil do usuário terminar de carregar
    if (isLoadingUserSchool) return;

    // Verifica se já existe uma escolha salva no navegador
    const escolhaManual = localStorage.getItem("escolaId");

    if (escolhaManual) {
      // Se o usuário já escolheu uma escola antes, RESPEITA a escolha dele
      // e ignora a escola padrão que vem do banco.
      console.log(">>> Usando escola salva no cache:", escolhaManual);
      setEscolaSelecionada(escolhaManual);
    } else if (userSchoolId) {
      // Se não tem nada salvo, usa a escola padrão do professor
      console.log(">>> Usando escola padrão do perfil:", userSchoolId);
      setEscolaSelecionada(userSchoolId);
    }
  }, [userSchoolId, isLoadingUserSchool]);

  // 3. FUNÇÃO DE BUSCA BLINDADA (Filtro Duplo)
  const carregarDados = useCallback(async (idEscola) => {
    if (!idEscola) return;

    // Logs para te ajudar a debugar se precisar
    console.clear();
    console.log(`🔎 Buscando dados para Escola ID: ${idEscola}`);

    setLoading(true);

    // LIMPEZA IMEDIATA: Garante que a tela fique vazia antes de trazer novos dados
    setAlunos([]);
    setAlunosAnterior([]);

    try {
      const anoVisualizacao =
        Number(localStorage.getItem("anoExercicio")) || ANO_ATUAL;

      // Buscas em paralelo
      const [snapAtual, snapMigrar] = await Promise.all([
        getDocs(
          query(
            collection(db, "alunos"),
            where("escolaId", "==", idEscola),
            where("ano", "==", anoVisualizacao),
            orderBy("nome")
          )
        ),
        getDocs(
          query(
            collection(db, "alunos"),
            where("escolaId", "==", idEscola),
            where("ano", "==", ANO_ATUAL)
          )
        ),
      ]);

      // --- FILTRO DE SEGURANÇA (JavaScript) ---
      // Garante que nenhum aluno de outra escola apareça, mesmo se o cache do Firebase falhar
      const listaLimpa = snapAtual.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((aluno) => aluno.escolaId === idEscola);

      const listaMigrarLimpa = snapMigrar.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((aluno) => aluno.escolaId === idEscola);

      console.log(`✅ ${listaLimpa.length} alunos válidos encontrados.`);

      setAlunos(listaLimpa);
      setAlunosAnterior(listaMigrarLimpa);
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
      toast.error("Erro ao buscar alunos.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Monitor de Troca: Quando o ID muda, dispara a busca
  useEffect(() => {
    if (escolaSelecionada) {
      // Salva a escolha para persistir no F5
      localStorage.setItem("escolaId", escolaSelecionada);
      carregarDados(escolaSelecionada);
    }
  }, [escolaSelecionada, carregarDados]);

  // --- AÇÕES DO USUÁRIO ---
  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`Excluir ${nome}?`)) return;
    try {
      await deleteDoc(doc(db, "alunos", id));
      setAlunos((prev) => prev.filter((a) => a.id !== id));
      toast.success("Aluno removido.");
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  const handlePromoverSelecionados = async () => {
    if (selecionados.length === 0) {
      toast.warn("Selecione ao menos um aluno.");
      return;
    }
    setProcessandoMigracao(true);
    try {
      const batch = writeBatch(db);
      selecionados.forEach((id) => {
        const aluno = alunosAnterior.find((a) => a.id === id);
        if (aluno) {
          const proximaTurma = sugerirProximaTurma(aluno.turma);
          batch.update(doc(db, "alunos", id), {
            turma: proximaTurma,
            ano: ANO_PROXIMO,
          });
        }
      });
      await batch.commit();
      toast.success(`${selecionados.length} alunos promovidos!`);
      setMostrarModalMigracao(false);
      setSelecionados([]);
      carregarDados(escolaSelecionada);
    } catch (e) {
      toast.error("Erro na migração.");
    } finally {
      setProcessandoMigracao(false);
    }
  };

  const alunosFiltrados = useMemo(() => {
    return alunos.filter((a) =>
      a.nome?.toLowerCase().includes(busca.toLowerCase())
    );
  }, [alunos, busca]);

  if (isLoadingUserSchool) return <Loader />;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-8 font-['Plus_Jakarta_Sans'] relative">
      <ToastContainer theme="dark" position="bottom-right" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="flex flex-wrap items-center justify-between gap-6 mb-12 relative z-10">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-blue-400"
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
              Gestão de <span className="text-blue-500">Alunos</span>
            </h1>
            {/* Exibe o nome da escola baseado no ID selecionado, e não no perfil estático */}
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
              {escolaSelecionada
                ? `Unidade: ${
                    escolas.find((e) => e.id === escolaSelecionada)?.nome ||
                    "Carregando..."
                  }`
                : "Selecione uma Unidade"}
            </p>
          </div>
        </div>

        {escolaSelecionada && (
          <div className="flex gap-4">
            <button
              onClick={() => setMostrarModalMigracao(true)}
              className="px-6 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2"
            >
              <FaRocket /> Promover
            </button>
            <button
              onClick={() => navigate("/cadastrar-aluno")}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/20"
            >
              <FaPlus /> Novo Aluno
            </button>
          </div>
        )}
      </header>

      {/* SELETOR DE ESCOLAS (ADMIN/DEV) */}
      {canViewAllSchools && (
        <div className="flex gap-3 overflow-x-auto pb-6 mb-4 relative z-10 custom-scrollbar">
          {escolas.map((e) => (
            <button
              key={e.id}
              className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                escolaSelecionada === e.id
                  ? "bg-blue-600 border-blue-400 text-white"
                  : "bg-white/5 border-white/10 text-slate-400"
              }`}
              onClick={() => {
                // Ao clicar, atualizamos o estado. O useEffect lidará com o salvamento.
                setEscolaSelecionada(e.id);
                setBusca("");
              }}
            >
              {e.nome}
            </button>
          ))}
        </div>
      )}

      {/* TELA PRINCIPAL */}
      {!escolaSelecionada ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.02] rounded-[40px] border border-white/5">
          <FaSchool className="text-6xl text-slate-700 mb-6" />
          <h2 className="text-xl font-bold text-slate-400 uppercase tracking-tighter">
            Aguardando Seleção
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            Escolha uma unidade para visualizar os dados.
          </p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      ) : (
        <>
          <div className="relative max-w-2xl mb-12 z-10">
            <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar aluno..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-white outline-none focus:border-blue-500/50 transition-all"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
            <AnimatePresence mode="popLayout">
              {alunosFiltrados.length > 0 ? (
                alunosFiltrados.map((aluno) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={aluno.id}
                    className="bg-white/[0.03] border border-white/10 rounded-[35px] p-6 group hover:border-blue-500/40 transition-all shadow-xl"
                  >
                    <div className="flex items-center gap-5 mb-6">
                      <div className="w-16 h-16 rounded-[22px] bg-slate-800 border border-white/10 flex items-center justify-center text-2xl font-black text-blue-500 overflow-hidden">
                        {aluno.fotoUrl ? (
                          <img
                            src={aluno.fotoUrl}
                            alt={aluno.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          aluno.nome?.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold truncate">
                          {aluno.nome}
                        </h3>
                        <span className="text-[10px] uppercase font-black tracking-widest text-blue-400 block">
                          {aluno.turma}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate(`/editar-aluno/${aluno.id}`)}
                        className="flex-1 bg-white/5 hover:bg-blue-600 text-[10px] font-black uppercase py-3.5 rounded-2xl transition-all"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(aluno.id, aluno.nome)}
                        className="px-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-10 opacity-60">
                  <p className="text-slate-400 font-bold">
                    Nenhum aluno encontrado.
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    Esta escola ainda não tem alunos cadastrados.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* MODAL MIGRAÇÃO */}
      <AnimatePresence>
        {mostrarModalMigracao && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() =>
                !processandoMigracao && setMostrarModalMigracao(false)
              }
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-[40px] p-10 relative z-10 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-white uppercase italic mb-6">
                Promover Alunos ({ANO_ATUAL} → {ANO_PROXIMO})
              </h3>
              <div className="max-h-[300px] overflow-y-auto space-y-2 mb-8 pr-2 custom-scrollbar">
                {alunosAnterior.length > 0 ? (
                  alunosAnterior.map((a) => (
                    <label
                      key={a.id}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selecionados.includes(a.id)}
                        onChange={() =>
                          setSelecionados((prev) =>
                            prev.includes(a.id)
                              ? prev.filter((i) => i !== a.id)
                              : [...prev, a.id]
                          )
                        }
                        className="w-5 h-5 accent-blue-600"
                      />
                      <span className="text-sm font-bold text-slate-200">
                        {a.nome}{" "}
                        <span className="text-blue-400 ml-2">({a.turma})</span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-4">
                    Nenhum aluno encontrado para promover.
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setMostrarModalMigracao(false)}
                  className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePromoverSelecionados}
                  disabled={processandoMigracao || selecionados.length === 0}
                  className="flex-[2] py-4 bg-blue-600 disabled:bg-slate-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-600/20"
                >
                  {processandoMigracao
                    ? "Processando..."
                    : `Promover ${selecionados.length} Alunos`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
