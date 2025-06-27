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
import estruturaPEI from "../data/estruturaPEI2";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";

// IMPORTAR O NOVO ARQUIVO CSS AQUI
import "../styles/CriarPEIComponent.css";

// --- CONSTANTES E FUNÇÕES AUXILIARES GERAIS (podem ser movidas para 'utils/peiHelpers.js') ---

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

// Memoized map para busca rápida na estrutura do PEI
const getEstruturaPEIMap = () => {
  const map = {};
  Object.entries(estruturaPEI).forEach(([areaName, subareasByArea]) => {
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
// Esta função agora determina quem PODE INICIAR UM PEI DO ZERO (o primeiro PEI de um aluno)
const verificarPermissaoIniciarPrimeiroPEI = (usuarioPerfil, usuarioCargo) => {
  const perfisIniciadores = ["gestao", "aee", "seme", "desenvolvedor"];
  const cargosIniciadores = ["PROFESSOR REGENTE", "PROFESSOR DE SUPORTE"];

  return (
    perfisIniciadores.includes(usuarioPerfil) ||
    cargosIniciadores.includes(usuarioCargo)
  );
};

// Função para construir um novo PEI a partir da avaliação
// AGORA RECEBE TAMBÉM OS OBJETIVOS ESTRATÉGIAS USADAS GLOBALMENTE PARA FILTRAGEM
const buildNewPeiFromAssessment = (
  avaliacao,
  estruturaPEIMap,
  objetivosPrimeiroPEI = new Set(), // Objetivos já escolhidos no PEI Base
  estrategiasJaEmUsoGlobalmente = new Set() // NOVO: Estratégias já usadas em qualquer PEI do aluno
) => {
  const newPeiData = {};
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
          if (nivelAtual === "NA") return;

          const currentIndex = NIVEIS_PROGRESSAO.indexOf(nivelAtual);
          let nivelAlmejado = nivelAtual;
          let suggestedObjectiveAndStrategies = null;

          if (nivelAtual === "I") {
            nivelAlmejado = nivelAtual;
            suggestedObjectiveAndStrategies =
              estruturaPEIMap[habilidade]?.[nivelAlmejado];
          } else if (
            currentIndex !== -1 &&
            currentIndex < NIVEIS_PROGRESSAO.length - 1
          ) {
            nivelAlmejado = NIVEIS_PROGRESSAO[currentIndex + 1];
            suggestedObjectiveAndStrategies =
              estruturaPEIMap[habilidade]?.[nivelAlmejado];
          } else {
            console.warn(
              `Nível avaliado '${nivelAtual}' para habilidade '${habilidade}' (Área '${area}') não encontrado na progressão ou é o último (e não 'I'). Não será gerada meta de PEI.`
            );
            return;
          }

          if (
            !suggestedObjectiveAndStrategies ||
            !suggestedObjectiveAndStrategies.objetivo ||
            !suggestedObjectiveAndStrategies.estrategias
          ) {
            console.warn(
              `Nenhuma sugestão COMPLETA (objetivo ou estratégias) encontrada em estruturaPEI para a habilidade: '${habilidade}' no nível almejado: '${nivelAlmejado}'. Meta IGNORADA.`
            );
            return;
          }

          // FILTRAR OBJETIVOS (se for um PEI subsequente e objetivo já foi usado no primeiro PEI)
          if (
            objetivosPrimeiroPEI.size > 0 &&
            !objetivosPrimeiroPEI.has(suggestedObjectiveAndStrategies.objetivo)
          ) {
            return;
          }

          // AQUI É A MUDANÇA: FILTRAR ESTRATÉGIAS SUGERIDAS QUE JÁ ESTÃO EM USO GLOBALMENTE
          const estrategiasFiltradas = Array.isArray(
            suggestedObjectiveAndStrategies.estrategias
          )
            ? suggestedObjectiveAndStrategies.estrategias.filter(
                (estrat) => !estrategiasJaEmUsoGlobalmente.has(estrat)
              )
            : [suggestedObjectiveAndStrategies.estrategias].filter(
                (estrat) => !estrategiasJaEmUsoGlobalmente.has(estrat)
              );

          // Se após a filtragem não restarem estratégias, não adiciona a meta
          // Isso é importante para que não apareçam objetivos sem estratégias disponíveis
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
            objetivo: suggestedObjectiveAndStrategies.objetivo,
            estrategias: estrategiasFiltradas, // Usar as estratégias FILTRADAS
            estrategiasSelecionadas: [],
          });
        }
      );
    }
  );
  return newPeiData;
};

