import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  collection,
  query,
  where,
  getDocs,
  doc as firestoreDoc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

import estruturaPEI from "../data/estruturaPEI2";
import objetivosCurtoPrazoData from "../data/objetivosCurtoPrazo";
import objetivosMedioPrazoData from "../data/objetivosMedioPrazo";
import { avaliacaoInicial } from "../data/avaliacaoInicialData.js";

// Crie este "mapa" de busca logo após seus imports, no topo do arquivo.
const habilidadeDescricaoMap = {};
Object.values(avaliacaoInicial).forEach((areaArray) => {
  areaArray.forEach((skillObject) => {
    habilidadeDescricaoMap[skillObject.habilidade] = skillObject.niveis;
  });
});

// --- Constantes e Estilos ---
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
  Concluído: [76, 175, 80],
  "Em Andamento": styles.colors.yellow,
  "Não Iniciado": [230, 57, 70],
  NA: [173, 181, 189],
};

const legendaNiveis = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
};

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

const HEADER_AREA_HEIGHT = 40;
const FOOTER_AREA_HEIGHT = 25;

const getEstruturaPEIMap = (estrutura) => {
  const map = {};
  if (!estrutura) return map;
  Object.entries(estrutura).forEach(([areaName, subareasByArea]) => {
    if (typeof subareasByArea === "object" && subareasByArea !== null) {
      Object.entries(subareasByArea).forEach(
        ([subareaName, habilidadesBySubarea]) => {
          if (
            typeof habilidadesBySubarea === "object" &&
            habilidadesBySubarea !== null
          ) {
            Object.entries(habilidadesBySubarea).forEach(
              ([habilidadeName, niveisData]) => {
                if (!map[habilidadeName]) {
                  map[habilidadeName] = {};
                }
                if (typeof niveisData === "object" && niveisData !== null) {
                  Object.entries(niveisData).forEach(([nivel, data]) => {
                    map[habilidadeName][nivel] = data;
                  });
                } else {
                  console.warn(
                    `[PDF_WARN] 'niveisData' para habilidade "${habilidadeName}" NÃO é um objeto válido em "${areaName}" -> "${subareaName}". Não será mapeada corretamente.`
                  );
                }
              }
            );
          }
        }
      );
    }
  });
  return map;
};

const getObjetivosPrazoMap = (prazoData) => {
  const map = {};
  if (!prazoData) return map;
  Object.entries(prazoData).forEach(([areaName, subareasByArea]) => {
    if (typeof subareasByArea === "object" && subareasByArea !== null) {
      Object.entries(subareasByArea).forEach(
        ([subareaName, habilidadesBySubarea]) => {
          if (
            typeof habilidadesBySubarea === "object" &&
            habilidadesBySubarea !== null
          ) {
            Object.entries(habilidadesBySubarea).forEach(
              ([habilidadeName, niveisData]) => {
                if (!map[habilidadeName]) {
                  map[habilidadeName] = {};
                }
                if (typeof niveisData === "object" && niveisData !== null) {
                  Object.entries(niveisData).forEach(([nivel, objData]) => {
                    map[habilidadeName][nivel] = objData.objetivo;
                  });
                }
              }
            );
          }
        }
      );
    }
  });
  return map;
};

const estruturaPEIMap = getEstruturaPEIMap(estruturaPEI);
const objetivosCurtoPrazoMap = getObjetivosPrazoMap(objetivosCurtoPrazoData);
const objetivosMedioPrazoMap = getObjetivosPrazoMap(objetivosMedioPrazoData);

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

function formatarDataHora(timestamp) {
  if (!timestamp) return "";
  const dateObj = timestamp.toDate();
  return dateObj.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

async function fetchPeis(alunoId, alunoNome) {
  try {
    const currentYear = new Date().getFullYear();
    let allPeis = [];

    let qNew = query(
      collection(db, "pei_contribucoes"),
      where("alunoId", "==", alunoId),
      where("anoLetivo", "==", currentYear),
      orderBy("dataCriacao", "desc")
    );
    let snapNew = await getDocs(qNew);
    if (!snapNew.empty) {
      console.log("[PDF_DEBUG] PEIs encontrados em 'pei_contribucoes'.");
      allPeis = allPeis.concat(
        snapNew.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } else {
      console.log(
        "[PDF_DEBUG] Nenhuma PEI encontrada em 'pei_contribucoes' para o aluno e ano atual."
      );
    }

    let qOld = query(
      collection(db, "peis"),
      where("alunoId", "==", alunoId),
      where("anoLetivo", "==", currentYear),
      orderBy("dataCriacao", "desc")
    );
    let snapOld = await getDocs(qOld);
    if (!snapOld.empty) {
      console.log("[PDF_DEBUG] PEIs encontrados em 'peis' (coleção antiga).");
      allPeis = allPeis.concat(
        snapOld.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } else {
      console.log(
        "[PDF_DEBUG] Nenhuma PEI encontrada em 'peis' para o aluno e ano atual."
      );
    }
    const uniquePeis = Array.from(
      new Map(allPeis.map((item) => [item.id, item])).values()
    );

    uniquePeis.sort((a, b) => {
      const dataA = a.dataCriacao?.toDate
        ? a.dataCriacao.toDate()
        : new Date(a.dataCriacao);
      const dataB = b.dataCriacao?.toDate
        ? b.dataCriacao.toDate()
        : new Date(b.dataCriacao);
      return dataB.getTime() - dataA.getTime();
    });

    console.log(
      "[PDF_DEBUG] Total de PEIs consolidados encontrados (de ambas as coleções):",
      uniquePeis.length,
      uniquePeis
    );
    return uniquePeis;
  } catch (err) {
    console.error("Erro ao buscar PEIs:", err);
    return [];
  }
}

async function fetchObservacoes(alunoNome) {
  try {
    const q = query(
      collection(db, "observacoesAluno"),
      where("alunoNome", "==", alunoNome),
      orderBy("dataCriacao", "desc")
    );
    const querySnapshot = await getDocs(q);
    const observacoes = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dataCriacao: doc.data().dataCriacao?.toDate(),
      dataAtualizacao: doc.data().dataAtualizacao?.toDate(),
    }));
    console.log(
      "[PDF_DEBUG] Observações encontradas para o aluno:",
      observacoes.length,
      observacoes
    );
    return observacoes;
  } catch (err) {
    console.error("Erro ao buscar observações:", err);
    return [];
  }
}

