import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Versão unificada do cache para todas as funções deste arquivo.
// Mudar este número invalida todos os caches de PEI de uma vez.
const CACHE_VERSION = "v24";

const LEGENDA_NIVEIS = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
  NA: "Não aplicável",
};

// --- BLOCO ADICIONADO PARA NORMALIZAR PERFIS ---
// Lista de cargos/perfis que devem receber sugestões pedagógicas gerais.
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
];

/**
 * Normaliza a disciplina do professor. Se o cargo/perfil for geral,
 * retorna "Pedagogia Geral". Caso contrário, retorna a disciplina original.
 * @param {string} disciplinaProfessor - O cargo ou disciplina do usuário.
 * @returns {string} - A disciplina a ser usada na IA.
 */
const normalizarDisciplinaParaIA = (disciplinaProfessor) => {
  const disciplinaNormalizada = (disciplinaProfessor || "")
    .toLowerCase()
    .trim();
  // Se o cargo/perfil estiver na nossa lista, ou se não houver disciplina...
  if (PERFIS_GERAIS.includes(disciplinaNormalizada) || !disciplinaProfessor) {
    return "Geral";
  }
  // Caso contrário, usa a disciplina que foi passada (ex: "Professor de Educação Física")
  return disciplinaProfessor;
};
// --- FIM DO BLOCO ADICIONADO ---

