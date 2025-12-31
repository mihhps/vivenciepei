import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// FIREBASE
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// BIBLIOTECAS EXTERNAS (Lógica de Extração)
import DOMPurify from "dompurify";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions } from "pdfjs-dist/build/pdf";
import Tesseract from "tesseract.js";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

// UI & ANIMAÇÕES
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMagic,
  FaSpinner,
  FaArrowLeft,
  FaFileAlt,
  FaUsers,
  FaLanguage,
  FaEye,
  FaCheckCircle,
  FaSave,
  FaCopy,
  FaBookOpen,
  FaSitemap,
  FaListOl,
  FaTools,
  FaCheck,
  FaRegLightbulb,
  FaFileUpload,
  FaThermometerHalf,
  FaPrint,
  FaFont,
  FaThLarge,
  FaExclamationTriangle,
} from "react-icons/fa";

// SERVIÇO DE IA
import { gerarAdaptacaoMaterial } from "../services/geminiService";
import "../styles/EstudioAdaptacaoConteudo.css";

// CONFIGURAÇÃO DO PDF WORKER (CRUCIAL PARA O UPLOAD FUNCIONAR)
GlobalWorkerOptions.workerSrc = pdfWorker;

// =========================================================================
// 🧩 COMPONENTES VISUAIS (Mantendo o estilo, mas funcionais)
// =========================================================================

const DICIONARIO_VISUAL = {
  casa: "https://img.icons8.com/color/48/house.png",
  escola: "https://img.icons8.com/color/48/school-building.png",
  estudar: "https://img.icons8.com/color/48/reading.png",
  aluno: "https://img.icons8.com/color/48/student-male.png",
  feliz: "https://img.icons8.com/color/48/happy.png",
  triste: "https://img.icons8.com/color/48/sad.png",
  comer: "https://img.icons8.com/color/48/eating.png",
  amigo: "https://img.icons8.com/color/48/friends.png",
  sol: "https://img.icons8.com/color/48/sun.png",
  lua: "https://img.icons8.com/color/48/moon.png",
  livro: "https://img.icons8.com/color/48/book.png",
  ideia: "https://img.icons8.com/color/48/idea.png",
  tempo: "https://img.icons8.com/color/48/clock.png",
  agua: "https://img.icons8.com/color/48/water.png",
};

