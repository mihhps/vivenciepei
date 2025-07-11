import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  collection,
  query,
  where,
  getDocs,
  doc as firestoreDoc, // Renomeado para evitar conflito com 'doc' do jspdf
  getDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase"; // Certifique-se de que este caminho está correto para seu projeto

// --- Constantes e Estilos ---
const styles = {
  font: "times",
  fontSize: {
    small: 8,
    medium: 10,
    large: 12,
    title: 18,
  },
  colors: {
    black: [0, 0, 0],
    white: [255, 255, 255],
    grayLight: [200, 200, 200],
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

const coresPorNivel = {
  NR: styles.colors.red,
  AF: styles.colors.yellow,
  AG: styles.colors.purple,
  AV: styles.colors.grayLight,
  AVi: styles.colors.green,
  I: styles.colors.magenta,
  // Cores para Sim/Não/NA na avaliação de interesses
  Sim: [76, 175, 80], // Verde
  Não: [230, 57, 70], // Vermelho
  NA: [173, 181, 189], // Cinza
};

const legendaNiveis = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
};

// --- Listas de Itens para Rádios (Copiadas de AvaliacaoInteressesPage.jsx) ---
const ATIVIDADES_FAVORITAS_LIST = [
  "Brincadeiras ao ar livre (parque, bicicleta, bola)",
  "Brincadeiras dentro de casa (quebra-cabeças, jogos de tabuleiro, blocos)",
  "Assistir TV/Filmes/Desenhos",
  "Jogar videogames/aplicativos no tablet",
  "Desenhar/Pintar/Esculpir (atividades artísticas)",
  "Ouvir música/Cantar/Dançar",
  "Ler livros/Folhear revistas",
  "Brincar com água/Areia",
  "Brincadeiras de faz de conta (bonecas, carrinhos, super-heróis)",
  "Interagir com animais",
  "Explorar a natureza",
  "Atividades sensoriais (massinha, geleca, objetos com texturas diferentes)",
];

const SINAIS_DESREGULACAO_LIST = [
  "Irritabilidade/Frustração",
  "Choro excessivo",
  "Gritos/Resmungos",
  "Bater/Morder/Chutar (em si mesma ou em outros)",
  "Se jogar no chão",
  "Correr/Andar de um lado para o outro",
  "Tentar se esconder ou fugir",
  "Ficar paralisada/Congelada",
  "Repetir falas ou movimentos (ecolalia, estereotipias)",
  "Recusar-se a obedecer",
  "Dificuldade para se comunicar/Expressar",
  "Dificuldade para transicionar entre atividades",
];

const SITUACOES_DESREGULACAO_LIST = [
  "Mudanças inesperadas na rotina",
  "Ambientes muito barulhentos (festas, shoppings, shows)",
  "Ambientes com muita gente/muito movimento",
  "Luzes muito fortes ou piscantes",
  "Cheiros fortes ou incomuns",
  "Texturas específicas (roupas, alimentos, objetos)",
  "Sede ou fome",
  "Cansaço",
  "Doença/Dor",
  "Frustração ao não conseguir algo",
  "Excesso de estímulos (visuais, auditivos, táteis)",
  "Ser tocada inesperadamente",
  "Pressão para fazer algo que não quer",
  "Transições entre atividades ou locais",
  "Separação de pessoas familiares",
  "Ser contrariada",
];

// As variáveis availableCreatorColors e creatorColorMap não estão sendo usadas,
// então as mantive comentadas ou removi para manter o código limpo,
// mas a função getCreatorColor permanece para evitar erros.
function getCreatorColor(criadorInfoKey) {
  return styles.colors.black; // Retorna sempre preto, como padrão atual
}

const HEADER_AREA_HEIGHT = 40;
const FOOTER_AREA_HEIGHT = 25;

function formatarData(data) {
  if (!data) return "-";
  try {
    let dateObj;
    if (typeof data.toDate === "function") {
      dateObj = data.toDate();
    } else if (data instanceof Date) {
      dateObj = data;
    } else if (typeof data === "string") {
      dateObj = new Date(data);
    } else {
      return "-";
    }
    if (isNaN(dateObj.getTime())) return "-";
    const dia = dateObj.getUTCDate().toString().padStart(2, "0");
    const mes = (dateObj.getUTCMonth() + 1).toString().padStart(2, "0");
    const ano = dateObj.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return "-";
  }
}

function formatarMesPorExtenso(data) {
  if (!data) return "-";
  try {
    let dateObj;
    if (typeof data.toDate === "function") {
      dateObj = data.toDate();
    } else if (data instanceof Date) {
      dateObj = data;
    } else if (typeof data === "string") {
      dateObj = new Date(data);
    } else {
      return "-";
    }
    if (isNaN(dateObj.getTime())) return "-";
    const options = {
      month: "long",
    };
    const mes = dateObj.toLocaleDateString("pt-BR", options);
    return mes.charAt(0).toUpperCase() + mes.slice(1);
  } catch (e) {
    console.error("Erro ao formatar mês por extenso:", e);
    return "-";
  }
}

function addHeaderAndFooter(doc) {
  const imgWidth = 128;
  const imgHeight = 25;
  const imgX = 10;
  const imgY = 10;
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.addImage("/logo.jpg", "JPEG", imgX, imgY, imgWidth, imgHeight);

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
  const contentBottomLimit = pageHeight - FOOTER_AREA_HEIGHT;

  if (
    currentY + requiredSpace > contentBottomLimit ||
    currentY < HEADER_AREA_HEIGHT
  ) {
    doc.addPage();
    addHeaderAndFooter(doc);
    return HEADER_AREA_HEIGHT + 10;
  }
  return currentY;
}

// Reutilizando a função fetchPeis que já existia
async function fetchPeis(alunoId, alunoNome) {
  try {
    let peis = [];
    const newCollectionRef = collection(db, "pei_contribucoes");
    const oldCollectionRef = collection(db, "peis");

    let qNew = query(
      newCollectionRef,
      where("alunoId", "==", alunoId),
      orderBy("dataCriacao", "desc")
    );
    let snapNew = await getDocs(qNew);

    if (!snapNew.empty) {
      console.log("[PDF_DEBUG] PEIs encontrados em 'pei_contribucoes'.");
      peis = snapNew.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } else {
      console.log(
        "[PDF_DEBUG] Nenhum PEI encontrado em 'pei_contribucoes', tentando 'peis' (coleção antiga)."
      );
      let qOld = query(
        oldCollectionRef,
        where("alunoId", "==", alunoId),
        orderBy("dataCriacao", "desc")
      );
      let snapOld = await getDocs(qOld);

      if (snapOld.empty) {
        qOld = query(
          oldCollectionRef,
          where("aluno", "==", alunoNome),
          orderBy("dataCriacao", "desc")
        );
        snapOld = await getDocs(qOld);
      }

      if (!snapOld.empty) {
        console.log("[PDF_DEBUG] PEIs encontrados em 'peis' (coleção antiga).");
        peis = snapOld.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } else {
        console.log(
          "[PDF_DEBUG] Nenhum PEI encontrado em nenhuma das coleções."
        );
      }
    }
    return peis;
  } catch (err) {
    console.error("Erro ao buscar PEIs:", err);
    return [];
  }
}

async function addStudentAndHeaderInfo(
  doc,
  aluno,
  avaliacao, // Pode ser avaliação inicial ou nulo
  nomeEscola,
  yStart
) {
  let y = yStart;

  y = ensurePageSpace(doc, y, 10);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.title);
  doc.text(
    "Plano Educacional Individualizado (PEI)",
    doc.internal.pageSize.getWidth() / 2,
    y,
    {
      align: "center",
    }
  );
  y += 10;

  y = ensurePageSpace(doc, y, 30);
  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      [
        {
          content: "Orientações para aplicação do PEI:",
          styles: {
            fontStyle: "bold",
            fontSize: styles.fontSize.medium,
            cellPadding: 2,
            valign: "top",
          },
        },
        {
          content:
            "Todas as estratégias elencadas no PEI devem ser contextualizadas nas atividades propostas no plano diário.",
          styles: {
            fontStyle: "normal",
            fontSize: styles.fontSize.medium,
            cellPadding: 2,
            valign: "top",
          },
        },
      ],
    ],
    styles: {
      font: styles.font,
      textColor: styles.colors.black,
      fillColor: styles.colors.white,
      lineColor: styles.colors.black,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: styles.colors.white,
    },
    columnStyles: {
      0: {
        cellWidth: 60,
        overflow: "linebreak",
      },
      1: {
        cellWidth: doc.internal.pageSize.getWidth() - 60 - 40,
        overflow: "linebreak",
      },
    },
    margin: {
      left: 20,
      right: 20,
      top: HEADER_AREA_HEIGHT + 10,
      bottom: FOOTER_AREA_HEIGHT,
    },
    didParseCell: (data) => {
      data.cell.styles.fillColor = styles.colors.white;
    },
    didDrawPage: (data) => {
      addHeaderAndFooter(doc);
    },
  });
  y = doc.lastAutoTable.finalY + 5;

  const availablePageWidth = doc.internal.pageSize.getWidth() - 40;

  const dataNascTexto = formatarData(aluno.nascimento);
  const mesAvaliacaoTexto = formatarMesPorExtenso(avaliacao?.inicio); // Usando 'inicio' da avaliação inicial
  const mesProximaAvaliacaoTexto = formatarMesPorExtenso(
    avaliacao?.proximaAvaliacao // Usando 'proximaAvaliacao' da avaliação inicial
  );

  let alunoIdade = "-";
  if (aluno.nascimento) {
    let birthDateObj;
    if (typeof aluno.nascimento.toDate === "function") {
      birthDateObj = aluno.nascimento.toDate();
    } else if (aluno.nascimento instanceof Date) {
      birthDateObj = aluno.nascimento;
    } else if (typeof aluno.nascimento === "string") {
      birthDateObj = new Date(aluno.nascimento);
    }

    if (birthDateObj && !isNaN(birthDateObj.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birthDateObj.getFullYear();
      const m = today.getMonth() - birthDateObj.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
      }
      alunoIdade = age;
    }
  }

  let professoresNomes = "Não informado";
  if (aluno.escolaId && aluno.turma) {
    try {
      const professoresQuery = query(
        collection(db, "usuarios"),
        where(`escolas.${aluno.escolaId}`, "==", true),
        where("perfil", "in", ["professor", "aee"])
      );
      const professoresSnap = await getDocs(professoresQuery);

      const nomesEncontrados = [];
      professoresSnap.docs.forEach((doc) => {
        const userData = doc.data();
        if (userData.turmas && userData.turmas[aluno.turma]) {
          nomesEncontrados.push(userData.nome);
        } else if (
          Array.isArray(userData.turmas) &&
          userData.turmas.includes(aluno.turma)
        ) {
          nomesEncontrados.push(userData.nome);
        }
      });

      if (nomesEncontrados.length > 0) {
        professoresNomes = nomesEncontrados.join(", ");
      } else {
        if (Array.isArray(aluno.professores) && aluno.professores.length > 0) {
          const profDetailsPromises = aluno.professores.map(
            async (profRefId) => {
              const profDoc = await getDoc(
                firestoreDoc(db, "usuarios", profRefId)
              );
              return profDoc.exists() ? profDoc.data().nome : null;
            }
          );
          const resolvedNames = (await Promise.all(profDetailsPromises)).filter(
            Boolean
          );
          if (resolvedNames.length > 0)
            professoresNomes = resolvedNames.join(", ");
        }
      }
    } catch (error) {
      console.error(
        "Erro ao buscar professores na função addStudentAndHeaderInfo:",
        error
      );
      professoresNomes = "Erro ao carregar professores";
    }
  }

  y = ensurePageSpace(doc, y, 40);
  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      [
        {
          content: `Aluno(a): ${aluno.nome || "-"}`,
          colSpan: 3,
        },
      ],
      [
        {
          content: `Escola: ${nomeEscola || "-"}`,
          colSpan: 3,
        },
      ],
      [
        `Data de Nasc.: ${dataNascTexto}`,
        `Idade: ${alunoIdade} anos`,
        `Turma: ${aluno.turma || "-"}`,
      ],
      [
        {
          content: `Diagnóstico: ${aluno.diagnostico || "Não informado"}`,
          colSpan: 3,
        },
      ],
    ],
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.large,
      textColor: styles.colors.black,
      fillColor: styles.colors.white,
      lineColor: styles.colors.black,
      lineWidth: 0.1,
      cellPadding: 2,
      valign: "middle",
    },
    headStyles: {
      fillColor: styles.colors.white,
    },
    columnStyles: {
      0: {
        cellWidth: availablePageWidth / 3,
      },
      1: {
        cellWidth: availablePageWidth / 3,
      },
      2: {
        cellWidth: availablePageWidth / 3,
      },
    },
    margin: {
      left: 20,
      right: 20,
      top: HEADER_AREA_HEIGHT + 10,
      bottom: FOOTER_AREA_HEIGHT,
    },
    didParseCell: (data) => {
      data.cell.styles.fillColor = styles.colors.white;
    },
    didDrawPage: (data) => {
      addHeaderAndFooter(doc);
    },
  });
  y = doc.lastAutoTable.finalY + 5;

  y = ensurePageSpace(doc, y, 40);
  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      [
        {
          content: `Professor(a): ${professoresNomes}`,
          colSpan: 2,
        },
      ],
      [
        `Período de intervenção: ${
          avaliacao?.periodoIntervencao || "Médio prazo"
        }`,
        `Data prevista para a próxima avaliação: ${mesProximaAvaliacaoTexto}`,
      ],
    ],
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.large,
      textColor: styles.colors.black,
      fillColor: styles.colors.white,
      lineColor: styles.colors.black,
      lineWidth: 0.1,
      cellPadding: 2,
      valign: "middle",
    },
    headStyles: {
      fillColor: styles.colors.white,
    },
    columnStyles: {
      0: {
        cellWidth: availablePageWidth / 2,
      },
      1: {
        cellWidth: availablePageWidth / 2,
      },
    },
    margin: {
      left: 20,
      right: 20,
      top: HEADER_AREA_HEIGHT + 10,
      bottom: FOOTER_AREA_HEIGHT,
    },
    didParseCell: (data) => {
      data.cell.styles.fillColor = styles.colors.white;
    },
    didDrawPage: (data) => {
      addHeaderAndFooter(doc);
    },
  });
  y = doc.lastAutoTable.finalY + 5;

  y = ensurePageSpace(doc, y, 15);
  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      [
        {
          content: `Plano gerado a partir avaliação realizada em: ${mesAvaliacaoTexto}`,
          styles: {
            halign: "center",
          },
        },
      ],
    ],
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.large,
      textColor: styles.colors.black,
      fillColor: styles.colors.white,
      lineColor: styles.colors.black,
      lineWidth: 0.1,
      cellPadding: 2,
      valign: "middle",
    },
    headStyles: {
      fillColor: styles.colors.white,
    },
    columnStyles: {
      0: {
        cellWidth: availablePageWidth,
      },
    },
    margin: {
      left: 20,
      right: 20,
      top: HEADER_AREA_HEIGHT + 10,
      bottom: FOOTER_AREA_HEIGHT,
    },
    didParseCell: (data) => {
      data.cell.styles.fillColor = styles.colors.white;
    },
    didDrawPage: (data) => {
      addHeaderAndFooter(doc);
    },
  });
  y = doc.lastAutoTable.finalY + 10;

  return y;
}

