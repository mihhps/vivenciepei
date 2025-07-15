// Arquivo: src/utils/firebaseUtils.js

import { db } from "../firebase"; // Ajuste o caminho conforme necessário
import {
  doc,
  getDoc,
  collection,
  collectionGroup, // Importação necessária para a busca global
  query,
  where,
  getDocs,
  orderBy,
  limit, // Importação para pegar apenas o resultado mais recente
} from "firebase/firestore";

// --- Função para obter o ID do aplicativo ---
const getAppId = () => {
  return typeof __app_id !== "undefined" ? __app_id : "default-app-id";
};

/**
 * Busca a avaliação de interesses de um aluno.
 * - Se o perfil for administrativo ('dev', 'seme', etc.), busca globalmente em todos os usuários.
 * - Caso contrário, busca apenas no caminho do usuário logado.
 *
 * @param {string} alunoId - O ID do aluno.
 * @param {string} userId - O ID do usuário logado.
 * @param {string} userProfile - O perfil do usuário logado (ex: 'desenvolvedor', 'professor').
 * @returns {Promise<Object>} Um objeto com os dados do formulário da avaliação ou um objeto vazio.
 */
export const fetchAvaliacaoInteresses = async (
  alunoId,
  userId,
  userProfile
) => {
  if (!alunoId) {
    console.warn("[FirebaseUtils] Aluno ID ausente. Retornando objeto vazio.");
    return {};
  }

  const appId = getAppId();
  // Lista de perfis que podem ver avaliações de qualquer usuário
  const adminProfiles = ["desenvolvedor", "dev", "seme", "gestao", "diretor"];

  try {
    // 1. LÓGICA PARA PERFIS ADMINISTRATIVOS (DEV)
    if (userProfile && adminProfiles.includes(userProfile.toLowerCase())) {
      console.log(
        `[FirebaseUtils] Perfil '${userProfile}': Iniciando busca GLOBAL para aluno ${alunoId}.`
      );

      const q = query(
        collectionGroup(db, "avaliacoesInteresses"),
        where("alunoId", "==", alunoId),
        orderBy("dataAvaliacao", "desc"),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        console.log(
          "[FirebaseUtils] Avaliação encontrada via busca GLOBAL. Salva por:",
          docData.salvoPor
        );
        return docData.data || {};
      }

      console.log(
        "[FirebaseUtils] Nenhuma avaliação encontrada na busca GLOBAL. Tentando busca local como fallback."
      );
    }

    // 2. LÓGICA PARA USUÁRIOS PADRÃO (ou como fallback para admins)
    if (userId) {
      console.log(
        `[FirebaseUtils] Tentando busca LOCAL no caminho do usuário: ${userId}`
      );
      const docRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/avaliacoesInteresses`,
        alunoId
      );
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("[FirebaseUtils] Avaliação encontrada via busca LOCAL.");
        return docSnap.data().data || {};
      }
    }

    // 3. Se não encontrou em nenhum lugar
    console.log(
      "[FirebaseUtils] Avaliação de interesses não encontrada para o aluno:",
      alunoId
    );
    return {};
  } catch (error) {
    console.error(
      "[FirebaseUtils] Erro crítico ao buscar avaliação de interesses:",
      error
    );
    // Se o erro for de índice, esta mensagem aparecerá na consola com um link para o criar.
    if (error.code === "failed-precondition") {
      console.error(
        "CAUSA PROVÁVEL: Falta um índice no Firestore. Verifique a consola de erros do Firebase para um link de criação de índice."
      );
    }
    return {};
  }
};

// As outras funções permanecem as mesmas
export const fetchAlunoById = async (alunoId, userId) => {
  if (!alunoId || !userId) {
    return null;
  }
  try {
    const appId = getAppId();
    const newAlunoDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/alunos`,
      alunoId
    );
    const newAlunoDocSnap = await getDoc(newAlunoDocRef);

    if (newAlunoDocSnap.exists()) {
      return { id: newAlunoDocSnap.id, ...newAlunoDocSnap.data() };
    } else {
      const oldAlunoDocRef = doc(db, "alunos", alunoId);
      const oldAlunoDocSnap = await getDoc(oldAlunoDocRef);
      if (oldAlunoDocSnap.exists()) {
        return { id: oldAlunoDocSnap.id, ...oldAlunoDocSnap.data() };
      }
    }
    return null;
  } catch (error) {
    console.error("[FirebaseUtils] Erro ao buscar aluno por ID:", error);
    return null;
  }
};

export const fetchPeisByAluno = async (alunoId, alunoNome) => {
  try {
    let peis = [];
    const newCollectionRef = collection(db, "pei_contribucoes");
    const oldCollectionRef = collection(db, "peis");

    let qNew = query(
      newCollectionRef,
      where("alunoId", "==", alunoId),
      orderBy("dataCriacao", "desc")
    );
    let snapNew = await getDocs(qNew);

    if (!snapNew.empty) {
      peis = snapNew.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      let qOldById = query(
        oldCollectionRef,
        where("alunoId", "==", alunoId),
        orderBy("dataCriacao", "desc")
      );
      let snapOldById = await getDocs(qOldById);

      if (!snapOldById.empty) {
        peis = snapOldById.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } else {
        if (alunoNome) {
          let qOldByName = query(
            oldCollectionRef,
            where("aluno", "==", alunoNome),
            orderBy("dataCriacao", "desc")
          );
          let snapOldByName = await getDocs(qOldByName);
          if (!snapOldByName.empty) {
            peis = snapOldByName.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
          }
        }
      }
    }
    return peis;
  } catch (err) {
    console.error("[FirebaseUtils] Erro ao buscar PEIs por aluno:", err);
    return [];
  }
};
