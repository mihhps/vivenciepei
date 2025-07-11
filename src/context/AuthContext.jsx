// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signInAnonymously,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Cria o Contexto de Autenticação
const AuthContext = createContext();

// Hook customizado para usar o contexto de autenticação
export function useAuth() {
  return useContext(AuthContext);
}

// Provedor de Autenticação
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // Indica se a autenticação foi verificada
  const [loadingAuth, setLoadingAuth] = useState(true); // Indica se a autenticação está a carregar

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
      // Inicializa o Firebase App se ainda não estiver inicializado
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
            // Em caso de erro na autenticação inicial, ainda assim definimos isAuthReady como true
            // para que a aplicação possa continuar (talvez para uma tela de login)
            setCurrentUser(null);
            setUserId(null);
            setIsAuthReady(true);
            setLoadingAuth(false);
          }
        }
      });

      // Retorna a função de limpeza para desinscrever o observador
      return () => unsubscribe();
    } catch (error) {
      console.error("Erro na inicialização do Firebase ou AuthContext:", error);
      // Se houver um erro na inicialização, ainda assim defina isAuthReady para true
      // para evitar que a aplicação fique presa no estado de carregamento
      setIsAuthReady(true);
      setLoadingAuth(false);
    }
  }, []); // Executa apenas uma vez na montagem

  // O valor do contexto que será fornecido aos componentes filhos
  const value = {
    currentUser,
    userId,
    isAuthReady,
    loadingAuth,
    // Você pode adicionar outras funções de autenticação aqui, se necessário (ex: logout)
    authInstance: getAuth(getApps().length ? getApp() : null), // Fornece a instância de auth
    dbInstance: getFirestore(getApps().length ? getApp() : null), // Fornece a instância de db
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Renderiza os filhos apenas quando a autenticação estiver pronta */}
      {children}
    </AuthContext.Provider>
  );
}
