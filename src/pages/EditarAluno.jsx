import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { motion } from "framer-motion";
import { FaUpload, FaCamera, FaSave } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";

// Componentes Reutilizáveis
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";
import "react-toastify/dist/ReactToastify.css";

export default function EditarAluno() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [alunoData, setAlunoData] = useState(null);
  const [escolaIdDoAluno, setEscolaIdDoAluno] = useState("");
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState("");
  const [turnoExibido, setTurnoExibido] = useState("");
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados para Foto
  const [novaFotoArquivo, setNovaFotoArquivo] = useState(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState("");
  const fileInputRef = useRef(null);

  // ✅ CAPTURA O ANO SELECIONADO NO SISTEMA
  const anoAtivo = useMemo(
    () => Number(localStorage.getItem("anoExercicio")) || 2025,
    []
  );

  // --- Efeito 1: Carregar Dados do Aluno ---
  useEffect(() => {
    async function buscarAluno() {
      try {
        const docRef = doc(db, "alunos", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          toast.error("Aluno não encontrado.");
          navigate("/ver-alunos");
          return;
        }

        const data = docSnap.data();
        setAlunoData(data);
        if (data.fotoUrl) setFotoPreviewUrl(data.fotoUrl);
        if (data.escolaId) setEscolaIdDoAluno(data.escolaId);
      } catch (erro) {
        toast.error("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }
    buscarAluno();
  }, [id, navigate]);

  // --- Efeito 2: Carregar Turmas FILTRADAS POR ANO ---
  useEffect(() => {
    const fetchTurmas = async () => {
      if (!escolaIdDoAluno) return;
      try {
        // ✅ FILTRO ADICIONADO: Pega apenas turmas onde o campo 'ano' coincide com o selecionado
        const turmasRef = collection(db, "escolas", escolaIdDoAluno, "turmas");
        const q = query(turmasRef, where("ano", "==", anoAtivo));

        const turmasSnapshot = await getDocs(q);
        const turmasData = turmasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTurmasDisponiveis(
          turmasData.sort((a, b) => a.nome.localeCompare(b.nome))
        );

        // Pré-seleciona a turma se o aluno já estiver em uma deste ano
        if (alunoData?.turma) {
          const tExistente = turmasData.find((t) => t.nome === alunoData.turma);
          if (tExistente) {
            setTurmaSelecionadaId(tExistente.id);
            setTurnoExibido(tExistente.turno);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar turmas:", error);
        toast.error("Erro ao carregar turmas deste ano.");
      }
    };
    if (alunoData) fetchTurmas();
  }, [escolaIdDoAluno, alunoData, anoAtivo]);

  // Atualiza o turno automaticamente ao trocar a turma no select
  useEffect(() => {
    const selecionada = turmasDisponiveis.find(
      (t) => t.id === turmaSelecionadaId
    );
    if (selecionada) {
      setTurnoExibido(selecionada.turno);
    }
  }, [turmaSelecionadaId, turmasDisponiveis]);

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNovaFotoArquivo(file);
      setFotoPreviewUrl(URL.createObjectURL(file));
    }
  };

  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return "";
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    if (
      hoje.getMonth() < nasc.getMonth() ||
      (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())
    )
      idade--;
    return `${idade} anos`;
  };

  const salvar = async () => {
    setIsSaving(true);
    let finalFotoUrl = alunoData.fotoUrl || "";
    const turmaObj = turmasDisponiveis.find((t) => t.id === turmaSelecionadaId);

    if (!alunoData.nome || !alunoData.nascimento || !turmaObj) {
      toast.warn(
        "Preencha todos os campos obrigatórios e selecione uma turma."
      );
      setIsSaving(false);
      return;
    }

    try {
      if (novaFotoArquivo) {
        const storageRef = ref(storage, `fotos_alunos/${id}_${Date.now()}`);
        const uploadTask = await uploadBytes(storageRef, novaFotoArquivo);
        finalFotoUrl = await getDownloadURL(uploadTask.ref);
      }

      const docRef = doc(db, "alunos", id);
      await updateDoc(docRef, {
        ...alunoData,
        turma: turmaObj.nome,
        turno: turmaObj.turno,
        fotoUrl: finalFotoUrl,
        ano: anoAtivo, // Garante que o vínculo permaneça no ano correto
      });

      toast.success("Perfil atualizado com sucesso!");
      setTimeout(() => navigate("/ver-alunos"), 1500);
    } catch (erro) {
      toast.error("Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-8 font-['Plus_Jakarta_Sans'] relative overflow-hidden flex flex-col items-center">
      <ToastContainer theme="dark" position="bottom-right" />

      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        <header className="flex items-center gap-6 mb-12">
          <BotaoVoltar />
          <div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              Editar <span className="text-blue-500 text-glow">Aluno</span>
            </h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
              Editando registros de {anoAtivo}
            </p>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/10 backdrop-blur-3xl rounded-[40px] p-10 shadow-2xl"
        >
          {/* FOTO SECTION */}
          <div className="flex flex-col items-center mb-12">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[35px] overflow-hidden border-4 border-blue-600/20 shadow-2xl transition-transform group-hover:scale-105">
                <img
                  src={fotoPreviewUrl || "https://via.placeholder.com/150"}
                  className="w-full h-full object-cover"
                  alt="Avatar"
                />
              </div>
              <button
                onClick={() => fileInputRef.current.click()}
                className="absolute bottom-0 -right-2 bg-blue-600 p-3 rounded-2xl text-white shadow-xl hover:bg-blue-500 transition-all border-4 border-[#020617]"
              >
                <FaCamera size={14} />
              </button>
              <input
                type="file"
                hidden
                ref={fileInputRef}
                onChange={handleFotoChange}
                accept="image/*"
              />
            </div>
          </div>

          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={alunoData.nome}
                  onChange={(e) =>
                    setAlunoData({ ...alunoData, nome: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={alunoData.nascimento}
                  onChange={(e) =>
                    setAlunoData({ ...alunoData, nascimento: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none transition-all"
                />
                <span className="text-[10px] text-blue-400 font-bold ml-1 uppercase">
                  {calcularIdade(alunoData.nascimento)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Diagnóstico
              </label>
              <input
                type="text"
                value={alunoData.diagnostico}
                onChange={(e) =>
                  setAlunoData({ ...alunoData, diagnostico: e.target.value })
                }
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none transition-all"
                placeholder="Informe o diagnóstico ou observação"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Turma ({anoAtivo})
                </label>
                <select
                  value={turmaSelecionadaId}
                  onChange={(e) => setTurmaSelecionadaId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="">Selecione a Turma</option>
                  {turmasDisponiveis.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
                {turmasDisponiveis.length === 0 && (
                  <p className="text-[9px] text-amber-500 font-bold uppercase ml-1">
                    Nenhuma turma de {anoAtivo} nesta escola.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Turno
                </label>
                <input
                  type="text"
                  value={turnoExibido}
                  readOnly
                  className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-slate-500 font-bold outline-none"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={salvar}
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs mt-8"
            >
              {isSaving ? (
                "Sincronizando..."
              ) : (
                <>
                  <FaSave /> Salvar Alterações
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
