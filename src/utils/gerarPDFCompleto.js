import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  collection,
  query,
  where,
  getDocs,
  doc as firestoreDoc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

// --- Constantes e Estilos ---
const styles = {
  font: "times",
  fontSize: {
    small: 8,
    medium: 10,
    large: 12,
    title: 18, // Aumentado o tamanho do título para 18
  },
  colors: {
    black: [0, 0, 0],
    white: [255, 255, 255], // Cor branca para preenchimento de fundo
    grayLight: [200, 200, 200],
    red: [255, 0, 0],
    yellow: [255, 255, 0],
    blue: [0, 0, 255],
    magenta: [255, 0, 255],
    purple: [128, 0, 128],
    green: [0, 128, 0],
    // As cores para professores e criadores não serão usadas para colorir texto,
    // mas a definição de cores gerais pode ser útil em outros contextos.
    orange: [255, 165, 0],
    teal: [0, 128, 128],
    darkBlue: [0, 0, 128],
    maroon: [128, 0, 0],
    olive: [128, 128, 0],
    pink: [255, 192, 203],
    cyan: [0, 255, 255],
  },
};

// Cores por Nível - Estas serão usadas para o fillColor das células de nível
const coresPorNivel = {
  NR: styles.colors.red,
  AF: styles.colors.yellow,
  AG: styles.colors.purple,
  AV: styles.colors.grayLight, // Este é o cinza CLARO que pode estar confundindo com o padrão do autoTable
  AVi: styles.colors.green,
  I: styles.colors.magenta,
};

const legendaNiveis = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
};

// --- Mapeamento de Cores para Criadores (DESATIVADO PARA COLORIR TEXTO DE ESTRATÉGIAS) ---
const availableCreatorColors = [];
const creatorColorMap = new Map();
let currentColorIndex = 0;

function getCreatorColor(criadorInfoKey) {
  return styles.colors.black;
}
// --- FIM DA SEÇÃO DE CORES PARA CRIADORES ---

/**
 * Formata um objeto de data ou string para o formato DD/MM/AAAA.
 * @param {firebase.firestore.Timestamp|Date|string} data - A data a ser formatada.
 * @returns {string} Data formatada ou "-" se inválido.
 */
function formatarData(data) {
  if (!data) return "-";

  try {
    let dateObj;
    if (typeof data.toDate === "function") {
      dateObj = data.toDate();
    } else if (data instanceof Date) {
      dateObj = data;
    } else if (typeof data === "string") {
      dateObj = new Date(data);
    } else {
      return "-";
    }

    if (isNaN(dateObj.getTime())) return "-";

    const dia = dateObj.getUTCDate().toString().padStart(2, "0");
    const mes = (dateObj.getUTCMonth() + 1).toString().padStart(2, "0"); // Mês é 0-indexado
    const ano = dateObj.getUTCFullYear();

    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return "-";
  }
}

/**
 * Adiciona o rodapé padrão a uma página do PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {number} pageHeight - Altura da página do PDF.
 */
function addFooter(doc, pageHeight) {
  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.small);

  doc.text(
    "Prefeitura Municipal de Guabiruba / Secretaria de Educação de Guabiruba (SEME)",
    20,
    pageHeight - 20
  );
  doc.text(
    "Rua José Dirschnabel, 67 - Centro - Guabiruba/SC",
    20,
    pageHeight - 15
  );
  doc.text(
    "Telefone/WhatsApp: (47) 3308-3102 - www.guabiruba.sc.gov.br",
    20,
    pageHeight - 10
  );
}

/**
 * Garante que há espaço suficiente na página ou adiciona uma nova página.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {number} currentY - Posição Y atual no documento.
 * @param {number} requiredSpace - Espaço mínimo necessário para o próximo conteúdo.
 * @param {number} [footerHeight=25] - Altura aproximada do rodapé.
 * @returns {number} Nova posição Y.
 */
function ensurePageSpace(doc, currentY, requiredSpace, footerHeight = 25) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + requiredSpace > pageHeight - footerHeight) {
    doc.addPage();
    addFooter(doc, pageHeight);
    return 20; // Y inicial da nova página
  }
  return currentY;
}

/**
 * Busca os PEIs de um aluno no Firestore.
 * Prioriza 'pei_contribuicoes' e fallback para 'peis'.
 * @param {string} alunoId - ID do aluno.
 * @param {string} alunoNome - Nome do aluno (para fallback).
 * @returns {Promise<Array<Object>>} Lista de PEIs.
 */
