import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SECOES_AVALIACAO } from "../data/avaliacaoInicial_0a3Data.js";

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

export function gerarPDFAvaliacaoInicial0a3ParaPreencher() {
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
    "Avaliação Inicial (0 a 3 anos) - Ficha para Preenchimento Manual",
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
    "Data de Nasc.: _______________",
    "Idade: _____________________",
  ];
  fields.forEach((field) => {
    doc.text(field, leftMargin, y);
    y += 7;
  });

  const turmaLabel = "Turma: __________";
  const dataLabel = "Data: ____/____/____";
  const turmaX = leftMargin;
  const dataX = turmaX + doc.getTextWidth(turmaLabel) + 10;
  doc.text(turmaLabel, turmaX, y);
  doc.text(dataLabel, dataX, y);
  y += 10;

  // --- 2. Iterar e Desenhar Tabelas Compactadas ---
  SECOES_AVALIACAO.forEach((secao) => {
    if (y + 25 > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(29, 53, 87);
    doc.setFont(defaultFontFamily, "bold");
    doc.text(secao.titulo, leftMargin, y);
    y += 7;

    const tableBody = [];
    secao.subareas?.forEach((subarea) => {
      tableBody.push([
        {
          content: `Subárea: ${subarea.nome}`,
          colSpan: 2,
          styles: {
            fontStyle: "bold",
            fillColor: [235, 235, 235],
            textColor: [0, 0, 0],
          },
        },
      ]);
      subarea.habilidades?.forEach((habilidadeItem) => {
        tableBody.push([
          {
            content: habilidadeItem.habilidade,
            colSpan: 2,
            styles: {
              fontStyle: "normal",
              textColor: [0, 0, 0],
            },
          },
        ]);
        Object.entries(habilidadeItem.niveis).forEach(([nivel, descricao]) => {
          tableBody.push([
            {
              content: `${nivel}: ${descricao}`,
              styles: {
                textColor: hexToRgb(coresNiveis[nivel]),
                fontSize: 8.5,
              },
            },
            {
              content: "(   )",
              styles: { halign: "center", valign: "middle", fontSize: 12 },
            },
          ]);
        });
      });
    });

    autoTable(doc, {
      startY: y,
      body: tableBody,
      theme: "grid",
      styles: {
        font: defaultFontFamily,
        cellPadding: 1.5,
        lineColor: [200, 200, 200],
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 20 },
      },
      margin: { left: leftMargin, right: rightMargin },
    });

    y = doc.lastAutoTable.finalY + 5;
  });

  // --- 3. Seção ÚNICA de Observações Gerais no Final ---
  if (y + 40 > pageHeight - bottomMargin) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(29, 53, 87);
  doc.setFont(defaultFontFamily, "bold");
  doc.text("Observações Gerais", leftMargin, y);
  y += 7;

  const obsHeight = pageHeight - y - bottomMargin;
  doc.setDrawColor(180, 180, 180);
  doc.rect(leftMargin, y, pageWidth - leftMargin - rightMargin, obsHeight);

  doc.save("avaliacao_inicial_manual_0a3_compacta.pdf");
}
