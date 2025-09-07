// Importa as dependências necessárias
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Importa as funções v2 do Firestore para gatilhos de documentos (onDocumentWritten, etc.)
// e para funções HTTPS (onCall, onRequest)
const {
  onDocumentWritten,
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
} = require("firebase-functions/v2/firestore");
const { onCall, onRequest } = require("firebase-functions/v2/https");

// Inicializa o Admin SDK do Firebase
admin.initializeApp();
const db = admin.firestore(); // Referência ao Firestore

// Define o tamanho máximo de um batch para queries 'in' no Firestore (limite de 10)
const FIRESTORE_QUERY_BATCH_SIZE = 10;

// --- FUNÇÃO AUXILIAR: Zera a hora de uma data para comparação apenas por dia ---
const resetTime = (date) => {
  if (date instanceof Date) {
    const newDate = new Date(date.getTime()); // Cria uma nova instância para não modificar o original
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }
  return null; // Retorna null se não for uma data válida
};

// --- FUNÇÃO AUXILIAR DE NORMALIZAÇÃO ---
// Pega uma string de turma e retorna uma versão padronizada.
// Ex: "3º ano b " -> "3º Ano B"
const normalizarTurma = (turma) => {
  if (typeof turma !== "string" || turma.trim() === "") {
    return null;
  }
  const partes = turma.trim().toLowerCase().split(" ");
  for (let i = 0; i < partes.length; i++) {
    // --- INÍCIO DA CORREÇÃO ---
    // Adiciona uma verificação específica para os algarismos romanos "i" e "ii"
    if (partes[i] === "i" || partes[i] === "ii") {
      partes[i] = partes[i].toUpperCase();
      continue; // Pula para a próxima palavra
    }
    // --- FIM DA CORREÇÃO ---

    if (
      partes[i].length > 0 &&
      partes[i] !== "de" &&
      partes[i] !== "do" &&
      partes[i] !== "da"
    ) {
      partes[i] = partes[i][0].toUpperCase() + partes[i].substr(1);
    }
  }
  return partes.join(" ");
};
const getPeiStatusDetails = (peiData, prazos, hoje) => {
  console.log("--- EXECUTANDO COM A LÓGICA CORRIGIDA v2 ---");
  // Verificação de PEI Concluído (permanece igual, é a prioridade máxima)
  if (peiData?.status?.toLowerCase() === "concluído") {
    return {
      statusPeiGeral: "Concluído",
      statusRevisao1: "Concluído",
      statusRevisao2: "Concluído",
      isAtrasadoRealmente: false,
      dataUltimaAtualizacaoPei:
        peiData?.dataUltimaRevisao || peiData?.dataCriacao || null,
    };
  }

  let statusPeiGeral = "Não iniciado";
  let statusRevisao1 = "Pendente";
  let statusRevisao2 = "Pendente";
  let finalIsAtrasadoRealmente = false;

  const hojeZerado = resetTime(new Date(hoje.getTime()));
  const dataLimiteCriacaoPEI = prazos.dataLimiteCriacaoPEI
    ? resetTime(prazos.dataLimiteCriacaoPEI)
    : null;
  const dataLimiteRevisao1Sem = prazos.dataLimiteRevisao1Sem
    ? resetTime(prazos.dataLimiteRevisao1Sem)
    : null;
  const dataLimiteRevisao2Sem = prazos.dataLimiteRevisao2Sem
    ? resetTime(prazos.dataLimiteRevisao2Sem)
    : null;

  const dataCriacaoPei = peiData?.dataCriacao?.toDate
    ? resetTime(peiData.dataCriacao.toDate())
    : null;

  // Lógica de Status de Criação (permanece igual)
  if (!peiData || !dataCriacaoPei) {
    if (dataLimiteCriacaoPEI && hojeZerado > dataLimiteCriacaoPEI) {
      statusPeiGeral = "Atrasado - Sem PEI";
      finalIsAtrasadoRealmente = true;
    } else {
      statusPeiGeral = "Aguardando Criação";
    }
  } else {
    if (dataLimiteCriacaoPEI && dataCriacaoPei > dataLimiteCriacaoPEI) {
      statusPeiGeral = "Criado (Atrasado)";
    } else {
      statusPeiGeral = "Criado no Prazo";
    }
  }

  // --- Lógica de Status de Revisão (COM A NOVA REGRA) ---
  if (dataCriacaoPei) {
    const revisoes = peiData.revisoes;

    // ##### LÓGICA CORRIGIDA PARA A 1ª REVISÃO #####
    const revisao1Concluida =
      revisoes?.primeiroSemestre?.status === "Concluído" ||
      revisoes?.primeiroSemestre?.dataRevisao;

    if (revisao1Concluida) {
      statusRevisao1 = "Concluído";
    } else {
      // Se NÃO foi concluída, aí sim verificamos se está atrasada ou pendente.
      if (dataLimiteRevisao1Sem && hojeZerado > dataLimiteRevisao1Sem) {
        statusRevisao1 = "Atrasado";
        finalIsAtrasadoRealmente = true;
      } else {
        statusRevisao1 = "Pendente";
      }
    }

    // ##### LÓGICA CORRIGIDA PARA A 2ª REVISÃO #####
    const revisao2Concluida =
      revisoes?.segundoSemestre?.status === "Concluído" ||
      revisoes?.segundoSemestre?.dataRevisao;

    if (revisao2Concluida) {
      statusRevisao2 = "Concluído";
    } else {
      // Se NÃO foi concluída, aí sim verificamos se está atrasada ou pendente.
      if (dataLimiteRevisao2Sem && hojeZerado > dataLimiteRevisao2Sem) {
        statusRevisao2 = "Atrasado";
        finalIsAtrasadoRealmente = true;
      } else {
        statusRevisao2 = "Pendente";
      }
    }
  }

  return {
    statusPeiGeral,
    statusRevisao1,
    statusRevisao2,
    isAtrasadoRealmente: finalIsAtrasadoRealmente,
    dataUltimaAtualizacaoPei:
      peiData?.dataUltimaRevisao || peiData?.dataCriacao || null,
  };
};
// =========================================================================
// ========= INÍCIO DA FUNÇÃO CORRIGIDA =====================================
// =========================================================================
async function calcularStatusProfessor(professorId) {
  const anoAtual = new Date().getFullYear();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // 1. Busca os prazos anuais do PEI
  const prazosSnap = await db
    .collection("prazosPEIAnuais")
    .where("anoLetivo", "==", anoAtual)
    .limit(1)
    .get();
  const prazoAnualDoc = prazosSnap.empty ? null : prazosSnap.docs[0].data();

  const prazosConvertidos = {
    dataLimiteCriacaoPEI: prazoAnualDoc?.dataLimiteCriacaoPEI?.toDate() || null,
    dataLimiteRevisao1Sem:
      prazoAnualDoc?.dataLimiteRevisao1Sem?.toDate() || null,
    dataLimiteRevisao2Sem:
      prazoAnualDoc?.dataLimiteRevisao2Sem?.toDate() || null,
  };

  if (!prazoAnualDoc) {
    functions.logger.warn(
      `[calcularStatusProfessor] Prazos anuais para ${anoAtual} não encontrados. Professor ${professorId} pode não ter status exato.`
    );
  }

  // 2. Busca os dados do professor
  const professorDoc = await db.collection("usuarios").doc(professorId).get();
  if (!professorDoc.exists || professorDoc.data().perfil !== "professor") {
    functions.logger.info(
      `[calcularStatusProfessor] Professor ${professorId} não encontrado ou não é perfil de professor. Retornando null.`
    );
    return null;
  }
  const professorData = professorDoc.data();

  const turmasDoProfessor = professorData.turmas
    ? Object.keys(professorData.turmas)
    : [];
  const escolasDoProfessor = professorData.escolas
    ? Object.keys(professorData.escolas)
    : [];

  // CORREÇÃO DE BUG #1: Esta área foi corrigida para não dar erro
  if (turmasDoProfessor.length === 0 || escolasDoProfessor.length === 0) {
    functions.logger.log(
      `[calcularStatusProfessor] Professor ${professorId} não tem turmas ou escolas vinculadas.`
    );
    return {
      professorId: professorId,
      professorNome: professorData.nome,
      escolaId: professorData.escolaId || null,
      statusGeral: "Em dia", // Valor correto, pois não há alunos
      alunosAtrasadosCount: 0,
      detalhesAtraso: ["Nenhuma turma ou escola vinculada a este professor."],
      alunosDetalhesPrazos: [],
      ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
      anoLetivo: anoAtual,
    };
  }

  // 3. Busca os alunos vinculados às turmas e escolas do professor
  let allAlunosData = [];
  const turmasBatchSize = FIRESTORE_QUERY_BATCH_SIZE;
  for (let i = 0; i < turmasDoProfessor.length; i += turmasBatchSize) {
    const batchTurmas = turmasDoProfessor.slice(i, i + turmasBatchSize);
    const qAlunos = db
      .collection("alunos")
      .where("turma", "in", batchTurmas)
      .where("escolaId", "in", escolasDoProfessor);

    const snap = await qAlunos.get();
    snap.forEach((doc) => allAlunosData.push({ id: doc.id, ...doc.data() }));
  }

  if (allAlunosData.length === 0) {
    functions.logger.log(
      `[calcularStatusProfessor] Nenhum aluno encontrado para turmas/escolas do professor ${professorId}.`
    );
    return {
      professorId: professorId,
      professorNome: professorData.nome,
      escolaId: professorData.escolaId || null,
      statusGeral: "Em dia",
      alunosAtrasadosCount: 0,
      detalhesAtraso: ["Nenhum aluno encontrado para este professor."],
      alunosDetalhesPrazos: [],
      ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
      anoLetivo: anoAtual, // Adicionado aqui também
    };
  }
  // 4. Busca os PEIs de TODOS os alunos encontrados (de ambas as coleções)
  let allPeisDataRaw = [];
  const alunoIdsArray = allAlunosData.map((a) => a.id);
  const alunoIdsBatchSize = FIRESTORE_QUERY_BATCH_SIZE; // Firestore 'in' query limit

  for (let i = 0; i < alunoIdsArray.length; i += alunoIdsBatchSize) {
    const batchAlunoIds = alunoIdsArray.slice(i, i + alunoIdsBatchSize);

    // Busca na coleção antiga 'peis'
    const qOld = db
      .collection("peis")
      .where("alunoId", "in", batchAlunoIds)
      .where("anoLetivo", "==", anoAtual);
    const snapOld = await qOld.get();
    snapOld.forEach((doc) =>
      allPeisDataRaw.push({ id: doc.id, ...doc.data() })
    );

    // Busca na nova coleção 'pei_contribucoes'
    const qNew = db
      .collection("pei_contribucoes")
      .where("alunoId", "in", batchAlunoIds)
      .where("anoLetivo", "==", anoAtual);
    const snapNew = await qNew.get();
    snapNew.forEach((doc) =>
      allPeisDataRaw.push({ id: doc.id, ...doc.data() })
    );
  }

  // Consolida e remove duplicatas, escolhendo o PEI mais recente por aluno
  const peisPorAluno = new Map();
  allPeisDataRaw.forEach((pei) => {
    const existingPei = peisPorAluno.get(pei.alunoId);
    const peiDate = pei.dataCriacao?.toDate
      ? pei.dataCriacao.toDate()
      : new Date(0);

    if (
      !existingPei ||
      peiDate >
        (existingPei.dataCriacao?.toDate
          ? existingPei.dataCriacao.toDate()
          : new Date(0))
    ) {
      peisPorAluno.set(pei.alunoId, pei);
    }
  });

  const allPeisData = Array.from(peisPorAluno.values());

  let statusProfessorGeral = "Em dia";
  let alunosAtrasadosCount = 0;
  let detalhesAtrasoPorAluno = [];
  let alunosDetalhesPrazos = [];

  for (const aluno of allAlunosData) {
    if (!aluno || !aluno.nome || !aluno.nome.trim()) continue;
    const peiDoAluno = allPeisData.find((p) => p.alunoId === aluno.id);
    const statusDetalhadoAluno = getPeiStatusDetails(
      peiDoAluno,
      prazosConvertidos,
      hoje
    );

    if (statusDetalhadoAluno.isAtrasadoRealmente) {
      statusProfessorGeral = "Atrasado";
      alunosAtrasadosCount++;
      detalhesAtrasoPorAluno.push({
        alunoId: aluno.id,
        nome: aluno.nome,
        turma: aluno.turma,
        escolaId: aluno.escolaId,
        statusPeiGeral: statusDetalhadoAluno.statusPeiGeral,
        statusRevisao1: statusDetalhadoAluno.statusRevisao1,
        statusRevisao2: statusDetalhadoAluno.statusRevisao2,
        dataUltimaAtualizacaoPei: statusDetalhadoAluno.dataUltimaAtualizacaoPei,
      });
    }

    alunosDetalhesPrazos.push({
      id: aluno.id,
      nome: aluno.nome,
      turma: aluno.turma,
      escolaId: aluno.escolaId,
      ...statusDetalhadoAluno,
    });
  }

  // CORREÇÃO DE BUG #2: O "anoLetivo" foi adicionado aqui, que é o lugar certo!
  return {
    professorId: professorId,
    professorNome: professorData.nome,
    escolaId: professorData.escolaId || null,
    statusGeral: statusProfessorGeral,
    alunosAtrasadosCount: alunosAtrasadosCount,
    detalhesAtraso: detalhesAtrasoPorAluno,
    alunosDetalhesPrazos: alunosDetalhesPrazos,
    ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    anoLetivo: anoAtual, // ESTE É O LUGAR CORRETO
  };
}
// =========================================================================
// ========= FIM DA FUNÇÃO CORRIGIDA =======================================
// =========================================================================

