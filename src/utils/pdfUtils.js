// src/utils/pdfUtils.js

import jsPDF from "jspdf";

// --- 1. Definições de Estilos e Cores Globais ---
export const pdfStyles = {
  font: "times", // Fonte Times New Roman
  fontSize: {
    small: 8, // Para rodapé e detalhes
    medium: 10, // Padrão para corpo de texto
    large: 12, // Títulos de seção
    title: 14, // Título principal do documento (PLANO EDUCACIONAL INDIVIDUALIZADO)
    extraLarge: 18, // Para títulos ainda maiores (Avaliação Inicial - Relatório Preenchido)
  },
  colors: {
    // Cores básicas
    darkBlue: [28, 59, 107], // Um azul escuro para títulos de seção
    lightGray: [230, 230, 230], // Para fundo de cabeçalhos de tabela
    mediumGray: [150, 150, 150], // Para bordas de tabela mais suaves
    darkGray: [50, 50, 50], // Para bordas de tabela mais escuras
    black: [0, 0, 0], // Preto padrão para texto
    white: [255, 255, 255], // Branco padrão para fundo e texto

    // Cores específicas dos Níveis de Avaliação (convertidas de Hex para RGB)
    level_NR: [230, 57, 70], // NR: #e63946 (Não realizou)
    level_AF: [244, 162, 97], // AF: #f4a261 (Apoio físico)
    level_AG: [233, 196, 106], // AG: #e9c46a (Apoio gestual)
    level_AV: [42, 157, 143], // AV: #2a9d8f (Apoio verbal)
    level_AVi: [142, 202, 230], // AVi: #8ecae6 (Apoio visual)
    level_I: [76, 175, 80], // I: #4caf50 (Independente)
    level_NA: [173, 181, 189], // NA: #adb5bd (Não aplicável)
    level_AT: [255, 140, 0], // AT: Laranja Escuro
    level_VA: [100, 149, 237], // VA: Azul Milho
  },
  lineHeightMultiplier: 1.15,
  cellPadding: {
    x: 2,
    y: 2,
  },
};

export const coresPorNivel = {
  NR: pdfStyles.colors.level_NR,
  AF: pdfStyles.colors.level_AF,
  AG: pdfStyles.colors.level_AG,
  AV: pdfStyles.colors.level_AV,
  AVi: pdfStyles.colors.level_AVi,
  I: pdfStyles.colors.level_I,
  NA: pdfStyles.colors.level_NA,
  AT: pdfStyles.colors.level_AT,
  VA: pdfStyles.colors.level_VA,
};

export const legendaNiveis = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
  NA: "Não aplicável",
  AT: "Apoio tátil",
  VA: "Verbalização Assistida",
};

// --- 2. Funções Auxiliares de Validação e Formatação ---

export function getSafeColor(colorInput) {
  if (!Array.isArray(colorInput)) {
    console.error(
      "getSafeColor: Entrada não é um array. Retornando preto padrão.",
      colorInput
    );
    return pdfStyles.colors.black;
  }

  if (colorInput.length !== 3) {
    console.error(
      "getSafeColor: Array de cor não tem 3 elementos (RGB). Retornando preto padrão.",
      colorInput
    );
    return pdfStyles.colors.black;
  }

  for (let i = 0; i < 3; i++) {
    const component = colorInput[i];
    if (typeof component !== "number" || component < 0 || component > 255) {
      console.error(
        `getSafeColor: Componente de cor inválido no índice ${i}. Valor: ${component}. Retornando preto padrão.`,
        colorInput
      );
      return pdfStyles.colors.black;
    }
  }
  return colorInput;
}