function addInitialAssessment(doc, avaliacao, y) {
  console.log(
    "--- EXECUTANDO A VERSÃO CORRETA DA FUNÇÃO (com mapa específico) ---"
  );

  const dadosAvaliacao = avaliacao?.respostas || avaliacao?.habilidades;

  const habilidadesFiltradas = {};
  if (dadosAvaliacao) {
    for (const area in dadosAvaliacao) {
      const habilidadesNaArea = dadosAvaliacao[area];

      const habilidadesValidasNaArea = Object.entries(habilidadesNaArea || {})
        .filter(([habilidade, nivel]) => nivel !== "NA" && nivel !== "I")
        .map(([habilidade, nivel]) => {
          const descricaoEspecifica =
            (habilidadeDescricaoMap[habilidade] &&
              habilidadeDescricaoMap[habilidade][nivel]) ||
            "Descrição específica não encontrada.";

          return [habilidade, nivel, descricaoEspecifica];
        });

      if (habilidadesValidasNaArea.length > 0) {
        habilidadesFiltradas[area] = habilidadesValidasNaArea;
      }
    }
  }

  if (Object.keys(habilidadesFiltradas).length === 0) {
    return y;
  }

  y = ensurePageSpace(doc, y, 30);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Avaliação Inicial (Habilidades a Desenvolver)", 20, y);
  y += 8;

  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - 40;

  for (const area in habilidadesFiltradas) {
    const linhasDaArea = habilidadesFiltradas[area];

    y = ensurePageSpace(doc, y, 15);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.medium);
    doc.text(area, 20, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Habilidade", "Nível", "Descrição do Nível Atual"]],
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
        0: {
          cellWidth: availableWidth * 0.55,
        },
        1: {
          cellWidth: availableWidth * 0.1,
          halign: "center",
        },
        2: {
          cellWidth: availableWidth * 0.35,
        },
      },
      margin: {
        left: 20,
        right: 20,
        top: HEADER_AREA_HEIGHT + 10,
        bottom: FOOTER_AREA_HEIGHT,
      },
      didParseCell: (data) => {
        if (data.column.index === 1) {
          const nivel = data.cell.text[0];
          if (coresPorNivel[nivel]) {
            data.cell.styles.fillColor = coresPorNivel[nivel];
            data.cell.styles.textColor = styles.colors.white;
          }
        } else {
          data.cell.styles.fillColor = styles.colors.white;
          data.cell.styles.textColor = styles.colors.black;
        }
      },
      didDrawPage: (data) => {
        addHeaderAndFooter(doc);
      },
    });
    y = doc.lastAutoTable.finalY + 5;

    const observacaoArea = avaliacao.observacoes?.[area];
    if (observacaoArea && observacaoArea.trim().length > 0) {
      y = ensurePageSpace(doc, y, 15);
      doc.setFont(styles.font, "bold");
      doc.setFontSize(styles.fontSize.medium);
      doc.text(`Observações (${area}):`, 20, y);
      y += 6;
      doc.setFont(styles.font, "normal");
      doc.setFontSize(styles.fontSize.small);
      autoTable(doc, {
        startY: y,
        body: [[observacaoArea]],
        // ... (restante da função de observação)
      });
      y = doc.lastAutoTable.finalY + 5;
    }
  }
  return y + 10;
}