// =========================================================================
// GATILHO PARA NORMALIZAÇÃO: As novas funções que corrigem o problema na origem
// =========================================================================

/**
 * Gatilho que normaliza o nome da turma quando um aluno é criado ou atualizado.
 */
exports.onAlunoWriteNormalizeTurma = onDocumentWritten(
  "alunos/{alunoId}",
  async (event) => {
    const afterData = event.data.after?.data();
    const beforeData = event.data.before?.data();
    const alunoId = event.params.alunoId;

    const turmaBefore = beforeData ? beforeData.turma : null;
    const turmaAfter = afterData ? afterData.turma : null;

    if (turmaAfter && turmaAfter !== turmaBefore) {
      const turmaNormalizada = normalizarTurma(turmaAfter);
      if (turmaNormalizada && turmaNormalizada !== turmaAfter) {
        console.log(
          `Normalizando turma do aluno ${alunoId}: '${turmaAfter}' -> '${turmaNormalizada}'`
        );
        return event.data.after.ref.update({ turma: turmaNormalizada });
      }
    }
    return null;
  }
);

/**
 * Gatilho que normaliza as chaves das turmas quando um professor é criado ou atualizado.
 */
exports.onProfessorWriteNormalizeTurmas = onDocumentWritten(
  "usuarios/{userId}",
  async (event) => {
    const afterData = event.data.after?.data();
    const beforeData = event.data.before?.data();

    if (!afterData || afterData.perfil !== "professor") {
      return null; // Apenas processa professores
    }

    const turmasBefore =
      beforeData && beforeData.turmas ? beforeData.turmas : {};
    const turmasAfter = afterData && afterData.turmas ? afterData.turmas : {};

    const turmasKeysAfter = new Set(Object.keys(turmasAfter));

    let turmasAtualizadas = {};
    let mudancaDetectada = false;

    for (const turma of turmasKeysAfter) {
      const turmaNormalizada = normalizarTurma(turma);
      if (turmaNormalizada && turmaNormalizada !== turma) {
        turmasAtualizadas[turmaNormalizada] = turmasAfter[turma];
        mudancaDetectada = true;
      } else {
        turmasAtualizadas[turma] = turmasAfter[turma];
      }
    }

    if (
      Object.keys(turmasAtualizadas).length !== Object.keys(turmasAfter).length
    ) {
      mudancaDetectada = true;
    }

    if (mudancaDetectada) {
      console.log(
        `Normalizando turmas do professor:`,
        turmasAfter,
        "->",
        turmasAtualizadas
      );
      return event.data.after.ref.update({ turmas: turmasAtualizadas });
    }

    return null;
  }
);

