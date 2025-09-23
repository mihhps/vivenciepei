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
  doc,
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import BotaoVerPEIs from "../components/BotaoVerPEIs";
import { useNavigate, useLocation } from "react-router-dom";
import { FaPuzzlePiece } from "react-icons/fa";

import { useUserSchool } from "../hooks/useUserSchool";

// ✅ NOVO: Importando as 3 funções do nosso serviço de IA
import {
  getSugestaoEstrategiasPEI,
  getSugestaoAtividadePEI,
  getSugestaoAtividadeParaEstrategia,
} from "../services/geminiService";

import { estruturaPEI0a3 } from "../data/estruturaPEI0a3";
import { SECOES_AVALIACAO } from "../data/avaliacaoInicial_0a3Data";
import objetivosCurtoPrazo0a3 from "../data/objetivosCurtoPrazo0a3";
import objetivosMedioPrazo0a3 from "../data/objetivosMedioPrazo0a3";

import "../styles/CriarPEIComponent.css";
import styled from "styled-components";

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

const verificaTea = (diagnostico) => {
  if (!diagnostico) return false;
  const diagnosticoLowerCase = diagnostico.toLowerCase();
  const palavrasChave = ["tea", "autismo", "espectro autista"];
  return palavrasChave.some((palavra) =>
    diagnosticoLowerCase.includes(palavra)
  );
};

