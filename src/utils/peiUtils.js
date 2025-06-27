// src/utils/peiUtils.js

import { NIVEIS_PROGRESSAO } from "./constants";
import estruturaPEI from "../data/estruturaPEI2"; // Certifique-se de que o caminho está correto

// Mapa auxiliar interno para acesso rápido à estrutura do PEI
// Este mapa será usado para buscar objetivos e estratégias originais
const estruturaPEIMap = (() => {
  const map = {};
  console.log("[PEI-UTIL-DEBUG] Início da construção de estruturaPEIMap.");
  // Verifica se estruturaPEI existe e tem chaves (áreas)
  if (!estruturaPEI || Object.keys(estruturaPEI).length === 0) {
    console.warn(
      "[PEI-UTIL-WARN] estruturaPEI está vazia ou não definida. Não há dados para mapear."
    );
    return map; // Retorna mapa vazio se estruturaPEI não tiver dados
  }

  Object.keys(estruturaPEI).forEach((areaPrincipalName) => {
    console.log(
      `[PEI-UTIL-DEBUG] Processando área principal: "${areaPrincipalName}"`
    );
    const areaPrincipalContent = estruturaPEI[areaPrincipalName];
    // console.log(`[PEI-UTIL-DEBUG] Conteúdo da área principal "${areaPrincipalName}":`, JSON.stringify(areaPrincipalContent, null, 2));

    // A estrutura do seu `estruturaPEI2.js` parece ter as habilidades aninhadas um nível mais profundo.
    // Ou seja, dentro de `estruturaPEI[areaPrincipalName]` há outro objeto que contém as habilidades.
    // Por exemplo: estruturaPEI.DesenvolvimentoGlobal.MotricidadeGrossa.habilidadeName
    // Iteramos sobre as chaves do `areaPrincipalContent` para encontrar essas "sub-áreas" ou "categorias".
    if (
      typeof areaPrincipalContent === "object" &&
      areaPrincipalContent !== null
    ) {
      Object.keys(areaPrincipalContent).forEach((subAreaName) => {
        // Mantido subAreaName, pois você o utiliza assim
        console.log(
          `[PEI-UTIL-DEBUG] Processando sub-área: "${subAreaName}" dentro de "${areaPrincipalName}"`
        );
        const subAreaContent = areaPrincipalContent[subAreaName]; // Corrigido para usar subAreaContent
        // console.log(`[PEI-UTIL-DEBUG] Conteúdo da sub-área "${subAreaName}":`, JSON.stringify(subAreaContent, null, 2));

        // Agora, 'subAreaContent' deve conter as habilidades diretamente como chaves
        if (typeof subAreaContent === "object" && subAreaContent !== null) {
          // Corrigido para usar subAreaContent
          Object.entries(subAreaContent).forEach(
            ([habilidadeName, niveisData]) => {
              console.log(
                `[PEI-UTIL-DEBUG] Processando habilidade: "${habilidadeName}" dentro de "${subAreaName}"`
              );

              if (habilidadeName) {
                // Garante que o nome da habilidade existe
                if (!map[habilidadeName]) {
                  map[habilidadeName] = {
                    objetivos: {}, // Para armazenar objetivos por nível
                    sugestoesEstrategiasByLevel: {}, // AGORA ARMAZENA ESTRATÉGIAS POR NÍVEL
                  };
                }

                // 'niveisData' deve ser o objeto que contém os níveis (NR, AF, etc.) e seus objetivos/estrategias
                if (niveisData && typeof niveisData === "object") {
                  Object.entries(niveisData).forEach(([nivel, data]) => {
                    // Mapeia objetivos por nível (ex: { "INICIANTE": "Reconhecer..." })
                    if (data.objetivo) {
                      map[habilidadeName].objetivos[nivel] = data.objetivo;
                    }
                    // As sugestões de estratégias AGORA SÃO ARMAZENADAS POR NÍVEL
                    if (data.estrategias && Array.isArray(data.estrategias)) {
                      map[habilidadeName].sugestoesEstrategiasByLevel[nivel] =
                        data.estrategias;
                    }
                  });
                  console.log(
                    `[PEI-UTIL-DEBUG] Objetivos para '${habilidadeName}' adicionados:`,
                    JSON.stringify(map[habilidadeName].objetivos)
                  );
                  console.log(
                    `[PEI-UTIL-DEBUG] Sugestões de estratégias por nível para '${habilidadeName}' adicionadas:`,
                    JSON.stringify(
                      map[habilidadeName].sugestoesEstrategiasByLevel
                    )
                  );
                } else {
                  console.warn(
                    `[PEI-UTIL-WARN] 'niveisData' para habilidade "${habilidadeName}" NÃO é um objeto válido ou está ausente. Conteúdo:`,
                    JSON.stringify(niveisData)
                  );
                }
              } else {
                console.warn(
                  `[PEI-UTIL-WARN] Habilidade encontrada sem 'habilidadeName' definido na sub-área "${subAreaName}":`,
                  // Corrigido para logar niveisData, que é o objeto da habilidade
                  JSON.stringify(niveisData, null, 2)
                );
              }
            }
          );
        } else {
          console.warn(
            `[PEI-UTIL-WARN] Sub-área "${subAreaName}" não contém habilidades válidas ou está vazia. Conteúdo:`,
            JSON.stringify(subAreaContent, null, 2)
          );
        }
      });
    } else {
      console.warn(
        `[PEI-UTIL-WARN] Conteúdo da área principal "${areaPrincipalName}" não é um objeto válido ou está vazia. Conteúdo:`,
        JSON.stringify(areaPrincipalContent, null, 2)
      );
    }
  });
  console.log("[PEI-UTIL-DEBUG] Fim da construção de estruturaPEIMap.");
  console.log(
    "[PEI-UTIL-DEBUG] estruturaPEIMap final:",
    Object.keys(map).length,
    "habilidades mapeadas. Exemplo (primeira):",
    Object.keys(map).length > 0
      ? JSON.stringify(map[Object.keys(map)[0]], null, 2)
      : "N/A"
  );
  return map;
})();