// =========================================================================
// GATILHO PARA CUSTOM CLAIMS: Adiciona perfil ao token de autenticação do usuário
// =========================================================================
exports.setCustomUserClaimsOnProfileUpdate = onDocumentWritten(
  "usuarios/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const beforeData = event.data.before?.data();
    const afterData = event.data.after?.data();

    let currentClaims = {};
    try {
      const userRecord = await admin.auth().getUser(userId);
      currentClaims = userRecord.customClaims || {};
    } catch (error) {
      functions.logger.error(
        `[setCustomClaims] Erro ao buscar usuário ${userId} para claims:`,
        error
      );
      return null;
    }

    let newClaims = { ...currentClaims };
    let shouldUpdateClaims = false;

    if (!afterData || !afterData.perfil) {
      if (newClaims.perfil !== undefined) {
        delete newClaims.perfil;
        shouldUpdateClaims = true;
      }
    } else {
      if (newClaims.perfil !== afterData.perfil) {
        newClaims.perfil = afterData.perfil;
        shouldUpdateClaims = true;
      }
    }

    if (shouldUpdateClaims) {
      try {
        await admin.auth().setCustomUserClaims(userId, newClaims);
        functions.logger.log(
          `[setCustomClaims] Custom claims atualizadas para o usuário ${userId}: ${JSON.stringify(newClaims)}`
        );
      } catch (error) {
        functions.logger.error(
          `[setCustomClaims] Erro ao definir custom claims para ${userId}:`,
          error
        );
      }
    } else {
      functions.logger.log(
        `[setCustomClaims] Nenhuma mudança relevante de perfil para ${userId}. Claims não atualizadas.`
      );
    }

    return null;
  }
);

