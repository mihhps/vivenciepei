import jsPDF from "jspdf";
import "jspdf-autotable";
import { SECOES_AVALIACAO } from "../data/avaliacaoInicial_0a3Data.js";

// Definições de cores e legendas
const coresNiveis = {
  NR: "#e63946",
  AF: "#f4a261",
  AG: "#e9c46a",
  AV: "#2a9d8f",
  AVi: "#8ecae6",
  I: "#4caf50",
  NA: "#adb5bd",
};

const legendasNiveis = {
  NR: "Não Realizado",
  AF: "Ainda em Formação",
  AG: "Atingiu Grande Parte",
  AV: "Avançado",
  AVi: "Avançado com Incentivo",
  I: "Independente",
  NA: "Não se Aplica",
};

// Função para converter Hex para RGB
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

export function gerarPDFAvaliacaoInicial0a3ParaPreencher() {
  const doc = new jsPDF();
  let y = 20;

  // --- Constantes de Configuração ---
  const leftMargin = 14;
  const rightMargin = 14;
  const pageHeight = doc.internal.pageSize.height;
  const bottomMargin = 20;
  const defaultFontFamily = "Helvetica";
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- 1. Desenhar Cabeçalho ---
  doc.setFont(defaultFontFamily, "bold");
  doc.setFontSize(18);
  doc.setTextColor(29, 53, 87);
  doc.text(
    "Avaliação Inicial (0 a 3 anos) - Ficha para Preenchimento Manual",
    pageWidth / 2,
    y,
    {
      align: "center",
    }
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
  doc.text(turmaLabel, leftMargin, y);
  doc.text(dataLabel, leftMargin + 60, y);
  y += 10;

  // --- 2. Iterar e Desenhar Tabelas ---
  SECOES_AVALIACAO.forEach((secao) => {
    if (y + 25 > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }

    // Título da seção principal
    doc.setFontSize(14);
    doc.setTextColor(29, 53, 87);
    doc.setFont(defaultFontFamily, "bold");
    doc.text(secao.titulo, pageWidth / 2, y, {
      align: "center",
    });
    y += 7;

    secao.subareas?.forEach((subarea) => {
      // Subárea
      if (y + 15 > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
        doc.setFontSize(14);
        doc.text(secao.titulo, pageWidth / 2, y, {
          align: "center",
        });
        y += 7;
      }
      doc.setFontSize(12);
      doc.setFont(defaultFontFamily, "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Subárea: ${subarea.nome}`, leftMargin, y);
      y += 5;

      const tableBody = [];
      subarea.habilidades?.forEach((habilidadeItem) => {
        // Linha com a pergunta (mais espaçada e destacada)
        tableBody.push([
          {
            content: habilidadeItem.habilidade,
            colSpan: 2,
            styles: {
              fontStyle: "bold",
              textColor: [0, 0, 0],
              fontSize: 10,
              cellPadding: 4,
              fillColor: [240, 240, 240],
            },
          },
        ]);

        // Linhas com os níveis de avaliação
        Object.entries(habilidadeItem.niveis || {}).forEach(
          ([nivel, descricao]) => {
            const nivelRgb = hexToRgb(coresNiveis[nivel]);
            tableBody.push([
              {
                content: `${nivel}: ${descricao}`,
                styles: {
                  textColor: nivelRgb,
                  fontSize: 8,
                  cellPadding: 2,
                },
              },
              {
                content: "(   )",
                styles: {
                  halign: "center",
                  valign: "middle",
                  fontSize: 12,
                },
              },
            ]);
          }
        );
      });

      if (tableBody.length > 0) {
        doc.autoTable({
          startY: y,
          body: tableBody,
          theme: "grid",
          styles: {
            font: defaultFontFamily,
            lineColor: [200, 200, 200],
            overflow: "linebreak",
          },
          columnStyles: {
            0: {
              cellWidth: "auto",
            },
            1: {
              cellWidth: 20,
            },
          },
          margin: {
            left: leftMargin,
            right: rightMargin,
          },
        });
        y = doc.lastAutoTable.finalY + 5;
      }
    });
  });

  // --- 3. Seção da Legenda dos Níveis ---
  if (y + 40 > pageHeight - bottomMargin) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(14);
  doc.setTextColor(29, 53, 87);
  doc.setFont(defaultFontFamily, "bold");
  doc.text("Legenda", leftMargin, y);
  y += 7;

  Object.entries(legendasNiveis).forEach(([sigla, descricao]) => {
    const corRgb = hexToRgb(coresNiveis[sigla]);
    doc.setFontSize(10);
    doc.setTextColor(corRgb[0], corRgb[1], corRgb[2]);
    doc.setFont(defaultFontFamily, "bold");
    doc.text(sigla, leftMargin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont(defaultFontFamily, "normal");
    doc.text(`: ${descricao}`, leftMargin + doc.getTextWidth(sigla) + 2, y);
    y += 6;
  });
  y += 5;

  // --- 4. Seção de Observações Gerais com linhas ---
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
  const lineSpacing = 6;
  const numLines = Math.floor(obsHeight / lineSpacing);
  const startX = leftMargin;
  const endX = pageWidth - rightMargin;

  doc.setDrawColor(180, 180, 180);
  for (let i = 0; i < numLines; i++) {
    const lineY = y + i * lineSpacing;
    if (lineY > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
      continue;
    }
    doc.line(startX, lineY, endX, lineY);
  }

  doc.save("avaliacao_inicial_manual_0a3.pdf");
}