/**
 * Cria a estrutura inicial do PEI para um novo documento, baseada na avaliação do aluno.
 * Popula 'sugestoesEstrategiasSistema' com TODAS as sugestões do sistema para aquele nível.
 * 'estrategias' (campo no PEI salvo) começa vazio.
 *
 * @param {object} avaliacao Objeto de avaliação inicial do aluno (ex: { respostas: { ... } }).
 * @returns {object} Objeto com 'pei' montado e um objeto vazio para 'entradaManual' (para consistência).
 */
export function montarPeiBase(avaliacao) {
  console.log("[PEI-UTIL-DEBUG] Iniciando montarPeiBase (criar novo PEI)...");
  console.log(
    "[PEI-UTIL-DEBUG] Avaliação recebida para base:",
    JSON.stringify(avaliacao, null, 2)
  );

  const novoPei = {};

  if (!avaliacao || !avaliacao.respostas) {
    console.warn(
      "[PEI-UTIL-WARN] Avaliação ou respostas ausentes para montarPeiBase. Retornando PEI vazio."
    );
    return { pei: {}, entradaManual: {} };
  }

  Object.entries(avaliacao.respostas).forEach(
    ([area, habilidadesAvaliacao]) => {
      console.log(
        `[PEI-UTIL-DEBUG-base] Processing area from avaliacao: "${area}"`
      );
      if (
        typeof habilidadesAvaliacao !== "object" ||
        habilidadesAvaliacao === null
      ) {
        console.warn(
          `[PEI-UTIL-WARN] Habilidades da área "${area}" na avaliação não são um objeto válido. Pulando.`
        );
        return;
      }

      Object.entries(habilidadesAvaliacao).forEach(
        ([habilidade, nivelAtual]) => {
          console.log(
            `[PEI-UTIL-DEBUG-base] Processing habilidade from avaliacao: "${habilidade}", nivelAtual: "${nivelAtual}"`
          );
          if (nivelAtual === "NA") {
            console.log(
              `[PEI-UTIL-DEBUG-base] Habilidade "${habilidade}" é NA. Ignorando.`
            );
            return; // Ignora habilidades Não Aplicáveis
          }

          const currentIndex = NIVEIS_PROGRESSAO.indexOf(nivelAtual);
          let nivelAlmejado = nivelAtual; // Default para 'I' ou se não houver progressão
          let sugestaoObjetivo = null;
          let sugestoesEstrategias = []; // ESTE SERÁ O ARRAY DE ESTRATÉGIAS ESPECÍFICAS PARA O NÍVEL ALMEJADO

          const habilidadeDataInMap = estruturaPEIMap[habilidade];
          console.log(
            `[PEI-UTIL-DEBUG-base] habilidadeDataInMap for '${habilidade}':`,
            JSON.stringify(habilidadeDataInMap, null, 2)
          );

          if (!habilidadeDataInMap) {
            console.warn(
              `[PEI-UTIL-WARN] Habilidade '${habilidade}' não encontrada no estruturaPEIMap. Pulando.`
            );
            return;
          }

          if (nivelAtual === "I") {
            nivelAlmejado = nivelAtual;
            sugestaoObjetivo = habilidadeDataInMap.objetivos[nivelAlmejado];
            // PEGA AS ESTRATÉGIAS ESPECÍFICAS PARA O NÍVEL 'I'
            sugestoesEstrategias =
              habilidadeDataInMap.sugestoesEstrategiasByLevel[nivelAlmejado] ||
              [];
          } else if (
            currentIndex !== -1 &&
            currentIndex < NIVEIS_PROGRESSAO.length - 1
          ) {
            nivelAlmejado = NIVEIS_PROGRESSAO[currentIndex + 1];
            sugestaoObjetivo = habilidadeDataInMap.objetivos[nivelAlmejado];
            // PEGA AS ESTRATÉGIAS ESPECÍFICAS PARA O PRÓXIMO NÍVEL (ALMEJADO)
            sugestoesEstrategias =
              habilidadeDataInMap.sugestoesEstrategiasByLevel[nivelAlmejado] ||
              [];
          } else {
            console.warn(
              `[PEI-UTIL-WARN] Nível avaliado '${nivelAtual}' para habilidade '${habilidade}' (Área '${area}') não permite progressão ou não é 'I'. Meta não gerada.`
            );
            return;
          }

          console.log(
            `[PEI-UTIL-DEBUG-base] nivelAlmejado calculado: ${nivelAlmejado}`
          );
          console.log(
            `[PEI-UTIL-DEBUG-base] sugestaoObjetivo encontrado: "${sugestaoObjetivo}"`
          );
          console.log(
            `[PEI-UTIL-DEBUG-base] sugestoesEstrategias (específicas para o nível almejado) length: ${sugestoesEstrategias.length}`
          );

          if (
            !sugestaoObjetivo ||
            sugestoesEstrategias.length === 0 // Para um PEI ser útil, deve ter objetivo e pelo menos alguma sugestão de estratégia.
          ) {
            console.warn(
              `[PEI-UTIL-WARN] Nenhuma sugestão COMPLETA (objetivo ou estratégias) encontrada em estruturaPEI para: '${habilidade}' no nível almejado: '${nivelAlmejado}'. Meta IGNORADA.`
            );
            return;
          }

          if (!novoPei[area]) novoPei[area] = [];
          novoPei[area].push({
            area,
            habilidade,
            nivel: nivelAtual,
            nivelAlmejado: nivelAlmejado,
            objetivo: sugestaoObjetivo, // Objetivo inicial da referência
            // Na primeira criação, este campo leva as sugestões ESPECÍFICAS DO NÍVEL ALMEJADO
            // para que a Cloud Function possa persistí-las como 'sugestoesEstrategiasSistemaOriginal'
            sugestoesEstrategiasSistema: sugestoesEstrategias,
            // 'estrategiasConsumidas' será inicializado pela Cloud Function
            // 'estrategias' no documento PEI será a união de consumidas e manuais na CF
          });
          console.log(
            `[PEI-UTIL-DEBUG-base] Added meta for ${habilidade} to novoPei.`
          );
        }
      );
    }
  );

  console.log(
    "[PEI-UTIL-DEBUG] montarPeiBase concluído. PEI gerado:",
    JSON.stringify(novoPei, null, 2)
  );
  return { pei: novoPei, entradaManual: {} }; // Sempre retorna um objeto de entradaManual vazio para consistência
}

