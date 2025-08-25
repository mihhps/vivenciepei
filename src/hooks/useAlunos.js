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
      return;
    }

    setCarregando(true);
    setErro(null);
    let fetchedAlunos = [];
    const firestore = getFirestore(app);
    const temAcessoAmplo = perfisComAcessoAmplo.includes(usuarioLogado.perfil);

    try {
      let mainAlunosQuery = collection(firestore, "alunos");

      const turmasDoProfessorPadronizadas = usuarioLogado.turmas;

      if (temAcessoAmplo) {
        // A consulta não precisa de filtro
      } else if (turmasDoProfessorPadronizadas.length > 0) {
        mainAlunosQuery = query(
          mainAlunosQuery,
          where("turma", "in", turmasDoProfessorPadronizadas)
        );
      } else {
        setAlunos([]);
        setCarregando(false);
        return;
      }

      const querySnapshot = await getDocs(mainAlunosQuery);
      querySnapshot.forEach((doc) => {
        fetchedAlunos.push({ id: doc.id, ...doc.data() });
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
