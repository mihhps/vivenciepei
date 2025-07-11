// src/utils/firebaseUtils.js ou src/services/firebaseUtils.js

import { db } from "../firebase"; // Ajuste o caminho conforme a localização do seu arquivo firebase.js
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";

// --- Função para obter o ID do aplicativo (se for usado) ---
// Esta função é uma forma de encapsular a lógica do __app_id.
// Se você não usa __app_id, pode simplificá-la ou removê-la.
const getAppId = () => {
  if (typeof __app_id !== "undefined") {
    return __app_id;
  }
  // Fallback para desenvolvimento local ou se __app_id não for injetado
  return "default-app-id";
};

// --- Função para buscar uma Avaliação de Interesses específica de um aluno ---
export const fetchAvaliacaoInteresses = async (alunoId, userId) => {
  if (!alunoId || !userId) {
    console.warn(
      "Aluno ID ou User ID ausente para buscar avaliação de interesses."
    );
    return null;
  }
  try {
    const appId = getAppId(); // Usando a função para obter o ID do app

    // Referência ao documento da avaliação de interesses
    const avaliacaoInteressesDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/avaliacoesInteresses`,
      alunoId
    );

    const avaliacaoInteressesDocSnap = await getDoc(avaliacaoInteressesDocRef);

    if (avaliacaoInteressesDocSnap.exists()) {
      // Retorna apenas a propriedade 'data' que contém as respostas do formulário
      const data = avaliacaoInteressesDocSnap.data().data;
      console.log("[FirebaseUtils] Avaliação de Interesses carregada:", data);
      return data;
    } else {
      console.log(
        "[FirebaseUtils] Nenhuma avaliação de interesses encontrada para o aluno:",
        alunoId
      );
      return null;
    }
  } catch (error) {
    console.error(
      "[FirebaseUtils] Erro ao buscar avaliação de interesses:",
      error
    );
    return null;
  }
};

// --- Função para buscar um Aluno por ID (útil para consistência) ---
export const fetchAlunoById = async (alunoId, userId) => {
  if (!alunoId || !userId) {
    console.warn("Aluno ID ou User ID ausente para buscar aluno.");
    return null;
  }
  try {
    const appId = getAppId();

    // 1. Tentar buscar o aluno no NOVO CAMINHO (user-specific)
    const newAlunoDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/alunos`,
      alunoId
    );
    const newAlunoDocSnap = await getDoc(newAlunoDocRef);

    if (newAlunoDocSnap.exists()) {
      return { id: newAlunoDocSnap.id, ...newAlunoDocSnap.data() };
    } else {
      // 2. Se não encontrado no novo caminho, tentar buscar no CAMINHO ANTIGO (raiz)
      const oldAlunoDocRef = doc(db, "alunos", alunoId);
      const oldAlunoDocSnap = await getDoc(oldAlunoDocRef);

      if (oldAlunoDocSnap.exists()) {
        return { id: oldAlunoDocSnap.id, ...oldAlunoDocSnap.data() };
      }
    }
    return null; // Aluno não encontrado em nenhum dos caminhos
  } catch (error) {
    console.error("[FirebaseUtils] Erro ao buscar aluno por ID:", error);
    return null;
  }
};

// --- Função para buscar os PEIs de um aluno ---
// Esta função é uma versão mais robusta do seu fetchPeis do gerarPDFCompleto.
export const fetchPeisByAluno = async (alunoId, alunoNome) => {
  try {
    let peis = [];
    const newCollectionRef = collection(db, "pei_contribucoes");
    const oldCollectionRef = collection(db, "peis");

    // Tentar buscar na coleção nova primeiro
    let qNew = query(
      newCollectionRef,
      where("alunoId", "==", alunoId),
      orderBy("dataCriacao", "desc")
    );
    let snapNew = await getDocs(qNew);

    if (!snapNew.empty) {
      peis = snapNew.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      // Se não houver na nova, tentar na antiga por ID do aluno
      let qOldById = query(
        oldCollectionRef,
        where("alunoId", "==", alunoId),
        orderBy("dataCriacao", "desc")
      );
      let snapOldById = await getDocs(qOldById);

      if (!snapOldById.empty) {
        peis = snapOldById.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } else {
        // Se ainda não encontrou, tentar na antiga por nome do aluno (fallback)
        // CUIDADO: Buscar por nome pode levar a ambiguidades se houver alunos com nomes iguais
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
    console.log(
      `[FirebaseUtils] Total de PEIs encontrados para ${alunoNome || alunoId}:`,
      peis.length
    );
    return peis;
  } catch (err) {
    console.error("[FirebaseUtils] Erro ao buscar PEIs por aluno:", err);
    return [];
  }
};
