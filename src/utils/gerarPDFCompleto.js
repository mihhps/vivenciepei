import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { doc as docRef, getDoc } from "firebase/firestore";

// Configurações de estilo
const styles = {
  font: "times",
  fontSize: {
    small: 8,
    medium: 10,
    large: 12,
    title: 14,
  },
  colors: {
    black: [0, 0, 0],
    white: [255, 255, 255],
  },
};

// Cores para os níveis
const coresPorNivel = {
  NR: [255, 0, 0], // Vermelho
  AF: [255, 255, 0], // Amarelo
  AL: [0, 0, 255], // Azul
  AV: [200, 200, 200], // Cinza
  I: [255, 0, 255], // Magenta
};

// Legenda dos níveis
const legendaNiveis = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
};

// Função para formatar datas robusta
function formatarData(data) {
  if (!data) return "-";

  try {
    let dateObj;

    if (typeof data.toDate === "function") {
      dateObj = data.toDate();
    } else if (data instanceof Date) {
      dateObj = data;
    } else if (typeof data === "string") {
      // Tenta parsear formato ISO ou "YYYY-MM-DD"
      if (data.includes("T")) {
        dateObj = new Date(data);
      } else {
        const [year, month, day] = data.split("-");
        dateObj = new Date(year, month - 1, day);
      }
    }

    if (!dateObj || isNaN(dateObj.getTime())) return "-";

    const dia = dateObj.getDate().toString().padStart(2, "0");
    const mes = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const ano = dateObj.getFullYear();

    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return "-";
  }
}

