import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef, // Mantido
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
// BotaoVerPEIs removido ❌
import { db, storage } from "../firebase"; // 'storage' reintroduzido
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Mantido
import styled from "styled-components";
import { FaUserCircle, FaPuzzlePiece, FaCamera } from "react-icons/fa"; // Mantido
import "../styles/EditarPei.css"; // Certifique-se de adicionar o CSS aqui

// Importações dos dados (Mantidas)
import estruturaPEI from "../data/estruturaPEI2";
import objetivosCurtoPrazoData from "../data/objetivosCurtoPrazo";
import objetivosMedioPrazoData from "../data/objetivosMedioPrazo";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";

// ✅ NOVAS IMPORTAÇÕES DE IA (Mantidas)
import {
  getSugestaoEstrategiasPEI,
  getSugestaoAtividadePEI,
  getSugestaoAtividadeParaEstrategia,
} from "../services/geminiService";

// --- Funções Auxiliares Comuns (Mantidas) ---
const verificaTea = (diagnostico) => {
  if (!diagnostico) return false;
  const diagnosticoLowerCase = diagnostico.toLowerCase();
  const palavrasChave = ["tea", "autismo", "espectro autista"];
  return palavrasChave.some((palavra) =>
    diagnosticoLowerCase.includes(palavra)
  );
};

// Função para calcular a idade em anos e meses (Mantida)
const calcularIdadeCompleta = (dataNascimentoString) => {
  if (!dataNascimentoString) return "N/A";

  const dataNascimento = new Date(dataNascimentoString);
  const hoje = new Date();

  if (isNaN(dataNascimento)) return "N/A";

  let anos = hoje.getFullYear() - dataNascimento.getFullYear();
  let meses = hoje.getMonth() - dataNascimento.getMonth();

  if (meses < 0 || (meses === 0 && hoje.getDate() < dataNascimento.getDate())) {
    anos--;
    meses = 12 + meses;
  }

  const idadeAnos = Math.floor(anos);
  const idadeMeses = meses;

  let resultado = `${idadeAnos} ano${idadeAnos !== 1 ? "s" : ""}`;
  if (idadeMeses > 0) {
    resultado += ` e ${idadeMeses} mes${idadeMeses !== 1 ? "es" : ""}`;
  }
  return resultado;
};

// FUNÇÃO FALTANTE (Mantida)
function formatarData(data) {
  if (!data) return "-";
  const dateObj =
    typeof data.toDate === "function" ? data.toDate() : new Date(data);
  if (isNaN(dateObj.getTime())) return "-";
  const dia = String(dateObj.getDate()).padStart(2, "0");
  const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
  const ano = dateObj.getFullYear();
  return `${dia}-${mes}-${ano}`;
}

// --- Funções de Mapeamento de Dados (Omitidas para concisão) ---
const getEstruturaPEIMap = (estrutura) => {
  const map = {};
  if (!estrutura) return map;
  Object.entries(estrutura).forEach(([areaName, subareasByArea]) => {
    if (typeof subareasByArea === "object" && subareasByArea !== null) {
      Object.entries(subareasByArea).forEach(
        ([subareaName, habilidadesBySubarea]) => {
          if (
            typeof habilidadesBySubarea === "object" &&
            habilidadesBySubarea !== null
          ) {
            Object.entries(habilidadesBySubarea).forEach(
              ([habilidadeName, niveisData]) => {
                if (!map[habilidadeName]) {
                  map[habilidadeName] = {};
                }
                if (typeof niveisData === "object" && niveisData !== null) {
                  Object.entries(niveisData).forEach(([nivel, data]) => {
                    map[habilidadeName][nivel] = data;
                  });
                }
              }
            );
          }
        }
      );
    }
  });
  return map;
};

const getObjetivosPrazoMap = (prazoData) => {
  const map = {};
  if (!prazoData) return map;
  Object.entries(prazoData).forEach(([areaName, subareasByArea]) => {
    if (typeof subareasByArea === "object" && subareasByArea !== null) {
      Object.entries(subareasByArea).forEach(
        ([subareaName, habilidadesBySubarea]) => {
          if (
            typeof habilidadesBySubarea === "object" &&
            habilidadesBySubarea !== null
          ) {
            Object.entries(habilidadesBySubarea).forEach(
              ([habilidadeName, niveisData]) => {
                if (!map[habilidadeName]) {
                  map[habilidadeName] = {};
                }
                if (typeof niveisData === "object" && niveisData !== null) {
                  Object.entries(niveisData).forEach(([nivel, objData]) => {
                    map[habilidadeName][nivel] = objData.objetivo;
                  });
                }
              }
            );
          }
        }
      );
    }
  });
  return map;
};

const LEGENDA_NIVEIS = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
};

const normalizarEstrategias = (estrategias) => {
  if (Array.isArray(estrategias)) return estrategias;
  if (typeof estrategias === "string" && estrategias) return [estrategias];
  return [];
};

