// atualizarAlunos.js
const admin = require("firebase-admin");
const serviceAccount = require("./chave-firebase.json"); // baixe essa chave no Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function atualizarTodosOsAlunos() {
  const escolaId = "XJupQ5zgJ4Ch3OJcUvmD"; // ID da escola que você quer vincular

  const snapshot = await db.collection("alunos").get();

  const batch = db.batch();
  snapshot.forEach((doc) => {
    const ref = db.collection("alunos").doc(doc.id);
    batch.update(ref, { escolaId });
  });

  await batch.commit();
  console.log("Todos os alunos foram atualizados com a escola.");
}

atualizarTodosOsAlunos().catch(console.error);