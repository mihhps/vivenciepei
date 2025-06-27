// src/utils/gerarPDFCompleto.js

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  collection,
  query,
  where,
  getDocs,
  doc as firestoreDoc,
  getDoc,
  orderBy, // Adicionado import para orderBy
} from "firebase/firestore";
import { db } from "../firebase";

// --- Constantes e Estilos (Mantidos, pois já estão bem definidos) ---
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
    grayLight: [200, 200, 200],
    red: [255, 0, 0],
    yellow: [255, 255, 0],
    blue: [0, 0, 255],
    magenta: [255, 0, 255],
    purple: [128, 0, 128],
    green: [0, 128, 0],
  },
};

const coresPorNivel = {
  NR: styles.colors.red,
  AF: styles.colors.yellow,
  AG: styles.colors.purple,
  AV: styles.colors.grayLight,
  AVi: styles.colors.green,
  I: styles.colors.magenta,
};

const legendaNiveis = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
};

// --- Funções Auxiliares (Refatoradas ou Mantidas) ---

/**
 * Formata um objeto de data ou string para o formato DD/MM/AAAA.
 * @param {firebase.firestore.Timestamp|Date|string} data - A data a ser formatada.
 * @returns {string} Data formatada ou "-" se inválido.
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

    const dia = dateObj.getDate().toString().padStart(2, "0");
    const mes = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const ano = dateObj.getFullYear();

    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return "-";
  }
}

/**
 * Adiciona o rodapé padrão a uma página do PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {number} pageHeight - Altura da página do PDF.
 */
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

/**
 * Garante que há espaço suficiente na página ou adiciona uma nova página.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {number} currentY - Posição Y atual no documento.
 * @param {number} requiredSpace - Espaço mínimo necessário para o próximo conteúdo.
 * @param {number} [footerHeight=25] - Altura aproximada do rodapé.
 * @returns {number} Nova posição Y.
 */
function ensurePageSpace(doc, currentY, requiredSpace, footerHeight = 25) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + requiredSpace > pageHeight - footerHeight) {
    doc.addPage();
    addFooter(doc, pageHeight); // Adiciona rodapé na página anterior antes de adicionar nova
    return 20; // Y inicial da nova página
  }
  return currentY;
}

/**
 * Busca os PEIs de um aluno no Firestore.
 * Prioriza 'pei_contribuicoes' e fallback para 'peis'.
 * @param {string} alunoId - ID do aluno.
 * @param {string} alunoNome - Nome do aluno (para fallback).
 * @returns {Promise<Array<Object>>} Lista de PEIs.
 */
async function fetchPeis(alunoId, alunoNome) {
  try {
    let peis = [];
    const newCollectionRef = collection(db, "pei_contribuicoes");
    const oldCollectionRef = collection(db, "peis");

    // Tentar buscar na nova coleção: pei_contribuicoes
    let qNew = query(
      newCollectionRef,
      where("alunoId", "==", alunoId),
      orderBy("dataCriacao", "desc")
    );
    let snapNew = await getDocs(qNew);

    if (!snapNew.empty) {
      console.log("[PDF_DEBUG] PEIs encontrados em 'pei_contribuicoes'.");
      peis = snapNew.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      console.log(
        "[PDF_DEBUG] Nenhum PEI encontrado em 'pei_contribuicoes', tentando 'peis' (coleção antiga)."
      );
      // Fallback para a coleção antiga: peis
      let qOld = query(
        oldCollectionRef,
        where("alunoId", "==", alunoId),
        orderBy("dataCriacao", "desc")
      );
      let snapOld = await getDocs(qOld);

      if (snapOld.empty) {
        // Segundo fallback para nome (caso alunoId não estivesse na coleção antiga)
        qOld = query(
          oldCollectionRef,
          where("aluno", "==", alunoNome),
          orderBy("dataCriacao", "desc")
        );
        snapOld = await getDocs(qOld);
      }

      if (!snapOld.empty) {
        console.log("[PDF_DEBUG] PEIs encontrados em 'peis' (coleção antiga).");
        peis = snapOld.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } else {
        console.log(
          "[PDF_DEBUG] Nenhum PEI encontrado em nenhuma das coleções."
        );
      }
    }
    return peis;
  } catch (err) {
    console.error("Erro ao buscar PEIs:", err);
    return [];
  }
}

