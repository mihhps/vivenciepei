import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { db } from "../firebase";
import {
  getDocs,
  collection,
  addDoc,
  query,
  where,
  updateDoc,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import BotaoVerPEIs from "../components/BotaoVerPEIs";
import { useNavigate } from "react-router-dom";

// Imports dos seus dados
import estruturaPEI from "../data/estruturaPEI2"; // Seu arquivo principal de habilidades/estratégias
import { avaliacaoInicial } from "../data/avaliacaoInicialData"; // Avaliação inicial

// NOVOS IMPORTS DOS OBJETIVOS POR PRAZO
import objetivosCurtoPrazoData from "../data/objetivosCurtoPrazo";
import objetivosMedioPrazoData from "../data/objetivosMedioPrazo";

// IMPORTAR O NOVO ARQUIVO CSS AQUI
import "../styles/CriarPEIComponent.css";

// --- CONSTANTES E FUNÇÕES AUXILIARES GERAIS ---

const NIVEIS_PROGRESSAO = ["NR", "AF", "AG", "AV", "AVi", "I"];
const LEGENDA_NIVEIS = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
  NA: "Não aplicável",
};

// Memoized map para busca rápida na estrutura do PEI (habilidades e estratégias gerais)
const getEstruturaPEIMap = (estrutura) => {
  const map = {};
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
                    map[habilidadeName][nivel] = data; // Contém objetivo e estratégias
                  });
                } else {
                  console.warn(
                    `[PEI WARN] 'niveisData' para habilidade "${habilidadeName}" NÃO é um objeto válido em "${areaName}" -> "${subareaName}". Não será mapeada corretamente.`
                  );
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

// Função para criar mapas para os objetivos de cada prazo
const getObjetivosPrazoMap = (prazoData) => {
  const map = {};
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
                  Object.entries(niveisData).forEach(([nivel, data]) => {
                    map[habilidadeName][nivel] = data.objetivo; // Salva diretamente o texto do objetivo
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

// Hook customizado para sistema de mensagens
const useMessageSystem = () => {
  const [erro, setErro] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState(null);

  const exibirMensagem = useCallback((tipo, texto) => {
    if (tipo === "erro") {
      setErro(texto);
      setMensagemSucesso(null);
    } else if (tipo === "sucesso") {
      setMensagemSucesso(texto);
      setErro(null);
    }
    setTimeout(() => {
      setErro(null);
      setMensagemSucesso(null);
    }, 5000);
  }, []);

  return { erro, mensagemSucesso, exibirMensagem };
};

// --- FUNÇÕES AUXILIARES ESPECÍFICAS DO PEI ---

// Função para verificar permissão de criação/edição do PEI
const verificarPermissaoIniciarPrimeiroPEI = (usuarioPerfil, usuarioCargo) => {
  const perfisIniciadores = ["gestao", "aee", "seme", "desenvolvedor"];
  const cargosIniciadores = ["PROFESSOR REGENTE", "PROFESSOR DE SUPORTE"];

  return (
    perfisIniciadores.includes(usuarioPerfil) ||
    cargosIniciadores.includes(usuarioCargo)
  );
};

// Função para construir um novo PEI a partir da avaliação
// AGORA RECEBE TAMBÉM OS OBJETIVOS CURTO E MÉDIO PRAZO MAPS
const buildNewPeiFromAssessment = (
  avaliacao,
  estruturaPEIMap, // Contém objetivo LONGO PRAZO e estratégias
  objetivosCurtoPrazoMap, // NOVO: para objetivo CURTO PRAZO
  objetivosMedioPrazoMap, // NOVO: para objetivo MÉDIO PRAZO
  objetivosPrimeiroPEISet = new Set(), // Objetivos de Longo Prazo já escolhidos no PEI Base
  estrategiasJaEmUsoGlobalmente = new Set() // Estratégias já usadas em qualquer PEI do aluno
) => {
  const newPeiData = {}; // A estrutura do estado `pei` será única por meta
  Object.entries(avaliacao.respostas || {}).forEach(
    ([area, habilidadesAvaliacao]) => {
      if (
        typeof habilidadesAvaliacao !== "object" ||
        habilidadesAvaliacao === null
      ) {
        console.warn(
          `AVISO: Habilidades da área "${area}" na avaliação não são um objeto válido. Pulando.`
        );
        return;
      }
      Object.entries(habilidadesAvaliacao).forEach(
        ([habilidade, nivelAtual]) => {
          // --- Ignorar se o nível atual já é "I" (Independente) ou "NA" (Não Aplicável) ---
          if (nivelAtual === "I" || nivelAtual === "NA") {
            console.log(
              `Habilidade '${habilidade}' está no nível '${nivelAtual}'. Não será gerada meta de PEI.`
            );
            return; // Pula esta habilidade e vai para a próxima
          }

          const currentIndex = NIVEIS_PROGRESSAO.indexOf(nivelAtual);
          let nivelAlmejado = nivelAtual; // Valor padrão, pode ser ajustado

          if (
            currentIndex !== -1 &&
            currentIndex < NIVEIS_PROGRESSAO.length - 1
          ) {
            nivelAlmejado = NIVEIS_PROGRESSAO[currentIndex + 1];
          } else {
            console.warn(
              `Nível avaliado '${nivelAtual}' para habilidade '${habilidade}' (Área '${area}') não encontrado na progressão ou é o último (e não 'I'). Não será gerada meta de PEI.`
            );
            return;
          }

          // Pega os objetivos dos mapas correspondentes
          const suggestedObjetivoLongoPrazo =
            estruturaPEIMap[habilidade]?.[nivelAlmejado]?.objetivo;
          const suggestedObjetivoCurtoPrazo =
            objetivosCurtoPrazoMap[habilidade]?.[nivelAlmejado];
          const suggestedObjetivoMedioPrazo =
            objetivosMedioPrazoMap[habilidade]?.[nivelAlmejado];

          // Pega as estratégias do mapa principal (estruturaPEIMap)
          const suggestedStrategiesFromBase =
            estruturaPEIMap[habilidade]?.[nivelAlmejado]?.estrategias;

          // Validação: Garante que todos os objetivos e as estratégias foram encontrados
          if (
            !suggestedObjetivoCurtoPrazo ||
            !suggestedObjetivoMedioPrazo ||
            !suggestedObjetivoLongoPrazo ||
            !suggestedStrategiesFromBase ||
            (Array.isArray(suggestedStrategiesFromBase) &&
              suggestedStrategiesFromBase.length === 0)
          ) {
            console.warn(
              `Nenhuma sugestão COMPLETA (objetivos CP/MP/LP ou estratégias) encontrada em estruturaPEI/objetivosPrazo para a habilidade: '${habilidade}' no nível almejado: '${nivelAlmejado}'. Meta IGNORADA.`
            );
            return;
          }

          // FILTRAR OBJETIVOS: Se objetivosPrimeiroPEISet tem itens (indicando que é um PEI subsequente),
          // e o objetivo sugerido de LONGO PRAZO NÃO está nesse set, ele é ignorado.
          if (
            objetivosPrimeiroPEISet.size > 0 &&
            !objetivosPrimeiroPEISet.has(suggestedObjetivoLongoPrazo)
          ) {
            return;
          }

          // FILTRAR ESTRATÉGIAS: Filtra estratégias sugeridas que já estão em uso globalmente
          const estrategiasFiltradas = Array.isArray(
            suggestedStrategiesFromBase
          )
            ? suggestedStrategiesFromBase.filter(
                (estrat) => !estrategiasJaEmUsoGlobalmente.has(estrat)
              )
            : [suggestedStrategiesFromBase].filter(
                // Garante que é um array para filter
                (estrat) => !estrategiasJaEmUsoGlobalmente.has(estrat)
              );

          // Se após a filtragem não restarem estratégias, não adiciona a meta
          if (estrategiasFiltradas.length === 0) {
            console.log(
              `Nenhuma estratégia disponível para a meta de habilidade "${habilidade}" no nível "${nivelAlmejado}" após filtragem global.`
            );
            return; // Pula a meta se todas as estratégias sugeridas já foram usadas
          }

          if (!newPeiData[area]) newPeiData[area] = [];
          newPeiData[area].push({
            habilidade,
            nivel: nivelAtual,
            nivelAlmejado: nivelAlmejado,
            objetivos: {
              // Objeto contendo os objetivos de todos os prazos
              curtoPrazo: suggestedObjetivoCurtoPrazo,
              medioPrazo: suggestedObjetivoMedioPrazo,
              longoPrazo: suggestedObjetivoLongoPrazo,
            },
            estrategias: estrategiasFiltradas, // As estratégias sugeridas (filtradas)
            estrategiasSelecionadas: [], // As que o professor de fato selecionou/digitou
          });
        }
      );
    }
  );
  return newPeiData;
};

// Função para carregar um PEI existente
const loadExistingPeiData = (
  peiExistingData,
  estruturaPEIMap, // Mantido para acessar estratégias sugeridas E o objetivo principal/Longo Prazo
  objetivosCurtoPrazoMap, // NOVO: para preencher CP de PEIs antigos
  objetivosMedioPrazoMap, // NOVO: para preencher MP de PEIs antigos
  userEmail,
  criadorPEIId
) => {
  const mountedPei = {};
  const mountedManualInput = {};
  const activityAppliedExisting = peiExistingData.atividadeAplicada || "";

  // Adaptação para PEIs salvos na estrutura antiga (`resumoPEI`)
  const resumoPEIExisting = peiExistingData.resumoPEI || [];
  // Para PEIs salvos na nova estrutura (com objetivos aninhados)
  const newStructureGoals = peiExistingData.resumoPEI || []; // Assumimos que a nova estrutura salva em 'resumoPEI'

  const isCurrentUserThePEICreater = userEmail === criadorPEIId;

  (newStructureGoals || []).forEach((meta) => {
    // Itera sobre as metas salvas
    if (!mountedPei[meta.area]) mountedPei[meta.area] = [];

    // O objetivo salvo pode ser uma string (PEIs antigos) ou um objeto (PEIs novos)
    let finalObjectives = {
      curtoPrazo: "",
      medioPrazo: "",
      longoPrazo: "",
    };

    if (typeof meta.objetivos === "object" && meta.objetivos !== null) {
      // Se já é a nova estrutura com objeto 'objetivos'
      finalObjectives = {
        curtoPrazo: meta.objetivos.curtoPrazo || "",
        medioPrazo: meta.objetivos.medioPrazo || "",
        longoPrazo: meta.objetivos.longoPrazo || "",
      };
    } else {
      // Compatibilidade retroativa: Se 'meta.objetivo' é uma string (PEIs antigos)
      finalObjectives.longoPrazo = meta.objetivo || ""; // O objetivo antigo era o Longo Prazo
      // Preenche Curto e Médio Prazo com sugestões dos mapas
      finalObjectives.curtoPrazo =
        objetivosCurtoPrazoMap[meta.habilidade]?.[meta.nivelAlmejado] || "";
      finalObjectives.medioPrazo =
        objetivosMedioPrazoMap[meta.habilidade]?.[meta.nivelAlmejado] || "";
    }

    const suggestionBlock =
      estruturaPEIMap[meta.habilidade]?.[meta.nivelAlmejado];
    let suggestedStrategiesFromMap = [];
    if (Array.isArray(suggestionBlock?.estrategias)) {
      suggestedStrategiesFromMap = [...suggestionBlock.estrategias];
    } else if (typeof suggestionBlock?.estrategias === "string") {
      suggestedStrategiesFromMap = [suggestionBlock.estrategias];
    }

    const savedStrategies = Array.isArray(meta.estrategiasSelecionadas)
      ? meta.estrategiasSelecionadas
      : [];

    const selectedSuggestedFromSaved = savedStrategies.filter((saved) =>
      suggestedStrategiesFromMap.includes(saved)
    );

    const manualSavedStrategies = savedStrategies.filter(
      (saved) => !suggestedStrategiesFromMap.includes(saved)
    );

    const availableSuggestedStrategies = isCurrentUserThePEICreater
      ? suggestedStrategiesFromMap
      : suggestedStrategiesFromMap.filter(
          (sug) => !selectedSuggestedFromSaved.includes(sug)
        );

    const manualKey = `${meta.area}-${meta.habilidade.replace(
      /[^a-zA-Z0-9-]/g,
      ""
    )}`;
    mountedManualInput[manualKey] = {
      estrategiasManuais: manualSavedStrategies.join("\n"),
      estrategias: selectedSuggestedFromSaved,
    };

    mountedPei[meta.area].push({
      habilidade: meta.habilidade,
      nivel: meta.nivel,
      nivelAlmejado: meta.nivelAlmejado || meta.nivel,
      objetivos: finalObjectives, // Objeto com todos os objetivos de prazo
      estrategias: availableSuggestedStrategies, // Estratégias sugeridas disponíveis para seleção
      estrategiasSelecionadas: selectedSuggestedFromSaved, // Estratégias sugeridas JÁ selecionadas (para controle interno)
    });
  });
  return {
    pei: mountedPei,
    atividadeAplicada: activityAppliedExisting,
    entradaManual: mountedManualInput,
  };
};

// --- COMPONENTE PRINCIPAL ---
export default function CriarPEI() {
  const [alunos, setAlunos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [areaAtiva, setAreaAtiva] = useState("");
  const [pei, setPei] = useState({}); // Agora 'pei' conterá o objeto 'objetivos' com os 3 prazos
  const [entradaManual, setEntradaManual] = useState({}); // Estado para estratégias manuais e selecionadas
  const [carregando, setCarregando] = useState(false);
  const [atividadeAplicada, setAtividadeAplicada] = useState("");
  const [peiCriadorId, setPeiCriadorId] = useState(null); // ID do criador do PEI carregado

  const [activeTab, setActiveTab] = useState("longoPrazo"); // Define a aba padrão como "Longo Prazo"

  const navigate = useNavigate();
  const { erro, mensagemSucesso, exibirMensagem } = useMessageSystem();

  const estruturaPEIMap = useMemo(() => getEstruturaPEIMap(estruturaPEI), []);
  const objetivosCurtoPrazoMap = useMemo(
    () => getObjetivosPrazoMap(objetivosCurtoPrazoData),
    []
  );
  const objetivosMedioPrazoMap = useMemo(
    () => getObjetivosPrazoMap(objetivosMedioPrazoData),
    []
  );
  // Nao precisa mais de objetivosLongoPrazoMap, pois o longo prazo vem de estruturaPEIMap.objetivo

  const todasAsAreas = useMemo(() => Object.keys(avaliacaoInicial), []);
  const usuarioLogado = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usuarioLogado")) || {};
    } catch (e) {
      console.error("Erro ao fazer parse do usuário logado:", e);
      return {};
    }
  }, []);

  const isPEICriador = useMemo(
    () => usuarioLogado.email === peiCriadorId,
    [usuarioLogado.email, peiCriadorId]
  );

  // --- LÓGICA DE CARREGAMENTO DE DADOS INICIAIS ---
  // AQUI É A ÚNICA FUNÇÃO QUE FOI MODIFICADA
  const carregarDadosIniciais = useCallback(async () => {
    setCarregando(true);
    exibirMensagem("sucesso", "Carregando dados iniciais...");
    try {
      const currentYear = new Date().getFullYear();

      const [alunosSnap, avaliacoesSnap] = await Promise.all([
        getDocs(collection(db, "alunos")),
        getDocs(collection(db, "avaliacoesIniciais")),
      ]);

      const todosAlunos = alunosSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const todasAvaliacoes = avaliacoesSnap.docs.map((doc) => doc.data());

      const { perfil, turmas } = usuarioLogado;
      const turmasVinculadas = turmas ? Object.keys(turmas) : [];

      let alunosFiltradosParaExibir = todosAlunos;

      // Filtra alunos por turma, a menos que o perfil tenha acesso amplo
      const podeVerTodosAlunosNoSistema =
        perfil === "gestao" ||
        perfil === "aee" ||
        perfil === "seme" ||
        perfil === "desenvolvedor";

      if (!podeVerTodosAlunosNoSistema) {
        alunosFiltradosParaExibir = alunosFiltradosParaExibir.filter((aluno) =>
          turmasVinculadas.includes(aluno.turma)
        );
      }

      // NOVO: A lista de alunos para a seleção será apenas a lista
      // dos alunos da turma do professor (ou todos, para perfis de gestão/AEE).
      // A lógica de "tem PEI ou não" será tratada na próxima etapa, em handleSelectStudent.
      setAlunos(alunosFiltradosParaExibir);
      setAvaliacoes(todasAvaliacoes);
      exibirMensagem("sucesso", "Dados carregados com sucesso.");
    } catch (err) {
      console.error("Erro ao carregar dados do Firebase:", err);
      exibirMensagem(
        "erro",
        "Falha ao carregar dados. Tente recarregar a página."
      );
    } finally {
      setCarregando(false);
    }
  }, [exibirMensagem, usuarioLogado]);

  useEffect(() => {
    carregarDadosIniciais();
  }, [carregarDadosIniciais]);

  // --- HANDLER DE SELEÇÃO DE ALUNO ---
  const handleSelectStudent = useCallback(
    async (nome) => {
      if (!nome) {
        setAlunoSelecionado(null);
        setPei({});
        setAreaAtiva("");
        setEntradaManual({});
        setAtividadeAplicada("");
        setPeiCriadorId(null);
        setActiveTab("longoPrazo"); // Resetar aba ativa
        exibirMensagem("erro", "Selecione um aluno válido.");
        return;
      }

      const aluno = alunos.find(
        (a) => a.nome.trim().toLowerCase() === nome.trim().toLowerCase()
      );

      if (!aluno) {
        exibirMensagem("erro", "Aluno não encontrado.");
        return;
      }

      setAlunoSelecionado(aluno);
      exibirMensagem("sucesso", "Carregando PEI...");
      setCarregando(true);
      setActiveTab("longoPrazo"); // Garantir que a aba inicia em Longo Prazo ao selecionar novo aluno

      try {
        const currentYear = new Date().getFullYear();

        // 1. Tenta buscar o PEI criado por ESTE USUÁRIO para este aluno
        const qPeiDesseCriador = query(
          collection(db, "peis"),
          where("alunoId", "==", aluno.id),
          where("anoLetivo", "==", currentYear),
          where("criadorId", "==", usuarioLogado.email),
          orderBy("dataCriacao", "desc"),
          limit(1)
        );
        const peiDesseCriadorSnap = await getDocs(qPeiDesseCriador);

        let peiExistingParaEsteCriador = null;
        if (!peiDesseCriadorSnap.empty) {
          peiExistingParaEsteCriador = {
            id: peiDesseCriadorSnap.docs[0].id,
            ...peiDesseCriadorSnap.docs[0].data(),
          };
        }

        // 2. Busca o PRIMEIRO PEI do aluno (de QUALQUER criador) para saber seus objetivos base
        const qPrimeiroPeiDoAluno = query(
          collection(db, "peis"),
          where("alunoId", "==", aluno.id),
          where("anoLetivo", "==", currentYear),
          orderBy("dataCriacao", "asc"),
          limit(1)
        );
        const primeiroPeiSnap = await getDocs(qPrimeiroPeiDoAluno);
        const alunoJaTemQualquerPei = !primeiroPeiSnap.empty;
        const primeiroPeiDoAluno = alunoJaTemQualquerPei
          ? {
              id: primeiroPeiSnap.docs[0].id,
              ...primeiroPeiSnap.docs[0].data(),
            }
          : null;

        // 3. NOVO: Coleta TODAS as estratégias de TODOS os PEIs existentes para este aluno (para filtragem global)
        const qTodosPeisDoAluno = query(
          collection(db, "peis"),
          where("alunoId", "==", aluno.id),
          where("anoLetivo", "==", currentYear)
        );
        const todosPeisDoAlunoSnap = await getDocs(qTodosPeisDoAluno);
        const estrategiasJaEmUsoGlobalmente = new Set();
        todosPeisDoAlunoSnap.docs.forEach((doc) => {
          const peiData = doc.data();
          if (Array.isArray(peiData.resumoPEI)) {
            // Agora estratégias vêm de resumoPEI
            peiData.resumoPEI.forEach((meta) => {
              if (Array.isArray(meta.estrategiasSelecionadas)) {
                meta.estrategiasSelecionadas.forEach((estrat) =>
                  estrategiasJaEmUsoGlobalmente.add(estrat)
                );
              }
            });
          }
        });

        // Extrair objetivos de LONGO PRAZO do PRIMEIRO PEI para filtragem posterior de NOVO PEI
        // Compatibilidade: Se o PEI já tem a nova estrutura de objetivos (com .longoPrazo), use-a.
        // Se for um PEI antigo, use a string `meta.objetivo` (que é o que era o longo prazo antes).
        const objetivosDoPrimeiroPEISet = new Set();
        if (primeiroPeiDoAluno && Array.isArray(primeiroPeiDoAluno.resumoPEI)) {
          primeiroPeiDoAluno.resumoPEI.forEach((meta) => {
            if (
              typeof meta.objetivos === "object" &&
              meta.objetivos !== null &&
              meta.objetivos.longoPrazo
            ) {
              objetivosDoPrimeiroPEISet.add(meta.objetivos.longoPrazo);
            } else if (typeof meta.objetivo === "string") {
              // Compatibilidade com PEIs antigos (antes da reestruturação)
              objetivosDoPrimeiroPEISet.add(meta.objetivo);
            }
          });
        }

        // 4. Determina quem são os perfis/cargos que podem iniciar o PRIMEIRO PEI
        const podeIniciarPrimeiroPEI = verificarPermissaoIniciarPrimeiroPEI(
          usuarioLogado.perfil,
          usuarioLogado.cargo
        );

        if (peiExistingParaEsteCriador) {
          // CENÁRIO A: ENCONTROU UM PEI FEITO POR ESTE CRIADOR -> CARREGA PARA EDIÇÃO
          // Esta é a edição do PEI DELE. Objetivos e estratégias já foram definidos por ele.
          setPeiCriadorId(peiExistingParaEsteCriador.criadorId || null);

          const {
            pei: loadedPei,
            atividadeAplicada: loadedAtividade,
            entradaManual: loadedManual,
          } = loadExistingPeiData(
            peiExistingParaEsteCriador,
            estruturaPEIMap,
            objetivosCurtoPrazoMap, // Passar para preencher objetivos CP/MP de PEIs antigos
            objetivosMedioPrazoMap, // Passar para preencher objetivos CP/MP de PEIs antigos
            usuarioLogado.email,
            peiExistingParaEsteCriador.criadorId
          );

          setPei(loadedPei);
          setAreaAtiva(Object.keys(loadedPei)[0] || todasAsAreas[0] || "");
          setAtividadeAplicada(loadedAtividade);
          setEntradaManual(loadedManual);
          exibirMensagem(
            "sucesso",
            "PEI existente (criado por você) carregado para edição."
          );
        } else {
          // CENÁRIO B: NÃO ENCONTROU UM PEI FEITO POR ESTE CRIADOR (criar um NOVO PEI dele)

          // 5. VERIFICAÇÃO DE PERMISSÃO PARA INICIAR PEI (SEJA O PRIMEIRO OU UM SUBSEQUENTE)
          // Se o aluno NÃO TEM NENHUM PEI AINDA E o usuário NÃO PODE iniciar o primeiro PEI
          if (!alunoJaTemQualquerPei && !podeIniciarPrimeiroPEI) {
            exibirMensagem(
              "erro",
              `Este aluno não possui PEI. Apenas AEE, Gestão, Prof. de Suporte e Prof. Regente podem iniciar o primeiro PEI.`
            );
            setAlunoSelecionado(null);
            setPeiCriadorId(null);
            return;
          }

          // Se chegou até aqui, o usuário PODE CRIAR UM NOVO PEI (DELE).
          // Agora, precisamos da Avaliação Inicial.
          const assessment = avaliacoes.find((a) => {
            // CORREÇÃO AQUI: Lidar com 'a.aluno' que pode ser objeto ou string
            const nomeAvaliacao =
              typeof a.aluno === "object" && a.aluno !== null && a.aluno.nome
                ? a.aluno.nome
                : a.aluno;
            return (
              String(nomeAvaliacao).trim().toLowerCase() ===
              nome.trim().toLowerCase()
            );
          });

          if (!assessment) {
            exibirMensagem("erro", "Este aluno não possui avaliação inicial.");
            setAlunoSelecionado(null);
            setPeiCriadorId(null);
            return;
          }

          const newPei = buildNewPeiFromAssessment(
            assessment,
            estruturaPEIMap,
            objetivosCurtoPrazoMap,
            objetivosMedioPrazoMap,
            objetivosDoPrimeiroPEISet, // Passa os objetivos de Longo Prazo para filtrar
            estrategiasJaEmUsoGlobalmente
          );

          // VERIFICA SE O PEI GERADO ESTÁ VAZIO APÓS A FILTRAGEM DE OBJETIVOS E ESTRATÉGIAS
          const isNewPeiEmpty = Object.keys(newPei).every(
            (area) => newPei[area].length === 0
          );

          if (isNewPeiEmpty) {
            let errorMessageDetail = "";
            if (alunoJaTemQualquerPei) {
              errorMessageDetail =
                "Os objetivos sugeridos para este aluno já foram abordados no PEI inicial ou não se aplicam ao seu nível, e/ou todas as estratégias disponíveis já estão em uso.";
            } else {
              errorMessageDetail =
                "Não há objetivos ou estratégias sugeridas para este aluno com base em sua avaliação.";
            }
            exibirMensagem(
              "erro",
              `Não foi possível iniciar um novo PEI. ${errorMessageDetail}`
            );
            setAlunoSelecionado(null);
            setPeiCriadorId(null);
            return;
          }

          setPei(newPei);
          setAreaAtiva(Object.keys(newPei)[0] || todasAsAreas[0] || "");
          setAtividadeAplicada("");
          setEntradaManual({});
          setPeiCriadorId(usuarioLogado.email);
          exibirMensagem(
            "sucesso",
            `Novo PEI iniciado com base na avaliação inicial. Você está criando o SEU PEI para este aluno.`
          );
        }
      } catch (err) {
        console.error("Erro ao buscar/criar PEI:", err);
        exibirMensagem(
          "erro",
          `Erro ao carregar ou iniciar PEI: ${err.message}.`
        );
      } finally {
        setCarregando(false);
      }
    },
    [
      alunos,
      avaliacoes,
      exibirMensagem,
      verificarPermissaoIniciarPrimeiroPEI,
      buildNewPeiFromAssessment,
      estruturaPEIMap,
      objetivosCurtoPrazoMap, // Dependência
      objetivosMedioPrazoMap, // Dependência
      loadExistingPeiData,
      todasAsAreas,
      usuarioLogado.cargo,
      usuarioLogado.perfil,
      usuarioLogado.email,
    ]
  );

  // --- HANDLER DE SALVAMENTO DO PEI ---
  const handleSavePEI = async () => {
    if (!alunoSelecionado) {
      exibirMensagem("erro", "Selecione um aluno antes de salvar.");
      return;
    }

    setCarregando(true);
    exibirMensagem("sucesso", "Salvando PEI...");

    try {
      const finalPeiData = Object.entries(pei).flatMap(([area, metas]) =>
        metas
          .map((meta) => {
            const manualKey = `${area}-${meta.habilidade.replace(
              /[^a-zA-Z0-9-]/g,
              ""
            )}`;
            const manualData = entradaManual[manualKey] || {};

            const manualStrategiesTyped = manualData.estrategiasManuais
              ? manualData.estrategiasManuais
                  .split("\n")
                  .map((s) => s.trim())
                  .filter((e) => e.length > 0)
              : [];

            const suggestedStrategiesSelected = Array.isArray(
              manualData.estrategias
            )
              ? manualData.estrategias
              : [];

            const allStrategies = [
              ...new Set([
                ...suggestedStrategiesSelected,
                ...manualStrategiesTyped,
              ]),
            ].filter((e) => typeof e === "string" && e.trim() !== "");

            // Não salva metas sem estratégias ou se os objetivos de prazo não estiverem definidos
            if (
              allStrategies.length === 0 ||
              !meta.objetivos ||
              !meta.objetivos.curtoPrazo ||
              !meta.objetivos.medioPrazo ||
              !meta.objetivos.longoPrazo
            ) {
              return null;
            }

            return {
              area,
              habilidade: meta.habilidade,
              nivel: meta.nivel,
              nivelAlmejado: meta.nivelAlmejado,
              objetivos: meta.objetivos, // Objeto com curtoPrazo, medioPrazo, longoPrazo
              estrategiasSelecionadas: allStrategies, // As estratégias que o professor selecionou/digitou
            };
          })
          .filter(Boolean)
      );

      const hasPeiGoals = finalPeiData.length > 0;
      const hasActivityApplied = atividadeAplicada.trim().length > 0;

      if (!hasPeiGoals && !hasActivityApplied) {
        exibirMensagem(
          "erro",
          "É preciso ter pelo menos uma estratégia selecionada/digitada OU uma atividade aplicada para salvar o PEI."
        );
        setCarregando(false);
        return;
      }

      const currentYear = new Date().getFullYear();
      // A query de existência para atualização agora também verifica pelo criadorId
      const qExisting = query(
        collection(db, "peis"),
        where("alunoId", "==", alunoSelecionado.id),
        where("anoLetivo", "==", currentYear),
        where("criadorId", "==", usuarioLogado.email), // <-- ADICIONADO: Filtra por criadorId
        limit(1)
      );
      const snapExisting = await getDocs(qExisting);

      const commonFields = {
        resumoPEI: finalPeiData, // O campo `resumoPEI` agora contém as metas com o objeto `objetivos` dentro
        atividadeAplicada: atividadeAplicada,
        nomeCriador: usuarioLogado.nome || "Desconhecido",
        cargoCriador: usuarioLogado.cargo || "Desconhecido",
        criadorId: usuarioLogado.email || "",
        criadorPerfil: usuarioLogado.perfil || "",
      };

      if (!snapExisting.empty) {
        const peiDocRef = snapExisting.docs[0].ref;
        await updateDoc(peiDocRef, {
          ...commonFields,
          dataUltimaRevisao: serverTimestamp(),
        });
        exibirMensagem("sucesso", "PEI atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "peis"), {
          alunoId: alunoSelecionado.id,
          aluno: alunoSelecionado.nome,
          turma: alunoSelecionado.turma,
          ...commonFields,
          dataCriacao: serverTimestamp(),
          anoLetivo: currentYear,
        });
        exibirMensagem("sucesso", "Novo PEI salvo com sucesso!");
      }
    } catch (err) {
      console.error("Erro ao salvar PEI:", err);
      exibirMensagem("erro", `Erro ao salvar PEI: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  };

  // --- Estilos CSS inline para elementos específicos (se houver) ---
  const estilos = {
    areaButton: {
      padding: "10px 18px",
      borderRadius: "20px",
      border: "none",
      margin: "4px",
      backgroundColor: "var(--bg-button-neutral)",
      color: "var(--text-primary)",
      cursor: "pointer",
      transition: "all var(--transition-normal)",
    },
    areaButtonAtiva: {
      backgroundColor: "var(--color-primary)",
      color: "var(--text-light)",
      fontWeight: "bold",
    },
  };

  return (
    <div className="container" aria-busy={carregando}>
      <div className="card">
        {/* Header do Card com Botões de Navegação */}
        <div className="card-header">
          <BotaoVoltar />
          <BotaoVerPEIs />
        </div>

        <h1 className="titulo">Criar PEI</h1>

        {/* Mensagens de feedback */}
        {erro && (
          <div className="mensagem-erro" role="alert">
            {erro}
          </div>
        )}
        {mensagemSucesso && (
          <div className="mensagem-sucesso" role="status">
            {mensagemSucesso}
          </div>
        )}

        <div className="seletor-aluno">
          <label htmlFor="selecionar-aluno" className="form-label">
            Selecione um aluno:
          </label>
          <select
            id="selecionar-aluno"
            value={alunoSelecionado?.nome || ""}
            onChange={(e) => handleSelectStudent(e.target.value)}
            disabled={carregando}
            className="filter-select"
            aria-label="Selecione um aluno para criar o PEI"
          >
            <option value="">
              {carregando ? "Carregando alunos..." : "Selecione um aluno"}
            </option>
            {alunos.map((aluno) => (
              <option key={aluno.id} value={aluno.nome}>
                {aluno.nome} - {aluno.turma}
              </option>
            ))}
          </select>
        </div>

        {carregando && !alunoSelecionado && (
          <div className="loading">Carregando dados...</div>
        )}

        {alunoSelecionado && (
          <>
            <div className="area-buttons-container">
              {todasAsAreas.map((area) => (
                <button
                  key={area}
                  onClick={() => setAreaAtiva(area)}
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
                  ...(areaAtiva === "atividadeAplicada" &&
                    estilos.areaButtonAtiva),
                }}
              >
                Atividade Aplicada
              </button>
            </div>

            {/* Abas para Curto, Médio e Longo Prazo (aparecem se uma área de habilidades está ativa) */}
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

            {areaAtiva === "atividadeAplicada" && (
              <div className="section-content">
                <label htmlFor="atividade-aplicada" className="form-label">
                  Descreva a atividade aplicada com o aluno:
                </label>
                <textarea
                  id="atividade-aplicada"
                  value={atividadeAplicada}
                  onChange={(e) => setAtividadeAplicada(e.target.value)}
                  placeholder="Ex: Brincadeira simbólica usando fantoches para desenvolver comunicação e imaginação..."
                  className="textarea-form"
                  rows="4"
                />
              </div>
            )}

            {areaAtiva && areaAtiva !== "atividadeAplicada" && (
              <div className="section-content">
                {pei[areaAtiva]?.length > 0 ? (
                  pei[areaAtiva].map((meta, idx) => {
                    // Garante que meta.objetivos existe e é um objeto
                    if (
                      !meta ||
                      typeof meta !== "object" ||
                      !meta.habilidade ||
                      !meta.objetivos ||
                      typeof meta.objetivos !== "object"
                    )
                      return null;

                    const manualKey = `${areaAtiva}-${meta.habilidade.replace(
                      /[^a-zA-Z0-9-]/g,
                      ""
                    )}`;
                    const manualData = entradaManual[manualKey] || {};

                    const currentlySelectedStrategiesSet = new Set([
                      ...(manualData.estrategias || []),
                      ...(manualData.estrategiasManuais
                        ? manualData.estrategiasManuais
                            .split("\n")
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0)
                        : []),
                    ]);

                    const strategiesToDisplay = Array.from(
                      new Set([
                        ...(meta.estrategias || []), // Estratégias sugeridas da estruturaPEI (base)
                        ...currentlySelectedStrategiesSet, // Estratégias selecionadas/digitadas pelo usuário
                      ])
                    ).filter((s) => s && s.trim().length > 0);

                    // AQUI É A LÓGICA DE EXIBIÇÃO DOS OBJETIVOS POR ABA
                    let objetivoParaExibir = "";
                    if (activeTab === "curtoPrazo") {
                      objetivoParaExibir = meta.objetivos.curtoPrazo;
                    } else if (activeTab === "medioPrazo") {
                      objetivoParaExibir = meta.objetivos.medioPrazo;
                    } else if (activeTab === "longoPrazo") {
                      objetivoParaExibir = meta.objetivos.longoPrazo;
                    }

                    return (
                      <article
                        key={`${meta.habilidade}-${idx}`}
                        className="meta-card"
                        aria-labelledby={`meta-${manualKey}-habilidade`}
                      >
                        <h3 id={`meta-${manualKey}-habilidade`}>
                          {meta.habilidade}
                        </h3>
                        <p>
                          <strong>Nível avaliado:</strong> {meta.nivel} —{" "}
                          {LEGENDA_NIVEIS[meta.nivel]}
                        </p>
                        <p>
                          <strong>Nível almejado:</strong> {meta.nivelAlmejado}{" "}
                          — {LEGENDA_NIVEIS[meta.nivelAlmejado]}
                        </p>

                        {/* Exibindo o objetivo da aba selecionada, como readonly */}
                        <div>
                          <p className="form-label">
                            Objetivo de{" "}
                            {activeTab === "curtoPrazo"
                              ? "Curto"
                              : activeTab === "medioPrazo"
                                ? "Médio"
                                : "Longo"}{" "}
                            Prazo:
                          </p>
                          <textarea
                            className="textarea-form"
                            rows="2"
                            value={objetivoParaExibir}
                            readOnly // Campo desabilitado
                            disabled // Campo desabilitado
                          />
                        </div>

                        <fieldset className="meta-fieldset">
                          <legend>Estratégias:</legend>

                          {strategiesToDisplay.length > 0 ? (
                            strategiesToDisplay.map((estrategia, i) => {
                              const isChecked =
                                currentlySelectedStrategiesSet.has(estrategia);

                              // Lógica de desabilitar checkbox:
                              // Apenas o CRIADOR ORIGINAL do PEI pode desmarcar uma estratégia.
                              // Outros professores NÃO PODEM desmarcar estratégias já marcadas.
                              // Se isChecked é TRUE (estratégia já marcada) E o usuário NÃO É o criador original do PEI.
                              const isDisabledCheckbox =
                                !isPEICriador && isChecked;

                              return (
                                <label key={i} className="checkbox-container">
                                  <input
                                    type="checkbox"
                                    id={`estrategia-${manualKey}-${i}`}
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (isDisabledCheckbox) return;

                                      const newCheckedState = e.target.checked;
                                      const updatedManualData = {
                                        ...(manualData || {}),
                                      };

                                      const suggestedStrategiesOriginal =
                                        estruturaPEIMap[meta.habilidade]?.[
                                          meta.nivelAlmejado
                                        ]?.estrategias || [];
                                      const isOriginalSuggested = Array.isArray(
                                        suggestedStrategiesOriginal
                                      )
                                        ? suggestedStrategiesOriginal.includes(
                                            estrategia
                                          )
                                        : suggestedStrategiesOriginal ===
                                          estrategia;

                                      if (newCheckedState) {
                                        // Se está marcando (sempre permitido se não estiver disabled)
                                        if (isOriginalSuggested) {
                                          let currentSuggestedSelected =
                                            new Set(
                                              updatedManualData.estrategias ||
                                                []
                                            );
                                          currentSuggestedSelected.add(
                                            estrategia
                                          );
                                          updatedManualData.estrategias =
                                            Array.from(
                                              currentSuggestedSelected
                                            );
                                        } else {
                                          let currentManualTextStrategies =
                                            updatedManualData.estrategiasManuais
                                              ? updatedManualData.estrategiasManuais
                                                  .split("\n")
                                                  .map((s) => s.trim())
                                                  .filter((s) => s.length > 0)
                                              : [];
                                          if (
                                            !currentManualTextStrategies.includes(
                                              estrategia
                                            )
                                          ) {
                                            currentManualTextStrategies.push(
                                              estrategia
                                            );
                                          }
                                          updatedManualData.estrategiasManuais =
                                            currentManualTextStrategies.join(
                                              "\n"
                                            );
                                        }
                                      } else {
                                        // Se está desmarcando (permitido APENAS se não estiver disabled, ou seja, se for o criador original)
                                        if (isOriginalSuggested) {
                                          let currentSuggestedSelected =
                                            new Set(
                                              updatedManualData.estrategias ||
                                                []
                                            );
                                          currentSuggestedSelected.delete(
                                            estrategia
                                          );
                                          updatedManualData.estrategias =
                                            Array.from(
                                              currentSuggestedSelected
                                            );
                                        } else {
                                          let currentManualTextStrategies =
                                            updatedManualData.estrategiasManuais
                                              ? updatedManualData.estrategiasManuais
                                                  .split("\n")
                                                  .map((s) => s.trim())
                                                  .filter((s) => s.length > 0)
                                              : [];
                                          const index =
                                            currentManualTextStrategies.indexOf(
                                              estrategia
                                            );
                                          if (index > -1) {
                                            currentManualTextStrategies.splice(
                                              index,
                                              1
                                            );
                                          }
                                          updatedManualData.estrategiasManuais =
                                            currentManualTextStrategies.join(
                                              "\n"
                                            );
                                        }
                                      }

                                      setEntradaManual((prev) => ({
                                        ...prev,
                                        [manualKey]: updatedManualData,
                                      }));
                                    }}
                                    disabled={isDisabledCheckbox}
                                  />
                                  <span className="checkmark"></span>
                                  <span className="checkbox-label">
                                    {estrategia}
                                  </span>
                                </label>
                              );
                            })
                          ) : (
                            <p className="info-text">
                              Nenhuma estratégia sugerida disponível para
                              seleção nesta meta.
                            </p>
                          )}

                          <label
                            htmlFor={`estrategias-manuais-${manualKey}`}
                            className="form-label"
                          >
                            Estratégias personalizadas (uma por linha):
                          </label>
                          <textarea
                            id={`estrategias-manuais-${manualKey}`}
                            value={manualData.estrategiasManuais || ""}
                            onChange={(e) =>
                              setEntradaManual((prev) => ({
                                ...prev,
                                [manualKey]: {
                                  ...prev[manualKey],
                                  estrategiasManuais: e.target.value,
                                },
                              }))
                            }
                            className="textarea-form"
                            placeholder="Adicione novas estratégias aqui, uma por linha..."
                            rows="3"
                          />
                        </fieldset>
                      </article>
                    );
                  })
                ) : (
                  <p className="info-text">
                    Nenhuma meta de PEI sugerida para esta área com base na
                    avaliação inicial. Isso ocorre porque todas as habilidades
                    foram marcadas como 'Não Aplicável' (NA) ou 'Independente'
                    (I).
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleSavePEI}
              className="botao-salvar"
              disabled={carregando}
              aria-busy={carregando}
            >
              {carregando ? "Salvando..." : "Salvar PEI"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

CriarPEI.propTypes = {};