// Função para carregar um PEI existente (AGORA RECEBE userEmail e criadorPEIId diretamente)
const loadExistingPeiData = (
  peiExistingData,
  estruturaPEIMap,
  userEmail,
  criadorPEIId
) => {
  const mountedPei = {};
  const mountedManualInput = {};
  const resumoPEIExisting = peiExistingData.resumoPEI || [];
  const activityAppliedExisting = peiExistingData.atividadeAplicada || "";

  // Determina se o usuário atual é o criador do PEI carregado AQUI
  const isCurrentUserThePEICreator = userEmail === criadorPEIId;

  resumoPEIExisting.forEach((meta) => {
    if (!mountedPei[meta.area]) mountedPei[meta.area] = [];

    const suggestionBlock =
      estruturaPEIMap[meta.habilidade]?.[meta.nivelAlmejado];
    let suggestedStrategiesFromMap = [];
    if (Array.isArray(suggestionBlock?.estrategias)) {
      suggestedStrategiesFromMap = [...suggestionBlock.estrategias];
    } else if (typeof suggestionBlock?.estrategias === "string") {
      suggestedStrategiesFromMap = [suggestionBlock.estrategias];
    }

    const savedStrategies = Array.isArray(meta.estrategias)
      ? meta.estrategias
      : [];

    const selectedSuggestedFromSaved = savedStrategies.filter((saved) =>
      suggestedStrategiesFromMap.includes(saved)
    );

    const manualSavedStrategies = savedStrategies.filter(
      (saved) => !suggestedStrategiesFromMap.includes(saved)
    );

    // ESTRATÉGIAS SUGERIDAS QUE AINDA NÃO FORAM SALVAS:
    // Se o usuário ATUAL É o criador, ele vê TODAS as sugeridas.
    // Se o usuário ATUAL NÃO É o criador, ele vê apenas as que NÃO FORAM SALVAS AINDA.
    const availableSuggestedStrategies = isCurrentUserThePEICreator
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
      objetivo: meta.objetivo,
      estrategias: availableSuggestedStrategies, // Estratégias sugeridas disponíveis para seleção (JÁ FILTRADAS)
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
  const [pei, setPei] = useState({});
  const [entradaManual, setEntradaManual] = useState({});
  const [carregando, setCarregando] = useState(false);
  const [atividadeAplicada, setAtividadeAplicada] = useState("");
  const [peiCriadorId, setPeiCriadorId] = useState(null); // ID do criador do PEI carregado

  const navigate = useNavigate();
  const { erro, mensagemSucesso, exibirMensagem } = useMessageSystem();

  const estruturaPEIMap = useMemo(() => getEstruturaPEIMap(), []);
  const todasAsAreas = useMemo(() => Object.keys(avaliacaoInicial), []);
  const usuarioLogado = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usuarioLogado")) || {};
    } catch (e) {
      console.error("Erro ao fazer parse do usuário logado:", e);
      return {};
    }
  }, []);

  // isPEICriador agora é derivado, e é importante que peiCriadorId esteja atualizado.
  // Ele é usado no JSX e no handleSelectStudent para passar para loadExistingPeiData.
  const isPEICriador = useMemo(
    () => usuarioLogado.email === peiCriadorId,
    [usuarioLogado.email, peiCriadorId]
  );

  // --- LÓGICA DE CARREGAMENTO DE DADOS INICIAIS ---
  const carregarDadosIniciais = useCallback(async () => {
    setCarregando(true);
    exibirMensagem("sucesso", "Carregando dados iniciais...");
    try {
      const currentYear = new Date().getFullYear();

      // Buscamos TODOS os PEIs do ano atual (para saber quais alunos JÁ TÊM PEI)
      const qTodosPeisDoAno = query(
        collection(db, "peis"),
        where("anoLetivo", "==", currentYear)
      );

      // Consulta PEIs criados SOMENTE pelo usuário logado para o ano atual (para filtragem pessoal)
      const qPeisDoUsuarioLogado = query(
        collection(db, "peis"),
        where("anoLetivo", "==", currentYear),
        where("criadorId", "==", usuarioLogado.email)
      );

      const [
        alunosSnap,
        avaliacoesSnap,
        todosPeisDoAnoSnap,
        peisDoUsuarioLogadoSnap,
      ] = await Promise.all([
        getDocs(collection(db, "alunos")),
        getDocs(collection(db, "avaliacoesIniciais")),
        getDocs(qTodosPeisDoAno),
        getDocs(qPeisDoUsuarioLogado),
      ]);

      const todosAlunos = alunosSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const todasAvaliacoes = avaliacoesSnap.docs.map((doc) => doc.data());

      const todosPeisDoAno = todosPeisDoAnoSnap.docs.map((doc) => doc.data());
      const peisDoUsuarioLogado = peisDoUsuarioLogadoSnap.docs.map((doc) =>
        doc.data()
      );

      // Sets para verificação rápida
      const alunosComQualquerPeiIds = new Set(
        todosPeisDoAno.map((pei) => pei.alunoId)
      );
      const alunosComPeiFeitoPeloUsuarioIds = new Set(
        peisDoUsuarioLogado.map((pei) => pei.alunoId)
      );

      const { cargo, perfil, turmas } = usuarioLogado;
      const turmasVinculadas = turmas ? Object.keys(turmas) : [];

      let alunosFiltradosParaExibir = todosAlunos;

      // Aplicar o filtro por turma/escola (se não tiver acesso amplo a todos os alunos do sistema)
      const podeVerTodosAlunosNoSistema =
        perfil === "gestao" ||
        perfil === "aee" ||
        perfil === "seme" ||
        perfil === "desenvolvedor"; // Professores Regentes/Suporte não veem todos, só os da sua turma/escola

      if (!podeVerTodosAlunosNoSistema) {
        alunosFiltradosParaExibir = todosAlunos.filter((aluno) =>
          turmasVinculadas.includes(aluno.turma)
        );
      }

      // LÓGICA DE FILTRAGEM FINAL PARA A LISTA DE SELEÇÃO DE ALUNOS (Baseado na nova regra)
      alunosFiltradosParaExibir = alunosFiltradosParaExibir.filter((aluno) => {
        // Regra 1: Um aluno SOME da lista de seleção DESTE professor SE
        // este professor JÁ CRIOU um PEI para ele.
        if (alunosComPeiFeitoPeloUsuarioIds.has(aluno.id)) {
          return false; // Remove da lista de seleção deste professor
        }

        // Regra 2: "Quem pode iniciar o PRIMEIRO PEI"
        const podeIniciarPrimeiroPEI = verificarPermissaoIniciarPrimeiroPEI(
          perfil,
          cargo
        );

        // Se o aluno NÃO TEM NENHUM PEI AINDA:
        //   - Só aparece para perfis que podem iniciar o primeiro PEI.
        //   - Some da lista para os demais (que só podem criar PEI se já existe um).
        if (!alunosComQualquerPeiIds.has(aluno.id)) {
          return podeIniciarPrimeiroPEI; // Retorna true se pode iniciar, false se não
        }

        // Se o aluno JÁ TEM PELO MENOS UM PEI (criado por OUTRO professor):
        //   - Aparece para TODOS os professores (mesmo os que não podem iniciar o primeiro PEI).
        //   - Pois eles criarão o PEI individual deles a partir deste ponto.
        //   (Já filtramos os que ele mesmo criou no primeiro 'if')
        return true;
      });

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
  }, [exibirMensagem, usuarioLogado]); // usuarioLogado é uma dependência crucial aqui

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
          peiExistingParaEsteCriador = peiDesseCriadorSnap.docs[0].data();
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
          ? primeiroPeiSnap.docs[0].data()
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
          if (peiData.resumoPEI) {
            peiData.resumoPEI.forEach((meta) => {
              if (Array.isArray(meta.estrategias)) {
                meta.estrategias.forEach((estrat) =>
                  estrategiasJaEmUsoGlobalmente.add(estrat)
                );
              }
            });
          }
        });

        // Extrair objetivos do PRIMEIRO PEI para filtragem posterior de NOVO PEI
        const objetivosDoPrimeiroPEISet = new Set();
        if (primeiroPeiDoAluno && primeiroPeiDoAluno.resumoPEI) {
          primeiroPeiDoAluno.resumoPEI.forEach((meta) => {
            if (meta.objetivo) {
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
          const assessment = avaliacoes.find(
            (a) => a.aluno.trim().toLowerCase() === nome.trim().toLowerCase()
          );

          if (!assessment) {
            exibirMensagem("erro", "Este aluno não possui avaliação inicial.");
            setAlunoSelecionado(null);
            setPeiCriadorId(null);
            return;
          }

          // AQUI ESTÁ A MUDANÇA MAIS IMPORTANTE PARA O FILTRO DE OBJETIVOS E ESTRATÉGIAS:
          // Determina se os objetivos devem ser filtrados pelo primeiro PEI (apenas se for "outro professor")
          const deveFiltrarObjetivosPeloPrimeiroPEI =
            alunoJaTemQualquerPei && !podeIniciarPrimeiroPEI;

          const objetivosParaFiltrarBuild = deveFiltrarObjetivosPeloPrimeiroPEI
            ? objetivosDoPrimeiroPEISet // Passa os objetivos do primeiro PEI para filtrar
            : new Set(); // Se não, passa um Set vazio (não filtra)

          const newPei = buildNewPeiFromAssessment(
            assessment,
            estruturaPEIMap,
            objetivosParaFiltrarBuild, // Passa os objetivos para filtrar
            estrategiasJaEmUsoGlobalmente // <-- NOVO: Passa as estratégias já usadas GLOBALMENTE
          );

          // VERIFICA SE O PEI GERADO ESTÁ VAZIO APÓS A FILTRAGEM DE OBJETIVOS E ESTRATÉGIAS
          const isNewPeiEmpty = Object.keys(newPei).every(
            (area) => newPei[area].length === 0
          );

          if (isNewPeiEmpty) {
            // Removida a condição `deveFiltrarObjetivosPeloPrimeiroPEI` daqui, pois a verificação `isNewPeiEmpty` já é suficiente.
            let errorMessageDetail = "";
            if (deveFiltrarObjetivosPeloPrimeiroPEI) {
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

            if (allStrategies.length === 0) {
              return null;
            }

            return {
              area,
              habilidade: meta.habilidade,
              nivel: meta.nivel,
              nivelAlmejado: meta.nivelAlmejado,
              objetivo: meta.objetivo,
              estrategias: allStrategies,
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
        resumoPEI: finalPeiData,
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
                    if (!meta || typeof meta !== "object" || !meta.habilidade)
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

                    let strategiesToDisplay = [];

                    if (isPEICriador) {
                      strategiesToDisplay = Array.from(
                        new Set([
                          ...(meta.estrategias || []),
                          ...(meta.estrategiasSelecionadas || []),
                          ...currentlySelectedStrategiesSet,
                        ])
                      ).filter((s) => s && s.trim().length > 0);
                    } else {
                      strategiesToDisplay = Array.from(
                        new Set([
                          ...(meta.estrategias || []), // Estratégias sugeridas NÃO selecionadas
                          ...currentlySelectedStrategiesSet, // Estratégias que ele mesmo já marcou ou digitou manualmente para este PEI
                        ])
                      ).filter((s) => s && s.trim().length > 0);
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

                        <div>
                          <p className="form-label">
                            Objetivo sugerido (
                            {LEGENDA_NIVEIS[meta.nivelAlmejado]}):
                          </p>
                          <p className="meta-objective">{meta.objetivo}</p>
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
