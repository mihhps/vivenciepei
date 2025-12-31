import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaEdit,
  FaRocket,
  FaSearch,
} from "react-icons/fa";

import "react-toastify/dist/ReactToastify.css";
import "../styles/CadastroTurma.css";

const turnosDisponiveis = ["Matutino", "Vespertino", "Noturno", "Integral"];

export default function CadastroTurma() {
  const navigate = useNavigate();
  const [nomeTurma, setNomeTurma] = useState("");
  const [turnoTurma, setTurnoTurma] = useState("");
  const [escolaIdSelecionada, setEscolaIdSelecionada] = useState("");
  const [listaEscolas, setListaEscolas] = useState([]);
  const [turmasCadastradas, setTurmasCadastradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const anoAtivo = Number(localStorage.getItem("anoExercicio")) || 2025;
  const anoAnterior = anoAtivo - 1;

  const [editandoId, setEditandoId] = useState(null);
  const [nomeEdit, setNomeEdit] = useState("");
  const [turnoEdit, setTurnoEdit] = useState("");

  const usuario = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado") || "{}"),
    []
  );

  // ✅ NAVEGAÇÃO INTELIGENTE: Dev volta para Painel Dev
  const voltarHome = () => {
    const perfil = (usuario.perfil || "").toLowerCase().trim();
    const painelMap = {
      desenvolvedor: "/painel-dev",
      seme: "/painel-seme",
      gestao: "/painel-gestao",
      diretor: "/painel-gestao",
      diretor_adjunto: "/painel-gestao",
      orientador_pedagogico: "/painel-gestao",
      professor: "/painel-professor",
      aee: "/painel-aee",
    };
    navigate(painelMap[perfil] || "/login");
  };

  // --- CARREGAMENTO DE DADOS ---

  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const snap = await getDocs(collection(db, "escolas"));
        setListaEscolas(
          snap.docs.map((d) => ({ id: d.id, nome: d.data().nome }))
        );
      } catch (e) {
        toast.error("Erro ao carregar escolas.");
      } finally {
        setLoading(false);
      }
    };
    fetchEscolas();
  }, []);

  const fetchTurmas = useCallback(async () => {
    if (!escolaIdSelecionada) return;
    setLoading(true);
    try {
      const q = collection(db, "escolas", escolaIdSelecionada, "turmas");
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtradas = data.filter((t) => !t.ano || t.ano === anoAtivo);
      setTurmasCadastradas(
        filtradas.sort((a, b) => a.nome.localeCompare(b.nome))
      );
    } catch (e) {
      toast.error("Erro ao carregar turmas.");
    } finally {
      setLoading(false);
    }
  }, [escolaIdSelecionada, anoAtivo]);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  // --- FUNÇÕES DE AÇÃO ---

  const handleSalvarTurma = async (e) => {
    e.preventDefault();
    if (!nomeTurma.trim() || !turnoTurma || !escolaIdSelecionada) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "escolas", escolaIdSelecionada, "turmas"), {
        nome: nomeTurma.trim(),
        turno: turnoTurma,
        ano: anoAtivo,
        criadoEm: serverTimestamp(),
      });
      toast.success("Turma cadastrada!");
      setNomeTurma("");
      setTurnoTurma("");
      fetchTurmas();
    } catch (e) {
      toast.error("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const salvarEdicao = async (id) => {
    try {
      await updateDoc(doc(db, "escolas", escolaIdSelecionada, "turmas", id), {
        nome: nomeEdit,
        turno: turnoEdit,
        ano: anoAtivo,
      });
      toast.success("Turma atualizada!");
      setEditandoId(null);
      fetchTurmas();
    } catch (e) {
      toast.error("Erro ao atualizar.");
    }
  };

  // ✅ FUNÇÃO REINTEGRADA: Copiar do Ano Anterior
  const copiarTurmasAnoAnterior = async () => {
    if (!escolaIdSelecionada) return;
    const confirmacao = window.confirm(
      `Copiar turmas de ${anoAnterior} para ${anoAtivo}?`
    );
    if (!confirmacao) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "escolas", escolaIdSelecionada, "turmas"),
        where("ano", "==", anoAnterior)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.info("Nenhuma turma encontrada em " + anoAnterior);
        return;
      }
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        const novaRef = doc(
          collection(db, "escolas", escolaIdSelecionada, "turmas")
        );
        batch.set(novaRef, {
          ...d.data(),
          ano: anoAtivo,
          criadoEm: serverTimestamp(),
        });
      });
      await batch.commit();
      toast.success("Turmas migradas com sucesso!");
      fetchTurmas();
    } catch (e) {
      toast.error("Erro na migração.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNÇÃO REINTEGRADA: Extrair dos Alunos
  const gerarTurmasApartirDosAlunos = async () => {
    if (!escolaIdSelecionada) return;
    setLoading(true);
    try {
      const qAlunos = query(
        collection(db, "alunos"),
        where("escolaId", "==", escolaIdSelecionada),
        where("ano", "==", anoAtivo)
      );
      const snapAlunos = await getDocs(qAlunos);
      const turmasDetectadas = new Set();
      snapAlunos.docs.forEach((d) => {
        if (d.data().turma)
          turmasDetectadas.add(d.data().turma.trim().toUpperCase());
      });

      const batch = writeBatch(db);
      turmasDetectadas.forEach((nome) => {
        const novaRef = doc(
          collection(db, "escolas", escolaIdSelecionada, "turmas")
        );
        batch.set(novaRef, {
          nome,
          turno: "Matutino",
          ano: anoAtivo,
          criadoEm: serverTimestamp(),
        });
      });
      await batch.commit();
      toast.success("Turmas extraídas dos alunos!");
      fetchTurmas();
    } catch (e) {
      toast.error("Erro na extração.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletar = async (id, nome) => {
    if (!window.confirm(`Excluir a turma "${nome}"?`)) return;
    try {
      await deleteDoc(doc(db, "escolas", escolaIdSelecionada, "turmas", id));
      toast.success("Turma removida!");
      fetchTurmas();
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-6 md:p-10 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      <ToastContainer theme="dark" position="bottom-right" />

      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex items-center gap-6 mb-10">
          <motion.button
            whileHover={{ x: -5 }}
            onClick={voltarHome}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-blue-400 hover:bg-white/10 transition-all"
          >
            <FaArrowLeft />
          </motion.button>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              Gestão de <span className="text-blue-500">Turmas</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
              Exercício Letivo {anoAtivo}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-4 space-y-6"
          >
            <div className="bg-white/[0.03] border border-white/10 backdrop-blur-3xl rounded-[35px] p-8 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <FaPlus className="text-blue-500" size={14} /> Nova Turma
              </h3>

              <form onSubmit={handleSalvarTurma} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Unidade Escolar
                  </label>
                  <select
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none appearance-none cursor-pointer"
                    value={escolaIdSelecionada}
                    onChange={(e) => setEscolaIdSelecionada(e.target.value)}
                    required
                  >
                    <option value="">Selecione a Escola</option>
                    {listaEscolas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Nome da Turma
                  </label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none transition-all"
                    type="text"
                    placeholder="Ex: 7º Ano A"
                    value={nomeTurma}
                    onChange={(e) => setNomeTurma(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Turno
                  </label>
                  <select
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none appearance-none cursor-pointer"
                    value={turnoTurma}
                    onChange={(e) => setTurnoTurma(e.target.value)}
                    required
                  >
                    <option value="">Selecione</option>
                    {turnosDisponiveis.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] transition-all"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Sincronizando..." : "Confirmar Cadastro"}
                </button>
              </form>
            </div>

            {/* AÇÕES DE MASSA REATIVADAS */}
            {escolaIdSelecionada && (
              <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-[35px] p-6 space-y-4">
                <button
                  onClick={copiarTurmasAnoAnterior}
                  className="w-full py-4 bg-white/5 hover:bg-blue-600/10 border border-white/5 text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  ✨ Copiar Turmas de {anoAnterior}
                </button>
                <button
                  onClick={gerarTurmasApartirDosAlunos}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  🔍 Extrair Turmas dos Alunos
                </button>
              </div>
            )}
          </motion.div>

          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-3">
                Lista de Turmas{" "}
                <span className="bg-blue-600 text-[10px] px-2 py-0.5 rounded-md">
                  {turmasCadastradas.length}
                </span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {turmasCadastradas.map((t) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={t.id}
                    className="bg-white/[0.03] border border-white/10 rounded-[28px] p-6 hover:border-blue-500/30 transition-all group"
                  >
                    {editandoId === t.id ? (
                      <div className="space-y-4">
                        <input
                          className="w-full bg-slate-900 border border-blue-500 rounded-xl px-4 py-2 text-white outline-none"
                          value={nomeEdit}
                          onChange={(e) => setNomeEdit(e.target.value)}
                        />
                        <select
                          className="w-full bg-slate-900 border border-blue-500 rounded-xl px-4 py-2 text-white"
                          value={turnoEdit}
                          onChange={(e) => setTurnoEdit(e.target.value)}
                        >
                          {turnosDisponiveis.map((turno) => (
                            <option key={turno} value={turno}>
                              {turno}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => salvarEdicao(t.id)}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-[10px] font-bold"
                          >
                            SALVAR
                          </button>
                          <button
                            onClick={() => setEditandoId(null)}
                            className="px-4 bg-white/5 text-white py-2 rounded-xl text-[10px]"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-bold">{t.nome}</h4>
                          <span className="text-[10px] font-black uppercase tracking-tighter text-blue-400">
                            {t.turno}
                          </span>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditandoId(t.id);
                              setNomeEdit(t.nome);
                              setTurnoEdit(t.turno);
                            }}
                            className="p-2.5 bg-white/5 text-slate-300 rounded-xl hover:text-white"
                          >
                            <FaEdit size={12} />
                          </button>
                          <button
                            onClick={() => handleDeletar(t.id, t.nome)}
                            className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}
