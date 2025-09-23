import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const CACHE_VERSION = "v7"; // ATUALIZADO: Versão do Cache para depuração final.

// Função que processa UMA atividade a partir de um texto
function parseAtividadeFromText(textResponse) {
  if (!textResponse) return null;

  const atividade = {};
  const lines = textResponse.split("\n");
  let currentKey = null;
  let contentBuffer = [];

  const keyMapping = {
    título: "titulo",
    objetivos: "objetivos",
    recursos: "recursos",
    metodologia: "metodologia",
    duração: "duracao",
    "duração estimada": "duracao",
  };

  lines.forEach((line) => {
    const lowerLine = line.toLowerCase();
    let foundKey = null;

    for (const term in keyMapping) {
      if (lowerLine.startsWith(term + ":")) {
        foundKey = keyMapping[term];
        break;
      }
    }

    if (foundKey) {
      if (currentKey && contentBuffer.length > 0) {
        if (currentKey === "objetivos") {
          atividade[currentKey] = contentBuffer
            .map((item) => item.replace(/^- /, "").trim())
            .filter(Boolean);
        } else {
          atividade[currentKey] = contentBuffer.join("\n").trim();
        }
      }
      currentKey = foundKey;
      contentBuffer = [line.substring(line.indexOf(":") + 1).trim()];
    } else if (currentKey) {
      contentBuffer.push(line);
    }
  });

  if (currentKey && contentBuffer.length > 0) {
    if (currentKey === "objetivos") {
      atividade[currentKey] = contentBuffer
        .map((item) => item.replace(/^- /, "").trim())
        .filter(Boolean);
    } else {
      atividade[currentKey] = contentBuffer.join("\n").trim();
    }
  }

  if (atividade.titulo && atividade.objetivos && atividade.recursos) {
    return atividade;
  }

  return null;
}

// Função que processa MÚLTIPLAS atividades a partir de um texto
function parseMultiplasAtividadesFromText(textResponse) {
  if (!textResponse) return [];
  const sugestoesSeparadas = textResponse.split("---NOVA SUGESTAO---");
  return sugestoesSeparadas
    .map((sugestaoText) => parseAtividadeFromText(sugestaoText.trim()))
    .filter(Boolean);
}

