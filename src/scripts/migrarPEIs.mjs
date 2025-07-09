// src/scripts/migrarPEIs.mjs

import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url"; // Necessário para __dirname
import { createRequire } from "module"; // Necessário para usar require em ES Modules
const require = createRequire(import.meta.url); // Cria uma função 'require' relativa a este arquivo .mjs

// ====================================================================================
// PASSO CRÍTICO 1: CAMINHO PARA A RAIZ DO PROJETO E PARA A CHAVE DO ADMIN SDK
// ====================================================================================
// Para scripts em Node.js rodando em ES Modules, definir a raiz é a forma mais robusta.
// Por favor, CONFIRME que este é o caminho EXATO no seu sistema.
const PROJECT_ROOT_PATH = "/Users/aeeemebolf/Documents/vivenciepei";

// Caminho para o seu arquivo de credenciais do Firebase Admin SDK.
// Assume que o arquivo está em PROJECT_ROOT_PATH/src/config/firebase-admin-sdk.json
// Exemplo: /Users/aeeemebolf/Documents/vivenciepei/src/config/firebase-admin-sdk.json
const SERVICE_ACCOUNT_KEY_PATH = path.join(
  PROJECT_ROOT_PATH,
  "src", // Entra na pasta src
  "config", // Entra na pasta config
  "firebase-admin-sdk.json"
);

// Tenta carregar o arquivo da chave da conta de serviço.
// O .mjs usa 'require' via createRequire, e path.join para construir o caminho.
let serviceAccount;
try {
  serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);
} catch (error) {
  console.error(
    "Erro: Não foi possível carregar o arquivo da chave da conta de serviço."
  );
  console.error(`Verifique se o arquivo está em: ${SERVICE_ACCOUNT_KEY_PATH}`);
  console.error(
    "Ou se o nome do arquivo e o caminho PROJECT_ROOT_PATH estão corretos."
  );
  process.exit(1); // Sai do script se não conseguir carregar a chave
}
// ====================================================================================

// Inicialize o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ====================================================================================
// PASSO CRÍTICO 2: DEFINA O NOME DA SUA COLEÇÃO DE PEIs NO FIRESTORE
// ====================================================================================
// SUBSTITUA 'peis' pelo nome exato da sua coleção no Firestore (você confirmou que é 'peis').
const PEIS_COLLECTION_NAME = "peis"; // <--- Confirmado: 'peis' minúsculo
// ====================================================================================

// Importa o mapeamento de habilidades.
// O caminho é relativo à raiz do projeto.
const { mapeamentoHabilidadesParaInfinitivo } = require(
  path.join(PROJECT_ROOT_PATH, "src", "data", "habilidadeMapeamento.js")
);

// ====================================================================================
// Lógica de Migração Principal
// ====================================================================================
async function migratePEIs() {
  console.log("------------------------------------------");
  console.log(
    `Iniciando a migração dos PEIs na coleção: '${PEIS_COLLECTION_NAME}'...`
  );
  console.log("------------------------------------------");

  const peisRef = db.collection(PEIS_COLLECTION_NAME);
  const snapshot = await peisRef.get();

  if (snapshot.empty) {
    console.log("Nenhum PEI encontrado para migrar nesta coleção.");
    return;
  }

  let peisMigrados = 0;
  let habilidadesAtualizadasTotal = 0;

  // Usar batch para operações mais eficientes em larga escala
  // Um batch pode ter até 500 operações de escrita
  let batch = db.batch(); // Declarado com 'let' para poder ser re-inicializado
  let batchCount = 0; // Contador para controlar o tamanho do batch

  for (const doc of snapshot.docs) {
    const peiData = doc.data();
    let peiModificado = false;
    let habilidadesAtualizadasDoc = 0;

    // === ADAPTE ESTA SEÇÃO ===
    // Esta é a lógica CORRETA para a sua estrutura de documentos PEI.
    // Conforme sua estrutura de exemplo, as habilidades estão dentro do array 'resumoPEI'.
    // Ex: { resumoPEI: [{ habilidade: "Anda com segurança...", ... }] }
    if (peiData.resumoPEI && Array.isArray(peiData.resumoPEI)) {
      // Itera sobre cada item no array 'resumoPEI'
      peiData.resumoPEI = peiData.resumoPEI.map((item) => {
        // Verifica se o item é um objeto e se possui a propriedade 'habilidade'
        if (item && typeof item === "object" && item.habilidade) {
          const habilidadeAntiga = item.habilidade;
          // Verifica se a habilidade antiga está no nosso mapeamento
          if (
            mapeamentoHabilidadesParaInfinitivo.hasOwnProperty(habilidadeAntiga)
          ) {
            item.habilidade =
              mapeamentoHabilidadesParaInfinitivo[habilidadeAntiga];
            peiModificado = true;
            habilidadesAtualizadasDoc++;
          }
        }
        return item; // Retorna o item (modificado ou não) para o novo array
      });
    }

    // Se o documento foi modificado, adiciona a atualização ao batch
    if (peiModificado) {
      batch.update(doc.ref, peiData); // Adiciona a atualização ao batch
      peisMigrados++;
      habilidadesAtualizadasTotal += habilidadesAtualizadasDoc;
      batchCount++;
      console.log(
        `PEI com ID '${doc.id}' marcado para atualização. ${habilidadesAtualizadasDoc} habilidades.`
      );

      // Comita o batch a cada 500 operações para evitar exceder o limite do Firestore
      if (batchCount === 500) {
        await batch.commit();
        console.log("Batch de 500 documentos comitado.");
        batch = db.batch(); // Inicia um novo batch
        batchCount = 0;
      }
    } else {
      console.log(`PEI com ID '${doc.id}' não precisou de migração.`);
    }
  }

  // Comita quaisquer operações restantes no batch
  if (batchCount > 0) {
    await batch.commit();
    console.log(`Batch final de ${batchCount} documentos comitado.`);
  }

  console.log("------------------------------------------");
  console.log(`Migração dos PEIs concluída.`);
  console.log(`${peisMigrados} PEIs foram modificados.`);
  console.log(
    `Um total de ${habilidadesAtualizadasTotal} habilidades foram atualizadas.`
  );
  console.log("------------------------------------------");
}

// Chama a função principal para executar a migração.
migratePEIs().catch((error) => {
  console.error("Erro fatal durante a migração dos PEIs:", error);
});
