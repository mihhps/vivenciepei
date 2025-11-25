import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { doc as firestoreDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // Ajuste o caminho se necessário

// --- Constantes e Estilos FINAIS ---
const styles = {
  font: "helvetica",
  fontSize: {
    small: 8,
    standard: 10,
    sectionTitle: 14,
    mainTitle: 18,
  },
  colors: {
    black: [0, 0, 0],
    white: [255, 255, 255],
    grayText: [108, 117, 125], // cor-texto-secundario
    lightGray: [233, 236, 239], // bordaClara
    // Cores DUA em RGB
    duaRepresentacao: [80, 61, 129], // Roxo Escuro
    duaAcao: [42, 114, 176], // Azul Escuro
    duaEngajamento: [25, 128, 56], // Verde Escuro
    // Fundo Pastel DUA para o corpo das listas
    fundoRepresentacao: [242, 234, 250],
    fundoAcao: [234, 243, 251],
    fundoEngajamento: [235, 246, 238],
    // Cores de Recurso e Observação
    corRecursos: [230, 126, 34], // Laranja
    corObservacoes: [52, 73, 94], // Cinza Escuro
    fundoObservacoes: [244, 246, 248], // Cinza Claro
  },
};

const HEADER_AREA_HEIGHT = 40;
const FOOTER_AREA_HEIGHT = 25;
const MARGIN = 20;

// --- Funções Auxiliares (Manutenção) ---

function formatarData(data) {
  if (!data) return "-";
  try {
    let dateObj;
    if (typeof data.toDate === "function") {
      dateObj = data.toDate();
    } else if (data instanceof Date) {
      dateObj = data;
    } else if (typeof data === "string") {
      dateObj = new Date(data.includes("T") ? data : data + "T00:00:00");
    } else {
      return "-";
    }
    if (isNaN(dateObj.getTime())) return "-";
    const dia = String(dateObj.getDate()).padStart(2, "0");
    const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
    const ano = dateObj.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    return "-";
  }
}

function addHeaderAndFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgWidth = 190;
    const imgHeight = 25;
    const imgX = 10;
    const imgY = 10;
    // CERTIFIQUE-SE DE QUE ESTE CAMINHO ESTÁ CORRETO NO SEU AMBIENTE
    doc.addImage("/logoolf.jpg", "JPEG", imgX, imgY, imgWidth, imgHeight);

    const originalFontSize = doc.getFontSize();
    doc.setFont(styles.font, "normal");
    doc.setFontSize(styles.fontSize.small);

    doc.text(
      "Prefeitura Municipal de Guabiruba / Secretaria de Educação de Guabiruba (SEME)",
      MARGIN,
      pageHeight - 20
    );
    doc.text(
      "Rua José Dirschnabel, 67 - Centro - Guabiruba/SC",
      MARGIN,
      pageHeight - 15
    );
    doc.text(
      "Telefone/WhatsApp: (47) 3308-3102 - www.guabiruba.sc.gov.br",
      MARGIN,
      pageHeight - 10
    );
    doc.setFontSize(originalFontSize);
  }
}

function ensurePageSpace(doc, currentY, requiredSpace) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottomLimit = pageHeight - FOOTER_AREA_HEIGHT;
  if (currentY + requiredSpace > contentBottomLimit) {
    doc.addPage();
    return HEADER_AREA_HEIGHT + 10;
  }
  return currentY;
}

/**
 * Desenha um separador elegante de seção.
 */
function drawSectionHeader(doc, y, titulo) {
  y = ensurePageSpace(doc, y, 10);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.sectionTitle);
  doc.setTextColor(...styles.colors.black);
  doc.text(titulo, MARGIN, y);

  y += 3;
  // Linha de separação mais forte
  doc.setLineWidth(0.6);
  doc.setDrawColor(...styles.colors.duaAcao);
  doc.line(MARGIN, y, doc.internal.pageSize.getWidth() - MARGIN, y);

  y += 7;
  return y;
}

/**
 * Adiciona uma seção DUA com barra lateral colorida. (CORREÇÃO FINAL APLICADA AQUI)
 */
