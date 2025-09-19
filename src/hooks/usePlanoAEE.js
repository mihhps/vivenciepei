// Arquivo: src/hooks/usePlanoAEE.js

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
} from "firebase/firestore";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

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

async function buscarSugestoesComIA_REAL(
  tipo,
  habilidade = "",
  idadeAluno = null
) {
  if (!GEMINI_API_KEY) {
    console.warn("API Key do Gemini não foi configurada.");
    return buscarSugestoesComIA_SIMULACAO(tipo, habilidade);
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  const systemInstruction = `Você é um especialista em Atendimento Educacional Especializado (AEE). Sua tarefa é criar sugestões de atividades pedagógicas concisas e práticas. Responda SEMPRE no formato solicitado e NADA MAIS.`;
  let userPrompt = "";

  // ##### ALTERAÇÃO AQUI: Aumento da temperatura para mais criatividade #####
  let generationConfig = { temperature: 0.9 };

  if (tipo === "quebraGelo") {
    // ##### ALTERAÇÃO AQUI: Pedido de variedade no prompt #####
    userPrompt = `Gere UMA sugestão criativa e DIFERENTE de atividade de "quebra-gelo" para o início de um atendimento AEE (duração aproximada: 5 minutos). A resposta deve ser apenas o texto da sugestão, sem títulos ou explicações extras.`;
  } else if (tipo === "finalizacao") {
    // ##### ALTERAÇÃO AQUI: Pedido de variedade no prompt #####
    userPrompt = `Gere UMA sugestão criativa e DIFERENTE de atividade de "finalização" para encerrar um atendimento AEE. A atividade deve ser calma e previsível. A resposta deve ser apenas o texto da sugestão, sem títulos ou explicações extras.`;
  } else {
    // ##### ALTERAÇÃO AQUI: Pedido de variedade no prompt principal #####
    userPrompt = `Gere uma sugestão NOVA e CRIATIVA de atividade principal para um atendimento AEE focada na habilidade: "${habilidade}". Adapte para a idade: ${
      idadeAluno || "não informada"
    } anos. Evite dar a mesma sugestão se for perguntado novamente sobre a mesma habilidade.

Sua resposta deve ter EXATAMENTE este formato, usando os títulos em português:
Título: [Título da Atividade]
Objetivos:
- [Primeiro objetivo]
- [Segundo objetivo]
Recursos: [Materiais necessários]
Metodologia: [Passo a passo com verbos no infinitivo. Pode ter múltiplos parágrafos ou itens.]
Duração: [Duração estimada]`;
  }

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    system_instruction: { parts: [{ text: systemInstruction }] },
    generationConfig, // generationConfig atualizado
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error("Erro da API Gemini:", errorBody);
    throw new Error(
      `Erro na API: ${errorBody.error?.message || "Resposta inválida"}`
    );
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error("A IA não retornou uma resposta válida.");
  }

  if (tipo === "atividadePrincipal") {
    const atividadeParseada = parseAtividadeFromText(textResponse);
    if (atividadeParseada) {
      return [atividadeParseada];
    } else {
      console.error("Erro ao analisar a resposta da IA:", textResponse);
      throw new Error("A IA retornou um formato de texto inesperado.");
    }
  }

  return textResponse;
}

// ... (O restante do arquivo continua exatamente igual)

async function buscarSugestoesComIA_SIMULACAO(tipo, habilidade = "") {
  console.warn(
    "Usando dados de simulação. Adicione uma API Key para usar a IA real."
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  const quebraGelos = [
    "Iniciar com 'massinha sensorial'.",
    "Começar com a 'Música do Olá'.",
    "Fazer um desenho livre sobre como se sente hoje.",
    "Brincar de 'estátua' com música calma.",
  ];
  const finalizacoes = [
    "Terminar com a 'Canção do Tchau'.",
    "Fazer a 'Massagem das Costas'.",
    "Guardar os materiais ouvindo uma música relaxante.",
    "Contar o que mais gostou de fazer no atendimento.",
  ];

  if (tipo === "quebraGelo")
    return quebraGelos[Math.floor(Math.random() * quebraGelos.length)];
  if (tipo === "finalizacao")
    return finalizacoes[Math.floor(Math.random() * finalizacoes.length)];

  return [
    {
      titulo: `Atividade Simulada para ${
        habilidade || "habilidade não informada"
      }`,
      objetivos: ["Objetivo simulado 1", "Objetivo simulado 2"],
      recursos: "Recursos de teste",
      metodologia: "Metodologia de teste para a habilidade.",
      duracao: "30 minutos",
    },
  ];
}

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
    async (tipo, habilidade) => {
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
          habilidade?.habilidade,
          idade
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
