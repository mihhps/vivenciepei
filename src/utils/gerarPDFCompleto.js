import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

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
  I: [255, 0, 255],
};

export async function gerarPDFCompleto(aluno, usuarioLogado) {
  const doc = new jsPDF();

  doc.addImage("/logo.jpg", "JPEG", 10, 10, 190, 25);
  let y = 45;

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("PLANO EDUCACIONAL INDIVIDUALIZADO (PEI)", 105, y, { align: "center" });
  y += 10;

  if (!aluno?.id || !aluno?.nome) {
    console.error("ID ou nome do aluno não definido!");
    return;
  }

  const queryAvaliacao = query(
    collection(db, "avaliacoesIniciais"),
    where("aluno", "==", aluno.nome)
  );
  const snapAvaliacao = await getDocs(queryAvaliacao);
  const avaliacao = snapAvaliacao.empty ? {} : snapAvaliacao.docs[0].data();

  const queryPeis = query(collection(db, "peis"), where("aluno", "==", aluno.nome));
  const snapPeis = await getDocs(queryPeis);
  const todosPeis = snapPeis.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const isGestao = usuarioLogado?.perfil === "gestao" || usuarioLogado?.perfil === "aee";

  const peisFiltrados = isGestao
    ? todosPeis.sort((a, b) => {
        const dataA = a.dataCriacao?.toDate?.() || new Date(0);
        const dataB = b.dataCriacao?.toDate?.() || new Date(0);
        return dataA - dataB;
      })
    : todosPeis.filter((p) => p.criadorId === usuarioLogado.email);

  const peiAtual = isGestao
    ? peisFiltrados[peisFiltrados.length - 1]
    : peisFiltrados[0];

  const historicoPEIs = isGestao ? peisFiltrados.slice(0, -1) : [];

  if (!peiAtual) {
    console.error("Nenhum PEI encontrado para esse aluno.");
    return;
  }

  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text(`Nome: ${aluno.nome}`, 20, y); y += 6;
  doc.text(`Idade: ${aluno.idade ? `${aluno.idade} anos` : "-"}`, 20, y); y += 6;
  doc.text(`Turma: ${peiAtual.turma || aluno.turma || "-"}`, 20, y); y += 6;
  doc.text(`Data de Início: ${formatarData(peiAtual.inicio)}`, 20, y); y += 6;
  doc.text(`Próxima Avaliação: ${formatarData(peiAtual.proximaAvaliacao)}`, 20, y); y += 10;

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

  y += 5;
  doc.setFont("times", "bold");
  doc.text("Plano Educacional Individualizado (PEI)", 20, y); y += 5;

  const resumo = peiAtual.resumoPEI || peiAtual.areas || [];
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
    styles: { font: "times", fontSize: 10, fillColor: [230, 230, 230] },
    columnStyles: {
      0: { cellWidth: 30 }, 1: { cellWidth: 40 },
      2: { cellWidth: 45 }, 3: { cellWidth: 45 },
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

  let yHist = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : y + 10;

  if (historicoPEIs.length > 0) {
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("Histórico de PEIs Anteriores", 20, yHist);
    yHist += 10;

    historicoPEIs.forEach((peiAntigo, index) => {
      doc.setFont("times", "bolditalic");
      doc.text(
        `PEI ${index + 1} — Início: ${formatarData(peiAntigo.inicio)} | Próxima Avaliação: ${formatarData(peiAntigo.proximaAvaliacao)}`,
        20,
        yHist
      );
      yHist += 6;

      doc.setFont("times", "italic");
      doc.text(
        `Elaborado por: ${peiAntigo.nomeCriador || "Desconhecido"} — Cargo: Professor(a)`,
        20,
        yHist
      );
      yHist += 8;

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
        styles: { font: "times", fontSize: 10, fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 30 }, 1: { cellWidth: 40 },
          2: { cellWidth: 45 }, 3: { cellWidth: 45 },
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

  let y3 = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : y + 10;
  doc.text(`Elaborado por: ${peiAtual.nomeCriador || "Desconhecido"}`, 20, y3); 
  y3 += 10;

  // Legenda logo após o "Elaborado por:"
  if (y3 > 250) { doc.addPage(); y3 = 20; }
  doc.setFont("times", "bold");
  doc.text("Legenda dos Níveis:", 20, y3); y3 += 6;
  doc.setFont("times", "normal");

  Object.entries(coresPorNivel).forEach(([sigla, cor]) => {
    const descricao = {
      NR: "Não realizou", AF: "Apoio físico", AL: "Apoio leve",
      AG: "Apoio gestual", AV: "Apoio verbal", I: "Independente"
    }[sigla];

    doc.setFillColor(...cor);
    doc.rect(22, y3 - 4, 8, 6, "F");
    doc.text(`*${sigla} – ${descricao}`, 32, y3);
    y3 += 7;
  });

  // Assinatura
  y3 += 10;
  if (y3 > 260) { doc.addPage(); y3 = 20; }
  const dataHoje = new Date().toLocaleDateString("pt-BR");
  doc.text(`Guabiruba, ${dataHoje}`, 20, y3); y3 += 20;
  doc.line(20, y3, 100, y3); y3 += 6;
  doc.text(`Assinatura: ${usuarioLogado?.nome || "__________________"}`, 20, y3); y3 += 6;
  doc.text(`Cargo: ${usuarioLogado?.cargo || ""}`, 20, y3);

  doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}.pdf`);
}