async function addStudentAndHeaderInfo(
  doc,
  aluno,
  avaliacao,
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
  const mesAvaliacaoTexto = formatarMesPorExtenso(avaliacao?.inicio);
  const mesProximaAvaliacaoTexto = formatarMesPorExtenso(
    avaliacao?.proximaAvaliacao
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

  let professores = "Não informado";
  if (aluno.escolaId && aluno.turma) {
    try {
      const professoresQuery = query(
        collection(db, "usuarios"),
        where(`escolas.${aluno.escolaId}`, "==", true),
        where("perfil", "in", ["professor", "aee"])
      );
      const professoresSnap = await getDocs(professoresQuery);

      const profsEncontrados = new Set();
      const turmaAlunoNormalizada = aluno.turma.trim().toLowerCase();

      professoresSnap.docs.forEach((doc) => {
        const userData = doc.data();

        if (userData.turmas) {
          const turmasProfessorNormalizadas = Object.keys(userData.turmas).map(
            (t) => t.trim().toLowerCase()
          );
          if (turmasProfessorNormalizadas.includes(turmaAlunoNormalizada)) {
            profsEncontrados.add({
              nome: userData.nome,
              cargo: userData.cargo || "Não informado",
            });
          }
        }

        if (
          Array.isArray(userData.turmas) &&
          userData.turmas.includes(aluno.turma)
        ) {
          profsEncontrados.add({
            nome: userData.nome,
            cargo: userData.cargo || "Não informado",
          });
        }
      });

      if (Array.isArray(aluno.professores) && aluno.professores.length > 0) {
        const profDetailsPromises = aluno.professores.map(async (profRefId) => {
          const profDoc = await getDoc(firestoreDoc(db, "usuarios", profRefId));
          return profDoc.exists()
            ? {
                nome: profDoc.data().nome,
                cargo: profDoc.data().cargo || "Não informado",
              }
            : null;
        });
        const resolvedProfs = (await Promise.all(profDetailsPromises)).filter(
          Boolean
        );
        resolvedProfs.forEach((p) => profsEncontrados.add(p));
      }

      if (profsEncontrados.size > 0) {
        const profsArray = Array.from(profsEncontrados);

        const ordemCargos = [
          "Professor Regente",
          "Professor de Apoio",
          "AEE",
          "Não informado",
        ];

        profsArray.sort((a, b) => {
          const cargoA = a.cargo || "Não informado";
          const cargoB = b.cargo || "Não informado";

          const indexA = ordemCargos.indexOf(cargoA);
          const indexB = ordemCargos.indexOf(cargoB);

          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;

          return a.nome.localeCompare(b.nome);
        });

        professores = profsArray
          .map((p) => `${p.nome} (${p.cargo})`)
          .join(", ");
      }
    } catch (error) {
      console.error(
        "Erro ao buscar professores na função addStudentAndHeaderInfo:",
        error
      );
      professores = "Erro ao carregar professores";
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
          content: `Professor(a): ${professores}`,
          colSpan: 2,
        },
      ],
      [
        `Período de intervenção: ${
          avaliacao?.periodoIntervencao || "Curto,Médio e Longo prazo"
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

function addAvaliacaoInteressesSection(doc, avaliacaoInteressesData, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentMargin = 20;
  const availableWidth = pageWidth - 2 * contentMargin;

  y = ensurePageSpace(doc, y, 30);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Avaliação de Interesses e Gatilhos", contentMargin, y);
  y += 8;

  const hasDataForContent =
    avaliacaoInteressesData && Object.keys(avaliacaoInteressesData).length > 0;

  if (!hasDataForContent) {
    y = ensurePageSpace(doc, y, 20);
    doc.setFont(styles.font, "normal");
    doc.setFontSize(styles.fontSize.medium);
    doc.text(
      "Nenhum dado de avaliação de interesses preenchido para este aluno.",
      contentMargin,
      y
    );
    return y + 10;
  }

  const addRadioQuestionTable = (questionTitle, dataKey, list) => {
    // A única mudança é a inclusão deste bloco para preencher a tabela.
    const radioTableBody = list
      .filter((item) => {
        const resposta = avaliacaoInteressesData[dataKey]?.[item];
        return resposta !== "NA" && resposta !== undefined;
      })
      .map((item) => [
        item,
        avaliacaoInteressesData[dataKey]?.[item] || "Não Informado",
      ]);

    if (radioTableBody.length === 0) return false;

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
        0: {
          cellWidth: availableWidth * 0.8,
        },
        1: {
          cellWidth: availableWidth * 0.2,
          halign: "center",
        },
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
          data.cell.styles.textColor = styles.colors.white;
        } else {
          data.cell.styles.fillColor = styles.colors.white;
          data.cell.styles.textColor = styles.colors.black;
        }
      },
      didDrawPage: (data) => {
        addHeaderAndFooter(doc);
      },
    });
    y = doc.lastAutoTable.finalY + 10;
    return true;
  };

  const textQuestions = {
    interessesEPontosFortes: [
      {
        question: "Outras atividades",
        dataKey: "outrasAtividades",
      },
      {
        question: "Quais brinquedos ou objetos a criança prefere mais?",
        dataKey: "brinquedosPreferidos",
      },
      {
        question:
          "Quais são os personagens, temas ou assuntos que mais chamam a atenção da criança?",
        dataKey: "personagensTemasAssuntos",
      },
      {
        question: "Em que a criança demonstra ter habilidades ou facilidade?",
        dataKey: "habilidadesFacilidades",
      },
      {
        question:
          "A criança demonstra interesse em interagir com outras pessoas?",
        dataKey: "interacaoComPessoas",
      },
      {
        question:
          "Há alguma rotina ou ritual específico que a criança gosta ou busca?",
        dataKey: "rotinaRitualEspecifico",
      },
    ],
    gatilhosEDesregulacao: [
      {
        question: "Outros sinais",
        dataKey: "outrosSinais",
      },
      {
        question: "Outras situações",
        dataKey: "outrasSituacoes",
      },
      {
        question:
          "Existe alguma comida, bebida ou material específico que a criança rejeita fortemente?",
        dataKey: "comidaBebidaMaterialRejeitado",
      },
      {
        question:
          "O que costuma acalmar a criança quando ela está desregulada ou chateada?",
        dataKey: "oQueAcalma",
      },
      {
        question: "Como a criança reage a mudanças na rotina ou a imprevistos?",
        dataKey: "reacaoMudancasRotina",
      },
      {
        question:
          "Há algum som, imagem ou sensação que a criança evita ou tem aversão?",
        dataKey: "somImagemSensacaoAversao",
      },
      {
        question:
          "Descreva uma situação recente em que a criança se desregulou. O que aconteceu antes, durante e depois?",
        dataKey: "situacaoRecenteDesregulacao",
      },
    ],
    estrategiasEApoio: [
      {
        question: "Quais são as melhores formas de se comunicar com a criança?",
        dataKey: "melhoresFormasComunicacao",
      },
      {
        question:
          "O que ajuda a criança a se preparar para uma transição ou mudança na rotina?",
        dataKey: "ajudaPrepararTransicao",
      },
      {
        question:
          "Existe algum objeto, brinquedo ou atividade que funciona como 'porto seguro' para a criança em momentos de estresse ou ansiedade?",
        dataKey: "objetoBrinquedoPortoSeguro",
      },
      {
        question:
          "Quais estratégias você utiliza para ajudar a criança a se regular? Quais funcionam melhor?",
        dataKey: "estrategiasRegulacao",
      },
      {
        question:
          "Há algo mais que você gostaria de adicionar sobre os interesses ou o comportamento da criança que não foi abordado?",
        dataKey: "algoMaisParaAdicionar",
      },
    ],
  };

  const addConsolidatedTextTable = (title, questionsArray) => {
    const tableBody = [];
    questionsArray.forEach(({ question, dataKey }) => {
      const answer = (avaliacaoInteressesData[dataKey] || "").trim();
      if (answer.length > 0) {
        tableBody.push([
          {
            content: question,
            styles: {
              fontStyle: "bold",
            },
          },
          answer,
        ]);
      }
    });

    if (tableBody.length === 0) return false;

    y = ensurePageSpace(doc, y, 20);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.medium);
    doc.text(`${title}:`, contentMargin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [],
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
        0: {
          cellWidth: availableWidth * 0.35,
        },
        1: {
          cellWidth: availableWidth * 0.65,
        },
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
    y = doc.lastAutoTable.finalY + 10;
    return true;
  };

  addRadioQuestionTable(
    "Atividades Favoritas",
    "atividadesFavoritas",
    ATIVIDADES_FAVORITAS_LIST
  );
  addConsolidatedTextTable(
    "Detalhes de Interesses e Pontos Fortes",
    textQuestions.interessesEPontosFortes
  );

  addRadioQuestionTable(
    "Sinais de Desregulação",
    "sinaisDesregulacao",
    SINAIS_DESREGULACAO_LIST
  );
  addConsolidatedTextTable(
    "Detalhes de Gatilhos e Desregulação",
    textQuestions.gatilhosEDesregulacao
  );

  addConsolidatedTextTable(
    "Estratégias e Apoio",
    textQuestions.estrategiasEApoio
  );

  return y + 10;
}

function addConsolidatedPeiSection(doc, peisParaExibir, y) {
  const allPeiTableRows = [];
  const allActivitiesTableRows = [];
  const uniqueActivitiesSet = new Set();
  const consolidatedSkills = new Map();
  console.log("[DEBUG] PEIs para exibir na consolidação:", peisParaExibir);
  peisParaExibir.forEach((peiItem) => {
    const resumo = peiItem.resumoPEI || [];
    if (resumo.length === 0) return;
    console.log(
      "[DEBUG] Processando item de PEI:",
      peiItem.id,
      "Criador:",
      peiItem.nomeCriador
    );
    const criadorInfo = `(${peiItem.nomeCriador || "Desconhecido"} - ${
      peiItem.cargoCriador || "Não Informado"
    })`;

    resumo.forEach((item) => {
      const key = `${item.area || "-"}|${item.habilidade || "-"}|${
        item.nivel || "-"
      }|${item.nivelAlmejado || "-"}`;
      let skillEntry = consolidatedSkills.get(key);

      if (!skillEntry) {
        skillEntry = {
          area: item.area || "-",
          habilidade: item.habilidade || "-",
          objetivos: {
            curtoPrazo: "",
            medioPrazo: "",
            longoPrazo: "",
          },
          estrategiasTextList: [],
          nivel: item.nivel || "-",
          nivelAlmejado: item.nivelAlmejado || "-",
        };
        consolidatedSkills.set(key, skillEntry);
      }

      skillEntry.objetivos.curtoPrazo =
        item.objetivos?.curtoPrazo ||
        objetivosCurtoPrazoMap[item.habilidade]?.[item.nivelAlmejado] ||
        "";
      skillEntry.objetivos.medioPrazo =
        item.objetivos?.medioPrazo ||
        objetivosMedioPrazoMap[item.habilidade]?.[item.nivelAlmejado] ||
        "";
      skillEntry.objetivos.longoPrazo =
        item.objetivos?.longoPrazo ||
        estruturaPEIMap[item.habilidade]?.[item.nivelAlmejado]?.objetivo ||
        "";

      let estrategiasDoItem = [];
      if (Array.isArray(item.estrategiasSelecionadas)) {
        estrategiasDoItem = item.estrategiasSelecionadas
          .filter(Boolean)
          .map((est) => est.trim());
      }

      if (estrategiasDoItem.length > 0) {
        estrategiasDoItem.forEach((strategyText) => {
          const formattedStrategy = `* ${strategyText} ${criadorInfo}`;
          if (!skillEntry.estrategiasTextList.includes(formattedStrategy)) {
            skillEntry.estrategiasTextList.push(formattedStrategy);
          }
        });
      }

      const activityText = item.atividadeAplicada?.trim();
      if (activityText) {
        const uniqueActivityKey = `${activityText}|${criadorInfo}`;
        if (!uniqueActivitiesSet.has(uniqueActivityKey)) {
          uniqueActivitiesSet.add(uniqueActivityKey);
          allActivitiesTableRows.push([activityText, criadorInfo]);
        }
      } else if (peiItem.atividadeAplicada?.trim()) {
        const activityTextFromPei = peiItem.atividadeAplicada.trim();
        const uniqueActivityKey = `${activityTextFromPei}|${criadorInfo}`;
        if (!uniqueActivitiesSet.has(uniqueActivityKey)) {
          uniqueActivitiesSet.add(uniqueActivityKey);
          allActivitiesTableRows.push([activityTextFromPei, criadorInfo]);
        }
      }
    });
  });

  consolidatedSkills.forEach((skillEntry) => {
    const objetivosCombined =
      `Curto Prazo: ${skillEntry.objetivos.curtoPrazo || "N/D."}\n` +
      `Médio Prazo: ${skillEntry.objetivos.medioPrazo || "N/D."}\n` +
      `Longo Prazo: ${skillEntry.objetivos.longoPrazo || "N/D."}`;

    const combinedStrategiesText = skillEntry.estrategiasTextList.join("\n\n");

    allPeiTableRows.push([
      skillEntry.area || "-",
      skillEntry.habilidade || "-",
      objetivosCombined,
      combinedStrategiesText || "Nenhuma estratégia definida.",
      skillEntry.nivel || "-",
      skillEntry.nivelAlmejado || "-",
    ]);
  });

  if (allPeiTableRows.length > 0) {
    y = ensurePageSpace(doc, y, 20 + (allPeiTableRows.length > 0 ? 30 : 0));
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
    const areaWidth = 22;
    const habilidadeWidth = 30;
    const objetivoWidth = 55;
    const nivelWidth = 12;
    const nivelAlmejadoWidth = 12;

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
          "Objetivos (CP/MP/LP)",
          "Estratégias",
          "N.A",
          "N.AL",
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
        cellPadding: 1.5,
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
          overflow: "linebreak",
        },
        1: {
          cellWidth: habilidadeWidth,
          overflow: "linebreak",
        },
        2: {
          cellWidth: objetivoWidth,
          overflow: "linebreak",
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
        if ([4, 5].includes(data.column.index)) {
          const nivel = data.cell.text;
          if (coresPorNivel[nivel]) {
            data.cell.styles.fillColor = coresPorNivel[nivel];
            data.cell.styles.textColor = styles.colors.white;
          }
        } else {
          data.cell.styles.fillColor = styles.colors.white;
          data.cell.styles.textColor = styles.colors.black;
        }
      },
      didDrawPage: (data) => {
        addHeaderAndFooter(doc);
      },
    });
    y = doc.lastAutoTable.finalY;

    y = ensurePageSpace(doc, y, 20);

    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.small);
    doc.text("Legenda:", 20, y + 5);
    doc.setFont(styles.font, "normal");
    doc.text("N.A - Nível Atual | N.AL - Nível Almejado", 50, y + 5);

    y += 10;
    y += 10;
  } else {
    console.log(
      "[PDF_DEBUG] PEI: Nenhuma estratégia para exibir. Pulando seção."
    );
    y = ensurePageSpace(doc, y, 20);
    doc.text(
      "Nenhuma estratégia de Plano Educacional Individualizado (PEI) detalhada encontrada para este aluno.",
      25,
      y
    );
    y += 10;
  }

  if (allActivitiesTableRows.length > 0) {
    y = ensurePageSpace(
      doc,
      y,
      20 + (allActivitiesTableRows.length > 0 ? 30 : 0)
    );
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
    console.log(
      "[PDF_DEBUG] Atividades Aplicadas: Nenhuma atividade para exibir. Pulando seção."
    );
    y = ensurePageSpace(doc, y, 20);
    doc.text(
      "Nenhuma atividade aplicada detalhada encontrada para este aluno.",
      25,
      y
    );
    y += 10;
  }

  if (allPeiTableRows.length === 0 && allActivitiesTableRows.length === 0) {
    console.log(
      "[PDF_DEBUG] PEI Consolidado: Nenhuma seção com conteúdo. Retornando Y sem adicionar."
    );
    return y;
  }

  return y;
}

/**
 * Retorna os estilos de cor para o status da meta.
 * @param {string} status - O status da meta ('Concluído', 'Em Andamento', 'Não Iniciado').
 * @returns {Object} Um objeto com os estilos de cor de preenchimento e texto.
 */
function getStatusColorStyles(status) {
  if (status === "Concluído") {
    return {
      fillColor: coresPorNivel.Concluído,
      textColor: styles.colors.white,
    };
  } else if (status === "Em Andamento") {
    return {
      fillColor: coresPorNivel["Em Andamento"],
      textColor: styles.colors.black,
    };
  } else if (status === "Não Iniciado") {
    return {
      fillColor: coresPorNivel["Não Iniciado"],
      textColor: styles.colors.white,
    };
  }
  return {
    fillColor: styles.colors.white,
    textColor: styles.colors.black,
  };
}

/**
 * Adiciona a seção de Alcance de Metas ao PDF, buscando dados da subcoleção.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Array<Object>} peis - Array de objetos PEI.
 * @param {number} y - Posição Y atual no documento.
 * @returns {Promise<number>} Nova posição Y após adicionar a seção.
 */
// ... (código anterior)

async function addMetasSection(doc, peis, y) {
  if (!peis || peis.length === 0) {
    return y;
  }

  const metasConsolidadas = new Map();

  for (const pei of peis) {
    const acompanhamento = pei.acompanhamento || {};
    const resumo = pei.resumoPEI || [];
    const peiId = pei.id;

    let observacoesDoPei = [];
    try {
      const obsQuery = query(
        collection(db, "peis", peiId, "observacoes"),
        orderBy("data", "desc")
      );
      const obsSnap = await getDocs(obsQuery);
      observacoesDoPei = obsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        data: "",
        autor: "",
      }));
    } catch (error) {
      console.error(
        `[PDF_WARN] Erro ao buscar observações para o PEI ${peiId}:`,
        error
      );
    }

    resumo.forEach((item) => {
      const habilidade = item.habilidade;
      const statusMeta = acompanhamento[habilidade]?.status || "N/A";
      const nivelAlmejado = item.nivelAlmejado || "-";
      const professor = pei.nomeCriador || "-";
      const observacoesConsolidadas = [];

      observacoesDoPei
        .filter((obs) => obs.habilidade === habilidade)
        .forEach((obs) => {
          observacoesConsolidadas.push(`• ${obs.texto || ""}`);
        });

      const key = `${habilidade}-${professor}`;
      if (!metasConsolidadas.has(key)) {
        metasConsolidadas.set(key, {
          habilidade,
          status: statusMeta,
          nivelAlmejado,
          professor,
          observacoes: observacoesConsolidadas.join("\n\n"),
        });
      } else {
        const metaExistente = metasConsolidadas.get(key);
        metaExistente.observacoes =
          metaExistente.observacoes +
          (metaExistente.observacoes.length > 0 ? "\n\n" : "") +
          observacoesConsolidadas.join("\n\n");
      }
    });
  }

  const metasTableBody = Array.from(metasConsolidadas.values())
    .filter((meta) => meta.status !== "N/A")
    .map((meta) => [
      meta.habilidade,
      meta.status,
      meta.nivelAlmejado,
      meta.observacoes,
      meta.professor,
    ]);

  // Adicione a verificação aqui para sair da função se não houver dados.
  if (metasTableBody.length === 0) {
    console.log(
      "[PDF_DEBUG] Alcance de Metas: Nenhuma meta com acompanhamento. Pulando seção."
    );
    return y; // Retorna y, impedindo que o título e a tabela sejam desenhados.
  }

  y = ensurePageSpace(doc, y, 30);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Alcance de Metas", doc.internal.pageSize.getWidth() / 2, y, {
    align: "center",
  });
  y += 8;

  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - 40;

  doc.autoTable({
    startY: y,
    head: [["Habilidade", "Status", "N.AL", "Observações", "Professor(a)"]],
    body: metasTableBody,
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.small,
      textColor: styles.colors.black,
      fillColor: styles.colors.white,
      lineColor: styles.colors.black,
      lineWidth: 0.1,
      cellPadding: 1,
      valign: "top",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: styles.colors.white,
      textColor: styles.colors.black,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: {
        cellWidth: availableWidth * 0.35,
        overflow: "linebreak",
      },
      1: {
        cellWidth: availableWidth * 0.08,
        halign: "center",
      },
      2: {
        cellWidth: availableWidth * 0.08,
        halign: "center",
      },
      3: {
        cellWidth: availableWidth * 0.39,
        overflow: "linebreak",
      },
      4: {
        cellWidth: availableWidth * 0.1,
        halign: "center",
      },
    },
    margin: {
      left: 20,
      right: 20,
      top: HEADER_AREA_HEIGHT + 10,
      bottom: FOOTER_AREA_HEIGHT,
    },
    didParseCell: (data) => {
      if (data.column.index === 1) {
        const status = data.cell.text[0];
        const statusStyles = getStatusColorStyles(status);
        Object.assign(data.cell.styles, statusStyles);
      } else {
        data.cell.styles.fillColor = styles.colors.white;
        data.cell.styles.textColor = styles.colors.black;
      }
    },
    didDrawPage: (data) => {
      addHeaderAndFooter(doc);
    },
  });

  y = doc.lastAutoTable.finalY + 10;
  return y;
}
function addObservacoesSection(doc, observacoes, y) {
  console.log(
    "DEBUG: Observações recebidas em addObservacoesSection:",
    observacoes
  );
  if (!observacoes || observacoes.length === 0) {
    console.log(
      "[PDF_DEBUG] Observações: Nenhuma observação para exibir. Pulando seção."
    );
    return y;
  }

  y = ensurePageSpace(doc, y, 30);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Observações do Aluno", doc.internal.pageSize.getWidth() / 2, y, {
    align: "center",
  });
  y += 8;

  const allObservacoesTableRows = observacoes.map((obs) => {
    const dataFormatada = new Date(obs.dataCriacao).toLocaleDateString("pt-BR");
    const dataAtualizacao = obs.dataAtualizacao
      ? new Date(obs.dataAtualizacao).toLocaleDateString("pt-BR")
      : "";
    const dataInfo = dataAtualizacao
      ? `${dataFormatada} (Atualizado: ${dataAtualizacao})`
      : dataFormatada;
    return [obs.nomeCriador || "Desconhecido", dataInfo, obs.texto || ""];
  });

  console.log(
    "DEBUG: Table body consolidado para observações:",
    allObservacoesTableRows
  );

  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = 175;
  const horizontalMargin = (pageWidth - tableWidth) / 2;

  autoTable(doc, {
    startY: y,
    head: [["Professor(a)", "Data", "Observação"]],
    body: allObservacoesTableRows,
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.small,
      textColor: styles.colors.black,
      fillColor: styles.colors.white,
      lineColor: styles.colors.black,
      lineWidth: 0.1,
      cellPadding: 1.5,
      valign: "top",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: styles.colors.white,
      textColor: styles.colors.black,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: {
        cellWidth: tableWidth * 0.25,
      },
      1: {
        cellWidth: tableWidth * 0.25,
        halign: "center",
      },
      2: {
        cellWidth: tableWidth * 0.5,
      },
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
  y = doc.lastAutoTable.finalY + 10;

  return y;
}

function addLegendSection(doc, y) {
  const legendaValida = Object.entries(legendaNiveis).filter(
    ([sigla]) => coresPorNivel[sigla]
  );

  if (legendaValida.length === 0) {
    console.log("[PDF_DEBUG] Legenda: Nenhuma entrada válida. Pulando seção.");
    return y;
  }

  const minSpaceForLegend = legendaValida.length * 7 + 20;
  y = ensurePageSpace(doc, y, minSpaceForLegend);

  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Legenda dos Níveis:", 30, y);
  y += 6;
  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.small);

  legendaValida.forEach(([sigla, descricao]) => {
    const cor = coresPorNivel[sigla];
    doc.setFillColor(...cor);
    doc.rect(22, y - 4, 8, 6, "F");
    doc.text(`${sigla} – ${descricao}`, 32, y);
    y += 7;
  });
  return y + 10;
}

async function addProfessionalSignaturesTable(doc, aluno, usuarioLogado, y) {
  const perfisComPermissaoParaGerarTabela = [
    "gestao",
    "aee",
    "seme",
    "diretor",
    "diretor adjunto",
    "orientador pedagogico",
    "desenvolvedor",
    "professor",
  ];

  const perfilUsuarioLogado = usuarioLogado?.perfil
    ?.toLowerCase()
    .replace(/_/g, " ");
  const isUserProfessorOfAluno =
    perfilUsuarioLogado === "professor" &&
    Array.isArray(aluno.professores) &&
    aluno.professores.includes(usuarioLogado.id);

  const hasPermissionToGenerateTable =
    perfisComPermissaoParaGerarTabela.includes(perfilUsuarioLogado) ||
    isUserProfessorOfAluno;

  if (!hasPermissionToGenerateTable) {
    console.log(
      "[PDF_DEBUG] Assinaturas: Usuário não tem permissão para gerar a tabela."
    );
    return y;
  }

  try {
    const perfisGestaoEscolar = [
      "diretor",
      "diretor adjunto",
      "orientador pedagogico",
      "gestao",
    ];

    const todosUsuariosSnap = await getDocs(collection(db, "usuarios"));
    const profissionaisParaAssinar = [];
    const processedIds = new Set();

    if (aluno.escolaId) {
      const escolaIdAluno = aluno.escolaId;

      todosUsuariosSnap.docs.forEach((doc) => {
        const p = {
          id: doc.id,
          ...doc.data(),
        };

        const perfilNormalizado = p.perfil?.toLowerCase().replace(/_/g, " ");

        const pertenceAEscola =
          p.escolas && Object.keys(p.escolas).includes(escolaIdAluno);

        if (
          pertenceAEscola &&
          perfisGestaoEscolar.includes(perfilNormalizado)
        ) {
          if (!processedIds.has(p.id)) {
            profissionaisParaAssinar.push(p);
            processedIds.add(p.id);
          }
        }
      });
    }

    todosUsuariosSnap.docs.forEach((doc) => {
      const p = {
        id: doc.id,
        ...doc.data(),
      };
      if (processedIds.has(p.id)) return;

      const perfilNormalizado = p.perfil?.toLowerCase().replace(/_/g, " ");

      const estaNaEscolaDoAluno =
        aluno.escolaId && Object.keys(p.escolas || {}).includes(aluno.escolaId);
      const estaNaTurmaDoAluno = aluno.turma && (p.turmas || {})[aluno.turma];
      const ehProfessorDoAluno =
        Array.isArray(aluno.professores) && aluno.professores.includes(p.id);

      if (
        (perfilNormalizado === "professor" || perfilNormalizado === "aee") &&
        estaNaEscolaDoAluno &&
        (estaNaTurmaDoAluno || ehProfessorDoAluno)
      ) {
        profissionaisParaAssinar.push(p);
        processedIds.add(p.id);
      }
    });

    profissionaisParaAssinar.sort((a, b) => {
      const ordemPerfis = {
        diretor: 1,
        "diretor adjunto": 2,
        "orientador pedagogico": 3,
        gestao: 4,
        aee: 5,
        professor: 6,
        seme: 7,
        desenvolvedor: 8,
      };
      const perfilA = a.perfil?.toLowerCase().replace(/_/g, " ") || "";
      const perfilB = b.perfil?.toLowerCase().replace(/_/g, " ");
      const ordemA = ordemPerfis[perfilA] || 99;
      const ordemB = ordemPerfis[perfilB] || 99;

      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return (a.nome || "").localeCompare(b.nome || "");
    });

    if (profissionaisParaAssinar.length === 0) {
      console.warn(
        "[PDF_DEBUG] Assinaturas: Nenhum profissional encontrado para a tabela."
      );
      return y;
    }

    y = ensurePageSpace(doc, y, profissionaisParaAssinar.length * 10 + 30);

    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Assinaturas dos Profissionais Envolvidos", 20, y);
    y += 8;

    const linhasAssinaturas = profissionaisParaAssinar.map((p) => [
      p.nome,
      p.cargo || p.perfil?.toUpperCase().replace(/_/g, " "),
      "_______________________________",
    ]);

    const tableWidth = 70 + 60 + 60;
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
        0: {
          cellWidth: 70,
        },
        1: {
          cellWidth: 60,
          halign: "center",
        },
        2: {
          cellWidth: 60,
        },
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

// --- FUNÇÃO PRINCIPAL ---
export async function gerarPDFCompleto(
  aluno,
  avaliacaoInicial,
  usuarioLogado,
  peisParaGeral = []
) {
  const doc = new jsPDF();
  let y;

  console.log("[PDF_DEBUG] Início da geração do PDF.");

  if (!aluno || !aluno.nome || !aluno.id) {
    console.error("gerarPDFCompleto: Dados do aluno são incompletos.");
    addHeaderAndFooter(doc);
    doc.text("Erro: Dados do aluno incompletos.", 20, HEADER_AREA_HEIGHT + 20);
    doc.save(
      `PEI_${aluno.nome?.replace(/\s+/g, "_") || "Desconhecido"}_Sem_Dados.pdf`
    );
    return;
  }

  let avaliacaoInteressesData = null;
  try {
    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const avaliacaoDocPath = `artifacts/${appId}/public/data/avaliacoesInteresses/${aluno.id}`;
    const avaliacaoDocRef = firestoreDoc(db, avaliacaoDocPath);
    const avaliacaoDocSnap = await getDoc(avaliacaoDocRef);

    if (avaliacaoDocSnap.exists()) {
      avaliacaoInteressesData = avaliacaoDocSnap.data().data;
    } else {
      avaliacaoInteressesData = {};
    }
  } catch (error) {
    console.error("Erro ao buscar avaliação de interesses para o PDF:", error);
    avaliacaoInteressesData = {};
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

  const observacoesAluno = await fetchObservacoes(aluno.nome);

  const hasAnyMainContent =
    peisParaExibir.length > 0 ||
    (avaliacaoInicial && Object.keys(avaliacaoInicial).length > 0) ||
    (avaliacaoInteressesData &&
      Object.keys(avaliacaoInteressesData).length > 0) ||
    observacoesAluno.length > 0;

  if (!hasAnyMainContent) {
    console.warn(
      "Nenhum PEI, avaliação inicial, avaliação de interesses ou observação preenchida encontrado para o aluno, gerando PDF básico informativo."
    );
    addHeaderAndFooter(doc);
    doc.text(
      "Nenhum Plano Educacional Individualizado (PEI), Avaliação Inicial, Avaliação de Interesses ou Observação preenchida encontrado para este aluno.",
      25,
      HEADER_AREA_HEIGHT + 20
    );
    await addSignaturePage(doc, aluno, usuarioLogado);
    doc.save(
      `PEI_${
        aluno.nome?.replace(/\s+/g, "_") || "Desconhecido"
      }_Sem_Dados_Preenchidos.pdf`
    );
    return;
  }

  let nomeEscola = "-";
  if (aluno.escolaId) {
    try {
      const escolaRef = firestoreDoc(db, "escolas", aluno.escolaId);
      const escolaSnap = await getDoc(escolaRef);
      if (escolaSnap.exists()) {
        nomeEscola = escolaSnap.data().nome || "-";
      }
    } catch (err) {
      console.error("[PDF_DEBUG] Erro ao buscar nome da escola:", err);
    }
  }

  y = HEADER_AREA_HEIGHT + 10;

  y = await addStudentAndHeaderInfo(
    doc,
    aluno,
    avaliacaoInicial,
    nomeEscola,
    y
  );
  y = addInitialAssessment(doc, avaliacaoInicial, y);
  y = addAvaliacaoInteressesSection(doc, avaliacaoInteressesData, y);
  y = addConsolidatedPeiSection(doc, peisParaExibir, y);
  y = await addMetasSection(doc, peisParaExibir, y);
  y = addObservacoesSection(doc, observacoesAluno, y);
  y = addLegendSection(doc, y);

  await addSignaturePage(doc, aluno, usuarioLogado);

  doc.save(`Pei ${aluno.nome}.pdf`);
  console.log("[PDF_DEBUG] Geração do PDF concluída.");
}
