import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth";
import { app } from "../firebase";
import { useUserSchool } from "./useUserSchool"; // Importa o hook corrigido

// === FUNÇÃO DE NORMALIZAÇÃO ===
const normalizarTurma = (turma) => {
  if (typeof turma !== "string" || turma.trim() === "") {
    return null;
  }
  const palavrasPadrao = {
    pré: "Pré",
    pe: "Pré",
    i: "I",
    ii: "II",
    a: "A",
    b: "B",
    ano: "Ano",
  };
  const partes = turma.trim().toLowerCase().split(" ");
  const partesCorrigidas = partes.map((palavra) => {
    if (palavrasPadrao[palavra]) {
      return palavrasPadrao[palavra];
    }
    if (
      palavra.length > 0 &&
      palavra !== "de" &&
      palavra !== "do" &&
      palavra !== "da"
    ) {
      return palavra[0].toUpperCase() + palavra.substr(1);
    }
    return palavra;
  });
  return partesCorrigidas.join(" ");
};
// === FIM DA FUNÇÃO DE NORMALIZAÇÃO ===

const getUsuarioLogado = () => {
  try {
    const user = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
    const turmas =
      user?.turmas && typeof user.turmas === "object"
        ? Object.keys(user.turmas)
        : [];
    const escolasVinculadasIds =
      user?.escolas && typeof user.escolas === "object"
        ? Object.keys(user.escolas)
        : [];
    const turmasPadronizadas = turmas.map((t) => normalizarTurma(t));

    return {
      ...user,
      perfil: user.perfil?.toLowerCase()?.trim(),
      turmas: turmasPadronizadas,
      escolasVinculadasIds,
    };
  } catch (e) {
    console.error("Erro ao fazer parse do usuário logado:", e);
    return {};
  }
};

const perfisComAcessoAmplo = ["desenvolvedor", "seme", "gestao", "aee"];

export function useAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [appId, setAppId] = useState(null);

  const usuarioLogado = useMemo(() => getUsuarioLogado(), []);

  // ✅ NOVO: Usamos o hook que já corrigimos para obter o ID da escola e o estado de carregamento
  const { userSchoolId, isLoadingUserSchool } = useUserSchool();

  useEffect(() => {
    const authInstance = getAuth(app);
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        if (typeof __initial_auth_token !== "undefined") {
          await signInWithCustomToken(authInstance, __initial_auth_token);
        } else {
          await signInAnonymously(authInstance);
        }
        setUserId(authInstance.currentUser?.uid || crypto.randomUUID());
      }
      setAuthReady(true);
    });

    setAppId(typeof __app_id !== "undefined" ? __app_id : "default-app-id");

    return () => unsubscribe();
  }, []);

  // ✅ CORREÇÃO: A lógica de busca de alunos foi movida para um useEffect separado
  // que depende dos dados do useUserSchool.
  useEffect(() => {
    const fetchAlunos = async () => {
      setCarregando(true);
      setErro(null);

      // Só tenta buscar os alunos se a escola já foi identificada e não está carregando
      if (userSchoolId && !isLoadingUserSchool) {
        try {
          // ✅ LÓGICA CORRIGIDA: Usa o ID da escola para buscar todos os alunos
          const firestore = getFirestore(app);
          const q = query(
            collection(firestore, "alunos"),
            where("escolaId", "==", userSchoolId)
          );
          const querySnapshot = await getDocs(q);
          const alunosData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAlunos(alunosData);
          setCarregando(false);
        } catch (error) {
          console.error("Erro ao buscar alunos:", error);
          setErro("Não foi possível carregar a lista de alunos.");
          setCarregando(false);
        }
      } else if (!userSchoolId && !isLoadingUserSchool) {
        setAlunos([]);
        setCarregando(false);
      }
    };

    fetchAlunos();
  }, [userSchoolId, isLoadingUserSchool]); // Re-executa a busca quando o ID da escola muda.

  return { alunos, carregando, erro };
}