// =========================================================================
// GATILHOS DO FIRESTORE PARA ATUALIZAÇÃO DOS RESUMOS DE ACOMPANHAMENTO
// =========================================================================

/**
 * Gatilho que atualiza o resumo de acompanhamento de PEI de um professor
 * sempre que um PEI é criado, atualizado ou excluído.
 * Vincula o PEI ao(s) professor(es) da turma do aluno.
 */
exports.onPeiWrite = onDocumentWritten("peis/{peiId}", async (event) => {
  const peiData = event.data.after?.data() || event.data.before?.data();
  if (!peiData || !peiData.alunoId) {
    functions.logger.log(
      `[onPeiWrite] Dados insuficientes (alunoId) para processar PEI ${event.params.peiId}.`
    );
    return null;
  }

  const alunoDoc = await db.collection("alunos").doc(peiData.alunoId).get();
  if (!alunoDoc.exists) {
    functions.logger.warn(
      `[onPeiWrite] Aluno ${peiData.alunoId} não encontrado para PEI ${event.params.peiId}.`
    );
    return null;
  }
  const alunoData = alunoDoc.data();
  if (!alunoData?.turma) {
    functions.logger.warn(
      `[onPeiWrite] Aluno ${peiData.alunoId} sem turma. Não é possível determinar o professor.`
    );
    return null;
  }

  // Busca todos os professores vinculados à turma do aluno
  const professoresSnap = await db
    .collection("usuarios")
    .where("perfil", "==", "professor")
    .where(`turmas.${alunoData.turma}`, "==", true)
    .get();

  if (professoresSnap.empty) {
    functions.logger.log(
      `[onPeiWrite] Nenhum professor encontrado para aluno ${alunoData.nome} na turma ${alunoData.turma}.`
    );
    return null;
  }

  const batch = db.batch();
  for (const doc /* of */ of professoresSnap.docs) {
    const professorId = doc.id;
    const resumo = await calcularStatusProfessor(professorId); // Recalcula o status do professor
    if (resumo) {
      batch.set(
        db.collection("acompanhamentoPrazosPEIResumo").doc(professorId),
        resumo,
        { merge: true }
      );
    } else {
      // Se calcularStatusProfessor retornar null (ex: professor não é mais válido), deleta o resumo
      batch.delete(
        db.collection("acompanhamentoPrazosPEIResumo").doc(professorId)
      );
    }
  }
  await batch.commit();
  functions.logger.log(
    `[onPeiWrite] Resumo do PEI atualizado para ${professoresSnap.docs.length} professores após alteração do PEI ${event.params.peiId}.`
  );
  return null;
});

