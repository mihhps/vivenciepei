const admin = require("firebase-admin");
const serviceAccount = require("./chave-firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ID da escola que você quer vincular
const escolaId = "XJupQ5zgJ4Ch3OJcUvmD";

async function corrigirProfessores() {
  const escolaSnap = await db.collection("escolas").doc(escolaId).get();

  if (!escolaSnap.exists) {
    console.error("Escola não encontrada. Verifique o ID.");
    return;
  }

  const escolaNome = escolaSnap.data().nome;
  const snap = await db.collection("usuarios").get();
  let atualizados = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    // Somente se for perfil de professor
    if (data.perfil !== "professor") continue;

    let precisaAtualizar = false;
    let novasEscolas = data.escolas || {};
    let atualizacoes = {};

    if (typeof novasEscolas !== "object") {
      novasEscolas = {};
    }

    if (!novasEscolas[escolaId]) {
      novasEscolas[escolaId] = true;
      precisaAtualizar = true;
    }

    if (!data.escolaNome || data.escolaNome !== escolaNome) {
      atualizacoes.escolaNome = escolaNome;
      precisaAtualizar = true;
    }

    if (precisaAtualizar) {
      atualizacoes.escolas = novasEscolas;

      await db.collection("usuarios").doc(doc.id).update(atualizacoes);
      atualizados++;
      console.log(`Corrigido: ${data.nome || doc.id}`);
    }
  }

  console.log(`\nTotal de professores corrigidos: ${atualizados}`);
}

corrigirProfessores().catch(console.error);