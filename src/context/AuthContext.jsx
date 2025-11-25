import React, { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signInAnonymously,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Linha 10: Importa as instâncias 'auth' e 'db' do seu arquivo central.
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

  useEffect(() => {
    // Flag para garantir que as operações de sign-in inicial só ocorram uma vez
    let isInitialCheck = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // 1. Inicia o Carregamento do Perfil
      setIsLoadingProfile(true);

      if (user) {
        // Usuário AUTENTICADO
        setCurrentUser(user);
        setUserId(user.uid);

        try {
          // 🛑 ESSENCIAL: Recarrega o token para obter os claims ('perfil')
          await user.getIdTokenResult(true);

          // Carrega o Perfil do Firestore
          const userDocRef = doc(db, "usuarios", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserProfileData({
              uid: user.uid,
              email: user.email,
              ...data,
              id: userDocSnap.id,
              perfil: data.perfil?.toLowerCase()?.trim(),
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
          // 2. Finaliza o Carregamento do Perfil
          setIsLoadingProfile(false);
        }
      } else {
        // Usuário NÃO AUTENTICADO

        // Tenta sign-in customizado na primeira verificação
        if (isInitialCheck) {
          if (initialAuthToken) {
            try {
              await signInWithCustomToken(auth, initialAuthToken);
              // O onAuthStateChanged será acionado novamente com o usuário logado.
            } catch (error) {
              console.error(
                "[AuthContext] Falha no token customizado, tentando anônimo:",
                error
              );
              await signInAnonymously(auth);
            }
          } else {
            // Tenta login anônimo como fallback, se não houver token customizado
            await signInAnonymously(auth);
          }
        }

        // Lógica de logout (apenas se a primeira verificação já tiver ocorrido)
        if (!isInitialCheck || !initialAuthToken) {
          setCurrentUser(null);
          setUserId(null);
          setUserProfileData(null);
          setIsLoadingProfile(false); // Finaliza o carregamento do perfil
        }
      }

      // 3. Finaliza a Verificação de Autenticação na primeira passagem
      if (isInitialCheck) {
        setIsAuthReady(true);
        isInitialCheck = false;
      }
    });

    return () => unsubscribe();
    // initialAuthToken é a única dependência externa relevante
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
      {/* CORREÇÃO: Renderiza os filhos apenas quando AMBOS os estados de carregamento estiverem prontos */}
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
