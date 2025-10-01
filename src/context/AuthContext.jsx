import React, { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signInAnonymously,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Linha 10: Importa as instâncias 'auth' e 'db' do seu arquivo central.
// ESTE É O ÚNICO LUGAR ONDE 'auth' e 'db' DEVEM SER DECLARADOS.
import { auth, db } from "../firebase";

// Variáveis globais
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const initialAuthToken =
  typeof __initial_auth_token !== "undefined"
    ? __initial_auth_token
    : undefined;

export const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userProfileData, setUserProfileData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [appIdentifier] = useState(appId);

  // Remova daqui qualquer linha que diga "const auth = ..." ou "const db = ..."
  // se ela foi adicionada antes, pois isso causaria o conflito.

  useEffect(() => {
    const setupAuth = async () => {
      try {
      } catch (error) {
        // O erro auth/admin-restricted-operation é logado AQUI
        console.error("[AuthContext] Falha na autenticação inicial:", error);

        if (error.code === "auth/invalid-custom-token") {
          try {
            await signInAnonymously(auth);
          } catch (anonError) {
            console.error(
              "[AuthContext] Falha no fallback anônimo:",
              anonError
            );
          }
        }
      }
    };

    if (!auth.currentUser) {
      setupAuth();
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setUserId(user.uid);
        setIsLoadingProfile(true);

        try {
          // 🛑 ESSENCIAL: Recarrega o token para obter os claims ('perfil')
          await user.getIdTokenResult(true);

          // Usa a instância 'db' importada
          const userDocRef = doc(db, "usuarios", user.uid);
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
          } else {
            console.warn(
              "[AuthContext] Documento do usuário não encontrado no Firestore."
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
          console.error("[AuthContext] Erro ao carregar perfil:", error);
          setUserProfileData(null);
        } finally {
          setIsLoadingProfile(false);
        }
        setIsAuthReady(true);
      } else {
        // Lógica de logout
        setCurrentUser(null);
        setUserId(null);
        setUserProfileData(null);
        setIsLoadingProfile(false);
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, [initialAuthToken]);

  const value = {
    currentUser,
    userId,
    isAuthReady,
    user: userProfileData,
    isLoadingProfile,
    authInstance: auth,
    dbInstance: db,
    appId: appIdentifier,
  };

  return (
    <AuthContext.Provider value={value}>
      {isAuthReady && !isLoadingProfile ? (
        children
      ) : (
        <div className="flex items-center justify-center h-screen w-full text-lg text-gray-500">
          Carregando...
        </div>
      )}
    </AuthContext.Provider>
  );
}
