// src/utils/gerarAnamnesePDF.js

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { labelMap, secoesAnamneses } from "./anamneseConfig";

// --- Constantes e Estilos (CÓPIAS DO GERAR PEI) ---
const styles = {
  font: "times",
  fontSize: {
    xsmall: 7,
    small: 8,
    medium: 10,
    large: 12,
    title: 18,
  },
  colors: {
    black: [0, 0, 0],
    white: [255, 255, 255],
    grayLight: [230, 230, 230], // Tom mais suave
    red: [255, 0, 0],
    yellow: [255, 255, 0],
    blue: [0, 0, 255],
    magenta: [255, 0, 255],
    purple: [128, 0, 128],
    green: [0, 128, 0],
    orange: [255, 165, 0],
    teal: [0, 128, 128],
    darkBlue: [0, 0, 128],
    maroon: [128, 128, 0],
    olive: [128, 128, 0],
    pink: [255, 192, 203],
    cyan: [0, 255, 255],
  },
};

const HEADER_AREA_HEIGHT = 40;
const FOOTER_AREA_HEIGHT = 25;

function addHeaderAndFooter(doc) {
  const imgWidth = 128;
  const imgHeight = 25;
  const imgX = 10;
  const imgY = 10;
  const pageHeight = doc.internal.pageSize.getHeight();

  try {
    doc.addImage("/logo.jpg", "JPEG", imgX, imgY, imgWidth, imgHeight);
  } catch (e) {
    console.warn("Não foi possível carregar a imagem do logo:", e);
  }

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

function ensurePageSpace(doc, currentY, requiredSpace) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottomLimit = pageHeight - FOOTER_AREA_HEIGHT - 5;
  const contentTopLimit = HEADER_AREA_HEIGHT + 10;

  if (
    currentY < contentTopLimit ||
    currentY + requiredSpace > contentBottomLimit
  ) {
    doc.addPage();
    addHeaderAndFooter(doc);
    return contentTopLimit;
  }
  return currentY;
}

export const gerarAnamnesePDF = async (anamnese, aluno) => {
  if (!anamnese || !aluno) {
    console.error("Dados da anamnese ou do aluno estão ausentes.");
    alert(
      "Não foi possível gerar o PDF: dados do aluno ou da anamnese incompletos."
    );
    return;
  }

  try {
    const doc = new jsPDF("p", "mm", "a4");
    let y = 0;

    addHeaderAndFooter(doc);
    y = HEADER_AREA_HEIGHT + 10;

    // Título Principal
    y = ensurePageSpace(doc, y, 20);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.title);
    doc.text("Anamnese - AEE", doc.internal.pageSize.getWidth() / 2, y, {
      align: "center",
    });
    y += 15;

    // Nome do Aluno
    y = ensurePageSpace(doc, y, 15);
    doc.setFont(styles.font, "normal");
    doc.setFontSize(styles.fontSize.large);
    doc.text(`Aluno(a): ${aluno.nome || "-"}`, 20, y);
    y += 10;

    const contentMargin = 20;
    const availableWidth = doc.internal.pageSize.getWidth() - 2 * contentMargin;

    // Itera sobre cada seção e cria uma única tabela para cada uma
    for (const secao of secoesAnamneses) {
      const tableBody = [];
      secao.campos.forEach((campo) => {
        const valor = anamnese[campo];
        if (valor !== null && valor !== undefined && valor !== "") {
          const pergunta = labelMap[campo] || campo;
          let resposta = String(valor);

          if (typeof valor === "boolean") {
            resposta = valor ? "Sim" : "Não";
          } else if (
            campo === "dataNascimento" &&
            typeof valor === "string" &&
            valor.includes("-")
          ) {
            resposta = valor.split("-").reverse().join("/");
          } else if (campo === "sexo") {
            if (String(valor).toUpperCase() === "M") resposta = "Masculino";
            else if (String(valor).toUpperCase() === "F") resposta = "Feminino";
          } else if (campo === "idade") {
            resposta = `${valor} anos`;
          }

          tableBody.push([pergunta, resposta]);
        }
      });

      if (tableBody.length > 0) {
        // Título da Seção
        y = ensurePageSpace(doc, y, 15);
        doc.setFont(styles.font, "bold");
        doc.setFontSize(styles.fontSize.large);
        doc.text(secao.titulo.toUpperCase(), contentMargin, y);
        y += 8;

        // Tabela de Perguntas e Respostas
        await autoTable(doc, {
          startY: y,
          head: [],
          body: tableBody,
          theme: "grid",
          styles: {
            font: styles.font,
            fontSize: styles.fontSize.medium,
            cellPadding: 2,
            valign: "top",
            textColor: styles.colors.black,
            overflow: "linebreak",
            lineColor: styles.colors.grayLight, // Bordas suaves
            lineWidth: 0.1,
          },
          columnStyles: {
            0: {
              cellWidth: availableWidth * 0.4,
              fontStyle: "bold",
            },
            1: {
              cellWidth: availableWidth * 0.6,
            },
          },
          margin: {
            left: contentMargin,
            right: contentMargin,
            top: HEADER_AREA_HEIGHT,
            bottom: FOOTER_AREA_HEIGHT,
          },
          didDrawPage: (data) => {
            addHeaderAndFooter(doc);
          },
        });
        y = doc.lastAutoTable.finalY + 10;
      }
    }

    doc.save(`Anamnese - ${aluno.nome || "aluno"}.pdf`);
  } catch (error) {
    console.error("Falha ao gerar PDF da Anamnese:", error);
    alert(
      "Não foi possível gerar o PDF. Verifique o console para mais detalhes."
    );
  }
};
