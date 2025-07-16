import jsPDF from "jspdf";
import {
  ATIVIDADES_FAVORITAS_LIST,
  SINAIS_DESREGULACAO_LIST,
  SITUACOES_DESREGULACAO_LIST,
  NIVEIS_AVALIACAO,
} from "../constants/avaliacaoConstants";

// As cores e legenda não serão usadas no PDF para preenchimento manual, mas são mantidas aqui
// caso sejam necessárias para outros fins ou para clareza do contexto original.
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

export function gerarPDFAvaliacaoInteressesParaPreencher({ aluno }) {
  const doc = new jsPDF();
  let y = 20; // Posição Y inicial para o conteúdo

  // --- Variáveis de Configuração Global ---
  const leftMargin = 14;
  const rightMarginDoc = 195; // Borda direita da página para o conteúdo
  const pageHeight = doc.internal.pageSize.height; // Altura da página
  const bottomMargin = 20; // Margem inferior
  const defaultFontFamily = "helvetica";
  const defaultFontSize = 9;
  const defaultLineHeight = defaultFontSize * 1.15; // Altura padrão da linha de texto
  const cellPaddingX = 2; // Preenchimento horizontal para células de tabela
  const cellPaddingY = 2; // Preenchimento vertical para células de tabela

  // --- Definições das colunas da "tabela" de rádio buttons (para Atividades, Sinais, Situações) ---
  const colNivelWidth = 9.8; // Largura para cada coluna de nível (ex: Sim, Não, NA)
  const totalLevelsWidth = NIVEIS_AVALIACAO.length * colNivelWidth;
  const colItemWidth = rightMarginDoc - leftMargin - totalLevelsWidth - 1; // Largura para o texto do item da lista
  const totalTableWidth = colItemWidth + totalLevelsWidth; // Largura total da "tabela"
  const tableXEnd = leftMargin + totalTableWidth; // Posição X final da tabela

  const minCellContentHeight = defaultFontSize * 1.5 + 2 * cellPaddingY;
  const minRowHeight = Math.max(16, minCellContentHeight); // Altura mínima para cada linha da tabela

  // Define a fonte padrão para todo o documento
  doc.setFont(defaultFontFamily, "normal");
  doc.setFontSize(defaultFontSize);

  // --- Funções Auxiliares ---

  // Função para verificar se há espaço suficiente na página e adicionar uma nova se necessário
  const checkPageBreak = (
    currentY,
    requiredSpace,
    isTableContinuation = false
  ) => {
    if (currentY + requiredSpace > pageHeight - bottomMargin) {
      doc.addPage(); // Adiciona nova página
      doc.setFont(defaultFontFamily, "normal"); // Restaura a fonte padrão
      doc.setFontSize(defaultFontSize); // Restaura o tamanho da fonte padrão
      let newY = 20; // Posição Y inicial na nova página

      if (isTableContinuation) {
        // Se a quebra ocorreu dentro de uma tabela, redesenha o cabeçalho da tabela na nova página
        const headerRowHeight = minRowHeight;
        const headerStartY = newY;

        doc.setDrawColor(50, 50, 50); // Cor da linha mais escura
        doc.setLineWidth(0.35); // Espessura da linha
        doc.line(leftMargin, headerStartY, tableXEnd, headerStartY); // Linha superior do cabeçalho

        doc.setFillColor(230, 230, 230); // Cor de fundo cinza claro
        doc.rect(
          leftMargin,
          headerStartY,
          totalTableWidth,
          headerRowHeight,
          "F"
        ); // Retângulo de fundo

        doc.setFontSize(defaultFontSize + 1); // Fonte um pouco maior para "Item"
        doc.setTextColor(0, 0, 0); // Cor preta para o texto
        doc.setFont(defaultFontFamily, "bold"); // Negrito
        doc.text(
          "Item", // Título da coluna para os itens da lista
          leftMargin + cellPaddingX,
          headerStartY + headerRowHeight / 2,
          { baseline: "middle" }
        );

        NIVEIS_AVALIACAO.forEach((nivel, idx) => {
          const colX = leftMargin + colItemWidth + idx * colNivelWidth;
          doc.setFontSize(defaultFontSize - 1); // Fonte menor para os níveis (Sim, Não, NA)
          doc.text(
            nivel,
            colX + colNivelWidth / 2,
            headerStartY + headerRowHeight / 2,
            { align: "center", baseline: "middle" }
          );
        });
        doc.setFont(defaultFontFamily, "normal"); // Volta para fonte normal
        doc.setFontSize(defaultFontSize); // Volta para tamanho de fonte padrão

        // Desenha as linhas verticais do cabeçalho da tabela
        doc.setDrawColor(50, 50, 50);
        doc.line(
          leftMargin,
          headerStartY,
          leftMargin,
          headerStartY + headerRowHeight
        );
        doc.line(
          leftMargin + colItemWidth,
          headerStartY,
          leftMargin + colItemWidth,
          headerStartY + headerRowHeight
        );
        for (let i = 0; i <= NIVEIS_AVALIACAO.length; i++) {
          const xPos = leftMargin + colItemWidth + i * colNivelWidth;
          doc.line(xPos, headerStartY, xPos, headerStartY + headerRowHeight);
        }
        doc.line(
          leftMargin,
          headerStartY + headerRowHeight,
          tableXEnd,
          headerStartY + headerRowHeight
        ); // Linha inferior do cabeçalho

        newY += headerRowHeight; // Avança Y após o cabeçalho redesenhado
      }
      return newY;
    }
    return currentY;
  };

  // Função para desenhar o cabeçalho do documento (título, informações do formulário)
  const drawHeader = () => {
    // Título principal
    const titleText = "Avaliação de Interesses e Gatilhos";
    const titleWidth = rightMarginDoc - leftMargin; // Largura disponível para o título

    // Quebra o texto do título em linhas que cabem na largura disponível
    const splitTitle = doc.splitTextToSize(titleText, titleWidth);

    doc.setFontSize(18); // Tamanho da fonte do título
    doc.setTextColor(29, 53, 87); // Cor do título
    doc.setFont(defaultFontFamily, "bold"); // Negrito para o título

    // Desenha cada linha do título
    doc.text(splitTitle, leftMargin, y);

    // Ajusta o 'y' para a próxima posição após o título, considerando as linhas quebradas
    // Usamos um espaçamento menor (ex: 1.05) para as linhas do título e um pequeno extra.
    y += splitTitle.length * (doc.getFontSize() * 1.05); // Espaçamento entre as linhas do título
    y += 2; // Espaço **reduzido** entre o título e o cabeçalho do formulário

    doc.setFontSize(12); // Volta ao tamanho de fonte para os campos do cabeçalho
    doc.setTextColor(0, 0, 0); // Cor preta
    doc.setFont(defaultFontFamily, "normal"); // Fonte normal

    // Campo Aluno(a) - sempre com sublinhado para preenchimento manual
    doc.text(
      `Aluno(a): ___________________________________________________________________`,
      leftMargin,
      y
    );
    y += 7; // Espaçamento reduzido

    // Escola
    doc.text(
      `Escola: _____________________________________________________________________`,
      leftMargin,
      y
    );
    y += 7; // Espaçamento reduzido

    // Professor
    doc.text(
      `Professor(a): ________________________________________________________________`,
      leftMargin,
      y
    );
    y += 7; // Espaçamento reduzido

    // Diagnóstico
    doc.text(
      `Diagnóstico: ________________________________________________________________`,
      leftMargin,
      y
    );
    y += 7; // Espaçamento reduzido

    // Série, Turma e Data (na mesma linha)
    const serieLabel = "Série: ___________";
    const turmaLabel = "Turma: __________";
    const dataLabel = "Data: ____/____/____";

    const serieX = leftMargin;
    const turmaX = serieX + doc.getTextWidth(serieLabel) + 10;
    const dataX = turmaX + doc.getTextWidth(turmaLabel) + 10;

    doc.text(serieLabel, serieX, y);
    doc.text(turmaLabel, turmaX, y);
    doc.text(dataLabel, dataX, y);

    y += 12; // Espaço após a linha de Série/Turma/Data e antes do conteúdo das seções
  };

  // Função para desenhar campos de texto livre com labels e linhas para preenchimento
  const drawTextInput = (label, lines = 2) => {
    y = checkPageBreak(y, 10 + lines * 8 + 5); // Estima o espaço necessário para o label + linhas + espaçamento
    doc.setFontSize(defaultFontSize);
    doc.setTextColor(0, 0, 0);
    doc.setFont(defaultFontFamily, "normal");
    doc.text(label, leftMargin, y);
    y += 6; // Espaço entre o label e a primeira linha
    for (let i = 0; i < lines; i++) {
      doc.line(leftMargin, y, rightMarginDoc, y); // Desenha a linha de sublinhado
      y += 8; // Espaço entre as linhas de sublinhado
    }
    y += 5; // Espaçamento extra após o campo de texto
  };

  // Função para desenhar as tabelas de itens com caixas de seleção (para "atividades favoritas", "sinais de desregulação", etc.)
  const drawRadioTable = (title, itemsList) => {
    y = checkPageBreak(y, 30); // Estima espaço para o título da tabela e seu cabeçalho

    doc.setFontSize(12); // Tamanho da fonte para o título da tabela
    doc.setTextColor(29, 53, 87); // Cor do título da tabela
    doc.setFont(defaultFontFamily, "bold"); // Negrito para o título da tabela
    doc.text(title, leftMargin, y);
    y += 10; // Espaço após o título da tabela

    // --- Desenhar o Cabeçalho da Tabela ---
    const headerRowHeight = minRowHeight;
    const headerStartY = y;

    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.35);
    doc.line(leftMargin, headerStartY, tableXEnd, headerStartY); // Linha superior do cabeçalho

    doc.setFillColor(230, 230, 230);
    doc.rect(leftMargin, headerStartY, totalTableWidth, headerRowHeight, "F"); // Fundo cinza

    doc.setFontSize(defaultFontSize + 1);
    doc.setTextColor(0, 0, 0);
    doc.setFont(defaultFontFamily, "bold");
    doc.text(
      "Item", // Título da coluna dos itens
      leftMargin + cellPaddingX,
      headerStartY + headerRowHeight / 2,
      { baseline: "middle" }
    );

    // Desenha os títulos dos níveis (NR, AF, etc.) no cabeçalho
    NIVEIS_AVALIACAO.forEach((nivel, idx) => {
      const colX = leftMargin + colItemWidth + idx * colNivelWidth;
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

    // Desenha as linhas verticais do cabeçalho da tabela
    doc.setDrawColor(50, 50, 50);
    doc.line(
      leftMargin,
      headerStartY,
      leftMargin,
      headerStartY + headerRowHeight
    );
    doc.line(
      leftMargin + colItemWidth,
      headerStartY,
      leftMargin + colItemWidth,
      headerStartY + headerRowHeight
    );
    for (let i = 0; i <= NIVEIS_AVALIACAO.length; i++) {
      const xPos = leftMargin + colItemWidth + i * colNivelWidth;
      doc.line(xPos, headerStartY, xPos, headerStartY + headerRowHeight);
    }
    doc.line(
      leftMargin,
      headerStartY + headerRowHeight,
      tableXEnd,
      headerStartY + headerRowHeight
    ); // Linha inferior do cabeçalho

    y = headerStartY + headerRowHeight; // Atualiza Y para o início do corpo da tabela

    // --- Desenhar cada item da lista (corpo da tabela) ---
    itemsList.forEach((itemText) => {
      const textColWidthForSplit = colItemWidth - 2 * cellPaddingX;
      doc.setFontSize(defaultFontSize);
      doc.setFont(defaultFontFamily, "normal");
      const textLines = doc.splitTextToSize(itemText, textColWidthForSplit);
      const textRenderHeight = textLines.length * defaultLineHeight;
      const currentRowHeight = Math.max(
        textRenderHeight + 2 * cellPaddingY,
        minRowHeight
      );

      y = checkPageBreak(y, currentRowHeight, true); // Verifica quebra de página, indicando continuação de tabela

      const rowStartY = y;

      doc.setDrawColor(150, 150, 150); // Cor das linhas da grade
      doc.setLineWidth(0.35);
      doc.setFillColor(255, 255, 255); // Fundo branco para as células
      doc.rect(leftMargin, rowStartY, totalTableWidth, currentRowHeight, "F"); // Desenha o retângulo da linha

      doc.setTextColor(0, 0, 0); // Cor preta para o texto do item
      doc.setFontSize(defaultFontSize);
      doc.text(
        textLines,
        leftMargin + cellPaddingX,
        rowStartY + currentRowHeight / 2,
        { baseline: "middle" }
      );

      // Desenha as linhas verticais das colunas da tabela
      doc.line(leftMargin, rowStartY, leftMargin, rowStartY + currentRowHeight);
      doc.line(
        leftMargin + colItemWidth,
        rowStartY,
        leftMargin + colItemWidth,
        rowStartY + currentRowHeight
      );
      for (let i = 0; i < NIVEIS_AVALIACAO.length; i++) {
        const colX = leftMargin + colItemWidth + (i + 1) * colNivelWidth;
        doc.line(colX, rowStartY, colX, rowStartY + currentRowHeight);
      }
      doc.line(tableXEnd, rowStartY, tableXEnd, rowStartY + currentRowHeight);

      // Desenha caixas de seleção vazias [ ] para cada nível
      NIVEIS_AVALIACAO.forEach((nivel, idx) => {
        const colX = leftMargin + colItemWidth + idx * colNivelWidth;
        const boxX = colX + colNivelWidth / 2 - 2; // Centraliza a caixa horizontalmente
        const boxY = rowStartY + currentRowHeight / 2 - 2; // Centraliza a caixa verticalmente

        doc.setFontSize(defaultFontSize);
        doc.setTextColor(0, 0, 0);
        doc.text("[ ]", boxX, boxY + 3); // Desenha a caixa de seleção
      });

      y += currentRowHeight; // Avança Y para a próxima linha da tabela
      doc.setDrawColor(150, 150, 150);
      doc.line(leftMargin, y, tableXEnd, y); // Linha horizontal inferior de cada linha da tabela
    });
    y += 10; // Espaço após a tabela
  };

  // --- INÍCIO DO DESENHO DO DOCUMENTO ---

  // Desenha o cabeçalho do documento (título e informações iniciais)
  drawHeader();

  // --- Seção 1: Interesses e Pontos Fortes ---
  y = checkPageBreak(y, 20); // Garante espaço para o título da seção
  doc.setFontSize(15);
  doc.setTextColor(29, 53, 87);
  doc.setFont(defaultFontFamily, "bold");
  doc.text("Seção 1: Interesses e Pontos Fortes", leftMargin, y);
  y += 10;

  doc.setFontSize(defaultFontSize);
  doc.setTextColor(0, 0, 0);
  doc.setFont(defaultFontFamily, "normal");
  doc.text(
    "Esta seção visa descobrir o que a criança gosta de fazer e no que ela se destaca.",
    leftMargin,
    y
  );
  y += 8; // Espaço após a descrição da seção

  drawRadioTable(
    "Quais são as atividades favoritas da criança?",
    ATIVIDADES_FAVORITAS_LIST
  );
  drawTextInput("Outras atividades (texto livre):");
  drawTextInput("Quais brinquedos ou objetos a criança prefere mais?");
  drawTextInput(
    "Quais são os personagens, temas ou assuntos que mais chamam a atenção da criança?"
  );
  drawTextInput("Em que a criança demonstra ter habilidades ou facilidade?");
  drawTextInput(
    "A criança demonstra interesse em interagir com outras pessoas? Se sim, de que forma?"
  );
  drawTextInput(
    "Há alguma rotina ou ritual específico que a criança gosta ou busca?"
  );

  // --- Seção 2: Gatilhos de Desregulação e Desconforto ---
  y = checkPageBreak(y, 20); // Garante espaço para o título da seção
  doc.setFontSize(15);
  doc.setTextColor(29, 53, 87);
  doc.setFont(defaultFontFamily, "bold");
  doc.text("Seção 2: Gatilhos de Desregulação e Desconforto", leftMargin, y);
  y += 10;

  doc.setFontSize(defaultFontSize);
  doc.setTextColor(0, 0, 0);
  doc.setFont(defaultFontFamily, "normal");
  doc.text(
    "Esta seção busca identificar o que pode levar a criança a se sentir sobrecarregada, irritada ou a ter comportamentos de desregulação.",
    leftMargin,
    y
  );
  y += 8;

  drawRadioTable(
    "Quais são os sinais de que a criança está começando a ficar desregulada ou desconfortável?",
    SINAIS_DESREGULACAO_LIST
  );
  drawTextInput("Outros sinais (texto livre):");
  drawRadioTable(
    "Quais são as situações que mais frequentemente causam desregulação na criança?",
    SITUACOES_DESREGULACAO_LIST
  );
  drawTextInput("Outras situações (texto livre):");
  drawTextInput(
    "Existe alguma comida, bebida ou material específico que a criança rejeita fortemente?"
  );
  drawTextInput(
    "O que costuma acalmar a criança quando ela está desregulada ou chateada?"
  );
  drawTextInput("Como a criança reage a mudanças na rotina ou a imprevistos?");
  drawTextInput(
    "Há algum som, imagem ou sensação que a criança evita ou tem aversão?"
  );
  drawTextInput(
    "Descreva uma situação recente em que a criança se desregulou. O que aconteceu antes, durante e depois?",
    3
  ); // 3 linhas para este campo

  // --- Seção 3: Estratégias e Apoio ---
  y = checkPageBreak(y, 20); // Garante espaço para o título da seção
  doc.setFontSize(15);
  doc.setTextColor(29, 53, 87);
  doc.setFont(defaultFontFamily, "bold");
  doc.text("Seção 3: Estratégias e Apoio", leftMargin, y);
  y += 10;

  doc.setFontSize(defaultFontSize);
  doc.setTextColor(0, 0, 0);
  doc.setFont(defaultFontFamily, "normal");
  doc.text(
    "Esta seção busca entender quais estratégias funcionam melhor para a criança.",
    leftMargin,
    y
  );
  y += 8;

  drawTextInput("Quais são as melhores formas de se comunicar com a criança?");
  drawTextInput(
    "O que ajuda a criança a se preparar para uma transição ou mudança na rotina?"
  );
  drawTextInput(
    "Existe algum objeto, brinquedo ou atividade que funciona como 'porto seguro' para a criança?"
  );
  drawTextInput(
    "Quais estratégias você utiliza para ajudar a criança a se regular?"
  );
  drawTextInput(
    "A criança tem alguma preferência em relação a toque ou espaço pessoal?"
  );
  drawTextInput("Há algo mais que você gostaria de adicionar?", 3); // 3 linhas para este campo

  // A seção de legenda foi removida, conforme sua solicitação anterior.

  doc.save("avaliacao_interesses_para_preencher.pdf");
}
