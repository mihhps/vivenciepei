import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";

// Definições de cores (sem alterações)
const coresNiveis = {
  NR: "#e63946",
  AF: "#f4a261",
  AG: "#e9c46a",
  AV: "#2a9d8f",
  AVi: "#8ecae6",
  I: "#4caf50",
  NA: "#adb5bd",
};

// Função para converter Hex para RGB (sem alterações)
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

export function gerarPDFAvaliacaoInicialParaPreencher() {
  const doc = new jsPDF();
  let y = 20;

  // --- Constantes de Configuração ---
  const leftMargin = 14;
  const rightMargin = 14;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const bottomMargin = 20;
  const defaultFontFamily = "helvetica";

  // --- 1. Desenhar Cabeçalho (com espaçamento reduzido) ---
  doc.setFontSize(18);
  doc.setTextColor(29, 53, 87);
  doc.setFont(defaultFontFamily, "bold");
  doc.text(
    "Avaliação Inicial - Ficha para Preenchimento Manual",
    leftMargin,
    y
  );
  y += 10;

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont(defaultFontFamily, "normal");

  const fields = [
    "Escola: _____________________________________________________________________",
    "Professor(a): ________________________________________________________________",
    "Aluno(a): ___________________________________________________________________",
    "Diagnóstico: ________________________________________________________________",
  ];
  fields.forEach((field) => {
    doc.text(field, leftMargin, y);
    y += 7;
  });

  const serieLabel = "Série: ___________";
  const turmaLabel = "Turma: __________";
  const dataLabel = "Data: ____/____/____";
  const serieX = leftMargin;
  const turmaX = serieX + doc.getTextWidth(serieLabel) + 10;
  const dataX = turmaX + doc.getTextWidth(turmaLabel) + 10;
  doc.text(serieLabel, serieX, y);
  doc.text(turmaLabel, turmaX, y);
  doc.text(dataLabel, dataX, y);
  y += 10; // Espaçamento um pouco menor

  // --- 2. Iterar e Desenhar Tabelas Compactadas ---
  Object.entries(avaliacaoInicial).forEach(([area, habilidades]) => {
    if (y + 25 > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }

    // Título da Área com fonte um pouco menor
    doc.setFontSize(14);
    doc.setTextColor(29, 53, 87);
    doc.setFont(defaultFontFamily, "bold");
    doc.text(`Área: ${area}`, leftMargin, y);
    y += 7;

    const tableBody = [];
    habilidades.forEach((habilidadeItem) => {
      tableBody.push([
        {
          content: habilidadeItem.habilidade,
          colSpan: 2,
          styles: {
            fontStyle: "bold",
            fillColor: [235, 235, 235],
            textColor: [0, 0, 0],
          },
        },
      ]);

      Object.entries(habilidadeItem.niveis).forEach(([nivel, descricao]) => {
        tableBody.push([
          {
            content: `${nivel}: ${descricao}`,
            styles: { textColor: hexToRgb(coresNiveis[nivel]), fontSize: 8.5 }, // Fonte um pouco menor
          },
          {
            content: "(   )",
            styles: { halign: "center", valign: "middle", fontSize: 12 },
          },
        ]);
      });
      // Opcional: remover a linha de espaço em branco se quiser ainda mais compacto
      // tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 4 } }]);
    });

    autoTable(doc, {
      startY: y,
      body: tableBody,
      theme: "grid",
      styles: {
        font: defaultFontFamily,
        cellPadding: 1.5, // Preenchimento menor
        lineColor: [200, 200, 200],
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 20 },
      },
      margin: { left: leftMargin, right: rightMargin },
    });

    y = doc.lastAutoTable.finalY + 5; // Espaçamento menor após a tabela
  });

  // --- 3. Seção ÚNICA de Observações Gerais no Final ---
  // Verifica se há espaço para o título e um pedaço do quadro
  if (y + 40 > pageHeight - bottomMargin) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(29, 53, 87);
  doc.setFont(defaultFontFamily, "bold");
  doc.text("Observações Gerais", leftMargin, y);
  y += 7;

  // Desenha um retângulo que ocupa o resto da página
  const obsHeight = pageHeight - y - bottomMargin;
  doc.setDrawColor(180, 180, 180);
  doc.rect(leftMargin, y, pageWidth - leftMargin - rightMargin, obsHeight);

  doc.save("avaliacao_inicial_manual_compacta.pdf");
}
