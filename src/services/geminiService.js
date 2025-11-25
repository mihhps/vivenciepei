import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// CHAVE DE API: Mantenha aqui, pois é o único arquivo que faz as chamadas.
// Certifique-se de que a chave está definida no seu arquivo .env do Vite
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// *************************************************************
// * MODELO ATUALIZADO E ESTÁVEL *
// *************************************************************
const MODEL_NAME = "gemini-2.5-flash";
const API_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

// Versão unificada do cache
const CACHE_VERSION = "v26"; // Versão atualizada para refletir a nova estratégia de sugestões

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
  "gestao",
  "orientacao",
  "orientador_pedagogico",
  "desenvolvedor",
  "diretor",
  "diretor_adjunto",
  "aee",
  "seme",
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

  // BLOCO DE VERIFICAÇÃO ROBUSTO
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

// ==========================================================
// ==== FUNÇÃO DE ADAPTAÇÃO DE CONTEÚDO (NOVO FOCO: SUGESTÕES) ====
// ==========================================================

/**
 * Gera sugestões de adaptação e palavras-chave para um texto ou material original,
 * focando em um formato conciso e estratégico para o professor.
 * @param {object} adaptacaoInput - Objeto contendo texto, laudo, dificuldades e opções.
 * @returns {Promise<object>} Objeto contendo sugestões de adaptação (lista),
 * palavras-chave para pictogramas e sugestão de formato.
 */
export async function gerarAdaptacaoMaterial(adaptacaoInput) {
  const context = "SugestoesAdaptacao";

  // 1. EXTRAÇÃO E GARANTIA DE TIPO
  const textoOriginal = String(adaptacaoInput.texto || "");
  const alunoInfo = {
    diagnostico: adaptacaoInput.laudo || "Não informado",
    dificuldades: adaptacaoInput.dificuldades || "Nenhuma especificada",
  };
  const opcoes = adaptacaoInput.opcoes || {}; // Mantemos as opções como contexto

  if (textoOriginal.trim().length < 50) {
    throw new Error("O texto para análise deve ter no mínimo 50 caracteres.");
  }

  // Monta a string de adaptação baseada nas opções (agora como contexto para a IA)
  let contextoAdaptacao = [];
  if (opcoes.simplificarLinguagem)
    contextoAdaptacao.push("Linguagem: Simplificação e vocabulário reduzido.");
  if (opcoes.inserirPictogramas)
    contextoAdaptacao.push(
      "Apoio Visual: Necessidade de uso de pictogramas ou imagens."
    );
  if (opcoes.transformarAvaliacao)
    contextoAdaptacao.push(
      "Avaliação: Transformar questões abertas em múltipla escolha."
    );
  if (opcoes.ajustarFormato)
    contextoAdaptacao.push(
      "Formato: Considerar ajustes de fonte, tamanho e espaçamento (pedir sugestão no JSON)."
    );

  if (contextoAdaptacao.length === 0) {
    contextoAdaptacao.push(
      "Nenhuma opção específica, focar em clareza e acessibilidade gerais."
    );
  }

  const prompt = `
        Você é um consultor de educação inclusiva. Sua tarefa é analisar o texto/atividade original e, com base nas informações do aluno e nos requisitos de adaptação, gerar **sugestões práticas** de como o professor pode modificar a atividade.

        **Informações do Aluno para Contexto (Foco de Adaptação):**
        - Diagnóstico Principal: ${alunoInfo.diagnostico}
        - Dificuldades Chave: ${alunoInfo.dificuldades}

        **Contexto de Adaptação Solicitado:**
        * ${contextoAdaptacao.join("\n* ")}
        
        **Texto/Atividade Original a ser Analisada:**
        ---
        ${textoOriginal}
        ---

        **Requisitos de Saída (OBRIGATÓRIO):**
        1. **sugestoesAdaptacao**: Crie uma lista com EXATAMENTE 7 sugestões concisas, práticas e acionáveis sobre como o professor deve adaptar a atividade original (ex: "Reduza o número de opções de múltipla escolha para 3" ou "Use massinha para simular ferramentas da pré-história").
        2. **palavrasChavePictogramas**: Crie uma lista de 15 palavras-chave mais relevantes do texto para que o professor possa buscar pictogramas e apoiar visualmente o conteúdo.
        3. **sugestaoFormato**: Gere uma sugestão de formato (fonte, espaçamento, cor) se a opção correspondente foi marcada.

        **Formato de Saída (ESTRITAMENTE OBRIGATÓRIO):**
        A resposta deve ser um **JSON puro** (sem blocos de código markdown) com a seguinte estrutura:

        {
          "sugestoesAdaptacao": ["Sugestão prática 1", "Sugestão prática 2", "...", "Sugestão prática 7"],
          "palavrasChavePictogramas": ["palavra1", "palavra2", "palavra3", "...", "palavra15"],
          "sugestaoFormato": "Dicas de fonte (Ex: OpenDyslexic), tamanho (Ex: 14pt) e espaçamento."
        }

        Gere a resposta agora, focando na utilidade e estabilidade.
    `;

  // 2. CONFIGURAÇÃO DA CHAMADA (MAX_TOKENS reduzido pela simplicidade da resposta)
  const config = {
    temperature: 0.7,
    maxOutputTokens: 4096, // Resposta mais curta e estável
    responseMimeType: "application/json",
  };

  const textResponse = await callGeminiApi(prompt, config, context);

  // 3. Lógica de Parse
  let parsedResponse;
  try {
    // Tenta limpar e analisar o JSON
    parsedResponse = JSON.parse(textResponse.replace(/```json\n?|\n?```/g, ""));
  } catch (e) {
    console.error(
      `Falha ao PARSEAR a resposta da IA (${context}). Resposta bruta:`,
      textResponse,
      e
    );
    throw new Error(
      `A IA retornou um formato de texto inesperado. Não foi possível exibir as sugestões. (${context})`
    );
  }

  // 4. Retorno (Retorna apenas os campos necessários)
  return {
    // Renomeando a chave interna para o nome esperado no frontend (pictogramas)
    pictogramas: Array.isArray(parsedResponse.palavrasChavePictogramas)
      ? parsedResponse.palavrasChavePictogramas
      : [],
    sugestoesAdaptacao: Array.isArray(parsedResponse.sugestoesAdaptacao)
      ? parsedResponse.sugestoesAdaptacao
      : ["Erro ao processar as sugestões. Verifique o prompt."],
    sugestaoFormato: parsedResponse.sugestaoFormato || null,

    // Campos anteriores agora são vazios, mas mantidos no retorno para não quebrar componentes que esperam eles
    textoAdaptadoHTML: "",
    textoAdaptado: "",
  };
}

