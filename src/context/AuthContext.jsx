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
    let app;
    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }

      authRef.current = getAuth(app);
      dbRef.current = getFirestore(app);

      const unsubscribe = onAuthStateChanged(authRef.current, async (user) => {
        if (user) {
          setCurrentUser(user);
          setUserId(user.uid);
          setIsLoadingProfile(true);

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

              // ✅✅✅ BLOCO DE TESTE DEFINITIVO ✅✅✅
              console.log("--- INICIANDO TESTE DE CUSTOM CLAIMS ---");
              user
                .getIdTokenResult(true)
                .then((idTokenResult) => {
                  console.log(
                    "PERMISSÕES NO TOKEN (CLAIMS):",
                    idTokenResult.claims
                  );
                  if (idTokenResult.claims.perfil === "professor") {
                    console.log(
                      "✅ SUCESSO! O perfil 'professor' foi encontrado no token."
                    );
                  } else {
                    console.log(
                      "❌ FALHA! O perfil 'professor' NÃO foi encontrado no token."
                    );
                  }
                  console.log("--- FIM DO TESTE DE CUSTOM CLAIMS ---");
                })
                .catch((error) => {
                  console.error("ERRO AO VERIFICAR TOKEN:", error);
                });
              // ✅✅✅ FIM DO BLOCO DE TESTE ✅✅✅
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
          }
          setIsAuthReady(true);
        } else {
          setCurrentUser(null);
          setUserId(null);
          setUserProfileData(null);
          setIsLoadingProfile(false);
          setIsAuthReady(true);
        }
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("[AuthContext] Erro na inicialização:", error);
      setIsAuthReady(true);
      setIsLoadingProfile(false);
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

  return (
    <AuthContext.Provider value={value}>
      {isAuthReady && !isLoadingProfile ? children : <div>Carregando...</div>}
    </AuthContext.Provider> // ✅ CORRIGIDO AQUI
  );
}
