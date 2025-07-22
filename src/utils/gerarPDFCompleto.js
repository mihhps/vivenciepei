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
import { db } from "../firebase";

// Importa a função centralizada!
// Certifique-se de que este caminho está correto para o seu projeto.
import { fetchAvaliacaoInteresses } from "./firebaseUtils";

// NOVOS IMPORTS DOS OBJETIVOS POR PRAZO
import estruturaPEI from "../data/estruturaPEI2"; // Seu arquivo principal de estratégias (e Longo Prazo)
import objetivosCurtoPrazoData from "../data/objetivosCurtoPrazo";
import objetivosMedioPrazoData from "../data/objetivosMedioPrazo";

// --- Constantes e Estilos ---
const styles = {
  font: "times", // Fonte Times New Roman
  fontSize: {
    xsmall: 7, // Adicionado para tabelas muito densas
    small: 8,
    medium: 10,
    large: 12,
    title: 18,
  },
  // --- DEFINIÇÕES DE CORES ---
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
  // --- CORES POR NÍVEL ---
  NR: styles.colors.red,
  AF: styles.colors.yellow,
  AG: styles.colors.purple,
  AV: styles.colors.grayLight,
  AVi: styles.colors.green,
  I: styles.colors.magenta,
  Sim: [76, 175, 80],
  Não: [230, 57, 70],
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

// --- Mapeamento das Estruturas de Dados para acesso rápido ---

/**
 * Mapeia a estrutura principal de habilidades para facilitar o acesso a objetivos de Longo Prazo e estratégias.
 * @param {Object} estrutura - A estrutura de dados `estruturaPEI`.
 * @returns {Object} Um mapa para acesso rápido: { habilidade: { nivel: { objetivo: "...", estrategias: [...] } } }
 */
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
                  // Corrigido: a linha de atribuição está DENTRO do forEach
                  Object.entries(niveisData).forEach(([nivel, data]) => {
                    map[habilidadeName][nivel] = data; // Contém objetivo (Longo Prazo) e estratégias
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

/**
 * Mapeia as estruturas de objetivos por prazo (Curto, Médio) para facilitar o acesso.
 * @param {Object} prazoData - A estrutura de dados para o prazo específico (objetivosCurtoPrazoData ou objetivosMedioPrazoData).
 * @returns {Object} Um mapa para acesso rápido: { habilidade: { nivelAlmejado: objetivoText } }
 */
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
                    map[habilidadeName][nivel] = objData.objetivo; // Salva diretamente o texto do objetivo
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

// Inicializa os mapas que serão usados em todas as funções
const estruturaPEIMap = getEstruturaPEIMap(estruturaPEI);
const objetivosCurtoPrazoMap = getObjetivosPrazoMap(objetivosCurtoPrazoData);
const objetivosMedioPrazoMap = getObjetivosPrazoMap(objetivosMedioPrazoData);

// --- Funções Auxiliares Comuns ---

/**
 * Formata um objeto de data ou string para o formato DD/MM/AAAA.
 * @param {firebase.firestore.Timestamp|Date|string} data - A data a ser formatada.
 * @returns {string} Data formatada ou "-".
 */
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

/**
 * Formata um objeto de data ou string para o nome do mês por extenso em português.
 * @param {firebase.firestore.Timestamp|Date|string} data - A data a ser formatada.
 * @returns {string} Nome do mês por extenso ou "-".
 */
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

/**
 * Adiciona o cabeçalho e rodapé padrão a cada página do PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 */
function addHeaderAndFooter(doc) {
  const imgWidth = 128;
  const imgHeight = 25;
  const imgX = 10;
  const imgY = 10;
  const pageHeight = doc.internal.pageSize.getHeight();

  // Adiciona a imagem do logo
  doc.addImage("/logo.jpg", "JPEG", imgX, imgY, imgWidth, imgHeight);

  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.small);

  // Adiciona informações do rodapé
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

/**
 * Verifica se há espaço suficiente na página para o conteúdo. Se não houver, adiciona uma nova página.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {number} currentY - Posição Y atual no documento.
 * @param {number} requiredSpace - Espaço necessário para o próximo conteúdo.
 * @returns {number} Nova posição Y após garantir o espaço (ou o topo da nova página).
 */
function ensurePageSpace(doc, currentY, requiredSpace) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottomLimit = pageHeight - FOOTER_AREA_HEIGHT;

  if (
    currentY + requiredSpace > contentBottomLimit ||
    currentY < HEADER_AREA_HEIGHT
  ) {
    doc.addPage();
    addHeaderAndFooter(doc);
    return HEADER_AREA_HEIGHT + 10; // Retorna a posição Y no topo da nova página
  }
  return currentY;
}

/**
 * Busca os Planos Educacionais Individualizados (PEIs) de um aluno no Firestore.
 * Busca em ambas as coleções (nova e antiga) e consolida os resultados.
 * @param {string} alunoId - ID do aluno.
 * @param {string} alunoNome - Nome do aluno (usado como fallback para coleções antigas).
 * @returns {Promise<Array<Object>>} Array de objetos PEI.
 */
async function fetchPeis(alunoId, alunoNome) {
  try {
    const currentYear = new Date().getFullYear();
    let allPeis = [];

    // 1. Buscar na coleção "pei_contribucoes"
    let qNew = query(
      collection(db, "pei_contribucoes"),
      where("alunoId", "==", alunoId),
      where("anoLetivo", "==", currentYear), // **IMPORTANTE: FILTRA PELO ANO LETIVO**
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

    // 2. Buscar na coleção "peis" (antiga)
    // Esta busca será feita SEMPRE, não apenas se a primeira estiver vazia
    let qOld = query(
      collection(db, "peis"),
      where("alunoId", "==", alunoId),
      where("anoLetivo", "==", currentYear), // **IMPORTANTE: FILTRA PELO ANO LETIVO**
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
    // Opcional: Remover duplicatas pelo ID do documento (caso um PEI tenha sido salvo em ambas as coleções por engano)
    const uniquePeis = Array.from(
      new Map(allPeis.map((item) => [item.id, item])).values()
    );

    // Ordenar todos os PEIs encontrados (importante para consistência)
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

/**
 * NOVO: Busca as observações de um aluno no Firestore.
 * @param {string} alunoNome - Nome do aluno para filtrar as observações.
 * @returns {Promise<Array<Object>>} Array de objetos de observação.
 */
async function fetchObservacoes(alunoNome) {
  try {
    const q = query(
      collection(db, "observacoesAluno"),
      where("alunoNome", "==", alunoNome),
      orderBy("dataCriacao", "desc") // Ordena da mais recente para a mais antiga
    );
    const querySnapshot = await getDocs(q);
    const observacoes = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dataCriacao: doc.data().dataCriacao?.toDate(), // Converte Timestamp para Date
      dataAtualizacao: doc.data().dataAtualizacao?.toDate(), // Converte Timestamp para Date
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

/**
 * Adiciona as informações do aluno e cabeçalho do PEI ao documento.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} aluno - Objeto com os dados do aluno.
 * @param {Object} avaliacao - Objeto da avaliação inicial (pode ser nulo).
 * @param {string} nomeEscola - Nome da escola.
 * @param {number} yStart - Posição Y inicial.
 * @returns {Promise<number>} Nova posição Y após adicionar as informações.
 */
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

/**
 * Adiciona a seção de Avaliação Inicial (Habilidades a Desenvolver) ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} avaliacao - Objeto da avaliação inicial.
 * @param {number} y - Posição Y atual no documento.
 * @returns {number} Nova posição Y após adicionar a seção.
 */
function addInitialAssessment(doc, avaliacao, y) {
  const dadosAvaliacao = avaliacao?.respostas || avaliacao?.habilidades;

  // Filtra as habilidades para incluir SOMENTE aquelas que não são 'NA' nem 'I'
  const habilidadesFiltradas = {};
  if (dadosAvaliacao) {
    for (const area in dadosAvaliacao) {
      const habilidadesNaArea = dadosAvaliacao[area];
      const habilidadesValidasNaArea = Object.entries(habilidadesNaArea || {})
        .filter(([habilidade, nivel]) => nivel !== "NA" && nivel !== "I") // Condição para inclusão
        .map(([habilidade, nivel]) => [habilidade, nivel]); // Formata para o corpo da tabela

      if (habilidadesValidasNaArea.length > 0) {
        habilidadesFiltradas[area] = habilidadesValidasNaArea;
      }
    }
  }

  // Se não há nenhuma habilidade filtrada para exibir, pula a seção
  if (Object.keys(habilidadesFiltradas).length === 0) {
    console.log(
      "[PDF_DEBUG] Avaliação Inicial: Nenhuma habilidade para exibir (todas NA ou I)."
    );
    return y; // Retorna o Y sem adicionar a seção
  }

  y = ensurePageSpace(doc, y, 30);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Avaliação Inicial (Habilidades a Desenvolver)", 20, y);
  y += 8;

  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - 40; // Margem de 20 de cada lado

  for (const area in habilidadesFiltradas) {
    const linhasDaArea = habilidadesFiltradas[area];

    y = ensurePageSpace(doc, y, 15);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.medium);
    doc.text(area, 20, y);
    y += 6;

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
        0: { cellWidth: availableWidth * 0.85 },
        1: { cellWidth: availableWidth * 0.15, halign: "center" },
      },
      margin: {
        left: 20,
        right: 20,
        top: HEADER_AREA_HEIGHT + 10,
        bottom: FOOTER_AREA_HEIGHT,
      },
      didParseCell: (data) => {
        const nivel = data.cell.text[0]; // Pega o texto da célula (o nível NR, AF, etc.)
        if (data.column.index === 1 && coresPorNivel[nivel]) {
          // Se for a coluna do nível
          data.cell.styles.fillColor = coresPorNivel[nivel];
          data.cell.styles.textColor = styles.colors.white; // Texto branco para melhor contraste
        } else {
          data.cell.styles.fillColor = styles.colors.white;
          data.cell.styles.textColor = styles.colors.black;
        }
      },
      didDrawPage: (data) => {
        addHeaderAndFooter(doc);
      },
    });
    y = doc.lastAutoTable.finalY + 5; // Espaçamento entre as áreas

    // Adiciona Observações da área se existirem e não estiverem vazias
    const observacaoArea = avaliacao.observacoes?.[area];
    if (observacaoArea && observacaoArea.trim().length > 0) {
      y = ensurePageSpace(doc, y, 15);
      doc.setFont(styles.font, "bold");
      doc.setFontSize(styles.fontSize.medium);
      doc.text(`Observações (${area}):`, 20, y);
      y += 6;
      doc.setFont(styles.font, "normal");
      doc.setFontSize(styles.fontSize.small);
      // Usar autoTable para texto longo com quebra de linha automática
      autoTable(doc, {
        startY: y,
        body: [[observacaoArea]],
        styles: {
          font: styles.font,
          fontSize: styles.fontSize.small,
          textColor: styles.colors.black,
          fillColor: styles.colors.white,
          lineColor: styles.colors.black,
          lineWidth: 0.1,
          cellPadding: 2,
          valign: "top",
          overflow: "linebreak",
        },
        columnStyles: {
          0: { cellWidth: availableWidth },
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
    }
  }
  return y + 10; // Espaçamento após a seção completa
}

/**
 * Adiciona a seção de Avaliação de Interesses e Gatilhos ao PDF.
 * O título da seção sempre aparece. Se não houver dados, uma mensagem é exibida.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} avaliacaoInteressesData - Objeto com os dados da avaliação de interesses.
 * @param {number} y - Posição Y atual no documento.
 * @returns {number} Nova posição Y após adicionar a seção.
 */
function addAvaliacaoInteressesSection(doc, avaliacaoInteressesData, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentMargin = 20;
  const availableWidth = pageWidth - 2 * contentMargin;

  // Adiciona o título da seção SEMPRE
  y = ensurePageSpace(doc, y, 30);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Avaliação de Interesses e Gatilhos", contentMargin, y);
  y += 8;

  // Verifica se há dados para preencher o conteúdo das subseções
  const hasDataForContent =
    avaliacaoInteressesData && Object.keys(avaliacaoInteressesData).length > 0;

  // Se não há dados, adiciona uma mensagem e retorna
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

  // Helper para adicionar tabelas de perguntas de rádio (Sim/Não/NA)
  const addRadioQuestionTable = (questionTitle, dataKey, list) => {
    const radioTableBody = [];
    const responses = avaliacaoInteressesData[dataKey] || {};

    // Filtra para incluir apenas itens que não são "NA" e que não são indefinidos
    const filledItems = list.filter(
      (item) => responses[item] !== "NA" && responses[item] !== undefined
    );

    if (filledItems.length === 0) return false; // Não adiciona se não houver itens preenchidos

    y = ensurePageSpace(doc, y, 15);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.medium);
    doc.text(`${questionTitle}:`, contentMargin, y);
    y += 6;

    filledItems.forEach((item) => {
      const response = responses[item];
      radioTableBody.push([item, response]);
    });

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

  // --- NOVAS ESTRUTURAS PARA AS PERGUNTAS DESCRITIVAS ---

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
        dataKey: "situacaoRecentDesregulacao",
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
          { content: question, styles: { fontStyle: "bold" } },
          answer,
        ]);
      }
    });

    if (tableBody.length === 0) return false; // Não adiciona se não houver respostas preenchidas

    y = ensurePageSpace(doc, y, 20);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.medium);
    doc.text(`${title}:`, contentMargin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [], // Sem cabeçalho fixo, pois cada linha já tem a pergunta
      body: tableBody,
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.medium, // Pode ajustar se quiser menor
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
    y = doc.lastAutoTable.finalY + 10;
    return true;
  };

  // --- SEÇÕES DE CONTEÚDO (ORDENADAS) ---

  // Seção 1: Interesses e Pontos Fortes (radio + descritivas)
  addRadioQuestionTable(
    "Atividades Favoritas",
    "atividadesFavoritas",
    ATIVIDADES_FAVORITAS_LIST
  );
  addConsolidatedTextTable(
    "Detalhes de Interesses e Pontos Fortes",
    textQuestions.interessesEPontosFortes
  );

  // Seção 2: Gatilhos de Desregulação e Desconforto (radio + descritivas)
  addRadioQuestionTable(
    "Sinais de Desregulação",
    "sinaisDesregulacao",
    SINAIS_DESREGULACAO_LIST
  );
  addConsolidatedTextTable(
    "Detalhes de Gatilhos e Desregulação",
    textQuestions.gatilhosEDesregulacao
  );

  // Seção 3: Estratégias e Apoio (apenas descritivas)
  addConsolidatedTextTable(
    "Estratégias e Apoio",
    textQuestions.estrategiasEApoio
  );

  return y + 10;
}
/**
 * Adiciona a seção de PEI consolidado ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Array<Object>} peisParaExibir - Array de objetos PEI para exibir.
 * @param {number} y - Posição Y atual no documento.
 * @returns {number} Nova posição Y após adicionar a seção.
 */
function addConsolidatedPeiSection(doc, peisParaExibir, y) {
  const allPeiTableRows = [];
  const allActivitiesTableRows = [];
  const uniqueActivitiesSet = new Set();

  // Usamos um Map para consolidar habilidades únicas.
  // A chave agora inclui Nível Atual e Nível Almejado para garantir unicidade na consolidação.
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
      // Chave única para a habilidade considerando o Nível Atual e Nível Almejado
      const key = `${item.area || "-"}|${item.habilidade || "-"}|${item.nivel || "-"}|${item.nivelAlmejado || "-"}`;
      let skillEntry = consolidatedSkills.get(key);

      if (!skillEntry) {
        skillEntry = {
          area: item.area || "-",
          habilidade: item.habilidade || "-",
          // Inicializa objetivos com base nos dados do item (que já vêm com CP/MP/LP)
          objetivos: { curtoPrazo: "", medioPrazo: "", longoPrazo: "" },
          estrategiasTextList: [], // Armazenará estratégias de todos os professores
          nivel: item.nivel || "-",
          nivelAlmejado: item.nivelAlmejado || "-",
        };
        consolidatedSkills.set(key, skillEntry);
      }

      // Preenche/atualiza os objetivos para a skillEntry
      // Prioriza os objetivos do item salvo. Se não existirem, busca nos mapas.
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

      // Adiciona as estratégias (selecionadas por esse professor)
      let estrategiasDoItem = [];
      if (Array.isArray(item.estrategiasSelecionadas)) {
        estrategiasDoItem = item.estrategiasSelecionadas
          .filter(Boolean)
          .map((est) => est.trim());
      }

      if (estrategiasDoItem.length > 0) {
        estrategiasDoItem.forEach((strategyText) => {
          // Adiciona a estratégia apenas se ainda não estiver na lista consolidada para essa habilidade
          const formattedStrategy = `* ${strategyText} ${criadorInfo}`;
          if (!skillEntry.estrategiasTextList.includes(formattedStrategy)) {
            skillEntry.estrategiasTextList.push(formattedStrategy);
          }
        });
      }

      // Adiciona atividades aplicadas (uma vez por PEI/Criador)
      const activityText = item.atividadeAplicada?.trim(); // Preferir da meta, se houver
      if (activityText) {
        const uniqueActivityKey = `${activityText}|${criadorInfo}`;
        if (!uniqueActivitiesSet.has(uniqueActivityKey)) {
          uniqueActivitiesSet.add(uniqueActivityKey);
          allActivitiesTableRows.push([activityText, criadorInfo]);
        }
      } else if (peiItem.atividadeAplicada?.trim()) {
        // Fallback para atividade do PEI principal
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
    // Formata os três objetivos para exibição em uma única célula
    const objetivosCombined =
      `Curto Prazo: ${skillEntry.objetivos.curtoPrazo || "N/D."}\n` +
      `Médio Prazo: ${skillEntry.objetivos.medioPrazo || "N/D."}\n` +
      `Longo Prazo: ${skillEntry.objetivos.longoPrazo || "N/D."}`;

    const combinedStrategiesText = skillEntry.estrategiasTextList.join("\n\n");

    allPeiTableRows.push([
      skillEntry.area || "-",
      skillEntry.habilidade || "-",
      objetivosCombined, // Agora é o texto formatado com todos os prazos
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
    // Reajustando as larguras das colunas para melhor encaixe
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

    // Calcula o espaço restante para as estratégias
    const availableWidthForStrategies =
      larguraPagina - defaultTotalHorizontalMargin - fixedColumnsTotalWidth;

    const estrategiasWidth = Math.max(70, availableWidthForStrategies);

    // Recalcula a margem para centralizar a tabela com as novas larguras
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
        // Lógica de cores para os níveis
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

    // --- NOVO: Adiciona a legenda para N.A e N.AL ---
    y = ensurePageSpace(doc, y, 20);

    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.small);
    doc.text("Legenda:", 20, y + 5);
    doc.setFont(styles.font, "normal");
    doc.text("N.A - Nível Atual | N.AL - Nível Almejado", 50, y + 5);

    y += 10;
    // --- FIM da nova legenda ---

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
    const tableWidth = 175; // Largura total da tabela de atividades
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
 * NOVO: Adiciona a seção de Observações do Aluno ao PDF, como uma tabela consolidada.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Array<Object>} observacoes - Array de objetos de observação do aluno.
 * @param {number} y - Posição Y atual no documento.
 * @returns {number} Nova posição Y após adicionar a seção.
 */
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
  const tableWidth = 175; // Largura total da tabela, similar às atividades
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
      0: { cellWidth: tableWidth * 0.25 }, // Professor
      1: { cellWidth: tableWidth * 0.25, halign: "center" }, // Data
      2: { cellWidth: tableWidth * 0.5 }, // Observação
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

/**
 * Adiciona a seção de legenda dos níveis ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {number} y - Posição Y atual no documento.
 * @returns {number} Nova posição Y após adicionar a seção.
 */
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

/**
 * Adiciona a tabela de assinaturas dos profissionais envolvidos ao PDF.
 * A gestão da escola do aluno (Diretor, Diretor Adjunto, Orientador Pedagógico, Gestão)
 * será sempre incluída.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} aluno - Objeto com os dados do aluno.
 * @param {Object} usuarioLogado - Objeto com os dados do usuário logado.
 * @param {number} y - Posição Y atual no documento.
 * @returns {Promise<number>} Nova posição Y após adicionar a tabela.
 */
async function addProfessionalSignaturesTable(doc, aluno, usuarioLogado, y) {
  const perfisComPermissaoParaGerarTabela = [
    "gestao",
    "aee",
    "seme",
    "diretor",
    "diretor adjunto",
    "orientador pedagogico", // Usa espaço
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
    // Perfis de gestão que devem sempre aparecer se pertencerem à escola do aluno
    const perfisGestaoEscolar = [
      "diretor",
      "diretor adjunto",
      "orientador pedagogico",
      "gestao",
    ];

    const todosUsuariosSnap = await getDocs(collection(db, "usuarios"));
    const profissionaisParaAssinar = [];
    const processedIds = new Set();

    // 1. Adiciona a GESTÃO DA ESCOLA (Diretor, Adjunto, Orientador, Gestão)
    if (aluno.escolaId) {
      const escolaIdAluno = aluno.escolaId;

      todosUsuariosSnap.docs.forEach((doc) => {
        const p = { id: doc.id, ...doc.data() };

        // Padroniza o perfil vindo do banco (substitui '_' por ' ') para a verificação.
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

    // 2. Adiciona outros profissionais relevantes (professores da turma, AEE) que ainda não foram incluídos
    todosUsuariosSnap.docs.forEach((doc) => {
      const p = { id: doc.id, ...doc.data() };
      if (processedIds.has(p.id)) return; // Pula se já foi adicionado (é da gestão)

      // Também padroniza o perfil aqui para consistência
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

    // Ordena os profissionais para uma apresentação consistente no PDF
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
      // Usa o perfil padronizado também na ordenação.
      const perfilA = a.perfil?.toLowerCase().replace(/_/g, " ") || "";
      const perfilB = b.perfil?.toLowerCase().replace(/_/g, " ") || "";
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

/**
 * Adiciona uma página de assinaturas ao final do documento.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} aluno - Objeto com os dados do aluno.
 * @param {Object} usuarioLogado - Objeto com os dados do usuário logado.
 */
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

/**
 * Gera o PDF completo do PEI para um aluno.
 * @param {Object} aluno - Objeto com os dados do aluno.
 * @param {Object} avaliacaoInicial - Objeto da avaliação inicial do aluno.
 * @param {Object} usuarioLogado - Objeto com os dados do usuário logado.
 * @param {Array<Object>} [peisParaGeral=[]] - Array opcional de PEIs a serem exibidos.
 */
export async function gerarPDFCompleto(
  aluno,
  avaliacaoInicial, // Objeto de avaliação inicial
  usuarioLogado,
  peisParaGeral = [] // Array de PEIs a serem exibidos
) {
  const doc = new jsPDF();
  let y;

  console.log("[PDF_DEBUG] Início da geração do PDF.");
  console.log("[PDF_DEBUG] Aluno recebido:", aluno);
  console.log("[PDF_DEBUG] Aluno ID:", aluno.id, "Nome:", aluno.nome);
  console.log(
    "[PDF_DEBUG] Usuário Logado ID:",
    usuarioLogado.id,
    "Perfil:",
    usuarioLogado.perfil
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

  const avaliacaoInteressesData = await fetchAvaliacaoInteresses(
    aluno.id,
    usuarioLogado.id,
    usuarioLogado.perfil
  );
  console.log(
    "[PDF_DEBUG] avaliacaoInteressesData BUSCADA (internamente):",
    avaliacaoInteressesData
  );
  console.log(
    "[PDF_DEBUG] Tipo de avaliacaoInteressesData:",
    typeof avaliacaoInteressesData
  );
  console.log(
    "[PDF_DEBUG] avaliacaoInteressesData está vazio?",
    Object.keys(avaliacaoInteressesData || {}).length === 0
  );

  let peisParaProcessar =
    Array.isArray(peisParaGeral) && peisParaGeral.length > 0
      ? peisParaGeral
      : await fetchPeis(aluno.id, aluno.nome);
  console.log("[DEBUG] PEIs processados:", peisParaProcessar);
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

  // NOVO: Buscar as observações do aluno
  const observacoesAluno = await fetchObservacoes(aluno.nome); // Passa o nome do aluno
  console.log("DEBUG: Observações do Aluno buscadas:", observacoesAluno); // <--- ADICIONADO PARA DEBUG

  const hasAnyMainContent =
    peisParaExibir.length > 0 ||
    (avaliacaoInicial && Object.keys(avaliacaoInicial).length > 0) ||
    (avaliacaoInteressesData &&
      Object.keys(avaliacaoInteressesData).length > 0) ||
    observacoesAluno.length > 0; // Inclui observações na verificação de conteúdo

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
      `PEI_${aluno.nome?.replace(/\s+/g, "_") || "Desconhecido"}_Sem_Dados_Preenchidos.pdf`
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
        console.log("[PDF_DEBUG] Nome da escola encontrado:", nomeEscola);
      } else {
        console.warn(
          `[PDF_DEBUG] Escola não encontrada para o ID: ${aluno.escolaId}`
        );
      }
    } catch (err) {
      console.error("[PDF_DEBUG] Erro ao buscar nome da escola:", err);
    }
  } else {
    console.log("[PDF_DEBUG] aluno.escolaId não fornecido.");
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
  y = addObservacoesSection(doc, observacoesAluno, y); // <--- NOVO: Adiciona a seção de observações
  y = addLegendSection(doc, y);

  await addSignaturePage(doc, aluno, usuarioLogado);

  doc.save(`PEI_${aluno.nome?.replace(/\s+/g, "_")}_Completo.pdf`);
  console.log("[PDF_DEBUG] Geração do PDF concluída.");
}
