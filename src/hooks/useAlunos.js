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

  // ✅ CORREÇÃO: Pega o estado completo do hook useUserSchool, incluindo o canViewAllSchools
  const { userSchoolId, isLoadingUserSchool, canViewAllSchools } =
    useUserSchool();

  useEffect(() => {
    const authInstance = getAuth(app);
    let unsubscribe = null; // A variável agora está fora da função para ser acessível no retorno

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
      // ✅ CORREÇÃO: Verifica se a variável unsubscribe não é nula antes de chamá-la
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // Dependência vazia, roda apenas uma vez

  // ✅ CORREÇÃO: Lógica de busca de alunos
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
        let q;

        // ✅ LÓGICA DE BUSCA: Lida com perfis que veem todas as escolas ou uma única
        if (canViewAllSchools) {
          q = collection(firestore, "alunos");
        } else if (userSchoolId) {
          q = query(
            collection(firestore, "alunos"),
            where("escolaId", "==", userSchoolId)
          );
        } else {
          // Se o perfil não tem acesso a todas e não tem ID de escola, retorna uma lista vazia
          setAlunos([]);
          setCarregando(false);
          return;
        }

        const querySnapshot = await getDocs(q);
        const alunosData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAlunos(alunosData);
      } catch (error) {
        console.error("Erro ao buscar alunos:", error);
        setErro("Não foi possível carregar a lista de alunos.");
      } finally {
        setCarregando(false);
      }
    };

    fetchAlunos();
  }, [authReady, isLoadingUserSchool, userSchoolId, canViewAllSchools]); // Re-executa a busca quando as dependências mudam

  return { alunos, carregando, erro };
}