// Função de chamada da IA com lógica de cache e depuração aprimoradas
async function buscarSugestoesComIA_REAL(
  tipo,
  habilidadeObj = {},
  idadeAluno = null,
  aluno,
  forceRefresh = false
) {
  console.log("--- INICIANDO BUSCA DE SUGESTÕES ---");
  console.log("Tipo:", tipo, "| Forçar Atualização:", forceRefresh);
  console.log(
    "Habilidade Recebida:",
    habilidadeObj ? JSON.parse(JSON.stringify(habilidadeObj)) : habilidadeObj
  );

  let habilidadeTexto = "";
  let habilidadeId = "";

  // A verificação de validade agora está na função getSugestoes, que é a porta de entrada.
  // Aqui, assumimos que os dados já foram validados.
  if (tipo === "atividadePrincipal") {
    habilidadeTexto = habilidadeObj.habilidade || "";
    habilidadeId = habilidadeObj.id;
  }

  // Chave de cache ultra específica, incluindo a idade do aluno.
  const idadeCache = idadeAluno || "geral";
  const baseCacheKey = `${CACHE_VERSION}-${tipo}-${
    aluno?.diagnostico || "generico"
  }-${idadeCache}`;
  const cacheKey = (
    tipo === "atividadePrincipal"
      ? `${baseCacheKey}-${habilidadeId}`
      : baseCacheKey
  )
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "_");

  console.log("Chave de Cache Gerada:", cacheKey);

  const cacheRef = doc(db, "geminiCache", cacheKey);

  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        console.log(
          `%cCACHE HIT! para: ${cacheKey}`,
          "color: green; font-weight: bold;"
        );
        const cachedResponse = cacheSnap.data().response;
        if (cachedResponse && cachedResponse.length > 10) {
          console.log(
            `%cCACHE VÁLIDO! Entregando resposta salva.`,
            "color: green; font-weight: bold;"
          );
          if (tipo === "atividadePrincipal")
            return parseMultiplasAtividadesFromText(cachedResponse);
          return cachedResponse
            .split("|||")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
    } catch (error) {
      console.error("Erro ao ler cache. Prosseguindo para a API.", error);
    }
  }

  console.log(
    `%cCACHE MISS ou IGNORADO. Chamando API Gemini para: ${cacheKey}`,
    "color: orange; font-weight: bold;"
  );

  if (!GEMINI_API_KEY) {
    console.warn("API Key do Gemini não foi configurada.");
    return buscarSugestoesComIA_SIMULACAO(tipo, habilidadeTexto);
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  const systemInstruction = `Você é um especialista em Atendimento Educacional Especializado (AEE). Crie sugestões de atividades pedagógicas concisas e práticas. Responda SEMPRE no formato solicitado e NADA MAIS.`;
  let userPrompt = "";

  if (tipo === "quebraGelo") {
    userPrompt = `Gere 5 sugestões criativas e DIFERENTES de atividade de "quebra-gelo" para o início de um atendimento AEE (duração ~5 min) para um aluno de ${
      idadeAluno || "idade não informada"
    } anos. Responda APENAS com as sugestões, separando cada uma com "|||". Não use títulos ou marcadores.`;
  } else if (tipo === "finalizacao") {
    userPrompt = `Gere 5 sugestões criativas e DIFERENTES de atividade de "finalização" calma e previsível para encerrar um atendimento AEE para um aluno de ${
      idadeAluno || "idade não informada"
    } anos. Responda APENAS com as sugestões, separando cada uma com "|||". Não use títulos ou marcadores.`;
  } else {
    userPrompt = `Gere 5 sugestões NOVAS e CRIATIVAS de atividade principal para um atendimento AEE focada na habilidade: "${habilidadeTexto}". Adapte para a idade: ${
      idadeAluno || "não informada"
    } anos.\n\nFormate CADA SUGESTÃO EXATAMENTE assim:\nTítulo: [Título da Atividade]\nObjetivos:\n- [Primeiro objetivo]\n- [Segundo objetivo]\nRecursos: [Materiais necessários]\nMetodologia: [Passo a passo com verbos no infinitivo.]\nDuração: [Duração estimada]\n\nSepare cada sugestão completa com a linha "---NOVA SUGESTAO---".`;
  }

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    system_instruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.9 },
  };
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(
      `Erro na API: ${errorBody.error?.message || "Resposta inválida"}`
    );
  }
  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) throw new Error("A IA não retornou uma resposta válida.");

  try {
    await setDoc(cacheRef, {
      response: textResponse,
      createdAt: serverTimestamp(),
    });
    console.log(
      `%cSALVO NO CACHE: ${cacheKey}`,
      "color: blue; font-weight: bold;"
    );
  } catch (error) {
    console.error("Falha ao salvar no cache.", error);
  }

  if (tipo === "atividadePrincipal") {
    return parseMultiplasAtividadesFromText(textResponse);
  }
  return textResponse
    .split("|||")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Sua função de simulação - MANTIDA