function addDuaSectionClean(doc, y, titulo, lista, corBarra, corFundo) {
  const availablePageWidth = doc.internal.pageSize.getWidth() - MARGIN * 2;
  const headerHeight = 6;

  // 1. Garante espaço suficiente para o cabeçalho DUA e um pequeno respiro
  y = ensurePageSpace(doc, y, headerHeight + 5);

  // --- Bloco do Título DUA (Barra Colorida) ---

  doc.setFillColor(...corBarra);
  doc.rect(MARGIN, y, availablePageWidth, headerHeight, "F");

  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.standard + 1);
  doc.setTextColor(...styles.colors.white);
  doc.text(titulo, MARGIN + 2, y + 4.5);

  doc.setTextColor(...styles.colors.black);

  y += headerHeight;

  // --- Itens da Lista (Tabela com barra lateral) ---
  const corpo =
    lista.length > 0
      ? lista.map((item) => [{ content: item }])
      : [
          [
            {
              content: "Nenhuma estratégia selecionada.",
              styles: {
                fontStyle: "italic",
                textColor: styles.colors.grayText,
              },
            },
          ],
        ];

  autoTable(doc, {
    startY: y, // Começa exatamente após a barra colorida
    body: corpo,
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.standard,
      textColor: styles.colors.black,
      fillColor: corFundo,
      lineWidth: 0,
      valign: "top",
      // CORREÇÃO FINAL: Redução do padding e minCellHeight para maximizar o espaço vertical
      // e prevenir que o conteúdo seja cortado ou omitido devido a cálculos de altura imprecisos.
      // Padding {top, right, bottom, left}
      cellPadding: [2, 4, 2, 6],
      minCellHeight: 5,
    },
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_AREA_HEIGHT },
    columnStyles: {
      0: {
        // Garante que a coluna use a largura total disponível.
        cellWidth: availablePageWidth,
      },
    },
    didDrawCell: (data) => {
      // Desenha a barra lateral colorida (3mm de largura)
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...corBarra);
        // Desenha a barra na borda esquerda da célula (data.cell.x)
        doc.rect(data.cell.x, data.cell.y, 3, data.cell.height, "F");
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;
  return y;
}

// --- FUNÇÃO PRINCIPAL ---

