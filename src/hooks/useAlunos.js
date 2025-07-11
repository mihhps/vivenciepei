// src/hooks/useAlunos.js
import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth";
import { app } from "../firebase"; // Importa a instância 'app' do seu firebase.js

export function useAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [userId, setUserId] = useState(null);
  const [appId, setAppId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // --- Efeito para inicializar Auth e obter userId/appId ---
  useEffect(() => {
    const authInstance = getAuth(app); // Usa a instância 'app' importada

    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // Tenta fazer login anonimamente ou com custom token se disponível
        if (typeof __initial_auth_token !== "undefined") {
          await signInWithCustomToken(authInstance, __initial_auth_token);
        } else {
          await signInAnonymously(authInstance);
        }
        setUserId(authInstance.currentUser?.uid || crypto.randomUUID()); // Fallback para anônimo
      }
      setIsAuthReady(true); // O estado de autenticação está pronto
    });

    setAppId(typeof __app_id !== "undefined" ? __app_id : "default-app-id");

    return () => unsubscribe(); // Limpa o listener de autenticação
  }, []); // Executa apenas uma vez na montagem

  // --- Efeito para buscar alunos do Firebase (ambos os caminhos) ---
  useEffect(() => {
    const fetchAlunos = async () => {
      // Espera que a autenticação esteja pronta e os IDs definidos
      if (!isAuthReady || !userId || !appId) {
        // console.log("useAlunos: Aguardando autenticação ou IDs...", { isAuthReady, userId, appId });
        return;
      }

      setCarregando(true);
      setErro(null);
      let fetchedAlunos = [];
      const firestore = getFirestore(app); // Obtém a instância do Firestore usando o 'app'

      try {
        // 1. Buscar alunos do CAMINHO ANTIGO (coleção raiz 'alunos')
        const oldAlunosCollectionRef = collection(firestore, "alunos");
        const oldAlunosSnapshot = await getDocs(oldAlunosCollectionRef);
        oldAlunosSnapshot.forEach((doc) => {
          fetchedAlunos.push({ id: doc.id, ...doc.data() });
        });
        console.log(
          "useAlunos: Alunos do caminho antigo (raiz):",
          oldAlunosSnapshot.docs.length
        );

        // 2. Buscar alunos do NOVO CAMINHO (user-specific)
        const newAlunosCollectionRef = collection(
          firestore,
          `artifacts/${appId}/users/${userId}/alunos`
        );
        const newAlunosSnapshot = await getDocs(newAlunosCollectionRef);
        newAlunosSnapshot.forEach((doc) => {
          // Adicionar apenas se o aluno não foi encontrado no caminho antigo (para evitar duplicatas por ID)
          if (!fetchedAlunos.some((a) => a.id === doc.id)) {
            fetchedAlunos.push({ id: doc.id, ...doc.data() });
          }
        });
        console.log(
          "useAlunos: Alunos do caminho novo (user-specific):",
          newAlunosSnapshot.docs.length
        );
        console.log(
          "useAlunos: Total de alunos após combinar (e remover duplicatas):",
          fetchedAlunos.length
        );

        setAlunos(fetchedAlunos);
      } catch (err) {
        console.error("Erro ao carregar alunos do Firebase:", err);
        setErro("Não foi possível carregar a lista de alunos.");
      } finally {
        setCarregando(false);
      }
    };

    fetchAlunos();
  }, [isAuthReady, userId, appId]); // Re-executa a busca quando esses estados mudam

  return { alunos, carregando, erro };
}