async function buscarSugestoesComIA_SIMULACAO(tipo, habilidade = "") {
  console.warn(
    "Usando dados de simulação. Adicione uma API Key para usar a IA real."
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  const quebraGelos = [
    "Iniciar com 'massinha sensorial'.",
    "Começar com a 'Música do Olá'.",
    "Desenho livre sobre sentimentos.",
    "Brincar de 'estátua' com música.",
    "Caixa de sensações táteis.",
  ];
  const finalizacoes = [
    "Terminar com a 'Canção do Tchau'.",
    "Fazer a 'Massagem das Costas'.",
    "Guardar materiais com música.",
    "Contar o que mais gostou.",
    "Respiração calma com a mão na barriga.",
  ];

  if (tipo === "quebraGelo") return quebraGelos;
  if (tipo === "finalizacao") return finalizacoes;

  return Array.from({ length: 5 }).map((_, i) => ({
    titulo: `Atividade Simulada ${i + 1} para ${habilidade || "habilidade"}`,
    objetivos: ["Objetivo simulado 1", "Objetivo simulado 2"],
    recursos: "Recursos de teste",
    metodologia: "Metodologia de teste para a habilidade.",
    duracao: "30 minutos",
  }));
}

// Seu Hook Principal
export function usePlanoAEE(alunoId) {
  const [aluno, setAluno] = useState(null);
  const [plano, setPlano] = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [horariosAtendimento, setHorariosAtendimento] = useState([]);
  const [estado, setEstado] = useState({ carregando: true, erro: null });

  const carregarDados = useCallback(async () => {
    if (!alunoId) return;
    setEstado({ carregando: true, erro: null });
    try {
      const alunoRef = doc(db, "alunos", alunoId);
      const planoRef = doc(db, "alunos", alunoId, "planoAEE", "planoAtivo");
      const [alunoSnap, planoSnap] = await Promise.all([
        getDoc(alunoRef),
        getDoc(planoRef),
      ]);

      if (!alunoSnap.exists()) throw new Error("Aluno não encontrado.");
      setAluno({ id: alunoSnap.id, ...alunoSnap.data() });

      if (planoSnap.exists()) {
        const planoData = planoSnap.data();
        setPlano({ ...planoData, habilidades: planoData.habilidades || [] });
        setHorariosAtendimento(planoData.horariosAtendimento || []);
      } else {
        setPlano(null);
      }
      const atividadesRef = collection(db, "alunos", alunoId, "atividadesAEE");
      const q = query(atividadesRef, orderBy("data", "desc"), limit(20));
      const querySnapshot = await getDocs(q);
      setAtividades(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
      setEstado({ carregando: false, erro: "Falha ao carregar os dados." });
    } finally {
      setEstado((s) => ({ ...s, carregando: false }));
    }
  }, [alunoId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const getSugestoes = useCallback(
    async (tipo, habilidade, forceRefresh = false) => {
      // --- FERRAMENTA DE DEPURACÃO ADICIONADA ---
      // Este bloco vai ajudar a encontrar qual componente está chamando a função incorretamente.
      if (
        tipo === "atividadePrincipal" &&
        (typeof habilidade !== "object" ||
          habilidade === null ||
          !habilidade.id)
      ) {
        console.error("--- CHAMADA INCORRETA DETECTADA ---");
        console.error(
          `A função 'getSugestoes' foi chamada para 'atividadePrincipal', mas o segundo argumento ('habilidade') não é um objeto de habilidade válido.`
        );
        console.error("Valor recebido para 'habilidade':", habilidade);
        console.trace(
          "Rastreamento da chamada (procure o nome do seu componente no topo):"
        ); // Isso mostrará o culpado!
        // Retornar um array vazio para não quebrar a interface que espera uma lista
        return [];
      }
      // --- FIM DA FERRAMENTA DE DEPURACÃO ---

      if (!aluno) {
        throw new Error("Dados do aluno não carregados para gerar sugestão.");
      }
      try {
        const idade = aluno?.nascimento
          ? new Date().getFullYear() -
            (aluno.nascimento.toDate
              ? aluno.nascimento.toDate()
              : new Date(aluno.nascimento)
            ).getFullYear()
          : null;

        return await buscarSugestoesComIA_REAL(
          tipo,
          habilidade,
          idade,
          aluno,
          forceRefresh
        );
      } catch (e) {
        console.error("Erro ao buscar sugestões:", e);
        throw new Error("Falha ao buscar sugestões da IA.");
      }
    },
    [aluno]
  );

  const criarPlanoEmBranco = async (alunoId) => {
    setEstado((s) => ({ ...s, carregando: true, erro: null }));
    try {
      const novoPlano = {
        habilidades: [],
        criadoEm: Timestamp.now(),
        dataPlano: new Date().toISOString().split("T")[0],
        alunoId: alunoId,
        horariosAtendimento: [],
      };
      const planoRef = doc(db, "alunos", alunoId, "planoAEE", "planoAtivo");
      await setDoc(planoRef, novoPlano);
      setPlano(novoPlano);
      setHorariosAtendimento([]);
    } catch (e) {
      console.error("Erro ao criar plano:", e);
      setEstado((s) => ({ ...s, erro: "Falha ao criar plano." }));
    } finally {
      setEstado((s) => ({ ...s, carregando: false }));
    }
  };

  const importarDaAvaliacao = async (alunoId) => {
    setEstado((s) => ({ ...s, carregando: true, erro: null }));
    try {
      const q1 = query(
        collection(db, "avaliacoesIniciais"),
        where("aluno.id", "==", alunoId),
        limit(1)
      );
      let avaliacaoSnap = await getDocs(q1);

      if (avaliacaoSnap.empty) {
        const q2 = query(
          collection(db, "avaliacoesIniciais"),
          where("alunoId", "==", alunoId),
          limit(1)
        );
        avaliacaoSnap = await getDocs(q2);
        if (avaliacaoSnap.empty)
          throw new Error("Nenhuma avaliação inicial encontrada.");
      }

      const avaliacaoData = avaliacaoSnap.docs[0].data();
      const respostas = avaliacaoData.respostas || {};
      const habilidadesParaPlanejar = [];
      Object.entries(respostas).forEach(([area, habilidades]) => {
        Object.entries(habilidades).forEach(([habilidadeId, nivel]) => {
          if (nivel !== "I" && nivel !== "NA") {
            habilidadesParaPlanejar.push({
              id: `${area}-${habilidadeId.replace(/\s+/g, "_")}`,
              area,
              habilidade: habilidadeId,
              status: "A iniciar",
            });
          }
        });
      });

      if (habilidadesParaPlanejar.length === 0)
        throw new Error("Nenhuma habilidade a ser trabalhada foi encontrada.");

      const novoPlano = {
        habilidades: habilidadesParaPlanejar,
        criadoEm: Timestamp.now(),
        dataPlano: new Date().toISOString().split("T")[0],
        baseadoEm: avaliacaoSnap.docs[0].id,
        alunoId: alunoId,
        horariosAtendimento: [],
      };
      const planoRef = doc(db, "alunos", alunoId, "planoAEE", "planoAtivo");
      await setDoc(planoRef, novoPlano);
      setPlano(novoPlano);
      setHorariosAtendimento([]);
    } catch (e) {
      console.error("Erro ao importar:", e);
      setEstado((s) => ({ ...s, erro: e.message }));
    } finally {
      setEstado((s) => ({ ...s, carregando: false }));
    }
  };

  const salvarAtividade = async (dadosAtividade) => {
    setEstado((s) => ({ ...s, carregando: true }));
    try {
      const atividadesRef = collection(db, "alunos", alunoId, "atividadesAEE");
      await addDoc(atividadesRef, {
        ...dadosAtividade,
        data: Timestamp.now(),
      });

      const idsUnicos = [
        ...new Set(
          dadosAtividade.atividadePrincipal.habilidadesAvaliadas.map(
            (h) => h.habilidadeId
          )
        ),
      ];
      await Promise.all(
        idsUnicos.map((id) =>
          atualizarStatusHabilidade(id, "Em desenvolvimento")
        )
      );
      await carregarDados();
    } catch (e) {
      console.error("Erro ao salvar atividade:", e);
      setEstado((s) => ({
        ...s,
        erro: "Não foi possível salvar a atividade.",
      }));
    } finally {
      setEstado((s) => ({ ...s, carregando: false }));
    }
  };

  const salvarHorariosAtendimento = async (horarios) => {
    try {
      const planoRef = doc(db, "alunos", alunoId, "planoAEE", "planoAtivo");
      await updateDoc(planoRef, { horariosAtendimento: horarios });
      setHorariosAtendimento(horarios);
    } catch (e) {
      console.error("Erro ao salvar horários:", e);
      setEstado((s) => ({ ...s, erro: "Falha ao salvar os horários." }));
    }
  };

  const atualizarStatusHabilidade = async (habilidadeId, novoStatus) => {
    if (!plano) return;
    try {
      const novasHabilidades = plano.habilidades.map((h) =>
        h.id === habilidadeId ? { ...h, status: novoStatus } : h
      );
      const planoRef = doc(db, "alunos", alunoId, "planoAEE", "planoAtivo");
      await updateDoc(planoRef, { habilidades: novasHabilidades });
      setPlano((p) => ({ ...p, habilidades: novasHabilidades }));
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
      setEstado((s) => ({ ...s, erro: "Falha ao atualizar o status." }));
    }
  };

  const adicionarHabilidade = async (novaHabilidade) => {
    if (!plano) return;
    try {
      const idUnico = `${
        novaHabilidade.area
      }-${novaHabilidade.habilidade.replace(/\s+/g, "_")}-${Date.now()}`;
      const habilidadeComId = {
        ...novaHabilidade,
        id: idUnico,
        status: "A iniciar",
      };

      const novasHabilidades = [...plano.habilidades, habilidadeComId];
      const planoRef = doc(db, "alunos", alunoId, "planoAEE", "planoAtivo");
      await updateDoc(planoRef, { habilidades: novasHabilidades });
      setPlano((p) => ({ ...p, habilidades: novasHabilidades }));
    } catch (e) {
      console.error("Erro ao adicionar habilidade:", e);
      setEstado((s) => ({ ...s, erro: "Falha ao adicionar habilidade." }));
    }
  };

  const salvarDataPlano = async (novaData) => {
    if (!plano) return;
    try {
      const planoRef = doc(db, "alunos", alunoId, "planoAEE", "planoAtivo");
      await updateDoc(planoRef, { dataPlano: novaData });
      setPlano((p) => ({ ...p, dataPlano: novaData }));
    } catch (e) {
      console.error("Erro ao salvar data:", e);
      setEstado((s) => ({ ...s, erro: "Falha ao salvar a data do plano." }));
    }
  };

  return {
    aluno,
    plano,
    atividades,
    horariosAtendimento,
    estado,
    criarPlanoEmBranco,
    importarDaAvaliacao,
    salvarAtividade,
    salvarHorariosAtendimento,
    getSugestoes,
    atualizarStatusHabilidade,
    adicionarHabilidade,
    salvarDataPlano,
  };
}