/**
 * Monta o estado do formulário a partir de um PEI Mestre salvo e da contribuição individual do professor.
 * Calcula as estratégias disponíveis (do mestre) e pré-seleciona as estratégias do professor (da contribuição individual).
 *
 * @param {object} peiMestreData Dados do PEI Mestre existente no Firestore.
 * @param {object|null} contribuicaoProfessorData Dados da contribuição específica do professor para este PEI.
 * @param {object} usuarioLogado Objeto do usuário logado (contém perfil/cargo).
 * @returns {object} Objeto com pei montado, atividadeAplicada e entradaManual.
 */
// src/utils/peiUtils.js

// ... (código existente até a função montarContribuicaoExistente) ...

export function montarContribuicaoExistente(
  peiMestreData,
  contribuicaoProfessorData,
  usuarioLogado
) {
  console.log(
    "[PEI-UTIL-DEBUG] Iniciando montarContribuicaoExistente (editar PEI existente)..."
  );
  console.log(
    "[PEI-UTIL-DEBUG] Dados do PEI Mestre recebidos:",
    JSON.stringify(peiMestreData, null, 2)
  );
  console.log(
    "[PEI-UTIL-DEBUG] Dados da Contribuição do Professor recebidos:",
    JSON.stringify(contribuicaoProfessorData, null, 2)
  );
  console.log(
    "[PEI-UTIL-DEBUG] Usuário logado para permissão:",
    usuarioLogado?.perfil,
    usuarioLogado?.cargo
  );

  const peiMontado = {};
  const entradaManualMontada = {};

  const atividadeAplicadaExistente =
    contribuicaoProfessorData?.atividadeAplicadaPorProfessor || "";

  const resumoGlobalPEI = peiMestreData.resumoGlobalPEI || [];
  console.log(
    "[PEI-UTIL-DEBUG-exist] resumoGlobalPEI from DB (Mestre):",
    JSON.stringify(resumoGlobalPEI, null, 2)
  );

  // --- REVISÃO CRÍTICA AQUI ---
  // Populamos o 'estrategiasDesteProfessor' com o que REALMENTE este professor salvou na sua contribuição.
  const estrategiasDesteProfessor = {};
  if (
    contribuicaoProfessorData &&
    Array.isArray(
      contribuicaoProfessorData.estrategiasSelecionadasPeloProfessor
    )
  ) {
    contribuicaoProfessorData.estrategiasSelecionadasPeloProfessor.forEach(
      (metaContrib) => {
        const chave = `${metaContrib.area}-${metaContrib.habilidade.replace(/[^a-zA-Z0-9-]/g, "")}`;
        // Separamos as estratégias em sugeridas e manuais para repopular o `entradaManual`
        const originalSuggestionsForThisMeta = new Set(
          // Tenta obter as sugestões originais do sistema para esta meta no PEI Mestre
          // para poder diferenciar o que era sugestão do que era manual
          resumoGlobalPEI.find(
            (m) =>
              m.area === metaContrib.area &&
              m.habilidade === metaContrib.habilidade
          )?.sugestoesEstrategiasSistemaOriginal || []
        );

        const sugestoesPreSelecionadas = [];
        const manuaisAnteriores = [];

        (metaContrib.estrategias || []).forEach((strat) => {
          if (originalSuggestionsForThisMeta.has(strat)) {
            sugestoesPreSelecionadas.push(strat);
          } else {
            manuaisAnteriores.push(strat);
          }
        });

        // Adiciona ao mapa com as separações
        estrategiasDesteProfessor[chave] = {
          sugeridas: sugestoesPreSelecionadas,
          manuais: manuaisAnteriores,
        };
      }
    );
  }
  console.log(
    "[PEI-UTIL-DEBUG-exist] Estratégias pré-selecionadas deste professor (AGORA DETALHADO):",
    JSON.stringify(estrategiasDesteProfessor, null, 2)
  );

  if (resumoGlobalPEI.length === 0 && !atividadeAplicadaExistente) {
    console.warn(
      "[PEI-UTIL-WARN] PEI Mestre existente sem metas e sem atividade aplicada. Retornando estruturas vazias."
    );
    return { pei: {}, atividadeAplicada: "", entradaManual: {} };
  }

  resumoGlobalPEI.forEach((metaDoMestre) => {
    // AQUI ESTÁ SEU FILTRO PARA OBJETIVOS SEM ESTRATÉGIAS CONSUMIDAS (ISSO ESTÁ CORRETO)
    if (
      !metaDoMestre.estrategiasConsumidas ||
      metaDoMestre.estrategiasConsumidas.length === 0
    ) {
      console.log(
        `[PEI-UTIL-DEBUG-exist] Objetivo para "${metaDoMestre.habilidade}" não tem estratégias consumidas. Ignorando exibição.`
      );
      return; // Pula este objetivo, ele não será adicionado ao peiMontado
    }

    if (!peiMontado[metaDoMestre.area]) peiMontado[metaDoMestre.area] = [];

    const originalSuggestions = new Set(
      metaDoMestre.sugestoesEstrategiasSistemaOriginal || []
    );
    const consumedStrategiesGlobal = new Set(
      metaDoMestre.estrategiasConsumidas || []
    );

    const strategiesToShowAsCheckboxes = Array.from(originalSuggestions).filter(
      (s) => !consumedStrategiesGlobal.has(s)
    );

    peiMontado[metaDoMestre.area].push({
      area: metaDoMestre.area,
      habilidade: metaDoMestre.habilidade,
      nivel: metaDoMestre.nivel,
      nivelAlmejado: metaDoMestre.nivelAlmejado,
      objetivo: metaDoMestre.objetivo,
      sugestoesEstrategiasSistema: strategiesToShowAsCheckboxes,
      sugestoesEstrategiasSistemaOriginal: Array.from(originalSuggestions),
      estrategiasConsumidas: Array.from(consumedStrategiesGlobal),
    });

    // --- PONTO CRÍTICO PARA POPULAR entradaManualMontada ---
    const chaveEntradaManual = `${metaDoMestre.area}-${metaDoMestre.habilidade.replace(/[^a-zA-Z0-9-]/g, "")}`;
    const myPreviousSelections = estrategiasDesteProfessor[chaveEntradaManual];

    entradaManualMontada[chaveEntradaManual] = {
      // Popula com as estratégias SUGERIDAS que ESTE PROFESSOR selecionou antes.
      // Apenas as que AINDA estão visíveis nas checkboxes.
      estrategias: Array.isArray(myPreviousSelections?.sugeridas)
        ? myPreviousSelections.sugeridas.filter((s) =>
            strategiesToShowAsCheckboxes.includes(s)
          )
        : [],
      // Popula a textarea de manuais com as que este professor digitou.
      estrategiasManuais: Array.isArray(myPreviousSelections?.manuais)
        ? myPreviousSelections.manuais.join("\n")
        : "",
    };
  });

  console.log(
    "[PEI-UTIL-DEBUG] montarContribuicaoExistente concluído. PEI montado:",
    JSON.stringify(peiMontado, null, 2)
  );
  console.log(
    "[PEI-UTIL-DEBUG] entradaManual final:",
    JSON.stringify(entradaManualMontada, null, 2)
  );

  return {
    pei: peiMontado,
    atividadeAplicada: atividadeAplicadaExistente,
    entradaManual: entradaManualMontada,
  };
}