/**
 * Gatilho que atualiza o resumo de acompanhamento de PEI de um professor
 * quando o documento do usuário (professor) é criado, atualizado ou excluído.
 * Garante que o resumo é recalculado se o perfil ou turmas mudam.
 */
exports.onProfessorUpdate = onDocumentWritten(
  "usuarios/{userId}",
  async (event) => {
    const beforeData = event.data.before?.data();
    const afterData = event.data.after?.data();
    const professorId = event.params.userId;

    const isNowProfessor = afterData?.perfil === "professor";
    const wasProfessor = beforeData?.perfil === "professor";

    // Só prossegue se o usuário é professor agora, ou era professor antes (e mudou de status)
    if (!isNowProfessor && !wasProfessor) {
      functions.logger.log(
        `[onProfessorUpdate] Usuário ${professorId} não é nem era professor. Ignorando.`
      );
      return null;
    }

    // Se o usuário era professor e não é mais, deleta o resumo
    if (wasProfessor && !isNowProfessor) {
      functions.logger.log(
        `[onProfessorUpdate] Usuário ${professorId} não é mais professor. Deletando resumo.`
      );
      await db
        .collection("acompanhamentoPrazosPEIResumo")
        .doc(professorId)
        .delete();
      return null;
    }

    // Se é professor agora (ou continua sendo professor), recalcula o resumo
    if (isNowProfessor) {
      const resumo = await calcularStatusProfessor(professorId);
      if (resumo) {
        await db
          .collection("acompanhamentoPrazosPEIResumo")
          .doc(professorId)
          .set(resumo, { merge: true });
        functions.logger.log(
          `[onProfessorUpdate] Resumo do PEI atualizado para professor ${professorId}.`
        );
      } else {
        // Se calcularStatusProfessor retornar null (ex: professor não é mais válido para acompanhamento), deleta
        await db
          .collection("acompanhamentoPrazosPEIResumo")
          .doc(professorId)
          .delete();
        functions.logger.log(
          `[onProfessorUpdate] Resumo do PEI deletado para usuário ${professorId} (não é mais um professor válido para acompanhamento).`
        );
      }
      return null;
    }

    return null;
  }
);

/**
 * Gatilho que atualiza o resumo de acompanhamento de PEI de professores afetados
 * quando o documento de um aluno é criado, atualizado ou excluído.
 * Importante para recalcular se a turma ou escola do aluno muda.
 */
exports.onAlunoWrite = onDocumentWritten("alunos/{alunoId}", async (event) => {
  const alunoDataBefore = event.data.before?.data();
  const alunoDataAfter = event.data.after?.data();
  const alunoId = event.params.alunoId;

  // Se não há dados antes nem depois, ou se não há mudança relevante de turma
  if (!alunoDataAfter && !alunoDataBefore) return null;

  const affectedTurmas = new Set();
  if (alunoDataAfter?.turma) affectedTurmas.add(alunoDataAfter.turma);
  if (
    alunoDataBefore?.turma &&
    alunoDataBefore.turma !== alunoDataAfter?.turma
  ) {
    affectedTurmas.add(alunoDataBefore.turma);
  }

  if (affectedTurmas.size === 0) {
    functions.logger.log(
      `[onAlunoWrite] Aluno ${alunoId}: Nenhuma mudança de turma relevante. Ignorando.`
    );
    return null;
  }

  const batch = db.batch();
  const processedProfessors = new Set(); // Para evitar processar o mesmo professor múltiplas vezes
  const professorBatchLimit = FIRESTORE_QUERY_BATCH_SIZE; // Reutiliza a constante para batch de professores

  for (const turmaId of affectedTurmas) {
    // Busca professores vinculados à turma que mudou
    const professoresSnap = await db
      .collection("usuarios")
      .where("perfil", "==", "professor")
      .where(`turmas.${turmaId}`, "==", true)
      .get();

    for (const doc /* of */ of professoresSnap.docs) {
      const professorId = doc.id;
      if (!processedProfessors.has(professorId)) {
        const resumo = await calcularStatusProfessor(professorId);
        if (resumo) {
          batch.set(
            db.collection("acompanhamentoPrazosPEIResumo").doc(professorId),
            resumo,
            { merge: true }
          );
        } else {
          batch.delete(
            db.collection("acompanhamentoPrazosPEIResumo").doc(professorId)
          );
        }
        processedProfessors.add(professorId);
      }
    }
  }

  if (processedProfessors.size > 0) {
    await batch.commit();
    functions.logger.log(
      `[onAlunoWrite] Resumo do PEI atualizado para ${processedProfessors.size} professores afetados pelo aluno ${alunoId}.`
    );
  } else {
    functions.logger.log(
      `[onAlunoWrite] Nenhuma atualização de resumo para professores afetados pelo aluno ${alunoId}.`
    );
  }
  return null;
});