function addInitialAssessment(doc, avaliacao, y) {
  const dadosAvaliacao = avaliacao?.respostas || avaliacao?.habilidades;

  if (!dadosAvaliacao || Object.keys(dadosAvaliacao).length === 0) {
    y = ensurePageSpace(doc, y, 10);
    doc.text(
      "Nenhuma avaliação inicial detalhada encontrada ou com dados incompletos.",
      25,
      y
    );
    return y + 10;
  }

  y = ensurePageSpace(doc, y, 30);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Avaliação Inicial", 20, y);
  y += 8;

  for (const area in dadosAvaliacao) {
    const habilidades = dadosAvaliacao[area];
    const linhasDaArea = [];

    for (const habilidade in habilidades) {
      const nivel = habilidades[habilidade];
      if (nivel !== "NA" && nivel !== "I") {
        // Inclui somente NAs e Is se necessário, ajuste aqui
        linhasDaArea.push([habilidade, nivel]);
      }
    }

    if (linhasDaArea.length === 0) continue;

    y = ensurePageSpace(doc, y, 15);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.medium);
    doc.text(area, 20, y);
    y += 6;

    // Calcula a largura total da tabela e a margem para centralização
    const tableWidth = 150 + 20; // Largura da coluna "Habilidade" + "Nível"
    const pageWidth = doc.internal.pageSize.getWidth();
    const horizontalMargin = (pageWidth - tableWidth) / 2;

    autoTable(doc, {
      startY: y,
      head: [["Habilidade", "Nível"]],
      body: linhasDaArea,
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.small,
        cellPadding: 1.5,
        valign: "middle",
        textColor: styles.colors.black,
        fillColor: styles.colors.white,
        lineColor: styles.colors.black,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: styles.colors.white,
        textColor: styles.colors.black,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 150 },
        1: { cellWidth: 20, halign: "center" },
      },
      margin: {
        left: horizontalMargin,
        right: horizontalMargin,
        top: HEADER_AREA_HEIGHT + 10,
        bottom: FOOTER_AREA_HEIGHT,
      },
      didParseCell: (data) => {
        const nivel = data.cell.text[0];
        if (data.column.index === 1 && coresPorNivel[nivel]) {
          data.cell.styles.fillColor = coresPorNivel[nivel];
        } else {
          data.cell.styles.fillColor = styles.colors.white;
        }
      },
      didDrawPage: (data) => {
        addHeaderAndFooter(doc);
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  }
  return y;
}

