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
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

const getPeiStatusDetails = (peiData, prazos, hoje) => {
  let statusPeiGeral = "Não iniciado";
  let statusRevisao1 = "N/A";
  let statusRevisao2 = "N/A";
  let dataUltimaAtualizacaoPei = null;
  // isAtrasadoRealmente será calculado no final, baseado nos status finais
  // Não o inicializaremos com true em nenhum ponto intermediário.

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

  functions.logger.log(`[getPeiStatusDetails] === DEBUG INICIO ===`);
  functions.logger.log(
    `[getPeiStatusDetails] PEI ID: ${peiData ? peiData.id : "NENHUM PEI ENCONTRADO"}`
  );
  functions.logger.log(
    `[getPeiStatusDetails] HOJE (zerado): ${hojeZerado ? hojeZerado.toISOString() : "N/A"}`
  );
  functions.logger.log(
    `[getPeiStatusDetails] PRAZO CRIAÇÃO (zerado): ${dataLimiteCriacaoPEI ? dataLimiteCriacaoPEI.toISOString() : "N/A"}`
  );
  functions.logger.log(
    `[getPeiStatusDetails] PRAZO REVISÃO 1 (zerado): ${dataLimiteRevisao1Sem ? dataLimiteRevisao1Sem.toISOString() : "N/A"}`
  );
  functions.logger.log(
    `[getPeiStatusDetails] PRAZO REVISÃO 2 (zerado): ${dataLimiteRevisao2Sem ? dataLimiteRevisao2Sem.toISOString() : "N/A"}`
  );

  functions.logger.log(
    `[getPeiStatusDetails] peiData: ${JSON.stringify(peiData)}`
  );

  // --- LÓGICA DE STATUS: AQUI DEFINIMOS AS STRINGS DE STATUS GERAL E REVISÕES ---
  if (!peiData) {
    functions.logger.log(
      `[getPeiStatusDetails] -> Caminho: PEI NÃO ENCONTRADO.`
    );
    if (dataLimiteCriacaoPEI && hojeZerado >= dataLimiteCriacaoPEI) {
      statusPeiGeral = "Atrasado - Sem PEI"; // Ação NÃO realizada
    } else {
      statusPeiGeral = "Aguardando Criação";
    }
  } else {
    functions.logger.log(`[getPeiStatusDetails] -> Caminho: PEI ENCONTRADO.`);
    const dataCriacaoPeiOriginal = peiData.dataCriacao?.toDate
      ? peiData.dataCriacao.toDate()
      : null;
    const dataUltimaRevisaoOriginal = peiData.dataUltimaRevisao?.toDate
      ? peiData.dataUltimaRevisao.toDate()
      : null;

    const dataCriacaoPei = resetTime(dataCriacaoPeiOriginal);
    dataUltimaAtualizacaoPei = resetTime(
      dataUltimaRevisaoOriginal || dataCriacaoPeiOriginal
    );

    functions.logger.log(
      `[getPeiStatusDetails]   PEI Data Criacao (zerada): ${dataCriacaoPei ? dataCriacaoPei.toISOString() : "N/A"}`
    );
    functions.logger.log(
      `[getPeiStatusDetails]   PEI Data Ultima Atualizacao (zerada): ${dataUltimaAtualizacaoPei ? dataUltimaAtualizacaoPei.toISOString() : "N/A"}`
    );

    if (dataLimiteCriacaoPEI) {
      if (hojeZerado >= dataLimiteCriacaoPEI) {
        if (dataCriacaoPei) {
          statusPeiGeral =
            dataCriacaoPei <= dataLimiteCriacaoPEI
              ? "Criado no Prazo"
              : "Criado (Atrasado)"; // Ação REALIZADA (mesmo que com atraso)
        } else {
          statusPeiGeral = "Atrasado - Sem PEI (Dados Inconsistentes)"; // Ação NÃO realizada
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

    if (dataCriacaoPei) {
      // Só avaliamos revisões se o PEI foi criado
      // Revisão 1
      if (dataLimiteRevisao1Sem) {
        if (hojeZerado >= dataLimiteRevisao1Sem) {
          if (
            dataUltimaAtualizacaoPei &&
            dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem
          ) {
            statusRevisao1 = "Em dia (Feita)"; // Ação REALIZADA
          } else {
            statusRevisao1 = "Atrasado"; // Ação NÃO realizada (prazo passou e não feita desde o prazo)
          }
        } else {
          statusRevisao1 =
            dataUltimaAtualizacaoPei &&
            dataUltimaAtualizacaoPei >= dataCriacaoPei
              ? "Feita (Aguardando prazo)" // Ação REALIZADA
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
            statusRevisao2 = "Em dia (Feita)"; // Ação REALIZADA
          } else {
            statusRevisao2 = "Atrasado"; // Ação NÃO realizada (prazo passou e não feita desde o prazo)
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
      // Se PEI não criado (dataCriacaoPei é nulo), mas peiData existe (consistência duvidosa)
      // Considera atrasado real se prazos de revisão passaram sem criação
      if (dataLimiteRevisao1Sem && hojeZerado >= dataLimiteRevisao1Sem) {
        statusRevisao1 = "Atrasado (PEI não criado)"; // Ação NÃO realizada
      } else {
        statusRevisao1 = "N/A (PEI não criado)";
      }

      if (dataLimiteRevisao2Sem && hojeZerado >= dataLimiteRevisao2Sem) {
        statusRevisao2 = "Atrasado (PEI não criado)"; // Ação NÃO realizada
      } else {
        statusRevisao2 = "N/A (PEI não criado)";
      }
    }
  }

  // --- CALCULA isAtrasadoRealmente NO FINAL, COM BASE NOS STATUS FINAIS ---
  let finalIsAtrasadoRealmente = false; // Inicializa como false

  // Se o status indica que a ação não foi realizada E o prazo passou, então é um atraso real.
  if (
    (statusPeiGeral === "Atrasado - Sem PEI" ||
      statusPeiGeral === "Atrasado - Sem PEI (Dados Inconsistentes)") &&
    !peiData
  ) {
    finalIsAtrasadoRealmente = true;
  } else if (
    statusRevisao1 === "Atrasado" &&
    (!peiData?.dataUltimaRevisao ||
      peiData.dataUltimaRevisao.toDate() < dataLimiteRevisao1Sem)
  ) {
    finalIsAtrasadoRealmente = true;
  } else if (
    statusRevisao2 === "Atrasado" &&
    (!peiData?.dataUltimaRevisao ||
      peiData.dataUltimaRevisao.toDate() < dataLimiteRevisao2Sem)
  ) {
    finalIsAtrasadoRealmente = true;
  }

  // TODOS os outros status indicam que a ação foi realizada (mesmo com atraso) ou não está atrasada.

  functions.logger.log(
    `[getPeiStatusDetails] Status Final: Geral=<span class="math-inline">\{statusPeiGeral\}, R1\=</span>{statusRevisao1}, R2=<span class="math-inline">\{statusRevisao2\}, isAtrasadoRealmente\=</span>{finalIsAtrasadoRealmente}`
  );
  functions.logger.log(`[getPeiStatusDetails] === DEBUG FIM ===`);

  return {
    statusPeiGeral,
    statusRevisao1,
    statusRevisao2,
    isAtrasadoRealmente: finalIsAtrasadoRealmente, // Retorna o valor FINAL ajustado
    dataUltimaAtualizacaoPei:
      peiData?.dataUltimaRevisao || peiData?.dataCriacao || null,
  };
};

// ... (código posterior omitido para brevidade) ...

async function calcularStatusProfessor(professorId) {
  const anoAtual = new Date().getFullYear(); // Isso será 2025
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

  const professorDoc = await db.collection("usuarios").doc(professorId).get();
  if (!professorDoc.exists || professorDoc.data().perfil !== "professor") {
    functions.logger.info(
      `[calcularStatusProfessor] Professor ${professorId} não encontrado ou não é perfil de professor. Retornando null.`
    );
    return null;
  }
  const professorData = professorDoc.data();

  // === ✅ NOVO LOG 1: DUMP COMPLETO DO OBJETO DO PROFESSOR ===
  functions.logger.log(
    `[calcularStatusProfessor] Dados completos do professor ${professorId}:`,
    JSON.stringify(professorData)
  );
  // ==========================================================

  const turmasDoProfessor = professorData.turmas
    ? Object.keys(professorData.turmas)
    : [];
  const escolasDoProfessor = professorData.escolas
    ? Object.keys(professorData.escolas)
    : [];

  // === ✅ NOVO LOG 2: Turmas e Escolas do Professor (APÓS Object.keys) ===
  functions.logger.log(
    `[calcularStatusProfessor] Professor ${professorId} turmas (após Object.keys):`,
    turmasDoProfessor
  );
  functions.logger.log(
    `[calcularStatusProfessor] Professor ${professorId} escolas (após Object.keys):`,
    escolasDoProfessor
  );
  // =======================================================================

  // === ✅ NOVO BLOCO DE DIAGNÓSTICO: TENTAR PEGAR O PEI DO HEITOR DIRETAMENTE POR ID ===
  const heitorPeiDocId = "HEpzLwhHaNB9Gigf527M"; // <<< ID do documento PEI do Heitor
  try {
    functions.logger.log(
      `[calcularStatusProfessor] DIAGNÓSTICO: Tentando buscar PEI do Heitor diretamente por ID: ${heitorPeiDocId}`
    );
    const heitorPeiSnap = await db.collection("peis").doc(heitorPeiDocId).get();

    if (heitorPeiSnap.exists()) {
      functions.logger.log(
        `[calcularStatusProfessor] DIAGNÓSTICO: PEI do Heitor encontrado diretamente por ID. Dados:`,
        heitorPeiSnap.data()
      );
      // Aqui, você pode até tentar forçar a inclusão desse PEI para fins de teste, se quiser
      // allPeisData.push({ id: heitorPeiSnap.id, ...heitorPeiSnap.data() }); // Descomente para forçar para teste
    } else {
      functions.logger.warn(
        `[calcularStatusProfessor] DIAGNÓSTICO: PEI do Heitor NÃO encontrado diretamente por ID ${heitorPeiDocId}.`
      );
    }
  } catch (directError) {
    functions.logger.error(
      `[calcularStatusProfessor] DIAGNÓSTICO: Erro ao tentar buscar PEI do Heitor por ID ${heitorPeiDocId}:`,
      directError
    );
  }
  // =======================================================================

  if (turmasDoProfessor.length === 0 || escolasDoProfessor.length === 0) {
    functions.logger.log(
      `[calcularStatusProfessor] Professor ${professorId} não tem turmas ou escolas vinculadas.`
    );
    return {
      professorId: professorId,
      professorNome: professorData.nome,
      escolaId: professorData.escolaId || null,
      statusGeral: "Em dia",
      alunosAtrasadosCount: 0,
      detalhesAtraso: ["Nenhuma turma ou escola vinculada a este professor."],
      alunosDetalhesPrazos: [],
      ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  let allAlunosData = [];
  const alunoIdsBatchSize = FIRESTORE_QUERY_BATCH_SIZE; // Usar a constante
  for (let i = 0; i < turmasDoProfessor.length; i += alunoIdsBatchSize) {
    // Loop sobre turmas
    const batchTurmas = turmasDoProfessor.slice(i, i + alunoIdsBatchSize);
    const qAlunos = db
      .collection("alunos")
      .where("turma", "in", batchTurmas)
      .where("escolaId", "in", escolasDoProfessor);

    // === ✅ NOVO LOG 3: Detalhes da Query de Alunos ===
    functions.logger.log(
      `[calcularStatusProfessor] Query Alunos: turma IN [<span class="math-inline">\{batchTurmas\.join\(', '\)\}\] e escolaId IN \[</span>{escolasDoProfessor.join(', ')}]`
    );
    // ==================================================

    const snap = await qAlunos.get();
    snap.forEach((doc) => allAlunosData.push({ id: doc.id, ...doc.data() }));
  }

  // === ✅ NOVO LOG 4: Alunos Encontrados (ANTES do map para ID) ===
  functions.logger.log(
    `[calcularStatusProfessor] Alunos encontrados para professor <span class="math-inline">\{professorId\} \(</span>{allAlunosData.length} total):`,
    allAlunosData.map((a) => ({
      id: a.id,
      nome: a.id,
      turma: a.turma,
      escolaId: a.escolaId,
    }))
  );
  // =================================================================

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
      detalhesAtraso: ["Nenhuma turma ou escola vinculada a este professor."],
      alunosDetalhesPrazos: [],
      ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  let allPeisData = [];
  const alunoIdsArray = allAlunosData.map((a) => a.id); // Array de IDs de alunos
  const peiIdsBatchSize = FIRESTORE_QUERY_BATCH_SIZE; // Usar a constante

  for (let i = 0; i < alunoIdsArray.length; i += peiIdsBatchSize) {
    // Loop sobre IDs de alunos
    const batchAlunoIds = alunoIdsArray.slice(i, i + peiIdsBatchSize);
    const qPeis = db
      .collection("peis")
      .where("alunoId", "in", batchAlunoIds)
      .where("anoLetivo", "==", anoAtual)
      .orderBy("dataCriacao", "desc");

    // === ✅ NOVO LOG 5: Detalhes da Query de PEIs ===
    functions.logger.log(
      `[calcularStatusProfessor] Query PEIs: alunoId IN [${batchAlunoIds.join(", ")}] e anoLetivo == ${anoAtual}`
    );
    // ===============================================

    const snap = await qPeis.get();
    snap.forEach((doc) => allPeisData.push({ id: doc.id, ...doc.data() }));
  }

  // === ✅ NOVO LOG 6: Todos os PEIs encontrados (allPeisData) ===
  functions.logger.log(
    `[calcularStatusProfessor] Todos os PEIs encontrados (allPeisData, ${allPeisData.length} total):`,
    allPeisData.map((p) => ({
      docId: p.id,
      alunoId: p.alunoId,
      anoLetivo: p.anoLetivo,
      criadoEm: p.criadoEm,
      status: p.status,
    }))
  );
  // ==============================================================

  let statusProfessor = "Em dia";
  let detalhesAtrasoPorAluno = [];
  let alunosDetalhesPrazos = [];

  for (const aluno of allAlunosData) {
    const peiDoAluno = allPeisData.find((p) => p.alunoId === aluno.id);

    // === ✅ NOVO LOG 7: PEI encontrado para aluno específico no loop ===
    functions.logger.log(
      `[calcularStatusProfessor] Processando aluno <span class="math-inline">\{aluno\.nome\} \(</span>{aluno.id}). PEI encontrado:`,
      peiDoAluno ? peiDoAluno.id : "NENHUM"
    );
    // ===============================================================

    const statusDetalhadoAluno = getPeiStatusDetails(
      peiDoAluno, // <<< Aqui peiDoAluno DEVE ter o PEI do Heitor
      prazosConvertidos,
      hoje
    );

    // MUDANÇA AQUI: Usamos a nova flag `isAtrasadoRealmente`
    if (statusDetalhadoAluno.isAtrasadoRealmente) {
      statusProfessor = "Atrasado";
      detalhesAtrasoPorAluno.push(
        `Aluno ${aluno.nome} - PEI: ${statusDetalhadoAluno.statusPeiGeral}, R1: ${statusDetalhadoAluno.statusRevisao1}, R2: ${statusDetalhadoAluno.statusRevisao2}`
      );
    }

    alunosDetalhesPrazos.push({
      id: aluno.id,
      nome: aluno.nome,
      turma: aluno.turma,
      escolaId: aluno.escolaId,
      ...statusDetalhadoAluno,
    });
  }

  return {
    professorId: professorId,
    professorNome: professorData.nome,
    escolaId: professorData.escolaId || null,
    statusGeral: statusProfessor,
    alunosAtrasadosCount: detalhesAtrasoPorAluno.length,
    detalhesAtraso: detalhesAtrasoPorAluno,
    alunosDetalhesPrazos: alunosDetalhesPrazos,
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
// OUTROS GATILHOS DO FIRESTORE (corrigidos para sintaxe v2)
// =========================================================================

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
    `[onPeiWrite] Resumo do PEI atualizado para ${professoresSnap.docs.length} professores após alteração do PEI ${event.params.peiId}.`
  );
  return null;
});

exports.onProfessorUpdate = onDocumentWritten(
  "usuarios/{userId}",
  async (event) => {
    const beforeData = event.data.before?.data();
    const afterData = event.data.after?.data();
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
          `[onProfessorUpdate] Resumo do PEI atualizado para professor ${professorId}.`
        );
      } else {
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

exports.onAlunoWrite = onDocumentWritten("alunos/{alunoId}", async (event) => {
  const alunoDataBefore = event.data.before?.data();
  const alunoDataAfter = event.data.after?.data();
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

  if (affectedTurmas.size === 0) {
    functions.logger.log(
      `[onAlunoWrite] Aluno ${alunoId}: Nenhuma mudança de turma relevante.`
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

exports.onPrazosAnuaisWrite = onDocumentWritten(
  "prazosPEIAnuais/{docId}",
  async (event) => {
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
    const FIREBASE_BATCH_COMMIT_LIMIT = 400;

    for (const doc /* of */ of professoresSnap.docs) {
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
      professoresProcessados++;

      if (
        professoresProcessados % FIREBASE_BATCH_COMMIT_LIMIT === 0 &&
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

// functions/index.js

// ... (todo o código acima: imports, admin.initializeApp(), db, resetTime, getPeiStatusDetails, calcularStatusProfessor, setCustomUserClaimsOnProfileUpdate, onPeiWrite, onProfessorUpdate, onAlunoWrite, onPrazosAnuaisWrite) ...

// =========================================================================
// FUNÇÃO DE BACKFILL: RECALCULAR TODOS OS PRAZOS PARA DADOS EXISTENTES (onRequest WORKAROUND - CORRIGIDO ERROS ESLINT)
// =========================================================================

exports.recalcularTodosPrazos = onRequest(
  { region: "southamerica-east1" },
  async (req, res) => {
    // ✅ AGORA RECEBE req, res
    // --- Tratamento de CORS (MANDATÓRIO PARA onRequest) ---
    res.set("Access-Control-Allow-Origin", "*"); // Ou o domínio específico do seu frontend em produção
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Inclua Authorization

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    // --- Fim do Tratamento de CORS ---

    functions.logger.log(
      "[recalcularTodosPrazos] *** INÍCIO DA EXECUÇÃO DA FUNÇÃO (onRequest WORKAROUND - CORRIGIDO) ***"
    );

    // --- ✅ NOVOS LOGS DE DIAGNÓSTICO DO CORPO DA REQUISIÇÃO ---
    // Removidas referências a 'context' que causavam 'no-undef'
    functions.logger.log(
      "[recalcularTodosPrazos] Tipo de Content-Type:",
      req.headers["content-type"]
    );
    functions.logger.log(
      "[recalcularTodosPrazos] req.body (parseado automaticamente):",
      req.body
    ); // O corpo parseado

    let rawBodyString = null;
    if (req.rawBody) {
      // req.rawBody contém o corpo bruto da requisição como um Buffer
      rawBodyString = req.rawBody.toString("utf8");
      functions.logger.log(
        "[recalcularTodosPrazos] req.rawBody (String):",
        rawBodyString
      );
    } else {
      functions.logger.log(
        "[recalcularTodosPrazos] req.rawBody é NULO/UNDEFINED."
      );
    }

    let parsedBodyManually = null;
    try {
      if (
        rawBodyString &&
        req.headers["content-type"]?.includes("application/json")
      ) {
        parsedBodyManually = JSON.parse(rawBodyString);
        functions.logger.log(
          "[recalcularTodosPrazos] Body parseado manualmente (se JSON):",
          parsedBodyManually
        );
      }
    } catch (parseError) {
      functions.logger.error(
        "[recalcularTodosPrazos] Erro ao parsear req.rawBody manualmente:",
        parseError
      );
    }
    // --- FIM DOS NOVOS LOGS ---

    // ✅ OBTENDO O userId do payload (req.body ou parse manual)
    let userIdFromFrontend = null;
    if (
      req.body &&
      typeof req.body === "object" &&
      req.body.data &&
      req.body.data.userId
    ) {
      userIdFromFrontend = req.body.data.userId;
      functions.logger.log(
        "[recalcularTodosPrazos] userIdFromFrontend obtido de req.body.data:",
        userIdFromFrontend
      );
    } else if (
      parsedBodyManually &&
      parsedBodyManually.data &&
      parsedBodyManually.data.userId
    ) {
      // Tenta obter do parse manual
      userIdFromFrontend = parsedBodyManually.data.userId;
      functions.logger.log(
        "[recalcularTodosPrazos] userIdFromFrontend obtido do parse manual (fallback):",
        userIdFromFrontend
      );
    } else {
      functions.logger.log(
        "[recalcularTodosPrazos] userIdFromFrontend AINDA É NULO/UNDEFINED, ou não está em req.body.data."
      );
    }

    // --- VERIFICAÇÃO DE userId (AGORA MAIS INFORMATIVA) ---
    if (!userIdFromFrontend) {
      functions.logger.warn(
        "[recalcularTodosPrazos] WORKAROUND FINAL: userIdFromFrontend NÃO CONSEGUIDO. Finalizando com 400 Bad Request."
      );
      res.status(400).json({
        error: "Requisição inválida: userId é obrigatório no payload.",
        details: "UID não fornecido pela requisição.",
      });
      return;
    }

    let idToken = null;
    try {
      const authorizationHeader = req.headers.authorization;
      if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
        functions.logger.warn(
          "[recalcularTodosPrazos] Token de Autorização Bearer ausente ou inválido no cabeçalho."
        );
        res
          .status(401)
          .json({ error: "Não autorizado: Token Bearer ausente ou inválido." });
        return;
      }
      idToken = authorizationHeader.split("Bearer ")[1];

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      // Confere se o UID do token corresponde ao UID enviado no payload (segurança extra)
      if (decodedToken.uid !== userIdFromFrontend) {
        functions.logger.warn(
          "[recalcularTodosPrazos] WORKAROUND FINAL: UID do token não corresponde ao UID do payload."
        );
        res.status(403).json({
          error:
            "Permissão negada: UID do token não corresponde ao UID do payload.",
        });
        return;
      }

      const customClaims = decodedToken; // Token decodificado já contém as claims
      functions.logger.log(
        "[recalcularTodosPrazos] WORKAROUND FINAL: Claims do token decodificado:",
        customClaims
      );

      if (customClaims.admin !== true) {
        functions.logger.warn(
          "[recalcularTodosPrazos] WORKAROUND FINAL: UID " +
            userIdFromFrontend +
            " não possui claim 'admin: true'."
        );
        res
          .status(403)
          .json({ error: "Permissão negada: Requer token de admin." });
        return;
      }

      functions.logger.log(
        "Iniciando backfill/recalculo de prazos PEI (AUTORIZADO VIA onRequest WORKAROUND - FINAL)..."
      );

      // --- SEU CÓDIGO ORIGINAL DA FUNÇÃO COMEÇA AQUI ---
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
      const FIREBASE_BATCH_COMMIT_LIMIT = 400;

      for (const doc /* of */ of professoresSnap.docs) {
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
        "Erro durante o backfill/recalculo de prazos PEI (na seção do WORKAROUND ou admin.auth()):",
        error
      );
      if (
        error.code === "auth/argument-error" ||
        error.code === "auth/invalid-id-token" ||
        error.code === "auth/user-not-found"
      ) {
        res.status(401).json({
          error:
            "Autenticação falhou: Token inválido ou ausente. Faça login novamente.",
          details: error.message,
        });
      } else if (error.code === "permission-denied") {
        res.status(403).json({
          error: "Permissão negada: Requer token de admin.",
          details: error.message,
        });
      } else {
        res.status(500).json({
          error: "Ocorreu um erro interno no servidor.",
          details: error.message,
        });
      }
      return;
    }
  }
);

// =========================================================================
// SUA FUNÇÃO HTTP ORIGINAL: getPeiAcompanhamentoBySchool
// =========================================================================

exports.getPeiAcompanhamentoBySchool = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const anoLetivo =
    req.method === "POST" ? req.body.anoLetivo : req.query.anoLetivo;

  if (!anoLetivo) {
    // Usar functions.logger.error para consistência
    functions.logger.error("Ano letivo não fornecido na requisição.");
    return res.status(400).json({ error: "Ano letivo é obrigatório." });
  }

  try {
    const hoje = admin.firestore.Timestamp.now().toDate();
    hoje.setHours(0, 0, 0, 0);

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
          .collection("peis")
          .where("escolaId", "==", escola.id)
          .where("anoLetivo", "==", Number(anoLetivo));

        const peisSnapshot = await peisQuery.get();

        let peisComStatusEmElaboracao = 0;
        let peisComStatusConcluido = 0;
        let peisAtrasados = 0; // Esta contagem de "atrasados" é para PEIs "em elaboração" que passaram da data prevista

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
            if (pei.dataPrevistaTermino instanceof admin.firestore.Timestamp) {
              try {
                const dataPrevista = pei.dataPrevistaTermino.toDate();
                if (dataPrevista < hoje) {
                  peisAtrasados++;
                }
              } catch (e) {
                // Usar functions.logger.warn para consistência
                functions.logger.warn(
                  `[Cloud Function] Erro ao processar dataPrevistaTermino para PEI ${doc.id} da escola ${escola.nome}:`,
                  e.message
                );
              }
            } else {
              // Usar functions.logger.warn para consistência
              functions.logger.warn(
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

        const emElaboracaoNoPrazo = peisComStatusEmElaboracao - peisAtrasados;

        dadosAgregados.push({
          id: escola.id,
          nomeEscola: escola.nome || "Nome Indisponível",
          totalAlunosMonitorados: totalNecessitando,
          pendenteCriacao: pendenteCriacaoCalculado,
          // Corrigido aqui: emElaboracao deve considerar apenas os que NÃO estão atrasados nesta categoria
          emElaboracao: emElaboracaoNoPrazo < 0 ? 0 : emElaboracaoNoPrazo,
          atrasados: peisAtrasados + pendenteCriacaoCalculado, // Atrasados inclui PEIs em elaboração atrasados E PEIs pendentes de criação
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
    // Usar functions.logger.error para consistência
    functions.logger.error(
      "[Cloud Function] Erro ao agregar dados de PEI:",
      err
    );
    return res
      .status(500)
      .json({ error: "Erro interno do servidor ao processar os dados." });
  }
});