export function formatarData(dateInput) {
  if (!dateInput) return "-";

  let dateObj;
  try {
    if (typeof dateInput.toDate === "function") {
      dateObj = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (typeof dateInput === "string") {
      dateObj = new Date(dateInput);
      if (dateInput.length === 10 && !dateInput.includes("T")) {
        const [year, month, day] = dateInput.split("-").map(Number);
        dateObj = new Date(Date.UTC(year, month - 1, day));
      }
    } else {
      return "-";
    }

    if (isNaN(dateObj.getTime())) return "-";

    const dia = String(dateObj.getUTCDate()).padStart(2, "0");
    const mes = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    const ano = dateObj.getUTCFullYear();

    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return "-";
  }
}

// --- 3. Funções Auxiliares de Desenho de PDF ---

export function addFooter(doc, pageHeight) {
  doc.setFont(pdfStyles.font, "normal");
  doc.setFontSize(pdfStyles.fontSize.small);
  doc.setTextColor(...getSafeColor(pdfStyles.colors.black));

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
 * Desenha o cabeçalho do documento com informações essenciais do aluno e da avaliação.
 *
 * @param {jsPDF} doc O documento jsPDF.
 * @param {number} startY Posição Y inicial para desenhar o cabeçalho (tipicamente 10).
 * @param {string} documentTitle Título principal do documento (ex: "Avaliação Inicial - Relatório Preenchido").
 * @param {object} aluno Objeto com dados do aluno (nome, dataNascimento, turma, etc.).
 * @param {string} nomeEscola Nome da escola do aluno (já resolvido pelo chamador).
 * @param {object} avaliacaoInfo Objeto com informações da avaliação inicial (dataAvaliacao: Date | string, proximaAvaliacao: Date | string).
 * @returns {number} A nova posição Y após desenhar o cabeçalho.
 */
export async function drawDocumentHeader(
  doc,
  startY,
  documentTitle,
  aluno,
  nomeEscola,
  avaliacaoInfo
) {
  let y = startY;
  const leftAlignX = 20;
  const infoLabelWidth = 60; // Largura para o rótulo (ex: "Escola:", "Nome:")
  const infoValueX = leftAlignX + infoLabelWidth; // Posição X para o valor
  const lineHeight = pdfStyles.fontSize.large * pdfStyles.lineHeightMultiplier;

  // --- 1. Logo ---
  doc.addImage("/logo.jpg", "JPEG", 10, y, 128, 25);
  y += 35;

  // --- 2. Título do Documento Principal ---
  doc.setFont(pdfStyles.font, "bold");
  doc.setFontSize(pdfStyles.fontSize.title);
  doc.setTextColor(...getSafeColor(pdfStyles.colors.black));

  doc.text(documentTitle, doc.internal.pageSize.getWidth() / 2, y, {
    align: "center",
  });
  y += 10;

  // --- 3. Informações Essenciais do Aluno e Avaliação (dispostas em bloco vertical) ---
  doc.setFont(pdfStyles.font, "normal");
  doc.setFontSize(pdfStyles.fontSize.large);
  doc.setTextColor(...getSafeColor(pdfStyles.colors.black));

  // Função auxiliar para desenhar uma linha de informação formatada
  const drawInfoLine = (label, value) => {
    doc.setFont(pdfStyles.font, "bold"); // Rótulo em negrito
    doc.text(label, leftAlignX, y);
    doc.setFont(pdfStyles.font, "normal"); // Valor normal
    doc.text(value, infoValueX, y); // Alinha o valor após o rótulo
    y += lineHeight;
  };

  // Informações do Aluno e Turma
  drawInfoLine("Escola:", nomeEscola || "-");
  drawInfoLine("Nome:", aluno?.nome || "-");
  drawInfoLine("Data de Nascimento:", formatarData(aluno?.nascimento) || "-");
  drawInfoLine("Turma:", aluno?.turma || "-"); // Adicionado campo Turma aqui

  // Informações da Avaliação Inicial
  y += 5; // Pequeno espaçamento
  drawInfoLine(
    "Data da Avaliação Inicial:",
    formatarData(avaliacaoInfo?.dataAvaliacao) || "-"
  );
  drawInfoLine(
    "Próxima Avaliação:",
    formatarData(avaliacaoInfo?.proximaAvaliacao) || "-"
  );

  // --- 4. Linha Divisória Final do Cabeçalho ---
  y += 10;
  doc.setDrawColor(...getSafeColor(pdfStyles.colors.darkBlue));
  doc.setLineWidth(0.5);
  doc.line(
    leftAlignX - 10,
    y,
    doc.internal.pageSize.getWidth() - leftAlignX + 10,
    y
  );
  y += 10;

  return y;
}