// NOVO: Função para adicionar a seção de Avaliação de Interesses
function addAvaliacaoInteressesSection(doc, avaliacaoInteressesData, y) {
  if (
    !avaliacaoInteressesData ||
    Object.keys(avaliacaoInteressesData).length === 0
  ) {
    y = ensurePageSpace(doc, y, 10);
    doc.text("Nenhuma avaliação de interesses detalhada encontrada.", 25, y);
    return y + 10;
  }

  y = ensurePageSpace(doc, y, 30);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Avaliação de Interesses e Gatilhos", 20, y);
  y += 8;

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentMargin = 20;
  const availableWidth = pageWidth - 2 * contentMargin;

  // Helper para adicionar tabelas de perguntas de texto
  const addTextQuestionTable = (question, answer) => {
    const tableBody = [];
    const answerText = answer || "Não informado.";
    tableBody.push([
      { content: question, styles: { fontStyle: "bold" } },
      answerText,
    ]);

    autoTable(doc, {
      startY: y,
      head: [], // Sem cabeçalho para perguntas e respostas diretas
      body: tableBody,
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.medium,
        textColor: styles.colors.black,
        fillColor: styles.colors.white,
        lineColor: styles.colors.black,
        lineWidth: 0.1,
        cellPadding: 2,
        valign: "top",
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: availableWidth * 0.35 }, // Largura para a pergunta
        1: { cellWidth: availableWidth * 0.65 }, // Largura para a resposta
      },
      margin: {
        left: contentMargin,
        right: contentMargin,
        top: HEADER_AREA_HEIGHT + 10,
        bottom: FOOTER_AREA_HEIGHT,
      },
      didParseCell: (data) => {
        data.cell.styles.fillColor = styles.colors.white;
      },
      didDrawPage: (data) => {
        addHeaderAndFooter(doc);
      },
    });
    y = doc.lastAutoTable.finalY + 5; // Espaçamento entre as tabelas de perguntas
  };

  // Helper para adicionar tabelas de perguntas de rádio (Sim/Não/NA)
  const addRadioQuestionTable = (questionTitle, dataKey, list) => {
    const radioTableBody = [];
    const responses = avaliacaoInteressesData[dataKey] || {};

    list.forEach((item) => {
      const response = responses[item] || "NA"; // Padrão para "NA" se não houver resposta
      radioTableBody.push([item, response]);
    });

    if (radioTableBody.length === 0) {
      y = ensurePageSpace(doc, y, 10);
      doc.setFont(styles.font, "italic");
      doc.setFontSize(styles.fontSize.small);
      doc.text(
        `Nenhuma resposta para "${questionTitle}".`,
        contentMargin + 5,
        y
      );
      y += 7;
      return;
    }

    y = ensurePageSpace(doc, y, 15);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.medium);
    doc.text(`${questionTitle}:`, contentMargin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Item", "Resposta"]],
      body: radioTableBody,
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.small,
        textColor: styles.colors.black,
        fillColor: styles.colors.white,
        lineColor: styles.colors.black,
        lineWidth: 0.1,
        cellPadding: 1.5,
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: styles.colors.white,
        textColor: styles.colors.black,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: availableWidth * 0.8 },
        1: { cellWidth: availableWidth * 0.2, halign: "center" },
      },
      margin: {
        left: contentMargin,
        right: contentMargin,
        top: HEADER_AREA_HEIGHT + 10,
        bottom: FOOTER_AREA_HEIGHT,
      },
      didParseCell: (data) => {
        if (data.column.index === 1 && coresPorNivel[data.cell.text[0]]) {
          data.cell.styles.fillColor = coresPorNivel[data.cell.text[0]];
          data.cell.styles.textColor = styles.colors.white; // Texto branco para melhor contraste na cor de fundo
        } else {
          data.cell.styles.fillColor = styles.colors.white;
          data.cell.styles.textColor = styles.colors.black;
        }
      },
      didDrawPage: (data) => {
        addHeaderAndFooter(doc);
      },
    });
    y = doc.lastAutoTable.finalY + 10; // Espaçamento após a tabela de rádio
  };

  // Seção 1: Interesses e Pontos Fortes
  y = ensurePageSpace(doc, y, 15);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.medium);
  doc.text("Seção 1: Interesses e Pontos Fortes", contentMargin, y);
  y += 10; // Ajustado para remover a linha de descrição

  addRadioQuestionTable(
    "Atividades Favoritas",
    "atividadesFavoritas",
    ATIVIDADES_FAVORITAS_LIST
  );
  addTextQuestionTable(
    "Outras atividades",
    avaliacaoInteressesData.outrasAtividades
  );
  addTextQuestionTable(
    "Quais brinquedos ou objetos a criança prefere mais?",
    avaliacaoInteressesData.brinquedosPreferidos
  );
  addTextQuestionTable(
    "Quais são os personagens, temas ou assuntos que mais chamam a atenção da criança?",
    avaliacaoInteressesData.personagensTemasAssuntos
  );
  addTextQuestionTable(
    "Em que a criança demonstra ter habilidades ou facilidade?",
    avaliacaoInteressesData.habilidadesFacilidades
  );
  addTextQuestionTable(
    "A criança demonstra interesse em interagir com outras pessoas?",
    avaliacaoInteressesData.interacaoComPessoas
  );
  addTextQuestionTable(
    "Há alguma rotina ou ritual específico que a criança gosta ou busca?",
    avaliacaoInteressesData.rotinaRitualEspecifico
  );

  // Seção 2: Gatilhos de Desregulação e Desconforto
  y = ensurePageSpace(doc, y, 15);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.medium);
  doc.text("Seção 2: Gatilhos de Desregulação e Desconforto", contentMargin, y);
  y += 10; // Ajustado para remover a linha de descrição

  addRadioQuestionTable(
    "Sinais de Desregulação",
    "sinaisDesregulacao",
    SINAIS_DESREGULACAO_LIST
  );
  addTextQuestionTable("Outros sinais", avaliacaoInteressesData.outrosSinais);
  addRadioQuestionTable(
    "Situações de Desregulação",
    "situacoesDesregulacao",
    SITUACOES_DESREGULACAO_LIST
  );
  addTextQuestionTable(
    "Outras situações",
    avaliacaoInteressesData.outrasSituacoes
  );
  addTextQuestionTable(
    "Existe alguma comida, bebida ou material específico que a criança rejeita fortemente?",
    avaliacaoInteressesData.comidaBebidaMaterialRejeitado
  );
  addTextQuestionTable(
    "O que costuma acalmar a criança quando ela está desregulada ou chateada?",
    avaliacaoInteressesData.oQueAcalma
  );
  addTextQuestionTable(
    "Como a criança reage a mudanças na rotina ou a imprevistos?",
    avaliacaoInteressesData.reacaoMudancasRotina
  );
  addTextQuestionTable(
    "Há algum som, imagem ou sensação que a criança evita ou tem aversão?",
    avaliacaoInteressesData.somImagemSensacaoAversao
  );
  addTextQuestionTable(
    "Descreva uma situação recente em que a criança se desregulou. O que aconteceu antes, durante e depois?",
    avaliacaoInteressesData.situacaoRecenteDesregulacao
  );

  // Seção 3: Estratégias e Apoio
  y = ensurePageSpace(doc, y, 15);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.medium);
  doc.text("Seção 3: Estratégias e Apoio", contentMargin, y);
  y += 10; // Ajustado para remover a linha de descrição

  addTextQuestionTable(
    "Quais são as melhores formas de se comunicar com a criança?",
    avaliacaoInteressesData.melhoresFormasComunicacao
  );
  addTextQuestionTable(
    "O que ajuda a criança a se preparar para uma transição ou mudança na rotina?",
    avaliacaoInteressesData.ajudaPrepararTransicao
  );
  addTextQuestionTable(
    "Existe algum objeto, brinquedo ou atividade que funciona como 'porto seguro' para a criança em momentos de estresse ou ansiedade?",
    avaliacaoInteressesData.objetoBrinquedoPortoSeguro
  );
  addTextQuestionTable(
    "Quais estratégias você utiliza para ajudar a criança a se regular? Quais funcionam melhor?",
    avaliacaoInteressesData.estrategiasRegulacao
  );
  addTextQuestionTable(
    "A criança tem alguma preferência em relação a toque (abraços, carinhos) ou espaço personal?",
    avaliacaoInteressesData.preferenciaToqueEspaco
  );
  addTextQuestionTable(
    "Há algo mais que você gostaria de adicionar sobre os interesses ou o comportamento da criança que não foi abordado?",
    avaliacaoInteressesData.algoMaisParaAdicionar
  );

  return y;
}