// ==========================================================
// ==== FUNÇÃO DUA PARA PLANO DE AULA GERAL DE TURMA (Restante do arquivo) ====
// ==========================================================

/**
 * Gera SUGESTÕES DE ESTRATÉGIAS DUA para um PLANO DE AULA GERAL DE TURMA (COM CACHE).
 */
export async function getSugestaoPlanoAulaDUA(
  conteudoTema,
  objetivoBNCC,
  turmaInfo,
  disciplinaProfessor,
  forceRefresh = false
) {
  const context = "PlanoAulaDUA";
  const disciplinaParaIA = normalizarDisciplinaParaIA(disciplinaProfessor);

  // 1. CHAVE DE CACHE
  const cacheKey =
    `${CACHE_VERSION}-dua-turma-${turmaInfo}-${disciplinaParaIA}-${objetivoBNCC}-${conteudoTema}`
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "_");
  const cacheRef = doc(db, "geminiCache", cacheKey);

  // Lógica de Cache (Leitura)
  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        return JSON.parse(
          cacheSnap.data().response.replace(/```json\n?|\n?```/g, "")
        );
      }
    } catch (error) {
      console.error(`Erro ao ler cache (${context}):`, error);
    }
  }

  // 2. PROMPT
  const prompt = `
        Você é um especialista em Desenho Universal para a Aprendizagem (DUA) e BNCC. Sua tarefa é gerar sugestões de estratégias de ensino para um Plano de Aula INCLUSIVO, que elimine barreiras de aprendizado para TODOS os alunos da turma.
        
        **Foco da Aula:**
        Turma: "${turmaInfo}" (${disciplinaParaIA})
        Tema/Conteúdo: "${conteudoTema}"
        Objetivo Curricular Central (BNCC/Geral): "${objetivoBNCC}"
        
        **Requisitos de Saída (Foco DUA):**
        1. Gere **6 a 8 sugestões específicas, práticas e de fácil aplicação** para cada um dos 3 Princípios do DUA.
        2. As sugestões devem ser GERAIS e aplicáveis a qualquer aluno da turma (foco na remoção de barreiras, não em adaptação individual).
        3. A saída deve ser um **JSON puro** (sem blocos de código markdown) com a seguinte estrutura:

        {
          "representacao": ["Sugestão 1: Múltiplas formas de apresentar o conteúdo (Ex: Vídeo com legenda e material tátil).", ...],
          "acaoExpressao": ["Sugestão 1: Múltiplas formas de o aluno demonstrar o aprendizado (Ex: Resposta oral, digital ou escrita).", ...],
          "engajamento": ["Sugestão 1: Múltiplas formas de motivar o aluno (Ex: Dar opção de escolha do colega de grupo e tema de pesquisa).", ...]
        }
        
        Gere as sugestões agora.
    `;

  // 3. CONFIGURAÇÃO DA CHAMADA
  const config = {
    temperature: 0.9,
    maxOutputTokens: 16384,
    responseMimeType: "application/json",
  };

  const textResponse = await callGeminiApi(prompt, config, context);

  // 4. LÓGICA DE PARSE E CACHE
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

  return parsedResponse;
}

