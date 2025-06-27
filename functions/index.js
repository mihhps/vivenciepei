// functions/index.js

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

/**
 * Calcula os detalhes do status de PEI para um aluno/PEI específico.
 * @param {object | null} peiData - Dados do documento PEI do aluno (ou null se não houver PEI).
 * @param {object} prazos - Objeto com os prazos limite anuais (dataLimiteCriacaoPEI, dataLimiteRevisao1Sem, dataLimiteRevisao2Sem).
 * @param {Date} hoje - Data atual (com a hora zerada).
 * @returns {object} Um objeto contendo os status detalhados e a flag isAtrasadoRealmente.
 */
const getPeiStatusDetails = (peiData, prazos, hoje) => {
  let statusPeiGeral = "Não iniciado";
  let statusRevisao1 = "N/A";
  let statusRevisao2 = "N/A";

  // Inicializa dataUltimaAtualizacaoPei com null ou um valor padrão
  let dataUltimaAtualizacaoPei = null;

  const hojeZerado = resetTime(new Date(hoje.getTime())); // Garante que 'hoje' também está zerado.

  // Garante que os prazos são objetos Date válidos ou null
  const dataLimiteCriacaoPEI = prazos.dataLimiteCriacaoPEI
    ? resetTime(prazos.dataLimiteCriacaoPEI)
    : null;
  const dataLimiteRevisao1Sem = prazos.dataLimiteRevisao1Sem
    ? resetTime(prazos.dataLimiteRevisao1Sem)
    : null;
  const dataLimiteRevisao2Sem = prazos.dataLimiteRevisao2Sem
    ? resetTime(prazos.dataLimiteRevisao2Sem)
    : null;

  // functions.logger.log(`[getPeiStatusDetails] === DEBUG INICIO ===`);
  // functions.logger.log(
  //   `[getPeiStatusDetails] PEI ID: ${peiData ? peiData.id : "NENHUM PEI ENCONTRADO"}`
  // );
  // functions.logger.log(`[getPeiStatusDetails] HOJE (zerado): ${hojeZerado ? hojeZerado.toISOString() : "N/A"}`);
  // functions.logger.log(`[getPeiStatusDetails] PRAZO CRIAÇÃO (zerado): ${dataLimiteCriacaoPEI ? dataLimiteCriacaoPEI.toISOString() : "N/A"}`);
  // functions.logger.log(`[getPeiStatusDetails] PRAZO REVISÃO 1 (zerado): ${dataLimiteRevisao1Sem ? dataLimiteRevisao1Sem.toISOString() : "N/A"}`);
  // functions.logger.log(`[getPeiStatusDetails] PRAZO REVISÃO 2 (zerado): ${dataLimiteRevisao2Sem ? dataLimiteRevisao2Sem.toISOString() : "N/A"}`);
  // functions.logger.log(`[getPeiStatusDetails] peiData (RAW): ${JSON.stringify(peiData || {})}`);

  // --- LÓGICA DE STATUS: DEFINE AS STRINGS DE STATUS GERAL E REVISÕES ---
  if (!peiData) {
    // Caso 1: PEI não existe
    // functions.logger.log(`[getPeiStatusDetails] -> Caminho: PEI NÃO ENCONTRADO.`);
    if (dataLimiteCriacaoPEI && hojeZerado >= dataLimiteCriacaoPEI) {
      statusPeiGeral = "Atrasado - Sem PEI";
    } else {
      statusPeiGeral = "Aguardando Criação";
    }
    // Revisões também são atrasadas se o PEI não existe e o prazo passou
    if (dataLimiteRevisao1Sem && hojeZerado >= dataLimiteRevisao1Sem) {
      statusRevisao1 = "Atrasado (PEI não criado)";
    }
    if (dataLimiteRevisao2Sem && hojeZerado >= dataLimiteRevisao2Sem) {
      statusRevisao2 = "Atrasado (PEI não criado)";
    }
  } else {
    // Caso 2: PEI existe
    // functions.logger.log(`[getPeiStatusDetails] -> Caminho: PEI ENCONTRADO.`);

    // Converta Timestamps para Date e zere o tempo para comparações
    const dataCriacaoPei = peiData.dataCriacao?.toDate
      ? resetTime(peiData.dataCriacao.toDate())
      : null;
    const peiDataUltimaRevisao = peiData.dataUltimaRevisao?.toDate
      ? resetTime(peiData.dataUltimaRevisao.toDate())
      : null;

    dataUltimaAtualizacaoPei = peiDataUltimaRevisao || dataCriacaoPei; // Garante que há uma data de atualização

    // functions.logger.log(`[getPeiStatusDetails]   PEI Data Criacao (zerada): ${dataCriacaoPei ? dataCriacaoPei.toISOString() : "N/A"}`);
    // functions.logger.log(`[getPeiStatusDetails]   PEI Data Ultima Atualizacao (zerada): ${dataUltimaAtualizacaoPei ? dataUltimaAtualizacaoPei.toISOString() : "N/A"}`);

    // Status Geral do PEI (Criação)
    if (dataLimiteCriacaoPEI) {
      if (hojeZerado >= dataLimiteCriacaoPEI) {
        if (dataCriacaoPei && dataCriacaoPei <= dataLimiteCriacaoPEI) {
          statusPeiGeral = "Criado no Prazo";
        } else if (dataCriacaoPei && dataCriacaoPei > dataLimiteCriacaoPEI) {
          statusPeiGeral = "Criado (Atrasado)";
        } else {
          statusPeiGeral = "Atrasado - Sem PEI (Dados Inconsistentes)"; // PEI existe, mas data de criação não se encaixa
        }
      } else {
        statusPeiGeral = dataCriacaoPei
          ? "Criado (antes do prazo final)"
          : "Aguardando Criação";
      }
    } else {
      statusPeiGeral = dataCriacaoPei
        ? "Criado (Prazo não definido)"
        : "Não iniciado (Prazo não definido)";
    }

    // Status das Revisões (só avalia se o PEI foi criado)
    if (dataCriacaoPei) {
      // Revisão 1
      if (dataLimiteRevisao1Sem) {
        if (hojeZerado >= dataLimiteRevisao1Sem) {
          if (
            dataUltimaAtualizacaoPei &&
            dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem
          ) {
            statusRevisao1 = "Em dia (Feita)";
          } else {
            statusRevisao1 = "Atrasado";
          }
        } else {
          statusRevisao1 =
            dataUltimaAtualizacaoPei &&
            dataUltimaAtualizacaoPei >= dataCriacaoPei
              ? "Feita (Aguardando prazo)"
              : "Aguardando";
        }
      } else {
        statusRevisao1 =
          dataUltimaAtualizacaoPei && dataUltimaAtualizacaoPei >= dataCriacaoPei
            ? "Feita (Prazo não definido)"
            : "Aguardando (Prazo não definido)";
      }

      // Revisão 2
      if (dataLimiteRevisao2Sem) {
        if (hojeZerado >= dataLimiteRevisao2Sem) {
          if (
            dataUltimaAtualizacaoPei &&
            dataUltimaAtualizacaoPei >= dataLimiteRevisao2Sem
          ) {
            statusRevisao2 = "Em dia (Feita)";
          } else {
            statusRevisao2 = "Atrasado";
          }
        } else {
          statusRevisao2 =
            dataUltimaAtualizacaoPei &&
            dataUltimaAtualizacaoPei >= dataCriacaoPei &&
            (!dataLimiteRevisao1Sem ||
              dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem)
              ? "Feita (Aguardando prazo)"
              : "Aguardando";
        }
      } else {
        statusRevisao2 =
          dataUltimaAtualizacaoPei && dataUltimaAtualizacaoPei >= dataCriacaoPei
            ? "Feita (Prazo não definido)"
            : "Aguardando (Prazo não definido)";
      }
    } else {
      // Se o PEI não tem data de criação válida, mas os prazos de revisão passaram
      if (dataLimiteRevisao1Sem && hojeZerado >= dataLimiteRevisao1Sem) {
        statusRevisao1 = "Atrasado (PEI não criado)";
      } else {
        statusRevisao1 = "N/A (PEI não criado)";
      }

      if (dataLimiteRevisao2Sem && hojeZerado >= dataLimiteRevisao2Sem) {
        statusRevisao2 = "Atrasado (PEI não criado)";
      } else {
        statusRevisao2 = "N/A (PEI não criado)";
      }
    }
  }

  // --- MUDANÇA CRUCIAL: CALCULA isAtrasadoRealmente NO FINAL, COM BASE NOS STATUS FINAIS ---
  let finalIsAtrasadoRealmente = false;

  if (
    statusPeiGeral.includes("Atrasado") || // Cobre "Atrasado - Sem PEI", "Criado (Atrasado)", "Atrasado - Sem PEI (Dados Inconsistentes)"
    statusRevisao1.includes("Atrasado") ||
    statusRevisao2.includes("Atrasado")
  ) {
    finalIsAtrasadoRealmente = true;
  }
  // FIM DA MUDANÇA

  // functions.logger.log(
  //   `[getPeiStatusDetails] Status Final: Geral=${statusPeiGeral}, R1=${statusRevisao1}, R2=${statusRevisao2}, isAtrasadoRealmente=${finalIsAtrasadoRealmente}`
  // );
  // functions.logger.log(`[getPeiStatusDetails] === DEBUG FIM ===`);

  return {
    statusPeiGeral,
    statusRevisao1,
    statusRevisao2,
    isAtrasadoRealmente: finalIsAtrasadoRealmente,
    // Retorna o Timestamp original para dataUltimaAtualizacaoPei (se for o caso)
    dataUltimaAtualizacaoPei:
      peiData?.dataUltimaRevisao || peiData?.dataCriacao || null,
  };
};