/**
 * Adiciona o cabeçalho e informações do aluno ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} aluno - Objeto do aluno.
 * @param {Object} avaliacao - Objeto da avaliação inicial.
 * @param {string} nomeEscola - Nome da escola.
 * @param {number} y - Posição Y atual.
 * @returns {number} Nova posição Y.
 */
function addStudentAndHeaderInfo(doc, aluno, avaliacao, nomeEscola, y) {
  const imgWidth = 128;
  const imgHeight = 25;
  const imgX = 10;
  const imgY = 10;

  doc.addImage("/logo.jpg", "JPEG", imgX, imgY, imgWidth, imgHeight);
  y = imgY + imgHeight + 10; // Margem abaixo da imagem

  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.large);

  const dataNascTexto = formatarData(aluno.nascimento);
  const dataAvaliacaoTexto = formatarData(avaliacao?.inicio);

  const infoAluno = [
    `Escola: ${nomeEscola}`,
    `Nome: ${aluno.nome}`,
    `Data de Nascimento: ${dataNascTexto}`,
    `Diagnóstico: ${aluno.diagnostico || "-"}`,
    `Data da Avaliação Inicial: ${dataAvaliacaoTexto}`,
    `Data da Próxima Avaliação: ${formatarData(avaliacao?.proximaAvaliacao) || "-"}`,
  ];

  infoAluno.forEach((info) => {
    doc.text(info, 20, y);
    y += 6;
  });
  return y + 4;
}

/**
 * Adiciona a seção de Avaliação Inicial ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} avaliacao - Objeto da avaliação inicial.
 * @param {number} y - Posição Y atual.
 * @returns {number} Nova posição Y.
 */
function addInitialAssessment(doc, avaliacao, y) {
  const dadosAvaliacao = avaliacao?.respostas || avaliacao?.habilidades;

  if (!dadosAvaliacao || Object.keys(dadosAvaliacao).length === 0) {
    doc.text(
      "Nenhuma avaliação inicial detalhada encontrada ou com dados incompletos.",
      25,
      y
    );
    return y + 10;
  }

  y = ensurePageSpace(doc, y, 30);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Avaliação Inicial", 20, y);
  y += 8;

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

    y = ensurePageSpace(doc, y, 30);
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
  return y;
}

/**
 * Adiciona a seção de PEIs consolidados ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Array<Object>} peisParaExibir - PEIs a serem exibidos.
 * @param {number} y - Posição Y atual.
 * @returns {number} Nova posição Y.
 */