const VisualizadorPictogramas = ({ texto }) => {
  if (!texto) return null;
  const palavras = texto.split(/\s+/);

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
      {palavras.map((palavra, index) => {
        const termo = palavra.toLowerCase().replace(/[.,!?;:]/g, "");
        const imagem = DICIONARIO_VISUAL[termo];
        return (
          <div key={index} className="flex flex-col items-center">
            {imagem ? (
              <img
                src={imagem}
                alt={termo}
                className="w-6 h-6 mb-1 drop-shadow-md"
              />
            ) : (
              <div className="h-7" />
            )}
            <span className="text-[9px] text-slate-300 font-medium leading-none">
              {palavra}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const TermometroInclusao = ({ texto }) => {
  const analise = useMemo(() => {
    if (!texto) return { score: 0, dicas: [] };

    const palavras = texto.trim().split(/\s+/).filter(Boolean);
    const frases = texto.split(/[.!?]+/).filter(Boolean);
    const media = frases.length ? palavras.length / frases.length : 0;
    const palavrasLongas = palavras.filter((p) => p.length > 12);

    let score = 100;
    let dicas = [];
    if (media > 20) {
      score -= 20;
      dicas.push("Frases muito longas (>20 palavras).");
    }
    if (palavrasLongas.length > 2) {
      score -= 10;
      dicas.push("Muitas palavras complexas.");
    }
    if (frases.length < 2 && palavras.length > 30) {
      score -= 15;
      dicas.push("Texto em bloco único.");
    }

    return { score, dicas };
  }, [texto]);

  if (!texto) return null;

  // Definição de Cores Baseadas no Score
  let corClass = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  let barraClass = "bg-emerald-500";

  if (analise.score < 80) {
    corClass = "text-amber-400 border-amber-500/30 bg-amber-500/10";
    barraClass = "bg-amber-500";
  }
  if (analise.score < 60) {
    corClass = "text-rose-400 border-rose-500/30 bg-rose-500/10";
    barraClass = "bg-rose-500";
  }

  return (
    <div
      className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col gap-3 ${corClass}`}
    >
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <FaThermometerHalf /> Nível de Acessibilidade
        </h4>
        <span className="text-lg font-black">{analise.score}/100</span>
      </div>

      {/* Barra de Progresso */}
      <div className="h-1.5 bg-black/20 rounded-full overflow-hidden w-full">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${analise.score}%` }}
          transition={{ duration: 1 }}
          className={`h-full ${barraClass}`}
        />
      </div>

      {analise.dicas.length > 0 ? (
        <ul className="text-[10px] font-medium opacity-80 list-disc pl-4 space-y-1">
          {analise.dicas.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] font-medium flex items-center gap-2">
          <FaCheckCircle /> Texto otimizado!
        </p>
      )}
    </div>
  );
};

const AdaptacaoCard = ({
  title,
  icon: Icon,
  versionText,
  level,
  onUse,
  onSave,
  delay,
}) => {
  if (!versionText) return null;

  // Limpa tags HTML para visualização prévia segura, exceto se for pictograma
  const preview = versionText.substring(0, 300) + "...";
  const isVisual = level === 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      className="group relative flex flex-col p-5 bg-white/[0.03] border border-white/5 rounded-[24px] hover:border-blue-500/30 hover:bg-white/[0.05] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all">
          <Icon />
        </div>
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-300">
          {title}
        </h3>
      </div>

      {/* Preview do Texto */}
      <div className="flex-1 mb-5 relative overflow-hidden h-32 mask-gradient text-xs text-slate-400 font-medium leading-relaxed font-sans">
        {isVisual ? (
          <VisualizadorPictogramas texto={preview} />
        ) : (
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(preview.replace(/\n/g, "<br/>")),
            }}
          />
        )}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#0b1021] to-transparent pointer-events-none" />
      </div>

      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onUse(versionText)}
          className="flex-1 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2"
        >
          <FaTools /> Editar Base
        </button>
        <button
          onClick={() => onSave(versionText)}
          className="px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
          title="Salvar direto"
        >
          <FaCheck />
        </button>
      </div>
    </motion.div>
  );
};

// =========================================================================
// 🚀 COMPONENTE PRINCIPAL (LÓGICA FUNCIONAL RESTAURADA)
// =========================================================================