/**
 * Gatilho que recalcula todos os resumos de acompanhamento de PEI
 * quando a configuração de prazos anuais é modificada.
 */
exports.onPrazosAnuaisWrite = onDocumentWritten(
  "prazosPEIAnuais/{docId}",
  async (event) => {
    // Evita trigger em escritas sem alteração de dados
    if (!event.data.after.exists && !event.data.before.exists) return null;
    if (
      event.data.before.exists &&
      event.data.after.exists &&
      JSON.stringify(event.data.before.data()) ===
        JSON.stringify(event.data.after.data())
    ) {
      functions.logger.log(
        `[onPrazosAnuaisWrite] Prazos anuais: Nenhuma mudança de dados. Ignorando.`
      );
      return null;
    }

    functions.logger.log(
      `[onPrazosAnuaisWrite] Prazos anuais ${event.params.docId} alterados. Iniciando recalculo de todos os resumos.`
    );

    // Busca todos os professores com perfil "professor"
    const professoresSnap = await db
      .collection("usuarios")
      .where("perfil", "==", "professor")
      .get();

    if (professoresSnap.empty) {
      functions.logger.log(
        "[onPrazosAnuaisWrite] Nenhum professor encontrado para recalcular prazos anuais."
      );
      return null;
    }

    let batch = db.batch();
    let professoresProcessados = 0;
    const FIREBASE_BATCH_COMMIT_LIMIT = 400; // Limite de operações por batch

    for (const doc /* of */ of professoresSnap.docs) {
      const professorId = doc.id;
      const resumo = await calcularStatusProfessor(professorId); // Recalcula o status do professor
      if (resumo) {
        batch.set(
          db.collection("acompanhamentoPrazosPEIResumo").doc(professorId),
          resumo,
          { merge: true }
        );
      } else {
        batch.delete(
          db.collection("acompanhamentoPrazosPEIResumo").doc(professorId)
        );
      }
      professoresProcessados++;

      // Comita o batch a cada limite para evitar estourar o limite de operações
      if (
        professoresProcessados % FIREBASE_BATCH_COMMIT_LIMIT === 0 &&
        professoresProcessados > 0
      ) {
        await batch.commit();
        functions.logger.log(
          `Commited batch for ${professoresProcessados} professors.`
        );
        batch = db.batch(); // Inicia um novo batch
      }
    }

    // Comita o batch final, se houver operações pendentes
    if (
      professoresProcessados % FIREBASE_BATCH_COMMIT_LIMIT !== 0 ||
      professoresProcessados === 0
    ) {
      await batch.commit();
    }

    functions.logger.log(
      `[onPrazosAnuaisWrite] Resumo do PEI recalculado para ${professoresSnap.docs.length} professores após atualização de prazos anuais.`
    );
    return null;
  }
);

// =========================================================================
// FUNÇÃO DE BACKFILL HTTP: Para recalcular todos os prazos manualmente
// Geralmente usada para corrigir dados antigos ou inicializar o sistema.
// =========================================================================

