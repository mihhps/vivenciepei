import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

const COLLECTIONS = {
  ALUNOS: "alunos",
  AVALIACOES_INICIAIS: "avaliacoesIniciais",
  PEIS: "PEIs",
};

export const fetchAlunos = async () => {
  const snapshot = await getDocs(collection(db, COLLECTIONS.ALUNOS));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const fetchAvaliacaoPorAluno = async (alunoId) => {
  const q = query(
    collection(db, COLLECTIONS.AVALIACOES_INICIAIS),
    where("alunoId", "==", alunoId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  // Retorna a avaliação mais recente
  return snapshot.docs
    .map((doc) => doc.data())
    .sort(
      (a, b) => (b.dataCriacao?.toDate() || 0) - (a.dataCriacao?.toDate() || 0)
    )[0];
};

const createOrUpdatePEI = async (alunoData, avaliacaoData, usuarioData) => {
  const currentYear = new Date().getFullYear();
  const peiData = {
    alunoId: alunoData.id,
    aluno: alunoData.nome,
    escolaId: alunoData.escolaId,
    anoLetivo: currentYear,
    status: "em elaboração",
    dataCriacao: Timestamp.now(),
    dataInicio: avaliacaoData.inicio || null,
    dataPrevistaTermino: avaliacaoData.proximaAvaliacao || null,
    criadorId: usuarioData.email || "",
    nomeCriador: usuarioData.nome || "Desconhecido",
    cargoCriador: usuarioData.cargo || "Desconhecido",
  };

  const peiRef = collection(db, COLLECTIONS.PEIS);
  const q = query(
    peiRef,
    where("alunoId", "==", alunoData.id),
    where("anoLetivo", "==", currentYear)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    await updateDoc(snapshot.docs[0].ref, peiData);
  } else {
    await addDoc(peiRef, peiData);
  }
};

export const salvarAvaliacao = async (avaliacaoData, aluno, usuarioLogado) => {
  const ref = collection(db, COLLECTIONS.AVALIACOES_INICIAIS);
  const q = query(ref, where("alunoId", "==", aluno.id));
  const snapshot = await getDocs(q);

  const dadosParaSalvar = {
    ...avaliacaoData,
    alunoId: aluno.id,
    aluno: aluno.nome,
    criadoPor: usuarioLogado.nome || "Desconhecido",
    cargoCriador: usuarioLogado.cargo || "Desconhecido",
    criadorId: usuarioLogado.email || "",
    dataCriacao: Timestamp.now(),
  };

  if (!snapshot.empty) {
    await updateDoc(snapshot.docs[0].ref, dadosParaSalvar);
  } else {
    await addDoc(ref, dadosParaSalvar);
  }

  // Após salvar, cria ou atualiza o PEI
  await createOrUpdatePEI(aluno, dadosParaSalvar, usuarioLogado);
};