function addConsolidatedPeiSection(doc, peisParaExibir, y) {
  const allPeiTableRows = [];
  const allActivitiesTableRows = [];
  const uniqueActivitiesSet = new Set();

  const consolidatedSkills = new Map();

  peisParaExibir.forEach((peiItem) => {
    const resumo = peiItem.resumoPEI || peiItem.areas || [];
    if (resumo.length === 0) return;

    const criadorInfo = `(${peiItem.nomeCriador || "Desconhecido"} - ${
      peiItem.cargoCriador || "Não Informado"
    })`;

    resumo.forEach((item) => {
      const key = `${item.area || "-"}|${item.habilidade || "-"}`;
      if (!consolidatedSkills.has(key)) {
        consolidatedSkills.set(key, {
          area: item.area || "-",
          habilidade: item.habilidade || "-",
          objetivo: item.objetivo || "-",
          estrategiasTextList: [],
          nivel: item.nivel || "-",
          nivelAlmejado: item.nivelAlmejado || "-",
        });
      }

      const skillEntry = consolidatedSkills.get(key);

      let estrategiasDoItem = [];
      if (Array.isArray(item.estrategias)) {
        estrategiasDoItem = item.estrategias
          .filter(Boolean)
          .map((est) => est.trim());
      } else if (typeof item.estrategias === "string") {
        const regexSplit = /(?=\s*\([^)]+\)\s*(?=\s*\([^)]+\)|$))/;
        const parts = item.estrategias.split(regexSplit);
        parts.forEach((part) => {
          const trimmedPart = part.trim();
          if (trimmedPart) {
            estrategiasDoItem.push(trimmedPart);
          }
        });
        if (
          estrategiasDoItem.length === 0 &&
          item.estrategias.trim().length > 0
        ) {
          estrategiasDoItem.push(item.estrategias.trim());
        }
      }

      if (estrategiasDoItem.length > 0) {
        estrategiasDoItem.forEach((strategyText) => {
          skillEntry.estrategiasTextList.push(
            `* ${strategyText} ${criadorInfo}`
          );
        });
      }

      const activityText = item.atividadeAplicada?.trim();
      if (activityText) {
        const uniqueKey = `${activityText}|${criadorInfo}`;
        if (!uniqueActivitiesSet.has(uniqueKey)) {
          uniqueActivitiesSet.add(uniqueKey);
          allActivitiesTableRows.push([activityText, criadorInfo]);
        }
      } else if (peiItem.atividadeAplicada?.trim() && !item.atividadeAplicada) {
        const activityTextFromPei = peiItem.atividadeAplicada.trim();
        const uniqueKey = `${activityTextFromPei}|${criadorInfo}`;
        if (!uniqueActivitiesSet.has(uniqueKey)) {
          uniqueActivitiesSet.add(uniqueKey);
          allActivitiesTableRows.push([activityTextFromPei, criadorInfo]);
        }
      }

      skillEntry.nivel = item.nivel || skillEntry.nivel;
      skillEntry.nivelAlmejado = item.nivelAlmejado || skillEntry.nivelAlmejado;
    });
  });

  consolidatedSkills.forEach((skillEntry) => {
    const combinedStrategiesText = skillEntry.estrategiasTextList.join("\n\n");

    allPeiTableRows.push([
      skillEntry.area || "-",
      skillEntry.habilidade || "-",
      skillEntry.objetivo || "-",
      combinedStrategiesText || "Nenhuma estratégia definida.",
      skillEntry.nivel || "-",
      skillEntry.nivelAlmejado || "-",
    ]);
  });

  y = ensurePageSpace(doc, y, 20 + (allPeiTableRows.length > 0 ? 30 : 0));
  if (allPeiTableRows.length > 0) {
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text(
      "Plano Educacional Individualizado (PEI)",
      doc.internal.pageSize.getWidth() / 2,
      y,
      {
        align: "center",
      }
    );
    y += 8;

    const larguraPagina = doc.internal.pageSize.getWidth();
    const areaWidth = 25;
    const habilidadeWidth = 35;
    const objetivoWidth = 45;
    const nivelWidth = 12;
    const nivelAlmejadoWidth = 15;

    const defaultMarginLeft = 20;
    const defaultMarginRight = 20;
    const defaultTotalHorizontalMargin = defaultMarginLeft + defaultMarginRight;

    const fixedColumnsTotalWidth =
      areaWidth +
      habilidadeWidth +
      objetivoWidth +
      nivelWidth +
      nivelAlmejadoWidth;
    const availableWidthForStrategies =
      larguraPagina - defaultTotalHorizontalMargin - fixedColumnsTotalWidth;

    const estrategiasWidth = Math.max(70, availableWidthForStrategies);

    const totalColumnWidthUsed =
      areaWidth +
      habilidadeWidth +
      objetivoWidth +
      estrategiasWidth +
      nivelWidth +
      nivelAlmejadoWidth;
    const margemPEI = (larguraPagina - totalColumnWidthUsed) / 2;

    autoTable(doc, {
      startY: y,
      head: [
        [
          "Área",
          "Habilidade",
          "Objetivo",
          "Estratégias",
          "Nível Atual",
          "Nível Almejado",
        ],
      ],
      body: allPeiTableRows,
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.small,
        textColor: styles.colors.black,
        fillColor: styles.colors.white,
        lineColor: styles.colors.black,
        lineWidth: 0.1,
        cellPadding: 2,
        valign: "top",
      },
      headStyles: {
        fillColor: styles.colors.white,
        textColor: styles.colors.black,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: {
          cellWidth: areaWidth,
        },
        1: {
          cellWidth: habilidadeWidth,
        },
        2: {
          cellWidth: objetivoWidth,
        },
        3: {
          cellWidth: estrategiasWidth,
          overflow: "linebreak",
        },
        4: {
          cellWidth: nivelWidth,
          halign: "center",
        },
        5: {
          cellWidth: nivelAlmejadoWidth,
          halign: "center",
        },
      },
      margin: {
        left: margemPEI,
        right: margemPEI,
        top: HEADER_AREA_HEIGHT + 10,
        bottom: FOOTER_AREA_HEIGHT,
      },
      didParseCell: (data) => {
        const nivel = data.cell.text[0];
        if ([4, 5].includes(data.column.index) && coresPorNivel[nivel]) {
          data.cell.styles.fillColor = coresPorNivel[nivel];
        } else {
          data.cell.styles.fillColor = styles.colors.white;
        }
      },
      didDrawPage: (data) => {
        addHeaderAndFooter(doc);
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    y = ensurePageSpace(doc, y, 20);
    doc.text(
      "Nenhuma estratégia de Plano Educacional Individualizado (PEI) detalhada encontrada para este aluno.",
      25,
      y
    );
    y += 10;
  }

  y = ensurePageSpace(
    doc,
    y,
    20 + (allActivitiesTableRows.length > 0 ? 30 : 0)
  );
  if (allActivitiesTableRows.length > 0) {
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Atividades Aplicadas", doc.internal.pageSize.getWidth() / 2, y, {
      align: "center",
    });
    y += 8;

    const larguraPagina = doc.internal.pageSize.getWidth();
    const tableWidth = 175;
    const margemAtividades = (larguraPagina - tableWidth) / 2;

    autoTable(doc, {
      startY: y,
      head: [["Atividade Aplicada", "Responsável"]],
      body: allActivitiesTableRows,
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.small,
        textColor: styles.colors.black,
        fillColor: styles.colors.white,
        lineColor: styles.colors.black,
        lineWidth: 0.1,
        cellPadding: 2,
        valign: "top",
      },
      headStyles: {
        fillColor: styles.colors.white,
        textColor: styles.colors.black,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: {
          cellWidth: tableWidth * 0.7,
          overflow: "linebreak",
        },
        1: {
          cellWidth: tableWidth * 0.3,
          halign: "center",
        },
      },
      margin: {
        left: margemAtividades,
        right: margemAtividades,
        top: HEADER_AREA_HEIGHT + 10,
        bottom: FOOTER_AREA_HEIGHT,
      },
      didParseCell: (data) => {
        data.cell.styles.fillColor = styles.colors.white;
      },
      didDrawPage: (data) => {
        addHeaderAndFooter(doc);
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    y = ensurePageSpace(doc, y, 20);
    doc.text(
      "Nenhuma atividade aplicada detalhada encontrada para este aluno.",
      25,
      y
    );
    y += 10;
  }

  if (allPeiTableRows.length === 0 && allActivitiesTableRows.length === 0) {
    y = ensurePageSpace(doc, y, 20);
    doc.text(
      "Nenhum Plano Educacional Individualizado (PEI) ou atividade aplicada encontrada para este aluno.",
      25,
      y
    );
    return y + 10;
  }

  return y;
}

function addLegendSection(doc, y) {
  const minSpaceForLegend = Object.keys(legendaNiveis).length * 7 + 20;
  y = ensurePageSpace(doc, y, minSpaceForLegend);

  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Legenda dos Níveis:", 30, y);
  y += 6;
  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.small);

  Object.entries(legendaNiveis).forEach(([sigla, descricao]) => {
    const cor = coresPorNivel[sigla] || styles.colors.white;
    doc.setFillColor(...cor);
    doc.rect(22, y - 4, 8, 6, "F");
    doc.text(`${sigla} – ${descricao}`, 32, y);
    y += 7;
  });
  return y + 10;
}