async function fetchPeis(alunoId, alunoNome) {
  try {
    let peis = [];
    const newCollectionRef = collection(db, "pei_contribuicoes");
    const oldCollectionRef = collection(db, "peis");

    // Tentar buscar na nova coleção: pei_contribuicoes
    let qNew = query(
      newCollectionRef,
      where("alunoId", "==", alunoId),
      orderBy("dataCriacao", "desc")
    );
    let snapNew = await getDocs(qNew);

    if (!snapNew.empty) {
      console.log("[PDF_DEBUG] PEIs encontrados em 'pei_contribuicoes'.");
      peis = snapNew.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      console.log(
        "[PDF_DEBUG] Nenhum PEI encontrado em 'pei_contribuicoes', tentando 'peis' (coleção antiga)."
      );
      // Fallback para a coleção antiga: peis
      let qOld = query(
        oldCollectionRef,
        where("alunoId", "==", alunoId),
        orderBy("dataCriacao", "desc")
      );
      let snapOld = await getDocs(qOld);

      if (snapOld.empty) {
        // Segundo fallback para nome (caso alunoId não estivesse na coleção antiga)
        qOld = query(
          oldCollectionRef,
          where("aluno", "==", alunoNome),
          orderBy("dataCriacao", "desc")
        );
        snapOld = await getDocs(qOld);
      }

      if (!snapOld.empty) {
        console.log("[PDF_DEBUG] PEIs encontrados em 'peis' (coleção antiga).");
        peis = snapOld.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } else {
        console.log(
          "[PDF_DEBUG] Nenhum PEI encontrado em nenhuma das coleções."
        );
      }
    }
    return peis;
  } catch (err) {
    console.error("Erro ao buscar PEIs:", err);
    return [];
  }
}

/**
 * Adiciona o cabeçalho principal do documento, incluindo o título, logo e informações do aluno.
 * Replicando o layout do DOCX.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} aluno - Objeto do aluno.
 * @param {Object} avaliacao - Objeto da avaliação inicial.
 * @param {string} nomeEscola - Nome da escola.
 * @param {number} yStart - Posição Y inicial para este bloco de conteúdo.
 * @returns {number} Nova posição Y.
 */
