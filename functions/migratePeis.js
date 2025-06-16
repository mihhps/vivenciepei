// functions/migratePeis.js

const admin = require("firebase-admin");

// Caminho para o seu arquivo JSON da conta de serviço
const serviceAccount = require("./serviceAccountKey.json");

// Inicializa o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migratePeis() {
  console.log("Iniciando migração de documentos PEI...");

  const peisRef = db.collection("peis");
  let peisProcessed = 0;
  const batchSize = 400; // Limite do batch

  try {
    // Busca todos os documentos PEI.
    // Para bases de dados MUITO grandes (milhões de documentos), você pode precisar
    // de paginação para evitar carregar tudo na memória de uma vez.
    const snapshot = await peisRef.get();
    const docs = snapshot.docs;

    if (docs.length === 0) {
      console.log("Nenhum documento PEI encontrado para migrar.");
      process.exit(0);
    }

    let batch = db.batch();

    for (const doc of docs) {
      const peiData = doc.data();
      const updateData = {};
      let needsUpdate = false;

      // 1. Lógica para 'anoLetivo'
      // Tenta obter o ano da data de criação ou última revisão
      let peiCreationDate = null;
      if (peiData.dataCriacao && peiData.dataCriacao.toDate) {
        peiCreationDate = peiData.dataCriacao.toDate();
      } else if (typeof peiData.criadoEm === "string") {
        peiCreationDate = new Date(peiData.criadoEm);
      }

      // Se 'anoLetivo' está faltando ou não é um número, e temos uma data de criação
      if (
        (!peiData.anoLetivo || typeof peiData.anoLetivo !== "number") &&
        peiCreationDate &&
        !isNaN(peiCreationDate)
      ) {
        updateData.anoLetivo = peiCreationDate.getFullYear();
        needsUpdate = true;
        console.log(
          `PEI ${doc.id}: Adicionando/Corrigindo anoLetivo para ${updateData.anoLetivo}`
        );
      } else if (!peiCreationDate || isNaN(peiCreationDate)) {
        console.warn(
          `PEI ${doc.id}: Não foi possível determinar anoLetivo a partir de dataCriacao/criadoEm. Verifique este PEI manualmente.`
        );
      }

      // 2. Lógica para 'status'
      if (!peiData.status) {
        updateData.status = "em elaboração"; // Ou outro status padrão apropriado
        needsUpdate = true;
        console.log(
          `PEI ${doc.id}: Adicionando status padrão 'em elaboração'.`
        );
      }

      // 3. Lógica para 'escolaId'
      if (!peiData.escolaId && peiData.alunoId) {
        const alunoDoc = await db
          .collection("alunos")
          .doc(peiData.alunoId)
          .get();
        if (alunoDoc.exists && alunoDoc.data().escolaId) {
          updateData.escolaId = alunoDoc.data().escolaId;
          needsUpdate = true;
          console.log(
            `PEI ${doc.id}: Adicionando escolaId: ${updateData.escolaId}.`
          );
        } else {
          console.warn(
            `PEI ${doc.id}: Aluno ${peiData.alunoId} não encontrado ou sem escolaId. PEI não será atualizado com escolaId.`
          );
        }
      } else if (!peiData.escolaId && !peiData.alunoId) {
        console.warn(
          `PEI ${doc.id}: Sem alunoId, não é possível determinar escolaId.`
        );
      }

      // 4. Lógica para 'dataPrevistaTermino' (opcional)
      // Adiciona uma data prevista de término, por exemplo, 6 meses após a criação
      if (
        !peiData.dataPrevistaTermino &&
        peiCreationDate &&
        !isNaN(peiCreationDate)
      ) {
        const futureDate = new Date(peiCreationDate);
        futureDate.setMonth(futureDate.getMonth() + 6); // Adiciona 6 meses
        updateData.dataPrevistaTermino =
          admin.firestore.Timestamp.fromDate(futureDate);
        needsUpdate = true;
        console.log(
          `PEI ${doc.id}: Adicionando dataPrevistaTermino como 6 meses após criação.`
        );
      }

      if (needsUpdate) {
        batch.update(doc.ref, updateData); // Use doc.ref em vez de peisRef.doc(doc.id)
        peisProcessed++;

        if (peisProcessed % batchSize === 0) {
          await batch.commit();
          console.log(`Commited ${peisProcessed} PEIs...`);
          batch = db.batch(); // Inicia novo batch
        }
      } else {
        // console.log(`PEI ${doc.id}: Não precisa de atualização.`); // Log opcional para ver os ignorados
      }
    }

    if (peisProcessed > 0) {
      await batch.commit(); // Commita o batch final
    }
    console.log(
      `Migração concluída. Total de ${peisProcessed} documentos PEI atualizados.`
    );
    process.exit(0);
  } catch (error) {
    console.error("Erro durante a migração de PEIs:", error);
    process.exit(1);
  }
}

migratePeis();
