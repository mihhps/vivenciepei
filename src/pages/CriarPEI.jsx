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

import estruturaPEI from "../data/estruturaPEI2";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import objetivosCurtoPrazoData from "../data/objetivosCurtoPrazo";
import objetivosMedioPrazoData from "../data/objetivosMedioPrazo";

import "../styles/CriarPEIComponent.css";

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
  const perfisIniciadores = ["gestao", "aee", "seme", "desenvolvedor"];
  const cargosIniciadores = ["PROFESSOR REGENTE", "PROFESSOR DE SUPORTE"];

  const cargoEmMaiusculas = usuarioCargo ? usuarioCargo.toUpperCase() : "";

  return (
    perfisIniciadores.includes(usuarioPerfil) ||
    cargosIniciadores.includes(cargoEmMaiusculas)
  );
};

const buildNewPeiFromAssessment = (
  avaliacao,
  estruturaPEIMap,
  objetivosCurtoPrazoMap,
  objetivosMedioPrazoMap,
  objetivosPrimeiroPEISet = new Set(),
  estrategiasJaEmUsoGlobalmente = new Set()
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
          if (nivelAtual === "I" || nivelAtual === "NA") {
            console.log(
              `Habilidade '${habilidade}' está no nível '${nivelAtual}'. Não será gerada meta de PEI.`
            );
            return;
          }

          const currentIndex = NIVEIS_PROGRESSAO.indexOf(nivelAtual);
          let nivelAlmejado = nivelAtual;

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
            !suggestedStrategiesFromBase ||
            (Array.isArray(suggestedStrategiesFromBase) &&
              suggestedStrategiesFromBase.length === 0)
          ) {
            console.warn(
              `Nenhuma sugestão COMPLETA (objetivos CP/MP/LP ou estratégias) encontrada em estruturaPEI/objetivosPrazo para a habilidade: '${habilidade}' no nível almejado: '${nivelAlmejado}'. Meta IGNORADA.`
            );
            return;
          }

          if (
            objetivosPrimeiroPEISet.size > 0 &&
            !objetivosPrimeiroPEISet.has(suggestedObjetivoLongoPrazo)
          ) {
            return;
          }

          const estrategiasFiltradas = Array.isArray(
            suggestedStrategiesFromBase
          )
            ? suggestedStrategiesFromBase.filter(
                (estrat) => !estrategiasJaEmUsoGlobalmente.has(estrat)
              )
            : [suggestedStrategiesFromBase].filter(
                (estrat) => !estrategiasJaEmUsoGlobalmente.has(estrat)
              );

          if (estrategiasFiltradas.length === 0) {
            console.log(
              `Nenhuma estratégia disponível para a meta de habilidade "${habilidade}" no nível "${nivelAlmejado}" após filtragem global.`
            );
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
        }
      );
    }
  );
  return newPeiData;
};

const loadExistingPeiData = () => {};