// --- FUNÇÕES PRINCIPAIS DO PEI ---

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
  const disciplinaParaIA = normalizarDisciplinaParaIA(disciplinaProfessor); // <-- CORREÇÃO APLICADA

  if (!meta || !meta.habilidade || !meta.nivel || !meta.nivelAlmejado) {
    console.error(
      "ERRO CRÍTICO: a função getSugestaoEstrategiasPEI foi chamada sem um objeto 'meta' válido.",
      { meta }
    );
    throw new Error(
      "Dados da meta de progressão incompletos para gerar sugestões."
    );
  }

  const cacheKey = `${CACHE_VERSION}-estrategias-${
    aluno.diagnostico || "generico"
  }-${area}-${meta.habilidade}-${disciplinaParaIA}` // <-- CORREÇÃO APLICADA
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "_");
  const cacheRef = doc(db, "geminiCache", cacheKey);

  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        console.log(
          `%cCACHE HIT! Entregando ESTRATÉGIAS salvas para: ${cacheKey}`,
          "color: green; font-weight: bold;"
        );
        const cachedData = JSON.parse(cacheSnap.data().response);
        return Array.isArray(cachedData) ? cachedData : [cachedData];
      }
    } catch (error) {
      console.error("Erro ao ler cache (Estratégias):", error);
    }
  }

  console.log(
    `%cCACHE MISS. Chamando API Gemini para ESTRATÉGIAS: ${cacheKey}`,
    "color: orange; font-weight: bold;"
  );
  if (!GEMINI_API_KEY) throw new Error("VITE_GEMINI_API_KEY não configurada.");

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `Aja como um especialista em psicopedagogia. Crie exatamente 13 estratégias pedagógicas criativas e práticas para um professor.

**Informações do Aluno:**
- Diagnóstico: "${aluno.diagnostico || "N/I"}"
- Habilidade: "${meta.habilidade}"
- Progressão Desejada: De "${LEGENDA_NIVEIS[meta.nivel]}" para "${
    LEGENDA_NIVEIS[meta.nivelAlmejado]
  }"
- Disciplina da Aula: "${disciplinaParaIA}"

**Instruções para as Estratégias:**
- Devem ser frases completas que descrevem uma ação clara para o professor.
- Devem ser relevantes para a disciplina informada.
- Tente oferecer sugestões diferentes a cada vez.

**Formato OBRIGATÓRIO da Resposta:**
- A resposta deve ser APENAS um JSON.
- O JSON deve ser uma lista contendo 13 objetos.
- Cada objeto deve ter uma única chave "titulo", com a estratégia como valor.
- Exemplo: \`[{"titulo": "Usar blocos de montar para representar os personagens de uma história lida em aula..."}, {"titulo": "..."}]\``;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`API Error (Estratégias): ${err.error?.message}`);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    console.error(
      "Resposta da IA veio sem conteúdo de texto (Estratégias). Resposta completa:",
      result
    );
    throw new Error(
      "A IA não retornou conteúdo de texto válido (Estratégias)."
    );
  }

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(textResponse.replace(/```json\n?|\n?```/g, ""));
  } catch (e) {
    console.error(
      "Falha ao PARSEAR a resposta da IA (Estratégias). Resposta bruta:",
      textResponse,
      e
    );
    throw new Error(
      "A IA retornou um formato de texto inesperado (Estratégias)."
    );
  }

  try {
    await setDoc(cacheRef, {
      response: textResponse,
      createdAt: serverTimestamp(),
    });
    console.log(
      `%cSALVO NO CACHE (Estratégias): ${cacheKey}`,
      "color: blue; font-weight: bold;"
    );
  } catch (error) {
    console.error(
      "Falha ao SALVAR no cache (Estratégias), mas a resposta era válida.",
      error
    );
  }

  return Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse];
}

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
  const disciplinaParaIA = normalizarDisciplinaParaIA(disciplinaProfessor); // <-- CORREÇÃO APLICADA

  if (!meta || !meta.habilidade || !meta.nivel || !meta.nivelAlmejado) {
    console.error(
      "ERRO CRÍTICO: a função getSugestaoAtividadePEI foi chamada sem um objeto 'meta' válido.",
      { meta }
    );
    throw new Error(
      "Dados da meta de progressão incompletos para gerar o plano de aula."
    );
  }
  if (!estrategiasSelecionadas || estrategiasSelecionadas.length === 0) {
    return "Por favor, selecione ao menos uma estratégia para gerar um plano de aula.";
  }

  const estrategiaTitulos = estrategiasSelecionadas.map((e) =>
    typeof e === "string" ? e : e.titulo
  );
  const sortedStrategiesString = estrategiaTitulos.sort().join("-");
  const cacheKey = `${CACHE_VERSION}-plano-aula-${
    aluno.diagnostico || "generico"
  }-${meta.habilidade}-${sortedStrategiesString}-${disciplinaParaIA}` // <-- CORREÇÃO APLICADA
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "_");
  const cacheRef = doc(db, "geminiCache", cacheKey);

  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        console.log(
          `%cCACHE HIT! Entregando PLANO DE AULA salvo para: ${cacheKey}`,
          "color: green; font-weight: bold;"
        );
        const cachedData = JSON.parse(cacheSnap.data().response);
        return Array.isArray(cachedData) ? cachedData : [cachedData];
      }
    } catch (error) {
      console.error("Erro ao ler cache (Plano de Aula):", error);
    }
  }

  console.log(
    `%cCACHE MISS. Chamando API Gemini para PLANO DE AULA: ${cacheKey}`,
    "color: orange; font-weight: bold;"
  );

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `Sua tarefa é criar 15 sugestões de atividades criativas e práticas, descrevendo a ação do profissional (professor) com detalhes, dentro da realidade escolar.

**Contexto:**
- Aluno: Diagnóstico de "${aluno.diagnostico || "N/I"}".
- Habilidade-Alvo: Ajudar o aluno a progredir de "${
    LEGENDA_NIVEIS[meta.nivel]
  }" para "${LEGENDA_NIVEIS[meta.nivelAlmejado]}" na habilidade "${
    meta.habilidade
  }".
- Disciplina: "${disciplinaParaIA}".
- Estratégias de Apoio: ${estrategiasSelecionadas
    .map((e) => e.titulo)
    .join(", ")}.

**REGRAS DE FORMATAÇÃO (OBRIGATÓRIO SEGUIR):**
1.  **Direcionamento do Texto:** As atividades devem ser escritas como instruções PARA O PROFISSIONAL, descrevendo o que ele deve fazer. NUNCA escreva como se estivesse a dar uma ordem direta para o aluno.
2.  **Formato da Resposta:** A resposta DEVE ser um único JSON contendo uma lista de EXATAMENTE 15 strings. Exemplo: \`["atividade 1...", "atividade 2...", ...]\`.
3.  **Estilo do Texto:** Cada atividade deve ser um texto corrido, simples, direto, mas profissional e humanizado.
4.  **PROIBIDO:** É estritamente proibido usar qualquer tipo de formatação especial como títulos, subtítulos, listas de materiais, ou passos numerados, incluindo instruções 1, 2,etc.
5.  **PROIBIDO:** Erros ortográficos e de digitação.
**EXEMPLO DO ESTILO CORRETO (descrevendo a ação do professor):**
"Proponha a 'Missão Impossível: Corrigindo os Erros!'. Explique ao aluno que ele será o Super-Corretor. Entregue um trabalho com erros e peça para ele encontrar e consertar. A cada acerto, cole ao lado uma imagem de um super-herói ou personagem que conserta coisas, como um robô ou um mago. Reforce positivamente cada correção e celebre a conclusão da 'missão'."

Agora, gere a sua resposta seguindo TODAS as regras.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`API Error (Plano de Aula): ${err.error?.message}`);
  }
  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    console.error(
      "Resposta da IA veio sem conteúdo de texto (Plano de Aula). Resposta completa:",
      result
    );
    throw new Error(
      "A IA não retornou conteúdo de texto válido (Plano de Aula)."
    );
  }

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(textResponse.replace(/```json\n?|\n?```/g, ""));
  } catch (e) {
    console.error(
      "Falha ao PARSEAR a resposta da IA (Plano de Aula). Resposta bruta:",
      textResponse,
      e
    );
    throw new Error(
      "A IA retornou um formato de texto inesperado (Plano de Aula)."
    );
  }

  try {
    await setDoc(cacheRef, {
      response: textResponse,
      createdAt: serverTimestamp(),
    });
    console.log(
      `%cSALVO NO CACHE (Plano de Aula): ${cacheKey}`,
      "color: blue; font-weight: bold;"
    );
  } catch (error) {
    console.error(
      "Falha ao SALVAR no cache (Plano de Aula), mas a resposta era válida.",
      error
    );
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
  const disciplinaParaIA = normalizarDisciplinaParaIA(disciplinaProfessor); // <-- CORREÇÃO APLICADA

  const estrategiaTexto =
    typeof estrategia === "string"
      ? estrategia
      : estrategia.titulo || JSON.stringify(estrategia);
  const cacheKey = `${CACHE_VERSION}-ativ-individual-${
    aluno.diagnostico || "generico"
  }-${disciplinaParaIA}-${estrategiaTexto}` // <-- CORREÇÃO APLICADA
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "_");
  const cacheRef = doc(db, "geminiCache", cacheKey);

  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        console.log(
          `%cCACHE HIT! Entregando ATIVIDADE INDIVIDUAL salva para: ${cacheKey}`,
          "color: green; font-weight: bold;"
        );
        return JSON.parse(cacheSnap.data().response);
      }
    } catch (error) {
      console.error("Erro ao ler cache (Ativ. Individual):", error);
    }
  }

  console.log(
    `%cCACHE MISS. Chamando API Gemini para ATIVIDADE INDIVIDUAL: ${cacheKey}`,
    "color: orange; font-weight: bold;"
  );

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `Sua tarefa é criar 13 sugestões de atividades objetivas, criativas e de acordo com a realidade escolar, descrevendo com detalhes a ação do profissional.
- As atividades devem aplicar diretamente a estratégia: "${estrategiaTexto}".
- O texto de cada atividade deve ser uma instrução para o professor, não para o aluno.
- Tente oferecer sugestões diferentes e criativas.
- Os atendimentos sao indivíduais, entao as atividades precisam ser pensadas neste contexto.
- Responda APENAS com uma lista de 13 strings em formato JSON.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`API Error (Ativ. Individual): ${err.error?.message}`);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    console.error(
      "Resposta da IA veio sem conteúdo de texto (Ativ. Individual). Resposta completa:",
      result
    );
    throw new Error("IA não retornou resposta válida (Ativ. Individual).");
  }

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(textResponse.replace(/```json\n?|\n?```/g, ""));
    if (!Array.isArray(parsedResponse) || parsedResponse.length === 0) {
      throw new Error("A resposta da IA não é uma lista válida de sugestões.");
    }
  } catch (e) {
    console.error(
      "Falha ao PARSEAR a resposta da IA (Ativ. Individual). Resposta bruta:",
      textResponse,
      e
    );
    throw new Error(
      "A IA retornou um formato de texto inesperado (Ativ. Individual)."
    );
  }

  try {
    await setDoc(cacheRef, {
      response: textResponse,
      createdAt: serverTimestamp(),
    });
    console.log(
      `%cSALVO NO CACHE (Ativ. Individual): ${cacheKey}`,
      "color: blue; font-weight: bold;"
    );
  } catch (error) {
    console.error(
      "Falha ao SALVAR no cache (Ativ. Individual), mas a resposta era válida.",
      error
    );
  }

  return parsedResponse;
}