// ==========================================================
// ==== FUNÇÕES EXPORTADAS RESTANTES (Restante do arquivo) ====
// ==========================================================

export async function generateDraftReport(alunoInfo, criadorNome) {
  const context = "DraftReport";

  const prompt = `Aja como um(a) psicopedagogo(a) experiente, mas sensível. Sua tarefa é gerar um rascunho de relatório pedagógico (máximo 4 parágrafos) focado na comunicação com a família.
O relatório deve ter uma linguagem que utilize **termos pedagógicos essenciais**, mas que seja imediatamente **clara, acessível e acolhedora** para os pais/responsáveis.

O foco deve ser em: 
1. Apresentação inicial do aluno (dados e diagnóstico) com foco no seu potencial.
2. Descrição objetiva de uma área de observação primária, usando linguagem clara.
3. Sugestão de uma meta de desenvolvimento simples, que a família possa apoiar em casa.

**Informações do Aluno:**
- Nome: ${alunoInfo.nome}
- Turma: ${alunoInfo.turma}
- Nascimento: ${alunoInfo.nascimento}
- Diagnóstico: ${alunoInfo.diagnostico || "Não informado"}
- Professor(a): ${criadorNome}

**Instruções de Estilo:**
- Mantenha um **tom formal, profissional, mas altamente acessível**.
- **Evite jargões excessivos** ou palavras que exijam conhecimento técnico aprofundado.
- Responda APENAS com o texto corrido do relatório.
- Proíba o uso de títulos ou subtítulos.
`;

  // Configuração para texto corrido e objetivo
  const config = {
    temperature: 0.6, // Menos criativo, mais factual
    maxOutputTokens: 16384,
  };

  return await callGeminiApi(prompt, config, context);
}

export async function reviewReportText(textoOriginal) {
  const context = "ReviewReport";

  // Aplica a mesma proteção para o trim()
  const textoSeguro = String(textoOriginal || "");

  if (textoSeguro.trim().length < 20) {
    throw new Error(
      "Texto insuficiente (mínimo de 20 caracteres) para a revisão da IA."
    );
  }

  const prompt = `Você é um editor pedagógico. Sua tarefa é revisar o seguinte relatório de observação, transformando-o em um documento profissional, formal e com linguagem técnica adequada (pedagógica/psicopedagógica).
Mantenha a essência e os fatos descritos no texto original, mas corrija erros gramaticais, melhore a fluidez e utilize terminologia apropriada.

**Texto a ser revisado:**
---
${textoSeguro}
---

**Instruções:**
- Retorne APENAS o texto revisado e formatado (parágrafos fluidos).
- Mantenha o tom objetivo e profissional.
`;

  // Configuração para alta fidelidade ao texto (temp baixa)
  const config = {
    temperature: 0.3,
    maxOutputTokens: 16384,
  };

  return await callGeminiApi(prompt, config, context);
}

export async function generateSugestoesAEE(tipo, prompt, systemInstruction) {
  const context = `AEE_${tipo}`;

  // Configuração padrão para texto corrido
  const config = {
    temperature: 0.7,
    maxOutputTokens: 2048,
  };

  // Se for uma atividade principal, permite mais criatividade e tokens
  if (tipo === "atividadePrincipal") {
    config.maxOutputTokens = 8192;
    config.temperature = 0.9;
  }

  // Combina a instrução do sistema com o prompt do usuário
  const finalPrompt = systemInstruction
    ? `${systemInstruction}\n\n${prompt}`
    : prompt;

  return await callGeminiApi(finalPrompt, config, context);
}

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
- As atividades devem aplicar diretamente a estratégia: "${estrategiaTexto}". - Os atendimentos sao indivíduais.
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

  const config = { maxOutputTokens: 8192 };
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

  const config = { maxOutputTokens: 8192 };
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
