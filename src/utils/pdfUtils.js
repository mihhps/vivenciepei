import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

export function formatarMesPorExtenso(dateInput) {
  if (!dateInput) return "-";
  let dateObj;
  try {
    if (typeof dateInput.toDate === "function") {
      dateObj = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (typeof dateInput === "string") {
      dateObj = new Date(dateInput);
    } else {
      return "-";
    }
    if (isNaN(dateObj.getTime())) return "-";
    const mes = dateObj.toLocaleString("pt-BR", { month: "long" });
    const ano = dateObj.getFullYear();
    return `${mes} de ${ano}`;
  } catch (e) {
    console.error("Erro ao formatar mês por extenso:", e);
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
 * Desenha o cabeçalho do documento com informações essenciais do aluno e da avaliação em formato de tabela.
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
  const dataNascTexto = formatarData(aluno?.nascimento);

  // --- 1. Logo ---
  doc.addImage("/logo.jpg", "JPEG", 10, y, 128, 25);
  y += 35;

  // --- 2. Título do Documento Principal ---
  doc.setFont(pdfStyles.font, "bold");
  doc.setFontSize(pdfStyles.fontSize.extraLarge);
  doc.setTextColor(...getSafeColor(pdfStyles.colors.black));
  doc.text(documentTitle, doc.internal.pageSize.getWidth() / 2, y, {
    align: "center",
  });
  y += 15;

  // --- 3. Informações Essenciais do Aluno e Avaliação (em tabela) ---
  const body = [
    [{ content: `Escola: ${nomeEscola || "-"}`, colSpan: 3 }],
    [{ content: `Nome: ${aluno?.nome || "-"}`, colSpan: 3 }],
    [`Data de Nasc.: ${dataNascTexto}`, `Turma: ${aluno?.turma || "-"}`, ""],
    [
      {
        content: `Data da Avaliação Inicial: ${
          formatarData(avaliacaoInfo?.dataAvaliacao) || "-"
        }`,
        colSpan: 3,
      },
    ],
    [
      {
        content: `Próxima Avaliação: ${
          formatarData(avaliacaoInfo?.proximaAvaliacao) || "-"
        }`,
        colSpan: 3,
      },
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [], // Cabeçalho vazio, pois o corpo já contém as informações
    body: body,
    theme: "grid",
    styles: {
      font: pdfStyles.font,
      fontSize: pdfStyles.fontSize.medium,
      cellPadding: 2,
    },
    // Remova as bordas para um visual mais limpo
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.1,
    margin: { left: 20, right: 20 },
  });

  // O y agora será a última posição Y da tabela.
  y = doc.lastAutoTable.finalY + 10;

  // --- 4. Linha Divisória Final do Cabeçalho ---
  doc.setDrawColor(...getSafeColor(pdfStyles.colors.darkBlue));
  doc.setLineWidth(0.5);
  doc.line(20, y, doc.internal.pageSize.getWidth() - 20, y);
  y += 10;

  return y;
}

/**
 * Adiciona rodapé e número de página.
 * @param {jsPDF} doc O documento jsPDF.
 */
export function addHeaderAndFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Rodapé
    addFooter(doc, pageHeight);

    // Número da página
    doc.setFontSize(pdfStyles.fontSize.small);
    doc.setTextColor(
      pdfStyles.colors.black[0],
      pdfStyles.colors.black[1],
      pdfStyles.colors.black[2]
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, pageHeight - 15);
  }
}

/**
 * Garante que há espaço suficiente na página para o conteúdo.
 * Se não houver, adiciona uma nova página e retorna a nova posição Y.
 * @param {jsPDF} doc O documento jsPDF.
 * @param {number} y A posição Y atual.
 * @param {number} requiredSpace A altura necessária para o próximo conteúdo.
 * @returns {number} A nova posição Y.
 */
export function ensurePageSpace(doc, y, requiredSpace) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 40; // Aumentamos a margem para dar mais espaço ao rodapé
  if (y + requiredSpace > pageHeight - bottomMargin) {
    doc.addPage();
    return 20; // Retorna uma posição Y inicial na nova página
  }
  return y; // Retorna a posição Y atual se houver espaço
}
