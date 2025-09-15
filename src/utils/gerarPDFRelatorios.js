import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  collection,
  query,
  where,
  getDocs,
  doc as firestoreDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// --- Constantes e Estilos ---
const styles = {
  font: "helvetica",
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
    gray: [150, 150, 150],
  },
};

const HEADER_AREA_HEIGHT = 40;
const FOOTER_AREA_HEIGHT = 25;

// --- Funções de Formatação ---
function formatarData(data) {
  if (!data) return "-";
  try {
    let dateObj;
    if (typeof data.toDate === "function") {
      dateObj = data.toDate();
    } else if (data instanceof Date) {
      dateObj = data;
    } else if (typeof data === "string") {
      dateObj = new Date(data + "T00:00:00");
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

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return "N/D";
  try {
    const today = new Date();
    const birthDate = new Date(dataNascimento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return "N/D";
  }
}

// --- Funções de PDF ---
function addHeaderAndFooter(doc) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const imgWidth = 128;
  const imgHeight = 25;
  const imgX = 10;
  const imgY = 10;

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

async function addStudentInfo(doc, aluno, yStart) {
  let y = yStart;
  const availablePageWidth = doc.internal.pageSize.getWidth() - 40;

  y = ensurePageSpace(doc, y, 10);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.title);
  doc.text("Relatório Pedagógico", doc.internal.pageSize.getWidth() / 2, y, {
    align: "center",
  });
  y += 10;

  let nomeEscola =
    aluno.escola ||
    (aluno.escolaId
      ? (await getDoc(firestoreDoc(db, "escolas", aluno.escolaId))).data()?.nome
      : "Não informada");

  y = ensurePageSpace(doc, y, 40);
  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      [
        `Nome: ${aluno.nome || "-"}`,
        { content: `Escola: ${nomeEscola || "-"}`, colSpan: 2 },
      ],
      [
        `Data de Nasc.: ${formatarData(aluno.nascimento)}`,
        `Idade: ${calcularIdade(aluno.nascimento)} anos`,
        `Turma: ${aluno.turma || "-"}`,
      ],
      [
        `Diagnóstico: ${aluno.diagnostico || "Não informado"}`,
        { content: `Turno: ${aluno.turno || "-"}`, colSpan: 2 },
      ],
    ],
    styles: {
      font: styles.font,
      fontSize: styles.fontSize.medium,
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
    margin: {
      left: 20,
      right: 20,
      top: HEADER_AREA_HEIGHT + 10,
      bottom: FOOTER_AREA_HEIGHT,
    },
    didDrawPage: (data) => addHeaderAndFooter(doc),
  });
  y = doc.lastAutoTable.finalY + 10;

  return y;
}

async function addProfessionalSignaturesTable(doc, aluno, y) {
  try {
    const perfisGestaoEscolar = [
      "diretor",
      "diretor_adjunto",
      "orientador_pedagogico",
      "gestao",
    ].map((p) => p.replace(/_/g, " "));
    const perfisOutrosProfissionais = ["professor", "aee"];

    const todosUsuariosSnap = await getDocs(collection(db, "usuarios"));
    const profissionaisParaAssinar = [];
    const processedIds = new Set();

    todosUsuariosSnap.docs.forEach((d) => {
      const p = { id: d.id, ...d.data() };
      const perfilNormalizado = p.perfil?.toLowerCase().replace(/_/g, " ");

      const estaNaEscolaDoAluno =
        aluno.escolaId && Object.keys(p.escolas || {}).includes(aluno.escolaId);

      if (estaNaEscolaDoAluno) {
        if (perfisGestaoEscolar.includes(perfilNormalizado)) {
          if (!processedIds.has(p.id)) {
            profissionaisParaAssinar.push(p);
            processedIds.add(p.id);
          }
        } else if (perfisOutrosProfissionais.includes(perfilNormalizado)) {
          if (
            perfilNormalizado === "aee" ||
            (p.turmas && p.turmas[aluno.turma]) ||
            (Array.isArray(aluno.professores) &&
              aluno.professores.includes(p.id))
          ) {
            if (!processedIds.has(p.id)) {
              profissionaisParaAssinar.push(p);
              processedIds.add(p.id);
            }
          }
        }
      }
    });

    if (profissionaisParaAssinar.length === 0) {
      y = ensurePageSpace(doc, y, 20);
      doc.text(
        "Nenhum profissional encontrado para a tabela de assinaturas.",
        20,
        y
      );
      return y + 10;
    }

    const ordemCargos = [
      "diretor",
      "diretor_adjunto",
      "orientador_pedagogico",
      "gestao",
      "aee",
      "professor",
    ];
    profissionaisParaAssinar.sort((a, b) => {
      const perfilA = a.perfil?.toLowerCase().replace(/_/g, " ");
      const perfilB = b.perfil?.toLowerCase().replace(/_/g, " ");
      const indexA = ordemCargos.indexOf(perfilA);
      const indexB = ordemCargos.indexOf(perfilB);
      if (indexA !== indexB) {
        return indexA - indexB;
      }
      return (a.nome || "").localeCompare(b.nome || "");
    });

    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Assinaturas dos Profissionais Envolvidos", 20, y);
    y += 8;

    const linhasAssinaturas = profissionaisParaAssinar.map((p) => [
      p.nome,
      p.cargo || p.perfil?.toUpperCase().replace(/_/g, " "),
      "_____________________________",
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
      },
      didDrawPage: (data) => addHeaderAndFooter(doc),
    });
    return doc.lastAutoTable.finalY + 10;
  } catch (err) {
    console.error("Erro ao buscar profissionais para assinatura:", err);
    return y;
  }
}

export async function gerarPDFRelatorioIndividual(aluno, relatorio) {
  const doc = new jsPDF();
  let y;

  // --- 1. Adiciona a seção do aluno e o relatório principal na primeira página ---
  addHeaderAndFooter(doc);
  y = await addStudentInfo(doc, aluno, HEADER_AREA_HEIGHT + 10);

  y = ensurePageSpace(doc, y, 30);

  const dataCriacao = relatorio.dataCriacao?.toDate
    ? relatorio.dataCriacao.toDate()
    : new Date(relatorio.dataCriacao);
  const dataFormatada = formatarData(dataCriacao);

  doc.setFontSize(styles.fontSize.medium);

  y = ensurePageSpace(doc, y, 20);
  doc.setFont(styles.font, "normal");
  const textoDividido = doc.splitTextToSize(
    relatorio.texto,
    doc.internal.pageSize.getWidth() - 40
  );
  doc.text(textoDividido, 20, y);
  y += doc.getTextDimensions(textoDividido).h + 10;

  // Adiciona a data no final do relatório, antes da nova página
  doc.setFont(styles.font, "bold");
  doc.text(`Data: ${dataFormatada}`, 20, y);
  y += 8;

  // --- 2. Adiciona uma nova página para a seção de assinaturas ---
  doc.addPage();
  addHeaderAndFooter(doc); // Adiciona cabeçalho e rodapé na nova página

  // --- 3. Adiciona a tabela de assinaturas no topo da nova página ---
  await addProfessionalSignaturesTable(doc, aluno, HEADER_AREA_HEIGHT + 10);

  // Salva o PDF
  const nomeArquivo = `Relatório_${aluno.nome.replace(/\s+/g, "_")}_${dataFormatada.replace(/\//g, "-")}.pdf`;
  doc.save(nomeArquivo);
}
