import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getDoc, doc as firestoreDoc } from "firebase/firestore";
import { db } from "../firebase";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import {
  pdfStyles,
  coresPorNivel,
  legendaNiveis,
  formatarData,
  drawDocumentHeader,
  addHeaderAndFooter,
  ensurePageSpace,
} from "./pdfUtils";

// Mapa de busca para as descrições detalhadas
const habilidadeDescricaoMap = {};
Object.values(avaliacaoInicial).forEach((areaArray) => {
  areaArray.forEach((skillObject) => {
    habilidadeDescricaoMap[skillObject.habilidade] = skillObject.niveis;
  });
});

export async function gerarPDFAvaliacaoInicialPreenchida(
  aluno,
  inicioAvaliacaoFirestore,
  proximaAvaliacaoFirestore,
  respostasDoFormulario,
  observacoesDoFormulario
) {
  const doc = new jsPDF();
  let y;

  // --- BUSCAR NOME DA ESCOLA ---
  let nomeEscola = "-";
  if (aluno?.escolaId) {
    try {
      const escolaRef = firestoreDoc(db, "escolas", aluno.escolaId);
      const escolaSnap = await getDoc(escolaRef);
      if (escolaSnap.exists()) {
        nomeEscola = escolaSnap.data().nome || "-";
      }
    } catch (err) {
      console.error("Erro ao buscar nome da escola:", err);
    }
  }

  // --- CONSTRUIR CABEÇALHO USANDO A FUNÇÃO CORRETA ---
  const avaliacaoInfo = {
    dataAvaliacao: inicioAvaliacaoFirestore,
    proximaAvaliacao: proximaAvaliacaoFirestore,
  };

  y = await drawDocumentHeader(
    doc,
    10, // Posição Y inicial
    "Avaliação Inicial - Relatório Preenchido",
    aluno,
    nomeEscola,
    avaliacaoInfo
  );

  // --- ITERAR E DESENHAR SEÇÕES ---
  Object.entries(avaliacaoInicial).forEach(([area, habilidades]) => {
    const linhasDaArea = habilidades
      .map((item) => {
        const habilidade = item.habilidade;
        const nivel = respostasDoFormulario?.[area]?.[habilidade];
        if (!nivel) return null;
        const descricao =
          (habilidadeDescricaoMap[habilidade] &&
            habilidadeDescricaoMap[habilidade][nivel]) ||
          "N/A";
        return [habilidade, nivel, descricao];
      })
      .filter(Boolean);

    if (linhasDaArea.length === 0) return;

    y = ensurePageSpace(doc, y, 30);

    doc.setFontSize(pdfStyles.fontSize.large);
    doc.setTextColor(41, 52, 98);
    doc.setFont(pdfStyles.font, "bold");
    doc.text(`Área: ${area}`, 20, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Habilidade", "Nível", "Descrição do Nível"]],
      body: linhasDaArea,
      theme: "grid",
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: 0,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: "auto" },
      },
      didParseCell: (data) => {
        if (data.column.index === 1 && data.section === "body") {
          const nivel = data.cell.raw.toString();
          const cor = coresPorNivel[nivel];
          if (cor) {
            data.cell.styles.fillColor = cor;
            const [r, g, b] = cor;
            const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            data.cell.styles.textColor =
              luminancia > 0.5 ? [0, 0, 0] : [255, 255, 255];
          }
        }
      },
      margin: { bottom: 40 }, // Garante que a tabela não invada o rodapé.
      didDrawPage: (data) => {
        addHeaderAndFooter(doc);
      },
    });

    y = doc.lastAutoTable.finalY + 5;

    const observacao = (observacoesDoFormulario[area] || "").trim();
    if (observacao) {
      y = ensurePageSpace(doc, y, 20);
      doc.setFontSize(pdfStyles.fontSize.medium);
      doc.setFont(pdfStyles.font, "bold");
      doc.text("Observações:", 20, y);
      y += 6;
      doc.setFont(pdfStyles.font, "normal");
      doc.setFontSize(pdfStyles.fontSize.small);
      const obsLines = doc.splitTextToSize(
        observacao,
        doc.internal.pageSize.getWidth() - 40
      );
      doc.text(obsLines, 20, y);
      y += obsLines.length * 4 + 10;
    }
    y += 10;
  });

  // --- ADICIONAR LEGENDA NO FINAL ---
  y = ensurePageSpace(doc, y, 50);
  doc.setFont(pdfStyles.font, "bold");
  doc.setFontSize(pdfStyles.fontSize.large);
  doc.text("Legenda dos Níveis:", 20, y);
  y += 8;

  let legendaY = y;
  let legendaX = 20;

  Object.entries(legendaNiveis).forEach(([sigla, descricao]) => {
    doc.setFontSize(pdfStyles.fontSize.small);
    doc.setFont(pdfStyles.font, "normal");

    const texto = `${sigla} – ${descricao}`;
    const textoWidth = doc.getTextWidth(texto) + 15;

    if (legendaX + textoWidth > doc.internal.pageSize.getWidth() - 20) {
      legendaY += 6;
      legendaX = 20;
    }

    const corDaLegenda = coresPorNivel[sigla] || [0, 0, 0];
    doc.setFillColor(...corDaLegenda);
    doc.rect(legendaX, legendaY - 3, 4, 4, "F");
    doc.text(texto, legendaX + 6, legendaY);
    legendaX += textoWidth;
  });

  doc.save(
    `avaliacao_inicial_${aluno?.nome?.replace(/\s+/g, "_") || "aluno"}.pdf`
  );
}