// Função para adicionar rodapé em todas as páginas
function addFooter(doc, pageHeight) {
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

// Função principal
export async function gerarPDFCompleto(aluno, usuarioLogado) {
  if (!aluno?.id || !aluno?.nome) {
    console.error("ID ou nome do aluno não definido!");
    return;
  }

  const doc = new jsPDF();
  let y = 45; // Posição vertical inicial

  // Cabeçalho com logo
  doc.addImage("/logo.jpg", "JPEG", 10, 10, 128, 25);

  // Título do documento
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.title);
  doc.text("PLANO EDUCACIONAL INDIVIDUALIZADO (PEI)", 105, y, {
    align: "center",
  });
  y += 10;

  // Buscar dados da escola
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

  // Buscar avaliação inicial - versão robusta
  let avaliacao = {};
  try {
    const queryAvaliacao = query(
      collection(db, "avaliacoesIniciais"),
      where("aluno", "==", aluno.nome)
    );
    const snapAvaliacao = await getDocs(queryAvaliacao);

    if (!snapAvaliacao.empty) {
      const avaliacaoData = snapAvaliacao.docs[0].data();
      if (avaliacaoData.respostas || avaliacaoData.habilidades) {
        avaliacao = avaliacaoData;
      } else {
        console.warn("Avaliação sem estrutura esperada:", avaliacaoData);
      }
    }
  } catch (err) {
    console.error("Erro ao buscar avaliação inicial:", err);
  }

  // Buscar todos os PEIs do aluno - versão robusta
  let todosPeis = [];
  try {
    // Primeiro tenta buscar por alunoId (mais confiável)
    let queryPeis = query(
      collection(db, "peis"),
      where("alunoId", "==", aluno.id)
    );
    let snapPeis = await getDocs(queryPeis);

    // Se não encontrar, tenta pelo nome (para compatibilidade com dados antigos)
    if (snapPeis.empty) {
      queryPeis = query(
        collection(db, "peis"),
        where("aluno", "==", aluno.nome)
      );
      snapPeis = await getDocs(queryPeis);
    }

    todosPeis = snapPeis.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Erro ao buscar PEIs:", err);
  }

  // Ordena os PEIs por data de criação (do mais antigo para o mais recente)
  const peisOrdenados = [...todosPeis].sort((a, b) => {
    const dataA = a.criadoEm?.toDate?.() || new Date(a.criadoEm);
    const dataB = b.criadoEm?.toDate?.() || new Date(b.criadoEm);
    return dataA - dataB;
  });

  // Verifica se existem PEIs antes de tentar acessar o último
  if (peisOrdenados.length === 0) {
    console.warn("Nenhum PEI encontrado para o aluno");
    doc.text("Nenhum PEI encontrado para este aluno.", 25, y);
    doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}.pdf`);
    return;
  }

  // --- LÓGICA DE ORGANIZAÇÃO DOS PEIs PARA EXIBIÇÃO ---
  let peisParaExibir = [];
  const peiMaisRecente = peisOrdenados[peisOrdenados.length - 1]; // O último PEI de todos

  // Define os cargos/perfis que podem criar um PEI "base"
  const criadoresDeBase = [
    "PROFESSOR REGENTE",
    "PROFESSOR DE SUPORTE",
    "AEE",
    "GESTAO",
    "SEME",
    "aee",
    "gestao",
    "seme",
  ];

  let peiBaseEncontrado = null;
  // Encontra o PEI "base": o primeiro PEI criado por um dos perfis autorizados
  for (const pei of peisOrdenados) {
    const cargo = pei.cargoCriador?.toUpperCase();
    const perfil = pei.criadorPerfil?.toLowerCase();
    if (criadoresDeBase.includes(cargo) || criadoresDeBase.includes(perfil)) {
      peiBaseEncontrado = pei;
      break;
    }
  }

  // Set para controlar IDs já adicionados e evitar duplicação
  const idsJaAdicionados = new Set();

  // 1. Adiciona o PEI Base, se ele existe
  if (peiBaseEncontrado) {
    peisParaExibir.push(peiBaseEncontrado);
    idsJaAdicionados.add(peiBaseEncontrado.id);
  }

  // 2. Adiciona os "demais PEIs" (histórico), excluindo o base e o mais recente
  const outrosPeisHistorico = peisOrdenados.filter(
    (pei) => !idsJaAdicionados.has(pei.id) && pei.id !== peiMaisRecente.id
  );

  // Adiciona os outros PEIs à lista de exibição (já estão ordenados do mais antigo para o mais recente)
  outrosPeisHistorico.forEach((pei) => peisParaExibir.push(pei));

  // 3. Adiciona o PEI Mais Recente (atual) por último, se ainda não foi adicionado
  if (!idsJaAdicionados.has(peiMaisRecente.id)) {
    peisParaExibir.push(peiMaisRecente);
  }

  // --- FIM DA LÓGICA DE ORGANIZAÇÃO DOS PEIs ---

  // Formatar datas importantes
  const dataNascTexto = formatarData(aluno.nascimento);
  const dataAvaliacaoTexto = formatarData(avaliacao?.inicio);
  let proximaAvaliacaoTexto =
    formatarData(avaliacao?.proximaAvaliacao) ||
    formatarData(peiMaisRecente?.proximaAvaliacao) ||
    "-";

  // Seção de informações do aluno
  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.large);

  const infoAluno = [
    `Escola: ${nomeEscola}`,
    `Nome: ${aluno.nome}`,
    `Data de Nascimento: ${dataNascTexto}`,
    `Diagnóstico: ${aluno.diagnostico || "-"}`,
    `Data da Avaliação Inicial: ${dataAvaliacaoTexto}`,
    `Data da Próxima Avaliação: ${proximaAvaliacaoTexto}`,
  ];

  infoAluno.forEach((info) => {
    doc.text(info, 20, y);
    y += 6;
  });
  y += 4;

  // --- Adiciona o título "Avaliação Inicial" aqui ---
  if (avaliacao.respostas || avaliacao.habilidades) {
    // Verifica se há espaço antes de adicionar o título e a tabela
    if (y + 30 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y = 20;
    }
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Avaliação Inicial", 20, y); // Título "Avaliação Inicial"
    y += 8; // Espaço após o título

    const dadosAvaliacao = avaliacao.respostas || avaliacao.habilidades;

    for (const area in dadosAvaliacao) {
      const habilidades = dadosAvaliacao[area];
      const linhasDaArea = [];

      for (const habilidade in habilidades) {
        const nivel = habilidades[habilidade];
        if (nivel !== "NA" && nivel !== "I") {
          linhasDaArea.push([habilidade, nivel, legendaNiveis[nivel] || "-"]);
        }
      }

      if (linhasDaArea.length === 0) continue;

      // Verificar espaço na página para a área
      if (y + 30 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        y = 20;
      }

      doc.setFont(styles.font, "bold");
      doc.setFontSize(styles.fontSize.medium);
      doc.text(area, 20, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [["Habilidade", "Nível", "Descrição"]],
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
          0: { cellWidth: 90 },
          1: { cellWidth: 18, halign: "center" },
          2: { cellWidth: 75 },
        },
        margin: { bottom: 25 },
        didParseCell: (data) => {
          if (data.column.index === 1 && coresPorNivel[data.cell.text]) {
            data.cell.styles.fillColor = coresPorNivel[data.cell.text];
          }
        },
        didDrawPage: (data) => {
          addFooter(doc, doc.internal.pageSize.getHeight());
        },
      });

      y = doc.lastAutoTable.finalY + 10;
    }
  } else {
    doc.text(
      snapAvaliacao.empty
        ? "Nenhuma avaliação inicial encontrada."
        : "Avaliação encontrada, mas sem dados de habilidades/respostas.",
      25,
      y
    );
    y += 10;
  }

  // --- SEÇÃO DE EXIBIÇÃO DOS PEIs ---
  peisParaExibir.forEach((peiItem, index) => {
    const resumo = peiItem.resumoPEI || peiItem.areas || [];

    // Adiciona quebra de página se necessário antes de cada novo PEI (exceto o primeiro)
    if (index > 0 && y + 60 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y = 20;
    } else if (index === 0 && y > doc.internal.pageSize.getHeight() - 60) {
      // Para o primeiro PEI se ele já está muito no final da página
      doc.addPage();
      y = 20;
    }

    // Título unificado para cada PEI
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Plano Educacional Individualizado (PEI)", 20, y);
    y += 8;

    // Tabela de objetivos e estratégias
    const linhasPEI = resumo.map((item) => [
      item.area || "-",
      item.habilidade || "-",
      typeof item.objetivo === "string" ? item.objetivo : "-",
      Array.isArray(item.estrategias)
        ? item.estrategias.filter(Boolean).join(", ")
        : typeof item.estrategias === "string"
        ? item.estrategias
        : "-",
      item.nivel || "-",
      item.nivelAlmejado || "-",
    ]);

    const larguraPagina = doc.internal.pageSize.getWidth();
    const margemPEI = (larguraPagina - 195) / 2; // Centraliza a tabela
    const margemAtividade = (larguraPagina - 170) / 2;

    autoTable(doc, {
      startY: y,
      head: [
        [
          "Área",
          "Habilidade",
          "Objetivo",
          "Estratégias",
          "Nível",
          "Nível Almejado",
        ],
      ],
      body: linhasPEI,
      styles: {
        font: styles.font,
        fontSize: styles.fontSize.small,
        textColor: styles.colors.black,
        fillColor: styles.colors.white,
        lineColor: styles.colors.black,
        lineWidth: 0.1,
        cellPadding: 2,
        valign: "middle",
      },
      headStyles: {
        fillColor: styles.colors.white,
        textColor: styles.colors.black,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 20, halign: "center" },
        5: { cellWidth: 25, halign: "center" },
      },
      margin: { left: margemPEI, bottom: 25 },
      didParseCell: (data) => {
        const nivel = data.cell.text;
        if ([4, 5].includes(data.column.index)) {
          data.cell.styles.fillColor =
            coresPorNivel[nivel] || styles.colors.white;
        }
      },
      didDrawPage: (data) => {
        addFooter(doc, doc.internal.pageSize.getHeight());
      },
    });

    y = doc.lastAutoTable.finalY + 10;

    // Atividade Aplicada (se existir)
    if (peiItem.atividadeAplicada?.trim()) {
      autoTable(doc, {
        startY: y,
        head: [["Atividade Aplicada"]],
        body: [[peiItem.atividadeAplicada]],
        styles: {
          font: styles.font,
          fontSize: styles.fontSize.medium,
          textColor: styles.colors.black,
          fillColor: styles.colors.white,
          lineColor: styles.colors.black,
          lineWidth: 0.1,
          cellPadding: 5,
          valign: "top",
        },
        headStyles: {
          fillColor: styles.colors.white,
          textColor: styles.colors.black,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 170 },
        },
        margin: { left: margemAtividade, bottom: 25 },
        didDrawPage: (data) => {
          addFooter(doc, doc.internal.pageSize.getHeight());
        },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Acompanhamento (se existir)
    if (
      resumo.length > 0 &&
      peiItem.acompanhamento &&
      typeof peiItem.acompanhamento === "object"
    ) {
      const dadosAcompanhamento = resumo.map((item) => {
        const dados = peiItem.acompanhamento[item.habilidade] || {};
        return [
          item.habilidade || "-",
          item.nivelAlmejado || "-",
          dados.status || "-",
          dados.observacoes || "-",
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["Habilidade", "Nível Almejado", "Alcançado?", "Observações"]],
        body: dadosAcompanhamento,
        styles: {
          font: styles.font,
          fontSize: styles.fontSize.small,
          textColor: styles.colors.black,
          fillColor: styles.colors.white,
          lineColor: styles.colors.black,
          lineWidth: 0.1,
          cellPadding: 2,
          valign: "middle",
        },
        headStyles: {
          fillColor: styles.colors.white,
          textColor: styles.colors.black,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30, halign: "center" },
          2: { cellWidth: 30, halign: "center" },
          3: { cellWidth: 70 },
        },
        margin: { bottom: 25 },
        didDrawPage: (data) => {
          addFooter(doc, doc.internal.pageSize.getHeight());
        },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Assinatura do professor (sempre abaixo da tabela, sem a data de criação do PEI específico)
    doc.setFont(styles.font, "normal");
    doc.setFontSize(styles.fontSize.large);
    doc.text(`Elaborado por: ${peiItem.nomeCriador || "Desconhecido"}`, 20, y);
    y += 15; // Espaço para o próximo PEI ou outras seções
  });

  // --- FIM DA SEÇÃO DE EXIBIÇÃO DOS PEIs ---

  // Seção de legenda
  // Configurações de espaço
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerArea = 25; // Espaço reservado para o rodapé
  const minSpaceAboveFooter = 30; // Espaço mínimo necessário acima do rodapé

  // Seção de legenda - com verificação de espaço melhorada
  if (y > pageHeight - footerArea - minSpaceAboveFooter) {
    doc.addPage();
    y = 20;
  }

  doc.setFont(styles.font, "bold");
  doc.text("Legenda dos Níveis:", 30, y);
  y += 6;
  doc.setFont(styles.font, "normal");

  Object.entries(legendaNiveis).forEach(([sigla, descricao]) => {
    // Verifica espaço para cada item da legenda
    if (y > pageHeight - footerArea - 10) {
      doc.addPage();
      y = 20;
    }

    const cor = coresPorNivel[sigla] || styles.colors.white;
    doc.setFillColor(...cor);
    doc.rect(22, y - 4, 8, 6, "F");
    doc.text(`${sigla} – ${descricao}`, 32, y);
    y += 7;
  });
  y += 10;

  // Seção de assinatura final do documento
  const signatureBlockHeight = 50;

  if (y > pageHeight - footerArea - signatureBlockHeight) {
    doc.addPage();
    y = 20;
  }

  const dataHoje = new Date().toLocaleDateString("pt-BR");
  doc.text(`Guabiruba, ${dataHoje}`, 20, y);
  y += 10;

  doc.line(20, y, 100, y);
  y += 6;
  doc.text(
    `Assinatura: ${usuarioLogado?.nome || "___________________________"}`,
    20,
    y
  );
  y += 6;
  doc.text(`Cargo: ${usuarioLogado?.cargo || ""}`, 20, y);

  y += 10;

  // Seção de assinaturas dos professores (para gestão)
  if (["gestao", "aee", "seme"].includes(usuarioLogado?.perfil)) {
    try {
      const professoresSnap = await getDocs(
        query(collection(db, "usuarios"), where("perfil", "==", "professor"))
      );

      const professoresVinculados = professoresSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((prof) => {
          const escolasOK = Object.keys(prof.escolas || {}).includes(
            aluno.escolaId
          );
          const turmasOK = Object.keys(prof.turmas || {}).includes(aluno.turma);
          return escolasOK && turmasOK;
        });

      if (professoresVinculados.length > 0) {
        if (y + 30 > doc.internal.pageSize.getHeight()) {
          doc.addPage();
          y = 20;
        }

        doc.setFont(styles.font, "bold");
        doc.text("Assinaturas dos Professores", 20, y);
        y += 8;

        const linhasAssinaturas = professoresVinculados.map((p) => [
          p.nome,
          "___________________________",
        ]);

        autoTable(doc, {
          startY: y,
          head: [["Nome do Professor", "Assinatura"]],
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
            0: { cellWidth: 90 },
            1: { cellWidth: 80 },
          },
          margin: { bottom: 25 },
          didDrawPage: (data) => {
            addFooter(doc, doc.internal.pageSize.getHeight());
          },
        });
      }
    } catch (err) {
      console.error("Erro ao buscar professores:", err);
    }
  }

  // Salvar o PDF
  doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}.pdf`);
}