async function addStudentAndHeaderInfo(
  doc,
  aluno,
  avaliacao,
  nomeEscola,
  yStart
) {
  let y = yStart; // Começa no Y passado (20mm do topo)

  const imgWidth = 128;
  const imgHeight = 25;
  const imgX = 10;
  const imgY = 10; // Posição Y da imagem (10mm da margem superior)

  // 1. Adiciona a imagem
  doc.addImage("/logo.jpg", "JPEG", imgX, imgY, imgWidth, imgHeight);
  y = imgY + imgHeight + 10; // Atualiza Y para o conteúdo abaixo da imagem

  // 2. Adiciona o TÍTULO PRINCIPAL "Plano Educacional Individualizado (PEI)"
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.title);
  doc.text(
    "Plano Educacional Individualizado (PEI)",
    doc.internal.pageSize.getWidth() / 2,
    y,
    { align: "center" }
  );
  y += 10; // Espaço após o título principal

  // 3. Adiciona a tabela de Orientações (AGORA COMO UMA autoTable DE 2 COLUNAS)
  y = ensurePageSpace(doc, y, 30); // Garante espaço para a tabela de orientações

  const orientationTitle = "Orientações para aplicação do PEI:";
  const orientationTextContent =
    "Todas as estratégias elencadas no PEI devem ser contextualizadas nas atividades propostas no plano diário.";

  autoTable(doc, {
    startY: y, // Começa a tabela no Y atual
    head: [], // Sem cabeçalho explícito para a tabela
    body: [
      [
        {
          content: orientationTitle,
          styles: {
            fontStyle: "bold", // Frase em negrito
            fontSize: styles.fontSize.medium,
            cellPadding: 2,
            valign: "top",
          },
        },
        {
          content: orientationTextContent,
          styles: {
            fontStyle: "normal",
            fontSize: styles.fontSize.medium,
            cellPadding: 2,
            valign: "top",
          },
        },
      ],
    ],
    styles: {
      font: styles.font,
      textColor: styles.colors.black,
      fillColor: styles.colors.white, // GARANTIR BRANCO NO ESTILO GERAL DA TABELA
      lineColor: styles.colors.black,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: styles.colors.white, // GARANTIR BRANCO NO ESTILO DO CABEÇALHO (se houvesse um)
    },
    columnStyles: {
      0: { cellWidth: 60, overflow: "linebreak" }, // Largura para o título "Orientações..."
      1: {
        cellWidth: doc.internal.pageSize.getWidth() - 60 - 40,
        overflow: "linebreak",
      }, // Largura restante para o conteúdo (página - col0 - margens)
    },
    margin: { left: 20, right: 20 }, // Margens fixas de 20mm
    didDrawPage: (data) => {
      // Rodapé é adicionado ao final do PDF, não a cada página desenhada aqui para evitar duplicidade.
    },
    didParseCell: (data) => {
      data.cell.styles.fillColor = styles.colors.white; // GARANTIR BRANCO EM CADA CÉLULA
    },
  });
  y = doc.lastAutoTable.finalY + 5; // Atualiza Y após a tabela de orientações

  // --- DADOS E CÁLCULOS PARA AS TABELAS DE INFORMAÇÕES DO ALUNO E INTERVENÇÃO ---
  const availablePageWidth = doc.internal.pageSize.getWidth() - 40; // Largura total da página menos margens de 20mm de cada lado

  const dataNascTexto = formatarData(aluno.nascimento);
  const dataAvaliacaoTexto = formatarData(avaliacao?.inicio);
  const dataProximaAvaliacaoTexto = formatarData(avaliacao?.proximaAvaliacao);

  // Calcula a idade do aluno de forma mais robusta
  let alunoIdade = "-";
  if (aluno.nascimento) {
    let birthDateObj;
    if (typeof aluno.nascimento.toDate === "function") {
      // Se for Timestamp
      birthDateObj = aluno.nascimento.toDate();
    } else if (aluno.nascimento instanceof Date) {
      // Se já for Date
      birthDateObj = aluno.nascimento;
    } else if (typeof aluno.nascimento === "string") {
      // Se for string
      birthDateObj = new Date(aluno.nascimento);
    }

    if (birthDateObj && !isNaN(birthDateObj.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birthDateObj.getFullYear();
      const m = today.getMonth() - birthDateObj.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
      }
      alunoIdade = age;
    }
  }

  // --- BUSCA OS PROFESSORES DA TURMA E ESCOLA ---
  let professoresNomes = "Não informado"; // Valor padrão para professores
  if (aluno.escolaId && aluno.turma) {
    try {
      const professoresQuery = query(
        collection(db, "usuarios"),
        where(`escolas.${aluno.escolaId}`, "==", true), // Vinculação à escola
        where("perfil", "in", ["professor", "aee"]) // Filtra por perfil
      );
      const professoresSnap = await getDocs(professoresQuery);

      const nomesEncontrados = [];
      professoresSnap.docs.forEach((doc) => {
        const userData = doc.data();
        if (userData.turmas && userData.turmas[aluno.turma]) {
          // Filtra localmente por turma (map)
          nomesEncontrados.push(userData.nome);
        } else if (
          Array.isArray(userData.turmas) &&
          userData.turmas.includes(aluno.turma)
        ) {
          // Fallback para array de turmas
          nomesEncontrados.push(userData.nome);
        }
      });

      if (nomesEncontrados.length > 0) {
        professoresNomes = nomesEncontrados.join(", ");
      } else {
        // Fallback se a consulta exata não retornar, tenta por IDs se existir no aluno
        if (Array.isArray(aluno.professores) && aluno.professores.length > 0) {
          const profDetailsPromises = aluno.professores.map(
            async (profRefId) => {
              // Assume que profRefId é um ID de documento na coleção 'usuarios'
              const profDoc = await getDoc(
                firestoreDoc(db, "usuarios", profRefId)
              );
              return profDoc.exists() ? profDoc.data().nome : null;
            }
          );
          const resolvedNames = (await Promise.all(profDetailsPromises)).filter(
            Boolean
          );
          if (resolvedNames.length > 0)
            professoresNomes = resolvedNames.join(", ");
        }
      }
    } catch (error) {
      console.error(
        "Erro ao buscar professores na função addStudentAndHeaderInfo:",
        error
      );
      professoresNomes = "Erro ao carregar professores";
    }
  }

  // --- FIM DOS DADOS E CÁLCULOS ---

  // 4. TABELA DE INFORMAÇÕES DO ALUNO (COM 3 LINHAS E COLUNAS MESCLADAS)
  y = ensurePageSpace(doc, y, 40); // Garante espaço para a tabela

  autoTable(doc, {
    startY: y,
    head: [], // Sem cabeçalho explícito
    body: [
      // Linha 1: Nome do Aluno (ocupa todas as 3 colunas)
      [{ content: `Aluno(a): ${aluno.nome || "-"}`, colSpan: 3 }],
      // Linha 2: Nome da Escola (ocupa todas as 3 colunas)
      [{ content: `Escola: ${nomeEscola || "-"}`, colSpan: 3 }],
      // Linha 3: D.N. | Idade | Turma (3 colunas iguais)
      [
        `Data de Nasc.: ${dataNascTexto}`,
        `Idade: ${alunoIdade} anos`,
        `Turma: ${aluno.turma || "-"}`,
      ],
    ],
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.large,
      textColor: styles.colors.black,
      fillColor: styles.colors.white, // GARANTIR BRANCO NO ESTILO GERAL DA TABELA
      lineColor: styles.colors.black,
      lineWidth: 0.1,
      cellPadding: 2,
      valign: "middle",
    },
    headStyles: {
      fillColor: styles.colors.white, // REMOVER O CINZA CLARO DOS CABEÇALHOS AQUI!
    },
    // Definir 3 colunas de largura igual para a tabela base.
    columnStyles: {
      0: { cellWidth: availablePageWidth / 3 }, // Primeira coluna (1/3)
      1: { cellWidth: availablePageWidth / 3 }, // Segunda coluna (1/3)
      2: { cellWidth: availablePageWidth / 3 }, // Terceira coluna (1/3)
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data) => {
      data.cell.styles.fillColor = styles.colors.white; // GARANTIR BRANCO EM CADA CÉLULA DO BODY
    },
  });
  y = doc.lastAutoTable.finalY + 5; // Espaço após a tabela de informações do aluno.

  // 5. TABELA DE DETALHES DA INTERVENÇÃO (Professor, Período, Próxima Avaliação)
  y = ensurePageSpace(doc, y, 40); // Garante espaço para a tabela de intervenção

  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      // Linha 1: Professor(a) - ocupa a largura total da tabela
      [{ content: `Professor(a): ${professoresNomes}`, colSpan: 2 }],
      // Linha 2: Período e Próxima Avaliação - dividem a largura
      [
        `Período de intervenção: ${
          avaliacao?.periodoIntervencao || "Médio prazo"
        }`,
        `Data prevista para a próxima avaliação: ${dataProximaAvaliacaoTexto}`,
      ],
    ],
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.large,
      textColor: styles.colors.black,
      fillColor: styles.colors.white,
      lineColor: styles.colors.black,
      lineWidth: 0.1,
      cellPadding: 2,
      valign: "middle",
    },
    headStyles: {
      fillColor: styles.colors.white,
    },
    // Definir 2 colunas para a tabela. A mesclagem no didParseCell cuida da primeira linha.
    columnStyles: {
      0: { cellWidth: availablePageWidth / 2 },
      1: { cellWidth: availablePageWidth / 2 },
    },
    didParseCell: (data) => {
      data.cell.styles.fillColor = styles.colors.white; // GARANTIR BRANCO EM CADA CÉLULA DO BODY
    },
    margin: { left: 20, right: 20 },
  });
  y = doc.lastAutoTable.finalY + 5; // Espaço após esta tabela

  // 6. NOVA TABELA SEPARADA PARA "Plano gerado a partir avaliação realizada em:"
  y = ensurePageSpace(doc, y, 15); // Garante espaço para a nova tabela

  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      [
        {
          content: `Plano gerado a partir avaliação realizada em: ${dataAvaliacaoTexto}`,
          styles: {
            halign: "center", // Centraliza o texto
          },
        },
      ],
    ],
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.large,
      textColor: styles.colors.black,
      fillColor: styles.colors.white,
      lineColor: styles.colors.black,
      lineWidth: 0.1,
      cellPadding: 2,
      valign: "middle",
    },
    headStyles: {
      fillColor: styles.colors.white,
    },
    columnStyles: {
      0: { cellWidth: availablePageWidth }, // Ocupa a largura total da tabela
    },
    didParseCell: (data) => {
      data.cell.styles.fillColor = styles.colors.white;
    },
    margin: { left: 20, right: 20 },
  });
  y = doc.lastAutoTable.finalY + 10; // Espaço após esta tabela

  return y;
}

