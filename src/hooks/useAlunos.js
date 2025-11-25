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
import { useUserSchool } from "./useUserSchool"; // O hook que já corrigimos

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
    // Assegura que as turmas lidas do localStorage sejam normalizadas
    const turmasPadronizadas = turmas
      .map((t) => normalizarTurma(t))
      .filter((t) => t);

    return {
      ...user,
      perfil: user.perfil?.toLowerCase()?.trim(),
      turmas: turmasPadronizadas, // Esta array será usada para filtrar os alunos
      escolasVinculadasIds,
    };
  } catch (e) {
    console.error("Erro ao fazer parse do usuário logado:", e);
    return {};
  }
};

export function useAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [appId, setAppId] = useState(null);

  // Obtém as turmas do professor logado (e outros dados)
  const usuarioLogado = useMemo(() => getUsuarioLogado(), []);

  // Pega o estado completo do hook useUserSchool
  const { userSchoolId, isLoadingUserSchool, canViewAllSchools } =
    useUserSchool();

  // ------------------------------------
  // 1. Lógica de Autenticação
  // ------------------------------------
  useEffect(() => {
    const authInstance = getAuth(app);
    let unsubscribe = null;

    const setupAuth = async () => {
      unsubscribe = onAuthStateChanged(authInstance, async (user) => {
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
    };
    setupAuth();

    setAppId(typeof __app_id !== "undefined" ? __app_id : "default-app-id");

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // ------------------------------------
  // 2. Lógica de Busca de Alunos (Com Filtro de Turma)
  // ------------------------------------
  useEffect(() => {
    const fetchAlunos = async () => {
      setCarregando(true);
      setErro(null);

      // Aguarda a autenticação e o carregamento dos dados da escola
      if (!authReady || isLoadingUserSchool) {
        return;
      }

      try {
        const firestore = getFirestore(app);
        const alunoCollection = collection(firestore, "alunos");
        let q = null; // Inicializa a query como null

        // Se o usuário tem acesso a todas as escolas (desenvolvedor, SEME, etc.)
        if (canViewAllSchools) {
          q = alunoCollection; // Busca todos sem filtros
        }
        // Se o usuário tem acesso restrito (professor) E tem um ID de escola
        else if (userSchoolId) {
          const filtros = [];

          // FILTRO OBRIGATÓRIO 1: Filtrar por escola
          filtros.push(where("escolaId", "==", userSchoolId));

          // FILTRO 2: Filtrar por turmas se o professor estiver associado a elas
          const turmasDoProfessor = usuarioLogado.turmas;

          if (turmasDoProfessor && turmasDoProfessor.length > 0) {
            // O operador 'in' (onde o campo 'turma' do aluno está em uma das turmas do professor)
            // IMPORTANTE: A lista de turmas não pode ter mais de 10 itens para o operador 'in'.
            // Além disso, o campo 'turma' no Firestore precisa estar salvo no mesmo formato
            // que as turmas normalizadas (ex: "5º Ano A").
            filtros.push(where("turma", "in", turmasDoProfessor));
          } else {
            // Se o usuário é restrito (não canViewAllSchools) e não tem turmas associadas,
            // não deve ver nenhum aluno.
            setAlunos([]);
            setCarregando(false);
            return;
          }

          q = query(alunoCollection, ...filtros);
        } else {
          // Usuário restrito sem ID de escola definido. Não deve carregar alunos.
          setAlunos([]);
          setCarregando(false);
          return;
        }

        // Se a query foi montada (q não é null)
        if (q) {
          const querySnapshot = await getDocs(q);
          const alunosData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAlunos(alunosData);
        }
      } catch (error) {
        console.error("Erro ao buscar alunos:", error);
        setErro("Não foi possível carregar a lista de alunos.");
      } finally {
        setCarregando(false);
      }
    };

    fetchAlunos();
  }, [
    authReady,
    isLoadingUserSchool,
    userSchoolId,
    canViewAllSchools,
    usuarioLogado.turmas,
  ]); // Adicionada a dependência das turmas

  return { alunos, carregando, erro };
}
