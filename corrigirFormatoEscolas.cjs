const admin = require("firebase-admin");
const serviceAccount = require("./chave-firebase.json"); // caminho certo para a raiz

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function corrigirFormatoEscolas() {
  const snap = await db.collection("usuarios").get();
  let corrigidos = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    if (data.perfil === "professor" && Array.isArray(data.escolas)) {
      const novasEscolas = {};
      data.escolas.forEach(id => {
        if (typeof id === "string") {
          novasEscolas[id] = true;
        }
      });

      await db.collection("usuarios").doc(doc.id).update({
        escolas: novasEscolas
      });

      corrigidos++;
      console.log(`Corrigido: ${data.nome || doc.id}`);
    }
  }

  console.log(`\nTotal de professores com 'escolas' convertidos para objeto: ${corrigidos}`);
}

corrigirFormatoEscolas().catch(console.error);