// Funções de utilidade para mapeamento de dados
const getEstruturaPEIMap = (estrutura) => {
  const map = {};
  Object.entries(estrutura).forEach(([areaId, subareasByArea]) => {
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
  Object.entries(prazoData).forEach(([areaId, subareasByArea]) => {
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

const getHabilidadeMap = (secoes) => {
  const map = {};
  secoes.forEach((secao) => {
    secao.subareas?.forEach((subarea) => {
      subarea.habilidades?.forEach((habilidade) => {
        map[habilidade.habilidade] = secao.id;
      });
    });
  });
  return map;
};

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

const verificarPermissaoIniciarPrimeiroPEI = (usuarioPerfil, usuarioCargo) => {
  const perfisComAcesso = ["gestao", "aee", "seme", "desenvolvedor"];
  const cargosIniciadores = ["PROFESSOR REGENTE", "PROFESSOR DE SUPORTE"];

  const cargoEmMaiusculas = usuarioCargo ? usuarioCargo.toUpperCase() : "";

  return (
    perfisComAcesso.includes(usuarioPerfil) ||
    cargosIniciadores.includes(cargoEmMaiusculas)
  );
};

const buildNewPeiFromAssessment = (
  avaliacaoData,
  habilidadeAreaMap,
  estruturaPEIMap,
  objetivosCurtoPrazoMap,
  objetivosMedioPrazoMap,
  estrategiasJaEmUsoGlobalmente = new Set()
) => {
  const newPeiData = {};
  Object.entries(avaliacaoData || {}).forEach(([habilidade, nivelAtual]) => {
    if (nivelAtual === "I" || nivelAtual === "NA") {
      return;
    }
    const area = habilidadeAreaMap[habilidade];
    if (!area) {
      return;
    }
    const currentIndex = NIVEIS_PROGRESSAO.indexOf(nivelAtual);
    let nivelAlmejado = nivelAtual;
    if (currentIndex !== -1 && currentIndex < NIVEIS_PROGRESSAO.length - 1) {
      nivelAlmejado = NIVEIS_PROGRESSAO[currentIndex + 1];
    } else {
      return;
    }
    const suggestedObjetivoLongoPrazo =
      estruturaPEIMap[habilidade]?.[nivelAlmejado]?.objetivo;
    const suggestedObjetivoCurtoPrazo =
      objetivosCurtoPrazoMap[habilidade]?.[nivelAlmejado];
    const suggestedObjetivoMedioPrazo =
      objetivosMedioPrazoMap[habilidade]?.[nivelAlmejado];
    const suggestedStrategiesFromBase =
      estruturaPEIMap[habilidade]?.[nivelAlmejado]?.estrategias;
    if (
      !suggestedObjetivoCurtoPrazo ||
      !suggestedObjetivoMedioPrazo ||
      !suggestedObjetivoLongoPrazo ||
      !suggestedStrategiesFromBase
    ) {
      return;
    }
    const estrategiasFiltradas = Array.isArray(suggestedStrategiesFromBase)
      ? suggestedStrategiesFromBase.filter(
          (estrat) => !estrategiasJaEmUsoGlobalmente.has(estrat)
        )
      : [suggestedStrategiesFromBase].filter(
          (estrat) => !estrategiasJaEmUsoGlobalmente.has(estrat)
        );
    if (estrategiasFiltradas.length === 0) {
      return;
    }
    if (!newPeiData[area]) newPeiData[area] = [];
    newPeiData[area].push({
      habilidade,
      nivel: nivelAtual,
      nivelAlmejado: nivelAlmejado,
      objetivos: {
        curtoPrazo: suggestedObjetivoCurtoPrazo,
        medioPrazo: suggestedObjetivoMedioPrazo,
        longoPrazo: suggestedObjetivoLongoPrazo,
      },
      estrategias: estrategiasFiltradas,
      estrategiasSelecionadas: [],
    });
  });
  return newPeiData;
};

// --- COMPONENTE PRINCIPAL ---
export default function CriarPEI0a3() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [areaAtiva, setAreaAtiva] = useState("");
  const [pei, setPei] = useState({});
  const [entradaManual, setEntradaManual] = useState({});
  const [carregando, setCarregando] = useState(false);
  const [atividadeAplicada, setAtividadeAplicada] = useState("");
  const [peiCriadorId, setPeiCriadorId] = useState(null);
  const [peiDocId, setPeiDocId] = useState(null);
  const [activeTab, setActiveTab] = useState("longoPrazo");

  // ✅ NOVOS ESTADOS PARA A IA
  const [estrategiasIA, setEstrategiasIA] = useState({});
  const [carregandoIA, setCarregandoIA] = useState(null);
  const [sugestoesAtividadesIndividuais, setSugestoesAtividadesIndividuais] =
    useState({});
  const [carregandoAtividadeIndividual, setCarregandoAtividadeIndividual] =
    useState({});

  const navigate = useNavigate();
  const location = useLocation();
  const { erro, mensagemSucesso, exibirMensagem } = useMessageSystem();

  const { userSchoolId, userSchoolData, isLoadingUserSchool, userSchoolError } =
    useUserSchool();

  const estruturaPEIMap = useMemo(
    () => getEstruturaPEIMap(estruturaPEI0a3),
    []
  );
  const objetivosCurtoPrazoMap = useMemo(
    () => getObjetivosPrazoMap(objetivosCurtoPrazo0a3),
    []
  );
  const objetivosMedioPrazoMap = useMemo(
    () => getObjetivosPrazoMap(objetivosMedioPrazo0a3),
    []
  );
  const habilidadeAreaMap = useMemo(
    () => getHabilidadeMap(SECOES_AVALIACAO),
    []
  );
  const todasAsAreas = useMemo(() => SECOES_AVALIACAO.map((s) => s.id), []);
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
  const perfisComAcessoAmplo = useMemo(
    () => [
      "desenvolvedor",
      "seme",
      "diretor",
      "diretor_adjunto",
      "gestao",
      "aee",
      "orientador_pedagogico",
    ],
    []
  );

  // ✅ NOVO useMemo: para coletar as estratégias selecionadas para o brainstorm de atividades.
  const estrategiasSelecionadas = useMemo(() => {
    const todasEstrategias = new Set();
    if (!pei || !entradaManual) return [];
    Object.entries(pei).forEach(([area, metas]) => {
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

  const carregarDadosIniciais = useCallback(async () => {
    setCarregando(true);
    exibirMensagem("sucesso", "Carregando dados iniciais...");
    if (isLoadingUserSchool) return;
    try {
      const isAcessoAmplo = perfisComAcessoAmplo.includes(usuarioLogado.perfil);
      const isDesenvolvedorOuSeme = ["desenvolvedor", "seme"].includes(
        usuarioLogado.perfil
      );
      let alunosQuery;
      if (isDesenvolvedorOuSeme) {
        alunosQuery = collection(db, "alunos");
      } else if (isAcessoAmplo) {
        if (!userSchoolId) {
          throw new Error(
            "ID da escola não encontrado para o perfil de gestão."
          );
        }
        alunosQuery = query(
          collection(db, "alunos"),
          where("escolaId", "==", userSchoolId)
        );
      } else if (usuarioLogado.perfil === "professor") {
        const turmasDoProfessor = userSchoolData?.turmas
          ? Object.keys(userSchoolData.turmas)
          : [];
        if (turmasDoProfessor.length === 0) {
          setCarregando(false);
          setAlunos([]);
          exibirMensagem(
            "erro",
            "Nenhuma turma vinculada ao seu perfil de professor."
          );
          return;
        }
        alunosQuery = query(
          collection(db, "alunos"),
          where("turma", "in", turmasDoProfessor)
        );
      } else {
        setCarregando(false);
        setAlunos([]);
        exibirMensagem(
          "erro",
          "Seu perfil não tem permissão para visualizar alunos."
        );
        return;
      }
      const alunosSnap = await getDocs(alunosQuery);
      const todosAlunos = alunosSnap.docs.map((doc) => {
        const alunoData = doc.data();
        return {
          id: doc.id,
          ...alunoData,
          isTea: verificaTea(alunoData.diagnostico),
        };
      });
      setAlunos(todosAlunos);
      exibirMensagem("sucesso", "Dados carregados com sucesso.");
    } catch (err) {
      console.error("Erro ao carregar dados do Firebase:", err);
      exibirMensagem(
        "erro",
        `Falha ao carregar dados: ${err.message}. Tente recarregar a página.`
      );
    } finally {
      setCarregando(false);
    }
  }, [
    exibirMensagem,
    usuarioLogado,
    isLoadingUserSchool,
    userSchoolId,
    userSchoolData,
    perfisComAcessoAmplo,
  ]);
  useEffect(() => {
    if (!isLoadingUserSchool) {
      carregarDadosIniciais();
    }
  }, [isLoadingUserSchool, carregarDadosIniciais]);
  const handleSelectStudent = useCallback(
    async (alunoOuNome) => {
      const aluno =
        typeof alunoOuNome === "object"
          ? alunoOuNome
          : alunos.find(
              (a) =>
                a.nome.trim().toLowerCase() === alunoOuNome.trim().toLowerCase()
            );
      if (!aluno) {
        exibirMensagem("erro", "Aluno não encontrado.");
        return;
      }
      setAlunoSelecionado(aluno);
      exibirMensagem("sucesso", "Carregando PEI...");
      setCarregando(true);
      setActiveTab("longoPrazo");
      try {
        const currentYear = new Date().getFullYear();
        const qContribuicaoUsuario = query(
          collection(db, "pei_contribuicoes_0a3"),
          where("alunoId", "==", aluno.id),
          where("criadorId", "==", usuarioLogado.email),
          where("anoLetivo", "==", currentYear),
          limit(1)
        );
        const contribuicaoSnap = await getDocs(qContribuicaoUsuario);
        const contribuicaoDoc = contribuicaoSnap.docs[0];
        const contribuicaoData = contribuicaoDoc?.data();
        if (
          !contribuicaoSnap.empty &&
          contribuicaoData?.resumoPEI?.length > 0
        ) {
          setPeiDocId(contribuicaoDoc.id);
          const newPeiData = {};
          const newEntradaManual = {};
          contribuicaoData.resumoPEI?.forEach((meta) => {
            if (!newPeiData[meta.area]) newPeiData[meta.area] = [];
            newPeiData[meta.area].push(meta);
            const manualKey = `${meta.area}-${meta.habilidade.replace(
              /[^a-zA-Z0-9-]/g,
              ""
            )}`;
            const suggestedStrategiesOriginal =
              estruturaPEIMap[meta.habilidade]?.[meta.nivelAlmejado]
                ?.estrategias || [];
            const suggestedStrategiesSelected =
              meta.estrategiasSelecionadas.filter((strat) =>
                suggestedStrategiesOriginal.includes(strat)
              );
            const manualStrategiesTyped = meta.estrategiasSelecionadas.filter(
              (strat) => !suggestedStrategiesOriginal.includes(strat)
            );
            newEntradaManual[manualKey] = {
              estrategias: suggestedStrategiesSelected,
              estrategiasManuais: manualStrategiesTyped.join("\n"),
            };
          });
          setPei(newPeiData);
          setEntradaManual(newEntradaManual);
          setAtividadeAplicada(contribuicaoData.atividadeAplicada || "");
          setPeiCriadorId(contribuicaoData.criadorId);
          setAreaAtiva(Object.keys(newPeiData)[0] || todasAsAreas[0] || "");
          exibirMensagem(
            "sucesso",
            "Sua contribuição de PEI para este aluno foi carregada para edição."
          );
        } else {
          const qUltimaAvaliacao = query(
            collection(db, "avaliacoesIniciais0a3"),
            where("alunoId", "==", aluno.id),
            orderBy("dataAvaliacao", "desc"),
            limit(1)
          );
          const avaliacoesSnap = await getDocs(qUltimaAvaliacao);
          if (avaliacoesSnap.empty) {
            exibirMensagem(
              "erro",
              "Este aluno não possui avaliação inicial de 0 a 3 anos."
            );
            setAlunoSelecionado(null);
            setPeiCriadorId(null);
            return;
          }
          const assessment = avaliacoesSnap.docs[0].data();
          const newPei = buildNewPeiFromAssessment(
            assessment.data,
            habilidadeAreaMap,
            estruturaPEIMap,
            objetivosCurtoPrazoMap,
            objetivosMedioPrazoMap,
            new Set()
          );
          const isNewPeiEmpty = Object.keys(newPei).every(
            (area) => newPei[area].length === 0
          );
          if (isNewPeiEmpty) {
            exibirMensagem(
              "erro",
              `Não foi possível iniciar um novo PEI. Os objetivos sugeridos para este aluno já foram abordados no PEI inicial e/ou todas as estratégias disponíveis já estão em uso.`
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
          setPeiDocId(null);
          exibirMensagem(
            "sucesso",
            `Novo PEI iniciado com base na avaliação mais recente.`
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
      exibirMensagem,
      verificarPermissaoIniciarPrimeiroPEI,
      buildNewPeiFromAssessment,
      estruturaPEIMap,
      objetivosCurtoPrazoMap,
      objetivosMedioPrazoMap,
      habilidadeAreaMap,
      usuarioLogado.cargo,
      usuarioLogado.perfil,
      usuarioLogado.email,
      todasAsAreas,
    ]
  );
  useEffect(() => {
    if (location.state?.alunoParaSelecionar && alunos.length > 0) {
      const alunoDoState = location.state.alunoParaSelecionar;
      const alunoEncontrado = alunos.find((a) => a.id === alunoDoState.id);
      if (alunoEncontrado) {
        handleSelectStudent(alunoEncontrado);
      }
    }
  }, [location.state, alunos, handleSelectStudent]);

  // ✅ NOVAS FUNÇÕES: Chamadas de API para a IA
  const handleGerarEstrategiasIA = async (meta, area, manualKey) => {
    if (!alunoSelecionado) return exibirMensagem("erro", "Selecione um aluno.");
    setCarregandoIA(manualKey);
    try {
      const novasEstrategias = await getSugestaoEstrategiasPEI(
        alunoSelecionado,
        meta,
        area
      );
      setEstrategiasIA((prev) => ({
        ...prev,
        [manualKey]: [...(prev[manualKey] || []), ...novasEstrategias],
      }));
    } catch (error) {
      exibirMensagem("erro", `IA Error: ${error.message}`);
    } finally {
      setCarregandoIA(null);
    }
  };
  const handleGerarAtividadeIndividual = async (estrategia) => {
    if (!alunoSelecionado) return;
    setCarregandoAtividadeIndividual((prev) => ({
      ...prev,
      [estrategia]: true,
    }));
    try {
      const sugestao = await getSugestaoAtividadeParaEstrategia(
        alunoSelecionado,
        estrategia
      );
      setSugestoesAtividadesIndividuais((prev) => ({
        ...prev,
        [estrategia]: sugestao,
      }));
    } catch (error) {
      exibirMensagem("erro", `IA Error: ${error.message}`);
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
              objetivos: meta.objetivos,
              estrategiasSelecionadas: allStrategies,
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
      const commonFields = {
        resumoPEI: finalPeiData,
        atividadeAplicada: atividadeAplicada,
        nomeCriador: usuarioLogado.nome || "Desconhecido",
        cargoCriador: usuarioLogado.cargo || "Desconhecido",
        criadorId: usuarioLogado.email || "",
        criadorPerfil: usuarioLogado.perfil || "",
        escolaId: alunoSelecionado.escolaId,
        anoLetivo: new Date().getFullYear(),
      };
      if (peiDocId) {
        const peiDocRef = doc(db, "pei_contribuicoes_0a3", peiDocId);
        await updateDoc(peiDocRef, {
          ...commonFields,
          dataAtualizacao: serverTimestamp(),
        });
        exibirMensagem(
          "sucesso",
          "Sua contribuição de PEI foi atualizada com sucesso!"
        );
      } else {
        await addDoc(collection(db, "pei_contribuicoes_0a3"), {
          alunoId: alunoSelecionado.id,
          aluno: alunoSelecionado.nome,
          turma: alunoSelecionado.turma,
          ...commonFields,
          dataCriacao: serverTimestamp(),
        });
        exibirMensagem(
          "sucesso",
          "Sua nova contribuição de PEI foi salva com sucesso!"
        );
      }
    } catch (err) {
      console.error("Erro ao salvar PEI:", err);
      exibirMensagem("erro", `Erro ao salvar PEI: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  };
  const estilos = {
    areaButton: {
      padding: "10px 18px",
      borderRadius: "20px",
      border: "none",
      margin: "6px",
      backgroundColor: "#457b9d",
      color: "white",
      cursor: "pointer",
      transition: "background-color 0.3s ease",
    },
    areaButtonAtiva: {
      backgroundColor: "#1d3557",
      color: "white",
      fontWeight: "bold",
    },
  };
  const getSubareasDaAreaAtiva = () => {
    const areaData = SECOES_AVALIACAO.find((s) => s.id === areaAtiva);
    return areaData?.subareas || [];
  };
  const getHabilidadesDaAreaAtiva = () => {
    return getSubareasDaAreaAtiva().flatMap((subarea) => subarea.habilidades);
  };
  return (
    <div className="container" aria-busy={carregando}>
      <div className="card">
        <div className="card-header">
          <BotaoVoltar />
          <BotaoVerPEIs />
        </div>
        <h1 className="titulo">Criar PEI (0 a 3 Anos)</h1>
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
        {carregando && !alunoSelecionado && (
          <div className="loading">Carregando dados...</div>
        )}
        {userSchoolError && (
          <div className="mensagem-erro">
            Erro ao obter dados da escola: {userSchoolError.message}
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
                {aluno.nome} - {aluno.turma} {aluno.isTea ? " 🧩" : ""}
              </option>
            ))}
          </select>
        </div>
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
                  {SECOES_AVALIACAO.find((s) => s.id === area)?.titulo || area}
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
            {/* ✅ NOVO: Seção de Brainstorm de Atividades */}
            {areaAtiva === "atividadeAplicada" && (
              <div className="section-content">
                <h3 className="titulo-secao-atividade">Atividades Aplicadas</h3>
                <p className="info-text">
                  Gere ideias para cada estratégia selecionada e depois inclua
                  as melhores na sua atividade final.
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
                          onClick={() =>
                            handleGerarAtividadeIndividual(estrategia)
                          }
                          disabled={carregandoAtividadeIndividual[estrategia]}
                        >
                          {carregandoAtividadeIndividual[estrategia]
                            ? "Gerando..."
                            : "Gerar Sugestão 💡"}
                        </button>
                        {sugestoesAtividadesIndividuais[estrategia] && (
                          <div className="sugestao-individual-container">
                            <textarea
                              className="textarea-sugestao"
                              rows="3"
                              value={sugestoesAtividadesIndividuais[estrategia]}
                              readOnly
                            />
                            <button
                              className="botao-incluir"
                              onClick={() =>
                                handleIncluirAtividade(
                                  sugestoesAtividadesIndividuais[estrategia]
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
                      Nenhuma estratégia foi selecionada ainda. Volte para as
                      áreas e escolha algumas.
                    </p>
                  )}
                </div>
                <label htmlFor="atividade-aplicada" className="form-label">
                  Descrição da Atividade Aplicada Final:
                </label>
                <textarea
                  id="atividade-aplicada"
                  value={atividadeAplicada}
                  onChange={(e) => setAtividadeAplicada(e.target.value)}
                  placeholder="As sugestões incluídas aparecerão aqui..."
                  className="textarea-form"
                  rows="8"
                />
              </div>
            )}
            {/* FIM DA SEÇÃO NOVA */}
            {areaAtiva && areaAtiva !== "atividadeAplicada" && (
              <div className="section-content">
                {pei[areaAtiva]?.length > 0 ? (
                  pei[areaAtiva].map((meta, idx) => {
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

                    const strategiesFromManual = manualData.estrategiasManuais
                      ? manualData.estrategiasManuais
                          .split("\n")
                          .map((s) => s.trim())
                          .filter((s) => s.length > 0)
                      : [];
                    // ✅ NOVO: Adiciona estratégias geradas pela IA à lista de exibição
                    const strategiesToDisplay = Array.from(
                      new Set([
                        ...(meta.estrategias || []),
                        ...(estrategiasIA[manualKey] || []), // Estratégias da IA
                        ...(manualData.estrategias || []),
                        ...strategiesFromManual,
                      ])
                    ).filter((s) => s && s.trim().length > 0);
                    let objetivoParaExibir = "";
                    if (activeTab === "curtoPrazo") {
                      objetivoParaExibir = meta.objetivos.curtoPrazo;
                    } else if (activeTab === "medioPrazo") {
                      objetivoParaExibir = meta.objetivos.medioPrazo;
                    } else if (activeTab === "longoPrazo") {
                      objetivoParaExibir = meta.objetivos.longoPrazo;
                    }
                    const currentlySelectedStrategiesSet = new Set([
                      ...(manualData.estrategias || []),
                      ...strategiesFromManual,
                    ]);
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
                            readOnly
                            disabled
                          />
                        </div>
                        <fieldset className="meta-fieldset">
                          <legend>Estratégias:</legend>
                          {strategiesToDisplay.length > 0 ? (
                            strategiesToDisplay.map((estrategia, i) => {
                              const isChecked =
                                currentlySelectedStrategiesSet.has(estrategia);
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
                                      if (isOriginalSuggested) {
                                        let currentSuggestedSelected = new Set(
                                          updatedManualData.estrategias || []
                                        );
                                        if (newCheckedState) {
                                          currentSuggestedSelected.add(
                                            estrategia
                                          );
                                        } else {
                                          currentSuggestedSelected.delete(
                                            estrategia
                                          );
                                        }
                                        updatedManualData.estrategias =
                                          Array.from(currentSuggestedSelected);
                                      } else {
                                        let currentManualTextStrategies =
                                          updatedManualData.estrategiasManuais
                                            ? updatedManualData.estrategiasManuais
                                                .split("\n")
                                                .map((s) => s.trim())
                                                .filter((s) => s.length > 0)
                                            : [];
                                        if (
                                          newCheckedState &&
                                          !currentManualTextStrategies.includes(
                                            estrategia
                                          )
                                        ) {
                                          currentManualTextStrategies.push(
                                            estrategia
                                          );
                                        } else if (!newCheckedState) {
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
                                        }
                                        updatedManualData.estrategiasManuais =
                                          currentManualTextStrategies.join(
                                            "\n"
                                          );
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
                          {/* ✅ NOVO: Botão para gerar estratégias com IA */}
                          <div className="ia-sugestao-container">
                            <button
                              className="botao-ia"
                              onClick={() =>
                                handleGerarEstrategiasIA(
                                  meta,
                                  areaAtiva,
                                  manualKey
                                )
                              }
                              disabled={carregandoIA === manualKey}
                            >
                              {carregandoIA === manualKey
                                ? "Gerando..."
                                : "Sugerir Estratégias com IA 💡"}
                            </button>
                          </div>
                          {/* FIM DO NOVO BLOCO */}
                          <label
                            htmlFor={`estrategias-manuais-${manualKey}`}
                            className="form-label"
                          >
                            Adicionar estratégias personalizadas (uma por
                            linha):
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
