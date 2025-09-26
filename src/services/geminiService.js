import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// CHAVE DE API: Mantenha aqui, pois é o único arquivo que faz as chamadas.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// *************************************************************
// * CORREÇÃO CRÍTICA: MODELO ATUALIZADO E ESTÁVEL (gemini-2.5-flash) *
// *************************************************************
const MODEL_NAME = "gemini-2.5-flash";
const API_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

// Versão unificada do cache
const CACHE_VERSION = "v25"; // Aumentado para limpar o cache após a mudança do modelo

// --- FUNÇÕES DE AUXÍLIO ---

const LEGENDA_NIVEIS = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
  NA: "Não aplicável",
};

const PERFIS_GERAIS = [
  "gestao", // Já incluso
  "orientacao",
  "orientador_pedagogico",
  "desenvolvedor", // Já incluso
  "diretor",
  "diretor_adjunto",
  "aee",
  "seme", // Já incluso
  "professor regente",
  "professor de suporte",
];

const normalizarDisciplinaParaIA = (disciplinaProfessor) => {
  const disciplinaNormalizada = (disciplinaProfessor || "")
    .toLowerCase()
    .trim();
  if (PERFIS_GERAIS.includes(disciplinaNormalizada) || !disciplinaProfessor) {
    return "Pedagogia Geral";
  }
  return disciplinaProfessor;
};

/**
 * Função utilitária centralizada para chamar a API Gemini.
 * @param {string} prompt - O prompt de entrada.
 * @param {object} config - Configurações do modelo.
 * @param {string} context - Contexto do erro para log.
 * @returns {Promise<string>} O texto da resposta da IA.
 */
async function callGeminiApi(prompt, config, context) {
  if (!GEMINI_API_KEY) throw new Error("VITE_GEMINI_API_KEY não configurada.");

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: config,
  };

  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(
      `API Error (${context}): ${err.error?.message || "Resposta inválida"}`
    );
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

  // NOVO BLOCO DE VERIFICAÇÃO ROBUSTO (contra respostas vazias/bloqueadas)
  if (!textResponse) {
    const safetyReason = result.candidates?.[0]?.finishReason;
    const safetyBlock = result.promptFeedback?.blockReason;

    let errorMessage = `A IA não retornou conteúdo de texto válido (${context}).`;

    if (safetyReason === "SAFETY" || safetyBlock === "SAFETY") {
      errorMessage += " (Motivo: Conteúdo bloqueado por filtros de segurança.)";
    } else if (safetyReason) {
      errorMessage += ` (Motivo de término: ${safetyReason})`;
    } else {
      errorMessage += " (Motivo: Estrutura da resposta vazia.)";
    }
    console.error(errorMessage, result);
    throw new Error(errorMessage);
  }

  return textResponse;
}

// --- FUNÇÕES EXPORTADAS (QUE SEU COMPONENTE CriarPEI.jsx ESPERA) ---

/**
 * Gera SUGESTÕES DE ESTRATÉGIAS para uma habilidade específica (COM CACHE).
 */
export async function getSugestaoEstrategiasPEI(
  aluno,
  meta,
  area,
  disciplinaProfessor,
  forceRefresh = false
) {
  const context = "Estratégias";
  const disciplinaParaIA = normalizarDisciplinaParaIA(disciplinaProfessor);

  if (!meta || !meta.habilidade || !meta.nivel || !meta.nivelAlmejado) {
    throw new Error(
      "Dados da meta de progressão incompletos para gerar sugestões."
    );
  }

  const cacheKey = `${CACHE_VERSION}-estrategias-${
    aluno.diagnostico || "generico"
  }-${area}-${meta.habilidade}-${disciplinaParaIA}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "_");
  const cacheRef = doc(db, "geminiCache", cacheKey);

  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        const cachedData = JSON.parse(cacheSnap.data().response);
        return Array.isArray(cachedData) ? cachedData : [cachedData];
      }
    } catch (error) {
      console.error(`Erro ao ler cache (${context}):`, error);
    }
  }

  const prompt = `Aja como um especialista em psicopedagogia. Crie exatamente 5 estratégias pedagógicas criativas e práticas para um professor.
**Informações do Aluno:** - Diagnóstico: "${
    aluno.diagnostico || "N/I"
  }" - Habilidade: "${meta.habilidade}" - Progressão Desejada: De "${
    LEGENDA_NIVEIS[meta.nivel]
  }" para "${
    LEGENDA_NIVEIS[meta.nivelAlmejado]
  }" - Disciplina da Aula: "${disciplinaParaIA}"
