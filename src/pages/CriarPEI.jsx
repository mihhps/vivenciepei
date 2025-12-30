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
import { FaPuzzlePiece, FaUserCircle } from "react-icons/fa"; // NOVO: Importar FaUserCircle

import { useUserSchool } from "../hooks/useUserSchool";

// Importando as 3 funções do nosso serviço de IA
import {
  getSugestaoEstrategiasPEI,
  getSugestaoAtividadePEI,
  getSugestaoAtividadeParaEstrategia,
} from "../services/geminiService";

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

// NOVO: Função para calcular a idade completa (copiada de outros componentes)
const calcularIdadeCompleta = (dataNascimentoString) => {
  if (!dataNascimentoString) return "N/A";

  const dataNascimento = new Date(dataNascimentoString);
  const hoje = new Date();

  if (isNaN(dataNascimento)) return "N/A";

  let anos = hoje.getFullYear() - dataNascimento.getFullYear();
  let meses = hoje.getMonth() - dataNascimento.getMonth();

  if (meses < 0 || (meses === 0 && hoje.getDate() < dataNascimento.getDate())) {
    anos--;
    meses = 12 + meses;
  }

  const idadeAnos = Math.floor(anos);
  const idadeMeses = meses;

  let resultado = `${idadeAnos} ano${idadeAnos !== 1 ? "s" : ""}`;
  if (idadeMeses > 0) {
    resultado += ` e ${idadeMeses} mes${idadeMeses !== 1 ? "es" : ""}`;
  }
  return resultado;
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

// --- ESTILOS INLINE PARA FOTO E INFORMAÇÃO ---
const infoStyles = {
  infoGeralContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "20px",
    borderBottom: "1px solid #e0eeef",
  },
  fotoContainer: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    overflow: "hidden",
    marginRight: "15px",
    flexShrink: 0,
    border: "3px solid #4c51bf",
    backgroundColor: "#edf2f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  foto: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  fotoPlaceholder: {
    fontSize: "2.5em",
    color: "#4c51bf",
  },
  nomeText: {
    margin: 0,
    fontSize: "1.4em",
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: "4px",
  },
  idadeText: {
    margin: 0,
    fontSize: "1em",
    color: "#4a5568",
  },
  teaBadge: {
    fontSize: "1em",
    color: "#29ABE2",
    marginLeft: "10px",
  },
};

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
  const [estrategiasIA, setEstrategiasIA] = useState({});
  const [carregandoIA, setCarregandoIA] = useState(null);

  // Novos estados para a nova funcionalidade
  const [sugestoesAtividadesIndividuais, setSugestoesAtividadesIndividuais] =
    useState({});
  const [carregandoAtividadeIndividual, setCarregandoAtividadeIndividual] =
    useState({});
  const [sugestaoExibida, setSugestaoExibida] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const { erro, mensagemSucesso, exibirMensagem } = useMessageSystem();
  // Pega o ano selecionado no seletor global (rodapé)
  const anoAtivo = useMemo(
    () => Number(localStorage.getItem("anoExercicio")) || 2025,
    []
  );

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
  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );
  const isPEICriador = useMemo(
    () => !peiCriadorId || usuarioLogado.email === peiCriadorId,
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
      const currentYear = new Date().getFullYear();
      const isAcessoAmplo = perfisComAcessoAmplo.includes(usuarioLogado.perfil);
      let alunosQuery;
      let peisQuery;
      if (["desenvolvedor", "seme"].includes(usuarioLogado.perfil)) {
        alunosQuery = collection(db, "alunos");
        peisQuery = collection(db, "peis");
      } else if (isAcessoAmplo) {
        if (!userSchoolId)
          throw new Error(
            "ID da escola não encontrado para o perfil de gestão."
          );
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
          setAlunos([]);
          return exibirMensagem(
            "erro",
            "Nenhuma turma vinculada ao seu perfil de professor."
          );
        }
        alunosQuery = query(
          collection(db, "alunos"),
          where("turma", "in", turmasDoProfessor),
          where("ano", "==", anoAtivo) // ✅ NOVO FILTRO
        );
        peisQuery = query(
          collection(db, "peis"),
          where("criadorId", "==", usuarioLogado.email),
          where("anoLetivo", "==", anoAtivo) // ✅ NOVO FILTRO
        );
      } else {
        setAlunos([]);
        return exibirMensagem(
          "erro",
          "Seu perfil não tem permissão para visualizar alunos."
        );
      }
      const [alunosSnap, peisSnap] = await Promise.all([
        getDocs(alunosQuery),
        getDocs(peisQuery),
      ]);
      const todosAlunos = alunosSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isTea: verificaTea(doc.data().diagnostico),
      }));
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
    } catch (err) {
      exibirMensagem("erro", `Falha ao carregar dados: ${err.message}.`);
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
    anoAtivo,
  ]);

  useEffect(() => {
    if (!isLoadingUserSchool) carregarDadosIniciais();
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
      if (!aluno) return exibirMensagem("erro", "Aluno não encontrado.");
      setAlunoSelecionado(aluno);
      setCarregando(true);
      try {
        const currentYear = new Date().getFullYear();
        let qUltimaAvaliacao = query(
          collection(db, "avaliacoesIniciais"),
          where("alunoId", "==", aluno.id),
          where("ano", "==", anoAtivo), // ✅ GARANTE QUE O PEI SEJA BASEADO NA AVALIAÇÃO DO ANO ATIVO
          orderBy("dataCriacao", "desc"),
          limit(1)
        );
        let avaliacoesSnap = await getDocs(qUltimaAvaliacao);
        if (avaliacoesSnap.empty) {
          qUltimaAvaliacao = query(
            collection(db, "avaliacoesIniciais"),
            where("aluno.id", "==", aluno.id),
            orderBy("dataCriacao", "desc"),
            limit(1)
          );
          avaliacoesSnap = await getDocs(qUltimaAvaliacao);
        }
        if (avaliacoesSnap.empty) {
          setAlunoSelecionado(null);
          return exibirMensagem(
            "erro",
            "Este aluno não possui avaliação inicial ou reavaliação."
          );
        }
        const assessment = avaliacoesSnap.docs[0].data();
        const qTodosPeisDoAlunoNoAno = query(
          collection(db, "peis"),
          where("alunoId", "==", aluno.id),
          where("anoLetivo", "==", currentYear)
        );
        const todosPeisDoAlunoSnap = await getDocs(qTodosPeisDoAlunoNoAno);
        const alunoJaTemQualquerPei = !todosPeisDoAlunoSnap.empty;
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

        const estrategiasJaEmUsoGlobalmente = new Set();
        todosPeisDoAlunoSnap.docs.forEach((doc) => {
          doc
            .data()
            .resumoPEI?.forEach((meta) =>
              meta.estrategiasSelecionadas?.forEach((estrat) =>
                estrategiasJaEmUsoGlobalmente.add(estrat)
              )
            );
        });
        const newPei = buildNewPeiFromAssessment(
          assessment,
          estruturaPEIMap,
          objetivosCurtoPrazoMap,
          objetivosMedioPrazoMap,
          new Set(),
          estrategiasJaEmUsoGlobalmente
        );
        if (Object.keys(newPei).length === 0) {
          setAlunoSelecionado(null);
          return exibirMensagem(
            "erro",
            "Não foi possível iniciar um novo PEI. Todos os objetivos já foram abordados."
          );
        }
        setPei(newPei);
        setAreaAtiva(Object.keys(newPei)[0] || "");
        setAtividadeAplicada("");
        setEntradaManual({});
        exibirMensagem(
          "sucesso",
          "Novo PEI iniciado com base na avaliação mais recente."
        );
      } catch (err) {
        exibirMensagem("erro", `Erro ao carregar PEI: ${err.message}`);
      } finally {
        setCarregando(false);
      }
    },
    [
      alunos,
      exibirMensagem,
      estruturaPEIMap,
      objetivosCurtoPrazoMap,
      objetivosMedioPrazoMap,
      usuarioLogado,
    ]
  );

  useEffect(() => {
    if (location.state?.alunoParaSelecionar && alunos.length > 0) {
      handleSelectStudent(location.state.alunoParaSelecionar.nome);
    }
  }, [location.state, alunos, handleSelectStudent]);

  const handleSavePEI = async () => {
    if (!alunoSelecionado) return exibirMensagem("erro", "Selecione um aluno.");
    setCarregando(true);
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
      // Substitua o currentYear pelo anoAtivo
      const qExisting = query(
        collection(db, "peis"),
        where("alunoId", "==", alunoSelecionado.id),
        where("anoLetivo", "==", anoAtivo), // ✅ USA O ANO DO SELETOR
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
        anoLetivo: anoAtivo,
      };
      if (!snapExisting.empty) {
        const peiDocRef = snapExisting.docs[0].ref;
        const mesAtual = new Date().getMonth();
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
          [`revisoes.${semestreAtual}`]: dadosDaRevisao,
        });
        exibirMensagem(
          "sucesso",
          "PEI atualizado (revisão salva) com sucesso!"
        );
        navigate("/ver-peis");
      } else {
        await addDoc(collection(db, "peis"), {
          alunoId: alunoSelecionado.id,
          aluno: alunoSelecionado.nome,
          turma: alunoSelecionado.turma,
          ...commonFields,
          dataCriacao: serverTimestamp(),
          revisoes: {},
        });
        exibirMensagem("sucesso", "Novo PEI salvo com sucesso!");
        navigate("/ver-peis");
      }
    } catch (err) {
      exibirMensagem("erro", `Erro ao salvar PEI: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const handleGerarEstrategiasIA = async (meta, area, manualKey) => {
    if (!alunoSelecionado) return exibirMensagem("erro", "Selecione um aluno.");
    setCarregandoIA(manualKey);
    const disciplinaParaIA =
      usuarioLogado.cargo === "Professor Regente"
        ? "Pedagogia Geral"
        : usuarioLogado.cargo;

    try {
      const novasEstrategias = await getSugestaoEstrategiasPEI(
        alunoSelecionado,
        meta,
        area,
        disciplinaParaIA
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

  // CriarPEI.jsx (Substituir o bloco de handleGerarAtividadeIndividual)

  const handleGerarAtividadeIndividual = async (estrategia) => {
    if (!alunoSelecionado) return;

    // 1. CORREÇÃO DE ESCOPO: Declare a variável aqui!
    // Incluindo a lógica para tratar perfis de Gestão/Desenvolvedor/SEME como "Pedagogia Geral"
    const perfilUsuario = usuarioLogado.perfil
      ? usuarioLogado.perfil.toLowerCase()
      : "";
    let disciplinaParaIA = usuarioLogado.cargo || "Professor";

    if (
      ["desenvolvedor", "gestao", "seme", "professor regente"].includes(
        perfilUsuario
      ) ||
      disciplinaParaIA === "Professor Regente"
    ) {
      disciplinaParaIA = "Pedagogia Geral";
    }

    // CORREÇÃO 2: Normaliza a chave para ser sempre um texto
    const keyTexto =
      typeof estrategia === "string" ? estrategia : estrategia.titulo;

    if (sugestoesAtividadesIndividuais[keyTexto]) {
      const listaSugestoes = sugestoesAtividadesIndividuais[keyTexto];
      const novaSugestao =
        listaSugestoes[Math.floor(Math.random() * listaSugestoes.length)];
      setSugestaoExibida((prev) => ({
        ...prev,
        [keyTexto]: novaSugestao,
      }));
      return;
    }

    setCarregandoAtividadeIndividual((prev) => ({ ...prev, [keyTexto]: true }));
    try {
      // 3. Chamada da API com o argumento corrigido (disciplinaParaIA)
      const respostaDaApi = await getSugestaoAtividadeParaEstrategia(
        alunoSelecionado,
        estrategia,
        disciplinaParaIA // <--- Agora está definida!
      );

      // Garante que a resposta seja sempre uma lista de textos
      const listaDeSugestoes = respostaDaApi
        .map((item) =>
          typeof item === "string"
            ? item
            : item.atividade || item.titulo || item.sugestao
        )
        .filter(Boolean);

      if (listaDeSugestoes.length === 0) {
        throw new Error("A IA não retornou sugestões formatadas.");
      }

      setSugestoesAtividadesIndividuais((prev) => ({
        ...prev,
        [keyTexto]: listaDeSugestoes,
      }));

      const primeiraSugestao =
        listaDeSugestoes[Math.floor(Math.random() * listaDeSugestoes.length)];
      setSugestaoExibida((prev) => ({
        ...prev,
        [keyTexto]: primeiraSugestao,
      }));
    } catch (error) {
      exibirMensagem("erro", `IA Error: ${error.message}`);
    } finally {
      setCarregandoAtividadeIndividual((prev) => ({
        ...prev,
        [keyTexto]: false,
      }));
    }
  };
  const handleIncluirAtividade = (textoParaIncluir) => {
    setAtividadeAplicada((prev) =>
      prev ? `${prev}\n\n- ${textoParaIncluir}` : `- ${textoParaIncluir}`
    );
  };

  return (
    <div className="container" aria-busy={carregando}>
      <div className="card">
        <div className="card-header">
          <BotaoVoltar />
          <BotaoVerPEIs />
        </div>
        <h1 className="titulo">Criar PEI</h1>
        {erro && <div className="mensagem-erro">{erro}</div>}
        {mensagemSucesso && (
          <div className="mensagem-sucesso">{mensagemSucesso}</div>
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
          >
            <option value="">
              {carregando ? "Carregando..." : "Selecione um aluno"}
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
            {/* --- NOVO BLOCO: FOTO E INFORMAÇÕES GERAIS --- */}
            <div style={infoStyles.infoGeralContainer}>
              {/* FOTO / PLACEHOLDER */}
              <div style={infoStyles.fotoContainer}>
                {alunoSelecionado.fotoUrl ? (
                  <img
                    src={alunoSelecionado.fotoUrl}
                    alt={`Foto de ${alunoSelecionado.nome}`}
                    style={infoStyles.foto}
                  />
                ) : (
                  <FaUserCircle style={infoStyles.fotoPlaceholder} />
                )}
              </div>
              {/* DETALHES */}
              <div>
                <p style={infoStyles.nomeText}>
                  {alunoSelecionado.nome}
                  {alunoSelecionado.isTea && (
                    <FaPuzzlePiece
                      style={infoStyles.teaBadge}
                      title="Aluno com TEA"
                    />
                  )}
                </p>
                <p style={infoStyles.idadeText}>
                  Idade: {calcularIdadeCompleta(alunoSelecionado.nascimento)}
                </p>
                <p style={infoStyles.idadeText}>
                  Turma: {alunoSelecionado.turma || "N/A"} (
                  {alunoSelecionado.turno})
                </p>
              </div>
            </div>
            {/* --- FIM DO BLOCO FOTO/INFORMAÇÕES --- */}

            <div className="area-buttons-container">
              {Object.keys(pei).map((area) => (
                <button
                  key={area}
                  onClick={() => setAreaAtiva(area)}
                  className={`area-button ${
                    areaAtiva === area ? "area-button-ativa" : ""
                  }`}
                >
                  {area}
                </button>
              ))}
              <button
                onClick={() => setAreaAtiva("atividadeAplicada")}
                className={`area-button ${
                  areaAtiva === "atividadeAplicada" ? "area-button-ativa" : ""
                }`}
              >
                Atividade Aplicada
              </button>
            </div>

            {areaAtiva && areaAtiva !== "atividadeAplicada" && (
              <div className="area-buttons-container">
                <button
                  onClick={() => setActiveTab("curtoPrazo")}
                  className={`area-button ${
                    activeTab === "curtoPrazo" ? "area-button-ativa" : ""
                  }`}
                >
                  Curto Prazo
                </button>
                <button
                  onClick={() => setActiveTab("medioPrazo")}
                  className={`area-button ${
                    activeTab === "medioPrazo" ? "area-button-ativa" : ""
                  }`}
                >
                  Médio Prazo
                </button>
                <button
                  onClick={() => setActiveTab("longoPrazo")}
                  className={`area-button ${
                    activeTab === "longoPrazo" ? "area-button-ativa" : ""
                  }`}
                >
                  Longo Prazo
                </button>
              </div>
            )}

            {areaAtiva === "atividadeAplicada" && (
              <div className="section-content">
                <h3 className="titulo-secao-atividade">Atividades Aplicadas</h3>
                <p className="info-text">
                  Gere ideias para cada estratégia selecionada e depois inclua
                  as melhores na sua atividade final.
                </p>
                <div className="lista-brainstorm">
                  {estrategiasSelecionadas.length > 0 ? (
                    estrategiasSelecionadas.map((estrategia, index) => {
                      // CORREÇÃO 3: Criamos a chave de texto para ler os estados corretamente
                      const keyTexto =
                        typeof estrategia === "string"
                          ? estrategia
                          : estrategia.titulo;

                      return (
                        <div key={index} className="item-brainstorm">
                          <p className="estrategia-texto">
                            <strong>Estratégia:</strong> {keyTexto}
                          </p>
                          <button
                            className="botao-ia-pequeno"
                            onClick={() =>
                              handleGerarAtividadeIndividual(estrategia)
                            }
                            disabled={carregandoAtividadeIndividual[keyTexto]}
                          >
                            {carregandoAtividadeIndividual[keyTexto]
                              ? "Gerando..."
                              : "Gerar Sugestão 💡"}
                          </button>

                          {sugestaoExibida[keyTexto] && (
                            <div className="sugestao-individual-container">
                              <textarea
                                className="textarea-sugestao"
                                rows="3"
                                value={sugestaoExibida[keyTexto]}
                                readOnly
                              />
                              <button
                                className="botao-incluir"
                                onClick={() =>
                                  handleIncluirAtividade(
                                    sugestaoExibida[keyTexto]
                                  )
                                }
                              >
                                + Incluir na Atividade
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
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

            {areaAtiva && areaAtiva !== "atividadeAplicada" && (
              <div className="section-content">
                {pei[areaAtiva]?.map((meta, idx) => {
                  const manualKey = `${areaAtiva}-${meta.habilidade.replace(
                    /[^a-zA-Z0-9-]/g,
                    ""
                  )}`;
                  const manualData = entradaManual[manualKey] || {};
                  const currentlySelectedStrategiesSet = new Set([
                    ...(manualData.estrategias || []),
                    ...(manualData.estrategiasManuais
                      ?.split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean) || []),
                  ]);
                  // NOVO CÓDIGO CORRIGIDO
                  const allInitialStrategies = new Set([
                    ...(meta.estrategias || []),
                    ...(estrategiasIA[manualKey] || []),
                  ]);

                  const manualStrategies =
                    manualData.estrategiasManuais
                      ?.split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean) || [];

                  const strategiesToDisplay = Array.from(
                    new Set([...allInitialStrategies, ...manualStrategies])
                  );
                  let objetivoParaExibir = meta.objetivos.longoPrazo;
                  if (activeTab === "curtoPrazo")
                    objetivoParaExibir = meta.objetivos.curtoPrazo;
                  if (activeTab === "medioPrazo")
                    objetivoParaExibir = meta.objetivos.medioPrazo;

                  return (
                    <article
                      key={`${meta.habilidade}-${idx}`}
                      className="meta-card"
                      style={{
                        border: "1px solid #ddd",
                        padding: "1rem",
                        margin: "1rem 0",
                      }}
                    >
                      <h3 id={`meta-${manualKey}-habilidade`}>
                        {meta.habilidade}
                      </h3>
                      <p>
                        <strong>Nível avaliado:</strong> {meta.nivel} —{" "}
                        {LEGENDA_NIVEIS[meta.nivel]}
                      </p>
                      <p>
                        <strong>Nível almejado:</strong> {meta.nivelAlmejado} —{" "}
                        {LEGENDA_NIVEIS[meta.nivelAlmejado]}
                      </p>
                      <div
                        className={`meta-objective ${activeTab}`}
                        style={{
                          background: "#f0f0f0",
                          padding: "1rem",
                          borderRadius: "4px",
                          margin: "1rem 0",
                        }}
                      >
                        {objetivoParaExibir}
                      </div>
                      <fieldset className="meta-fieldset">
                        <legend>Estratégias:</legend>
                        {strategiesToDisplay.map((estrategia, i) => {
                          const estrategiaValue =
                            typeof estrategia === "string"
                              ? estrategia
                              : estrategia?.titulo || "";
                          if (!estrategiaValue) return null;
                          const isDisabledCheckbox = false;

                          currentlySelectedStrategiesSet.has(estrategiaValue);
                          return (
                            <label
                              key={`${estrategiaValue}-${i}`}
                              className="checkbox-container"
                            >
                              <input
                                type="checkbox"
                                checked={currentlySelectedStrategiesSet.has(
                                  estrategiaValue
                                )}
                                // Verifique se o seu onChange é este:
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  const value = estrategiaValue;

                                  console.log(
                                    `Clicado! Estratégia: "${value}", Novo estado do check: ${isChecked}`
                                  );

                                  setEntradaManual((prev) => {
                                    const currentData = prev[manualKey] || {
                                      estrategias: [],
                                      estrategiasManuais: "",
                                    };
                                    let currentList = Array.isArray(
                                      currentData.estrategias
                                    )
                                      ? [...currentData.estrategias]
                                      : [];
                                    let currentTextAsArray = (
                                      currentData.estrategiasManuais || ""
                                    )
                                      .split("\n")
                                      .filter(Boolean);

                                    const allSelectedSet = new Set([
                                      ...currentList,
                                      ...currentTextAsArray,
                                    ]);

                                    if (isChecked) {
                                      allSelectedSet.add(value);
                                    } else {
                                      allSelectedSet.delete(value);
                                    }

                                    const newSelectedArray =
                                      Array.from(allSelectedSet);

                                    const allSuggestedStrategies = new Set([
                                      ...(meta.estrategias || []),
                                      ...(estrategiasIA[manualKey] || []),
                                    ]);

                                    const newList = newSelectedArray.filter(
                                      (item) => allSuggestedStrategies.has(item)
                                    );
                                    const newTextArray =
                                      newSelectedArray.filter(
                                        (item) =>
                                          !allSuggestedStrategies.has(item)
                                      );

                                    console.log("ESTADO ANTES:", currentData);
                                    console.log(
                                      "ESTADO DEPOIS (Listas separadas):",
                                      {
                                        estrategias: newList,
                                        estrategiasManuais:
                                          newTextArray.join("\n"),
                                      }
                                    );

                                    return {
                                      ...prev,
                                      [manualKey]: {
                                        ...currentData,
                                        estrategias: newList,
                                        estrategiasManuais:
                                          newTextArray.join("\n"),
                                      },
                                    };
                                  });
                                }}
                                disabled={isDisabledCheckbox}
                              />
                              <span className="checkmark"></span>
                              <span className="checkbox-label">
                                {estrategiaValue}
                              </span>
                            </label>
                          );
                        })}
                        <div
                          className="ia-sugestao-container"
                          style={{ marginTop: "1rem" }}
                        >
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
                        <label
                          htmlFor={`estrategias-manuais-${manualKey}`}
                          className="form-label"
                          style={{ display: "block", marginTop: "1rem" }}
                        >
                          Adicionar outras estratégias:
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
                          rows="3"
                          style={{
                            width: "calc(100% - 10px)",
                            padding: "5px",
                            marginTop: "0.5rem",
                          }}
                        />
                      </fieldset>
                    </article>
                  );
                })}
              </div>
            )}
            <button
              onClick={handleSavePEI}
              className="botao-salvar"
              disabled={carregando}
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