function addConsolidatedPeiSection(doc, peisParaExibir, y) {
  const allPeiTableRows = [];
  let totalPeiContributions = 0;

  peisParaExibir.forEach((peiItem) => {
    const resumo = peiItem.resumoPEI || peiItem.areas || [];
    if (resumo.length === 0) return;

    totalPeiContributions++;

    // Linha de separação para identificar o colaborador e o PEI
    allPeiTableRows.push([
      {
        content: `Elaborado por: ${peiItem.nomeCriador || "Desconhecido"} - Cargo: ${peiItem.cargoCriador || "Não Informado"}`, // <--- Linha ALTERADA
        colSpan: 6,
        styles: {
          fontStyle: "bold",
          fillColor: styles.colors.grayLight,
          textColor: styles.colors.black,
          halign: "center",
          cellPadding: 2,
        },
      },
    ]);

    // Adiciona as linhas com as habilidades e estratégias deste PEI
    const linhasDoPeiAtual = resumo.map((item) => [
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
    allPeiTableRows.push(...linhasDoPeiAtual);

    // *** AQUI É O PONTO CHAVE PARA AS ATIVIDADES APLICADAS POR COLABORADOR ***
    // Atividade Aplicada para este PEI (se existir), logo abaixo das estratégias e ainda
    // sob o "cabeçalho" do colaborador.
    if (peiItem.atividadeAplicada?.trim()) {
      allPeiTableRows.push([
        {
          content: `Atividade Aplicada: ${peiItem.atividadeAplicada}`,
          colSpan: 6, // Mescla todas as colunas para a atividade
          styles: {
            fontStyle: "italic", // Estilo para diferenciar
            fontSize: styles.fontSize.small,
            cellPadding: 2,
            valign: "top",
            lineColor: styles.colors.black,
            lineWidth: 0.1,
            fillColor: styles.colors.white,
          },
        },
      ]);
    }
    // NOTA: Acompanhamento não foi incluído diretamente na tabela consolidada por complexidade.
    // Se necessário, uma solução personalizada para o acompanhamento dentro da célula ou
    // uma sub-tabela dedicada precisaria ser implementada.
  });

  if (totalPeiContributions === 0) {
    doc.text(
      "Nenhum Plano Educacional Individualizado (PEI) com estratégias detalhadas encontrado para este aluno.",
      25,
      y
    );
    return y + 10;
  }

  y = ensurePageSpace(doc, y, 60);
  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text(
    "Plano Educacional Individualizado (PEI) Consolidado",
    doc.internal.pageSize.getWidth() / 2,
    y,
    { align: "center" }
  );
  y += 8;

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
    body: allPeiTableRows,
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
      // O rodapé já é adicionado pelo ensurePageSpace ou pela última chamada.
      // É importante ter cuidado para não adicionar duas vezes.
    },
  });
  return doc.lastAutoTable.finalY + 10;
}

/**
 * Adiciona a seção de Legenda dos Níveis ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {number} y - Posição Y atual.
 * @returns {number} Nova posição Y.
 */
function addLegendSection(doc, y) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerArea = 25;
  const minSpaceAboveFooter = 30;

  y = ensurePageSpace(
    doc,
    y,
    Object.keys(legendaNiveis).length * 7 + minSpaceAboveFooter
  );

  doc.setFont(styles.font, "bold");
  doc.setFontSize(styles.fontSize.large);
  doc.text("Legenda dos Níveis:", 30, y);
  y += 6;
  doc.setFont(styles.font, "normal");
  doc.setFontSize(styles.fontSize.small);

  Object.entries(legendaNiveis).forEach(([sigla, descricao]) => {
    // ensurePageSpace já cuida da quebra de página
    const cor = coresPorNivel[sigla] || styles.colors.white;
    doc.setFillColor(...cor);
    doc.rect(22, y - 4, 8, 6, "F");
    doc.text(`${sigla} – ${descricao}`, 32, y);
    y += 7;
  });
  return y + 10;
}

/**
 * Adiciona a seção de Assinatura do Responsável ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} usuarioLogado - Objeto do usuário logado.
 * @param {number} y - Posição Y atual.
 * @returns {number} Nova posição Y.
 */
function addLoggedInUserSignature(doc, usuarioLogado, y) {
  const signatureBlockHeight = 50;
  y = ensurePageSpace(doc, y, signatureBlockHeight);

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
  return y + 10;
}

/**
 * Adiciona a tabela de assinaturas de profissionais ao PDF.
 * @param {jsPDF} doc - Instância do jsPDF.
 * @param {Object} aluno - Objeto do aluno.
 * @param {Object} usuarioLogado - Objeto do usuário logado.
 * @param {number} y - Posição Y atual.
 * @returns {Promise<number>} Nova posição Y.
 */