**Instruções:** - Devem ser frases completas. - Devem ser relevantes para a disciplina.
**Formato OBRIGATÓRIO:** A resposta deve ser APENAS um JSON (lista de 5 objetos) com a chave "titulo".`;

  const config = {
    temperature: 0.9,
    maxOutputTokens: 16384,
    responseMimeType: "application/json",
  };
  const textResponse = await callGeminiApi(prompt, config, context);

  // Lógica de Parse e Cache
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(textResponse.replace(/```json\n?|\n?```/g, ""));
  } catch (e) {
    console.error(
      `Falha ao PARSEAR a resposta da IA (${context}). Resposta bruta:`,
      textResponse,
      e
    );
    throw new Error(
      `A IA retornou um formato de texto inesperado (${context}).`
    );
  }
  try {
    await setDoc(cacheRef, {
      response: textResponse,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Falha ao SALVAR no cache (${context}).`, error);
  }
  return Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse];
}

/**
 * Gera uma SUGESTÃO DE ATIVIDADE para UMA ESTRATÉGIA ESPECÍFICA (COM CACHE).
 */
export async function getSugestaoAtividadeParaEstrategia(
  aluno,
  estrategia,
  disciplinaProfessor,
  forceRefresh = false
) {
  const context = "Ativ. Individual";
  const disciplinaParaIA = normalizarDisciplinaParaIA(disciplinaProfessor);

  const estrategiaTexto =
    typeof estrategia === "string"
      ? estrategia
      : estrategia.titulo || JSON.stringify(estrategia);
  const cacheKey = `${CACHE_VERSION}-ativ-individual-${
    aluno.diagnostico || "generico"
  }-${disciplinaParaIA}-${estrategiaTexto}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "_");
  const cacheRef = doc(db, "geminiCache", cacheKey);

  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) return JSON.parse(cacheSnap.data().response);
    } catch (error) {
      console.error(`Erro ao ler cache (${context}):`, error);
    }
  }

  const prompt = `Sua tarefa é criar 5 sugestões de atividades objetivas, criativas e de acordo com a realidade escolar, descrevendo com detalhes a ação do profissional.
- As atividades devem aplicar diretamente a estratégia: "${estrategiaTexto}". - O texto de cada atividade deve ser uma instrução para o professor. - Os atendimentos sao indivíduais.
- Responda APENAS com uma lista de 5 strings em formato JSON.`;

  const config = {
    temperature: 0.9,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };
  const textResponse = await callGeminiApi(prompt, config, context);

  // Lógica de Parse e Cache
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(textResponse.replace(/```json\n?|\n?```/g, ""));
    if (!Array.isArray(parsedResponse) || parsedResponse.length === 0) {
      throw new Error("A resposta da IA não é uma lista válida de sugestões.");
    }
  } catch (e) {
    console.error(
      `Falha ao PARSEAR a resposta da IA (${context}). Resposta bruta:`,
      textResponse,
      e
    );
    throw new Error(
      `A IA retornou um formato de texto inesperado (${context}).`
    );
  }
  try {
    await setDoc(cacheRef, {
      response: textResponse,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Falha ao SALVAR no cache (${context}).`, error);
  }
  return parsedResponse;
}

// --- ATENÇÃO: As funções a seguir (Plano, Quebra-Gelo, Finalização) não estavam sendo chamadas/causando erro no CriarPEI.jsx, mas são mantidas corrigidas ---

/**
 * Gera uma SUGESTÃO DE PLANO DE ATIVIDADE COMPLETA (COM CACHE).
 */
export async function getSugestaoAtividadePEI(
  aluno,
  meta,
  estrategiasSelecionadas,
  disciplinaProfessor,
  forceRefresh = false
) {
  const context = "Plano de Aula";
  const disciplinaParaIA = normalizarDisciplinaParaIA(disciplinaProfessor);

  if (
    !meta ||
    !meta.habilidade ||
    !meta.nivel ||
    !meta.nivelAlmejado ||
    !estrategiasSelecionadas ||
    estrategiasSelecionadas.length === 0
  ) {
    return "Por favor, selecione ao menos uma estratégia para gerar um plano de aula.";
  }

  const estrategiaTitulos = estrategiasSelecionadas.map((e) =>
    typeof e === "string" ? e : e.titulo
  );
  const sortedStrategiesString = estrategiaTitulos.sort().join("-");
  const cacheKey = `${CACHE_VERSION}-plano-aula-${
    aluno.diagnostico || "generico"
  }-${meta.habilidade}-${sortedStrategiesString}-${disciplinaParaIA}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "_");
  const cacheRef = doc(db, "geminiCache", cacheKey);

  // Lógica de Cache (Leitura)
  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        const cachedData = JSON.parse(cacheSnap.data().response);
        return Array.isArray(cachedData) ? cachedData : [cachedData];
      }
    } catch (error) {
      console.error(`Erro ao ler cache (${context}):`, error);
    }
  }

  const prompt = `Sua tarefa é criar 15 sugestões de atividades criativas e práticas, descrevendo a ação do profissional (professor) com detalhes, dentro da realidade escolar.
**Contexto:** - Aluno: Diagnóstico de "${
    aluno.diagnostico || "N/I"
  }". - Habilidade-Alvo: Ajudar o aluno a progredir de "${
    LEGENDA_NIVEIS[meta.nivel]
  }" para "${LEGENDA_NIVEIS[meta.nivelAlmejado]}" na habilidade "${
    meta.habilidade
  }". - Disciplina: "${disciplinaParaIA}". - Estratégias de Apoio: ${estrategiasSelecionadas
    .map((e) => e.titulo)
    .join(", ")}.
