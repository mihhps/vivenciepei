// functions/customClaims.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(); // É importante que o admin SDK seja inicializado em cada arquivo de função

/**
 * Gatilho: onDocumentWritten em 'usuarios/{userId}'.
 * Verifica se o perfil do usuário foi alterado e define/atualiza a custom claim 'perfil' no token de ID.
 * Esta função garante que a custom claim 'perfil' no token de autenticação do usuário reflita o perfil salvo no Firestore.
 */
exports.setCustomUserClaimsOnProfileUpdate = functions.firestore
  .document("usuarios/{userId}")
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Caso de deleção ou perfil removido
    if (!afterData || !afterData.perfil) {
      if (beforeData?.perfil) {
        // Se tinha perfil antes e agora não tem
        try {
          await admin.auth().setCustomUserClaims(userId, { perfil: null }); // Remove a claim
          functions.logger.log(
            `[setCustomClaims] Custom claim 'perfil' removida para o usuário: ${userId}`
          );
        } catch (error) {
          functions.logger.error(
            `[setCustomClaims] Erro ao remover custom claim para ${userId}:`,
            error
          );
        }
      }
      return null;
    }

    // Caso de criação ou atualização de perfil
    if (beforeData?.perfil !== afterData.perfil) {
      try {
        await admin
          .auth()
          .setCustomUserClaims(userId, { perfil: afterData.perfil });
        functions.logger.log(
          `[setCustomClaims] Custom claim 'perfil' definida para o usuário ${userId}: ${afterData.perfil}`
        );
      } catch (error) {
        functions.logger.error(
          `[setCustomClaims] Erro ao definir custom claim para ${userId}:`,
          error
        );
      }
    }

    return null;
  });