/**
 * Adiciona a seção de Avaliação Inicial ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} avaliacao - Objeto da avaliação inicial.
 * @param {number} y - Posição Y atual.
 * @returns {number} Nova posição Y.
 */
function addInitialAssessment(doc, avaliacao, y) {
  const dadosAvaliacao = avaliacao?.respostas || avaliacao?.habilidades;

  if (!dadosAvaliacao || Object.keys(dadosAvaliacao).length === 0) {
    doc.text(
      "Nenhuma avaliação inicial detalhada encontrada ou com dados incompletos.",
      25,
      y
    );
    return y + 10;
  }

  y = ensurePageSpace(doc, y, 30);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Avaliação Inicial", 20, y);
  y += 8;

  for (const area in dadosAvaliacao) {
    const habilidades = dadosAvaliacao[area];
    const linhasDaArea = [];

    for (const habilidade in habilidades) {
      const nivel = habilidades[habilidade];
      if (nivel !== "NA" && nivel !== "I") {
        linhasDaArea.push([habilidade, nivel]);
      }
    }

    if (linhasDaArea.length === 0) continue;

    y = ensurePageSpace(doc, y, 30);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.medium);
    doc.text(area, 20, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Habilidade", "Nível"]],
      body: linhasDaArea,
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.small,
        cellPadding: 1.5,
        valign: "middle",
        textColor: styles.colors.black,
        fillColor: styles.colors.white, // Sem cor de fundo
        lineColor: styles.colors.black,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: styles.colors.white, // REMOVER O CINZA CLARO DOS CABEÇALHOS AQUI!
        textColor: styles.colors.black,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 150 },
        1: { cellWidth: 20, halign: "center" },
      },
      margin: { bottom: 25 },
      didParseCell: (data) => {
        // Aplica cor de fundo para os níveis
        const nivel = data.cell.text;
        if (data.column.index === 1 && coresPorNivel[nivel]) {
          data.cell.styles.fillColor = coresPorNivel[nivel]; // Aplicar cor do nível
        } else {
          data.cell.styles.fillColor = styles.colors.white; // Garantir branco para outras células
        }
      },
      didDrawPage: (data) => {
        addFooter(doc, doc.internal.pageSize.getHeight());
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  }
  return y;
}

