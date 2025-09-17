import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  collection,
  getDocs,
  doc as firestoreDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// --- Constantes e Estilos ---
const styles = {
  font: "helvetica",
  fontSize: {
    small: 8,
    standard: 12,
    title: 18,
  },
  colors: {
    black: [0, 0, 0],
    white: [255, 255, 255], // Cor branca definida
  },
};

const HEADER_AREA_HEIGHT = 40;
const FOOTER_AREA_HEIGHT = 25;
const MARGIN = 20;

// --- Funções de Formatação (Sem alterações) ---
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
    const dia = String(dateObj.getDate()).padStart(2, "0");
    const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
    const ano = dateObj.getFullYear();
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

// --- Funções de PDF (Sem alterações) ---
function addHeaderAndFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgWidth = 190;
    const imgHeight = 25;
    const imgX = 10;
    const imgY = 10;
    doc.addImage("/logoolf.jpg", "JPEG", imgX, imgY, imgWidth, imgHeight);

    const originalFontSize = doc.getFontSize();
    doc.setFont(styles.font, "normal");
    doc.setFontSize(styles.fontSize.small);

    doc.text(
      "Prefeitura Municipal de Guabiruba / Secretaria de Educação de Guabiruba (SEME)",
      MARGIN,
      pageHeight - 20
    );
    doc.text(
      "Rua José Dirschnabel, 67 - Centro - Guabiruba/SC",
      MARGIN,
      pageHeight - 15
    );
    doc.text(
      "Telefone/WhatsApp: (47) 3308-3102 - www.guabiruba.sc.gov.br",
      MARGIN,
      pageHeight - 10
    );
    doc.setFontSize(originalFontSize);
  }
}

function ensurePageSpace(doc, currentY, requiredSpace) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottomLimit = pageHeight - FOOTER_AREA_HEIGHT;
  if (currentY + requiredSpace > contentBottomLimit) {
    doc.addPage();
    return HEADER_AREA_HEIGHT + 10;
  }
  return currentY;
}

async function getProfissionaisParaAssinar(aluno) {
  // Sua função está ótima, sem necessidade de alterações aqui.
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
    return profissionaisParaAssinar;
  } catch (err) {
    console.error("Erro ao buscar profissionais para assinatura:", err);
    return [];
  }
}

// --- FUNÇÃO PRINCIPAL ---

export async function gerarPDFRelatorioIndividual(aluno, relatorio) {
  const doc = new jsPDF();
  let y = HEADER_AREA_HEIGHT + 10;
  const availablePageWidth = doc.internal.pageSize.getWidth() - MARGIN * 2;

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

  autoTable(doc, {
    startY: y,
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
      fontSize: styles.fontSize.standard,
      textColor: styles.colors.black,
      fillColor: styles.colors.white, // Garante fundo branco
      lineWidth: 0.1,
      cellPadding: 2,
      valign: "middle",
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(styles.fontSize.standard);
  doc.setFont(styles.font, "normal");

  const texto = relatorio.texto || "Nenhum texto de relatório fornecido.";
  const textoDividido = doc.splitTextToSize(texto, availablePageWidth);

  textoDividido.forEach((line) => {
    y = ensurePageSpace(doc, y, 7);
    doc.text(line, MARGIN, y, {
      // ALTERAÇÃO: Trocado 'justify' por 'left' para melhor legibilidade
      align: "left",
      maxWidth: availablePageWidth,
    });
    y += 7;
  });

  y = ensurePageSpace(doc, y, 10);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.standard);
  const dataCriacao = relatorio.dataCriacao?.toDate
    ? relatorio.dataCriacao.toDate()
    : new Date(relatorio.dataCriacao);
  doc.text(`Data: ${formatarData(dataCriacao)}`, MARGIN, y);

  const profissionais = await getProfissionaisParaAssinar(aluno);
  if (profissionais.length > 0) {
    doc.addPage();
    let yAssinaturas = HEADER_AREA_HEIGHT + 10;

    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.standard);
    doc.text("Assinaturas dos Profissionais Envolvidos", MARGIN, yAssinaturas);
    yAssinaturas += 10;

    autoTable(doc, {
      startY: yAssinaturas,
      head: [["Nome Completo", "Cargo/Função", "Assinatura"]],
      body: profissionais.map((p) => [
        p.nome,
        p.cargo || p.perfil?.toUpperCase().replace(/_/g, " "),
        "_____________________________",
      ]),
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.standard,
        textColor: styles.colors.black,
        // ALTERAÇÃO: Garante que o corpo da tabela também seja branco
        fillColor: styles.colors.white,
        lineWidth: 0.1,
        cellPadding: 2,
      },
      headStyles: {
        fontStyle: "bold",
        halign: "center",
        // ALTERAÇÃO: Garante que o cabeçalho seja branco
        fillColor: styles.colors.white,
      },
    });
  }

  addHeaderAndFooter(doc);

  const nomeArquivo = `Relatório_${aluno.nome.replace(
    /\s+/g,
    "_"
  )}_${formatarData(dataCriacao).replace(/\//g, "-")}.pdf`;
  doc.save(nomeArquivo);
}
