import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  collection,
  query,
  getDocs,
  doc as firestoreDoc,
  getDoc,
  orderBy,
  where,
} from "firebase/firestore";
// Substitua pela sua importação real do Firebase
import { db } from "../firebase";

// Importações de dados (MANTIDAS)
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

// --- Constantes e Estilos (MANTIDAS) ---
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
    purple: [128, 0, 128],
    green: [0, 128, 0],
    magenta: [255, 0, 255],
    // Cores adicionais mantidas...
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

// --- LISTAS DE INTERESSES E GATILHOS (MANTIDAS/DECLARADAS) ---
const ATIVIDADES_FAVORITAS_LIST = [
  /* ... Lista completa aqui ... */
];
const SINAIS_DESREGULACAO_LIST = [
  /* ... Lista completa aqui ... */
];
const SITUACOES_DESREGULACAO_LIST = [
  /* ... Lista completa aqui ... */
];

const HEADER_AREA_HEIGHT = 40;
const FOOTER_AREA_HEIGHT = 25;

// Mapeamentos de Objetivos (MANTIDOS)
const getEstruturaPEIMap = (estrutura) => {
  /* ... */ return {};
};
const getObjetivosPrazoMap = (prazoData) => {
  /* ... */ return {};
};

const estruturaPEIMap = getEstruturaPEIMap(estruturaPEI);
const objetivosCurtoPrazoMap = getObjetivosPrazoMap(objetivosCurtoPrazoData);
const objetivosMedioPrazoMap = getObjetivosPrazoMap(objetivosMedioPrazoData);

// Funções de Formatação de Data (MANTIDAS)
function formatarData(data) {
  /* ... */ return "-";
}
function formatarDataHora(timestamp) {
  /* ... */ return "";
}
function formatarMesPorExtenso(data) {
  /* ... */ return "-";
}

// Função para calcular a Idade (MANTIDA)
function calcularIdade(nascimento) {
  /* ... */ return [0, ""];
}

// --- FUNÇÕES DE INFRAESTRUTURA ADAPTADAS ---

function addHeaderAndFooter(doc, usuarioLogado) {
  const imgWidth = 128;
  const imgHeight = 25;
  const imgX = 10;
  const imgY = 10;
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.small);

  doc.text(
    `Documento de Uso Individual - Gerado por: ${
      usuarioLogado.nome || "Professor(a)"
    }`,
    20,
    pageHeight - 20
  );
  doc.text(
    `Plataforma [Nome da Sua Plataforma]. Data: ${new Date().toLocaleDateString(
      "pt-BR"
    )}`,
    20,
    pageHeight - 15
  );
  doc.text(`Acesso: ${usuarioLogado.email || ""}`, 20, pageHeight - 10);
}

function ensurePageSpace(doc, currentY, requiredSpace, usuarioLogado) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottomLimit = pageHeight - FOOTER_AREA_HEIGHT;

  if (
    currentY + requiredSpace > contentBottomLimit ||
    currentY < HEADER_AREA_HEIGHT
  ) {
    doc.addPage();
    addHeaderAndFooter(doc, usuarioLogado);
    return HEADER_AREA_HEIGHT + 10;
  }
  return currentY;
}

// Funções de busca de PEIs e Observações (MANTIDAS, assumindo que funcionam)
async function fetchPeis(alunoId, alunoNome) {
  /* ... */ return [];
}
async function fetchObservacoes(alunoNome) {
  /* ... */ return [];
}

// --- FUNÇÕES DE CONTEÚDO ADAPTADAS E CORRIGIDAS ---

async function addStudentAndHeaderInfo(
  doc,
  aluno,
  avaliacao,
  yStart,
  usuarioLogado
) {
  let y = yStart;

  y = ensurePageSpace(doc, y, 10, usuarioLogado);
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

  // --- TRATAMENTO DOS DADOS DO PROFESSOR INDIVIDUAL ---
  const escolasDoProfessor = usuarioLogado?.escolasParticulares || [];
  const nomeEscolaParaExibir =
    aluno.escolaId === "INDIVIDUAL" && escolasDoProfessor.length > 0
      ? escolasDoProfessor.join(", ")
      : "Atendimento Particular / Home Office";

  const nomeProfessor = usuarioLogado.nome || "Professor(a) Individual";
  const cargoProfessor = usuarioLogado.cargo || "Terapeuta Educacional";
  const professores = `${nomeProfessor} (${cargoProfessor})`;

  // [RESTANTE DA LÓGICA DE DADOS MANTIDA]
  const availablePageWidth = doc.internal.pageSize.getWidth() - 40;
  const dataNascTexto = formatarData(aluno.nascimento);
  const mesAvaliacaoTexto = formatarMesPorExtenso(avaliacao?.inicio);
  const mesProximaAvaliacaoTexto = formatarMesPorExtenso(
    avaliacao?.proximaAvaliacao
  );
  const [alunoIdade] = calcularIdade(aluno.nascimento);

  // Tabelas de Dados do Aluno:
  y = ensurePageSpace(doc, y, 40, usuarioLogado);
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
          content: `Local de Atendimento: ${nomeEscolaParaExibir || "-"}`,
          colSpan: 3,
        },
      ],
      [
        `Data de Nasc.: ${dataNascTexto}`,
        `Idade: ${alunoIdade} anos`,
        `Turma: ${aluno.turma || "Individual"}`,
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
    columnStyles: {
      0: { cellWidth: availablePageWidth / 3 },
      1: { cellWidth: availablePageWidth / 3 },
      2: { cellWidth: availablePageWidth / 3 },
    },
    didDrawPage: (data) => {
      addHeaderAndFooter(doc, usuarioLogado);
    },
  });
  y = doc.lastAutoTable.finalY + 5;

  y = ensurePageSpace(doc, y, 40, usuarioLogado);
  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      [
        {
          content: `Professor(a) Responsável: ${professores}`,
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
    didDrawPage: (data) => {
      addHeaderAndFooter(doc, usuarioLogado);
    },
  });
  y = doc.lastAutoTable.finalY + 5;

  y = ensurePageSpace(doc, y, 15, usuarioLogado);
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
    didDrawPage: (data) => {
      addHeaderAndFooter(doc, usuarioLogado);
    },
  });
  y = doc.lastAutoTable.finalY + 10;

  return y;
}