/**
 * Adiciona a seção de PEIs consolidados ao PDF.
 * A tabela de atividades aplicadas não inclui 'Área' nem 'Habilidade' e
 * garante que cada atividade seja listada apenas uma vez.
 * O texto das estratégias será preto padrão.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Array<Object>} peisParaExibir - PEIs a serem exibidos.
 * @param {number} y - Posição Y atual.
 * @returns {number} Nova posição Y.
 */
function addConsolidatedPeiSection(doc, peisParaExibir, y) {
  const allPeiTableRows = []; // Para a tabela de Estratégias
  const allActivitiesTableRows = []; // Para a tabela de Atividades Aplicadas (sem duplicatas)
  const uniqueActivitiesSet = new Set(); // Para controlar atividades únicas

  // Mapa para agrupar habilidades por Área e Habilidade para estratégias
  // Voltando à consolidação por habilidade, onde a célula de estratégias é uma única string.
  const consolidatedSkills = new Map();

  peisParaExibir.forEach((peiItem) => {
    const resumo = peiItem.resumoPEI || peiItem.areas || [];
    if (resumo.length === 0) return;

    const criadorInfo = `(${peiItem.nomeCriador || "Desconhecido"} - ${
      peiItem.cargoCriador || "Não Informado"
    })`;

    resumo.forEach((item) => {
      const key = `${item.area || "-"}|${item.habilidade || "-"}`;
      if (!consolidatedSkills.has(key)) {
        consolidatedSkills.set(key, {
          area: item.area || "-",
          habilidade: item.habilidade || "-",
          objetivo: item.objetivo || "-",
          estrategiasTextList: [], // Lista de strings de estratégia já formatadas com criador
          nivel: item.nivel || "-",
          nivelAlmejado: item.nivelAlmejado || "-",
        });
      }

      const skillEntry = consolidatedSkills.get(key);

      let estrategiasDoItem = [];
      if (Array.isArray(item.estrategias)) {
        estrategiasDoItem = item.estrategias
          .filter(Boolean)
          .map((est) => est.trim());
      } else if (typeof item.estrategias === "string") {
        const regexSplit = /(?=\s*\([^)]+\)\s*(?=\s*\([^)]+\)|$))/;
        const parts = item.estrategias.split(regexSplit);
        parts.forEach((part) => {
          const trimmedPart = part.trim();
          if (trimmedPart) {
            estrategiasDoItem.push(trimmedPart);
          }
        });
        if (
          estrategiasDoItem.length === 0 &&
          item.estrategias.trim().length > 0
        ) {
          estrategiasDoItem.push(item.estrategias.trim());
        }
      }

      // Adiciona cada estratégia (com o info do criador) ao array de estratégias da habilidade consolidada
      if (estrategiasDoItem.length > 0) {
        estrategiasDoItem.forEach((strategyText) => {
          skillEntry.estrategiasTextList.push(
            `* ${strategyText} ${criadorInfo}`
          );
        });
      }

      // Adiciona atividades aplicadas à lista separada, garantindo unicidade
      const activityText = item.atividadeAplicada?.trim();
      if (activityText) {
        const uniqueKey = `${activityText}|${criadorInfo}`;
        if (!uniqueActivitiesSet.has(uniqueKey)) {
          uniqueActivitiesSet.add(uniqueKey);
          allActivitiesTableRows.push([activityText, criadorInfo]);
        }
      } else if (peiItem.atividadeAplicada?.trim() && !item.atividadeAplicada) {
        const activityTextFromPei = peiItem.atividadeAplicada.trim();
        const uniqueKey = `${activityTextFromPei}|${criadorInfo}`;
        if (!uniqueActivitiesSet.has(uniqueKey)) {
          uniqueActivitiesSet.add(uniqueKey);
          allActivitiesTableRows.push([activityTextFromPei, criadorInfo]);
        }
      }

      // Atualiza o nível e nível almejado, sempre pegando o último (mais recente)
      skillEntry.nivel = item.nivel || skillEntry.nivel;
      skillEntry.nivelAlmejado = item.nivelAlmejado || skillEntry.nivelAlmejado;
    });
  });

  // Converte o mapa de habilidades consolidadas em linhas para o corpo da tabela de Estratégias
  // Cada linha será uma habilidade com suas estratégias consolidadas em uma única célula de string.
  consolidatedSkills.forEach((skillEntry) => {
    // Une todas as estratégias da habilidade em uma única string, separadas por duas quebras de linha
    const combinedStrategiesText = skillEntry.estrategiasTextList.join("\n\n");

    allPeiTableRows.push([
      skillEntry.area || "-",
      skillEntry.habilidade || "-",
      skillEntry.objetivo || "-",
      combinedStrategiesText || "Nenhuma estratégia definida.", // Conteúdo como STRING SIMPLES
      skillEntry.nivel || "-",
      skillEntry.nivelAlmejado || "-",
    ]);
  });

  // --- Tabela de Plano Educacional Individualizado (Estratégias) ---
  if (allPeiTableRows.length > 0) {
    y = ensurePageSpace(doc, y, 60);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text(
      "Plano Educacional Individualizado (PEI)",
      doc.internal.pageSize.getWidth() / 2,
      y,
      { align: "center" }
    );
    y += 8;

    const larguraPagina = doc.internal.pageSize.getWidth();
    // Definir as larguras fixas para as primeiras colunas e os níveis
    const areaWidth = 25;
    const habilidadeWidth = 35;
    const objetivoWidth = 45;
    const nivelWidth = 12; // Largura para Nível (muito menor)
    const nivelAlmejadoWidth = 15; // Largura para Nível Almejado (muito menor)

    // Margens laterais padrão para autoTable (20mm de cada lado = 40mm total)
    const defaultMarginLeft = 20;
    const defaultMarginRight = 20;
    const defaultTotalHorizontalMargin = defaultMarginLeft + defaultMarginRight;

    // Calcular o espaço restante para a coluna de Estratégias
    const fixedColumnsTotalWidth =
      areaWidth +
      habilidadeWidth +
      objetivoWidth +
      nivelWidth +
      nivelAlmejadoWidth;
    const availableWidthForStrategies =
      larguraPagina - defaultTotalHorizontalMargin - fixedColumnsTotalWidth;

    // Garanta que Estratégias tenha um mínimo razoável (ex: 70mm), e não seja negativo
    const estrategiasWidth = Math.max(70, availableWidthForStrategies);

    const totalColumnWidthUsed =
      areaWidth +
      habilidadeWidth +
      objetivoWidth +
      estrategiasWidth +
      nivelWidth +
      nivelAlmejadoWidth;
    // Calcular a margem esquerda para centralizar a tabela
    const margemPEI = (larguraPagina - totalColumnWidthUsed) / 2;

    autoTable(doc, {
      startY: y,
      head: [
        [
          "Área",
          "Habilidade",
          "Objetivo",
          "Estratégias",
          "Nível Atual",
          "Nível Almejado",
        ],
      ],
      body: allPeiTableRows, // Agora allPeiTableRows contém strings simples
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.small,
        textColor: styles.colors.black, // O texto será preto padrão
        fillColor: styles.colors.white, // GARANTIR BRANCO NO ESTILO GERAL DA TABELA
        lineColor: styles.colors.black,
        lineWidth: 0.1,
        cellPadding: 2,
        valign: "top",
      },
      headStyles: {
        fillColor: styles.colors.white, // REMOVER O CINZA CLARO DOS CABEÇALHOS AQUI!
        textColor: styles.colors.black,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: areaWidth },
        1: { cellWidth: habilidadeWidth },
        2: { cellWidth: objetivoWidth },
        3: { cellWidth: estrategiasWidth, overflow: "linebreak" },
        4: { cellWidth: nivelWidth, halign: "center" }, // Nível (índice 4)
        5: { cellWidth: nivelAlmejadoWidth, halign: "center" }, // Nível Almejado (índice 5)
      },
      margin: { left: margemPEI, bottom: 25 },
      didParseCell: (data) => {
        // Aplica cor de fundo para os níveis
        const nivel = data.cell.text;
        if ([4, 5].includes(data.column.index) && coresPorNivel[nivel]) {
          data.cell.styles.fillColor = coresPorNivel[nivel]; // Aplicar cor do nível
        } else {
          data.cell.styles.fillColor = styles.colors.white; // Garantir branco para outras células
        }
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.text(
      "Nenhuma estratégia de Plano Educacional Individualizado (PEI) detalhada encontrada para este aluno.",
      25,
      y
    );
    y += 10;
  }

  // --- Tabela de Atividades Aplicadas ---
  if (allActivitiesTableRows.length > 0) {
    y = ensurePageSpace(doc, y, 40);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Atividades Aplicadas", doc.internal.pageSize.getWidth() / 2, y, {
      align: "center",
    });
    y += 8;

    const larguraPagina = doc.internal.pageSize.getWidth();
    const tableWidth = 175;
    const margemAtividades = (larguraPagina - tableWidth) / 2;

    autoTable(doc, {
      startY: y,
      head: [["Atividade Aplicada", "Responsável"]],
      body: allActivitiesTableRows,
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.small,
        textColor: styles.colors.black,
        fillColor: styles.colors.white, // GARANTIR BRANCO NO ESTILO GERAL DA TABELA
        lineColor: styles.colors.black,
        lineWidth: 0.1,
        cellPadding: 2,
        valign: "top",
      },
      headStyles: {
        fillColor: styles.colors.white, // REMOVER O CINZA CLARO DOS CABEÇALHOS AQUI!
        textColor: styles.colors.black,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: tableWidth * 0.7, overflow: "linebreak" },
        1: { cellWidth: tableWidth * 0.3, halign: "center" },
      },
      margin: { left: margemAtividades, bottom: 25 },
      didParseCell: (data) => {
        data.cell.styles.fillColor = styles.colors.white; // GARANTIR BRANCO EM CADA CÉLULA DO BODY
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.text(
      "Nenhuma atividade aplicada detalhada encontrada para este aluno.",
      25,
      y
    );
    y += 10;
  }

  // Se nenhuma das tabelas foi gerada
  if (allPeiTableRows.length === 0 && allActivitiesTableRows.length === 0) {
    doc.text(
      "Nenhum Plano Educacional Individualizado (PEI) ou atividade aplicada encontrada para este aluno.",
      25,
      y
    );
    return y + 10;
  }

  return y;
}