async function addProfessionalSignaturesTable(doc, aluno, usuarioLogado, y) {
  const perfisParaTabelaAssinaturas = [
    "gestao",
    "aee",
    "seme",
    "diretor",
    "diretor adjunto",
    "orientador pedagogico",
    "desenvolvedor",
    "professor",
  ];

  // Verifica se o usuário logado é professor do aluno
  const isUserProfessorOfAluno =
    usuarioLogado?.perfil?.toLowerCase() === "professor" &&
    ((usuarioLogado.turmas && usuarioLogado.turmas[aluno.turma]) ||
      (Array.isArray(usuarioLogado.turmas) &&
        usuarioLogado.turmas.includes(aluno.turma)) ||
      (Array.isArray(aluno.professores) &&
        aluno.professores.includes(usuarioLogado.id)));

  if (
    !perfisParaTabelaAssinaturas.includes(
      usuarioLogado?.perfil?.toLowerCase()
    ) &&
    !isUserProfessorOfAluno
  ) {
    return y; // Não adiciona a tabela se o usuário não tiver permissão
  }

  try {
    const perfisParaQuery = [
      "professor",
      "aee",
      "diretor",
      "diretor adjunto",
      "orientador pedagogico",
      "desenvolvedor",
      "gestao",
      "seme",
    ];
    const professoresComAssinaturaQuery = query(
      collection(db, "usuarios"),
      where("perfil", "in", perfisParaQuery)
    );
    const professoresSnap = await getDocs(professoresComAssinaturaQuery);

    const profissionaisVinculados = professoresSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((prof) => {
        const estaNaEscolaDoAluno = Object.keys(prof.escolas || {}).includes(
          aluno.escolaId
        );
        const profTurmas = Object.keys(prof.turmas || {});
        const estaNaTurmaDoAluno =
          aluno.turma && profTurmas.includes(aluno.turma);
        const perfilLower = prof.perfil?.toLowerCase();

        if (["professor", "aee"].includes(perfilLower)) {
          return (
            estaNaEscolaDoAluno &&
            (!aluno.turma ||
              estaNaTurmaDoAluno ||
              (Array.isArray(aluno.professores) &&
                aluno.professores.includes(prof.id)))
          );
        }
        return estaNaEscolaDoAluno;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));

    // Filtra para garantir que não há duplicatas se um profissional aparecer em múltiplas categorias
    const uniqueProfissionais = Array.from(
      new Map(profissionaisVinculados.map((p) => [p.id, p])).values()
    );

    if (uniqueProfissionais.length === 0) {
      console.warn(
        "Nenhum profissional encontrado para a tabela de assinaturas gerais."
      );
      return y;
    }

    y = ensurePageSpace(doc, y, uniqueProfissionais.length * 10 + 30);

    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Assinaturas dos Profissionais Envolvidos", 20, y);
    y += 8;

    const linhasAssinaturas = uniqueProfissionais.map((p) => [
      p.nome,
      p.cargo || p.perfil?.toUpperCase(),
      "_______________________________",
    ]);

    const tableWidth = 70 + 60 + 60; // Largura das 3 colunas
    const pageWidth = doc.internal.pageSize.getWidth();
    const horizontalMargin = (pageWidth - tableWidth) / 2;

    autoTable(doc, {
      startY: y,
      head: [["Nome Completo", "Cargo/Função", "Assinatura"]],
      body: linhasAssinaturas,
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.medium,
        textColor: styles.colors.black,
        fillColor: styles.colors.white,
        lineColor: styles.colors.black,
        lineWidth: 0.1,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: styles.colors.white,
        textColor: styles.colors.black,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 60, halign: "center" },
        2: { cellWidth: 60 },
      },
      margin: {
        left: horizontalMargin,
        right: horizontalMargin,
        top: HEADER_AREA_HEIGHT + 10,
        bottom: FOOTER_AREA_HEIGHT,
      },
      didParseCell: (data) => {
        data.cell.styles.fillColor = styles.colors.white;
      },
      didDrawPage: (data) => {
        addHeaderAndFooter(doc);
      },
    });
    return doc.lastAutoTable.finalY + 10;
  } catch (err) {
    console.error("Erro ao buscar profissionais para assinatura:", err);
    return y;
  }
}

