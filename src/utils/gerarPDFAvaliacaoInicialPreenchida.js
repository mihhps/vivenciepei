// src/utils/gerarPDFAvaliacaoInicialPreenchida.js
import jsPDF from "jspdf";
import {
  collection,
  query,
  where,
  getDocs,
  doc as firestoreDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import {
  pdfStyles,
  coresPorNivel,
  legendaNiveis,
  formatarData,
  addFooter,
  drawDocumentHeader,
  getSafeColor,
} from "./pdfUtils";

export async function gerarPDFAvaliacaoInicialPreenchida(
  aluno,
  inicioAvaliacaoFirestore, // Parâmetro renomeado para 'inicio' no Firestore
  proximaAvaliacaoFirestore, // Parâmetro 'proximaAvaliacao' no Firestore
  respostasDoFormulario,
  observacoesDoFormulario
) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 10;
  const rightMarginDoc = doc.internal.pageSize.getWidth() - 10;

  let y = 10;

  // --- Variáveis de Configuração da Tabela (Simplificada para 2 Colunas) ---
  const defaultFontFamily = pdfStyles.font;
  const defaultFontSize = pdfStyles.fontSize.small;
  const defaultLineHeight = defaultFontSize * pdfStyles.lineHeightMultiplier;
  const cellPaddingX = pdfStyles.cellPadding.x;
  const cellPaddingY = pdfStyles.cellPadding.y;

  // Simplificando as definições das colunas da tabela:
  // Removendo 'niveisDisponiveis', 'colNivelWidth', 'totalLevelsWidth', etc.
  const colNivelAvaliadoWidth = 25; // Largura da coluna para a bolinha de nível
  const colHabilidadeWidth =
    rightMarginDoc - leftMargin - colNivelAvaliadoWidth - 1; // Largura da coluna "Habilidade"
  const totalTableWidth = colHabilidadeWidth + colNivelAvaliadoWidth; // Largura total da tabela
  const tableXEnd = leftMargin + totalTableWidth; // Posição X final da tabela

  const minCellContentHeight = defaultFontSize * 1.5 + 2 * cellPaddingY;
  const minRowHeight = Math.max(16, minCellContentHeight);

  const evaluatedLevelCircleRadius = 4; // Raio da bolinha
  const evaluatedLevelFontSize = 8; // Tamanho da fonte da sigla na bolinha
  const evaluatedLevelTextOffsetY = evaluatedLevelFontSize * 0.35;

  const PAGE_BOTTOM_MARGIN = 20;
  const OBSERVATION_TITLE_SPACING = 6;
  const OBSERVATION_LINE_SPACING = 8;
  const SECTION_SPACING = 15;
  const AREA_TITLE_SPACING_AFTER = 10;
  const TABLE_SPACING_AFTER = 10;

  doc.setFont(defaultFontFamily, "normal");
  doc.setFontSize(defaultFontSize);

  // --- Funções Auxiliares de Desenho (locais) ---

  /**
   * Desenha o cabeçalho da tabela de habilidades com apenas duas colunas: Habilidade e Nível Avaliado.
   * @param {number} startY Posição Y inicial para desenhar o cabeçalho.
   * @returns {number} A nova posição Y após desenhar o cabeçalho.
   */
  const drawSkillsTableHeader = (startY) => {
    const headerRowHeight = minRowHeight;
    const headerStartY = startY;

    doc.setDrawColor(...getSafeColor(pdfStyles.colors.darkGray));
    doc.setLineWidth(0.35);
    doc.line(leftMargin, headerStartY, tableXEnd, headerStartY);

    doc.setFillColor(...getSafeColor(pdfStyles.colors.lightGray));
    doc.rect(leftMargin, headerStartY, totalTableWidth, headerRowHeight, "F");

    doc.setFontSize(defaultFontSize + 1);
    doc.setTextColor(...getSafeColor(pdfStyles.colors.black));
    doc.setFont(pdfStyles.font, "bold");
    doc.text(
      "Habilidade",
      leftMargin + cellPaddingX,
      headerStartY + headerRowHeight / 2,
      { baseline: "middle" }
    );

    doc.text(
      "Nível Avaliado",
      leftMargin + colHabilidadeWidth + colNivelAvaliadoWidth / 2, // Alinha ao centro da coluna Nível Avaliado
      headerStartY + headerRowHeight / 2,
      { align: "center", baseline: "middle" }
    );
    doc.setFont(defaultFontFamily, "normal");
    doc.setFontSize(defaultFontSize);

    doc.setDrawColor(...getSafeColor(pdfStyles.colors.darkGray));
    doc.line(
      leftMargin,
      headerStartY,
      leftMargin,
      headerStartY + headerRowHeight
    ); // Borda esquerda
    doc.line(
      leftMargin + colHabilidadeWidth,
      headerStartY,
      leftMargin + colHabilidadeWidth,
      headerStartY + headerRowHeight
    ); // Borda entre Habilidade e Nível
    doc.line(
      tableXEnd,
      headerStartY,
      tableXEnd,
      headerStartY + headerRowHeight
    ); // Borda direita
    doc.line(
      leftMargin,
      headerStartY + headerRowHeight,
      tableXEnd,
      headerStartY + headerRowHeight
    ); // Linha inferior do cabeçalho

    return headerStartY + headerRowHeight;
  };

  const checkPageBreak = (
    currentY,
    requiredSpace,
    isTableContinuation = false
  ) => {
    if (currentY + requiredSpace > pageHeight - PAGE_BOTTOM_MARGIN) {
      doc.addPage();
      doc.setFont(defaultFontFamily, "normal");
      doc.setFontSize(defaultFontSize);
      let newY = PAGE_BOTTOM_MARGIN;

      if (isTableContinuation) {
        newY = drawSkillsTableHeader(newY); // Redesenha o cabeçalho da tabela na nova página
      }
      return newY;
    }
    return currentY;
  };

  const drawObservations = (areaName) => {
    const observacao = observacoesDoFormulario[areaName] || "";
    const obsLinesHeight = observacao
      ? doc.splitTextToSize(observacao, rightMarginDoc - leftMargin).length *
        defaultLineHeight
      : 0;
    y = checkPageBreak(
      y,
      SECTION_SPACING + obsLinesHeight + OBSERVATION_LINE_SPACING * 2
    );

    doc.setFontSize(defaultFontSize);
    doc.setTextColor(...getSafeColor(pdfStyles.colors.black));
    doc.setFont(defaultFontFamily, "bold");
    doc.text("Observações:", leftMargin, y);
    y += OBSERVATION_TITLE_SPACING;

    if (observacao) {
      doc.setFont(defaultFontFamily, "normal");
      const obsLines = doc.splitTextToSize(
        observacao,
        rightMarginDoc - leftMargin
      );
      obsLines.forEach((line) => {
        doc.text(line, leftMargin, y);
        y += defaultLineHeight;
      });
    } else {
      doc.line(leftMargin, y, rightMarginDoc, y);
      y += OBSERVATION_LINE_SPACING;
      doc.line(leftMargin, y, rightMarginDoc, y);
    }
    y += SECTION_SPACING;
  };

  // --- INÍCIO DA GERAÇÃO DO PDF ---

  // 1. Buscar nome da escola
  let nomeEscola = "-";
  if (!aluno?.escolaId) {
    console.warn(
      "Aluno.escolaId está faltando. Nome da escola não será preenchido."
    );
  } else {
    try {
      const escolaRef = firestoreDoc(db, "escolas", aluno.escolaId);
      const escolaSnap = await getDoc(escolaRef);
      if (escolaSnap.exists()) {
        nomeEscola = escolaSnap.data().nome || "-";
      } else {
        console.warn(`Escola com ID ${aluno.escolaId} não encontrada.`);
      }
    } catch (err) {
      console.error("Erro ao buscar nome da escola para o cabeçalho:", err);
    }
  }

  // 2. Validação dos dados do aluno e das datas de avaliação
  if (!aluno?.nascimento) {
    console.warn(
      "aluno.nascimento (Data de Nascimento) está faltando ou é inválido."
    );
  }
  if (!aluno?.cpf) {
    // Campo CPF está ausente no seu objeto aluno, mas é validado aqui se você o adicionar.
    console.warn("aluno.cpf está faltando.");
  }
  if (!aluno?.turma) {
    console.warn("aluno.turma está faltando.");
  }
  if (!inicioAvaliacaoFirestore) {
    console.warn(
      "O parâmetro 'inicioAvaliacaoFirestore' (Data de Início da Avaliação) está faltando na chamada da função."
    );
  }
  if (!proximaAvaliacaoFirestore) {
    console.warn(
      "O parâmetro 'proximaAvaliacaoFirestore' (Próxima Avaliação) está faltando na chamada da função."
    );
  }

  // 3. Chamar a função de cabeçalho (drawDocumentHeader)
  y = await drawDocumentHeader(
    doc,
    y,
    "Avaliação Inicial - Relatório Preenchido",
    aluno,
    nomeEscola,
    {
      dataAvaliacao: inicioAvaliacaoFirestore,
      proximaAvaliacao: proximaAvaliacaoFirestore,
    }
  );

  // --- Iterar e Desenhar Áreas e Habilidades (corpo da tabela) ---
  Object.entries(avaliacaoInicial).forEach(([area, habilidades]) => {
    y = checkPageBreak(y, SECTION_SPACING + minRowHeight);

    doc.setFontSize(pdfStyles.fontSize.large);
    doc.setTextColor(...getSafeColor(pdfStyles.colors.darkBlue));
    doc.setFont(pdfStyles.font, "bold");
    doc.text(`Área: ${area}`, leftMargin, y);
    y += AREA_TITLE_SPACING_AFTER;

    y = drawSkillsTableHeader(y); // Desenha o cabeçalho da tabela (com 2 colunas)

    habilidades.forEach((item) => {
      const cleanHabilidadeText = item.habilidade.startsWith("- ")
        ? item.habilidade.substring(2)
        : item.habilidade;

      const textColWidthForSplit = colHabilidadeWidth - 2 * cellPaddingX;
      doc.setFontSize(defaultFontSize);
      doc.setFont(pdfStyles.font, "normal");
      const textLines = doc.splitTextToSize(
        cleanHabilidadeText,
        textColWidthForSplit
      );
      const textRenderHeight = textLines.length * defaultLineHeight;
      const currentRowHeight = Math.max(
        textRenderHeight + 2 * cellPaddingY,
        minRowHeight
      );

      y = checkPageBreak(y, currentRowHeight, true);

      const rowStartY = y;

      doc.setDrawColor(...getSafeColor(pdfStyles.colors.mediumGray));
      doc.setLineWidth(0.35);
      doc.setFillColor(...getSafeColor(pdfStyles.colors.white));
      doc.rect(leftMargin, rowStartY, totalTableWidth, currentRowHeight, "F");

      doc.setTextColor(...getSafeColor(pdfStyles.colors.black));
      doc.setFontSize(defaultFontSize);
      doc.text(
        textLines,
        leftMargin + cellPaddingX,
        rowStartY + currentRowHeight / 2,
        { baseline: "middle" }
      );

      // Desenhar as linhas verticais das colunas da tabela (apenas 2 colunas)
      doc.line(leftMargin, rowStartY, leftMargin, rowStartY + currentRowHeight); // Borda esquerda
      doc.line(
        leftMargin + colHabilidadeWidth,
        rowStartY,
        leftMargin + colHabilidadeWidth,
        rowStartY + currentRowHeight
      ); // Borda entre Habilidade e Nível
      doc.line(tableXEnd, rowStartY, tableXEnd, rowStartY + currentRowHeight); // Borda direita

      // --- Desenhar APENAS a bolinha do nível AVALIADO na coluna "Nível Avaliado" ---
      const respostaNivel = respostasDoFormulario?.[area]?.[item.habilidade];

      if (respostaNivel && coresPorNivel[respostaNivel]) {
        // Verifica se o nível existe nas cores
        const nivelColX = leftMargin + colHabilidadeWidth; // Posição X da coluna "Nível Avaliado"
        const circleX = nivelColX + colNivelAvaliadoWidth / 2; // Centro da coluna
        const circleY = rowStartY + currentRowHeight / 2;

        const corParaPreencher = getSafeColor(coresPorNivel[respostaNivel]);
        doc.setFillColor(...corParaPreencher);
        doc.circle(circleX, circleY, evaluatedLevelCircleRadius, "F");

        doc.setTextColor(...getSafeColor(pdfStyles.colors.white));
        doc.setFontSize(evaluatedLevelFontSize);
        doc.setFont(pdfStyles.font, "bold");
        doc.text(respostaNivel, circleX, circleY + evaluatedLevelTextOffsetY, {
          align: "center",
          baseline: "middle",
        });
        doc.setFont(defaultFontFamily, "normal");
        doc.setFontSize(defaultFontSize);
      } else if (respostaNivel) {
        console.warn(
          `Nível '${respostaNivel}' encontrado para a habilidade '${item.habilidade}' na área '${area}', mas não está definido em 'coresPorNivel'. Bolinha não será colorida ou será preta.`
        );
      }

      y += currentRowHeight;
      doc.setDrawColor(...getSafeColor(pdfStyles.colors.mediumGray));
      doc.line(leftMargin, y, tableXEnd, y); // Linha inferior da linha da tabela
    });

    y += TABLE_SPACING_AFTER;
    drawObservations(area);
  });

  // --- Legenda dos Níveis ---
  y = checkPageBreak(
    y,
    SECTION_SPACING + Object.keys(legendaNiveis).length * 10
  );

  doc.setFontSize(pdfStyles.fontSize.large);
  doc.setTextColor(...getSafeColor(pdfStyles.colors.darkBlue));
  doc.setFont(pdfStyles.font, "bold");
  doc.text("Legenda dos Níveis:", leftMargin, y);
  y += AREA_TITLE_SPACING_AFTER;

  doc.setFontSize(defaultFontSize);
  doc.setFont(pdfStyles.font, "normal");
  Object.entries(legendaNiveis).forEach(([nivel, descricao]) => {
    y = checkPageBreak(y, 10);

    const corDaLegenda = getSafeColor(coresPorNivel[nivel]);
    doc.setFillColor(...corDaLegenda);

    doc.rect(leftMargin, y - 4, 8, 6, "F"); // Desenha um pequeno retângulo colorido
    doc.setTextColor(...getSafeColor(pdfStyles.colors.black));
    doc.text(`${nivel} – ${descricao}`, leftMargin + 10, y);
    y += 10;
  });

  addFooter(doc, pageHeight);

  doc.save(
    `avaliacao_inicial_${aluno?.nome?.replace(/\s+/g, "_") || "aluno"}.pdf`
  );
}