/**
 * Adiciona a seção de Legenda dos Níveis ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {number} y - Posição Y atual.
 * @returns {number} Nova posição Y.
 */
function addLegendSection(doc, y) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerArea = 25;
  const minSpaceAboveFooter = 30;

  y = ensurePageSpace(
    doc,
    y,
    Object.keys(legendaNiveis).length * 7 + minSpaceAboveFooter
  );

  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Legenda dos Níveis:", 30, y);
  y += 6;
  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.small);

  Object.entries(legendaNiveis).forEach(([sigla, descricao]) => {
    const cor = coresPorNivel[sigla] || styles.colors.white; // Pega a cor correspondente ou branco padrão
    doc.setFillColor(...cor); // Define a cor de preenchimento
    doc.rect(22, y - 4, 8, 6, "F"); // Desenha um retângulo preenchido (cor)
    doc.text(`${sigla} – ${descricao}`, 32, y); // Adiciona o texto da legenda
    y += 7;
  });
  return y + 10;
}

/**
 * Adiciona a seção de Assinatura do Responsável ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} usuarioLogado - Objeto do usuário logado.
 * @param {number} y - Posição Y atual.
 * @returns {number} Nova posição Y.
 */
function addLoggedInUserSignature(doc, usuarioLogado, y) {
  const signatureBlockHeight = 50;
  y = ensurePageSpace(doc, y, signatureBlockHeight);

  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.medium);
  const dataHoje = new Date().toLocaleDateString("pt-BR");
  doc.text(`Guabiruba, ${dataHoje}`, 20, y);
  y += 10;

  doc.line(20, y, 100, y);
  y += 6;
  doc.text(
    `Assinatura: ${usuarioLogado?.nome || "___________________________"}`,
    20,
    y
  );
  y += 6;
  doc.text(`Cargo: ${usuarioLogado?.cargo || ""}`, 20, y);
  return y + 10;
}