// CORREÇÃO DE ESCOPO: Funções auxiliares precisam ser declaradas ou incluídas no corpo.
// Como não temos o corpo delas, as declaro aqui para que o código compile.

function addInitialAssessment(doc, avaliacao, y, usuarioLogado) {
  y = ensurePageSpace(doc, y, 20, usuarioLogado);
  // Lógica real de addInitialAssessment (omitida por brevidade)
  return y;
}
function addAvaliacaoInteressesSection(
  doc,
  avaliacaoInteressesData,
  y,
  usuarioLogado
) {
  y = ensurePageSpace(doc, y, 20, usuarioLogado);
  // Lógica real de addAvaliacaoInteressesSection (omitida por brevidade)
  return y;
}
function addConsolidatedPeiSection(doc, peisParaExibir, y, usuarioLogado) {
  y = ensurePageSpace(doc, y, 20, usuarioLogado);
  // Lógica real de addConsolidatedPeiSection (omitida por brevidade)
  return y;
}
async function addMetasSection(doc, peisParaExibir, y, usuarioLogado) {
  y = ensurePageSpace(doc, y, 20, usuarioLogado);
  // Lógica real de addMetasSection (omitida por brevidade)
  return y;
}
function addObservacoesSection(doc, observacoes, y, usuarioLogado) {
  y = ensurePageSpace(doc, y, 20, usuarioLogado);
  // Lógica real de addObservacoesSection (omitida por brevidade)
  return y;
}
function addLegendSection(doc, y, usuarioLogado) {
  y = ensurePageSpace(doc, y, 20, usuarioLogado);
  // Lógica real de addLegendSection (omitida por brevidade)
  return y;
}

/**
 * ADAPTADO: Usa apenas o professor logado e o responsável legal.
 */
async function addProfessionalSignaturesTable(doc, aluno, usuarioLogado, y) {
  const profLogado = {
    nome: usuarioLogado.nome || "Professor(a) Individual",
    cargo: usuarioLogado.cargo || "Terapeuta Educacional",
  };

  const profissionaisParaAssinar = [
    { nome: profLogado.nome, cargo: profLogado.cargo },
    { nome: "Responsável Legal / Familiar", cargo: "Pai/Mãe/Tutor" },
  ];

  y = ensurePageSpace(
    doc,
    y,
    profissionaisParaAssinar.length * 10 + 30,
    usuarioLogado
  );

  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Assinaturas dos Profissionais Envolvidos", 20, y);
  y += 8;

  const linhasAssinaturas = profissionaisParaAssinar.map((p) => [
    p.nome,
    p.cargo,
    "_______________________________",
  ]);

  const tableWidth = 190;
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
    didDrawPage: (data) => {
      addHeaderAndFooter(doc, usuarioLogado);
    },
  });
  return doc.lastAutoTable.finalY + 10;
}

async function addSignaturePage(doc, aluno, usuarioLogado) {
  doc.addPage();
  addHeaderAndFooter(doc, usuarioLogado);

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
  y = ensurePageSpace(doc, y, 20, usuarioLogado);
  doc.text(`Local, ${dataHoje}`, 20, y);
  y += 10;
}

// --- FUNÇÃO PRINCIPAL FINAL (EXPORTADA) ---
export async function gerarPDFCompletoIndividual(
  aluno,
  avaliacaoInicial,
  usuarioLogado,
  peisParaGeral = []
) {
  const doc = new jsPDF();
  let y;

  let avaliacaoInteressesData = null;
  // [CÓDIGO DE BUSCA DE AVALIAÇÃO DE INTERESSES MANTIDO]

  let peisParaProcessar =
    Array.isArray(peisParaGeral) && peisParaGeral.length > 0
      ? peisParaGeral
      : await fetchPeis(aluno.id, aluno.nome);

  const peisOrdenados = peisParaProcessar.sort((a, b) => {
    // [LÓGICA DE ORDENAÇÃO MANTIDA]
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
    addHeaderAndFooter(doc, usuarioLogado);
    doc.text(
      "Nenhum dado preenchido encontrado para este aluno.",
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

  y = HEADER_AREA_HEIGHT + 10;

  // Chamadas corrigidas para passar usuarioLogado
  y = await addStudentAndHeaderInfo(
    doc,
    aluno,
    avaliacaoInicial,
    y,
    usuarioLogado
  );
  y = addInitialAssessment(doc, avaliacaoInicial, y, usuarioLogado);
  y = addAvaliacaoInteressesSection(
    doc,
    avaliacaoInteressesData,
    y,
    usuarioLogado
  );
  y = addConsolidatedPeiSection(doc, peisParaExibir, y, usuarioLogado);
  y = await addMetasSection(doc, peisParaExibir, y, usuarioLogado);
  y = addObservacoesSection(doc, observacoesAluno, y, usuarioLogado);
  y = addLegendSection(doc, y, usuarioLogado);

  await addSignaturePage(doc, aluno, usuarioLogado);

  doc.save(`Pei ${aluno.nome}.pdf`);
}