**REGRAS DE FORMATAÇÃO (OBRIGATÓRIO):** 1. Direcionamento do Texto: Instruções PARA O PROFISSIONAL. 2. Formato da Resposta: APENAS um único JSON contendo uma lista de EXATAMENTE 15 strings. 3. PROIBIDO: Usar títulos, subtítulos, listas ou passos numerados (1., 2., etc.).`;

  const config = {
    temperature: 0.8,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };
  const textResponse = await callGeminiApi(prompt, config, context);

  // Lógica de Parse e Cache
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(textResponse.replace(/```json\n?|\n?```/g, ""));
  } catch (e) {
    console.error(
      `Falha ao PARSEAR a resposta da IA (${context}). Resposta bruta:`,
      textResponse,
      e
    );
    throw new Error(
      `A IA retornou um formato de texto inesperado (${context}).`
    );
  }
  try {
    await setDoc(cacheRef, {
      response: textResponse,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Falha ao SALVAR no cache (${context}).`, error);
  }
  return Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse];
}

export async function getSugestaoQuebraGelo(
  aluno,
  disciplinaProfessor,
  forceRefresh = false
) {
  const context = "Quebra Gelo";
  const disciplinaParaIA = normalizarDisciplinaParaIA(disciplinaProfessor);

  const cacheKey = `${CACHE_VERSION}-quebra-gelo-${
    aluno.diagnostico || "generico"
  }-${disciplinaParaIA}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "_");
  const cacheRef = doc(db, "geminiCache", cacheKey);

  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) return cacheSnap.data().response;
    } catch (error) {
      console.error(`Erro ao ler cache (${context}):`, error);
    }
  }

  const prompt = `Sua tarefa é criar uma atividade de "quebra-gelo" (2-3 min), descrevendo a ação do profissional.
- Contexto: Início de aula de "${disciplinaParaIA}" para um aluno com diagnóstico de "${
    aluno.diagnostico || "N/I"
  }".
- O texto deve ser uma instrução para o professor, não para o aluno.
- Responda APENAS com o texto da atividade, em formato de texto corrido.`;

  const config = { maxOutputTokens: 8192 }; // Aumentado para garantir espaço
  const textResponse = await callGeminiApi(prompt, config, context);

  try {
    await setDoc(cacheRef, {
      response: textResponse.trim(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Falha ao salvar no cache (${context}).`, error);
  }
  return textResponse.trim();
}

/**
 * Gera uma SUGESTÃO DE ATIVIDADE DE FINALIZAÇÃO (COM CACHE).
 */
export async function getSugestaoFinalizacao(
  aluno,
  disciplinaProfessor,
  forceRefresh = false
) {
  const context = "Finalização";
  const disciplinaParaIA = normalizarDisciplinaParaIA(disciplinaProfessor);

  const cacheKey = `${CACHE_VERSION}-finalizacao-${
    aluno.diagnostico || "generico"
  }-${disciplinaParaIA}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "_");
  const cacheRef = doc(db, "geminiCache", cacheKey);

  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) return cacheSnap.data().response;
    } catch (error) {
      console.error(`Erro ao ler cache (${context}):`, error);
    }
  }

  const prompt = `Sua tarefa é criar uma atividade de "finalização" ou "volta à calma" (2-3 min), descrevendo a ação do profissional.
- Contexto: Fim de aula de "${disciplinaParaIA}" para um aluno com diagnóstico de "${
    aluno.diagnostico || "N/I"
  }".
- O texto deve ser uma instrução para o professor, não para o aluno.
- Responda APENAS com o texto da atividade, em formato de texto corrido.`;

  const config = { maxOutputTokens: 8192 }; // Aumentado para garantir espaço
  const textResponse = await callGeminiApi(prompt, config, context);

  try {
    await setDoc(cacheRef, {
      response: textResponse.trim(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Falha ao salvar no cache (${context}).`, error);
  }
  return textResponse.trim();
}
