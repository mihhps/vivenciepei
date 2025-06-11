// src/utils/gerarPDFCompleto.js

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // Importe autoTable diretamente
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore"; // Importa 'doc' e 'getDoc' diretamente
import { db } from "../firebase"; // Certifique-se que o caminho para o firebase config está correto

// Configurações de estilo para o PDF
const styles = {
  font: "times", // Fonte Times New Roman para o PDF
  fontSize: {
    small: 8,
    medium: 10,
    large: 12,
    title: 14,
  },
  colors: {
    black: [0, 0, 0],
    white: [255, 255, 255],
    grayLight: [200, 200, 200],
    red: [255, 0, 0],
    yellow: [255, 255, 0],
    blue: [0, 0, 255],
    magenta: [255, 0, 255],
    purple: [128, 0, 128], // Adicionado roxo
    green: [0, 128, 0], // Adicionado verde
  },
};

// Cores para os níveis de avaliação
const coresPorNivel = {
  NR: styles.colors.red, // Não realizou
  AF: styles.colors.yellow, // Apoio físico
  AG: styles.colors.purple, // Apoio gestual
  AV: styles.colors.grayLight, // Apoio verbal
  AVi: styles.colors.green, // Apoio visual
  I: styles.colors.magenta, // Independente
};

// Legenda dos níveis de avaliação
const legendaNiveis = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
};

// Função para formatar datas de forma robusta para exibição no PDF
function formatarData(data) {
  if (!data) return "-";

  try {
    let dateObj;
    if (typeof data.toDate === "function") {
      // Firestore Timestamp
      dateObj = data.toDate();
    } else if (data instanceof Date) {
      // Objeto Date nativo
      dateObj = data;
    } else if (typeof data === "string") {
      // String (ISO ou YYYY-MM-DD)
      if (data.includes("T")) {
        // Tenta parsear formato ISO (com 'T')
        dateObj = new Date(data);
      } else {
        // Assume YYYY-MM-DD
        const [year, month, day] = data.split("-").map(Number);
        dateObj = new Date(year, month - 1, day);
      }
    } else {
      // Caso de dado inesperado
      return "-";
    }

    if (isNaN(dateObj.getTime())) return "-"; // Verifica se a data é válida

    const dia = dateObj.getDate().toString().padStart(2, "0");
    const mes = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const ano = dateObj.getFullYear();

    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return "-";
  }
}

// Função para adicionar rodapé em todas as páginas do PDF
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

