// migrateFirestore.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import admin from "firebase-admin";
import { mapeamentoHabilidadesParaInfinitivo } from "../data/habilidadeMapeamento.js";

const serviceAccount = require("../../functions/serviceAccountKey.json");
// Nome da sua coleção de avaliações no Firestore
const AVALIACOES_COLLECTION_NAME = "avaliacoesIniciais"; // Confirme este nome no seu Firestore!

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateAvaliacoes() {
  console.log("------------------------------------------");
  console.log("Iniciando a migração de avaliações no Firestore...");
  console.log("------------------------------------------");

  // Use um batch para atualizações mais eficientes e para evitar muitas writes individuais
  const batch = db.batch();
  let documentosAtualizadosCount = 0;
  let totalDocumentos = 0;

  try {
    const snapshot = await db.collection(AVALIACOES_COLLECTION_NAME).get();

    if (snapshot.empty) {
      console.log(
        "Nenhum documento de avaliação encontrado na coleção. Nada para migrar."
      );
      return;
    }

    totalDocumentos = snapshot.size;
    console.log(
      `Encontrados ${totalDocumentos} documentos de avaliação para verificar.`
    );

    snapshot.forEach((doc) => {
      const avaliacaoData = doc.data();
      // Faça uma cópia profunda para evitar mutação direta do objeto original do Firestore antes da atualização
      let respostasAtualizadas = JSON.parse(
        JSON.stringify(avaliacaoData.respostas || {})
      );
      let mudouNoDocumento = false;

      // Iterar sobre as áreas (ex: "Desenvolvimento Global", "Acadêmico e Socioemocional")
      for (const area in respostasAtualizadas) {
        if (
          respostasAtualizadas.hasOwnProperty(area) &&
          typeof respostasAtualizadas[area] === "object" &&
          respostasAtualizadas[area] !== null
        ) {
          const habilidadesDaArea = respostasAtualizadas[area];
          let novasHabilidadesDaArea = {}; // Objeto temporário para construir as novas chaves/valores da área

          // Iterar sobre as habilidades dentro de cada área
          for (const habilidadeAntiga in habilidadesDaArea) {
            if (habilidadesDaArea.hasOwnProperty(habilidadeAntiga)) {
              const nivel = habilidadesDaArea[habilidadeAntiga];

              // Verifica se a habilidade antiga existe no nosso mapeamento
              if (mapeamentoHabilidadesParaInfinitivo[habilidadeAntiga]) {
                const habilidadeNova =
                  mapeamentoHabilidadesParaInfinitivo[habilidadeAntiga];
                novasHabilidadesDaArea[habilidadeNova] = nivel; // Usa a nova chave
                mudouNoDocumento = true; // Marca que este documento precisa de atualização
              } else {
                // Se a habilidade não está no mapeamento (já está correta ou não mudou), mantenha-a
                novasHabilidadesDaArea[habilidadeAntiga] = nivel;
              }
            }
          }
          respostasAtualizadas[area] = novasHabilidadesDaArea; // Atribui o novo mapa de habilidades à área
        }
      }

      // Se houve alguma mudança neste documento, adicione-o ao batch para atualização
      if (mudouNoDocumento) {
        batch.update(doc.ref, { respostas: respostasAtualizadas });
        documentosAtualizadosCount++;
        console.log(
          `  > Documento '${doc.id}' do aluno '${avaliacaoData.aluno}' marcado para atualização.`
        );
      }
    });

    if (documentosAtualizadosCount > 0) {
      console.log(
        `\nConfirmando ${documentosAtualizadosCount} atualizações no Firestore...`
      );
      await batch.commit(); // Executa todas as atualizações em um único lote
      console.log(
        "------------------------------------------------------------------"
      );
      console.log(
        `Migração concluída com sucesso! ${documentosAtualizadosCount} documentos foram atualizados.`
      );
      console.log(
        "------------------------------------------------------------------"
      );
    } else {
      console.log(
        "\nNenhum documento precisou de atualização. Suas avaliações já estão no formato mais recente."
      );
    }
  } catch (error) {
    console.error("------------------------------------------");
    console.error("ERRO GRAVE DURANTE A MIGRAÇÃO:", error);
    console.error("------------------------------------------");
  } finally {
    // É uma boa prática sair do processo após a migração
    process.exit(0);
  }
}

// Inicia a função de migração
migrateAvaliacoes();
