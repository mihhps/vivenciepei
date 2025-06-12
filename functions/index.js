// functions/index.js

// Importa as dependências necessárias
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Importa as funções v2 do Firestore para gatilhos de documentos e HTTPS
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");

// Inicializa o Admin SDK do Firebase
admin.initializeApp();
const db = admin.firestore(); // Referência ao Firestore

// --- FUNÇÃO AUXILIAR: Determina o status do PEI e revisões de um aluno ---
// Esta função é usada para calcular os detalhes de status de cada aluno,
// que serão armazenados no resumo do professor.
const getPeiStatusDetails = (peiData, prazos, hoje) => {
  let statusPeiGeral = "Não iniciado";
  let statusRevisao1 = "N/A";
  let statusRevisao2 = "N/A";
  let dataUltimaAtualizacaoPei = null;

  const { dataLimiteCriacaoPEI, dataLimiteRevisao1Sem, dataLimiteRevisao2Sem } =
    prazos;

  if (!peiData) {
    // PEI não encontrado
    if (dataLimiteCriacaoPEI && hoje >= dataLimiteCriacaoPEI) {
      statusPeiGeral = "Atrasado - Sem PEI";
    } else {
      statusPeiGeral = "Aguardando Criação";
    }
    if (dataLimiteRevisao1Sem && hoje >= dataLimiteRevisao1Sem)
      statusRevisao1 = "Atrasado";
    if (dataLimiteRevisao2Sem && hoje >= dataLimiteRevisao2Sem)
      statusRevisao2 = "Atrasado";
  } else {
    // PEI encontrado
    const dataCriacaoPei = peiData.criadoEm?.toDate() || null;
    dataUltimaAtualizacaoPei =
      peiData.dataUltimaRevisao?.toDate() || dataCriacaoPei;

    // Status Geral do PEI
    if (dataLimiteCriacaoPEI) {
      if (hoje >= dataLimiteCriacaoPEI) {
        if (dataCriacaoPei && dataCriacaoPei <= dataLimiteCriacaoPEI) {
          statusPeiGeral = "Criado no Prazo";
        } else if (dataCriacaoPei && dataCriacaoPei > dataLimiteCriacaoPEI) {
          statusPeiGeral = "Criado (Atrasado)";
        } else {
          statusPeiGeral = "Atrasado - Sem PEI";
        }
      } else {
        statusPeiGeral = "Aguardando Criação";
        if (dataCriacaoPei) statusPeiGeral = "Criado (antes do prazo final)";
      }
    } else {
      // Se não há data limite de criação configurada
      statusPeiGeral = dataCriacaoPei
        ? "Criado (Prazo não definido)"
        : "Não iniciado (Prazo não definido)";
    }

    // Status 1ª Revisão
    if (dataLimiteRevisao1Sem) {
      if (hoje >= dataLimiteRevisao1Sem) {
        if (
          dataUltimaAtualizacaoPei &&
          dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem
        ) {
          statusRevisao1 = "Em dia (Feita)";
        } else {
          statusRevisao1 = "Atrasado";
        }
      } else {
        statusRevisao1 = "Aguardando";
        if (
          dataUltimaAtualizacaoPei &&
          dataUltimaAtualizacaoPei >= dataLimiteCriacaoPEI
        ) {
          statusRevisao1 = "Feita (Aguardando prazo)";
        }
      }
    }

    // Status 2ª Revisão
    if (dataLimiteRevisao2Sem) {
      if (hoje >= dataLimiteRevisao2Sem) {
        if (
          dataUltimaAtualizacaoPei &&
          dataUltimaAtualizacaoPei >= dataLimiteRevisao2Sem
        ) {
          statusRevisao2 = "Em dia (Feita)";
        } else {
          statusRevisao2 = "Atrasado";
        }
      } else {
        statusRevisao2 = "Aguardando";
        if (
          dataUltimaAtualizacaoPei &&
          dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem
        ) {
          statusRevisao2 = "Feita (Aguardando prazo)";
        }
      }
    }
  }

  return {
    statusPeiGeral,
    statusRevisao1,
    statusRevisao2,
    dataUltimaAtualizacaoPei,
  };
};

