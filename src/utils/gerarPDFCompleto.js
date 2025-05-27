import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { doc as docRef, getDoc } from "firebase/firestore";

function formatarData(dataIso) {
  if (!dataIso) return "-";
  const [ano, mes, dia] = dataIso.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
}

const coresPorNivel = {
  NR: [255, 0, 0],
  AF: [255, 255, 0],
  AL: [0, 0, 255],
  AV: [200, 200, 200],
  I: [255, 0, 255],
};

export async function gerarPDFCompleto(aluno, usuarioLogado) {
  const doc = new jsPDF();

  doc.addImage("/logo.jpg", "JPEG", 10, 10, 128, 25);
  let y = 45;

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("PLANO EDUCACIONAL INDIVIDUALIZADO (PEI)", 105, y, { align: "center" });
  y += 10;

  // Buscar nome da escola com base no aluno.escolaId
  let nomeEscola = "-";
  if (aluno.escolaId) {
    try {
      const escolaSnap = await getDoc(docRef(db, "escolas", aluno.escolaId));
      if (escolaSnap.exists()) {
        nomeEscola = escolaSnap.data().nome || "-";
      }
    } catch (err) {
      console.error("Erro ao buscar nome da escola:", err);
    }
  }

  if (!aluno?.id || !aluno?.nome) {
    console.error("ID ou nome do aluno não definido!");
    return;
  }

  // Buscar dados da avaliação inicial
  const queryAvaliacao = query(
    collection(db, "avaliacoesIniciais"),
    where("aluno", "==", aluno.nome)
  );
  const snapAvaliacao = await getDocs(queryAvaliacao);
  const avaliacao = snapAvaliacao.empty ? {} : snapAvaliacao.docs[0].data();

  // Buscar PEIs
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

// FORMATAR DATAS DA AVALIAÇÃO INICIAL E PRÓXIMA AVALIAÇÃO
// Corrigir: data da avaliação inicial (da avaliação inicial)
let dataAvaliacaoTexto = "-";
try {
  const inicio = avaliacao?.inicio;
  let data = null;

  if (inicio instanceof Date) {
    data = inicio;
  } else if (typeof inicio === "string" || typeof inicio === "number") {
    data = new Date(inicio);
  } else if (typeof inicio?.toDate === "function") {
    data = inicio.toDate();
  }

  if (data && !isNaN(data.getTime())) {
    dataAvaliacaoTexto = formatarData(data.toISOString());
  }
} catch (err) {
  console.error("Erro ao processar data da avaliação inicial:", err);
}
// Corrigir: pegar próxima avaliação da AVALIAÇÃO INICIAL
let proximaAvaliacaoTexto = "-";
try {
  const proxima = avaliacao?.proximaAvaliacao;
  if (typeof proxima === "string") {
    const partes = proxima.split("-");
    if (partes.length === 3) {
      const data = new Date(partes[0], partes[1] - 1, partes[2]);
      if (!isNaN(data.getTime())) {
        proximaAvaliacaoTexto = formatarData(data.toISOString());
      }
    }
  }
} catch (err) {
  console.error("Erro ao processar próxima avaliação (da avaliação inicial):", err);
}

try {
  const proxima = peiAtual?.proximaAvaliacao;

  if (typeof proxima === "string") {
    // Caso esteja no formato "YYYY-MM-DD"
    const partes = proxima.split("-");
    if (partes.length === 3) {
      const data = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
      if (!isNaN(data.getTime())) {
        proximaAvaliacaoTexto = formatarData(data.toISOString());
      }
    }
  } else if (typeof proxima?.toDate === "function") {
    const data = proxima.toDate();
    if (!isNaN(data.getTime())) {
      proximaAvaliacaoTexto = formatarData(data.toISOString());
    }
  }
} catch (e) {
  console.error("Erro ao processar próxima avaliação:", e);
}

  // Processar data de nascimento
  let dataNascTexto = "-";
  try {
    if (aluno.nascimento) {
      let nascimento;
      if (typeof aluno.nascimento.toDate === "function") {
        nascimento = aluno.nascimento.toDate();
      } else {
        nascimento = new Date(aluno.nascimento);
      }
      if (!isNaN(nascimento.getTime())) {
        dataNascTexto = formatarData(nascimento.toISOString());
      }
    }
  } catch (err) {
    console.error("Erro ao converter data de nascimento:", err);
  }

  // Cabeçalho com informações principais
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text(`Escola: ${nomeEscola}`, 20, y); y += 6;
  doc.text(`Nome: ${aluno.nome}`, 20, y); y += 6;
  doc.text(`Data de Nascimento: ${dataNascTexto}`, 20, y); y += 6;
  doc.text(`Diagnóstico: ${aluno.diagnostico || "-"}`, 20, y); y += 6;
  doc.text(`Data da Avaliação Inicial: ${dataAvaliacaoTexto}`, 20, y); y += 6;
  doc.text(`Data da Próxima Avaliação: ${proximaAvaliacaoTexto}`, 20, y); y += 10;


if (avaliacao.respostas && Object.keys(avaliacao.respostas).length > 0) {
  for (const area in avaliacao.respostas) {
    const habilidades = avaliacao.respostas[area];
    const linhasDaArea = [];

    for (const habilidade in habilidades) {
      const nivel = habilidades[habilidade];
     if (nivel !== "NA" && nivel !== "I") {
  linhasDaArea.push([
    habilidade,
    nivel,
    {
      NR: "Não realizou",
      AF: "Apoio físico",
      AG: "Apoio gestual",
      AV: "Apoio verbal",
      AVi: "Apoio visual",
      I: "Independente"
    }[nivel] || "-"
  ]);
}
    }

    if (linhasDaArea.length === 0) continue;

    // Adiciona o nome da área como título
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(area, 20, y);
    y += 4;

    // Garante espaço na página
    if (y + 30 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y = 20;
    }

    // Renderiza a tabela da área
   autoTable(doc, {
  startY: y,
  head: [["Habilidade", "Nível", "Descrição"]],
  body: linhasDaArea,
  styles: {
    font: "times",
    fontSize: 8,
    cellPadding: 1.5,
    valign: "middle",
    overflow: "linebreak",
    textColor: [0, 0, 0],
    fillColor: [255, 255, 255],
    lineColor: [0, 0, 0],
    lineWidth: 0.1
  },
  headStyles: {
    fillColor: [255, 255, 255],
    textColor: [0, 0, 0],
    fontStyle: "bold",
    halign: "center",
    lineColor: [0, 0, 0],
    lineWidth: 0.1
  },
  columnStyles: {
    0: { cellWidth: 90 },
    1: { cellWidth: 18, halign: "center" },
    2: { cellWidth: 75 }
  },
  margin: { top: 20, bottom: 30, left: 20 },
  didParseCell: (data) => {
    if (data.column.index === 1) {
      const nivel = data.cell.text;
      if (coresPorNivel[nivel]) {
        data.cell.styles.fillColor = coresPorNivel[nivel];
        data.cell.styles.textColor = [0, 0, 0];
      }
    }
  },
  didDrawPage: (data) => {
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("times", "normal");      // Fonte Times New Roman, estilo normal
  doc.setFontSize(8);                  // Tamanho pequeno, como no Word

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
},
  
      didParseCell: (data) => {
        if (data.column.index === 1) {
          const nivel = data.cell.text;
          if (coresPorNivel[nivel]) {
            data.cell.styles.fillColor = coresPorNivel[nivel];
            data.cell.styles.textColor = [0, 0, 0];
          }
        }
      }
    });

    y = doc.lastAutoTable.finalY + 8;

    // Se estiver perto do final da página, quebra
    if (y + 30 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y = 20;
    }
  }
} else {
  doc.text("Sem dados preenchidos na Avaliação Inicial.", 25, y);
  y += 10;
}

  y += 5;
  doc.setFont("times", "bold");
  doc.text("Plano Educacional Individualizado (PEI)", 20, y); y += 5;

  const resumo = peiAtual.resumoPEI || peiAtual.areas || [];
  const linhasPEI = resumo.map(item => [
  item.area || "-",
  item.habilidade || "-",
  typeof item.objetivo === "string" ? item.objetivo : "-",
  Array.isArray(item.estrategias)
    ? item.estrategias.filter(Boolean).join(", ")
    : (typeof item.estrategias === "string" ? item.estrategias : "-"),
  item.nivel || "-",
  item.nivelAlmejado || "-"
]);

 autoTable(doc, {
  startY: y,
  head: [["Área", "Habilidade", "Objetivos", "Estratégias", "Nível", "Nível Almejado"]],
  body: linhasPEI,
  styles: {
    font: "times",
    fontSize: 9,
    textColor: [0, 0, 0],
    fillColor: [255, 255, 255],
    lineColor: [0, 0, 0],
    lineWidth: 0.1,
    cellPadding: 2,
    halign: "left",
    valign: "middle"
  },
  headStyles: {
    fillColor: [255, 255, 255],
    textColor: [0, 0, 0],
    fontStyle: "bold",
    halign: "center",
    lineColor: [0, 0, 0],
    lineWidth: 0.1
  },
  columnStyles: {
    0: { cellWidth: 25 },
    1: { cellWidth: 35 },
    2: { cellWidth: 45 },
    3: { cellWidth: 45 },
    4: { cellWidth: 20, halign: "center" },
    5: { cellWidth: 25, halign: "center" }
  },
  margin: {
    top: 20,
    bottom: 30,
    left: (doc.internal.pageSize.getWidth() - 195) / 2
  },
  didParseCell: (data) => {
    const nivel = data.cell.text;
    if (data.column.index === 4 || data.column.index === 5) {
      if (coresPorNivel[nivel]) {
        data.cell.styles.fillColor = coresPorNivel[nivel];
        data.cell.styles.textColor = [0, 0, 0];
      }
    }
  },
 didDrawPage: (data) => {
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("times", "normal");      // Fonte Times New Roman, estilo normal
  doc.setFontSize(8);                  // Tamanho pequeno, como no Word

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
},
  didParseCell: (data) => {
  const nivel = data.cell.text;
  if (data.column.index === 4 || data.column.index === 5) {
    if (coresPorNivel[nivel]) {
      data.cell.styles.fillColor = coresPorNivel[nivel];
      data.cell.styles.textColor = [0, 0, 0];
    }
  }
}
});

 y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : y + 10;
let yHist = y;
if (peiAtual.atividadeAplicada && peiAtual.atividadeAplicada.trim() !== "") {
  if (y + 40 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }

  autoTable(doc, {
  startY: y,
  head: [["Atividade Aplicada"]],
  body: [[peiAtual.atividadeAplicada]],
  styles: {
    font: "times",
    fontSize: 10,
    textColor: [0, 0, 0],
    fillColor: [255, 255, 255],
    lineColor: [0, 0, 0],
    lineWidth: 0.1,
    cellPadding: 5,
    valign: "top"
  },
  headStyles: {
    fillColor: [255, 255, 255],
    textColor: [0, 0, 0],
    fontStyle: "bold",
    halign: "center",
    lineColor: [0, 0, 0],
    lineWidth: 0.1
  },
  columnStyles: {
    0: { cellWidth: 170 }
  },
  margin: { top: 20, bottom: 30, left: 20 },
didDrawPage: (data) => {
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("times", "normal");      // Fonte Times New Roman, estilo normal
  doc.setFontSize(8);                  // Tamanho pequeno, como no Word

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
});


  y = doc.lastAutoTable.finalY + 10;
}
if (
  resumo.length > 0 &&
  peiAtual.acompanhamento &&
  typeof peiAtual.acompanhamento === "object"
) {
  const dadosAcompanhamento = resumo.map((item) => {
    const dados = peiAtual.acompanhamento[item.habilidade] || {};
    return [
      item.habilidade || "-",
      item.nivelAlmejado || "-",
      dados.status || "-",
      dados.observacoes || "-"
    ];
  });

  const larguraTabela = 60 + 30 + 30 + 70;

  if (y + 30 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("times", "bold");
  doc.text("Acompanhamento do Alcance das Metas", 20, y);
  y += 6;

 autoTable(doc, {
  startY: y,
  head: [["Habilidade", "Nível Almejado", "Alcançado?", "Observações"]],
  body: dadosAcompanhamento,
  styles: {
    font: "times",
    fontSize: 9,
    textColor: [0, 0, 0],
    fillColor: [255, 255, 255],
    lineColor: [0, 0, 0],
    lineWidth: 0.1,
    cellPadding: 2,
    halign: "left",
    valign: "middle"
  },
  headStyles: {
    fillColor: [255, 255, 255],
    textColor: [0, 0, 0],
    fontStyle: "bold",
    halign: "center",
    lineColor: [0, 0, 0],
    lineWidth: 0.1
  },
  columnStyles: {
    0: { cellWidth: 60 },
    1: { cellWidth: 30, halign: "center" },
    2: { cellWidth: 30, halign: "center" },
    3: { cellWidth: 70 }
  },
  margin: {
    top: 20,
    bottom: 30,
    left: (doc.internal.pageSize.getWidth() - (60 + 30 + 30 + 70)) / 2
  },
  didDrawPage: (data) => {
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("times", "normal");      // Fonte Times New Roman, estilo normal
  doc.setFontSize(8);                  // Tamanho pequeno, como no Word

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
});


  y = doc.lastAutoTable.finalY + 10;
}
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
  item.area || "-",
  item.subarea || "-",
  typeof item.objetivo === "string" ? item.objetivo : "-",
  Array.isArray(item.estrategias)
    ? item.estrategias.join('\n')
    : (typeof item.estrategias === 'string' ? item.estrategias : "-"),
  item.nivel || "-"
]);
      autoTable(doc, {
  startY: yHist,
  head: [["Área", "Habilidade", "Objetivos", "Estratégias", "Nível"]],
  body: linhasAntigas,
  styles: {
    font: "times",
    fontSize: 10,
    textColor: [0, 0, 0],
    fillColor: [255, 255, 255],
    lineColor: [0, 0, 0],
    lineWidth: 0.1,
    cellPadding: 2
  },
  headStyles: {
    fillColor: [255, 255, 255],
    textColor: [0, 0, 0],
    fontStyle: "bold",
    halign: "center",
    lineColor: [0, 0, 0],
    lineWidth: 0.1
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

  let y3 = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : y + 10;
  doc.text(`Elaborado por: ${peiAtual.nomeCriador || "Desconhecido"}`, 20, y3); 
  y3 += 10;

  // Legenda logo após o "Elaborado por:"
  if (y3 > 250) { doc.addPage(); y3 = 20; }
  doc.setFont("times", "bold");
  doc.text("Legenda dos Níveis:", 20, y3); y3 += 6;
  doc.setFont("times", "normal");

  const legendaNiveis = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente"
};

Object.entries(legendaNiveis).forEach(([sigla, descricao]) => {
  const cor = coresPorNivel[sigla] || [255, 255, 255];
  doc.setFillColor(...cor);
  doc.rect(22, y3 - 4, 8, 6, "F");
  doc.text(`${sigla} – ${descricao}`, 32, y3);
  y3 += 7;
});

  // Assinatura
  y3 += 10;
  if (y3 > 260) { doc.addPage(); y3 = 20; }
  const dataHoje = new Date().toLocaleDateString("pt-BR");
  doc.text(`Guabiruba, ${dataHoje}`, 20, y3); y3 += 20;
  doc.line(20, y3, 100, y3); y3 += 6;
  doc.text(`Assinatura: ${usuarioLogado?.nome || "___________________________"}`, 20, y3); y3 += 6;
  doc.text(`Cargo: ${usuarioLogado?.cargo || ""}`, 20, y3);
  y3 += 20; // Espaço antes da próxima seção

if (["gestao", "aee", "seme"].includes(usuarioLogado?.perfil)) {
  const professoresSnap = await getDocs(
    query(collection(db, "usuarios"), where("perfil", "==", "professor"))
  );

  const professoresVinculados = professoresSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(prof => {
      const escolasOK = Object.keys(prof.escolas || {}).includes(aluno.escolaId);
      const turmasOK = Object.keys(prof.turmas || {}).includes(aluno.turma);
      return escolasOK && turmasOK;
    });

  if (professoresVinculados.length > 0) {
    if (y3 + 30 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y3 = 20;
    }

    doc.setFont("times", "bold");
    doc.text("Assinaturas dos Professores", 20, y3);
    y3 += 8;

   const linhasAssinaturas = professoresVinculados.map(p => [p.nome, "___________________________"]);

    autoTable(doc, {
  startY: y3,
  head: [["Nome do Professor", "Assinatura"]],
  body: linhasAssinaturas,
  styles: {
    font: "times",
    fontSize: 10,
    textColor: [0, 0, 0],
    fillColor: [255, 255, 255],
    lineColor: [0, 0, 0],
    lineWidth: 0.1,
    cellPadding: 2
  },
  headStyles: {
    fillColor: [255, 255, 255],
    textColor: [0, 0, 0],
    fontStyle: "bold",
    halign: "center",
    lineColor: [0, 0, 0],
    lineWidth: 0.1
  },
  columnStyles: {
    0: { cellWidth: 90 },
    1: { cellWidth: 80 }
  },
  margin: { left: 20 }
});

    y3 = doc.lastAutoTable.finalY + 10;
  }
}
  doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}.pdf`);
}