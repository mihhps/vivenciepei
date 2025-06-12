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
    const snapshot = await peisRef.get(); // Busca todos os documentos PEI
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

      // Se 'anoLetivo' está faltando ou não é um número (ajuste o ano padrão)
      if (!peiData.anoLetivo || typeof peiData.anoLetivo !== "number") {
        updateData.anoLetivo = new Date().getFullYear(); // Ou o ano letivo correto para esses PEIs
        needsUpdate = true;
      }

      // Se 'status' está faltando (defina um status padrão)
      if (!peiData.status) {
        updateData.status = "em elaboração"; // Ou outro status padrão apropriado
        needsUpdate = true;
      }

      // Se 'escolaId' está faltando
      if (!peiData.escolaId) {
        // Você precisará buscar o aluno para obter o escolaId
        if (peiData.alunoId) {
          const alunoDoc = await db
            .collection("alunos")
            .doc(peiData.alunoId)
            .get();
          if (alunoDoc.exists && alunoDoc.data().escolaId) {
            updateData.escolaId = alunoDoc.data().escolaId;
            needsUpdate = true;
          } else {
            console.warn(
              `Aluno ${peiData.alunoId} para PEI ${doc.id} não encontrado ou sem escolaId. PEI não será atualizado com escolaId.`
            );
          }
        } else {
          console.warn(
            `PEI ${doc.id} sem alunoId. Não é possível determinar escolaId.`
          );
        }
      }

      // Se 'dataPrevistaTermino' está faltando (opcional, adicione se quiser)
      // if (!peiData.dataPrevistaTermino) {
      //   updateData.dataPrevistaTermino = admin.firestore.Timestamp.fromDate(new Date('2025-12-31')); // Exemplo
      //   needsUpdate = true;
      // }

      if (needsUpdate) {
        batch.update(peisRef.doc(doc.id), updateData);
        peisProcessed++;

        if (peisProcessed % batchSize === 0) {
          await batch.commit();
          console.log(`Commited ${peisProcessed} PEIs...`);
          batch = db.batch(); // Inicia novo batch
        }
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
