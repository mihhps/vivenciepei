import jsPDF from "jspdf";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";

const coresNiveis = {
  NR: "#e63946",
  AF: "#f4a261",
  AG: "#e9c46a",
  AV: "#2a9d8f",
  AVi: "#8ecae6",
  I: "#4caf50",
  NA: "#adb5bd",
};

const legendaCompleta = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
  NA: "Não aplicável",
};

const niveis = Object.keys(coresNiveis);

export function gerarPDFAvaliacaoInicialParaPreencher() {
  const doc = new jsPDF();
  let y = 20;

  // --- Variáveis de Configuração Global ---
  const leftMargin = 14;
  const rightMarginDoc = 195; // Borda direita da página para o conteúdo
  const pageHeight = doc.internal.pageSize.height;
  const bottomMargin = 20;
  const defaultFontFamily = "helvetica";
  const defaultFontSize = 9;
  const defaultLineHeight = defaultFontSize * 1.15;
  const cellPaddingX = 2;
  const cellPaddingY = 2;

  // --- Definições das colunas da "tabela" ---
  const colNivelWidth = 9.8;
  const totalLevelsWidth = niveis.length * colNivelWidth;
  const colHabilidadeWidth = rightMarginDoc - leftMargin - totalLevelsWidth - 1;
  const totalTableWidth = colHabilidadeWidth + totalLevelsWidth;
  const tableXEnd = leftMargin + totalTableWidth;

  const minCellContentHeight = defaultFontSize * 1.5 + 2 * cellPaddingY;
  const minRowHeight = Math.max(16, minCellContentHeight);

  // Propriedades da bolinha do nível
  const circleRadius = 3.5;
  const circleFontSize = 6;
  const circleTextOffsetY = circleFontSize * 0.35;

  // Definir a fonte padrão para todo o documento
  doc.setFont(defaultFontFamily, "normal");
  doc.setFontSize(defaultFontSize);

  // --- Funções Auxiliares ---
  // Função para verificar e adicionar nova página
  // Adiciona um parâmetro `isTableContinuation` para redesenhar o cabeçalho da tabela ou a grade
  const checkPageBreak = (
    currentY,
    requiredSpace,
    isTableContinuation = false
  ) => {
    if (currentY + requiredSpace > pageHeight - bottomMargin) {
      doc.addPage();
      doc.setFont(defaultFontFamily, "normal");
      doc.setFontSize(defaultFontSize);
      let newY = 20;

      if (isTableContinuation) {
        // Redesenha o cabeçalho da tabela se a quebra ocorreu ANTES do corpo da tabela
        // OU redesenha apenas as linhas da grade se a quebra foi NO MEIO do corpo.
        // Vamos redesenhar o cabeçalho SEMPRE que a quebra de página for dentro de uma área de habilidade
        const headerRowHeight = minRowHeight;
        const headerStartY = newY;

        // Desenha a linha horizontal SUPERIOR do cabeçalho
        doc.setDrawColor(50, 50, 50);
        doc.setLineWidth(0.35);
        doc.line(leftMargin, headerStartY, tableXEnd, headerStartY);

        // Fundo do cabeçalho
        doc.setFillColor(230, 230, 230);
        doc.rect(
          leftMargin,
          headerStartY,
          totalTableWidth,
          headerRowHeight,
          "F"
        );

        // Texto "Habilidade" no cabeçalho
        doc.setFontSize(defaultFontSize + 1);
        doc.setTextColor(0, 0, 0);
        doc.setFont(defaultFontFamily, "bold");
        doc.text(
          "Habilidade",
          leftMargin + cellPaddingX,
          headerStartY + headerRowHeight / 2,
          { baseline: "middle" }
        );

        // Níveis no cabeçalho
        niveis.forEach((nivel, idx) => {
          const colX = leftMargin + colHabilidadeWidth + idx * colNivelWidth;
          doc.setFontSize(defaultFontSize - 1);
          doc.text(
            nivel,
            colX + colNivelWidth / 2,
            headerStartY + headerRowHeight / 2,
            { align: "center", baseline: "middle" }
          );
        });
        doc.setFont(defaultFontFamily, "normal");
        doc.setFontSize(defaultFontSize);

        // Desenhar as linhas verticais do cabeçalho
        doc.setDrawColor(50, 50, 50);
        doc.line(
          leftMargin,
          headerStartY,
          leftMargin,
          headerStartY + headerRowHeight
        );
        doc.line(
          leftMargin + colHabilidadeWidth,
          headerStartY,
          leftMargin + colHabilidadeWidth,
          headerStartY + headerRowHeight
        );
        for (let i = 0; i <= niveis.length; i++) {
          const xPos = leftMargin + colHabilidadeWidth + i * colNivelWidth;
          doc.line(xPos, headerStartY, xPos, headerStartY + headerRowHeight);
        }
        // Linha horizontal inferior do cabeçalho
        doc.line(
          leftMargin,
          headerStartY + headerRowHeight,
          tableXEnd,
          headerStartY + headerRowHeight
        );

        newY += headerRowHeight; // Avança Y após o cabeçalho redesenhado
      }
      return newY;
    }
    return currentY;
  };

  // --- FUNÇÃO drawHeader REORGANIZADA COM AJUSTES DE LINHAS ---
  const drawHeader = () => {
    doc.setFontSize(18);
    doc.setTextColor(29, 53, 87);
    doc.setFont(defaultFontFamily, "bold");
    doc.text(
      "Avaliação Inicial - Ficha para Preenchimento Manual",
      leftMargin,
      y
    );
    y += 15; // Espaço após o título principal

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(defaultFontFamily, "normal");

    // Ordem desejada: ESCOLA, PROFESSOR, ALUNO, SÉRIE, TURMA, DATA

    // ESCOLA
    doc.text(
      "Escola: _____________________________________________________________________",
      leftMargin,
      y
    );
    y += 8;

    // PROFESSOR
    doc.text(
      "Professor(a): ________________________________________________________________",
      leftMargin,
      y
    ); // Aumentado o sublinhado
    y += 8;

    // ALUNO
    doc.text(
      "Aluno(a): ___________________________________________________________________",
      leftMargin,
      y
    ); // Aumentado o sublinhado
    y += 8; // Nova linha para o aluno (já estava assim, mas reforçando)

    // DIAGNÓSTICO
    doc.text(
      "Diagnóstico: ________________________________________________________________",
      leftMargin,
      y
    ); // Aumentado o sublinhado
    y += 8; // Nova linha para o aluno (já estava assim, mas reforçando)

    // SÉRIE, TURMA e DATA (AGORA TODOS NA MESMA LINHA)
    const serieLabel = "Série: ___________";
    const turmaLabel = "Turma: __________";
    const dataLabel = "Data: ____/____/____";

    // Calcular as posições X
    const serieX = leftMargin;
    const turmaX = serieX + doc.getTextWidth(serieLabel) + 10; // 10 é o espaçamento entre Série e Turma
    const dataX = turmaX + doc.getTextWidth(turmaLabel) + 10; // 10 é o espaçamento entre Turma e Data

    // Desenhar na mesma linha 'y'
    doc.text(serieLabel, serieX, y);
    doc.text(turmaLabel, turmaX, y);
    doc.text(dataLabel, dataX, y);

    y += 8; // Espaço após a linha de Série/Turma/Data

    y += 15; // Espaço antes do próximo bloco (Área)
  };
  const drawObservations = () => {
    y = checkPageBreak(y, 25);
    doc.setFontSize(defaultFontSize);
    doc.setTextColor(0, 0, 0);
    doc.setFont(defaultFontFamily, "normal");
    doc.text("Observações:", leftMargin, y);
    y += 6;
    doc.line(leftMargin, y, rightMarginDoc, y);
    y += 8;
    doc.line(leftMargin, y, rightMarginDoc, y);
    y += 15;
  };

  // --- Desenhar o Cabeçalho ---
  drawHeader();

  // --- Iterar e Desenhar Áreas e Habilidades (Desenho Manual com Tabela Organizada) ---
  Object.entries(avaliacaoInicial).forEach(([area, habilidades]) => {
    y = checkPageBreak(y, 30);

    doc.setFontSize(15);
    doc.setTextColor(29, 53, 87);
    doc.setFont(defaultFontFamily, "bold");
    doc.text(`Área: ${area}`, leftMargin, y);
    y += 10;

    // --- Desenhar o Cabeçalho da Tabela ---
    const headerRowHeight = minRowHeight;
    const headerStartY = y;

    // Desenhar a linha horizontal SUPERIOR da tabela
    doc.setDrawColor(50, 50, 50); // Cor da linha mais escura
    doc.setLineWidth(0.35); // Espessura da linha
    doc.line(leftMargin, headerStartY, tableXEnd, headerStartY);

    // Fundo do cabeçalho
    doc.setFillColor(230, 230, 230);
    doc.rect(leftMargin, headerStartY, totalTableWidth, headerRowHeight, "F");

    // Texto "Habilidade" no cabeçalho
    doc.setFontSize(defaultFontSize + 1);
    doc.setTextColor(0, 0, 0);
    doc.setFont(defaultFontFamily, "bold");
    doc.text(
      "Habilidade",
      leftMargin + cellPaddingX,
      headerStartY + headerRowHeight / 2,
      { baseline: "middle" }
    );

    // Níveis no cabeçalho
    niveis.forEach((nivel, idx) => {
      const colX = leftMargin + colHabilidadeWidth + idx * colNivelWidth;
      doc.setFontSize(defaultFontSize - 1);
      doc.text(
        nivel,
        colX + colNivelWidth / 2,
        headerStartY + headerRowHeight / 2,
        { align: "center", baseline: "middle" }
      );
    });
    doc.setFont(defaultFontFamily, "normal");
    doc.setFontSize(defaultFontSize);

    // Desenhar as linhas verticais do cabeçalho
    doc.setDrawColor(50, 50, 50);
    doc.line(
      leftMargin,
      headerStartY,
      leftMargin,
      headerStartY + headerRowHeight
    );
    doc.line(
      leftMargin + colHabilidadeWidth,
      headerStartY,
      leftMargin + colHabilidadeWidth,
      headerStartY + headerRowHeight
    );
    for (let i = 0; i <= niveis.length; i++) {
      const xPos = leftMargin + colHabilidadeWidth + i * colNivelWidth;
      doc.line(xPos, headerStartY, xPos, headerRowHeight + headerStartY);
    }
    // Linha horizontal inferior do cabeçalho
    doc.line(
      leftMargin,
      headerStartY + headerRowHeight,
      tableXEnd,
      headerStartY + headerRowHeight
    );

    y = headerStartY + headerRowHeight; // Atualiza Y para o início do corpo da tabela

    // --- Desenhar cada habilidade (corpo da tabela) ---
    habilidades.forEach((item) => {
      const cleanHabilidadeText = item.habilidade.startsWith("- ")
        ? item.habilidade.substring(2)
        : item.habilidade;

      const textColWidthForSplit = colHabilidadeWidth - 2 * cellPaddingX;
      doc.setFontSize(defaultFontSize);
      doc.setFont(defaultFontFamily, "normal");
      const textLines = doc.splitTextToSize(
        cleanHabilidadeText,
        textColWidthForSplit
      );
      const textRenderHeight = textLines.length * defaultLineHeight;
      const currentRowHeight = Math.max(
        textRenderHeight + 2 * cellPaddingY,
        minRowHeight
      );

      // Passa `true` para indicar que é continuação de tabela, se houver quebra
      y = checkPageBreak(y, currentRowHeight, true);

      const rowStartY = y;

      // Desenhar o fundo da linha (retângulo branco)
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.35);
      doc.setFillColor(255, 255, 255);
      doc.rect(leftMargin, rowStartY, totalTableWidth, currentRowHeight, "F");

      // Texto da habilidade
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(defaultFontSize);
      doc.text(
        textLines,
        leftMargin + cellPaddingX,
        rowStartY + currentRowHeight / 2,
        { baseline: "middle" }
      );

      // Desenhar as linhas verticais das colunas da tabela
      doc.line(leftMargin, rowStartY, leftMargin, rowStartY + currentRowHeight); // Linha vertical MAIS À ESQUERDA
      doc.line(
        leftMargin + colHabilidadeWidth,
        rowStartY,
        leftMargin + colHabilidadeWidth,
        rowStartY + currentRowHeight
      ); // Linha após "Habilidade"
      for (let i = 0; i < niveis.length; i++) {
        const colX = leftMargin + colHabilidadeWidth + (i + 1) * colNivelWidth;
        doc.line(colX, rowStartY, colX, rowStartY + currentRowHeight);
      }
      doc.line(tableXEnd, rowStartY, tableXEnd, rowStartY + currentRowHeight); // Linha vertical FINAL À DIREITA

      // Desenhar bolinhas de nível
      niveis.forEach((nivel, idx) => {
        const colX = leftMargin + colHabilidadeWidth + idx * colNivelWidth;
        const circleX = colX + colNivelWidth / 2;
        const circleY = rowStartY + currentRowHeight / 2;

        doc.setFillColor(coresNiveis[nivel]);
        doc.circle(circleX, circleY, circleRadius, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(circleFontSize);
        doc.text(nivel, circleX, circleY + circleTextOffsetY, {
          align: "center",
          baseline: "middle",
        });
      });

      y += currentRowHeight;
      // Linha horizontal inferior de cada linha da tabela
      doc.setDrawColor(150, 150, 150);
      doc.line(leftMargin, y, tableXEnd, y);
    });

    y += 10;

    drawObservations();
  });

  // --- Legenda dos Níveis ---
  y = checkPageBreak(y, 60);

  doc.setFontSize(14);
  doc.setTextColor(29, 53, 87);
  doc.setFont(defaultFontFamily, "bold");
  doc.text("Legenda dos Níveis:", leftMargin, y);
  y += 10;

  doc.setFontSize(defaultFontSize);
  doc.setFont(defaultFontFamily, "normal");
  Object.entries(legendaCompleta).forEach(([nivel, descricao]) => {
    y = checkPageBreak(y, 10);

    doc.setFillColor(coresNiveis[nivel]);
    doc.circle(leftMargin + 4, y - 2.5, 4.5, "F");
    doc.setTextColor(0, 0, 0);
    doc.text(`${nivel} – ${descricao}`, leftMargin + 15, y);
    y += 10;
  });

  doc.save("avaliacao_inicial_profissional_final_v10.pdf");
}
