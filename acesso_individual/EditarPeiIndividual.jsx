import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import "../styles/EditarPei.css";

// IMPORTAÇÕES DOS DADOS (REAPROVEITADAS)
import estruturaPEI from "../data/estruturaPEI2";
import objetivosCurtoPrazoData from "../data/objetivosCurtoPrazo";
import objetivosMedioPrazoData from "../data/objetivosMedioPrazo";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";

// IMPORTAÇÕES DE IA (REAPROVEITADAS)
import {
  getSugestaoEstrategiasPEI,
  getSugestaoAtividadePEI,
  getSugestaoAtividadeParaEstrategia,
} from "../services/geminiService";

// --- ROTAS ADAPTADAS PARA O MÓDULO INDIVIDUAL ---
const ROTA_VER_PEIS_INDIVIDUAL = "/ver-peis-individual";

// --- Funções de Mapeamento de Dados (MANTIDAS) ---
const getEstruturaPEIMap = (estrutura) => {
  const map = {};
  if (!estrutura) return map;
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
  if (!prazoData) return map;
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

const LEGENDA_NIVEIS = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
};

const normalizarEstrategias = (estrategias) => {
  if (Array.isArray(estrategias)) return estrategias;
  if (typeof estrategias === "string" && estrategias) return [estrategias];
  return [];
};

