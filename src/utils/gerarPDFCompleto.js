import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatarData(dataIso) {
  if (!dataIso) return "-";
  const [ano, mes, dia] = dataIso.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
}

const coresPorNivel = {
  NR: [255, 0, 0],
  AF: [255, 255, 0],
  AL: [0, 0, 255],
  AG: [0, 100, 0],
  AV: [200, 200, 200],
  I:  [255, 0, 255],
};

export function gerarPDFCompleto(pei, avaliacao, usuario, historicoPEIs = []) {
  const doc = new jsPDF();

  doc.addImage("/logo.jpg", "JPEG", 10, 10, 190, 25);
  let y = 45;

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("PLANO EDUCACIONAL INDIVIDUALIZADO (PEI)", 105, y, { align: "center" });
  y += 10;

  // Dados do Aluno
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text(`Nome: ${avaliacao.aluno}`, 20, y); y += 6;
  doc.text(`Idade: ${avaliacao.idade ? `${avaliacao.idade} anos` : "-"}`, 20, y); y += 6;
  doc.text(`Turma: ${pei.turma || "-"}`, 20, y); y += 6;
  doc.text(`Data de Início: ${formatarData(pei.inicio)}`, 20, y); y += 6;
  doc.text(`Próxima Avaliação: ${formatarData(pei.proximaAvaliacao)}`, 20, y); y += 10;

  // Avaliação Inicial
  doc.setFont("times", "bold");
  doc.text("Avaliação Inicial", 20, y); y += 8;
  doc.setFont("times", "normal");

  if (avaliacao.respostas && Object.keys(avaliacao.respostas).length > 0) {
    for (const area in avaliacao.respostas) {
      doc.setFont("times", "bold");
      doc.text(`${area}`, 20, y); y += 6;

      const subareas = avaliacao.respostas[area];
      for (const subarea in subareas) {
        doc.setFont("times", "italic");
        doc.text(`${subarea}`, 25, y); y += 5;

        const perguntas = subareas[subarea];
        if (Array.isArray(perguntas)) {
          perguntas.forEach(({ pergunta, resposta }) => {
            doc.setFont("times", "normal");
            doc.text(`• ${pergunta} — Resposta: ${resposta || "-"}`, 30, y);
            y += 6;
            if (y > 270) { doc.addPage(); y = 20; }
          });
        }
      }
      y += 4;
    }
  } else {
    doc.text("Sem dados preenchidos na Avaliação Inicial.", 25, y); y += 10;
  }

  // PEI Atual
  y += 5;
  doc.setFont("times", "bold");
  doc.text("Plano Educacional Individualizado (PEI)", 20, y); y += 5;

  const resumo = pei.resumoPEI || pei.areas || [];
  const linhasPEI = resumo.map(item => [
    item.area,
    item.subarea,
    item.objetivos,
    item.estrategias,
    item.nivel || "-"
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Área", "Habilidade", "Objetivos", "Estratégias", "Nível"]],
    body: linhasPEI,
    styles: {
      font: "times",
      fontSize: 10,
      fillColor: [230, 230, 230]
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45 },
      3: { cellWidth: 45 },
      4: { halign: "center" }
    },
    didParseCell: (data) => {
      if (data.column.index === 4) {
        const nivel = data.cell.text;
        if (coresPorNivel[nivel]) {
          data.cell.styles.fillColor = coresPorNivel[nivel];
          data.cell.styles.textColor = [0, 0, 0];
        }
      }
    }
  });

  let yHist = doc.lastAutoTable.finalY + 10;

  // Histórico de PEIs
  if (historicoPEIs.length > 0) {
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("Histórico de PEIs Anteriores", 20, yHist);
    yHist += 10;

    historicoPEIs.forEach((peiAntigo, index) => {
      doc.setFont("times", "bolditalic");
      doc.text(`PEI ${index + 1} — Início: ${formatarData(peiAntigo.inicio)} | Próxima Avaliação: ${formatarData(peiAntigo.proximaAvaliacao)}`, 20, yHist);
      yHist += 6;

      const linhasAntigas = (peiAntigo.resumoPEI || peiAntigo.areas || []).map(item => [
        item.area,
        item.subarea,
        item.objetivos,
        item.estrategias,
        item.nivel || "-"
      ]);

      autoTable(doc, {
        startY: yHist,
        head: [["Área", "Habilidade", "Objetivos", "Estratégias", "Nível"]],
        body: linhasAntigas,
        styles: {
          font: "times",
          fontSize: 10,
          fillColor: [250, 250, 250]
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 40 },
          2: { cellWidth: 45 },
          3: { cellWidth: 45 },
          4: { halign: "center" }
        },
        didParseCell: (data) => {
          if (data.column.index === 4) {
            const nivel = data.cell.text;
            if (coresPorNivel[nivel]) {
              data.cell.styles.fillColor = coresPorNivel[nivel];
              data.cell.styles.textColor = [0, 0, 0];
            }
          }
        }
      });

      yHist = doc.lastAutoTable.finalY + 10;
    });
  }

  // Legenda
  let y3 = doc.lastAutoTable.finalY + 10;
  doc.setFont("times", "bold");
  doc.text("Legenda dos Níveis:", 20, y3); y3 += 6;
  doc.setFont("times", "normal");

  Object.entries(coresPorNivel).forEach(([sigla, cor]) => {
    const descricao = {
      NR: "Não realizou",
      AF: "Apoio físico",
      AL: "Apoio leve",
      AG: "Apoio gestual",
      AV: "Apoio verbal",
      I:  "Independente"
    }[sigla];

    doc.setFillColor(...cor);
    doc.rect(22, y3 - 4, 8, 6, "F");
    doc.text(`*${sigla} – ${descricao}`, 32, y3);
    y3 += 7;
  });

  y3 += 10;

  doc.text(`Elaborado por: ${pei.nomeCriador || "Desconhecido"}`, 20, y3);
y3 += 8;
  const dataHoje = new Date().toLocaleDateString("pt-BR");
  doc.text(`Guabiruba, ${dataHoje}`, 20, y3); y3 += 20;
  doc.line(20, y3, 100, y3); y3 += 6;
  doc.text(`Assinatura: ${usuario?.nome || "__________________"}`, 20, y3);
  y3 += 6;
  doc.text(`Cargo: ${usuario?.cargo || ""}`, 20, y3);

  doc.save(`PEI_${avaliacao.aluno}.pdf`);
}