// --- Styled Components (Ajustados) ---
const PhotoWrapper = styled.div`
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 20px;
`;

const UploadButton = styled.button`
  position: absolute;
  bottom: 0;
  right: 0;
  background-color: #457b9d;
  color: white;
  border: 2px solid #f1faee;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: background-color 0.2s;

  &:hover {
    background-color: #1d3557;
  }
`;

const PhotoDisplay = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #1d3557;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.15);
`;

const PhotoPlaceholder = styled(FaUserCircle)`
  width: 100px;
  height: 100px;
  color: #a8dadc;
  font-size: 5em;
  padding: 5px;
  background-color: #f1faee;
  border-radius: 50%;
`;

const AlunoInfoSection = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding-bottom: 20px;
  margin-bottom: 25px;
  border-bottom: 1px solid #e2e8f0;
`;

const AlunoDetailsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding-left: 0px;
  flex-grow: 1;
`;

// Container do topo: ajustado para remover o espaço do BotaoVerPEIs
const CardHeaderTopHarmonizado = styled.div`
  display: flex;
  justify-content: space-between; /* Ajustado para alinhar apenas o BotaoVoltar à esquerda */
  align-items: center;
  margin-bottom: 20px;
`;

function EditarPei() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pei, setPei] = useState(null);
  const [atividadeAplicada, setAtividadeAplicada] = useState("");
  const [entradaManual, setEntradaManual] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [areaAtiva, setAreaAtiva] = useState("");
  const [activeTab, setActiveTab] = useState("longoPrazo");
  const [objetivosSelecionados, setObjetivosSelecionados] = useState({});

  // ESTADOS DE FOTO E UPLOAD: Mantidos
  const [novaFotoArquivo, setNovaFotoArquivo] = useState(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState("");
  const fileInputRef = useRef(null);

  // ESTADOS DE DETALHES DO ALUNO: MANTIDO
  const [alunoDetalhes, setAlunoDetalhes] = useState(null);

  // ✅ NOVOS ESTADOS PARA A IA (Mantidos)
  const [estrategiasIA, setEstrategiasIA] = useState({});
  const [carregandoIA, setCarregandoIA] = useState(null);
  const [sugestoesAtividadesIndividuais, setSugestoesAtividadesIndividuais] =
    useState({});
  const [carregandoAtividadeIndividual, setCarregandoAtividadeIndividual] =
    useState({});

  const usuarioLogado = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usuarioLogado")) || {};
    } catch (e) {
      console.error("Erro ao fazer parse do usuário logado:", e);
      return {};
    }
  }, []);

  const estruturaPEIMap = useMemo(() => getEstruturaPEIMap(estruturaPEI), []);
  const objetivosCurtoPrazoMap = useMemo(
    () => getObjetivosPrazoMap(objetivosCurtoPrazoData),
    []
  );
  const objetivosMedioPrazoMap = useMemo(
    () => getObjetivosPrazoMap(objetivosMedioPrazoData),
    []
  );

  const todasAsAreas = useMemo(() => Object.keys(avaliacaoInicial), []);

  const estrategiasSelecionadas = useMemo(() => {
    const todasEstrategias = new Set();
    if (!pei || !entradaManual) return [];

    const resumoPei = pei.resumoPEI || {};

    Object.entries(resumoPei).forEach(([area, metas]) => {
      metas.forEach((meta) => {
        const manualKey = `${area}-${meta.habilidade.replace(
          /[^a-zA-Z0-9-]/g,
          ""
        )}`;
        const manualData = entradaManual[manualKey] || {};
        if (manualData.estrategias) {
          manualData.estrategias.forEach((est) => todasEstrategias.add(est));
        }
        if (manualData.estrategiasManuais) {
          manualData.estrategiasManuais.split("\n").forEach((est) => {
            if (est.trim()) todasEstrategias.add(est.trim());
          });
        }
      });
    });
    return Array.from(todasEstrategias);
  }, [pei, entradaManual]);

  // Função para buscar detalhes do aluno (Mantida)
  const buscarDetalhesDoAluno = useCallback(
    async (alunoId) => {
      if (!alunoId) return;
      try {
        const alunoDocRef = doc(db, "alunos", alunoId);
        const alunoDocSnap = await getDoc(alunoDocRef);
        if (alunoDocSnap.exists()) {
          const data = alunoDocSnap.data();
          setAlunoDetalhes(data);
          setFotoPreviewUrl(data.fotoUrl || "");
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes do aluno:", error);
      }
    },
    [setFotoPreviewUrl]
  );

  const carregarPei = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const ref = doc(db, "peis", id);
      const docSnap = await getDoc(ref);
      if (!docSnap.exists()) {
        setErro("PEI não encontrado.");
        return;
      }
      const dados = docSnap.data();
      const alunoId = dados.alunoId;
      const currentYear = new Date().getFullYear();

      // CHAMA A FUNÇÃO DE BUSCA DE DETALHES DO ALUNO
      await buscarDetalhesDoAluno(alunoId);

      const qPrimeiroPeiDoAluno = query(
        collection(db, "peis"),
        where("alunoId", "==", alunoId),
        where("anoLetivo", "==", currentYear),
        orderBy("dataCriacao", "asc"),
        limit(1)
      );
      const primeiroPeiSnap = await getDocs(qPrimeiroPeiDoAluno);
      const primeiroPeiDoAluno = !primeiroPeiSnap.empty
        ? primeiroPeiSnap.docs[0].data()
        : null;

      const qTodosPeisDoAluno = query(
        collection(db, "peis"),
        where("alunoId", "==", alunoId),
        where("anoLetivo", "==", currentYear)
      );
      const todosPeisDoAlunoSnap = await getDocs(qTodosPeisDoAluno);
      const estrategiasJaEmUsoGlobalmente = new Set();
      todosPeisDoAlunoSnap.docs.forEach((doc) => {
        const peiData = doc.data();
        if (Array.isArray(peiData.resumoPEI)) {
          peiData.resumoPEI.forEach((meta) => {
            if (Array.isArray(meta.estrategiasSelecionadas)) {
              meta.estrategiasSelecionadas.forEach((estrat) =>
                estrategiasJaEmUsoGlobalmente.add(estrat)
              );
            }
          });
        }
      });

      const metasDoProfessor = dados.resumoPEI || [];
      const metasDoPeiBase = primeiroPeiDoAluno?.resumoPEI || [];

      const todasAsHabilidades = new Set(
        [...metasDoProfessor, ...metasDoPeiBase].map((m) => m.habilidade)
      );

      const peiAgrupadoPorArea = {};
      const objetivosParaSelecao = {};
      const entradaInicial = {};

      todasAsHabilidades.forEach((habilidade) => {
        const metaDoProfessor = metasDoProfessor.find(
          (m) => m.habilidade === habilidade
        );
        const metaDoPeiBase = metasDoPeiBase.find(
          (m) => m.habilidade === habilidade
        );
        const metaPrincipal = metaDoProfessor || metaDoPeiBase;
        if (!metaPrincipal) return;

        const area = metaPrincipal.area;
        const manualKey = `${area}-${habilidade.replace(/[^a-zA-Z0-9-]/g, "")}`;
        const estrategiasSalvas = normalizarEstrategias(
          metaDoProfessor?.estrategiasSelecionadas ||
            metaDoProfessor?.estrategias ||
            []
        );
        const suggestedStrategiesFromMap = normalizarEstrategias(
          estruturaPEIMap[habilidade]?.[metaPrincipal.nivelAlmejado]
            ?.estrategias
        );
        const selectedStrategiesForThisPei = new Set(estrategiasSalvas);
        const availableSuggestedStrategies = suggestedStrategiesFromMap.filter(
          (estrat) =>
            !estrategiasJaEmUsoGlobalmente.has(estrat) ||
            selectedStrategiesForThisPei.has(estrat)
        );
        const selectedSuggestedFromSaved = estrategiasSalvas.filter((saved) =>
          suggestedStrategiesFromMap.includes(saved)
        );
        const manualSavedStrategies = estrategiasSalvas.filter(
          (saved) => !suggestedStrategiesFromMap.includes(saved)
        );
        const objetivosBase = metaDoPeiBase?.objetivos || {
          longoPrazo: metaDoPeiBase?.objetivo || "",
          curtoPrazo:
            objetivosCurtoPrazoMap[habilidade]?.[
              metaDoPeiBase?.nivelAlmejado
            ] || "",
          medioPrazo:
            objetivosMedioPrazoMap[habilidade]?.[
              metaDoPeiBase?.nivelAlmejado
            ] || "",
        };
        const objetivosDoProfessor = metaDoProfessor?.objetivos || {
          curtoPrazo:
            objetivosCurtoPrazoMap[habilidade]?.[metaPrincipal.nivelAlmejado] ||
            "",
          medioPrazo:
            objetivosMedioPrazoMap[habilidade]?.[metaPrincipal.nivelAlmejado] ||
            "",
          longoPrazo:
            estruturaPEIMap[habilidade]?.[metaPrincipal.nivelAlmejado]
              ?.objetivo || "",
        };
        const todosOsObjetivosDestaMeta = {
          curtoPrazo: Array.from(
            new Set([objetivosDoProfessor.curtoPrazo, objetivosBase.curtoPrazo])
          ).filter(Boolean),
          medioPrazo: Array.from(
            new Set([objetivosDoProfessor.medioPrazo, objetivosBase.medioPrazo])
          ).filter(Boolean),
          longoPrazo: Array.from(
            new Set([objetivosDoProfessor.longoPrazo, objetivosBase.longoPrazo])
          ).filter(Boolean),
        };

        objetivosParaSelecao[manualKey] = {
          curtoPrazo: Array.from(
            new Set([objetivosDoProfessor.curtoPrazo])
          ).filter(Boolean),
          medioPrazo: Array.from(
            new Set([objetivosDoProfessor.medioPrazo])
          ).filter(Boolean),
          longoPrazo: Array.from(
            new Set([objetivosDoProfessor.longoPrazo])
          ).filter(Boolean),
        };
        if (!peiAgrupadoPorArea[area]) {
          peiAgrupadoPorArea[area] = [];
        }
        peiAgrupadoPorArea[area].push({
          ...metaPrincipal,
          objetivos: todosOsObjetivosDestaMeta,
          estrategias: availableSuggestedStrategies,
          estrategiasSelecionadas: estrategiasSalvas,
        });
        entradaInicial[manualKey] = {
          estrategias: selectedSuggestedFromSaved,
          estrategiasManuais: manualSavedStrategies.join("\n"),
        };
      });

      setPei({ id, ...dados, resumoPEI: peiAgrupadoPorArea });
      setAtividadeAplicada(dados.atividadeAplicada || "");
      setEntradaManual(entradaInicial);
      setObjetivosSelecionados(objetivosParaSelecao);

      const primeiraArea = Object.keys(peiAgrupadoPorArea)[0];
      if (primeiraArea) {
        setAreaAtiva(primeiraArea);
      }
    } catch (error) {
      console.error("Erro ao carregar PEI:", error);
      setErro("Erro ao carregar dados do PEI. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [
    id,
    estruturaPEIMap,
    objetivosCurtoPrazoMap,
    objetivosMedioPrazoMap,
    buscarDetalhesDoAluno,
  ]);

  useEffect(() => {
    if (id) {
      carregarPei();
    } else {
      setErro("ID do PEI não fornecido.");
      setCarregando(false);
    }
  }, [id, carregarPei]);

  // FUNÇÕES DE MANIPULAÇÃO DE FOTO: Mantidas
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNovaFotoArquivo(file);
      // Cria URL de visualização local para o usuário
      const fileUrl = URL.createObjectURL(file);
      setFotoPreviewUrl(fileUrl);
    } else {
      setNovaFotoArquivo(null);
      // Volta para o URL original do aluno se a seleção for cancelada
      setFotoPreviewUrl(alunoDetalhes?.fotoUrl || "");
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current.click();
  };

  // Função para upload de foto (usada dentro do handleSalvar)
  const uploadNovaFoto = async (alunoId, fotoFile) => {
    if (!fotoFile || !alunoId) return alunoDetalhes?.fotoUrl || "";

    const storageRef = ref(storage, `fotos-alunos/${alunoId}`);
    try {
      const snapshot = await uploadBytes(storageRef, fotoFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      setErro("Erro ao fazer upload da foto. O PEI não foi salvo.");
      throw new Error("Falha no upload da foto."); // Propaga o erro para impedir o salvamento
    }
  };

  // ✅ NOVAS FUNÇÕES: Chamadas de API para a IA (Mantidas)
  const handleGerarEstrategiasIA = async (meta, area, manualKey) => {
    if (!alunoDetalhes) return setErro("Detalhes do aluno não carregados.");
    setCarregandoIA(manualKey);
    try {
      const novasEstrategias = await getSugestaoEstrategiasPEI(
        alunoDetalhes,
        meta,
        area
      );
      setEstrategiasIA((prev) => ({
        ...prev,
        [manualKey]: [...(prev[manualKey] || []), ...novasEstrategias],
      }));
    } catch (error) {
      setErro(`IA Error: ${error.message}`);
    } finally {
      setCarregandoIA(null);
    }
  };

  const handleGerarAtividadeIndividual = async (estrategia) => {
    if (!alunoDetalhes) return;

    const keyTexto =
      typeof estrategia === "string" ? estrategia : estrategia.titulo;

    // Lógica de cache/re-exibição
    if (sugestoesAtividadesIndividuais[estrategia]?.lista?.length > 0) {
      const listaExistente = sugestoesAtividadesIndividuais[estrategia].lista;
      const novaSugestao =
        listaExistente[Math.floor(Math.random() * listaExistente.length)];
      setSugestoesAtividadesIndividuais((prev) => ({
        ...prev,
        [estrategia]: { ...prev[estrategia], exibida: novaSugestao },
      }));
      return;
    }

    setCarregandoAtividadeIndividual((prev) => ({
      ...prev,
      [estrategia]: true,
    }));
    try {
      const listaDeSugestoes = await getSugestaoAtividadeParaEstrategia(
        alunoDetalhes,
        estrategia,
        usuarioLogado.cargo
      );

      const primeiraSugestao =
        listaDeSugestoes[Math.floor(Math.random() * listaDeSugestoes.length)];

      setSugestoesAtividadesIndividuais((prev) => ({
        ...prev,
        [estrategia]: {
          lista: listaDeSugestoes,
          exibida: primeiraSugestao,
        },
      }));
    } catch (error) {
      setErro(`IA Error: ${error.message}`);
    } finally {
      setCarregandoAtividadeIndividual((prev) => ({
        ...prev,
        [estrategia]: false,
      }));
    }
  };

  const handleIncluirAtividade = (textoParaIncluir) => {
    setAtividadeAplicada((prev) =>
      prev ? `${prev}\n\n- ${textoParaIncluir}` : `- ${textoParaIncluir}`
    );
  };

  const handleSalvar = async () => {
    if (!pei) return alert("Não há dados do PEI para salvar.");
    setCarregando(true);
    setErro(null);
    try {
      // 1. Upload da Nova Foto
      let novaFotoUrl = alunoDetalhes?.fotoUrl || "";
      if (novaFotoArquivo && pei.alunoId) {
        novaFotoUrl = await uploadNovaFoto(pei.alunoId, novaFotoArquivo);
      }

      // 2. Processamento do Resumo PEI (Mantido)
      const resumoAtualizado = Object.values(pei.resumoPEI).flatMap((metas) =>
        metas.map((meta) => {
          const manualKey = meta.area
            ? `${meta.area}-${meta.habilidade.replace(/[^a-zA-Z0-9-]/g, "")}`
            : meta.habilidade.replace(/[^a-zA-Z0-9-]/g, "");
          const entrada = entradaManual[manualKey] || {};
          const objetivosSelecionadosParaMeta =
            objetivosSelecionados[manualKey] || {};
          const estrategiasSelecionadas = entrada.estrategias || [];
          const estrategiasManuaisNovas = (entrada.estrategiasManuais || "")
            .split("\n")
            .map((e) => e.trim())
            .filter(Boolean);
          const todasEstrategias = [
            ...new Set([
              ...estrategiasSelecionadas,
              ...estrategiasManuaisNovas,
            ]),
          ].filter((e) => typeof e === "string" && e.trim() !== "");
          return {
            ...meta,
            objetivos: {
              curtoPrazo: objetivosSelecionadosParaMeta.curtoPrazo?.[0] || "",
              medioPrazo: objetivosSelecionadosParaMeta.medioPrazo?.[0] || "",
              longoPrazo: objetivosSelecionadosParaMeta.longoPrazo?.[0] || "",
            },
            estrategiasSelecionadas: todasEstrategias,
          };
        })
      );

      // 3. Preparar dados de revisão (Mantido)
      const mesAtual = new Date().getMonth();
      const semestreAtual =
        mesAtual < 6 ? "primeiroSemestre" : "segundoSemestre";

      const dadosDaRevisao = {
        status: "Concluído",
        dataRevisao: serverTimestamp(),
        revisadoPor: usuarioLogado.uid,
      };

      // 4. Atualizar o Documento PEI (Mantido)
      const dadosParaAtualizar = {
        resumoPEI: resumoAtualizado,
        atividadeAplicada: atividadeAplicada,
        dataUltimaRevisao: serverTimestamp(),
        [`revisoes.${semestreAtual}`]: dadosDaRevisao,
      };

      await updateDoc(doc(db, "peis", id), dadosParaAtualizar);

      // 5. Atualizar o Documento do Aluno com a nova fotoUrl
      if (novaFotoUrl !== alunoDetalhes?.fotoUrl) {
        await updateDoc(doc(db, "alunos", pei.alunoId), {
          fotoUrl: novaFotoUrl,
        });
      }

      alert("PEI atualizado com sucesso! 🎉");
      navigate("/ver-peis");
    } catch (error) {
      console.error("Erro ao salvar PEI:", error);
      if (!erro) setErro("Erro ao salvar o PEI. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const handleRemoverMeta = (habilidadeMetaRemover) => {
    // Lógica de remoção de meta (Mantida)
    if (
      window.confirm(
        `Tem certeza que deseja remover a meta "${habilidadeMetaRemover}"?`
      )
    ) {
      setPei((prevPei) => {
        if (!prevPei) return null;
        const novasAreas = { ...prevPei.resumoPEI };
        let metaRemovida = false;
        let metaRemovidaArea = null;

        for (const area in novasAreas) {
          const metasDaArea = novasAreas[area];
          const novaListaMetas = metasDaArea.filter(
            (meta) => meta.habilidade !== habilidadeMetaRemover
          );
          if (novaListaMetas.length !== metasDaArea.length) {
            novasAreas[area] = novaListaMetas;
            metaRemovida = true;
            metaRemovidaArea = area;
            break;
          }
        }

        if (!metaRemovida) return prevPei;

        // Limpar estados manuais e de objetivos
        const novaEntradaManual = { ...entradaManual };
        const novaObjetivosSelecionados = { ...objetivosSelecionados };
        const manualKey = `${metaRemovidaArea}-${habilidadeMetaRemover.replace(
          /[^a-zA-Z0-9-]/g,
          ""
        )}`;
        delete novaEntradaManual[manualKey];
        delete novaObjetivosSelecionados[manualKey];
        setEntradaManual(novaEntradaManual);
        setObjetivosSelecionados(novaObjetivosSelecionados);

        return { ...prevPei, resumoPEI: novasAreas };
      });
    }
  };

  const handleCheckboxChange = (manualKey, estrategia, estaMarcado) => {
    // Lógica de checkbox (Mantida)
    setEntradaManual((prev) => {
      const estrategiasAtuais = prev[manualKey]?.estrategias || [];
      const novasEstrategias = estaMarcado
        ? [...estrategiasAtuais, estrategia]
        : estrategiasAtuais.filter((est) => est !== estrategia);
      return {
        ...prev,
        [manualKey]: { ...prev[manualKey], estrategias: novasEstrategias },
      };
    });
  };

  const handleObjetivoChange = (manualKey, prazo, objetivo, estaMarcado) => {
    // Lógica de objetivo (Mantida)
    setObjetivosSelecionados((prev) => {
      const objetivosDoPrazo = prev[manualKey]?.[prazo] || [];
      const novosObjetivosDoPrazo = estaMarcado
        ? [objetivo] // Apenas um objetivo pode ser selecionado por prazo
        : objetivosDoPrazo.filter((obj) => obj !== objetivo);

      return {
        ...prev,
        [manualKey]: {
          ...prev[manualKey],
          [prazo]: novosObjetivosDoPrazo,
        },
      };
    });
  };

  // Montar informações principais do aluno para a UI (Ajustado)
  const alunoNome = pei?.aluno || alunoDetalhes?.nome || "Aluno Desconhecido";
  const alunoTurma = pei?.turma || alunoDetalhes?.turma || "N/A";
  // Usa o URL de preview (se houver upload) ou o URL original do Firebase.
  const alunoFotoUrl = fotoPreviewUrl || alunoDetalhes?.fotoUrl || "";
  const alunoTea =
    alunoDetalhes?.diagnostico && verificaTea(alunoDetalhes.diagnostico);
  const idadeExibicao = calcularIdadeCompleta(alunoDetalhes?.nascimento);

  if (carregando && !alunoDetalhes)
    return (
      <div className="estado-container">
        <p>Carregando PEI...</p>
      </div>
    );
  if (erro && !alunoDetalhes)
    return (
      <div className="estado-container">
        <p className="mensagem-erro">{erro}</p>
        <BotaoVoltar />
      </div>
    );
  if (!pei || !pei.resumoPEI || Object.keys(pei.resumoPEI).length === 0)
    return (
      <div className="estado-container">
        <p>Nenhum PEI carregado ou encontrado para edição.</p>
        <BotaoVoltar />
      </div>
    );

  const estilos = {
    areaButton: {
      padding: "10px 18px",
      borderRadius: "20px",
      border: "none",
      margin: "4px",
      backgroundColor: "#e0e0e0",
      color: "#333",
      cursor: "pointer",
      transition: "all 0.3s",
    },
    areaButtonAtiva: {
      backgroundColor: "#1d3557",
      color: "white",
      fontWeight: "bold",
    },
  };

  const metasDaAreaAtiva = pei.resumoPEI[areaAtiva] || [];

  return (
    <div className="editar-pei-fundo">
      <div className="editar-pei-card">
        {/* --- INÍCIO DO HEADER SIMPLIFICADO --- */}
        <CardHeaderTopHarmonizado>
          <BotaoVoltar />
          {/* ❌ Escola Ativa Removida */}
          {/* ❌ BotaoVerPEIs Removido */}
        </CardHeaderTopHarmonizado>
        {/* --- FIM DO HEADER SIMPLIFICADO --- */}

        {/* --- BLOCO: FOTO E DETALHES DO ALUNO (Mantido com a lógica de foto) --- */}
        <AlunoInfoSection>
          {/* FOTO (Visualização e UPLOAD) */}
          <PhotoWrapper>
            {alunoFotoUrl ? (
              <PhotoDisplay src={alunoFotoUrl} alt={`Foto de ${alunoNome}`} />
            ) : (
              <PhotoPlaceholder />
            )}
            {/* Input de arquivo Oculto */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFotoChange}
              style={{ display: "none" }}
              accept="image/*"
              disabled={carregando}
            />
            {/* Botão de Upload */}
            <UploadButton
              onClick={handleUploadButtonClick}
              title="Mudar foto do aluno"
              disabled={carregando}
            >
              <FaCamera style={{ fontSize: "0.8em" }} />
            </UploadButton>
          </PhotoWrapper>

          {/* DETALHES */}
          <AlunoDetailsWrapper>
            <h2 className="aluno-nome-header">
              {alunoNome}
              {alunoTea && (
                <FaPuzzlePiece
                  style={{ color: "#29ABE2", marginLeft: "10px" }}
                  title="Aluno com TEA"
                />
              )}
            </h2>
            <p className="aluno-detail-item">
              <strong>Turma:</strong> {alunoTurma}
            </p>
            <p className="aluno-detail-item">
              <strong>Idade:</strong> {idadeExibicao}
            </p>
            <p className="aluno-detail-item">
              <strong>Início PEI:</strong> {formatarData(pei.dataCriacao)}
            </p>
            {/* Mensagem de nova foto */}
            {novaFotoArquivo && (
              <p
                className="info-text"
                style={{ color: "#2a9d8f", fontWeight: "bold" }}
              >
                Nova foto pronta para ser salva!
              </p>
            )}
          </AlunoDetailsWrapper>
        </AlunoInfoSection>
        {/* --- FIM DO BLOCO FOTO/DETALHES --- */}

        {erro && <div className="mensagem-erro">{erro}</div>}

        {/* Área de botões e conteúdo (Mantida) */}
        <div className="area-buttons-container">
          {todasAsAreas.map((area) => (
            <button
              key={area}
              onClick={() => {
                setAreaAtiva(area);
                setActiveTab("longoPrazo");
              }}
              style={{
                ...estilos.areaButton,
                ...(areaAtiva === area && estilos.areaButtonAtiva),
              }}
              aria-current={areaAtiva === area ? "true" : "false"}
            >
              {area}
            </button>
          ))}
          <button
            onClick={() => setAreaAtiva("atividadeAplicada")}
            style={{
              ...estilos.areaButton,
              ...(areaAtiva === "atividadeAplicada" && estilos.areaButtonAtiva),
            }}
          >
            Atividade Aplicada
          </button>
        </div>

        {areaAtiva && areaAtiva !== "atividadeAplicada" && (
          <div className="tab-buttons-container">
            <button
              onClick={() => setActiveTab("curtoPrazo")}
              style={{
                ...estilos.areaButton,
                ...(activeTab === "curtoPrazo" && estilos.areaButtonAtiva),
              }}
            >
              Curto Prazo
            </button>
            <button
              onClick={() => setActiveTab("medioPrazo")}
              style={{
                ...estilos.areaButton,
                ...(activeTab === "medioPrazo" && estilos.areaButtonAtiva),
              }}
            >
              Médio Prazo
            </button>
            <button
              onClick={() => setActiveTab("longoPrazo")}
              style={{
                ...estilos.areaButton,
                ...(activeTab === "longoPrazo" && estilos.areaButtonAtiva),
              }}
            >
              Longo Prazo
            </button>
          </div>
        )}

        {/* Seção de Conteúdo (Mantida) */}
        {areaAtiva === "atividadeAplicada" ? (
          <article className="meta-card">
            {/* ... Conteúdo de Atividade Aplicada (Mantido) ... */}
            <h3 className="meta-card-titulo">Brainstorm de Atividades</h3>
            <p className="info-text">
              Gere ideias para cada estratégia selecionada e depois inclua as
              melhores na sua atividade final.
            </p>
            <div className="lista-brainstorm">
              {estrategiasSelecionadas.length > 0 ? (
                estrategiasSelecionadas.map((estrategia, index) => (
                  <div key={index} className="item-brainstorm">
                    <p className="estrategia-texto">
                      <strong>Estratégia:</strong> {estrategia}
                    </p>
                    <button
                      className="botao-ia-pequeno"
                      onClick={() => handleGerarAtividadeIndividual(estrategia)}
                      disabled={carregandoAtividadeIndividual[estrategia]}
                    >
                      {carregandoAtividadeIndividual[estrategia]
                        ? "Gerando..."
                        : "Gerar Sugestão 💡"}
                    </button>
                    {sugestoesAtividadesIndividuais[estrategia]?.exibida && (
                      <div className="sugestao-individual-container">
                        <textarea
                          className="textarea-sugestao"
                          rows="3"
                          value={
                            sugestoesAtividadesIndividuais[estrategia].exibida
                          }
                          readOnly
                        />
                        <button
                          className="botao-incluir"
                          onClick={() =>
                            handleIncluirAtividade(
                              sugestoesAtividadesIndividuais[estrategia].exibida
                            )
                          }
                        >
                          + Incluir na Atividade
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p>
                  Nenhuma estratégia foi selecionada ainda. Volte para as áreas
                  e escolha algumas.
                </p>
              )}
            </div>
            <label
              htmlFor="atividade-aplicada"
              className="label-estrategias-manuais"
            >
              Descrição da Atividade Aplicada Final:
            </label>
            <textarea
              id="atividade-aplicada"
              value={atividadeAplicada}
              onChange={(e) => setAtividadeAplicada(e.target.value)}
              className="textarea-pei"
              rows={8}
              placeholder="As sugestões incluídas aparecerão aqui..."
            />
          </article>
        ) : (
          <div className="section-content">
            {metasDaAreaAtiva.length > 0 ? (
              metasDaAreaAtiva.map((meta) => {
                const manualKey = `${areaAtiva}-${meta.habilidade.replace(
                  /[^a-zA-Z0-9-]/g,
                  ""
                )}`;
                const entrada = entradaManual[manualKey] || {};

                const strategiesFromManual = entrada.estrategiasManuais
                  ? entrada.estrategiasManuais
                      .split("\n")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0)
                  : [];
                const strategiesToDisplay = Array.from(
                  new Set([
                    ...(meta.estrategias || []),
                    // Mapeia os objetos da IA para extrair apenas o título (string)
                    ...(estrategiasIA[manualKey] || []).map(
                      (est) => est.titulo
                    ),
                    ...(entrada.estrategias || []),
                    ...strategiesFromManual,
                  ])
                ).filter(
                  (s) => s && typeof s === "string" && s.trim().length > 0
                );
                const estrategiasAtuaisSelecionadas = normalizarEstrategias(
                  entrada.estrategias || []
                );

                let objetivosDoPrazo = meta.objetivos?.[activeTab] || [];
                let objetivosSelecionadosDoEstado =
                  objetivosSelecionados[manualKey]?.[activeTab] || [];

                return (
                  <article key={meta.habilidade} className="meta-card">
                    <div className="meta-header">
                      <h3 className="meta-card-titulo">{meta.habilidade}</h3>
                      <button
                        onClick={() => handleRemoverMeta(meta.habilidade)}
                        className="botao-remover"
                        disabled={carregando}
                      >
                        Remover
                      </button>
                    </div>
                    <p>
                      <strong>Nível atual:</strong> {meta.nivel} —{" "}
                      {LEGENDA_NIVEIS[meta.nivel] || meta.nivel}
                    </p>
                    <p>
                      <strong>Nível almejado:</strong> {meta.nivelAlmejado} —{" "}
                      {LEGENDA_NIVEIS[meta.nivelAlmejado] || meta.nivelAlmejado}
                    </p>
                    <fieldset className="meta-fieldset">
                      <legend className="meta-legend">Objetivos:</legend>
                      {objetivosDoPrazo.length > 0 ? (
                        objetivosDoPrazo.map((objetivo, i) => (
                          <label
                            key={`obj-${objetivo}-${i}`}
                            className="checkbox-container"
                          >
                            <input
                              type="checkbox"
                              id={`obj-${manualKey}-${activeTab}-${i}`}
                              checked={objetivosSelecionadosDoEstado.includes(
                                objetivo
                              )}
                              disabled={carregando}
                              onChange={(e) =>
                                handleObjetivoChange(
                                  manualKey,
                                  activeTab,
                                  objetivo,
                                  e.target.checked
                                )
                              }
                              className="checkbox-input"
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-label">{objetivo}</span>
                          </label>
                        ))
                      ) : (
                        <p className="info-text">
                          Nenhum objetivo para este prazo.
                        </p>
                      )}
                    </fieldset>

                    <fieldset className="meta-fieldset">
                      <legend className="meta-legend">Estratégias:</legend>
                      {strategiesToDisplay.length > 0 ? (
                        strategiesToDisplay.map((estrategia, i) => (
                          <label
                            key={`${estrategia}-${i}`}
                            className="checkbox-container"
                          >
                            <input
                              type="checkbox"
                              id={`estrategia-${meta.habilidade}-${i}`}
                              checked={estrategiasAtuaisSelecionadas.includes(
                                estrategia
                              )}
                              disabled={carregando}
                              onChange={(e) =>
                                handleCheckboxChange(
                                  manualKey,
                                  estrategia,
                                  e.target.checked
                                )
                              }
                              className="checkbox-input"
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-label">{estrategia}</span>
                          </label>
                        ))
                      ) : (
                        <p className="info-text">
                          Nenhuma estratégia sugerida disponível para seleção
                          nesta meta.
                        </p>
                      )}

                      {/* ✅ NOVO: Botão para gerar estratégias com IA */}
                      <div className="ia-sugestao-container">
                        <button
                          className="botao-ia"
                          onClick={() =>
                            handleGerarEstrategiasIA(meta, areaAtiva, manualKey)
                          }
                          disabled={carregandoIA === manualKey}
                        >
                          {carregandoIA === manualKey
                            ? "Gerando..."
                            : "Sugerir Estratégias com IA 💡"}
                        </button>
                      </div>

                      <label
                        htmlFor={`estrategias-manuais-${meta.habilidade}`}
                        className="label-estrategias-manuais"
                      >
                        Adicionar estratégias personalizadas (uma por linha):
                      </label>
                      <textarea
                        id={`estrategias-manuais-${meta.habilidade}`}
                        value={entrada.estrategiasManuais || ""}
                        disabled={carregando}
                        onChange={(e) =>
                          setEntradaManual((prev) => ({
                            ...prev,
                            [manualKey]: {
                              ...prev[manualKey],
                              estrategiasManuais: e.target.value,
                            },
                          }))
                        }
                        className="textarea-pei"
                        rows={3}
                        placeholder="Ex: Utilizar reforçador visual a cada 5 segundos de atenção."
                      />
                    </fieldset>
                  </article>
                );
              })
            ) : (
              <p className="info-text">Nenhuma meta de PEI para esta área.</p>
            )}
          </div>
        )}

        <button
          onClick={handleSalvar}
          className="botao-salvar"
          disabled={carregando}
        >
          {carregando ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}

export default EditarPei;