export default function EstudioAdaptacaoConteudo() {
  const { alunoId } = useParams();
  const navigate = useNavigate();

  // --- ESTADOS DE DADOS ---
  const [alunoData, setAlunoData] = useState(null);
  const [dificuldadesChave, setDificuldadesChave] = useState("");
  const [materialOriginal, setMaterialOriginal] = useState("");
  const [materialFinalEditado, setMaterialFinalEditado] = useState("");

  // --- ESTADOS DAS VERSÕES ---
  const [versoes, setVersoes] = useState({
    v1: null,
    v2: null,
    v3: null,
    v4: null,
    guia: null,
  });

  // --- ESTADOS DE CONTROLE ---
  const [loadingAI, setLoadingAI] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [saving, setSaving] = useState(false);

  const [opcoes, setOpcoes] = useState({
    simplificarLinguagem: true,
    ajustarFormato: false,
    inserirPictogramas: true,
    transformarAvaliacao: false,
  });

  // 1. CARREGAR ALUNO
  useEffect(() => {
    if (!alunoId) return;
    const fetchAluno = async () => {
      try {
        const docRef = doc(db, "alunos", alunoId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAlunoData({
            id: alunoId,
            nome: data.nome,
            laudo: data.laudo || "Não informado",
          });
          setDificuldadesChave(data.dificuldadesChave || "");
        }
      } catch (error) {
        toast.error("Erro ao carregar dados do aluno.");
      }
    };
    fetchAluno();
  }, [alunoId]);

  // 2. FUNÇÃO DE EXTRAÇÃO DE TEXTO (PDF/IMAGEM)
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessingFile(true);
    setMaterialOriginal("");
    const toastId = toast.loading("Lendo arquivo...");

    try {
      let textoExtraido = "";

      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        }).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          textoExtraido +=
            content.items.map((item) => item.str).join(" ") + "\n\n";
        }
      } else if (file.type.startsWith("image/")) {
        const {
          data: { text },
        } = await Tesseract.recognize(file, "por");
        textoExtraido = text;
      } else {
        throw new Error("Formato não suportado");
      }

      setMaterialOriginal(textoExtraido.trim());
      toast.update(toastId, {
        render: "Arquivo lido com sucesso!",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
    } catch (error) {
      console.error(error);
      toast.update(toastId, {
        render: "Erro ao ler arquivo. Tente copiar e colar.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setProcessingFile(false);
      e.target.value = null; // Reset input
    }
  };

  // 3. FUNÇÃO DE GERAR ADAPTAÇÃO (CHAMADA API)
  const handleGerar = async () => {
    if (!materialOriginal.trim())
      return toast.warn("Por favor, insira o texto original.");

    setLoadingAI(true);
    const toastId = toast.loading("IA analisando e criando adaptações...");

    try {
      const resultado = await gerarAdaptacaoMaterial({
        texto: materialOriginal,
        laudo: alunoData?.laudo,
        dificuldades: dificuldadesChave,
        opcoes: opcoes,
        alunoData: alunoData, // Passando objeto completo por segurança
      });

      setVersoes({
        v1: resultado.versaoNivel1_OriginalSimplificado,
        v2: resultado.versaoNivel2_EstruturaOtimizada,
        v3: resultado.versaoNivel3_VisualCAA,
        v4: resultado.versaoNivel4_Alternativa,
        guia: resultado.guiaEstrategico,
      });

      toast.update(toastId, {
        render: "Adaptações geradas com sucesso!",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
    } catch (error) {
      console.error(error);
      toast.update(toastId, {
        render: "Falha na IA. Tente novamente.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setLoadingAI(false);
    }
  };

  // 4. FUNÇÃO DE SALVAR NO FIREBASE
  const handleSalvar = async (textoDireto = null) => {
    const conteudoFinal = textoDireto || materialFinalEditado;

    if (!conteudoFinal || !conteudoFinal.trim()) {
      return toast.warn("O texto final está vazio.");
    }

    setSaving(true);
    const toastId = toast.loading("Salvando material na nuvem...");

    try {
      await addDoc(collection(db, "materiaisAdaptados"), {
        alunoId,
        nomeAluno: alunoData?.nome || "Aluno Desconhecido",
        dataCriacao: serverTimestamp(),
        materialOriginal,
        materialFinalEditado: conteudoFinal,
        historicoGerado: versoes,
        opcoesConfiguradas: opcoes,
      });

      toast.update(toastId, {
        render: "Material salvo no portfólio!",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      // Limpeza opcional após salvar
      if (!textoDireto) setMaterialFinalEditado("");
    } catch (error) {
      console.error(error);
      toast.update(toastId, {
        render: "Erro ao salvar no banco de dados.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  // 5. UTILITÁRIOS (Copiar e Imprimir)
  const handleCopy = (txt) => {
    navigator.clipboard.writeText(txt);
    toast.info("Copiado para área de transferência!");
  };

  const handlePrint = (layout) => {
    if (!materialFinalEditado) return toast.warn("Sem conteúdo para imprimir");

    const printWindow = window.open("", "", "height=600,width=800");
    const conteudo = materialFinalEditado
      .split("\n")
      .map((p) => `<p>${p}</p>`)
      .join("");

    let estiloExtra = "";
    if (layout === "cards") {
      estiloExtra = `
        display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
        p { border: 2px solid #000; padding: 20px; border-radius: 10px; font-size: 18px; }
      `;
    } else {
      estiloExtra = `
        font-family: 'Arial', sans-serif; font-size: 16px; line-height: 1.6; max-width: 800px; margin: 0 auto;
      `;
    }

    printWindow.document.write(`
      <html>
        <head><title>Impressão - Vivencie PEI</title></head>
        <body style="${layout === "cards" ? "" : "padding: 40px;"}">
           <div style="${estiloExtra}">${conteudo}</div>
           <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- RENDERIZAÇÃO ---
  const temVersoes = versoes.v1 || versoes.v2 || versoes.v3 || versoes.v4;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-['Plus_Jakarta_Sans'] relative overflow-hidden flex flex-col">
      <ToastContainer theme="dark" position="bottom-right" />

      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* HEADER ELITE */}
      <header className="z-30 border-b border-white/5 bg-slate-950/40 backdrop-blur-2xl px-10 py-5 flex justify-between items-center sticky top-0">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
          >
            <FaArrowLeft />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
              <FaMagic className="text-blue-500" /> Vivencie{" "}
              <span className="text-blue-500">Adapt</span>
            </h1>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
              Estúdio de Inteligência Pedagógica
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {alunoData ? (
            <div className="px-5 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <FaUsers /> {alunoData.nome}
            </div>
          ) : (
            <div className="animate-pulse h-8 w-32 bg-white/5 rounded-full" />
          )}
        </div>
      </header>

      <main className="flex-1 z-10 p-6 lg:p-10 max-w-[1800px] mx-auto w-full grid grid-cols-12 gap-8">
        {/* === COLUNA ESQUERDA: INPUTS (35%) === */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
          {/* Box de Dificuldades */}
          <section className="bg-slate-900/50 border border-white/5 rounded-[30px] p-6 backdrop-blur-sm shadow-xl">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FaRegLightbulb className="text-amber-500" /> Foco da Adaptação
            </h3>
            <textarea
              value={dificuldadesChave}
              onChange={(e) => setDificuldadesChave(e.target.value)}
              placeholder="Descreva as dificuldades atuais do aluno para orientar a IA..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all resize-none min-h-[100px]"
            />
          </section>

          {/* Box de Texto Original */}
          <section className="bg-slate-900/50 border border-white/5 rounded-[30px] p-6 backdrop-blur-sm shadow-xl flex flex-col gap-4 flex-1">
            <div className="flex justify-between items-center">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <FaFileAlt className="text-blue-500" /> Texto Original
              </h3>
              {processingFile && (
                <span className="text-[10px] text-blue-400 animate-pulse">
                  Processando arquivo...
                </span>
              )}
            </div>

            <div className="relative group flex-1 flex flex-col">
              <textarea
                value={materialOriginal}
                onChange={(e) => setMaterialOriginal(e.target.value)}
                placeholder="Cole o texto aqui ou faça upload do PDF/Imagem..."
                className="w-full h-full min-h-[300px] bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all resize-none font-mono"
              />

              <div className="absolute bottom-4 right-4 z-10">
                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-blue-600 text-white rounded-xl shadow-lg border border-white/10 transition-all transform hover:scale-105">
                  {processingFile ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaFileUpload />
                  )}
                  <span className="text-[10px] font-black uppercase">
                    Upload
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf, image/*"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Box de Configuração IA */}
          <section className="bg-slate-900/50 border border-white/5 rounded-[30px] p-6 backdrop-blur-sm shadow-xl">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FaTools className="text-purple-500" /> Estratégia
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { k: "simplificarLinguagem", i: FaLanguage, l: "Simplificar" },
                { k: "ajustarFormato", i: FaEye, l: "Visual" },
                { k: "inserirPictogramas", i: FaUsers, l: "Pictogramas" },
                { k: "transformarAvaliacao", i: FaListOl, l: "Quiz" },
              ].map((opt) => (
                <button
                  key={opt.k}
                  onClick={() =>
                    setOpcoes((p) => ({ ...p, [opt.k]: !p[opt.k] }))
                  }
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                    opcoes[opt.k]
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                      : "bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/5"
                  }`}
                >
                  <opt.i className="text-lg" /> {opt.l}
                </button>
              ))}
            </div>

            <button
              onClick={handleGerar}
              disabled={loadingAI || !materialOriginal}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl ${
                loadingAI
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/20 hover:scale-[1.02]"
              }`}
            >
              {loadingAI ? <FaSpinner className="animate-spin" /> : <FaMagic />}
              {loadingAI ? "A Mágica está acontecendo..." : "Gerar Adaptações"}
            </button>
          </section>
        </aside>

        {/* === COLUNA DIREITA: RESULTADOS (65%) === */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2">
          {/* CARDS DAS VERSÕES (Aparecem só quando existem) */}
          <AnimatePresence>
            {temVersoes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
              >
                <AdaptacaoCard
                  title="Nível 1: Simplificado"
                  icon={FaBookOpen}
                  versionText={versoes.v1}
                  level={1}
                  onUse={setMaterialFinalEditado}
                  onSave={handleSalvar}
                  delay={1}
                />
                <AdaptacaoCard
                  title="Nível 2: Estruturado"
                  icon={FaListOl}
                  versionText={versoes.v2}
                  level={2}
                  onUse={setMaterialFinalEditado}
                  onSave={handleSalvar}
                  delay={2}
                />
                <AdaptacaoCard
                  title="Nível 3: Visual/CAA"
                  icon={FaEye}
                  versionText={versoes.v3}
                  level={3}
                  onUse={setMaterialFinalEditado}
                  onSave={handleSalvar}
                  delay={3}
                />
                <AdaptacaoCard
                  title="Nível 4: Alternativo"
                  icon={FaSitemap}
                  versionText={versoes.v4}
                  level={4}
                  onUse={setMaterialFinalEditado}
                  onSave={handleSalvar}
                  delay={4}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* DICA DA IA */}
          {versoes.guia && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex gap-4 items-center shadow-lg"
            >
              <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-400">
                <FaRegLightbulb />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                  Estratégia Sugerida
                </h4>
                <p className="text-xs text-indigo-100/80 leading-relaxed">
                  {versoes.guia}
                </p>
              </div>
            </motion.div>
          )}

          {/* === ATELIÊ DE EDIÇÃO FINAL === */}
          <section className="flex-1 bg-slate-900/80 border border-white/10 rounded-[30px] overflow-hidden flex flex-col shadow-2xl backdrop-blur-md relative min-h-[500px]">
            {/* Toolbar do Editor */}
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </div>
                <span className="ml-3 text-[10px] font-black uppercase text-slate-500 tracking-widest border-l border-white/10 pl-3">
                  Ateliê de Edição Final
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint("text")}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Imprimir Texto"
                >
                  <FaFont />
                </button>
                <button
                  onClick={() => handlePrint("cards")}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Imprimir Flashcards"
                >
                  <FaThLarge />
                </button>
                <div className="h-4 w-px bg-white/10 mx-2" />
                <button
                  onClick={() => handleCopy(materialFinalEditado)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <FaCopy />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Área de Texto */}
              <div className="flex-1 relative">
                <textarea
                  value={materialFinalEditado}
                  onChange={(e) => setMaterialFinalEditado(e.target.value)}
                  className="w-full h-full bg-transparent p-8 text-sm text-slate-300 font-mono leading-loose outline-none resize-none custom-scrollbar"
                  placeholder="// Selecione uma versão gerada acima para começar a editar..."
                />
              </div>

              {/* Sidebar do Editor (Termômetro + Salvar) */}
              <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-white/5 bg-black/20 p-6 flex flex-col gap-6">
                <TermometroInclusao texto={materialFinalEditado} />

                <div className="mt-auto">
                  <button
                    onClick={() => handleSalvar(null)}
                    disabled={saving || !materialFinalEditado}
                    className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                      saving
                        ? "bg-slate-700 text-slate-400"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-500/20 hover:-translate-y-1"
                    }`}
                  >
                    {saving ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaSave />
                    )}
                    {saving ? "Salvando..." : "Finalizar & Salvar"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
