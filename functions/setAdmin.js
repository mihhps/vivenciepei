// functions/setAdmin.js

const admin = require("firebase-admin");

// O caminho para o arquivo JSON da sua conta de serviço
// Certifique-se de que o nome do arquivo JSON que você baixou está correto
const serviceAccount = require("./serviceAccountKey.json");

// O UID do usuário que você quer tornar administrador
// Substitua 'W4iih9DuDPfztgUWN3T34Pt4ZPE3' pelo UID EXATO que você obteve do console do navegador
const targetUID = "W4iih9DuDPfztgUWN3T34Pt4ZPE3";

// Inicializa o Firebase Admin SDK com a conta de serviço
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log(`Definindo custom claim 'admin: true' para o UID: ${targetUID}...`);

admin
  .auth()
  .setCustomUserClaims(targetUID, { admin: true })
  .then(() => {
    console.log(
      `SUCESSO: Custom claim 'admin: true' definido para o UID: ${targetUID}`
    );
    // Opcional: Para verificar imediatamente se o claim foi aplicado
    return admin.auth().getUser(targetUID);
  })
  .then((userRecord) => {
    console.log("Claims do usuário após atualização:", userRecord.customClaims);
    process.exit(0); // Sai do script com sucesso
  })
  .catch((error) => {
    console.error("ERRO ao definir custom claim:", error);
    process.exit(1); // Sai do script com erro
  });
