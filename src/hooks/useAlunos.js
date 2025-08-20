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
    return {
      ...user,
      perfil: user.perfil?.toLowerCase()?.trim(),
      turmas,
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

  // Primeiro useEffect para autenticação
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

  const fetchAlunos = useCallback(async () => {
    if (!authReady || !userId || !appId) {
      // Se a autenticação não estiver pronta, não faz nada
      return;
    }

    setCarregando(true);
    setErro(null);
    let fetchedAlunos = [];
    const firestore = getFirestore(app);
    const temAcessoAmplo = perfisComAcessoAmplo.includes(usuarioLogado.perfil);

    try {
      // Array para armazenar as promessas de busca
      const queryPromises = [];
      const alunosIds = new Set();

      // Busca da coleção principal de alunos
      let mainAlunosQuery = collection(firestore, "alunos");

      if (!temAcessoAmplo && usuarioLogado.turmas.length > 0) {
        mainAlunosQuery = query(
          mainAlunosQuery,
          where("turma", "in", usuarioLogado.turmas)
        );
      } else if (!temAcessoAmplo && usuarioLogado.turmas.length === 0) {
        // Professor sem turmas, não há alunos
        setAlunos([]);
        setCarregando(false);
        return;
      }

      queryPromises.push(getDocs(mainAlunosQuery));

      // Busca da coleção user-specific
      const userAlunosCollectionRef = collection(
        firestore,
        `artifacts/${appId}/users/${userId}/alunos`
      );
      queryPromises.push(getDocs(userAlunosCollectionRef));

      const [mainAlunosSnapshot, userAlunosSnapshot] =
        await Promise.all(queryPromises);

      // Processa alunos da coleção principal
      mainAlunosSnapshot.forEach((doc) => {
        const aluno = { id: doc.id, ...doc.data() };
        if (!alunosIds.has(aluno.id)) {
          fetchedAlunos.push(aluno);
          alunosIds.add(aluno.id);
        }
      });

      // Processa alunos da coleção user-specific
      userAlunosSnapshot.forEach((doc) => {
        const aluno = { id: doc.id, ...doc.data() };
        if (!alunosIds.has(aluno.id)) {
          fetchedAlunos.push(aluno);
          alunosIds.add(aluno.id);
        }
      });

      setAlunos(fetchedAlunos);
    } catch (err) {
      console.error("Erro ao carregar alunos do Firebase:", err);
      setErro("Não foi possível carregar a lista de alunos.");
    } finally {
      setCarregando(false);
    }
  }, [authReady, userId, appId, usuarioLogado.perfil, usuarioLogado.turmas]);

  useEffect(() => {
    fetchAlunos();
  }, [fetchAlunos]);

  return { alunos, carregando, erro };
}
