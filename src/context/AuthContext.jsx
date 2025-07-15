import React, { createContext, useContext, useState, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signInAnonymously,
} from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore"; // Importar doc e getDoc

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
  const [loadingAuth, setLoadingAuth] = useState(true); // Indica se a autenticação está a carregar
  const [userProfileData, setUserProfileData] = useState(null); // Dados do perfil do Firestore
  const [isLoadingProfile, setIsLoadingProfile] = useState(true); // Indica se o perfil do Firestore está carregando

  // Variáveis globais do ambiente Canvas (MANDATÓRIO USAR)
  const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
  const firebaseConfig = JSON.parse(
    typeof __firebase_config !== "undefined" ? __firebase_config : "{}"
  );
  const initialAuthToken =
    typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

  useEffect(() => {
    let app;
    let authInstance;
    let dbInstance;

    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }

      authInstance = getAuth(app);
      dbInstance = getFirestore(app);

      // Observador do estado de autenticação
      const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          // Usuário autenticado
          setCurrentUser(user);
          setUserId(user.uid);
          setIsLoadingProfile(true); // Começa a carregar o perfil do Firestore

          try {
            const userDocRef = doc(dbInstance, "usuarios", user.uid); // Usa dbInstance
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              // Combina dados do Auth com dados do Firestore
              setUserProfileData({
                uid: user.uid,
                email: user.email,
                ...data, // Dados como perfil, escolas, turmas
                id: userDocSnap.id, // ID do documento Firestore
                turmas: data.turmas || {}, // Garante que turmas é um objeto
                escolas: data.escolas || {}, // Garante que escolas é um objeto
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
              // Fallback se o documento do Firestore não existir (apenas o Auth User)
              setUserProfileData({
                uid: user.uid,
                email: user.email,
                perfil: "desconhecido", // Perfil padrão
                turmas: {},
                escolas: {},
              });
            }
          } catch (error) {
            console.error(
              "[AuthContext] Erro ao carregar perfil do Firestore:",
              error
            );
            setUserProfileData(null); // Limpa perfil em caso de erro
          } finally {
            setIsLoadingProfile(false); // Terminou de carregar o perfil
          }
          setIsAuthReady(true);
          setLoadingAuth(false);
        } else {
          // Usuário não autenticado, tentar login com token personalizado ou anonimamente
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } else {
              await signInAnonymously(authInstance);
            }
            // Após o login, o onAuthStateChanged será disparado novamente com o usuário
          } catch (error) {
            console.error("Erro ao tentar autenticação inicial:", error);
            setCurrentUser(null);
            setUserId(null);
            setUserProfileData(null); // Garante que o perfil também é nulo
            setIsLoadingProfile(false); // Terminou de carregar o perfil (não tem)
            setIsAuthReady(true);
            setLoadingAuth(false);
          }
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Erro na inicialização do Firebase ou AuthContext:", error);
      setIsAuthReady(true);
      setLoadingAuth(false);
      setIsLoadingProfile(false); // Também define como falso em caso de erro na inicialização
    }
  }, []); // Dependências vazias para rodar uma vez na montagem

  // O valor do contexto que será fornecido aos componentes filhos
  const value = {
    currentUser, // Objeto User do Firebase Auth
    userId, // UID do Firebase Auth User
    isAuthReady, // Autenticação verificada (user ou null)
    loadingAuth, // Estado de carregamento da autenticação
    user: userProfileData, // AGORA ESTE É O PERFIL COMPLETO DO FIRESTORE
    isLoadingProfile, // Indica se o perfil do Firestore está carregando
    authInstance: getAuth(getApps().length ? getApp() : null),
    dbInstance: getFirestore(getApps().length ? getApp() : null),
  };

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
