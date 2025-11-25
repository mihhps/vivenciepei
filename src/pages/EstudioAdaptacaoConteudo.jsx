import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";

// BIBLIOTECAS EXTERNAS
import DOMPurify from "dompurify";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions } from "pdfjs-dist/build/pdf";
import Tesseract from "tesseract.js";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

// ÍCONES
import {
  FaMagic,
  FaSpinner,
  FaArrowLeft,
  FaExclamationTriangle,
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
  FaPaste,
  FaFileUpload,
  FaThermometerHalf,
  FaPrint,
  FaFont,
  FaThLarge,
} from "react-icons/fa";

import { gerarAdaptacaoMaterial } from "../services/geminiService";
import "../styles/EstudioAdaptacaoConteudo.css";

// CONFIGURAÇÃO DO PDF WORKER
GlobalWorkerOptions.workerSrc = pdfWorker;

// =========================================================================
// 🧩 SUB-COMPONENTE 1: VISUALIZADOR DE PICTOGRAMAS (MOTOR VISUAL)
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
  água: "https://img.icons8.com/color/48/water.png",
};

const VisualizadorPictogramas = ({ texto }) => {
  if (!texto) return null;
  const palavras = texto.split(/\s+/);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        padding: "15px",
        background: "#f8f9fa",
        borderRadius: "8px",
        border: "1px solid #e9ecef",
      }}
    >
      {palavras.map((palavra, index) => {
        const termoLimpo = palavra.toLowerCase().replace(/[.,!?;:]/g, "");
        const imagem = DICIONARIO_VISUAL[termoLimpo];

        return (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              margin: "2px",
            }}
          >
            {imagem ? (
              <img
                src={imagem}
                alt={termoLimpo}
                style={{ width: "28px", height: "28px", marginBottom: "2px" }}
              />
            ) : (
              <div style={{ height: "30px" }}></div>
            )}
            <span style={{ fontSize: "0.9rem", lineHeight: "1" }}>
              {palavra}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// =========================================================================
// 🧩 SUB-COMPONENTE 2: TERMÔMETRO DE INCLUSÃO (MODERNIZADO)
// =========================================================================
const TermometroInclusao = ({ texto }) => {
  if (!texto) return null;

  const palavras = texto
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  const frases = texto.split(/[.!?]+/).filter((f) => f.length > 0);
  const mediaPalavrasPorFrase =
    frases.length > 0 ? palavras.length / frases.length : 0;
  const palavrasLongas = palavras.filter((p) => p.length > 12);

  let score = 100;
  let dicas = [];

  if (mediaPalavrasPorFrase > 20) {
    score -= 20;
    dicas.push("Frases muito longas (>20 palavras). Use mais pontos finais.");
  }
  if (palavrasLongas.length > 2) {
    score -= 10;
    dicas.push("Muitas palavras complexas/longas detectadas.");
  }
  if (frases.length < 2 && palavras.length > 30) {
    score -= 15;
    dicas.push("Texto em bloco único. Quebre em parágrafos.");
  }

  const getCor = () => {
    if (score > 80) return "var(--cor-success)";
    if (score > 60) return "var(--cor-warning)";
    return "var(--cor-danger)";
  };

  return (
    <div
      className="termometro-container"
      style={{ borderLeft: `6px solid ${getCor()}` }}
    >
      <h4
        style={{
          margin: "0 0 15px 0",
          color: "var(--text-main)",
          fontSize: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <FaThermometerHalf style={{ color: getCor() }} /> Acessibilidade
        <span
          style={{
            fontSize: "0.8em",
            background: getCor(),
            color: "white",
            padding: "4px 10px",
            borderRadius: "20px",
          }}
        >
          {score}/100
        </span>
      </h4>

      {dicas.length === 0 ? (
        <p
          style={{
            color: "var(--cor-success)",
            fontSize: "0.9rem",
            margin: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <FaCheckCircle style={{ marginRight: "8px" }} /> Texto excelente e
          fácil de ler!
        </p>
      ) : (
        <ul
          style={{
            margin: 0,
            paddingLeft: "20px",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
          }}
        >
          {dicas.map((dica, idx) => (
            <li key={idx} style={{ marginBottom: "6px" }}>
              {dica}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// =========================================================================
// FUNÇÕES DE EXTRAÇÃO DE TEXTO
// =========================================================================
async function extractTextFromFile(file) {
  if (!file) return "";
  if (file.type === "application/pdf") {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(reader.result),
          }).promise;
          let txt = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            txt += content.items.map((item) => item.str).join(" ") + "\n\n";
          }
          resolve(txt.trim());
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  } else if (file.type.startsWith("image/")) {
    const {
      data: { text },
    } = await Tesseract.recognize(file, "por");
    return text;
  }
  throw new Error("Formato não suportado.");
}

// =========================================================================
// COMPONENTES AUXILIARES
// =========================================================================
const ADAPTATION_OPTIONS = [
  {
    key: "simplificarLinguagem",
    icon: FaLanguage,
    label: "Tornar o Texto Mais Fácil (Simplificação)",
  },
  {
    key: "ajustarFormato",
    icon: FaEye,
    label: "Otimizar Leitura (Fontes, Espaçamento)",
  },
  {
    key: "inserirPictogramas",
    icon: FaUsers,
    label: "Apoio Visual/CAA (Símbolos, Ícones)",
  },
  {
    key: "transformarAvaliacao",
    icon: FaFileAlt,
    label: "Mudar Formato da Atividade (Ex: Quiz)",
  },
];

const BotaoVoltar = React.memo(() => {
  const navigate = useNavigate();
  return (
    <button className="botao-voltar" onClick={() => navigate(-1)}>
      <FaArrowLeft /> Voltar
    </button>
  );
});

const AdaptacaoCard = React.memo(
  ({
    title,
    icon: Icon,
    versionText,
    useBaseHandler,
    finalizarDiretoHandler,
    level,
    salvando,
    handleCopy,
  }) => {
    if (!versionText) return null;
    const previewHtml = DOMPurify.sanitize(
      versionText.substring(0, 500) + "..."
    );

    return (
      <div className={`adaptacao-card level-${level}`}>
        <h4 className="card-title">
          <Icon /> {title}
        </h4>
        <div className="card-preview">
          {level === 3 ? (
            <VisualizadorPictogramas
              texto={versionText.substring(0, 300) + "..."}
            />
          ) : (
            <div
              className="card-preview-content"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </div>
        <div className="card-actions">
          <button
            onClick={() => useBaseHandler(versionText)}
            className="botao-card-usar-base"
            disabled={salvando}
          >
            <FaTools /> Editar
          </button>
          <button
            onClick={() => finalizarDiretoHandler(versionText)}
            className="botao-card-finalizar-direto"
            disabled={salvando}
          >
            <FaCheck /> Salvar
          </button>
          <button
            onClick={() => handleCopy(versionText)}
            className="botao-card-copiar"
            disabled={salvando}
          >
            <FaCopy />
          </button>
        </div>
      </div>
    );
  }
);

// =========================================================================
// COMPONENTE PRINCIPAL
// =========================================================================
export default function EstudioAdaptacaoConteudo() {
  const { alunoId } = useParams();
  const navigate = useNavigate();

  const [erro, setErro] = useState(null);
  const [mensagemSucesso, setMsgSucesso] = useState(null);
  const exibirMensagem = (tipo, msg) => {
    if (tipo === "erro") setErro(msg);
    else setMsgSucesso(msg);
    setTimeout(() => {
      setErro(null);
      setMsgSucesso(null);
    }, 5000);
  };

  const [alunoData, setAlunoData] = useState(null);
  const [dificuldadesChave, setDificuldadesChave] = useState("");
  const [materialOriginal, setMaterialOriginal] = useState("");
  const [materialFinalEditado, setMaterialFinalEditado] = useState("");
  const [inputFile, setInputFile] = useState(null);

  const [versaoNivel1, setVersaoNivel1] = useState(null);
  const [versaoNivel2, setVersaoNivel2] = useState(null);
  const [versaoNivel3, setVersaoNivel3] = useState(null);
  const [versaoNivel4, setVersaoNivel4] = useState(null);
  const [guiaEstrategico, setGuia] = useState(null);

  const [carregandoIA, setCarregandoIA] = useState(false);
  const [processandoArquivo, setProcessandoArquivo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [opcoesAdaptacao, setOpcoesAdaptacao] = useState({
    simplificarLinguagem: true,
    ajustarFormato: false,
    inserirPictogramas: true,
    transformarAvaliacao: false,
  });

  useEffect(() => {
    const loadAluno = async () => {
      if (!alunoId) return;
      try {
        const docSnap = await getDoc(doc(db, "alunos", alunoId));
        if (docSnap.exists()) {
          const d = docSnap.data();
          setAlunoData({
            id: alunoId,
            nome: d.nome,
            laudo: d.laudo || "Não informado",
          });
          setDificuldadesChave(d.dificuldadesChave || "");
        }
      } catch (e) {
        exibirMensagem("erro", "Erro ao carregar aluno.");
      }
    };
    loadAluno();
  }, [alunoId]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setInputFile(file);
    setProcessandoArquivo(true);
    setMaterialOriginal("");
    try {
      const txt = await extractTextFromFile(file);
      setMaterialOriginal(txt);
      exibirMensagem("sucesso", "Texto extraído!");
    } catch (e) {
      exibirMensagem("erro", "Erro ao ler arquivo.");
    } finally {
      setProcessandoArquivo(false);
      e.target.value = null;
    }
  };

  const handleCopy = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt);
      exibirMensagem("sucesso", "Copiado!");
    } catch {
      exibirMensagem("erro", "Erro ao copiar.");
    }
  };

  const handleImprimir = (tipoLayout) => {
    const conteudo = materialFinalEditado;
    if (!conteudo) return exibirMensagem("erro", "Nada para imprimir!");
    const printDiv = document.createElement("div");
    printDiv.id = "area-impressao-temporaria";
    if (tipoLayout === "layout-flashcards") {
      const partes = conteudo.split(/\n+/).filter((p) => p.trim().length > 0);
      printDiv.innerHTML =
        `<div class="${tipoLayout}">` +
        partes.map((p) => `<div>${p}</div>`).join("") +
        `</div>`;
    } else {
      printDiv.className = tipoLayout;
      printDiv.innerHTML = conteudo
        .split("\n")
        .map((p) => `<p>${p}</p>`)
        .join("");
    }
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
  };

  const handleSalvar = async (textoDireto = null) => {
    const final = textoDireto || materialFinalEditado;
    if (!final.trim()) return exibirMensagem("erro", "Texto vazio.");
    setSalvando(true);
    try {
      await addDoc(collection(db, "materiaisAdaptados"), {
        alunoId,
        nomeAluno: alunoData.nome,
        dataCriacao: serverTimestamp(),
        materialOriginal,
        materialFinalEditado: final,
        historico: {
          v1: versaoNivel1,
          v2: versaoNivel2,
          v3: versaoNivel3,
          v4: versaoNivel4,
        },
        opcoes: opcoesAdaptacao,
      });
      exibirMensagem("sucesso", "Material Salvo!");
      setMaterialFinalEditado("");
      setVersaoNivel1(null);
      setInputFile(null);
    } catch (e) {
      exibirMensagem("erro", "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const handleGerar = async () => {
    if (!materialOriginal.trim())
      return exibirMensagem("erro", "Insira um texto.");
    setCarregandoIA(true);
    try {
      const res = await gerarAdaptacaoMaterial({
        texto: materialOriginal,
        laudo: alunoData.laudo,
        dificuldades: dificuldadesChave,
        opcoes: opcoesAdaptacao,
        alunoData,
      });
      setVersaoNivel1(res.versaoNivel1_OriginalSimplificado);
      setVersaoNivel2(res.versaoNivel2_EstruturaOtimizada);
      setVersaoNivel3(res.versaoNivel3_VisualCAA);
      setVersaoNivel4(res.versaoNivel4_Alternativa);
      setGuia(res.guiaEstrategico);
      exibirMensagem("sucesso", "4 Versões Geradas!");
    } catch (e) {
      exibirMensagem("erro", "Erro na IA.");
    } finally {
      setCarregandoIA(false);
    }
  };

  const adaptacaoPronta =
    versaoNivel1 || versaoNivel2 || versaoNivel3 || versaoNivel4;
  const contagemCaracteresFinal = materialFinalEditado.length;
  const contagemPalavrasFinal = materialFinalEditado
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="container-adaptacao">
      <div className="card-header">
        <BotaoVoltar />
        <h1 className="titulo-principal">
          <FaTools /> Estúdio de Adaptação Inteligente
        </h1>
        <button
          className="botao-secundario"
          onClick={() => navigate("/selecionar-aluno-adaptacao")}
        >
          <FaUsers /> Mudar Aluno
        </button>
      </div>

      {erro && (
        <div className="mensagem-erro">
          <FaExclamationTriangle /> {erro}
        </div>
      )}
      {mensagemSucesso && (
        <div className="mensagem-sucesso">
          <FaCheckCircle /> {mensagemSucesso}
        </div>
      )}

      <div className="grid-adaptacao">
        {/* COLUNA ESQUERDA */}
        <div className="painel-contexto">
          <fieldset>
            <legend>Perfil: {alunoData?.nome}</legend>
            <textarea
              value={dificuldadesChave}
              onChange={(e) => setDificuldadesChave(e.target.value)}
              placeholder="Dificuldades do momento..."
              rows="3"
            />
          </fieldset>

          <fieldset disabled={processandoArquivo}>
            <legend>
              <FaFileAlt /> Material Original
            </legend>
            <textarea
              value={materialOriginal}
              onChange={(e) => setMaterialOriginal(e.target.value)}
              placeholder="Cole o texto aqui..."
              rows="10"
            />
            <div className="upload-separator">OU</div>

            {processandoArquivo ? (
              <FaSpinner className="spin-button" />
            ) : (
              <div style={{ marginTop: "10px" }}>
                <input
                  type="file"
                  id="file-upload-fix"
                  style={{ display: "none" }}
                  accept=".pdf, image/*"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="file-upload-fix"
                  className="botao-upload-arquivo"
                >
                  <FaFileUpload style={{ marginRight: "8px" }} />
                  {inputFile ? inputFile.name : "Carregar PDF/Imagem"}
                </label>
              </div>
            )}
          </fieldset>
        </div>

        {/* COLUNA DIREITA */}
        <div className="painel-resultado-completo">
          <fieldset className="fieldset-opcoes">
            <legend>Estratégia Pedagógica</legend>
            <div className="opcoes-grid">
              {ADAPTATION_OPTIONS.map((opt) => (
                <label key={opt.key} className="checkbox-opcao">
                  <input
                    type="checkbox"
                    checked={opcoesAdaptacao[opt.key]}
                    onChange={() =>
                      setOpcoesAdaptacao((prev) => ({
                        ...prev,
                        [opt.key]: !prev[opt.key],
                      }))
                    }
                  />
                  <opt.icon /> {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            className="botao-gerar-adaptacao"
            onClick={handleGerar}
            disabled={carregandoIA}
          >
            {carregandoIA ? (
              <>
                <FaSpinner className="spin-button" /> Criando...
              </>
            ) : (
              <>
                <FaMagic /> Gerar Adaptações
              </>
            )}
          </button>

          {adaptacaoPronta && (
            <div className="adaptacao-grade-container">
              <h3 className="titulo-grade">Versões Sugeridas pela IA</h3>
              <div className="adaptacao-grade">
                <AdaptacaoCard
                  title="Nível 1: Simplificado"
                  icon={FaBookOpen}
                  versionText={versaoNivel1}
                  level={1}
                  useBaseHandler={setMaterialFinalEditado}
                  finalizarDiretoHandler={handleSalvar}
                  handleCopy={handleCopy}
                  salvando={salvando}
                />
                <AdaptacaoCard
                  title="Nível 2: Estruturado"
                  icon={FaListOl}
                  versionText={versaoNivel2}
                  level={2}
                  useBaseHandler={setMaterialFinalEditado}
                  finalizarDiretoHandler={handleSalvar}
                  handleCopy={handleCopy}
                  salvando={salvando}
                />
                <AdaptacaoCard
                  title="Nível 3: Visual/CAA"
                  icon={FaEye}
                  versionText={versaoNivel3}
                  level={3}
                  useBaseHandler={setMaterialFinalEditado}
                  finalizarDiretoHandler={handleSalvar}
                  handleCopy={handleCopy}
                  salvando={salvando}
                />
                <AdaptacaoCard
                  title="Nível 4: Alternativo"
                  icon={FaSitemap}
                  versionText={versaoNivel4}
                  level={4}
                  useBaseHandler={setMaterialFinalEditado}
                  finalizarDiretoHandler={handleSalvar}
                  handleCopy={handleCopy}
                  salvando={salvando}
                />
              </div>
              <div className="guia-estrategico-box">
                <h4>
                  <FaRegLightbulb /> Guia da IA:
                </h4>
                <p>{guiaEstrategico}</p>
              </div>
            </div>
          )}

          {/* 🔥 ÁREA DE EDIÇÃO FINAL (ALINHADA) */}
          <fieldset className="fieldset-edicao-final" disabled={salvando}>
            <legend>
              <FaTools /> Ateliê de Edição Final
            </legend>

            <div className="container-edicao-grid">
              {/* --- COLUNA 1: EDITOR + BARRA DE AÇÕES --- */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <textarea
                  value={materialFinalEditado}
                  onChange={(e) => setMaterialFinalEditado(e.target.value)}
                  placeholder="Selecione uma versão acima para começar..."
                  rows="12"
                  style={{ width: "100%", flex: 1 }}
                />

                <p className="contador-texto">
                  Chars: {contagemCaracteresFinal} | Palavras:{" "}
                  {contagemPalavrasFinal}
                </p>

                {/* ✨ BARRA DE AÇÕES UNIFICADA ✨ */}
                <div className="barra-acoes-footer">
                  {/* Lado Esquerdo: Exportar */}
                  <div className="grupo-exportar">
                    <span className="label-exportar">
                      <FaPrint /> Exportar:
                    </span>
                    <button
                      type="button"
                      className="botao-base"
                      style={{
                        background: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fcd34d",
                      }}
                      onClick={() => handleImprimir("layout-leitura-amigavel")}
                    >
                      <FaFont /> Leitura
                    </button>
                    <button
                      type="button"
                      className="botao-base"
                      style={{
                        background: "#ecfeff",
                        color: "#0e7490",
                        border: "1px solid #67e8f9",
                      }}
                      onClick={() => handleImprimir("layout-flashcards")}
                    >
                      <FaThLarge /> Cards
                    </button>
                  </div>
                  {/* Lado Direito: Salvar (Movido para cá!) */}
                  <button
                    type="button"
                    onClick={() => handleSalvar()}
                    className="botao-salvar-adaptacao"
                    disabled={!materialFinalEditado.trim()}
                  >
                    {salvando ? (
                      <FaSpinner className="spin-button" />
                    ) : (
                      <FaSave />
                    )}{" "}
                    Salvar Final
                  </button>
                </div>
              </div>

              {/* --- COLUNA 2: APENAS O TERMÔMETRO --- */}
              <div>
                <TermometroInclusao texto={materialFinalEditado} />
              </div>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}
