import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Cria o Contexto de Autenticação
export const AuthContext = createContext();

// Hook customizado para usar o contexto de autenticação
export function useAuth() {
  return useContext(AuthContext);
}

// Provedor de Autenticação
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userProfileData, setUserProfileData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const authRef = useRef(null);
  const dbRef = useRef(null);

  const firebaseConfig = JSON.parse(
    typeof __firebase_config !== "undefined" ? __firebase_config : "{}"
  );

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

      const unsubscribe = onAuthStateChanged(authRef.current, async (user) => {
        console.log(
          "[AuthContext] onAuthStateChanged disparado. User:",
          user ? user.uid : "null"
        );

        if (user) {
          // Usuário autenticado
          setCurrentUser(user);
          setUserId(user.uid);
          setIsLoadingProfile(true);
          console.log(
            "[AuthContext] Usuário autenticado. Carregando perfil..."
          );

          try {
            const userDocRef = doc(dbRef.current, "usuarios", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            // ✅ CORREÇÃO CRÍTICA: Força a atualização do token
            await user.getIdToken(true);

            if (userDocSnap.exists()) {
              const data = userDocSnap.data();

              // ❌ REMOVEMOS O CÓDIGO INSEGURO AQUI
              // As permissões são tratadas pelas regras do Firestore e custom claims.

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
            setIsLoadingProfile(false);
            console.log("[AuthContext] isLoadingProfile definido como false.");
          }
          setIsAuthReady(true);
          console.log("[AuthContext] isAuthReady definido como true.");
        } else {
          console.log(
            "[AuthContext] Nenhum usuário logado. Aguardando login via email/senha."
          );
          setCurrentUser(null);
          setUserId(null);
          setUserProfileData(null);
          setIsLoadingProfile(false);
          setIsAuthReady(true);
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
  }, []);

  const value = {
    currentUser,
    userId,
    isAuthReady,
    user: userProfileData,
    isLoadingProfile,
    authInstance: authRef.current,
    dbInstance: dbRef.current,
  };

  console.log(
    "[AuthContext] Renderizando AuthProvider. isAuthReady:",
    isAuthReady,
    "isLoadingProfile:",
    isLoadingProfile
  );

  return (
    <AuthContext.Provider value={value}>
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
