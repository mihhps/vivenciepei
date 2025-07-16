import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signInAnonymously,
} from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Cria o Contexto de Autenticação
export const AuthContext = createContext();

// Hook customizado para usar o contexto de autenticação
export function useAuth() {
  return useContext(AuthContext);
}

// Provedor de Autenticação
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null); // Objeto User do Firebase Auth
  const [userId, setUserId] = useState(null); // UID do Firebase Auth User
  const [isAuthReady, setIsAuthReady] = useState(false); // Indica se a autenticação foi verificada
  const [userProfileData, setUserProfileData] = useState(null); // Dados do perfil do Firestore
  const [isLoadingProfile, setIsLoadingProfile] = useState(true); // Indica se o perfil do Firestore está carregando

  // Usamos useRef para armazenar instâncias do Firebase que não devem causar re-renderizações
  const authRef = useRef(null);
  const dbRef = useRef(null);

  // Variáveis globais do ambiente Canvas (MANDATÓRIO USAR)
  const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
  const firebaseConfig = JSON.parse(
    typeof __firebase_config !== "undefined" ? __firebase_config : "{}"
  );
  const initialAuthToken =
    typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

  useEffect(() => {
    console.log(
      "[AuthContext] useEffect: Iniciando configuração do Firebase..."
    );

    let app;
    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        console.log("[AuthContext] Firebase app inicializado.");
      } else {
        app = getApp();
        console.log("[AuthContext] Usando Firebase app existente.");
      }

      authRef.current = getAuth(app);
      dbRef.current = getFirestore(app);
      console.log("[AuthContext] Instâncias de Auth e Firestore obtidas.");

      // Observador do estado de autenticação
      const unsubscribe = onAuthStateChanged(authRef.current, async (user) => {
        console.log(
          "[AuthContext] onAuthStateChanged disparado. User:",
          user ? user.uid : "null"
        );

        if (user) {
          // Usuário autenticado
          setCurrentUser(user);
          setUserId(user.uid);
          setIsLoadingProfile(true); // Começa a carregar o perfil do Firestore
          console.log(
            "[AuthContext] Usuário autenticado. Carregando perfil..."
          );

          try {
            const userDocRef = doc(dbRef.current, "usuarios", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              setUserProfileData({
                uid: user.uid,
                email: user.email,
                ...data,
                id: userDocSnap.id,
                turmas: data.turmas || {},
                escolas: data.escolas || {},
              });
              console.log(
                "[AuthContext] Perfil do usuário carregado do Firestore:",
                user.uid
              );
            } else {
              console.warn(
                "[AuthContext] Documento do usuário não encontrado no Firestore:",
                user.uid
              );
              setUserProfileData({
                uid: user.uid,
                email: user.email,
                perfil: "desconhecido",
                turmas: {},
                escolas: {},
              });
            }
          } catch (error) {
            console.error(
              "[AuthContext] Erro ao carregar perfil do Firestore:",
              error
            );
            setUserProfileData(null);
          } finally {
            setIsLoadingProfile(false); // Terminou de carregar o perfil
            console.log("[AuthContext] isLoadingProfile definido como false.");
          }
          setIsAuthReady(true);
          console.log("[AuthContext] isAuthReady definido como true.");
        } else {
          // Usuário não autenticado, tentar login com token personalizado ou anonimamente
          console.log(
            "[AuthContext] Usuário não autenticado. Tentando login inicial..."
          );
          try {
            if (initialAuthToken) {
              console.log("[AuthContext] Tentando signInWithCustomToken...");
              await signInWithCustomToken(authRef.current, initialAuthToken);
            } else {
              console.log("[AuthContext] Tentando signInAnonymously...");
              await signInAnonymously(authRef.current);
            }
            // Após o login, o onAuthStateChanged será disparado novamente com o usuário
          } catch (error) {
            console.error(
              "[AuthContext] Erro ao tentar autenticação inicial:",
              error
            );
            setCurrentUser(null);
            setUserId(null);
            setUserProfileData(null);
            setIsLoadingProfile(false);
            setIsAuthReady(true); // Ainda define como true para indicar que a verificação inicial terminou
            console.log(
              "[AuthContext] Erro na autenticação inicial. isAuthReady true, isLoadingProfile false."
            );
          }
        }
      });

      return () => {
        unsubscribe();
        console.log("[AuthContext] onAuthStateChanged listener removido.");
      };
    } catch (error) {
      console.error(
        "[AuthContext] Erro na inicialização do Firebase ou AuthContext:",
        error
      );
      setIsAuthReady(true);
      setIsLoadingProfile(false);
      console.log(
        "[AuthContext] Erro crítico na inicialização. isAuthReady true, isLoadingProfile false."
      );
    }
  }, []); // Dependências vazias para rodar uma vez na montagem

  // O valor do contexto que será fornecido aos componentes filhos
  const value = {
    currentUser,
    userId,
    isAuthReady,
    user: userProfileData,
    isLoadingProfile,
    authInstance: authRef.current, // Passa a instância do auth
    dbInstance: dbRef.current, // Passa a instância do db
  };

  console.log(
    "[AuthContext] Renderizando AuthProvider. isAuthReady:",
    isAuthReady,
    "isLoadingProfile:",
    isLoadingProfile
  );

  return (
    <AuthContext.Provider value={value}>
      {/* Renderiza os filhos apenas quando a autenticação E o perfil estiverem prontos */}
      {isAuthReady && !isLoadingProfile ? (
        children
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            fontSize: "1.2em",
            color: "#333",
          }}
        >
          Carregando dados de autenticação e perfil...
        </div>
      )}
    </AuthContext.Provider>
  );
}