function EditarPeiIndividual() {
  // RENOMEADO
  const { id } = useParams();
  const navigate = useNavigate();

  const [pei, setPei] = useState(null);
  const [atividadeAplicada, setAtividadeAplicada] = useState("");
  const [entradaManual, setEntradaManual] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [areaAtiva, setAreaAtiva] = useState("");
  const [activeTab, setActiveTab] = useState("longoPrazo");
  const [objetivosSelecionados, setObjetivosSelecionados] = useState({});

  // ESTADOS DA IA (MANTIDOS)
  const [estrategiasIA, setEstrategiasIA] = useState({});
  const [carregandoIA, setCarregandoIA] = useState(null);
  const [sugestoesAtividadesIndividuais, setSugestoesAtividadesIndividuais] =
    useState({});
  const [carregandoAtividadeIndividual, setCarregandoAtividadeIndividual] =
    useState({});

  const usuarioLogado = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usuarioLogado")) || {};
    } catch (e) {
      console.error("Erro ao fazer parse do usuário logado:", e);
      return {};
    }
  }, []);

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

  const estrategiasSelecionadas = useMemo(() => {
    const todasEstrategias = new Set();
    if (!pei || !entradaManual) return [];
    Object.entries(pei.resumoPEI || {}).forEach(([area, metas]) => {
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

  const carregarPei = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const ref = doc(db, "peis", id);
      const docSnap = await getDoc(ref);
      if (!docSnap.exists()) {
        setErro("PEI não encontrado.");
        return;
      }
      const dados = docSnap.data();
      const alunoId = dados.alunoId;
      const currentYear = new Date().getFullYear();

      // MANTIDA A LÓGICA COMPLEXA DE CARREGAMENTO E MERGE DE METAS
      const qPrimeiroPeiDoAluno = query(
        collection(db, "peis"),
        where("alunoId", "==", alunoId),
        where("anoLetivo", "==", currentYear),
        orderBy("dataCriacao", "asc"),
        limit(1)
      );
      const primeiroPeiSnap = await getDocs(qPrimeiroPeiDoAluno);
      const primeiroPeiDoAluno = !primeiroPeiSnap.empty
        ? primeiroPeiSnap.docs[0].data()
        : null;

      const qTodosPeisDoAluno = query(
        collection(db, "peis"),
        where("alunoId", "==", alunoId),
        where("anoLetivo", "==", currentYear)
      );
      const todosPeisDoAlunoSnap = await getDocs(qTodosPeisDoAluno);
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

      const metasDoProfessor = dados.resumoPEI || [];
      const metasDoPeiBase = primeiroPeiDoAluno?.resumoPEI || [];

      const todasAsHabilidades = new Set(
        [...metasDoProfessor, ...metasDoPeiBase].map((m) => m.habilidade)
      );

      const peiAgrupadoPorArea = {};
      const objetivosParaSelecao = {};
      const entradaInicial = {};

      todasAsHabilidades.forEach((habilidade) => {
        const metaDoProfessor = metasDoProfessor.find(
          (m) => m.habilidade === habilidade
        );
        const metaDoPeiBase = metasDoPeiBase.find(
          (m) => m.habilidade === habilidade
        );
        const metaPrincipal = metaDoProfessor || metaDoPeiBase;
        if (!metaPrincipal) return;

        const area = metaPrincipal.area;
        const manualKey = `${area}-${habilidade.replace(/[^a-zA-Z0-9-]/g, "")}`;
        const estrategiasSalvas = normalizarEstrategias(
          metaDoProfessor?.estrategiasSelecionadas ||
            metaDoProfessor?.estrategias ||
            []
        );
        const suggestedStrategiesFromMap = normalizarEstrategias(
          estruturaPEIMap[habilidade]?.[metaPrincipal.nivelAlmejado]
            ?.estrategias
        );
        const selectedStrategiesForThisPei = new Set(estrategiasSalvas);
        const availableSuggestedStrategies = suggestedStrategiesFromMap.filter(
          (estrat) =>
            !estrategiasJaEmUsoGlobalmente.has(estrat) ||
            selectedStrategiesForThisPei.has(estrat)
        );
        const selectedSuggestedFromSaved = estrategiasSalvas.filter((saved) =>
          suggestedStrategiesFromMap.includes(saved)
        );
        const manualSavedStrategies = estrategiasSalvas.filter(
          (saved) => !suggestedStrategiesFromMap.includes(saved)
        );
        const objetivosBase = metaDoPeiBase?.objetivos || {
          longoPrazo: metaDoPeiBase?.objetivo || "",
          curtoPrazo:
            objetivosCurtoPrazoMap[habilidade]?.[
              metaDoPeiBase?.nivelAlmejado
            ] || "",
          medioPrazo:
            objetivosMedioPrazoMap[habilidade]?.[
              metaDoPeiBase?.nivelAlmejado
            ] || "",
        };
        const objetivosDoProfessor = metaDoProfessor?.objetivos || {
          curtoPrazo:
            objetivosCurtoPrazoMap[habilidade]?.[metaPrincipal.nivelAlmejado] ||
            "",
          medioPrazo:
            objetivosMedioPrazoMap[habilidade]?.[metaPrincipal.nivelAlmejado] ||
            "",
          longoPrazo:
            estruturaPEIMap[habilidade]?.[metaPrincipal.nivelAlmejado]
              ?.objetivo || "",
        };
        const todosOsObjetivosDestaMeta = {
          curtoPrazo: Array.from(
            new Set([objetivosDoProfessor.curtoPrazo, objetivosBase.curtoPrazo])
          ).filter(Boolean),
          medioPrazo: Array.from(
            new Set([objetivosDoProfessor.medioPrazo, objetivosBase.medioPrazo])
          ).filter(Boolean),
          longoPrazo: Array.from(
            new Set([objetivosDoProfessor.longoPrazo, objetivosBase.longoPrazo])
          ).filter(Boolean),
        };

        objetivosParaSelecao[manualKey] = {
          curtoPrazo: [objetivosDoProfessor.curtoPrazo].filter(Boolean),
          medioPrazo: [objetivosDoProfessor.medioPrazo].filter(Boolean),
          longoPrazo: [objetivosDoProfessor.longoPrazo].filter(Boolean),
        };
        if (!peiAgrupadoPorArea[area]) {
          peiAgrupadoPorArea[area] = [];
        }
        peiAgrupadoPorArea[area].push({
          ...metaPrincipal,
          objetivos: todosOsObjetivosDestaMeta,
          estrategias: availableSuggestedStrategies,
          estrategiasSelecionadas: estrategiasSalvas,
        });
        entradaInicial[manualKey] = {
          estrategias: selectedSuggestedFromSaved,
          estrategiasManuais: manualSavedStrategies.join("\n"),
        };
      });

      setPei({ id, ...dados, resumoPEI: peiAgrupadoPorArea });
      setAtividadeAplicada(dados.atividadeAplicada || "");
      setEntradaManual(entradaInicial);
      setObjetivosSelecionados(objetivosParaSelecao);

      const primeiraArea = Object.keys(peiAgrupadoPorArea)[0];
      if (primeiraArea) {
        setAreaAtiva(primeiraArea);
      }
    } catch (error) {
      console.error("Erro ao carregar PEI:", error);
      setErro("Erro ao carregar dados do PEI. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [id, estruturaPEIMap, objetivosCurtoPrazoMap, objetivosMedioPrazoMap]);

  useEffect(() => {
    if (id) {
      carregarPei();
    } else {
      setErro("ID do PEI não fornecido.");
      setCarregando(false);
    }
  }, [id, carregarPei]);

  // FUNÇÕES DE IA (MANTIDAS)
  const handleGerarEstrategiasIA = async (meta, area, manualKey) => {
    if (!pei.alunoId) return setErro("Aluno do PEI não encontrado.");
    setCarregandoIA(manualKey);
    try {
      const novasEstrategias = await getSugestaoEstrategiasPEI(
        pei.aluno,
        meta,
        area
      );
      setEstrategiasIA((prev) => ({
        ...prev,
        [manualKey]: [...(prev[manualKey] || []), ...novasEstrategias],
      }));
    } catch (error) {
      setErro(`IA Error: ${error.message}`);
    } finally {
      setCarregandoIA(null);
    }
  };

  const handleGerarAtividadeIndividual = async (estrategia) => {
    if (!pei.aluno) return;

    const keyTexto =
      typeof estrategia === "string" ? estrategia : estrategia.titulo;

    // Se já temos uma lista de sugestões, apenas sorteamos uma nova para exibir
    if (sugestoesAtividadesIndividuais[keyTexto]?.lista?.length > 0) {
      const listaExistente = sugestoesAtividadesIndividuais[keyTexto].lista;
      const novaSugestao =
        listaExistente[Math.floor(Math.random() * listaExistente.length)];
      setSugestoesAtividadesIndividuais((prev) => ({
        ...prev,
        [keyTexto]: { ...prev[keyTexto], exibida: novaSugestao },
      }));
      return;
    }

    // Se não temos, buscamos na API
    setCarregandoAtividadeIndividual((prev) => ({
      ...prev,
      [keyTexto]: true,
    }));
    try {
      // É importante passar o cargo do usuário logado aqui também
      const listaDeSugestoes = await getSugestaoAtividadeParaEstrategia(
        pei.aluno,
        estrategia,
        usuarioLogado.cargo || "Professor Individual" // Valor padrão para individual
      );

      // Sorteia a primeira sugestão para exibir
      const primeiraSugestao =
        listaDeSugestoes[Math.floor(Math.random() * listaDeSugestoes.length)];

      // Agora salvamos a lista completa e a sugestão a ser exibida
      setSugestoesAtividadesIndividuais((prev) => ({
        ...prev,
        [keyTexto]: {
          lista: listaDeSugestoes,
          exibida: primeiraSugestao,
        },
      }));
    } catch (error) {
      setErro(`IA Error: ${error.message}`);
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

  const handleSalvar = async () => {
    if (!pei) return alert("Não há dados do PEI para salvar.");
    setCarregando(true);
    setErro(null);
    try {
      const resumoAtualizado = Object.values(pei.resumoPEI).flatMap((metas) =>
        metas.map((meta) => {
          const manualKey = meta.area
            ? `${meta.area}-${meta.habilidade.replace(/[^a-zA-Z0-9-]/g, "")}`
            : meta.habilidade.replace(/[^a-zA-Z0-9-]/g, "");
          const entrada = entradaManual[manualKey] || {};
          const objetivosSelecionadosParaMeta =
            objetivosSelecionados[manualKey] || {};
          const estrategiasSelecionadas = entrada.estrategias || [];
          const estrategiasManuaisNovas = (entrada.estrategiasManuais || "")
            .split("\n")
            .map((e) => e.trim())
            .filter(Boolean);
          const todasEstrategias = [
            ...new Set([
              ...estrategiasSelecionadas,
              ...estrategiasManuaisNovas,
            ]),
          ].filter((e) => typeof e === "string" && e.trim() !== "");
          return {
            ...meta,
            objetivos: {
              curtoPrazo: objetivosSelecionadosParaMeta.curtoPrazo?.[0] || "",
              medioPrazo: objetivosSelecionadosParaMeta.medioPrazo?.[0] || "",
              longoPrazo: objetivosSelecionadosParaMeta.longoPrazo?.[0] || "",
            },
            estrategiasSelecionadas: todasEstrategias,
          };
        })
      );
      const mesAtual = new Date().getMonth();
      const semestreAtual =
        mesAtual < 6 ? "primeiroSemestre" : "segundoSemestre";

      const dadosDaRevisao = {
        status: "Concluído",
        dataRevisao: serverTimestamp(),
        revisadoPor: usuarioLogado.uid,
      };

      await updateDoc(doc(db, "peis", id), {
        resumoPEI: resumoAtualizado,
        atividadeAplicada: atividadeAplicada,
        dataUltimaRevisao: serverTimestamp(),
        [`revisoes.${semestreAtual}`]: dadosDaRevisao,
      });

      alert("PEI atualizado com sucesso! 🎉");
      // ROTA DE NAVEGAÇÃO ADAPTADA
      navigate(ROTA_VER_PEIS_INDIVIDUAL);
    } catch (error) {
      console.error("Erro ao salvar PEI:", error);
      setErro("Erro ao salvar o PEI. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  // LÓGICA DE REMOÇÃO E CHECAGEM (MANTIDAS)
  const handleRemoverMeta = (habilidadeMetaRemover) => {
    if (
      window.confirm(
        `Tem certeza que deseja remover a meta "${habilidadeMetaRemover}"?`
      )
    ) {
      setPei((prevPei) => {
        if (!prevPei) return null;
        const novasAreas = { ...prevPei.resumoPEI };
        let metaRemovida = false;
        for (const area in novasAreas) {
          const metasDaArea = novasAreas[area];
          const novaListaMetas = metasDaArea.filter(
            (meta) => meta.habilidade !== habilidadeMetaRemover
          );
          if (novaListaMetas.length !== metasDaArea.length) {
            novasAreas[area] = novaListaMetas;
            metaRemovida = true;
            break;
          }
        }
        if (!metaRemovida) return prevPei;
        const novaEntradaManual = { ...entradaManual };
        const novaObjetivosSelecionados = { ...objetivosSelecionados };
        const metaRemovidaArea = Object.keys(novasAreas).find((area) =>
          novasAreas[area].some(
            (meta) => meta.habilidade === habilidadeMetaRemover
          )
        );
        const manualKey = `${metaRemovidaArea}-${habilidadeMetaRemover.replace(
          /[^a-zA-Z0-9-]/g,
          ""
        )}`;
        delete novaEntradaManual[manualKey];
        delete novaObjetivosSelecionados[manualKey];
        setEntradaManual(novaEntradaManual);
        setObjetivosSelecionados(novaObjetivosSelecionados);
        return { ...prevPei, resumoPEI: novasAreas };
      });
    }
  };

  const handleCheckboxChange = (manualKey, estrategia, estaMarcado) => {
    setEntradaManual((prev) => {
      const estrategiasAtuais = prev[manualKey]?.estrategias || [];
      const novasEstrategias = estaMarcado
        ? [...estrategiasAtuais, estrategia]
        : estrategiasAtuais.filter((est) => est !== estrategia);
      return {
        ...prev,
        [manualKey]: { ...prev[manualKey], estrategias: novasEstrategias },
      };
    });
  };

  const handleObjetivoChange = (manualKey, prazo, objetivo, estaMarcado) => {
    setObjetivosSelecionados((prev) => {
      const objetivosDoPrazo = prev[manualKey]?.[prazo] || [];
      const novosObjetivosDoPrazo = estaMarcado
        ? [objetivo]
        : objetivosDoPrazo.filter((obj) => obj !== objetivo);

      return {
        ...prev,
        [manualKey]: {
          ...prev[manualKey],
          [prazo]: novosObjetivosDoPrazo,
        },
      };
    });
  };

  if (carregando)
    return (
      <div className="estado-container">
        <p>Carregando PEI...</p>
      </div>
    );
  if (erro)
    return (
      <div className="estado-container">
        <p className="mensagem-erro">{erro}</p>
        <BotaoVoltar destino={ROTA_VER_PEIS_INDIVIDUAL} />
      </div>
    );
  if (!pei || !pei.resumoPEI || Object.keys(pei.resumoPEI).length === 0)
    return (
      <div className="estado-container">
        <p>Nenhum PEI carregado ou encontrado para edição.</p>
        <BotaoVoltar destino={ROTA_VER_PEIS_INDIVIDUAL} />
      </div>
    );

  const estilos = {
    areaButton: {
      padding: "10px 18px",
      borderRadius: "20px",
      border: "none",
      margin: "4px",
      backgroundColor: "#e0e0e0",
      color: "#333",
      cursor: "pointer",
      transition: "all 0.3s",
    },
    areaButtonAtiva: {
      backgroundColor: "#1d3557",
      color: "white",
      fontWeight: "bold",
    },
  };

  const metasDaAreaAtiva = pei.resumoPEI[areaAtiva] || [];

  return (
    <div className="editar-pei-fundo">
      <div className="editar-pei-card">
        {/* ROTA DE NAVEGAÇÃO ADAPTADA */}
        <BotaoVoltar destino={ROTA_VER_PEIS_INDIVIDUAL} />

        <h2 className="editar-pei-titulo">
          Editar PEI: {pei.aluno || "Aluno não identificado"}
        </h2>

        <div className="area-buttons-container">
          {todasAsAreas.map((area) => (
            <button
              key={area}
              onClick={() => {
                setAreaAtiva(area);
                setActiveTab("longoPrazo");
              }}
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
              ...(areaAtiva === "atividadeAplicada" && estilos.areaButtonAtiva),
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

        {/* Seção de Brainstorm de Atividades (Lógica mantida, pois já está no PEI) */}
        {areaAtiva === "atividadeAplicada" ? (
          <article className="meta-card">
            <h3 className="meta-card-titulo">Brainstorm de Atividades</h3>
            <p className="info-text">
              Gere ideias para cada estratégia selecionada e depois inclua as
              melhores na sua atividade final.
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
                      onClick={() => handleGerarAtividadeIndividual(estrategia)}
                      disabled={carregandoAtividadeIndividual[estrategia]}
                    >
                      {carregandoAtividadeIndividual[estrategia]
                        ? "Gerando..."
                        : "Gerar Sugestão 💡"}
                    </button>
                    {sugestoesAtividadesIndividuais[estrategia]?.exibida && (
                      <div className="sugestao-individual-container">
                        <textarea
                          className="textarea-sugestao"
                          rows="3"
                          value={
                            sugestoesAtividadesIndividuais[estrategia].exibida
                          }
                          readOnly
                        />
                        <button
                          className="botao-incluir"
                          onClick={() =>
                            handleIncluirAtividade(
                              sugestoesAtividadesIndividuais[estrategia].exibida
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
                  Nenhuma estratégia foi selecionada ainda. Volte para as áreas
                  e escolha algumas.
                </p>
              )}
            </div>
            <label
              htmlFor="atividade-aplicada"
              className="label-estrategias-manuais"
            >
              Descrição da Atividade Aplicada Final:
            </label>
            <textarea
              id="atividade-aplicada"
              value={atividadeAplicada}
              onChange={(e) => setAtividadeAplicada(e.target.value)}
              className="textarea-pei"
              rows={8}
              placeholder="As sugestões incluídas aparecerão aqui..."
            />
          </article>
        ) : (
          <div className="section-content">
            {metasDaAreaAtiva.length > 0 ? (
              metasDaAreaAtiva.map((meta) => {
                const manualKey = `${areaAtiva}-${meta.habilidade.replace(
                  /[^a-zA-Z0-9-]/g,
                  ""
                )}`;
                const entrada = entradaManual[manualKey] || {};

                // ADICIONA ESTRATÉGIAS DA IA À EXIBIÇÃO
                const strategiesFromManual = entrada.estrategiasManuais
                  ? entrada.estrategiasManuais
                      .split("\n")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0)
                  : [];
                const strategiesToDisplay = Array.from(
                  new Set([
                    ...(meta.estrategias || []),
                    (estrategiasIA[manualKey] || []).map((est) => est.titulo),
                    ...(entrada.estrategias || []),
                    ...strategiesFromManual,
                  ])
                ).filter(
                  (s) => s && typeof s === "string" && s.trim().length > 0
                );
                const estrategiasAtuaisSelecionadas = normalizarEstrategias(
                  entrada.estrategias || []
                );

                let objetivosDoPrazo = meta.objetivos?.[activeTab] || [];
                let objetivosSelecionadosDoEstado =
                  objetivosSelecionados[manualKey]?.[activeTab] || [];

                return (
                  <article key={meta.habilidade} className="meta-card">
                    <div className="meta-header">
                      <h3 className="meta-card-titulo">{meta.habilidade}</h3>
                      <button
                        onClick={() => handleRemoverMeta(meta.habilidade)}
                        className="botao-remover"
                        disabled={carregando}
                      >
                        Remover
                      </button>
                    </div>
                    <p>
                      <strong>Nível atual:</strong> {meta.nivel} —{" "}
                      {LEGENDA_NIVEIS[meta.nivel] || meta.nivel}
                    </p>
                    <p>
                      <strong>Nível almejado:</strong> {meta.nivelAlmejado} —{" "}
                      {LEGENDA_NIVEIS[meta.nivelAlmejado] || meta.nivelAlmejado}
                    </p>
                    <fieldset className="meta-fieldset">
                      <legend className="meta-legend">Objetivos:</legend>
                      {objetivosDoPrazo.length > 0 ? (
                        objetivosDoPrazo.map((objetivo, i) => (
                          <label
                            key={`obj-${objetivo}-${i}`}
                            className="checkbox-container"
                          >
                            <input
                              type="checkbox"
                              id={`obj-${manualKey}-${activeTab}-${i}`}
                              checked={objetivosSelecionadosDoEstado.includes(
                                objetivo
                              )}
                              disabled={carregando}
                              onChange={(e) =>
                                handleObjetivoChange(
                                  manualKey,
                                  activeTab,
                                  objetivo,
                                  e.target.checked
                                )
                              }
                              className="checkbox-input"
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-label">{objetivo}</span>
                          </label>
                        ))
                      ) : (
                        <p className="info-text">
                          Nenhum objetivo para este prazo.
                        </p>
                      )}
                    </fieldset>

                    <fieldset className="meta-fieldset">
                      <legend className="meta-legend">Estratégias:</legend>
                      {strategiesToDisplay.length > 0 ? (
                        strategiesToDisplay.map((estrategia, i) => (
                          <label
                            key={`${estrategia}-${i}`}
                            className="checkbox-container"
                          >
                            <input
                              type="checkbox"
                              id={`estrategia-${meta.habilidade}-${i}`}
                              checked={estrategiasAtuaisSelecionadas.includes(
                                estrategia
                              )}
                              disabled={carregando}
                              onChange={(e) =>
                                handleCheckboxChange(
                                  manualKey,
                                  estrategia,
                                  e.target.checked
                                )
                              }
                              className="checkbox-input"
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-label">{estrategia}</span>
                          </label>
                        ))
                      ) : (
                        <p className="info-text">
                          Nenhuma estratégia sugerida disponível para seleção
                          nesta meta.
                        </p>
                      )}

                      {/* Botão para gerar estratégias com IA */}
                      <div className="ia-sugestao-container">
                        <button
                          className="botao-ia"
                          onClick={() =>
                            handleGerarEstrategiasIA(meta, areaAtiva, manualKey)
                          }
                          disabled={carregandoIA === manualKey}
                        >
                          {carregandoIA === manualKey
                            ? "Gerando..."
                            : "Sugerir Estratégias com IA 💡"}
                        </button>
                      </div>

                      <label
                        htmlFor={`estrategias-manuais-${meta.habilidade}`}
                        className="label-estrategias-manuais"
                      >
                        Adicionar estratégias personalizadas (uma por linha):
                      </label>
                      <textarea
                        id={`estrategias-manuais-${meta.habilidade}`}
                        value={entrada.estrategiasManuais || ""}
                        disabled={carregando}
                        onChange={(e) =>
                          setEntradaManual((prev) => ({
                            ...prev,
                            [manualKey]: {
                              ...prev[manualKey],
                              estrategiasManuais: e.target.value,
                            },
                          }))
                        }
                        className="textarea-pei"
                        rows={3}
                        placeholder="Ex: Utilizar reforçador visual a cada 5 segundos de atenção."
                      />
                    </fieldset>
                  </article>
                );
              })
            ) : (
              <p className="info-text">Nenhuma meta de PEI para esta área.</p>
            )}
          </div>
        )}

        <button
          className="botao-salvar"
          onClick={handleSalvar}
          disabled={carregando || !pei}
        >
          {carregando ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}

export default EditarPeiIndividual;