exports.recalcularTodosPrazos = onRequest(
  { region: "southamerica-east1" }, // Defina a região da sua função
  async (req, res) => {
    // --- Tratamento de CORS (MANDATÓRIO PARA onRequest) ---
    // --- Tratamento de CORS (MANDATÓRIO PARA onRequest) ---
    // Permite tanto seu site em produção quanto o ambiente local
    const allowedOrigins = [
      "http://localhost:5199",
      "https://seusite-de-producao.firebaseapp.com", // <-- SUBSTITUA PELO ENDEREÇO DO SEU SITE PUBLICADO
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
    }

    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Responde a requisição "preflight" do navegador.
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    // --- Fim do Tratamento de CORS ---

    functions.logger.log(
      "[recalcularTodosPrazos] *** INÍCIO DA EXECUÇÃO DA FUNÇÃO HTTP ***"
    );

    let userIdFromFrontend = null;

    // Tenta obter userId do corpo da requisição (assumindo payload como { data: { userId: "..." } } para onCall-like behavior)
    if (
      req.body &&
      typeof req.body === "object" &&
      req.body.data &&
      req.body.data.userId
    ) {
      userIdFromFrontend = req.body.data.userId;
    } else if (req.query.userId) {
      // Adicionado suporte a userId via query param para testes simples
      userIdFromFrontend = req.query.userId;
    }

    // Autenticação e Autorização (Recomendado para funções HTTPS sensíveis)
    let customClaims = {};
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      try {
        const idToken = req.headers.authorization.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        customClaims = decodedToken;
        functions.logger.log(
          "[recalcularTodosPrazos] Token decodificado:",
          customClaims
        );

        // Verificação de UID: Opcional, mas boa prática para confirmar que o token é do usuário que chamou.
        if (userIdFromFrontend && decodedToken.uid !== userIdFromFrontend) {
          functions.logger.warn(
            `[recalcularTodosPrazos] UID do token (${decodedToken.uid}) não corresponde ao UID do payload (${userIdFromFrontend}).`
          );
          res.status(403).json({
            error: "Permissão negada: UID do token não corresponde ao payload.",
          });
          return;
        } else if (!userIdFromFrontend) {
          // Se userIdFromFrontend não foi passado, use o do token
          userIdFromFrontend = decodedToken.uid;
        }

        // Exemplo de verificação de claim 'admin'
        if (
          customClaims.perfil !== "desenvolvedor" &&
          customClaims.perfil !== "gestao"
        ) {
          res.status(403).json({
            error:
              "Permissão negada: Requer perfil 'desenvolvedor' ou 'gestao'.",
          });
          return;
        }
      } catch (error) {
        functions.logger.error(
          "[recalcularTodosPrazos] Erro na verificação do token de autenticação:",
          error
        );
        res
          .status(401)
          .json({ error: "Não autorizado: Token inválido ou ausente." });
        return;
      }
    } else {
      // Se não há token, e você quer que a função possa ser chamada sem autenticação para backfill,
      // remova a seção de verificação do token. MAS ISSO NÃO É SEGURO para funções de escrita!
      functions.logger.warn(
        "[recalcularTodosPrazos] Nenhuma autenticação Bearer Token fornecida."
      );
      // Se a função deve ser chamada APENAS por admin, não permita sem token.
      res.status(401).json({
        error: "Não autorizado: Token de autenticação Bearer é necessário.",
      });
      return;
    }

    // --- Início do Recálculo ---
    functions.logger.log("Iniciando backfill/recalculo de prazos PEI...");

    try {
      const professoresSnap = await db
        .collection("usuarios")
        .where("perfil", "==", "professor")
        .get();

      if (professoresSnap.empty) {
        functions.logger.log(
          "Nenhum professor encontrado para recalcular prazos PEI."
        );
        res.status(200).json({
          status: "success",
          message: "Nenhum professor para recalcular.",
        });
        return;
      }

      let batch = db.batch();
      let professoresProcessed = 0;
      const FIREBASE_BATCH_COMMIT_LIMIT = 400; // Limite de operações por batch

      for (const doc /* of */ of professoresSnap.docs) {
        const professorId = doc.id;
        const resumo = await calcularStatusProfessor(professorId); // Recalcula o status
        if (resumo) {
          batch.set(
            db.collection("acompanhamentoPrazosPEIResumo").doc(professorId),
            resumo,
            { merge: true }
          );
        } else {
          batch.delete(
            db.collection("acompanhamentoPrazosPEIResumo").doc(professorId)
          );
        }
        professoresProcessed++;

        if (
          professoresProcessed % FIREBASE_BATCH_COMMIT_LIMIT === 0 &&
          professoresProcessed > 0
        ) {
          await batch.commit();
          functions.logger.log(
            `Commited batch for ${professoresProcessed} professors.`
          );
          batch = db.batch(); // Inicia novo batch
        }
      }

      if (
        professoresProcessed % FIREBASE_BATCH_COMMIT_LIMIT !== 0 ||
        professoresProcessed === 0
      ) {
        await batch.commit();
      }

      functions.logger.log(
        `Backfill concluído para ${professoresProcessed} professores.`
      );
      res.status(200).json({
        status: "success",
        message: `Backfill concluído para ${professoresProcessed} professores.`,
      });
      return;
    } catch (error) {
      functions.logger.error(
        "Erro durante o backfill/recalculo de prazos PEI:",
        error
      );
      res.status(500).json({
        error: "Ocorreu um erro interno no servidor durante o backfill.",
        details: error.message,
      });
      return;
    }
  }
);
exports.getpeiacompanhamentobyschool = onRequest(
  { region: "southamerica-east1", cors: true }, // Habilita CORS diretamente
  async (req, res) => {
    // Tratamento de CORS para compatibilidade extra
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Max-Age", "3600");
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST" || !req.body.anoLetivo) {
      return res.status(400).json({
        error: "Requisição inválida. Use POST e forneça o 'anoLetivo'.",
      });
    }

    try {
      const anoLetivo = req.body.anoLetivo;
      const resumosSnap = await db
        .collection("acompanhamentoPrazosPEIResumo")
        .where("anoLetivo", "==", anoLetivo)
        .get();

      if (resumosSnap.empty) {
        return res.status(200).json([]);
      }

      const escolasMap = new Map();
      const escolasSnap = await db.collection("escolas").get();
      escolasSnap.forEach((doc) => escolasMap.set(doc.id, doc.data().nome));

      const escolasResumo = {};

      resumosSnap.docs.forEach((doc) => {
        const resumo = doc.data();
        if (!resumo.alunosDetalhesPrazos) return;

        resumo.alunosDetalhesPrazos.forEach((aluno) => {
          const escolaId = aluno.escolaId;
          if (!escolaId) return;

          if (!escolasResumo[escolaId]) {
            escolasResumo[escolaId] = {
              id: escolaId,
              nomeEscola: escolasMap.get(escolaId) || "Escola Desconhecida",
              totalAlunosMonitorados: 0,
              pendenteCriacao: 0,
              atrasados: 0,
              emDia: 0, // Novo status!
            };
          }

          const stats = escolasResumo[escolaId];
          stats.totalAlunosMonitorados++;

          // Lógica de status simplificada
          if (aluno.statusPeiGeral?.includes("Aguardando Criação")) {
            stats.pendenteCriacao++;
          } else if (aluno.isAtrasadoRealmente) {
            stats.atrasados++;
          } else {
            // Se não está pendente e nem atrasado, está em dia.
            stats.emDia++;
          }
        });
      });

      const dadosAgregados = Object.values(escolasResumo).map((escola) => {
        const total = escola.totalAlunosMonitorados;
        escola.percentualEmDiaNum =
          total > 0 ? (escola.emDia / total) * 100 : 0;
        return escola;
      });

      return res.status(200).json(dadosAgregados);
    } catch (err) {
      functions.logger.error("Erro em getpeiacompanhamentobyschool:", err);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// =========================================================================
// NOVO GATILHO PARA A COLEÇÃO 'pei_contribucoes'
// =========================================================================
exports.onPeiContribuicaoWrite = onDocumentWritten(
  "pei_contribucoes/{peiId}",
  async (event) => {
    const peiData = event.data.after?.data() || event.data.before?.data();
    if (!peiData || !peiData.alunoId) {
      functions.logger.log(
        `[onPeiContribuicaoWrite] Dados insuficientes para processar PEI ${event.params.peiId}.`
      );
      return null;
    }

    const alunoDoc = await db.collection("alunos").doc(peiData.alunoId).get();
    if (!alunoDoc.exists) {
      functions.logger.warn(
        `[onPeiContribuicaoWrite] Aluno ${peiData.alunoId} não encontrado para PEI ${event.params.peiId}.`
      );
      return null;
    }
    const alunoData = alunoDoc.data();
    if (!alunoData?.turma) {
      functions.logger.warn(
        `[onPeiContribuicaoWrite] Aluno ${peiData.alunoId} sem turma.`
      );
      return null;
    }

    const professoresSnap = await db
      .collection("usuarios")
      .where("perfil", "==", "professor")
      .where(`turmas.${alunoData.turma}`, "==", true)
      .get();

    if (professoresSnap.empty) {
      functions.logger.log(
        `[onPeiContribuicaoWrite] Nenhum professor para aluno ${alunoData.nome} na turma ${alunoData.turma}.`
      );
      return null;
    }

    const batch = db.batch();
    for (const doc of professoresSnap.docs) {
      const professorId = doc.id;
      const resumo = await calcularStatusProfessor(professorId);
      if (resumo) {
        batch.set(
          db.collection("acompanhamentoPrazosPEIResumo").doc(professorId),
          resumo,
          { merge: true }
        );
      } else {
        batch.delete(
          db.collection("acompanhamentoPrazosPEIResumo").doc(professorId)
        );
      }
    }
    await batch.commit();
    functions.logger.log(
      `[onPeiContribuicaoWrite] Resumo atualizado para ${professoresSnap.docs.length} professores.`
    );
    return null;
  }
);
// =========================================================================
// FUNÇÃO CHAMÁVEL PARA MARCAR UMA REVISÃO COMO CONCLUÍDA
// =========================================================================
exports.marcarRevisaoComoConcluida = onCall(
  { region: "southamerica-east1" },
  async (request) => {
    // Verifica se o usuário está autenticado
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "A função deve ser chamada por um usuário autenticado."
      );
    }

    const { peiId, semestre } = request.data;
    const professorId = request.auth.uid;

    // Validação dos dados de entrada
    if (
      !peiId ||
      !semestre ||
      (semestre !== "primeiroSemestre" && semestre !== "segundoSemestre")
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Os dados fornecidos (peiId, semestre) são inválidos."
      );
    }

    try {
      const peiRef = db.collection("pei_contribucoes").doc(peiId);

      // Cria o objeto de atualização dinamicamente
      const updateData = {};
      updateData[`revisoes.${semestre}.status`] = "Concluído";
      updateData[`revisoes.${semestre}.dataRevisao`] =
        admin.firestore.FieldValue.serverTimestamp();
      updateData[`revisoes.${semestre}.revisadoPor`] = professorId;

      await peiRef.update(updateData);

      return {
        success: true,
        message: `Revisão do ${semestre} marcada como concluída para o PEI ${peiId}.`,
      };
    } catch (error) {
      functions.logger.error(
        `Erro ao marcar revisão para PEI ${peiId}:`,
        error
      );
      throw new functions.https.HttpsError(
        "internal",
        "Ocorreu um erro ao atualizar o PEI."
      );
    }
  }
);