/**
 * Adiciona a tabela de assinaturas de profissionais ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} aluno - Objeto do aluno.
 * @param {number} y - Posição Y atual.
 * @returns {Promise<number>} Nova posição Y.
 */
async function addProfessionalSignaturesTable(doc, aluno, usuarioLogado, y) {
  const perfisParaTabelaAssinaturas = [
    "gestao",
    "aee",
    "seme",
    "diretor",
    "diretor adjunto",
    "orientador pedagógico",
    "desenvolvedor",
  ];

  if (
    !perfisParaTabelaAssinaturas.includes(usuarioLogado?.perfil?.toLowerCase())
  ) {
    return y; // Não gera a tabela se o usuário logado não tem perfil adequado
  }

  try {
    const perfisParaQuery = [
      "professor",
      "aee",
      "diretor",
      "diretor adjunto",
      "orientador pedagógico",
      "desenvolvedor",
      "gestao",
      "seme",
    ];
    const professoresComAssinaturaQuery = query(
      collection(db, "usuarios"),
      where("perfil", "in", perfisParaQuery)
    );
    const professoresSnap = await getDocs(professoresComAssinaturaQuery);

    const profissionaisVinculados = professoresSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((prof) => {
        const estaNaEscolaDoAluno = Object.keys(prof.escolas || {}).includes(
          aluno.escolaId
        );
        const profTurmas = Object.keys(prof.turmas || {});
        const estaNaTurmaDoAluno =
          aluno.turma && profTurmas.includes(aluno.turma);
        const perfilLower = prof.perfil?.toLowerCase();

        if (["professor", "aee"].includes(perfilLower)) {
          return estaNaEscolaDoAluno && (!aluno.turma || estaNaTurmaDoAluno);
        }
        return estaNaEscolaDoAluno;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));

    if (profissionaisVinculados.length === 0) {
      console.warn(
        "Nenhum profissional encontrado para a tabela de assinaturas gerais."
      );
      return y;
    }

    y = ensurePageSpace(doc, y, 30);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Assinaturas dos Profissionais Envolvidos", 20, y);
    y += 8;

    const linhasAssinaturas = profissionaisVinculados.map((p) => [
      p.nome,
      p.cargo || p.perfil?.toUpperCase(),
      "_______________________________",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Nome Completo", "Cargo/Função", "Assinatura"]],
      body: linhasAssinaturas,
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.medium,
        textColor: styles.colors.black,
        fillColor: styles.colors.white, // GARANTIR BRANCO NO ESTILO GERAL DA TABELA
        lineColor: styles.colors.black,
        lineWidth: 0.1,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: styles.colors.white, // REMOVER O CINZA CLARO DOS CABEÇALHOS AQUI!
        textColor: styles.colors.black,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 60, halign: "center" },
        2: { cellWidth: 60 },
      },
      margin: { bottom: 25 },
      didParseCell: (data) => {
        data.cell.styles.fillColor = styles.colors.white; // GARANTIR BRANCO EM CADA CÉLULA DO BODY
      },
    });
    return doc.lastAutoTable.finalY + 10;
  } catch (err) {
    console.error("Erro ao buscar profissionais para assinatura:", err);
    return y;
  }
}

