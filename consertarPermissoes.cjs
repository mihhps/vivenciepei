// consertarPermissoes.js
const admin = require("firebase-admin");

// IMPORTANTE: Baixe este arquivo no Passo 2
const serviceAccount = require("./admin-credentials.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function consertarPermissoes() {
  console.log("Iniciando a busca por usuários no Firestore...");

  const usuariosSnapshot = await db.collection("usuarios").get();

  if (usuariosSnapshot.empty) {
    console.log('Nenhum usuário encontrado na coleção "usuarios".');
    return;
  }

  let contador = 0;
  for (const doc of usuariosSnapshot.docs) {
    const usuarioData = doc.data();
    const uid = usuarioData.uid;
    const perfil = usuarioData.perfil;

    if (!uid || !perfil) {
      console.log(`- Ignorando documento ${doc.id} por não ter UID ou perfil.`);
      continue;
    }

    try {
      // Define a permissão (custom claim) na Autenticação do usuário
      await auth.setCustomUserClaims(uid, { perfil: perfil });
      console.log(
        `✅ Sucesso! Permissão '{ perfil: "${perfil}" }' definida para o usuário: ${usuarioData.nome} (${uid})`
      );
      contador++;
    } catch (error) {
      console.error(
        `❌ Erro ao definir permissão para ${usuarioData.nome} (${uid}):`,
        error.message
      );
    }
  }

  console.log(
    `\nConcluído! ${contador} usuários foram atualizados com sucesso.`
  );
}

consertarPermissoes().catch(console.error);
