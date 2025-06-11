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
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import { useNavigate } from "react-router-dom";

// Imports dos seus dados
import estruturaPEI from "../data/estruturaPEI2";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";

// !!! IMPORTAR O NOVO ARQUIVO CSS AQUI !!!
import "../styles/CriarPEIComponent.css"; // AJUSTE O CAMINHO SE NECESSÁRIO

// NIVEIS_PROGRESSAO define a ordem exata de progressão dos níveis de apoio.
const NIVEIS_PROGRESSAO = ["NR", "AF", "AG", "AV", "AVi", "I"];

// A legenda completa dos níveis para exibição na interface.
const LEGENDA_NIVEIS = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
  NA: "Não aplicável",
};

const estruturaPEIMap = (() => {
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
          } else {
            console.warn(
              `[PEI WARN] 'habilidadesBySubarea' para subárea "${subareaName}" NÃO é um objeto válido em "${areaName}". Habilidades não serão mapeadas.`
            );
          }
        }
      );
    } else {
      console.warn(
        `[PEI WARN] 'subareasByArea' para área "${areaName}" NÃO é um objeto válido. Subáreas não serão mapeadas.`
      );
    }
  });
  return map;
})();

export default function CriarPEI() {
  const [alunos, setAlunos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [areaAtiva, setAreaAtiva] = useState("");
  const [pei, setPei] = useState({});
  const [entradaManual, setEntradaManual] = useState({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState(null);
  const [atividadeAplicada, setAtividadeAplicada] = useState("");

  const navigate = useNavigate();

  const todasAsAreas = useMemo(() => Object.keys(avaliacaoInicial), []);

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

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const [alunosSnap, avaliacoesSnap, peisSnap] = await Promise.all([
        getDocs(collection(db, "alunos")),
        getDocs(collection(db, "avaliacoesIniciais")),
        getDocs(collection(db, "peis")),
      ]);

      const todosAlunos = alunosSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const todasAvaliacoes = avaliacoesSnap.docs.map((doc) => doc.data());
      const peisCriados = peisSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const usuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
      const { cargo, perfil, turmas } = usuario;
      const turmasVinculadas = turmas ? Object.keys(turmas) : [];

      const podeVerTodos =
        cargo === "PROFESSOR REGENTE" ||
        cargo === "PROFESSOR DE SUPORTE" ||
        perfil === "gestao" ||
        perfil === "aee" ||
        perfil === "seme" ||
        perfil === "desenvolvedor";

      let alunosFiltrados = [];

      if (podeVerTodos) {
        alunosFiltrados = todosAlunos;
      } else {
        alunosFiltrados = todosAlunos.filter((aluno) => {
          const temPEI = peisCriados.some(
            (peiDoc) =>
              peiDoc.alunoId === aluno.id || peiDoc.aluno === aluno.nome
          );
          const pertenceATurma = turmasVinculadas.includes(aluno.turma);
          return temPEI && pertenceATurma;
        });
      }

      setAlunos(alunosFiltrados);
      setAvaliacoes(todasAvaliacoes);
    } catch (err) {
      console.error("Erro ao carregar dados do Firebase:", err);
      exibirMensagem(
        "erro",
        "Falha ao carregar dados. Tente recarregar a página."
      );
    } finally {
      setCarregando(false);
    }
  }, [exibirMensagem]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const verificarPermissaoCriacaoPEI = useCallback(
    (alunoEtapa, usuarioCargo, usuarioPerfil) => {
      let permitido = false;
      if (alunoEtapa === "educacaoInfantil" || alunoEtapa === "anosIniciais") {
        permitido =
          usuarioCargo === "PROFESSOR REGENTE" ||
          usuarioCargo === "PROFESSOR DE SUPORTE";
      } else if (alunoEtapa === "anosFinais") {
        permitido =
          usuarioCargo === "PROFESSOR DE SUPORTE" || usuarioPerfil === "aee";
      }

      if (
        usuarioPerfil === "gestao" ||
        usuarioPerfil === "aee" ||
        usuarioPerfil === "seme" ||
        usuarioPerfil === "desenvolvedor"
      ) {
        permitido = true;
      }
      return permitido;
    },
    []
  );

  const montarPeiInicial = useCallback(
    (avaliacao) => {
      const novoPei = {};
      console.log("--- DEBUG: Iniciando montarPeiInicial ---");
      console.log(
        "Avaliação de entrada para montarPeiInicial (respostas):",
        avaliacao.respostas
      );

      Object.entries(avaliacao.respostas || {}).forEach(
        ([area, habilidadesAvaliacao]) => {
          console.log(` Processando Avaliação para Área: "${area}"`);
          if (
            typeof habilidadesAvaliacao !== "object" ||
            habilidadesAvaliacao === null
          ) {
            console.warn(
              ` AVISO: Habilidades da área "${area}" na avaliação não são um objeto válido. Pulando.`
            );
            return;
          }
          Object.entries(habilidadesAvaliacao).forEach(
            ([habilidade, nivelAtual]) => {
              console.log(
                ` Habilidade da Avaliação: "${habilidade}", Nível Avaliado: "${nivelAtual}"`
              );

              if (nivelAtual === "NA") {
                console.log(
                  ` -> Habilidade "${habilidade}" ignorada (NA) no PEI.`
                );
                return;
              }

              const currentIndex = NIVEIS_PROGRESSAO.indexOf(nivelAtual);
              let nivelAlmejado = nivelAtual;
              let sugestaoObjetivoEstrategias = null;

              if (nivelAtual === "I") {
                nivelAlmejado = nivelAtual;
                sugestaoObjetivoEstrategias =
                  estruturaPEIMap[habilidade]?.[nivelAlmejado];
              } else if (
                currentIndex !== -1 &&
                currentIndex < NIVEIS_PROGRESSAO.length - 1
              ) {
                nivelAlmejado = NIVEIS_PROGRESSAO[currentIndex + 1];
                sugestaoObjetivoEstrategias =
                  estruturaPEIMap[habilidade]?.[nivelAlmejado];
              } else {
                console.warn(
                  ` -> AVISO: Nível avaliado '${nivelAtual}' para habilidade '${habilidade}' (Área '${area}') não encontrado na progressão ou é o último (e não 'I'). Não será gerada meta de PEI.`
                );
                return;
              }

              const debugSugestaoPorHabilidade = estruturaPEIMap[habilidade];
              console.log(
                ` DEBUG: estruturaPEIMap['${habilidade}'] ->`,
                debugSugestaoPorHabilidade
              );
              if (debugSugestaoPorHabilidade) {
                console.log(
                  ` DEBUG: estruturaPEIMap['${habilidade}']['${nivelAlmejado}'] ->`,
                  debugSugestaoPorHabilidade[nivelAlmejado]
                );
              } else {
                console.warn(
                  ` DEBUG: Habilidade "${habilidade}" (da avaliação) NÃO ENCONTRADA como chave principal em estruturaPEIMap.`
                );
              }

              if (
                !sugestaoObjetivoEstrategias ||
                !sugestaoObjetivoEstrategias.objetivo ||
                !sugestaoObjetivoEstrategias.estrategias
              ) {
                console.warn(
                  ` -> Nenhuma sugestão COMPLETA (objetivo ou estratégias) encontrada em estruturaPEI para a habilidade: '${habilidade}' no nível almejado: '${nivelAlmejado}'. Meta IGNORADA.`
                );
                return;
              }

              if (!novoPei[area]) novoPei[area] = [];
              novoPei[area].push({
                habilidade,
                nivel: nivelAtual,
                nivelAlmejado: nivelAlmejado,
                objetivo: sugestaoObjetivoEstrategias.objetivo,
                estrategias: sugestaoObjetivoEstrategias.estrategias,
                estrategiasSelecionadas: [],
              });
              console.log(
                ` -> Meta ADICIONADA para PEI: Área "${area}", Habilidade "${habilidade}" (Nível Avaliado: ${nivelAtual}, Nível Almejado: ${nivelAlmejado}).`
              );
            }
          );
        }
      );
      console.log(
        "--- DEBUG: PEI NOVO CONSTRUÍDO (Objeto 'pei' antes de ser setado):",
        novoPei
      );
      return novoPei;
    },
    [estruturaPEIMap, NIVEIS_PROGRESSAO]
  );

  const montarPeiExistente = useCallback((resumoPEIExistente) => {
    const peiMontado = {};
    console.log("--- DEBUG: Iniciando montarPeiExistente ---");
    console.log("Resumo PEI Existente de entrada:", resumoPEIExistente);

    resumoPEIExistente.forEach((meta) => {
      console.log(
        ` Processando meta existente: Habilidade "${meta.habilidade}", Nível Avaliado: "${meta.nivel}", Nível Almejado: "${meta.nivelAlmejado}"`
      );

      if (!peiMontado[meta.area]) peiMontado[meta.area] = [];

      const bloco = estruturaPEIMap[meta.habilidade]?.[meta.nivelAlmejado];
      let estrategiasOriginais = [];
      if (Array.isArray(bloco?.estrategias)) {
        estrategiasOriginais = [...bloco.estrategias];
      } else if (typeof bloco?.estrategias === "string") {
        estrategiasOriginais = [bloco.estrategias];
      }

      if (!bloco) {
        console.warn(
          ` AVISO (montarPeiExistente): Bloco de sugestão para habilidade "${meta.habilidade}" e nível almejado "${meta.nivelAlmejado}" NÃO ENCONTRADO em estruturaPEIMap. Usando estratégias salvas.`
        );
      } else if (!bloco.estrategias) {
        console.warn(
          ` AVISO (montarPeiExistente): Bloco para habilidade "${meta.habilidade}" no nível almejado "${meta.nivelAlmejado}" NÃO TEM ESTRATÉGIAS definidas. Usando estratégias salvas.`
        );
      }

      const todasUsadasParaHabilidade = resumoPEIExistente
        .filter((m) => m.habilidade === meta.habilidade)
        .flatMap((m) => m.estrategias || []);

      const restantes = estrategiasOriginais.filter(
        (e) => !todasUsadasParaHabilidade.includes(e)
      );

      peiMontado[meta.area].push({
        habilidade: meta.habilidade,
        nivel: meta.nivel,
        nivelAlmejado: meta.nivelAlmejado || meta.nivel,
        objetivo: meta.objetivo,
        estrategias: restantes,
        estrategiasSelecionadas: meta.estrategias || [],
      });
      console.log(
        ` -> Meta ADICIONADA para PEI existente: Área "${meta.area}", Habilidade "${meta.habilidade}".`
      );
    });
    console.log(
      "--- DEBUG: PEI MONTADO A PARTIR DE EXISTENTE (Objeto 'pei' antes de setPei):",
      peiMontado
    );
    return peiMontado;
  }, []);

  const handleSelecionarAluno = useCallback(
    async (nome) => {
      if (!nome) {
        setAlunoSelecionado(null);
        setPei({});
        setAreaAtiva("");
        setEntradaManual({});
        setAtividadeAplicada("");
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
      setErro(null);
      setMensagemSucesso(null);

      const usuarioLogado =
        JSON.parse(localStorage.getItem("usuarioLogado")) || {};
      const etapa = aluno.etapa;
      const cargo = usuarioLogado.cargo;
      const perfil = usuarioLogado.perfil;

      setCarregando(true); // Move para o início para englobar toda a lógica assíncrona

      try {
        const q = query(
          collection(db, "peis"),
          where("alunoId", "==", aluno.id)
        );
        const peisSnap = await getDocs(q);

        let peiExistente = null;
        if (!peisSnap.empty) {
          peiExistente = peisSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort(
              (a, b) =>
                new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
            )[0];
        }

        if (peiExistente) {
          const peiMontado = montarPeiExistente(peiExistente.resumoPEI || []);
          setPei(peiMontado);
          setAreaAtiva(Object.keys(peiMontado)[0] || todasAsAreas[0] || "");
          setAtividadeAplicada(peiExistente.atividadeAplicada || "");
          setEntradaManual({}); // Limpa entrada manual para um PEI existente
          exibirMensagem("sucesso", "PEI existente carregado para edição.");
          return; // Sai da função após carregar o PEI existente
        }
      } catch (erroBusca) {
        console.error("Erro ao buscar PEI existente:", erroBusca);
        exibirMensagem(
          "erro",
          "Erro ao carregar PEI existente. Tente novamente."
        );
        // A lógica de criação de novo PEI será executada abaixo se o erro não for crítico.
      } finally {
        setCarregando(false); // Garante que o carregamento seja desativado ao final da tentativa de busca
      }

      // Se o PEI existente não foi encontrado OU ocorreu um erro na busca do PEI existente,
      // a lógica continua aqui para verificar se pode criar um novo PEI.

      if (!verificarPermissaoCriacaoPEI(etapa, cargo, perfil)) {
        exibirMensagem(
          "erro",
          "Você não tem permissão para iniciar o PEI deste aluno."
        );
        setAlunoSelecionado(null);
        return;
      }

      const avaliacao = avaliacoes.find(
        (a) => a.aluno.trim().toLowerCase() === nome.trim().toLowerCase()
      );

      if (!avaliacao) {
        exibirMensagem("erro", "Este aluno não possui avaliação inicial.");
        setAlunoSelecionado(null);
        return;
      }

      const novoPei = montarPeiInicial(avaliacao);
      setPei(novoPei);
      setAreaAtiva(
        Object.keys(novoPei).length > 0
          ? Object.keys(novoPei)[0]
          : todasAsAreas[0] || ""
      );
      setAtividadeAplicada("");
      setEntradaManual({}); // Limpa entrada manual para um novo PEI
      exibirMensagem(
        "sucesso",
        "Novo PEI iniciado com base na avaliação inicial."
      );
    },
    [
      alunos,
      avaliacoes,
      exibirMensagem,
      verificarPermissaoCriacaoPEI,
      montarPeiInicial,
      montarPeiExistente,
      todasAsAreas,
    ]
  );

  const handleSalvarPEI = async () => {
    if (!alunoSelecionado) {
      exibirMensagem("erro", "Selecione um aluno antes de salvar.");
      return;
    }

    const temDadosPei = Object.keys(pei).some((area) => pei[area].length > 0);
    const temAtividadeAplicada = atividadeAplicada.trim().length > 0;

    if (!temDadosPei && !temAtividadeAplicada) {
      exibirMensagem(
        "erro",
        "Nenhum dado do PEI ou atividade aplicada para salvar."
      );
      return;
    }

    try {
      setCarregando(true);
      const usuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};

      const peiFinal = Object.entries(pei).flatMap(([area, metas]) =>
        metas
          .map((meta) => {
            // CORRIGIDO: Removidas tags de markdown da chave
            const chave = `${area}-${meta.habilidade}`;
            const manual = entradaManual[chave] || {};
            const estrategiasManuais = manual.estrategiasManuais
              ? manual.estrategiasManuais.split("\n").filter((e) => e.trim())
              : [];

            const estrategiasSelecionadas = Array.isArray(manual.estrategias)
              ? manual.estrategias
              : Array.isArray(meta.estrategiasSelecionadas)
              ? meta.estrategiasSelecionadas
              : [];

            const todasEstrategias = [
              ...new Set([...estrategiasSelecionadas, ...estrategiasManuais]),
            ].filter((e) => typeof e === "string" && e.trim() !== "");

            if (todasEstrategias.length === 0) return null;

            return {
              area,
              habilidade: meta.habilidade,
              nivel: meta.nivel,
              nivelAlmejado: meta.nivelAlmejado,
              objetivo: meta.objetivo,
              estrategias: todasEstrategias,
            };
          })
          .filter(Boolean)
      );

      await addDoc(collection(db, "peis"), {
        alunoId: alunoSelecionado.id,
        aluno: alunoSelecionado.nome,
        turma: alunoSelecionado.turma,
        resumoPEI: peiFinal,
        atividadeAplicada: atividadeAplicada,
        criadoEm: new Date().toISOString(),
        nomeCriador: usuario.nome || "Desconhecido",
        cargoCriador: usuario.cargo || "Desconhecido",
        criadorId: usuario.email || "",
        criadorPerfil: usuario.perfil || "",
      });

      exibirMensagem("sucesso", "PEI salvo com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar PEI:", err);
      exibirMensagem("erro", `Erro ao salvar PEI: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  };

  // === OBJETOS DE ESTILO CSS INLINE ===
  // Definindo estilos diretamente aqui, SEM CLASSES, para maximizar a especificidade.
  // Estes estilos devem sobrescrever quaisquer outras regras CSS conflitantes.
  const estilos = {
    container: {
      background: "#1d3557",
      minHeight: "100vh",
      width: "100vw",
      padding: "30px",
      boxSizing: "border-box", // Garante que padding não adicione largura total
    },
    card: {
      background: "#fff",
      maxWidth: "1000px",
      margin: "0 auto",
      padding: "30px",
      borderRadius: "16px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    },
    titulo: {
      textAlign: "center",
      color: "#1d3557",
      marginBottom: "25px",
    },
    areaButton: {
      padding: "10px 18px",
      borderRadius: "20px",
      border: "none",
      margin: "4px",
      backgroundColor: "#f0f0f0",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    areaButtonAtiva: {
      backgroundColor: "#1d3557",
      color: "#fff",
      fontWeight: "bold",
    },
    metaCard: {
      background: "#f9f9f9",
      border: "1px solid #ddd",
      borderRadius: "12px",
      padding: "15px",
      marginBottom: "15px",
    },
    textarea: {
      width: "95%",
      minHeight: "80px",
      margin: "8px 0",
      padding: "8px",
      borderRadius: "6px",
      border: "1px solid #ccc",
      fontSize: "14px",
    },
    botaoSalvar: {
      backgroundColor: "#2a9d8f",
      color: "#fff",
      padding: "14px 24px",
      border: "none",
      borderRadius: "8px",
      fontSize: "16px",
      fontWeight: "bold",
      display: "block",
      margin: "30px auto 0",
      cursor: "pointer",
      transition: "background-color 0.3s",
    },
    mensagemErro: {
      color: "#e63946",
      margin: "15px 0",
      textAlign: "center",
      fontWeight: "bold",
      backgroundColor: "#ffe6e6",
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #e63946",
    },
    mensagemSucesso: {
      color: "#2a9d8f",
      margin: "15px 0",
      textAlign: "center",
      fontWeight: "bold",
      backgroundColor: "#e6fff2",
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #2a9d8f",
    },
    loading: {
      textAlign: "center",
      margin: "20px 0",
      color: "#1d3557",
    },
    // === ESTILOS CORRIGIDOS E REFORÇADOS PARA ALINHAR CHECKBOX E FRASE ===
    // Contêiner flexível para cada checkbox e seu label
    checkboxContainer: {
      display: "flex", // Torna o contêiner flexível para alinhar os itens
      alignItems: "flex-start", // Alinha o topo do checkbox com o topo da frase
      marginBottom: "8px", // Espaçamento entre as opções de estratégia
      flexWrap: "wrap", // Permite que os itens internos quebrem para a próxima linha
      width: "100%", // Garante que o container ocupe a largura total disponível
      boxSizing: "border-box", // Garante que padding/border sejam considerados na largura
    },
    // Estilos para o próprio input checkbox
    checkboxInput: {
      marginRight: "8px", // Espaçamento entre o checkbox e a frase
      marginTop: "4px", // Pequeno ajuste vertical para alinhar o checkbox
      flexShrink: 0, // Impede que o checkbox seja comprimido
      width: "auto", // Garante que o checkbox não tenha uma largura fixada errada
      height: "auto", // Garante que o checkbox não tenha uma altura fixada errada
      // Podemos adicionar um !important aqui se o checkbox ainda estiver com display:block ou width/height errados
      // display: 'inline-block !important',
      // verticalAlign: 'middle !important',
    },
    // Estilos para o texto da frase (label)
    checkboxLabel: {
      flex: "1 1 0%", // flex-grow:1, flex-shrink:1, flex-basis:0%. Crucial para preencher o espaço.
      wordWrap: "break-word", // Garante que palavras longas quebrem
      overflowWrap: "break-word", // Compatibilidade para quebra de palavras
      whiteSpace: "normal !important", // FORÇA A QUEBRA NORMAL DE LINHA, anulando qualquer 'nowrap'
      lineHeight: "1.4", // Melhora a legibilidade em múltiplas linhas
      fontSize: "14px", // Mantém o tamanho da fonte
      marginLeft: "0px !important", // Zera qualquer margin-left que possa vir de outro lugar
      maxWidth: "none !important", // Garante que não haja limite de largura forçado
      minWidth: "0 !important", // Permite que o label encolha, crucial para flex itens
      boxSizing: "border-box !important", // Inclui padding/border na largura total
    },
    // === FIM DOS ESTILOS DE ALINHAMENTO ===
  };

  return (
    <div style={estilos.container} aria-busy={carregando}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h1 style={estilos.titulo}>Criar PEI</h1>

        {/* Mensagens de feedback */}
        {erro && (
          <div style={estilos.mensagemErro} role="alert">
            {erro}
          </div>
        )}
        {mensagemSucesso && (
          <div style={estilos.mensagemSucesso} role="status">
            {mensagemSucesso}
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="selecionar-aluno"
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Selecione um aluno:
          </label>
          <select
            id="selecionar-aluno"
            value={alunoSelecionado?.nome || ""}
            onChange={(e) => handleSelecionarAluno(e.target.value)}
            disabled={carregando}
            style={{
              padding: "10px",
              width: "100%",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
            aria-label="Selecione um aluno para criar o PEI"
          >
            <option value="">
              {carregando ? "Carregando..." : "Selecione um aluno"}
            </option>
            {alunos.map((aluno) => (
              <option key={aluno.id} value={aluno.nome}>
                {aluno.nome} - {aluno.turma}
              </option>
            ))}
          </select>
        </div>

        {carregando && !alunoSelecionado && (
          <div style={estilos.loading}>Carregando dados...</div>
        )}

        {alunoSelecionado && (
          <>
            <div style={{ margin: "20px 0" }}>
              {/* Renderiza todas as áreas disponíveis para as abas */}
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

              {/* Botão extra para a nova aba */}
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
              <div style={{ marginTop: "20px" }}>
                <label
                  htmlFor="atividade-aplicada"
                  style={{
                    fontWeight: "bold",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Descreva a atividade aplicada com o aluno:
                </label>
                <textarea
                  id="atividade-aplicada"
                  value={atividadeAplicada}
                  onChange={(e) => setAtividadeAplicada(e.target.value)}
                  placeholder="Ex: Brincadeira simbólica usando fantoches para desenvolver comunicação e imaginação..."
                  style={estilos.textarea}
                />
              </div>
            )}

            {/* Renderiza as metas do PEI apenas para a área ativa */}
            {areaAtiva && areaAtiva !== "atividadeAplicada" && (
              <div style={{ marginTop: "20px" }}>
                {/* Verifica se há metas para a área selecionada */}
                {pei[areaAtiva]?.length > 0 ? (
                  pei[areaAtiva].map((meta, idx) => {
                    if (!meta || typeof meta !== "object" || !meta.habilidade)
                      return null;

                    // CORRIGIDO: Chave para entrada manual (removidas tags markdown)
                    const chaveEntradaManual = `${areaAtiva}-${meta.habilidade}`;
                    const dadosManuais =
                      entradaManual[chaveEntradaManual] || {};

                    return (
                      <article
                        key={`${meta.habilidade}-${idx}`} // Chave robusta para o React
                        style={estilos.metaCard}
                        aria-labelledby={`meta-${areaAtiva}-${idx}`}
                      >
                        <h3 id={`meta-${areaAtiva}-${idx}`}>
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
                          <p
                            style={{ fontWeight: "bold", marginBottom: "5px" }}
                          >
                            Objetivo sugerido (
                            {LEGENDA_NIVEIS[meta.nivelAlmejado]}):
                          </p>
                          <p
                            style={{
                              marginBottom: "10px",
                              fontStyle: "italic",
                              background: "#f1f1f1",
                              padding: "10px",
                              borderRadius: "6px",
                            }}
                          >
                            {meta.objetivo}
                          </p>
                        </div>

                        <fieldset>
                          <legend style={{ fontWeight: "bold" }}>
                            Estratégias:
                          </legend>

                          {(() => {
                            const estrategiasOriginais = Array.isArray(
                              meta.estrategias
                            )
                              ? meta.estrategias
                              : []; // Garante que é um array vazio se não houver

                            const selecionadas =
                              dadosManuais.estrategias ||
                              meta.estrategiasSelecionadas ||
                              [];

                            return estrategiasOriginais.map((estrategia, i) => (
                              <div key={i} style={estilos.checkboxContainer}>
                                <input
                                  type="checkbox"
                                  id={`estrategia-${areaAtiva}-${idx}-${i}`} // CORRIGIDO: Removidas tags de markdown
                                  checked={selecionadas.includes(estrategia)}
                                  onChange={(e) => {
                                    const atual = [...selecionadas];
                                    const atualizadas = e.target.checked
                                      ? [...atual, estrategia]
                                      : atual.filter((s) => s !== estrategia);

                                    setEntradaManual((prev) => ({
                                      ...prev,
                                      [chaveEntradaManual]: {
                                        ...prev[chaveEntradaManual],
                                        estrategias: atualizadas,
                                      },
                                    }));
                                  }}
                                  style={estilos.checkboxInput}
                                />
                                <label
                                  htmlFor={`estrategia-${areaAtiva}-${idx}-${i}`} // CORRIGIDO: Removidas tags de markdown
                                  style={estilos.checkboxLabel}
                                >
                                  {estrategia}
                                </label>
                              </div>
                            ));
                          })()}

                          <label
                            htmlFor={`estrategias-manuais-${areaAtiva}-${idx}`} // CORRIGIDO: Removidas tags de markdown
                            style={{
                              display: "block",
                              marginTop: "10px",
                              fontWeight: "bold", // <--- ADICIONE ESTA LINHA AQUI
                            }}
                          >
                            Estratégias personalizadas (uma por linha):
                          </label>
                          <textarea
                            id={`estrategias-manuais-${areaAtiva}-${idx}`} // CORRIGIDO: Removidas tags de markdown
                            value={dadosManuais.estrategiasManuais || ""}
                            onChange={(e) =>
                              setEntradaManual((prev) => ({
                                ...prev,
                                [chaveEntradaManual]: {
                                  ...prev[chaveEntradaManual],
                                  estrategiasManuais: e.target.value,
                                },
                              }))
                            }
                            style={estilos.textarea}
                            placeholder="Adicione novas estratégias aqui, uma por linha..."
                          />
                        </fieldset>
                      </article>
                    );
                  })
                ) : (
                  <p
                    style={{
                      textAlign: "center",
                      fontStyle: "italic",
                      color: "#666",
                    }}
                  >
                    Nenhuma meta de PEI sugerida para esta área com base na
                    avaliação inicial. Isso ocorre porque todas as habilidades
                    faram marcadas como 'Não Aplicável' (NA) ou 'Independente'
                    (I).
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleSalvarPEI}
              style={estilos.botaoSalvar}
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
