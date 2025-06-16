// functions/setAdmin.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Mantenha este arquivo seguro!

const targetUID = "W4iih9DuDPfztgUWN3T34Pt4ZPE3"; // SEU UID AQUI!
const adminProfile = "desenvolvedor"; // Mantenha consistente com seu perfil

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log(`Iniciando configuração de claims para o UID: ${targetUID}...`);

admin
  .auth()
  .getUser(targetUID)
  .then((userRecord) => {
    const currentClaims = userRecord.customClaims || {};
    const newClaims = {
      ...currentClaims,
      admin: true, // Garante que a claim de admin é TRUE
      perfil: adminProfile, // Garante que o perfil está correto
    };
    return admin.auth().setCustomUserClaims(targetUID, newClaims);
  })
  .then(() => {
    console.log(`SUCESSO: Claims atualizadas para o UID: ${targetUID}.`);
    return admin.auth().getUser(targetUID); // Verifica as claims após a atualização
  })
  .then((userRecord) => {
    console.log("Claims do usuário após atualização:", userRecord.customClaims);
    process.exit(0);
  })
  .catch((error) => {
    console.error("ERRO ao definir custom claim:", error);
    process.exit(1);
  });