async function addProfessionalSignaturesTable(doc, aluno, usuarioLogado, y) {
  const perfisParaTabelaAssinaturas = [
    "gestao",
    "aee",
    "seme",
    "diretor",
    "diretor adjunto",
    "orientador pedagógico",
    "desenvolvedor",
  ];

  if (
    !perfisParaTabelaAssinaturas.includes(usuarioLogado?.perfil?.toLowerCase())
  ) {
    return y; // Não gera a tabela se o usuário logado não tem perfil adequado
  }

  try {
    const perfisParaQuery = [
      "professor",
      "aee",
      "diretor",
      "diretor adjunto",
      "orientador pedagógico",
      "desenvolvedor",
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
          aluno.turma && profTurmas.includes(aluno.turma);
        const perfilLower = prof.perfil?.toLowerCase();

        if (["professor", "aee"].includes(perfilLower)) {
          return estaNaEscolaDoAluno && (!aluno.turma || estaNaTurmaDoAluno);
        }
        return estaNaEscolaDoAluno;
      });

    if (professoresVinculados.length === 0) {
      console.warn(
        "Nenhum profissional encontrado para a tabela de assinaturas."
      );
      return y;
    }

    y = ensurePageSpace(doc, y, 30);
    doc.setFont(styles.font, "bold");
    doc.setFontSize(styles.fontSize.large);
    doc.text("Assinaturas dos Profissionais", 20, y);
    y += 8;

    const linhasAssinaturas = professoresVinculados.map((p) => [
      p.nome,
      p.cargo || p.perfil?.toUpperCase(),
      "_______________________________",
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
        0: { cellWidth: 70 },
        1: { cellWidth: 60, halign: "center" },
        2: { cellWidth: 60 },
      },
      margin: { bottom: 25 },
      didDrawPage: (data) => {
        // Rodapé já é adicionado por ensurePageSpace ou no final
      },
    });
    return doc.lastAutoTable.finalY + 10;
  } catch (err) {
    console.error("Erro ao buscar profissionais para assinatura:", err);
    return y;
  }
}

// --- Função Principal: gerarPDFCompleto (Refatorada) ---