// --- Função Principal: gerarPDFCompleto ---

export async function gerarPDFCompleto(
  aluno,
  avaliacao,
  usuarioLogado,
  peisParaGeral = null
) {
  const doc = new jsPDF();
  let y = 20; // Posição Y inicial para o conteúdo

  console.log("[PDF_DEBUG] Início da geração do PDF.");
  console.log("[PDF_DEBUG] Aluno:", JSON.stringify(aluno, null, 2));
  console.log("Usuario Logado:", JSON.stringify(usuarioLogado, null, 2));
  console.log("Avaliação:", JSON.stringify(avaliacao, null, 2));
  console.log(
    "[PDF_DEBUG] PEIs passados para Geral (se aplicável):",
    JSON.stringify(peisParaGeral, null, 2)
  );

  // --- 1. Validações Iniciais ---
  if (!aluno || !aluno.nome || !aluno.id) {
    console.error("gerarPDFCompleto: Dados do aluno são incompletos.");
    doc.text("Erro: Dados do aluno incompletos.", 20, y);
    addFooter(doc, doc.internal.pageSize.getHeight());
    doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}_Sem_Dados.pdf`);
    return;
  }

  // --- 2. Busca e Preparação dos PEIs ---
  let peisParaProcessar;
  if (Array.isArray(peisParaGeral) && peisParaGeral.length > 0) {
    peisParaProcessar = peisParaGeral;
    console.log("[PDF_DEBUG] Usando PEIs passados como peisParaGeral.");
  } else {
    peisParaProcessar = await fetchPeis(aluno.id, aluno.nome);
  }

  // Ordena os PEIs para exibição (do mais novo para o mais antigo, por data de criação)
  const peisOrdenados = peisParaProcessar.sort((a, b) => {
    const dataA = a.dataCriacao?.toDate
      ? a.dataCriacao.toDate()
      : new Date(a.dataCriacao);
    const dataB = b.dataCriacao?.toDate
      ? b.dataCriacao.toDate()
      : new Date(b.dataCriacao);
    return dataB.getTime() - dataA.getTime();
  });

  let peisParaExibir = peisOrdenados;

  console.log(
    "[PDF_DEBUG] PEIs para exibir (final):",
    JSON.stringify(peisParaExibir, null, 2)
  );

  if (
    peisParaExibir.length === 0 &&
    (!avaliacao || Object.keys(avaliacao).length === 0)
  ) {
    console.warn(
      "Nenhum PEI ou avaliação encontrado para o aluno, gerando PDF básico informativo."
    );
    doc.text(
      "Nenhum Plano Educacional Individualizado (PEI) ou Avaliação Inicial encontrado para este aluno.",
      25,
      y
    );
    addFooter(doc, doc.internal.pageSize.getHeight());
    doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}_Sem_Dados.pdf`);
    return;
  }

  // --- 3. Busca Nome da Escola ---
  let nomeEscola = "-";
  if (aluno.escolaId) {
    try {
      const escolaRef = firestoreDoc(db, "escolas", aluno.escolaId);
      const escolaSnap = await getDoc(escolaRef);
      if (escolaSnap.exists()) {
        nomeEscola = escolaSnap.data().nome || "-";
      } else {
        console.warn(`Escola não encontrada para o ID: ${aluno.escolaId}`);
      }
    } catch (err) {
      console.error("Erro ao buscar nome da escola:", err);
    }
  }

  // --- 4. Geração das Seções do PDF ---
  y = await addStudentAndHeaderInfo(doc, aluno, avaliacao, nomeEscola, y);
  y = addInitialAssessment(doc, avaliacao, y);
  y = addConsolidatedPeiSection(doc, peisParaExibir, y);
  y = addLegendSection(doc, y); // AQUI A FUNÇÃO addLegendSection FOI ATUALIZADA
  y = addLoggedInUserSignature(doc, usuarioLogado, y);
  y = await addProfessionalSignaturesTable(doc, aluno, usuarioLogado, y);

  // --- 5. Finalização e Salvamento do PDF ---
  addFooter(doc, doc.internal.pageSize.getHeight());
  doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}_Completo.pdf`);
  console.log("[PDF_DEBUG] Geração do PDF concluída.");
}