export async function gerarPDFPlanoDUA(plano, dataCriacaoFormatada) {
  const doc = new jsPDF();
  let y = HEADER_AREA_HEIGHT + 10;
  const availablePageWidth = doc.internal.pageSize.getWidth() - MARGIN * 2;
  const contentCenter = doc.internal.pageSize.getWidth() / 2;

  // --- TÍTULO PRINCIPAL E METADADOS ---
  const tituloOriginal = (
    plano.tituloAula || "PLANO DE AULA DUA"
  ).toUpperCase();

  const tituloDividido = doc.splitTextToSize(
    tituloOriginal,
    availablePageWidth - 20
  );

  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.mainTitle);
  doc.setTextColor(...styles.colors.black);

  doc.text(tituloDividido, contentCenter, y, {
    align: "center",
    lineHeightFactor: 1.2,
  });

  const linhaAltura = doc.getLineHeight() * 0.352777;
  y += tituloDividido.length * linhaAltura * 1.2;
  y += 3;

  // --- METADADOS ---
  doc.setFontSize(styles.fontSize.standard);
  doc.setFont(styles.font, "normal");
  doc.setTextColor(...styles.colors.grayText);
  doc.text(
    `Criado por: ${plano.criadorNome || "N/A"} em ${
      dataCriacaoFormatada || "N/A"
    }`,
    contentCenter,
    y,
    {
      align: "center",
    }
  );
  y += 12;

  // --- 1. INFORMAÇÕES ESSENCIAIS ---
  y = drawSectionHeader(doc, y, "1. INFORMAÇÕES ESSENCIAIS");

  // CORREÇÃO TEMA/CONTEÚDO: Passando como array de strings, que é a forma mais robusta de quebrar linhas no autoTable
  const conteudoTema = [
    plano.conteudoTema,
    plano.conteudoTema2,
    plano.conteudoTema3,
  ].filter(Boolean);

  // Se não houver tema, usar a string "Não informado"
  const temaCellContent =
    conteudoTema.length > 0 ? conteudoTema : "Não informado";

  autoTable(doc, {
    startY: y,
    body: [
      [
        { content: "TURMA:", styles: { fontStyle: "bold" } },
        {
          content: plano.turmaNome || "-",
          styles: { textColor: styles.colors.grayText },
        },
        { content: "DURAÇÃO:", styles: { fontStyle: "bold" } },
        {
          content: plano.duracao ? `${plano.duracao} min` : "N/I",
          styles: { textColor: styles.colors.grayText },
        },
      ],
      [
        { content: "DATA DA AULA:", styles: { fontStyle: "bold" } },
        {
          content: plano.dataAulaFormatada || "-",
          styles: { textColor: styles.colors.grayText },
        },
        { content: "CRIADOR:", styles: { fontStyle: "bold" } },
        {
          content: plano.criadorNome || "N/A",
          styles: { textColor: styles.colors.grayText },
        },
      ],
      [
        {
          content: "TEMA/CONTEÚDO:",
          colSpan: 4,
          styles: { fontStyle: "bold" },
        },
      ],
      [
        {
          content: temaCellContent, // Passa o array ou a string
          colSpan: 4,
          styles: { fillColor: styles.colors.lightGray },
        },
      ],
    ],
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.standard,
      textColor: styles.colors.black,
      fillColor: styles.colors.white,
      lineWidth: 0,
      cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
      valign: "middle",
      minCellHeight: 6,
    },
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_AREA_HEIGHT },
  });
  y = doc.lastAutoTable.finalY + 10;

  // --- OBJETIVO CURRICULAR (BNCC) ---
  y = ensurePageSpace(doc, y, 20);
  doc.setFont(styles.font, "bold");
  doc.setTextColor(...styles.colors.black);
  doc.text("OBJETIVO CURRICULAR (BNCC):", MARGIN, y);
  y += 3;

  const textoBNCC =
    plano.objetivoCurricularBNCC ||
    "Nenhum objetivo curricular da BNCC listado.";

  // Garante que a célula tem a largura total disponível
  autoTable(doc, {
    startY: y,
    body: [[textoBNCC]],
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.standard,
      textColor: styles.colors.black,
      fillColor: [233, 245, 255],
      lineWidth: 0,
      cellPadding: 4,
      valign: "top",
      fontStyle: "italic",
      minCellHeight: 6,
    },
    columnStyles: { 0: { cellWidth: availablePageWidth } }, // Garante largura total
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_AREA_HEIGHT },
    didDrawCell: (data) => {
      if (data.section === "body") {
        doc.setFillColor(42, 114, 176);
        doc.rect(data.cell.x, data.cell.y, 3, data.cell.height, "F");
      }
    },
  });
  y = doc.lastAutoTable.finalY + 15;

  // --- 2. ESTRATÉGIAS DUA ---
  y = drawSectionHeader(doc, y, "2. ESTRATÉGIAS DE INCLUSÃO (DUA)");

  const principiosDUA = [
    {
      titulo: "1. Múltiplos Meios de REPRESENTAÇÃO",
      lista: plano.representacao || [],
      corBarra: styles.colors.duaRepresentacao,
      corFundo: styles.colors.fundoRepresentacao,
    },
    {
      titulo: "2. Múltiplos Meios de AÇÃO E EXPRESSÃO",
      lista: plano.acaoExpressao || [],
      corBarra: styles.colors.duaAcao,
      corFundo: styles.colors.fundoAcao,
    },
    {
      titulo: "3. Múltiplos Meios de ENGAJAMENTO",
      lista: plano.engajamento || [],
      corBarra: styles.colors.duaEngajamento,
      corFundo: styles.colors.fundoEngajamento,
    },
  ];

  for (const principio of principiosDUA) {
    y = addDuaSectionClean(
      doc,
      y,
      principio.titulo,
      principio.lista,
      principio.corBarra,
      principio.corFundo
    );
  }

  // --- 3. RECURSOS E OBSERVAÇÕES (Design de Card) ---
  y = drawSectionHeader(doc, y, "3. RECURSOS E NOTAS");

  const materiaisRaw = plano.materiais || "Nenhum material listado.";
  const observacoesRaw = plano.observacoes || "Nenhuma observação registrada.";

  autoTable(doc, {
    startY: y,
    head: [
      [
        {
          content: "MATERIAIS NECESSÁRIOS",
          styles: { fillColor: styles.colors.corRecursos },
        },
        {
          content: "OBSERVAÇÕES/REFLEXÕES",
          styles: { fillColor: styles.colors.corObservacoes },
        },
      ],
    ],
    body: [[materiaisRaw, observacoesRaw]],
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.standard,
      textColor: styles.colors.black,
      lineWidth: 0.1,
      lineColor: styles.colors.lightGray,
      cellPadding: 5,
      valign: "top",
      fontStyle: "normal",
      minCellHeight: 10,
    },
    headStyles: {
      textColor: styles.colors.white,
      fontStyle: "bold",
      fontSize: styles.fontSize.standard,
      halign: "center",
      cellPadding: 5,
    },
    columnStyles: {
      // Garante que cada coluna tenha exatamente metade da largura disponível
      0: { fillColor: [255, 251, 245], cellWidth: availablePageWidth / 2 },
      1: {
        fillColor: styles.colors.fundoObservacoes,
        cellWidth: availablePageWidth / 2,
      },
    },
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_AREA_HEIGHT },
  });
  y = doc.lastAutoTable.finalY + 15;

  // --- FINALIZAÇÃO ---
  addHeaderAndFooter(doc);

  const nomeArquivo = `PlanoDUA_${plano.tituloAula.replace(
    /\s+/g,
    "_"
  )}_${dataCriacaoFormatada.replace(/\//g, "-")}.pdf`;
  doc.save(nomeArquivo);
}

export default gerarPDFPlanoDUA;