export async function gerarPDFCompleto(
  aluno,
  avaliacao,
  usuarioLogado,
  peisParaGeral = null
) {
  const doc = new jsPDF();
  let y = 20; // Posição Y inicial para o conteúdo

  console.log("[PDF_DEBUG] Início da geração do PDF.");
  console.log("[PDF_DEBUG] Aluno:", JSON.stringify(aluno, null, 2));
  console.log("Usuario Logado:", JSON.stringify(usuarioLogado, null, 2));
  console.log("Avaliação:", JSON.stringify(avaliacao, null, 2));
  console.log(
    "[PDF_DEBUG] PEIs passados para Geral (se aplicável):",
    JSON.stringify(peisParaGeral, null, 2)
  );

  // --- 1. Validações Iniciais ---
  if (!aluno || !aluno.nome || !aluno.id) {
    console.error("gerarPDFCompleto: Dados do aluno são incompletos.");
    doc.text("Erro: Dados do aluno incompletos.", 20, y);
    addFooter(doc, doc.internal.pageSize.getHeight());
    doc.save(`Erro_Dados_Aluno_Incompletos.pdf`);
    return;
  }

  // --- 2. Busca e Preparação dos PEIs ---
  let peisParaProcessar;
  if (Array.isArray(peisParaGeral) && peisParaGeral.length > 0) {
    peisParaProcessar = peisParaGeral;
    console.log("[PDF_DEBUG] Usando PEIs passados como peisParaGeral.");
  } else {
    peisParaProcessar = await fetchPeis(aluno.id, aluno.nome);
  }

  // Ordena os PEIs para exibição (do mais novo para o mais antigo, por data de criação)
  const peisOrdenados = peisParaProcessar.sort((a, b) => {
    const dataA = a.dataCriacao?.toDate
      ? a.dataCriacao.toDate()
      : new Date(a.dataCriacao);
    const dataB = b.dataCriacao?.toDate
      ? b.dataCriacao.toDate()
      : new Date(b.dataCriacao);
    return dataB.getTime() - dataA.getTime();
  });

  // Lógica de organização dos PEIs para exibição (base + histórico)
  let peisParaExibir = [];
  if (peisParaGeral === null) {
    // Se não foi pedido um PDF "geral" com PEIs específicos, filtra o principal
    let peiBaseEncontrado = null;
    const criadoresDeBase = [
      "PROFESSOR REGENTE",
      "PROFESSOR DE SUPORTE",
      "AEE",
      "GESTAO",
      "SEME",
      "DESENVOLVEDOR",
    ];
    for (const peiItem of peisOrdenados) {
      const cargo = peiItem.cargoCriador?.toUpperCase();
      const perfil = peiItem.criadorPerfil?.toUpperCase();
      if (criadoresDeBase.includes(cargo) || criadoresDeBase.includes(perfil)) {
        peiBaseEncontrado = peiItem;
        break;
      }
    }

    const idsJaAdicionados = new Set();
    if (peiBaseEncontrado) {
      peisParaExibir.push(peiBaseEncontrado);
      idsJaAdicionados.add(peiBaseEncontrado.id);
    }
    const outrosPeisHistorico = peisOrdenados.filter(
      (peiItem) => !idsJaAdicionados.has(peiItem.id)
    );
    peisParaExibir.push(...outrosPeisHistorico);
  } else {
    // Se `peisParaGeral` foi fornecido, usa-o diretamente como `peisParaExibir`
    peisParaExibir = peisOrdenados; // Já está ordenado.
  }

  console.log(
    "[PDF_DEBUG] PEIs para exibir (final):",
    JSON.stringify(peisParaExibir, null, 2)
  );

  if (
    peisParaExibir.length === 0 &&
    (!avaliacao || Object.keys(avaliacao).length === 0)
  ) {
    console.warn(
      "Nenhum PEI ou avaliação encontrado para o aluno, gerando PDF básico informativo."
    );
    doc.text(
      "Nenhum Plano Educacional Individualizado (PEI) ou Avaliação Inicial encontrado para este aluno.",
      25,
      y
    );
    addFooter(doc, doc.internal.pageSize.getHeight());
    doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}_Sem_Dados.pdf`);
    return;
  }

  // --- 3. Busca Nome da Escola ---
  let nomeEscola = "-";
  if (aluno.escolaId) {
    try {
      const escolaRef = firestoreDoc(db, "escolas", aluno.escolaId);
      const escolaSnap = await getDoc(escolaRef);
      if (escolaSnap.exists()) {
        nomeEscola = escolaSnap.data().nome || "-";
      } else {
        console.warn(`Escola não encontrada para o ID: ${aluno.escolaId}`);
      }
    } catch (err) {
      console.error("Erro ao buscar nome da escola:", err);
    }
  }

  // --- 4. Geração das Seções do PDF ---
  y = addStudentAndHeaderInfo(doc, aluno, avaliacao, nomeEscola, y);
  y = addInitialAssessment(doc, avaliacao, y);
  y = addConsolidatedPeiSection(doc, peisParaExibir, y);
  y = addLegendSection(doc, y);
  y = addLoggedInUserSignature(doc, usuarioLogado, y);
  y = await addProfessionalSignaturesTable(doc, aluno, usuarioLogado, y);

  // --- 5. Finalização e Salvamento do PDF ---
  addFooter(doc, doc.internal.pageSize.getHeight()); // Garante que o rodapé esteja na última página também
  doc.save(`PEI_${aluno.nome.replace(/\s+/g, "_")}_Completo.pdf`);
  console.log("[PDF_DEBUG] Geração do PDF concluída.");
}