export async function getSugestaoQuebraGelo(
  aluno,
  disciplinaProfessor,
  forceRefresh = false
) {
  const disciplinaParaIA = normalizarDisciplinaParaIA(disciplinaProfessor); // <-- CORREÇÃO APLICADA

  const cacheKey = `${CACHE_VERSION}-quebra-gelo-${
    aluno.diagnostico || "generico"
  }-${disciplinaParaIA}` // <-- CORREÇÃO APLICADA
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "_");
  const cacheRef = doc(db, "geminiCache", cacheKey);

  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        console.log(
          `%cCACHE HIT! Entregando QUEBRA-GELO salvo para: ${cacheKey}`,
          "color: green; font-weight: bold;"
        );
        return cacheSnap.data().response;
      }
    } catch (error) {
      console.error("Erro ao ler cache (Quebra Gelo):", error);
    }
  }

  console.log(
    `%cCACHE MISS. Chamando API Gemini para QUEBRA-GELO: ${cacheKey}`,
    "color: orange; font-weight: bold;"
  );

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `Sua tarefa é criar uma atividade de "quebra-gelo" (2-3 min), descrevendo a ação do profissional.
- Contexto: Início de aula de "${disciplinaParaIA}" para um aluno com diagnóstico de "${
    aluno.diagnostico || "N/I"
  }".
- O texto deve ser uma instrução para o professor, não para o aluno.
- Responda APENAS com o texto da atividade, em formato de texto corrido.`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 400 },
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`API Error (Quebra Gelo): ${err.error?.message}`);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    console.error(
      "Resposta da IA veio sem conteúdo de texto (Quebra Gelo). Resposta completa:",
      result
    );
    throw new Error("IA não retornou resposta válida (Quebra Gelo).");
  }

  try {
    await setDoc(cacheRef, {
      response: textResponse.trim(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Falha ao salvar no cache (Quebra Gelo).", error);
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
  const disciplinaParaIA = normalizarDisciplinaParaIA(disciplinaProfessor); // <-- CORREÇÃO APLICADA

  const cacheKey = `${CACHE_VERSION}-finalizacao-${
    aluno.diagnostico || "generico"
  }-${disciplinaParaIA}` // <-- CORREÇÃO APLICADA
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "_");
  const cacheRef = doc(db, "geminiCache", cacheKey);

  if (!forceRefresh) {
    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        console.log(
          `%cCACHE HIT! Entregando FINALIZAÇÃO salva para: ${cacheKey}`,
          "color: green; font-weight: bold;"
        );
        return cacheSnap.data().response;
      }
    } catch (error) {
      console.error("Erro ao ler cache (Finalização):", error);
    }
  }

  console.log(
    `%cCACHE MISS. Chamando API Gemini para FINALIZAÇÃO: ${cacheKey}`,
    "color: orange; font-weight: bold;"
  );

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `Sua tarefa é criar uma atividade de "finalização" ou "volta à calma" (2-3 min), descrevendo a ação do profissional.
- Contexto: Fim de aula de "${disciplinaParaIA}" para um aluno com diagnóstico de "${
    aluno.diagnostico || "N/I"
  }".
- O texto deve ser uma instrução para o professor, não para o aluno.
- Responda APENAS com o texto da atividade, em formato de texto corrido.`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 400 },
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`API Error (Finalização): ${err.error?.message}`);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    console.error(
      "Resposta da IA veio sem conteúdo de texto (Finalização). Resposta completa:",
      result
    );
    throw new Error("IA não retornou resposta válida (Finalização).");
  }

  try {
    await setDoc(cacheRef, {
      response: textResponse.trim(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Falha ao salvar no cache (Finalização).", error);
  }
  return textResponse.trim();
}