// Função principal para gerar o PDF completo do PEI
export async function gerarPDFCompleto(aluno, usuarioLogado) {
  if (!aluno?.id || !aluno?.nome) {
    console.error("ID ou nome do aluno não definido para gerar o PDF!");
    return;
  }

  const doc = new jsPDF();
  let y = 45; // Posição vertical inicial

  // --- Seção: Cabeçalho do Documento ---
  doc.addImage("/logo.jpg", "JPEG", 10, 10, 128, 25); // Adiciona o logo
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.title);
  doc.text("PLANO EDUCACIONAL INDIVIDUALIZADO (PEI)", 105, y, {
    align: "center",
  });
  y += 10;

  // --- Seção: Buscar Dados da Escola ---
  let nomeEscola = "-";
  if (aluno.escolaId) {
    try {
      // CORRIGIDO: Usando 'doc' importado diretamente
      const escolaSnap = await getDoc(doc(db, "escolas", aluno.escolaId));
      if (escolaSnap.exists()) {
        nomeEscola = escolaSnap.data().nome || "-";
      }
    } catch (err) {
      console.error("Erro ao buscar nome da escola:", err);
    }
  }

  // --- Seção: Buscar Avaliação Inicial do Aluno ---
  let avaliacao = {};
  try {
    const queryAvaliacao = query(
      collection(db, "avaliacoesIniciais"),
      where("alunoId", "==", aluno.id) // Preferir alunoId para buscar a avaliação
    );
    let snapAvaliacao = await getDocs(queryAvaliacao);

    // Fallback: Se não encontrar por alunoId, tentar por nome (para compatibilidade)
    if (snapAvaliacao.empty) {
      const queryAvaliacaoNome = query(
        collection(db, "avaliacoesIniciais"),
        where("aluno", "==", aluno.nome)
      );
      snapAvaliacao = await getDocs(queryAvaliacaoNome);
    }

    if (!snapAvaliacao.empty) {
      const avaliacaoData = snapAvaliacao.docs[0].data();
      if (avaliacaoData.respostas || avaliacaoData.habilidades) {
        avaliacao = avaliacaoData;
      } else {
        console.warn(
          "Avaliação encontrada, mas sem estrutura esperada (respostas/habilidades):",
          avaliacaoData
        );
      }
    } else {
      console.warn(
        "Nenhuma avaliação inicial encontrada para o aluno:",
        aluno.nome
      );
    }
  } catch (err) {
    console.error("Erro ao buscar avaliação inicial:", err);
  }

  // --- Seção: Buscar Todos os PEIs do Aluno ---
  let todosPeis = [];
  try {
    // Buscar PEIs por alunoId (mais confiável)
    let queryPeis = query(
      collection(db, "peis"),
      where("alunoId", "==", aluno.id)
    );
    let snapPeis = await getDocs(queryPeis);

    // Fallback: Se não encontrar por alunoId, tenta pelo nome (para compatibilidade com dados antigos)
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
    return dataA.getTime() - dataB.getTime(); // Comparar timestamps numéricos
  });

  // Se não houver PEIs, gera um PDF básico e encerra
  if (peisOrdenados.length === 0) {
    console.warn("Nenhum PEI encontrado para o aluno, gerando PDF básico.");
    doc.text(
      "Nenhum Plano Educacional Individualizado (PEI) encontrado para este aluno.",
      25,
      y
    );
    addFooter(doc, doc.internal.pageSize.getHeight()); // Adiciona rodapé antes de salvar
    doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}.pdf`);
    return;
  }

  // --- Lógica de Organização dos PEIs para Exibição no PDF ---
  let peisParaExibir = [];
  const peiMaisRecente = peisOrdenados[peisOrdenados.length - 1];

  // Perfis ou Cargos que podem criar um PEI "base"
  const criadoresDeBase = [
    "PROFESSOR",
    "PROFESSORA AEE", // Exemplo de Cargo
    "AEE", // Exemplo de Perfil
    "DIRETOR",
    "DIRETOR ADJUNTO",
    "ORIENTADOR PEDAGÓGICO",
    "GESTAO",
    "SEME",
    "DESENVOLVEDOR", // Adicionado, se desenvolvedores também criam PEIs base
  ];

  let peiBaseEncontrado = null;
  for (const pei of peisOrdenados) {
    const cargo = pei.cargoCriador?.toUpperCase();
    const perfil = pei.criadorPerfil?.toUpperCase();
    if (criadoresDeBase.includes(cargo) || criadoresDeBase.includes(perfil)) {
      peiBaseEncontrado = pei;
      break;
    }
  }

  const idsJaAdicionados = new Set();
  if (peiBaseEncontrado) {
    peisParaExibir.push(peiBaseEncontrado);
    idsJaAdicionados.add(peiBaseEncontrado.id);
  }

  const outrosPeisHistorico = peisOrdenados.filter(
    (pei) => !idsJaAdicionados.has(pei.id) && pei.id !== peiMaisRecente.id
  );
  outrosPeisHistorico.forEach((pei) => peisParaExibir.push(pei));

  if (!idsJaAdicionados.has(peiMaisRecente.id)) {
    peisParaExibir.push(peiMaisRecente);
  }

  // --- Seção: Informações do Aluno ---
  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.large);

  const dataNascTexto = formatarData(aluno.nascimento);
  const dataAvaliacaoTexto = formatarData(avaliacao?.inicio);
  const proximaAvaliacaoTexto =
    formatarData(avaliacao?.proximaAvaliacao) ||
    formatarData(peiMaisRecente?.proximaAvaliacao) ||
    "-";

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

  // --- Seção: Avaliação Inicial ---
  if (avaliacao.respostas || avaliacao.habilidades) {
    if (y + 30 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y = 20;
    }
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Avaliação Inicial", 20, y);
    y += 8;

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
      "Nenhuma avaliação inicial detalhada encontrada ou com dados incompletos.",
      25,
      y
    );
    y += 10;
  }

  // --- Seção: Exibição dos PEIs (Histórico) ---
  peisParaExibir.forEach((peiItem, index) => {
    const resumo = peiItem.resumoPEI || peiItem.areas || [];

    if (y + 60 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y = 20;
    }

    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text(
      `Plano Educacional Individualizado (PEI) - ${formatarData(
        peiItem.criadoEm
      )}`,
      20,
      y
    );
    y += 8;

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
    const margemPEI = (larguraPagina - 195) / 2;

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
      const margemAtividade = (larguraPagina - 170) / 2;
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

    // Assinatura do criador do PEI
    doc.setFont(styles.font, "normal");
    doc.setFontSize(styles.fontSize.medium);
    doc.text(`Elaborado por: ${peiItem.nomeCriador || "Desconhecido"}`, 20, y);
    doc.text(`Cargo: ${peiItem.cargoCriador || "Não Informado"}`, 20, y + 5);
    y += 15;
  });

  // --- Seção: Legenda Final ---
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerArea = 25;
  const minSpaceAboveFooter = 30;

  if (
    y >
    pageHeight -
      footerArea -
      minSpaceAboveFooter -
      Object.keys(legendaNiveis).length * 7
  ) {
    doc.addPage();
    y = 20;
  }

  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Legenda dos Níveis:", 30, y);
  y += 6;
  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.small);

  Object.entries(legendaNiveis).forEach(([sigla, descricao]) => {
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

  // --- Seção: Assinatura do Responsável (usuário logado) ---
  const signatureBlockHeight = 50;
  if (y > pageHeight - footerArea - signatureBlockHeight) {
    doc.addPage();
    y = 20;
  }

  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.medium);
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

  // --- Seção: Tabela de Assinaturas de Profissionais ---
  const perfisParaTabelaAssinaturas = [
    "gestao",
    "aee",
    "seme",
    "diretor",
    "diretor adjunto",
    "orientador pedagógico",
    "desenvolvedor", // Adicionado o perfil 'desenvolvedor'
  ];

  if (
    perfisParaTabelaAssinaturas.includes(usuarioLogado?.perfil?.toLowerCase())
  ) {
    try {
      const perfisParaQuery = [
        "professor",
        "aee",
        "diretor",
        "diretor adjunto",
        "orientador pedagógico",
        "desenvolvedor", // Adicionado também na query para buscar os devs que podem assinar
      ];

      const professoresComAssinaturaQuery = query(
        collection(db, "usuarios"),
        where("perfil", "in", perfisParaQuery)
      );
      const professoresSnap = await getDocs(professoresComAssinaturaQuery);

      const professoresVinculados = professoresSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((prof) => {
          const estaNaEscolaDoAluno = Object.keys(prof.escolas || {}).includes(
            aluno.escolaId
          );

          const profTurmas = Object.keys(prof.turmas || {});
          const estaNaTurmaDoAluno =
            aluno.turma && profTurmas.includes(aluno.turma); // Verifica se aluno tem turma e prof tem essa turma

          const perfilLower = prof.perfil?.toLowerCase();

          if (["professor", "aee"].includes(perfilLower)) {
            // Professores e AEE: precisa estar na escola E, se o aluno tem turma, na turma.
            // Se o aluno NÃO TEM turma (aluno.turma é falso), a condição da turma é ignorada (true).
            return estaNaEscolaDoAluno && (!aluno.turma || estaNaTurmaDoAluno);
          } else {
            // Diretores, Orientadores, Desenvolvedores, Gestão, SEME: basta estar na escola.
            return estaNaEscolaDoAluno;
          }
        });

      if (professoresVinculados.length > 0) {
        if (y + 30 > doc.internal.pageSize.getHeight() - footerArea) {
          doc.addPage();
          y = 20;
        }

        doc.setFont(styles.font, "bold");
        doc.setFontSize(styles.fontSize.large);
        doc.text("Assinaturas dos Profissionais", 20, y); // Título mais abrangente
        y += 8;

        const linhasAssinaturas = professoresVinculados.map((p) => [
          p.nome,
          p.cargo || p.perfil?.toUpperCase(), // Usa cargo se existir, senão perfil
          "_______________________________", // Linha para assinatura
        ]);

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
            0: { cellWidth: 70 }, // Nome
            1: { cellWidth: 60, halign: "center" }, // Cargo
            2: { cellWidth: 60 }, // Assinatura
          },
          margin: { bottom: 25 },
          didDrawPage: (data) => {
            addFooter(doc, doc.internal.pageSize.getHeight());
          },
        });
        y = doc.lastAutoTable.finalY + 10; // Atualiza 'y' após a tabela
      } else {
        console.warn(
          "Nenhum profissional encontrado após a filtragem para a tabela de assinaturas. A tabela não será gerada."
        );
      }
    } catch (err) {
      console.error("Erro ao buscar profissionais para assinatura:", err);
    }
  }

  // --- Finalização e Salvamento do PDF ---
  addFooter(doc, doc.internal.pageSize.getHeight());
  doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}.pdf`);
}