// --- COMPONENTE PRINCIPAL ---
export default function CriarPEI() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [areaAtiva, setAreaAtiva] = useState("");
  const [pei, setPei] = useState({});
  const [entradaManual, setEntradaManual] = useState({});
  const [carregando, setCarregando] = useState(false);
  const [atividadeAplicada, setAtividadeAplicada] = useState("");
  const [peiCriadorId, setPeiCriadorId] = useState(null);

  const [activeTab, setActiveTab] = useState("longoPrazo");

  const navigate = useNavigate();
  const location = useLocation();
  const { erro, mensagemSucesso, exibirMensagem } = useMessageSystem();

  const { userSchoolId, userSchoolData, isLoadingUserSchool, userSchoolError } =
    useUserSchool();

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

  const carregarDadosIniciais = useCallback(async () => {
    setCarregando(true);
    exibirMensagem("sucesso", "Carregando dados iniciais...");

    if (isLoadingUserSchool) return;

    try {
      const currentYear = new Date().getFullYear();
      const isAcessoAmplo = perfisComAcessoAmplo.includes(usuarioLogado.perfil);

      let alunosQuery;
      let peisQuery;

      const isDesenvolvedorOuSeme = ["desenvolvedor", "seme"].includes(
        usuarioLogado.perfil
      );

      // --- ALTERAÇÃO AQUI: LÓGICA PARA PERFIS "DESENVOLVEDOR" e "SEME" ---
      if (isDesenvolvedorOuSeme) {
        alunosQuery = collection(db, "alunos");
        peisQuery = collection(db, "peis");
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
        peisQuery = query(
          collection(db, "peis"),
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
        peisQuery = query(
          collection(db, "peis"),
          where("criadorId", "==", usuarioLogado.email)
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

      const [alunosSnap, peisSnap] = await Promise.all([
        getDocs(alunosQuery),
        getDocs(peisQuery),
      ]);

      const todosAlunos = alunosSnap.docs.map((doc) => {
        const alunoData = doc.data();
        return {
          id: doc.id,
          ...alunoData,
          isTea: verificaTea(alunoData.diagnostico),
        };
      });

      const peisDoUsuario = peisSnap.docs.filter(
        (doc) =>
          doc.data().criadorId === usuarioLogado.email &&
          doc.data().anoLetivo === currentYear
      );

      const alunosComPeiDesteUsuarioIds = new Set(
        peisDoUsuario.map((doc) => doc.data().alunoId)
      );

      const alunosParaSelecaoFinal = todosAlunos.filter(
        (aluno) => !alunosComPeiDesteUsuarioIds.has(aluno.id)
      );

      setAlunos(alunosParaSelecaoFinal);
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
      // Verifica se o input é um objeto (passado pelo state) ou uma string (do select)
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

        // Consulta unificada para a avaliação usando o campo consistente 'alunoId'
        let qUltimaAvaliacao = query(
          collection(db, "avaliacoesIniciais"),
          where("alunoId", "==", aluno.id),
          orderBy("dataCriacao", "desc"),
          limit(1)
        );
        let avaliacoesSnap = await getDocs(qUltimaAvaliacao);

        // Se a primeira busca não encontrou nada, tenta o formato antigo 'aluno.id'
        if (avaliacoesSnap.empty) {
          const qUltimaAvaliacaoAntigo = query(
            collection(db, "avaliacoesIniciais"),
            where("aluno.id", "==", aluno.id),
            orderBy("dataCriacao", "desc"),
            limit(1)
          );
          avaliacoesSnap = await getDocs(qUltimaAvaliacaoAntigo);
        }

        if (avaliacoesSnap.empty) {
          exibirMensagem(
            "erro",
            "Este aluno não possui avaliação inicial ou reavaliação."
          );
          setAlunoSelecionado(null);
          setPeiCriadorId(null);
          return;
        }

        const assessment = avaliacoesSnap.docs[0].data();

        const qTodosPeisDoAlunoNoAno = query(
          collection(db, "peis"),
          where("alunoId", "==", aluno.id),
          where("anoLetivo", "==", currentYear)
        );
        const todosPeisDoAlunoSnap = await getDocs(qTodosPeisDoAlunoNoAno);
        const alunoJaTemQualquerPei = !todosPeisDoAlunoSnap.empty;

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

        const podeIniciarPrimeiroPEI = verificarPermissaoIniciarPrimeiroPEI(
          usuarioLogado.perfil,
          usuarioLogado.cargo
        );

        if (!alunoJaTemQualquerPei && !podeIniciarPrimeiroPEI) {
          exibirMensagem(
            "erro",
            `Este aluno não possui PEI. Apenas AEE, Gestão, Prof. de Suporte e Prof. Regente podem iniciar o primeiro PEI.`
          );
          setAlunoSelecionado(null);
          setPeiCriadorId(null);
          return;
        }

        const newPei = buildNewPeiFromAssessment(
          assessment,
          estruturaPEIMap,
          objetivosCurtoPrazoMap,
          objetivosMedioPrazoMap,
          new Set(),
          estrategiasJaEmUsoGlobalmente
        );

        const isNewPeiEmpty = Object.keys(newPei).every(
          (area) => newPei[area].length === 0
        );

        if (isNewPeiEmpty) {
          let errorMessageDetail = "";
          if (alunoJaTemQualquerPei) {
            errorMessageDetail =
              "Os objetivos sugeridos para este aluno já foram abordados no PEI inicial e/ou todas as estratégias disponíveis já estão em uso.";
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
          `Novo PEI iniciado com base na avaliação mais recente. Você está criando o SEU PEI para este aluno.`
        );
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

      const currentYear = new Date().getFullYear();
      // NOTA: A busca está na coleção 'peis'. Se os novos PEIs devem ir para 'pei_contribucoes',
      // esta lógica precisará ser ajustada para buscar e salvar na coleção correta.
      const qExisting = query(
        collection(db, "peis"),
        where("alunoId", "==", alunoSelecionado.id),
        where("anoLetivo", "==", currentYear),
        where("criadorId", "==", usuarioLogado.email),
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
        escolaId: alunoSelecionado.escolaId,
        anoLetivo: currentYear,
      };

      if (!snapExisting.empty) {
        // --- LÓGICA DE ATUALIZAÇÃO (REVISÃO) ---
        const peiDocRef = snapExisting.docs[0].ref;

        const mesAtual = new Date().getMonth(); // 0 = Janeiro, 11 = Dezembro
        const semestreAtual =
          mesAtual < 6 ? "primeiroSemestre" : "segundoSemestre";

        const dadosDaRevisao = {
          status: "Concluído",
          dataRevisao: serverTimestamp(),
          revisadoPor: usuarioLogado.uid,
        };

        await updateDoc(peiDocRef, {
          ...commonFields,
          dataUltimaRevisao: serverTimestamp(),
          // A "mágica" acontece aqui, salvando os dados da revisão
          [`revisoes.${semestreAtual}`]: dadosDaRevisao,
        });
        exibirMensagem(
          "sucesso",
          "PEI atualizado (revisão salva) com sucesso!"
        );
      } else {
        // --- LÓGICA DE CRIAÇÃO (NOVO PEI) ---
        await addDoc(collection(db, "peis"), {
          alunoId: alunoSelecionado.id,
          aluno: alunoSelecionado.nome,
          turma: alunoSelecionado.turma,
          ...commonFields,
          dataCriacao: serverTimestamp(),
          revisoes: {}, // Inicializa o campo de revisões como um mapa vazio
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
        <div className="card-header">
          <BotaoVoltar />
          <BotaoVerPEIs />
        </div>

        <h1 className="titulo">Criar PEI</h1>

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
            disabled={
              carregando ||
              (alunoSelecionado && location.state?.alunoParaSelecionar)
            }
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
                        ...(meta.estrategias || []),
                        ...currentlySelectedStrategiesSet,
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

                                      if (newCheckedState) {
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

CriarPEI.propTypes = {};
