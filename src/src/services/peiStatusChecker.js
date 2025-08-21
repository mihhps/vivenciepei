import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";

/**
 * Converte um timestamp do Firestore para um objeto Date de forma segura.
 * @param {object} timestamp - O objeto de timestamp do Firestore.
 * @returns {Date|null} O objeto Date ou null se a entrada for inválida.
 */
const getDateFromTimestamp = (timestamp) => {
  if (timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  return null;
};

/**
 * Determina o status de criação do PEI para um aluno.
 * @param {object|null} peiData - Os dados do PEI do aluno.
 * @param {Date} hoje - A data atual.
 * @param {Date|null} prazoCriacao - O prazo final para a criação do PEI.
 * @returns {string} O status de criação do PEI.
 */
const getStatusCriacao = (peiData, hoje, prazoCriacao) => {
  const dataCriacao = peiData
    ? getDateFromTimestamp(peiData.dataCriacao)
    : null;

  if (!prazoCriacao) return "Prazo não definido";

  if (!dataCriacao) {
    return hoje >= prazoCriacao ? "Atrasado - Sem PEI" : "Aguardando Criação";
  }

  return dataCriacao > prazoCriacao ? "Criado (Atrasado)" : "Criado no Prazo";
};

/**
 * Determina o status de uma revisão do PEI para um aluno.
 * @param {object|null} peiData - Os dados do PEI do aluno.
 * @param {Date} hoje - A data atual.
 * @param {Date|null} prazoRevisao - O prazo final para a revisão.
 * @returns {string} O status da revisão do PEI.
 */
const getStatusRevisao = (peiData, hoje, prazoRevisao) => {
  if (!prazoRevisao) return "N/A";

  const dataUltimaRevisao = peiData
    ? getDateFromTimestamp(peiData.dataUltimaRevisao)
    : null;
  const dataCriacao = peiData
    ? getDateFromTimestamp(peiData.dataCriacao)
    : null;
  const dataReferencia = dataUltimaRevisao || dataCriacao;

  if (hoje < prazoRevisao) {
    return dataReferencia ? "Feita (no prazo)" : "Aguardando Prazo";
  }

  // Se hoje é o dia do prazo ou já passou
  return dataReferencia && dataReferencia <= hoje
    ? "Feita (no prazo)"
    : "Atrasado";
};

/**
 * Verifica o status de PEI para um professor, otimizado para legibilidade e performance.
 * @param {number} anoLetivoAtual - O ano letivo para filtrar.
 * @param {string} professorId - O ID do documento do professor no Firestore.
 * @returns {Promise<object>} Um objeto com o resumo do status dos PEIs.
 */
export const verificarPrazosPEI = async (anoLetivoAtual, professorId) => {
  const resultado = {
    statusGeral: "Em dia",
    totalAlunosAtrasados: 0,
    detalhesAtraso: [],
    alunosComStatusDetalhado: [],
    mensagem: null,
    erro: null,
  };

  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // --- ETAPA 1: Buscar dados de professor e prazos em paralelo ---
    const professorDocRef = doc(db, "usuarios", professorId);
    const qPrazos = query(
      collection(db, "prazosPEIAnuais"),
      where("anoLetivo", "==", anoLetivoAtual),
      limit(1)
    );

    const [profDocSnap, prazosSnap] = await Promise.all([
      getDoc(professorDocRef),
      getDocs(qPrazos),
    ]);

    // Validação de dados essenciais
    if (!profDocSnap.exists()) {
      resultado.erro = "Professor não encontrado na base de dados.";
      return resultado;
    }
    if (prazosSnap.empty) {
      resultado.erro = `Não foi encontrada uma configuração de prazos para ${anoLetivoAtual}.`;
      return resultado;
    }

    const profData = profDocSnap.data();
    const prazoAnualDoc = prazosSnap.docs[0].data();

    const dataLimiteCriacaoPEI = getDateFromTimestamp(
      prazoAnualDoc.dataLimiteCriacaoPEI
    );
    const dataLimiteRevisao1Sem = getDateFromTimestamp(
      prazoAnualDoc.dataLimiteRevisao1Sem
    );
    const dataLimiteRevisao2Sem = getDateFromTimestamp(
      prazoAnualDoc.dataLimiteRevisao2Sem
    );

    // --- ETAPA 2: Buscar alunos por escola e fazer a filtragem no código ---
    const turmasDoProfessor = profData.turmas
      ? Object.keys(profData.turmas).map((t) => t.trim().toLowerCase()) // Normalização das turmas do professor
      : [];

    const escolasDoProfessor = profData.escolas
      ? Object.keys(profData.escolas)
      : [];

    if (turmasDoProfessor.length === 0 || escolasDoProfessor.length === 0) {
      resultado.mensagem = "Professor não vinculado a turmas ou escolas.";
      return resultado;
    }

    // CORREÇÃO AQUI: Removemos a cláusula "where('turma', 'in', ...)" da consulta
    // e faremos a filtragem no código.
    const qAlunos = query(
      collection(db, "alunos"),
      where("escolaId", "in", escolasDoProfessor.slice(0, 30))
    );
    const alunosSnap = await getDocs(qAlunos);

    if (alunosSnap.empty) {
      resultado.mensagem = "Nenhum aluno encontrado para suas escolas.";
      return resultado;
    }

    // AQUI ESTÁ A NOVA LÓGICA: Filtrar os alunos após recebê-los
    const todosAlunosDaEscola = alunosSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    const alunosFiltrados = todosAlunosDaEscola.filter(
      (aluno) =>
        aluno.turma &&
        turmasDoProfessor.includes(aluno.turma.trim().toLowerCase())
    );

    if (alunosFiltrados.length === 0) {
      resultado.mensagem =
        "Nenhum aluno encontrado para suas turmas e escolas.";
      return resultado;
    }

    // --- ETAPA 3: Processar cada aluno e seu PEI (agora com a lista filtrada) ---
    const peisPromises = alunosFiltrados.map(async (aluno) => {
      const qPei = query(
        collection(db, "peis"),
        where("alunoId", "==", aluno.id),
        where("anoLetivo", "==", anoLetivoAtual),
        where("criadorId", "==", professorId),
        orderBy("dataCriacao", "desc"),
        limit(1)
      );
      const peiSnap = await getDocs(qPei);
      const peiData = peiSnap.empty ? null : peiSnap.docs[0].data();

      const statusPeiGeral = getStatusCriacao(
        peiData,
        hoje,
        dataLimiteCriacaoPEI
      );
      const statusRevisao1 = getStatusRevisao(
        peiData,
        hoje,
        dataLimiteRevisao1Sem
      );
      const statusRevisao2 = getStatusRevisao(
        peiData,
        hoje,
        dataLimiteRevisao2Sem
      );

      return {
        ...aluno,
        statusPeiGeral,
        statusRevisao1,
        statusRevisao2,
        dataUltimaAtualizacaoPei: peiData
          ? getDateFromTimestamp(peiData.dataUltimaRevisao) ||
            getDateFromTimestamp(peiData.dataCriacao)
          : null,
      };
    });

    resultado.alunosComStatusDetalhado = await Promise.all(peisPromises);

    // --- ETAPA 4: Calcular o resumo final a partir dos dados processados ---
    resultado.alunosComStatusDetalhado.forEach((aluno) => {
      const isAlunoAtrasado =
        aluno.statusPeiGeral.includes("Atrasado") ||
        aluno.statusRevisao1.includes("Atrasado") ||
        aluno.statusRevisao2.includes("Atrasado");

      if (isAlunoAtrasado) {
        resultado.totalAlunosAtrasados++;
        resultado.statusGeral = "Atrasado";

        const detalhes = [
          aluno.statusPeiGeral,
          aluno.statusRevisao1,
          aluno.statusRevisao2,
        ]
          .filter((s) => s.includes("Atrasado"))
          .join(", ");

        resultado.detalhesAtraso.push(`- ${aluno.nome}: ${detalhes}`);
      }
    });
  } catch (err) {
    console.error("Erro em verificarPrazosPEI:", err);
    resultado.erro =
      "Erro inesperado ao verificar prazos. Detalhes: " + err.message;
  }

  return resultado;
};