/**
 * Calcula o status de acompanhamento de PEI para um professor específico.
 * @param {string} professorId - O ID do documento do professor na coleção 'usuarios'.
 * @returns {object | null} Um objeto de resumo do professor ou null se não for encontrado/válido.
 */
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

  // functions.logger.log(`[calcularStatusProfessor] Dados completos do professor ${professorId}:`, JSON.stringify(professorData));

  const turmasDoProfessor = professorData.turmas
    ? Object.keys(professorData.turmas)
    : [];
  const escolasDoProfessor = professorData.escolas
    ? Object.keys(professorData.escolas)
    : [];

  // functions.logger.log(`[calcularStatusProfessor] Professor ${professorId} turmas (após Object.keys):`, turmasDoProfessor);
  // functions.logger.log(`[calcularStatusProfessor] Professor ${professorId} escolas (após Object.keys):`, escolasDoProfessor);

  if (turmasDoProfessor.length === 0 || escolasDoProfessor.length === 0) {
    functions.logger.log(
      `[calcularStatusProfessor] Professor ${professorId} não tem turmas ou escolas vinculadas.`
    );
    return {
      professorId: professorId,
      professorNome: professorData.nome,
      escolaId: professorData.escolaId || null,
      statusGeral: "Em dia", // Por padrão, se não há alunos para monitorar, está em dia.
      alunosAtrasadosCount: 0,
      detalhesAtraso: ["Nenhuma turma ou escola vinculada a este professor."],
      alunosDetalhesPrazos: [],
      ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
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
      .where("escolaId", "in", escolasDoProfessor); // Adiciona filtro por escola

    // functions.logger.log(`[calcularStatusProfessor] Query Alunos: turma IN [${batchTurmas.join(', ')}] e escolaId IN [${escolasDoProfessor.join(', ')}]`);

    const snap = await qAlunos.get();
    snap.forEach((doc) => allAlunosData.push({ id: doc.id, ...doc.data() }));
  }

  // functions.logger.log(`[calcularStatusProfessor] Alunos encontrados para professor ${professorId} (${allAlunosData.length} total):`, allAlunosData.map(a => ({ id: a.id, nome: a.nome, turma: a.turma, escolaId: a.escolaId })));

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
    };
  }

  // 4. Busca os PEIs de TODOS os alunos encontrados
  let allPeisData = [];
  const alunoIdsArray = allAlunosData.map((a) => a.id);
  const alunoIdsBatchSize = FIRESTORE_QUERY_BATCH_SIZE;

  for (let i = 0; i < alunoIdsArray.length; i += alunoIdsBatchSize) {
    const batchAlunoIds = alunoIdsArray.slice(i, i + alunoIdsBatchSize);
    const qPeis = db
      .collection("peis")
      .where("alunoId", "in", batchAlunoIds)
      .where("anoLetivo", "==", anoAtual)
      .orderBy("dataCriacao", "desc");

    // functions.logger.log(`[calcularStatusProfessor] Query PEIs: alunoId IN [${batchAlunoIds.join(', ')}] e anoLetivo == ${anoAtual}`);

    const snap = await qPeis.get();
    snap.forEach((doc) => allPeisData.push({ id: doc.id, ...doc.data() }));
  }

  // functions.logger.log(`[calcularStatusProfessor] Todos os PEIs encontrados (allPeisData, ${allPeisData.length} total):`, allPeisData.map(p => ({ docId: p.id, alunoId: p.alunoId, anoLetivo: p.anoLetivo, criadoEm: p.dataCriacao, status: p.statusGeral })));

  let statusProfessorGeral = "Em dia"; // Começa como em dia
  let alunosAtrasadosCount = 0;
  let detalhesAtrasoPorAluno = []; // Lista de strings para exibição
  let alunosDetalhesPrazos = []; // Lista de objetos detalhados para exibir no frontend

  for (const aluno of allAlunosData) {
    // Encontra o PEI mais recente para este aluno (allPeisData já está ordenado por dataCriacao desc)
    const peiDoAluno = allPeisData.find((p) => p.alunoId === aluno.id);

    // functions.logger.log(`[calcularStatusProfessor] Processando aluno ${aluno.nome} (${aluno.id}). PEI encontrado:`, peiDoAluno ? peiDoAluno.id : "NENHUM");

    // Calcula o status detalhado para o aluno (usando a data de hoje para o cálculo)
    const statusDetalhadoAluno = getPeiStatusDetails(
      peiDoAluno,
      prazosConvertidos,
      hoje // Passa o objeto Date `hoje`
    );

    // Se o aluno possui atraso real, atualiza o status geral do professor e a contagem
    if (statusDetalhadoAluno.isAtrasadoRealmente) {
      statusProfessorGeral = "Atrasado"; // Se UM aluno está atrasado, o professor está atrasado.
      alunosAtrasadosCount++;
      detalhesAtrasoPorAluno.push({
        // Objeto para detalhes dos atrasos
        alunoId: aluno.id,
        nome: aluno.nome,
        turma: aluno.turma,
        escolaId: aluno.escolaId, // Inclui escolaId para filtragem no frontend
        statusPeiGeral: statusDetalhadoAluno.statusPeiGeral,
        statusRevisao1: statusDetalhadoAluno.statusRevisao1,
        statusRevisao2: statusDetalhadoAluno.statusRevisao2,
        dataUltimaAtualizacaoPei: statusDetalhadoAluno.dataUltimaAtualizacaoPei,
      });
    }

    // Adiciona todos os alunos à lista detalhada, independentemente do atraso
    alunosDetalhesPrazos.push({
      id: aluno.id,
      nome: aluno.nome,
      turma: aluno.turma,
      escolaId: aluno.escolaId,
      ...statusDetalhadoAluno,
    });
  }

  // Retorna o resumo consolidado para o professor
  return {
    professorId: professorId,
    professorNome: professorData.nome,
    escolaId: professorData.escolaId || null, // Opcional: pode ser útil ter o ID da escola principal do professor
    statusGeral: statusProfessorGeral,
    alunosAtrasadosCount: alunosAtrasadosCount,
    detalhesAtraso: detalhesAtrasoPorAluno, // Lista de alunos REALMENTE atrasados
    alunosDetalhesPrazos: alunosDetalhesPrazos, // Lista de TODOS os alunos com seus status
    ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
  };
}

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
    res.set("Access-Control-Allow-Origin", "*"); // Permite qualquer origem. Em produção, use um domínio específico.
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS"); // Métodos permitidos
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Cabeçalhos permitidos

    if (req.method === "OPTIONS") {
      res.status(204).send(""); // Responde a requisições OPTIONS (pré-voo CORS)
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
          res
            .status(403)
            .json({
              error:
                "Permissão negada: UID do token não corresponde ao payload.",
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
          res
            .status(403)
            .json({
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
      res
        .status(401)
        .json({
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