// =========================================================================
// FUNÇÃO AUXILIAR: LÓGICA DE CÁLCULO DE STATUS DO PROFESSOR (AGREGADO)
// Esta função agora calcula o status GERAL do professor, considerando TODAS as suas escolas/turmas.
// Também retorna os detalhes de status de PEI por aluno.
// =========================================================================
async function calcularStatusProfessor(professorId) {
  const anoAtual = new Date().getFullYear();
  const hoje = new Date();

  // 1. Busca os prazos anuais do PEI (necessário para todos os cálculos)
  const prazosSnap = await db
    .collection("prazosPEIAnuais")
    .where("anoLetivo", "==", anoAtual)
    .limit(1)
    .get();
  const prazoAnualDoc = prazosSnap.empty ? null : prazosSnap.docs[0].data();

  // Objeto de prazos convertido para facilitar o uso em getPeiStatusDetails
  const prazosConvertidos = {
    dataLimiteCriacaoPEI: prazoAnualDoc?.dataLimiteCriacaoPEI?.toDate() || null,
    dataLimiteRevisao1Sem:
      prazoAnualDoc?.dataLimiteRevisao1Sem?.toDate() || null,
    dataLimiteRevisao2Sem:
      prazoAnualDoc?.dataLimiteRevisao2Sem?.toDate() || null,
  };

  // Se prazos não configurados ou professor inválido/sem turmas/escolas:
  if (!prazoAnualDoc) {
    functions.logger.warn(
      `[calcularStatusProfessor] Prazos anuais para ${anoAtual} não encontrados. Professor ${professorId} será considerado em dia.`
    );
    const professorData = (
      await db.collection("usuarios").doc(professorId).get()
    ).data();
    return {
      professorId: professorId,
      professorNome: professorData?.nome || "Nome Desconhecido",
      escolaId: null, // Indica que é um resumo geral, sem escola específica
      statusGeral: "Em dia",
      alunosAtrasadosCount: 0,
      detalhesAtraso: [
        "Prazos anuais não configurados ou professor sem turmas/alunos vinculados.",
      ],
      alunosDetalhesPrazos: [], // NOVO CAMPO: Array vazio se não há dados
      ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  // 2. Busca os dados do professor
  const professorDoc = await db.collection("usuarios").doc(professorId).get();
  if (!professorDoc.exists || professorDoc.data().perfil !== "professor") {
    functions.logger.info(
      `[calcularStatusProfessor] Professor ${professorId} não encontrado ou não é perfil de professor. Retornando null.`
    );
    return null; // Retorna null para indicar que este professor não deve ter um resumo
  }
  const professorData = professorDoc.data();
  const turmasDoProfessor = professorData.turmas
    ? Object.keys(professorData.turmas)
    : [];
  const escolasDoProfessor = professorData.escolas
    ? Object.keys(professorData.escolas)
    : []; // Pega todas as escolas

  // Se o professor não tem turmas ou escolas, ele está "Em dia"
  if (turmasDoProfessor.length === 0 || escolasDoProfessor.length === 0) {
    return {
      professorId: professorId,
      professorNome: professorData.nome,
      escolaId: null, // Resumo geral
      statusGeral: "Em dia",
      alunosAtrasadosCount: 0,
      detalhesAtraso: ["Nenhuma turma ou escola vinculada a este professor."],
      alunosDetalhesPrazos: [], // NOVO CAMPO
      ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  // 3. Busca ALUNOS vinculados a TODAS as turmas do professor (com filtro interno de escola)
  let allAlunosData = [];
  const BATCH_SIZE = 10;
  for (let i = 0; i < turmasDoProfessor.length; i += BATCH_SIZE) {
    const batchTurmas = turmasDoProfessor.slice(i, i + BATCH_SIZE);
    let qAlunos = db.collection("alunos").where("turma", "in", batchTurmas);
    const snap = await qAlunos.get();
    snap.forEach((doc) => {
      const aluno = { id: doc.id, ...doc.data() };
      if (escolasDoProfessor.includes(aluno.escolaId)) {
        allAlunosData.push(aluno);
      }
    });
  }

  // Se não há alunos válidos para o professor em suas escolas, ele está "Em dia"
  if (allAlunosData.length === 0) {
    return {
      professorId: professorId,
      professorNome: professorData.nome,
      escolaId: null, // Resumo geral
      statusGeral: "Em dia",
      alunosAtrasadosCount: 0,
      detalhesAtraso: [
        `Nenhum aluno encontrado nas turmas vinculadas ao professor em suas escolas.`,
      ],
      alunosDetalhesPrazos: [], // NOVO CAMPO: Vazio
      ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  // 4. Busca PEIs de todos os alunos encontrados em lotes
  let allPeisData = [];
  const alunoIdsArray = allAlunosData.map((a) => a.id);
  if (alunoIdsArray.length > 0) {
    for (let i = 0; i < alunoIdsArray.length; i += BATCH_SIZE) {
      const batchAlunoIds = alunoIdsArray.slice(i, i + BATCH_SIZE);
      let qPeis = db
        .collection("peis")
        .where("alunoId", "in", batchAlunoIds)
        .where("anoLetivo", "==", anoAtual)
        .orderBy("criadoEm", "desc");
      const snap = await qPeis.get();
      snap.forEach((doc) => {
        const pei = { id: doc.id, ...doc.data() };
        if (escolasDoProfessor.includes(pei.escolaId)) {
          allPeisData.push(pei);
        }
      });
    }
  }

  // 5. Processa o status individual de cada aluno e agrega para o professor
  let statusProfessor = "Em dia";
  let detalhesAtrasoPorAluno = []; // Mensagens de atraso resumidas
  let alunosDetalhesPrazos = []; // NOVO: Detalhes completos por aluno

  for (const aluno of allAlunosData) {
    const peiDoAluno = allPeisData
      .filter((p) => p.alunoId === aluno.id)
      .sort((a, b) => b.criadoEm.toDate() - a.criadoEm.toDate())[0];

    // Usa a função getPeiStatusDetails para obter os status detalhados
    const statusDetalhadoAluno = getPeiStatusDetails(
      peiDoAluno,
      prazosConvertidos, // Passa prazosConvertidos
      hoje
    );

    // Verifica se há atraso geral ou nas revisões para definir o status do professor
    if (
      statusDetalhadoAluno.statusPeiGeral.includes("Atrasado") ||
      statusDetalhadoAluno.statusRevisao1.includes("Atrasado") ||
      statusDetalhadoAluno.statusRevisao2.includes("Atrasado")
    ) {
      statusProfessor = "Atrasado"; // Se pelo menos um aluno está atrasado, o professor está atrasado
      detalhesAtrasoPorAluno.push(
        `Aluno ${aluno.nome} - PEI: ${statusDetalhadoAluno.statusPeiGeral}, R1: ${statusDetalhadoAluno.statusRevisao1}, R2: ${statusDetalhadoAluno.statusRevisao2}`
      );
    }

    // Adiciona os detalhes completos do aluno (com status) para o novo array
    alunosDetalhesPrazos.push({
      id: aluno.id,
      nome: aluno.nome,
      turma: aluno.turma, // Adiciona a turma para contexto
      escolaId: aluno.escolaId, // Adiciona a escola para contexto
      ...statusDetalhadoAluno,
    });
  }

  // Retorna o objeto de resumo para ser salvo no Firestore
  return {
    professorId: professorId,
    professorNome: professorData.nome,
    escolaId: null, // Agora é um resumo geral, não ligado a uma escola específica
    statusGeral: statusProfessor,
    alunosAtrasadosCount: detalhesAtrasoPorAluno.length,
    detalhesAtraso: detalhesAtrasoPorAluno, // Mantém este campo para a tela principal
    alunosDetalhesPrazos: alunosDetalhesPrazos, // NOVO CAMPO: Detalhes por aluno para a tela de detalhes!
    ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// =========================================================================
// GATILHOS (TRIGGERS) DO FIRESTORE: Acionam o recalculo quando dados mudam
// =========================================================================

/**
 * Gatilho: onDocumentWritten em 'peis'.
 * Acionado quando um documento PEI é criado, atualizado ou deletado.
 * Recalcula o status do(s) professor(es) associado(s) ao aluno do PEI.
 */
exports.onPeiWrite = onDocumentWritten("peis/{peiId}", async (event) => {
  const change = event.data;
  const peiData = change.after.exists
    ? change.after.data()
    : change.before.data();
  if (!peiData || !peiData.alunoId) {
    functions.logger.log(
      `[onPeiWrite] Dados insuficientes (alunoId) para processar PEI ${event.params.peiId}.`
    );
    return null;
  }

  const alunoId = peiData.alunoId;
  const alunoDoc = await db.collection("alunos").doc(alunoId).get();
  if (!alunoDoc.exists) {
    functions.logger.warn(
      `[onPeiWrite] Aluno ${alunoId} não encontrado para PEI ${event.params.peiId}. Pode ter sido deletado.`
    );
    return null;
  }
  const alunoData = alunoDoc.data();
  const turmaDoAluno = alunoData.turma;

  if (!turmaDoAluno) {
    functions.logger.warn(
      `[onPeiWrite] Aluno ${alunoId} não tem turma associada. Não é possível determinar o professor.`
    );
    return null;
  }

  const professoresSnap = await db
    .collection("usuarios")
    .where("perfil", "==", "professor")
    .where(`turmas.${turmaDoAluno}`, "==", true)
    .get();

  if (professoresSnap.empty) {
    functions.logger.log(
      `[onPeiWrite] Nenhum professor encontrado para aluno ${alunoId} na turma ${turmaDoAluno}.`
    );
    return null;
  }

  const batch = db.batch();
  for (const doc of professoresSnap.docs) {
    const professorId = doc.id;
    const resumo = await calcularStatusProfessor(professorId);
    if (resumo) {
      const resumoRef = db
        .collection("acompanhamentoPrazosPEIResumo")
        .doc(professorId);
      batch.set(resumoRef, resumo, { merge: true });
    } else {
      const resumoRef = db
        .collection("acompanhamentoPrazosPEIResumo")
        .doc(professorId);
      batch.delete(resumoRef);
    }
  }
  await batch.commit();
  functions.logger.log(
    `[onPeiWrite] Resumo do PEI atualizado para ${professoresSnap.docs.length} professores após alteração do PEI ${event.params.peiId}.`
  );
  return null;
});

/**
 * Gatilho: onDocumentWritten em 'usuarios'.
 * Acionado quando um documento de usuário é criado, atualizado ou deletado.
 * Recalcula o status se for um professor ou se seu perfil mudou.
 */
exports.onProfessorUpdate = onDocumentWritten(
  "usuarios/{userId}",
  async (event) => {
    const change = event.data;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const professorId = event.params.userId;

    const isNowProfessor = afterData?.perfil === "professor";
    const wasProfessor = beforeData?.perfil === "professor";

    if (!isNowProfessor && !wasProfessor) {
      return null;
    }

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

    if (isNowProfessor) {
      const resumo = await calcularStatusProfessor(professorId);
      if (resumo) {
        await db
          .collection("acompanhamentoPrazosPEIResumo")
          .doc(professorId)
          .set(resumo, { merge: true });
        functions.logger.log(
          `[onProfessorUpdate] Resumo do PEI atualizado para professor ${professorId} após alteração de perfil/turmas/escolas.`
        );
      } else {
        await db
          .collection("acompanhamentoPrazosPEIResumo")
          .doc(professorId)
          .delete();
        functions.logger.log(
          `[onProfessorUpdate] Resumo do PEI deletado para usuário ${professorId} (não é mais um professor válido).`
        );
      }
      return null;
    }

    return null;
  }
);

/**
 * Gatilho: onDocumentWritten em 'alunos'.
 * Acionado quando um documento de aluno é criado, atualizado ou deletado.
 * Recalcula o status do(s) professor(es) afetado(s).
 */
exports.onAlunoWrite = onDocumentWritten("alunos/{alunoId}", async (event) => {
  const alunoDataBefore = event.data.before.exists
    ? event.data.before.data()
    : null;
  const alunoDataAfter = event.data.after.exists
    ? event.data.after.data()
    : null;
  const alunoId = event.params.alunoId;

  if (!alunoDataAfter && !alunoDataBefore) return null;

  const affectedTurmas = new Set();
  if (alunoDataAfter?.turma) affectedTurmas.add(alunoDataAfter.turma);
  if (
    alunoDataBefore?.turma &&
    alunoDataBefore.turma !== alunoDataAfter?.turma
  ) {
    affectedTurmas.add(alunoDataBefore.turma);
  }

  if (
    affectedTurmas.size === 0 ||
    (alunoDataBefore &&
      alunoDataAfter &&
      alunoDataBefore.turma === alunoDataAfter.turma &&
      alunoDataBefore.escolaId === alunoDataAfter.escolaId)
  ) {
    functions.logger.log(
      `[onAlunoWrite] Aluno ${alunoId}: Nenhuma mudança relevante de turma/escola.`
    );
    return null;
  }

  const batch = db.batch();
  const processedProfessors = new Set();

  for (const turmaId of affectedTurmas) {
    const professoresSnap = await db
      .collection("usuarios")
      .where("perfil", "==", "professor")
      .where(`turmas.${turmaId}`, "==", true)
      .get();

    for (const doc of professoresSnap.docs) {
      const professorId = doc.id;
      if (!processedProfessors.has(professorId)) {
        const resumo = await calcularStatusProfessor(professorId);
        if (resumo) {
          const resumoRef = db
            .collection("acompanhamentoPrazosPEIResumo")
            .doc(professorId);
          batch.set(resumoRef, resumo, { merge: true });
        } else {
          const resumoRef = db
            .collection("acompanhamentoPrazosPEIResumo")
            .doc(professorId);
          batch.delete(resumoRef);
        }
        processedProfessors.add(professorId);
      }
    }
  }

  if (processedProfessors.size > 0) {
    await batch.commit();
    functions.logger.log(
      `[onAlunoWrite] Resumo do PEI atualizado para ${processedProfessors.size} professores afetados pela alteração do aluno ${alunoId}.`
    );
  } else {
    functions.logger.log(
      `[onAlunoWrite] Nenhuma atualização de resumo para professores afetados pelo aluno ${alunoId}.`
    );
  }
  return null;
});

/**
 * Gatilho: onDocumentWritten em 'prazosPEIAnuais'.
 * Recalcula o status para TODOS os professores.
 */
exports.onPrazosAnuaisWrite = onDocumentWritten(
  "prazosPEIAnuais/{docId}",
  async (event) => {
    const change = event.data;
    if (!change.after.exists && !change.before.exists) return null;
    if (
      change.before.exists &&
      change.after.exists &&
      JSON.stringify(change.before.data()) ===
        JSON.stringify(change.after.data())
    ) {
      functions.logger.log(
        `[onPrazosAnuaisWrite] Prazos anuais: Nenhuma mudança de dados. Ignorando.`
      );
      return null;
    }

    functions.logger.log(
      `[onPrazosAnuaisWrite] Prazos anuais ${event.params.docId} alterados. Iniciando recalculo de todos os resumos.`
    );

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
    const batchSizeLimit = 400;

    for (const doc of professoresSnap.docs) {
      const professorId = doc.id;
      const resumo = await calcularStatusProfessor(professorId);
      if (resumo) {
        const resumoRef = db
          .collection("acompanhamentoPrazosPEIResumo")
          .doc(professorId);
        batch.set(resumoRef, resumo, { merge: true });
        professoresProcessados++;
      } else {
        const resumoRef = db
          .collection("acompanhamentoPrazosPEIResumo")
          .doc(professorId);
        batch.delete(resumoRef);
        professoresProcessados++;
      }

      if (
        professoresProcessados % batchSizeLimit === 0 &&
        professoresProcessados > 0
      ) {
        await batch.commit();
        batch = db.batch();
        functions.logger.log(
          `Commited batch for ${professoresProcessados} professors.`
        );
      }
    }

    if (
      professoresProcessados % batchSizeLimit !== 0 ||
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
// FUNÇÃO DE BACKFILL: RECALCULAR TODOS OS PRAZOS PARA DADOS EXISTENTES
// =========================================================================

/**
 * Cloud Function acionável via HTTPS para recalcular e preencher
 * os resumos de acompanhamento de PEI para todos os professores existentes.
 * Esta função deve ser usada APENAS para backfill inicial ou reprocessamento manual.
 *
 * @param {object} request - Objeto de requisição (contém 'auth' para segurança).
 */
exports.recalcularTodosPrazos = onCall(async (request) => {
  if (!request.auth || !request.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Você não tem permissão para executar esta operação. Requer token de admin."
    );
  }

  functions.logger.log(
    "Iniciando backfill/recalculo de todos os prazos PEI para professores..."
  );

  try {
    const professoresSnap = await db
      .collection("usuarios")
      .where("perfil", "==", "professor")
      .get();

    if (professoresSnap.empty) {
      functions.logger.log(
        "Nenhum professor encontrado para recalcular prazos PEI."
      );
      return {
        status: "success",
        message: "Nenhum professor para recalcular.",
      };
    }

    let batch = db.batch();
    let professoresProcessados = 0;
    const batchSizeLimit = 400;

    for (const doc of professoresSnap.docs) {
      const professorId = doc.id;
      const resumo = await calcularStatusProfessor(professorId);
      if (resumo) {
        const resumoRef = db
          .collection("acompanhamentoPrazosPEIResumo")
          .doc(professorId);
        batch.set(resumoRef, resumo, { merge: true });
        professoresProcessados++;
      } else {
        const resumoRef = db
          .collection("acompanhamentoPrazosPEIResumo")
          .doc(professorId);
        batch.delete(resumoRef);
        professoresProcessados++;
      }

      if (
        professoresProcessados % batchSizeLimit === 0 &&
        professoresProcessados > 0
      ) {
        await batch.commit();
        batch = db.batch();
        functions.logger.log(
          `Commited batch for ${professoresProcessados} professors.`
        );
      }
    }

    if (
      professoresProcessados % batchSizeLimit !== 0 ||
      professoresProcessados === 0
    ) {
      await batch.commit();
    }

    functions.logger.log(
      `Backfill concluído para ${professoresProcessados} professores.`
    );
    return {
      status: "success",
      message: `Backfill concluído para ${professoresProcessados} professores.`,
    };
  } catch (error) {
    functions.logger.error(
      "Erro durante o backfill/recalculo de prazos PEI:",
      error
    );
    throw new functions.https.HttpsError(
      "internal",
      "Ocorreu um erro durante o backfill dos prazos PEI.",
      error.message
    );
  }
});
// functions/index.js

// ... (todo o código acima: imports, admin.initializeApp(), db, getPeiStatusDetails, calcularStatusProfessor, gatilhos, recalcularTodosPrazos) ...

// =========================================================================
// SUA FUNÇÃO HTTP ORIGINAL: getPeiAcompanhamentoBySchool (RESTAURADA E CORRIGIDA)
// =========================================================================

/**
 * Cloud Function para agregar dados de acompanhamento de PEIs por escola.
 * Acionada via HTTP.
 * @param {object} req - Objeto de requisição HTTP (espera { anoLetivo: number } no body ou query).
 * @param {object} res - Objeto de resposta HTTP.
 */
exports.getPeiAcompanhamentoBySchool = functions.https.onRequest(
  async (req, res) => {
    // Configurar CORS para permitir requisições do seu frontend
    res.set("Access-Control-Allow-Origin", "*"); // Ou o domínio específico do seu frontend: 'https://seuapp.web.app'
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Lida com requisições OPTIONS (preflight)
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Obter o ano letivo do corpo da requisição ou dos parâmetros de query
    const anoLetivo =
      req.method === "POST" ? req.body.anoLetivo : req.query.anoLetivo;

    if (!anoLetivo) {
      console.error("Ano letivo não fornecido na requisição.");
      return res.status(400).json({ error: "Ano letivo é obrigatório." });
    }

    try {
      const hoje = admin.firestore.Timestamp.now().toDate();
      hoje.setHours(0, 0, 0, 0);

      // 1. Busca todas as escolas
      const escolasSnapshot = await db.collection("escolas").get();
      const escolas = escolasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const dadosAgregados = [];

      await Promise.all(
        escolas.map(async (escola) => {
          const alunosQuery = db
            .collection("alunos")
            .where("escolaId", "==", escola.id);

          const totalNecessitandoSnapshot = await alunosQuery.count().get();
          const totalNecessitando = totalNecessitandoSnapshot.data().count;

          const peisQuery = db
            .collection("peis") // ATENÇÃO: Confirme que o nome da coleção é 'peis' (minúsculo)
            .where("escolaId", "==", escola.id)
            .where("anoLetivo", "==", Number(anoLetivo));

          const peisSnapshot = await peisQuery.get();

          let peisComStatusEmElaboracao = 0;
          let peisComStatusConcluido = 0;
          let peisAtrasados = 0;

          peisSnapshot.forEach((doc) => {
            const pei = doc.data();
            const statusOriginal = pei.status;
            const statusPEI = statusOriginal
              ? statusOriginal.trim().toLowerCase()
              : "";

            const STATUS_CONCLUIDO = "concluído";
            const STATUS_EM_ELABORACAO = "em elaboração";

            if (statusPEI === STATUS_CONCLUIDO) {
              peisComStatusConcluido++;
            } else if (statusPEI === STATUS_EM_ELABORACAO) {
              peisComStatusEmElaboracao++;
              if (
                pei.dataPrevistaTermino instanceof admin.firestore.Timestamp
              ) {
                try {
                  const dataPrevista = pei.dataPrevistaTermino.toDate();
                  if (dataPrevista < hoje) {
                    peisAtrasados++;
                  }
                } catch (e) {
                  console.warn(
                    `[Cloud Function] Erro ao processar dataPrevistaTermino para PEI ${doc.id} da escola ${escola.nome}:`,
                    e.message
                  );
                }
              } else {
                console.warn(
                  `[Cloud Function] dataPrevistaTermino não é um Timestamp para PEI ${doc.id} da escola ${escola.nome}`
                );
              }
            }
          });

          const peisExistentes =
            peisComStatusEmElaboracao + peisComStatusConcluido;
          const pendenteCriacaoCalculado = Math.max(
            0,
            totalNecessitando - peisExistentes
          );

          const percentualConcluidosNum =
            totalNecessitando > 0
              ? (peisComStatusConcluido / totalNecessitando) * 100
              : 0;

          // --- Calcule 'emElaboracaoNoPrazo' AQUI antes de usar ---
          const emElaboracaoNoPrazo = peisComStatusEmElaboracao - peisAtrasados;

          dadosAgregados.push({
            id: escola.id,
            nomeEscola: escola.nome || "Nome Indisponível",
            totalAlunosMonitorados: totalNecessitando,
            pendenteCriacao: pendenteCriacaoCalculado,
            // Use a variável calculada 'emElaboracaoNoPrazo'
            emElaboracao: emElaboracaoNoPrazo < 0 ? 0 : emElaboracaoNoPrazo,
            atrasados: peisAtrasados,
            concluidos: peisComStatusConcluido,
            percentualConcluidosNum: percentualConcluidosNum,
          });
        })
      );

      functions.logger.log(
        `[getPeiAcompanhamentoBySchool] Retornando dados: ${JSON.stringify(
          dadosAgregados
        )}`
      );
      return res.status(200).json(dadosAgregados);
    } catch (err) {
      console.error("[Cloud Function] Erro ao agregar dados de PEI:", err);
      return res
        .status(500)
        .json({ error: "Erro interno do servidor ao processar os dados." });
    }
  }
);
