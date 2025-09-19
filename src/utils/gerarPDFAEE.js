import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const styles = {
  font: "times",
  fontSize: { small: 8, medium: 10, large: 12, title: 18 },
  colors: {
    black: [0, 0, 0],
    white: [255, 255, 255],
    gray: [128, 128, 128],
    lightGray: [240, 240, 240],
  },
};

const statusColors = {
  "A iniciar": [108, 117, 125],
  "Em desenvolvimento": [255, 193, 7],
  Generalizada: [40, 167, 69],
};

const resultadoColors = {
  "Deu Certo": [40, 167, 69],
  Parcial: [253, 126, 20],
  "Com Dificuldade": [220, 53, 69],
};

const HEADER_HEIGHT = 40;
const FOOTER_HEIGHT = 25;

function addHeaderAndFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    try {
      doc.addImage("/logo.jpg", "JPEG", 10, 10, 128, 25);
    } catch (e) {
      console.error("Erro ao adicionar logo no cabeçalho:", e);
      doc.setFont(styles.font, "bold");
      doc.text("Logo da Instituição", 20, 20);
    }

    doc.setFont(styles.font, "normal");
    doc.setFontSize(styles.fontSize.small);
    doc.text(
      "Prefeitura Municipal de Guabiruba / Secretaria de Educação",
      20,
      pageHeight - 20
    );
    doc.text(
      "Rua José Dirschnabel, 67 - Centro - Guabiruba/SC",
      20,
      pageHeight - 15
    );
    doc.text("Telefone/WhatsApp: (47) 3308-3102", 20, pageHeight - 10);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() - 40,
      pageHeight - 10
    );
  }
}

function ensurePageSpace(doc, currentY, requiredSpace) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottomLimit = pageHeight - FOOTER_HEIGHT - 5;
  if (currentY + requiredSpace > contentBottomLimit) {
    doc.addPage();
    return HEADER_HEIGHT;
  }
  return currentY;
}

function addFormattedText(doc, text, x, y, maxWidth) {
  if (!text || text.trim() === "") return y;
  let currentY = y;
  const lines = text.split("\n");

  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.medium);

  lines.forEach((line) => {
    if (line.includes(": undefined")) return;

    const isBold =
      line.startsWith("Título:") ||
      line.startsWith("Objetivos:") ||
      line.startsWith("Recursos:") ||
      line.startsWith("Como Fazer") ||
      line.startsWith("Duração");
    const indent = line.trim().startsWith("-") ? x + 5 : x;
    const effectiveMaxWidth = isBold ? maxWidth : maxWidth - (indent - x);

    doc.setFont(styles.font, isBold ? "bold" : "normal");

    const splitText = doc.splitTextToSize(line, effectiveMaxWidth);

    currentY = ensurePageSpace(doc, currentY, splitText.length * 5);

    doc.text(splitText, indent, currentY);
    currentY += splitText.length * 5 + (line.trim() === "" ? 2 : 0);
  });
  return currentY;
}

export function gerarPDFAEE(aluno, plano, horarios, atividades) {
  const doc = new jsPDF();
  let y = HEADER_HEIGHT;

  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.title);
  doc.text(
    "Plano de Acompanhamento AEE",
    doc.internal.pageSize.getWidth() / 2,
    y,
    { align: "center" }
  );
  y += 10;

  doc.setFontSize(styles.fontSize.large);
  doc.text(`Aluno(a): ${aluno.nome}`, 20, y);
  y += 7;
  doc.text(`Turma: ${aluno.turma}`, 20, y);
  y += 10;

  if (horarios && horarios.length > 0) {
    y = ensurePageSpace(doc, y, 20);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Horários de Atendimento", 20, y);
    autoTable(doc, {
      startY: y + 7,
      theme: "grid",
      head: [["Dia", "Horário"]],
      body: horarios.map((h) => [h.dia, `das ${h.inicio} às ${h.fim}`]),
      didDrawPage: (data) => addHeaderAndFooter(doc),
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Bloco de "Plano de Habilidades" removido conforme a solicitação do usuário.
  // A tabela com resultados e observações já está no "Histórico de Atendimentos".

  if (atividades && atividades.length > 0) {
    y = ensurePageSpace(doc, y, 30);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Histórico de Atendimentos", 20, y);
    y += 8;

    atividades.forEach((reg) => {
      y = ensurePageSpace(doc, y, 15);
      doc.setFillColor(...styles.colors.lightGray);
      doc.rect(15, y, doc.internal.pageSize.getWidth() - 30, 8, "F");
      doc.setFont(styles.font, "bold");
      doc.text(`Data: ${reg.data.toDate().toLocaleDateString()}`, 20, y + 5.5);
      y += 12;

      if (reg.quebraGelo) {
        doc.setFont(styles.font, "bold");
        y = ensurePageSpace(doc, y, 10);
        doc.text("Quebra-Gelo:", 20, y);
        y = addFormattedText(
          doc,
          reg.quebraGelo,
          25,
          y + 6,
          doc.internal.pageSize.getWidth() - 50
        );
      }

      doc.setFont(styles.font, "bold");
      y = ensurePageSpace(doc, y, 10);
      doc.text("Atividade Principal:", 20, y);
      y = addFormattedText(
        doc,
        reg.atividadePrincipal.descricao,
        25,
        y + 6,
        doc.internal.pageSize.getWidth() - 50
      );

      autoTable(doc, {
        startY: y + 2,
        theme: "striped",
        head: [["Habilidade", "Resultado", "Observações"]],
        body: reg.atividadePrincipal.habilidadesAvaliadas.map((h) => [
          h.habilidadeTexto,
          h.resultado || "-",
          h.observacoes || "-",
        ]),
        didDrawPage: (data) => addHeaderAndFooter(doc),
        didParseCell: (data) => {
          if (data.column.index === 1 && resultadoColors[data.cell.text[0]]) {
            data.cell.styles.fillColor = resultadoColors[data.cell.text[0]];
            data.cell.styles.textColor = styles.colors.white;
          }
        },
      });
      y = doc.lastAutoTable.finalY + 5;

      if (reg.finalizacao) {
        doc.setFont(styles.font, "bold");
        y = ensurePageSpace(doc, y, 10);
        doc.text("Finalização:", 20, y);
        y = addFormattedText(
          doc,
          reg.finalizacao,
          25,
          y + 6,
          doc.internal.pageSize.getWidth() - 50
        );
      }
      y += 5;
    });
  }

  addHeaderAndFooter(doc);
  doc.save(`Acompanhamento_AEE_${aluno.nome.replace(/\s+/g, "_")}.pdf`);
}