async function addSignaturePage(doc, aluno, usuarioLogado) {
  doc.addPage();
  addHeaderAndFooter(doc);

  let y = HEADER_AREA_HEIGHT + 10;

  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.title);
  doc.text("Assinaturas", doc.internal.pageSize.getWidth() / 2, y, {
    align: "center",
  });
  y += 15;

  y = await addProfessionalSignaturesTable(doc, aluno, usuarioLogado, y);

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.medium);
  y = ensurePageSpace(doc, y, 20);
  doc.text(`Guabiruba, ${dataHoje}`, 20, y);
  y += 10;
}

export async function gerarPDFCompleto(
  aluno,
  avaliacaoInicial, // Objeto de avaliação inicial
  usuarioLogado,
  peisParaGeral = [], // Array de PEIs a serem exibidos
  avaliacaoInteressesData = null // Objeto de avaliação de interesses
) {
  const doc = new jsPDF();
  let y;

  console.log("[PDF_DEBUG] Início da geração do PDF.");
  console.log(
    "[PDF_DEBUG] avaliacaoInteressesData recebida:",
    avaliacaoInteressesData
  );

  if (!aluno || !aluno.nome || !aluno.id) {
    console.error("gerarPDFCompleto: Dados do aluno são incompletos.");
    addHeaderAndFooter(doc);
    doc.text("Erro: Dados do aluno incompletos.", 20, HEADER_AREA_HEIGHT + 20);
    doc.save(
      `PEI_${aluno.nome?.replace(/\s+/g, "_") || "Desconhecido"}_Sem_Dados.pdf`
    );
    return;
  }

  let peisParaProcessar =
    Array.isArray(peisParaGeral) && peisParaGeral.length > 0
      ? peisParaGeral
      : await fetchPeis(aluno.id, aluno.nome);

  const peisOrdenados = peisParaProcessar.sort((a, b) => {
    const dataA = a.dataCriacao?.toDate
      ? a.dataCriacao.toDate()
      : new Date(a.dataCriacao);
    const dataB = b.dataCriacao?.toDate
      ? b.dataCriacao.toDate()
      : new Date(b.dataCriacao);
    return dataB.getTime() - dataA.getTime();
  });

  const peisParaExibir = peisOrdenados;

  if (
    peisParaExibir.length === 0 &&
    (!avaliacaoInicial || Object.keys(avaliacaoInicial).length === 0) &&
    (!avaliacaoInteressesData ||
      Object.keys(avaliacaoInteressesData).length === 0)
  ) {
    console.warn(
      "Nenhum PEI, avaliação inicial ou avaliação de interesses encontrado para o aluno, gerando PDF básico informativo."
    );
    addHeaderAndFooter(doc);
    doc.text(
      "Nenhum Plano Educacional Individualizado (PEI), Avaliação Inicial ou Avaliação de Interesses encontrado para este aluno.",
      25,
      HEADER_AREA_HEIGHT + 20
    );
    await addSignaturePage(doc, aluno, usuarioLogado);
    doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}_Sem_Dados.pdf`);
    return;
  }

  let nomeEscola = "-";
  if (aluno.escolaId) {
    try {
      const escolaRef = firestoreDoc(db, "escolas", aluno.escolaId);
      const escolaSnap = await getDoc(escolaRef);
      if (escolaSnap.exists()) {
        nomeEscola = escolaSnap.data().nome || "-";
      } else {
        console.warn(`Escola não encontrada para o ID: ${aluno.escolaId}`);
      }
    } catch (err) {
      console.error("Erro ao buscar nome da escola:", err);
    }
  }

  // Define o Y inicial para o conteúdo da primeira página.
  y = HEADER_AREA_HEIGHT + 10;

  y = await addStudentAndHeaderInfo(
    doc,
    aluno,
    avaliacaoInicial,
    nomeEscola,
    y
  );
  y = addInitialAssessment(doc, avaliacaoInicial, y);
  // AQUI é onde a função da avaliação de interesses é chamada
  y = addAvaliacaoInteressesSection(doc, avaliacaoInteressesData, y);
  y = addConsolidatedPeiSection(doc, peisParaExibir, y);
  y = addLegendSection(doc, y);

  await addSignaturePage(doc, aluno, usuarioLogado);

  doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}_Completo.pdf`);
  console.log("[PDF_DEBUG] Geração do PDF concluída.");
}
