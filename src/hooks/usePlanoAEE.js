import { useState, useEffect, useCallback } from "react";
import { db, auth } from "../firebase";
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

// Funções de Parse e Lógica da IA
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

function parseMultiplasAtividadesFromText(textResponse) {
  if (!textResponse) return [];
  const sugestoesSeparadas = textResponse.split("---NOVA SUGESTAO---");
  return sugestoesSeparadas
    .map((sugestaoText) => parseAtividadeFromText(sugestaoText.trim()))
    .filter(Boolean);
}

async function buscarSugestoesComIA_REAL(
  tipo,
  habilidadeObj = {},
  idadeAluno = null
) {
  let habilidadeTexto = "";
  if (tipo === "atividadePrincipal") {
    habilidadeTexto = habilidadeObj.habilidade || "";
  }

  // Se a API Key não estiver configurada, usamos a simulação
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("API Key do Gemini não configurada. Usando simulação.");
    return buscarSugestoesComIA_SIMULACAO(tipo, habilidadeTexto);
  }

  // --- MONTAGEM DO PROMPT ---
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

  // --- CHAMADA DO SERVIÇO CORRIGIDO ---
  try {
    const textResponse = await generateSugestoesAEE(
      tipo,
      userPrompt,
      systemInstruction
    );
    // --- TRATAMENTO DA RESPOSTA ---
    if (tipo === "atividadePrincipal") {
      return parseMultiplasAtividadesFromText(textResponse);
    }
    return textResponse
      .split("|||")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (e) {
    // Re-lança o erro com o contexto
    console.error(`Erro ao chamar IA para ${tipo}:`, e);
    throw new Error(`Erro na API: ${e.message}`);
  }
}

async function buscarSugestoesComIA_SIMULACAO(tipo, habilidade = "") {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const quebraGelos = [
    "Iniciar com 'massinha sensorial'.",
    "Começar com a 'Música do Olá'.",
  ];
  const finalizacoes = [
    "Terminar com a 'Canção do Tchau'.",
    "Fazer a 'Massagem das Costas'.",
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

// Hook Principal
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
        let dataPlanoFormatada = planoData.dataPlano || "";
        if (planoData.dataPlano && planoData.dataPlano.toDate) {
          dataPlanoFormatada = planoData.dataPlano
            .toDate()
            .toISOString()
            .split("T")[0];
        }
        setPlano({
          id: planoSnap.id,
          ...planoData,
          habilidades: planoData.habilidades || [],
          dataPlano: dataPlanoFormatada,
        });
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
      if (
        tipo === "atividadePrincipal" &&
        (typeof habilidade !== "object" || !habilidade?.id)
      ) {
        console.error(
          "--- CHAMADA INCORRETA DETECTADA PARA GETSUGESTOES ---",
          habilidade
        );
        return [];
      }
      if (!aluno)
        throw new Error("Dados do aluno não carregados para gerar sugestão.");

      try {
        const idade = aluno?.nascimento
          ? new Date().getFullYear() -
            (aluno.nascimento.toDate
              ? aluno.nascimento.toDate()
              : new Date(aluno.nascimento)
            ).getFullYear()
          : null;
        // Chamada à função que executa a IA
        return await buscarSugestoesComIA_REAL(
          tipo,
          habilidade,
          idade,
          aluno,
          forceRefresh
        );
      } catch (e) {
        // O erro de API será capturado aqui
        console.error("Erro ao buscar sugestões:", e);
        // Garante que o erro é visível na tela
        setEstado((s) => ({
          ...s,
          erro: e.message || "Falha ao buscar sugestões da IA.",
        }));
        throw new Error("Falha ao buscar sugestões da IA.");
      }
    },
    [aluno]
  );

  const criarPlanoEmBranco = async (alunoId) => {
    setEstado((s) => ({ ...s, carregando: true, erro: null }));
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado.");

      const novoPlano = {
        habilidades: [],
        criadoEm: Timestamp.now(),
        dataPlano: new Date().toISOString().split("T")[0],
        alunoId: alunoId,
        horariosAtendimento: [],
        criadorId: user.uid,
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

      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado."); // Checagem adicionada aqui

      const novoPlano = {
        habilidades: habilidadesParaPlanejar,
        criadoEm: Timestamp.now(),
        dataPlano: new Date().toISOString().split("T")[0],
        baseadoEm: avaliacaoSnap.docs[0].id,
        alunoId: alunoId,
        horariosAtendimento: [],
        criadorId: user.uid,
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

  const salvarPlanejamentoDeAtividade = async (dadosPlanejamento) => {
    setEstado((s) => ({ ...s, carregando: true, erro: null }));
    try {
      const atividadesRef = collection(db, "alunos", alunoId, "atividadesAEE");
      await addDoc(atividadesRef, {
        ...dadosPlanejamento,
        data: Timestamp.now(),
        status: "Planejada",
      });
      await carregarDados();
    } catch (e) {
      console.error("Erro ao salvar planejamento:", e);
      setEstado({
        ...estado,
        carregando: false,
        erro: "Não foi possível salvar o planejamento.",
      });
    } finally {
      setEstado((s) => ({ ...s, carregando: false }));
    }
  };

  const salvarRegistroDeAtendimento = async (
    atividadeId,
    dadosAcompanhamento
  ) => {
    setEstado((s) => ({ ...s, carregando: true, erro: null }));
    try {
      const atividadeRef = doc(
        db,
        "alunos",
        alunoId,
        "atividadesAEE",
        atividadeId
      );
      await updateDoc(atividadeRef, {
        "atividadePrincipal.habilidadesAvaliadas":
          dadosAcompanhamento.habilidadesAvaliadas,
        status: "Realizada",
        dataRealizacao: Timestamp.now(),
      });
      const idsUnicos = [
        ...new Set(
          dadosAcompanhamento.habilidadesAvaliadas.map((h) => h.habilidadeId)
        ),
      ];
      await Promise.all(
        idsUnicos.map((id) =>
          atualizarStatusHabilidade(id, "Em desenvolvimento")
        )
      );
      await carregarDados();
    } catch (e) {
      console.error("Erro ao salvar registro do atendimento:", e);
      setEstado({
        ...estado,
        carregando: false,
        erro: "Não foi possível salvar o registro.",
      });
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

  const salvarDataPlano = async (dataString) => {
    if (!plano || !dataString) return;
    try {
      const planoRef = doc(db, "alunos", alunoId, "planoAEE", "planoAtivo");
      const dataSelecionada = new Date(dataString + "T00:00:00");
      const dataTimestamp = Timestamp.fromDate(dataSelecionada);
      await updateDoc(planoRef, { dataPlano: dataTimestamp });
      setPlano((p) => ({ ...p, dataPlano: dataString }));
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
    salvarHorariosAtendimento,
    getSugestoes,
    atualizarStatusHabilidade,
    adicionarHabilidade,
    salvarDataPlano,
    salvarPlanejamentoDeAtividade,
    salvarRegistroDeAtendimento,
  };
}
