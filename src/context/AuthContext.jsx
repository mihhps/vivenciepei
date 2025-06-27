// src/context/AuthContext.js

import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase"; // Importe 'db' do seu arquivo firebase.js
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Importe funções do Firestore

export const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Este é o objeto completo do usuário que o hook vai fornecer
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log(
        "[AuthContext DEBUG] onAuthStateChanged: authUser:",
        authUser ? authUser.uid : "null"
      );

      if (authUser) {
        // Usuário logado via Firebase Authentication
        try {
          // Busca o documento de perfil do usuário na coleção 'usuarios' no Firestore
          const userDocRef = doc(db, "usuarios", authUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            // Combina os dados de autenticação com os dados do perfil do Firestore
            setUser({
              uid: authUser.uid,
              email: authUser.email,
              // Adiciona as propriedades do documento do Firestore ao objeto user
              ...userData,
              // Garante que escolasVinculadasIds seja um array de IDs, se 'escolas' for um map
              escolasVinculadasIds:
                userData.escolas && typeof userData.escolas === "object"
                  ? Object.keys(userData.escolas)
                  : [],
            });
            console.log(
              "[AuthContext DEBUG] Perfil do usuário carregado do Firestore:",
              JSON.stringify(userData, null, 2)
            );
          } else {
            console.warn(
              "[AuthContext WARN] Documento do usuário não encontrado no Firestore para UID:",
              authUser.uid
            );
            // Se o documento do perfil não existe, ainda assim fornece um user básico
            setUser({
              uid: authUser.uid,
              email: authUser.email,
              perfil: null,
              nome: "Usuário Desconhecido",
              escolasVinculadasIds: [],
            });
          }
        } catch (error) {
          console.error(
            "[AuthContext ERROR] Erro ao buscar dados do usuário no Firestore:",
            error
          );
          // Em caso de erro, ainda fornece um user básico
          setUser({
            uid: authUser.uid,
            email: authUser.email,
            perfil: null,
            nome: "Erro no Perfil",
            escolasVinculadasIds: [],
          });
        }
      } else {
        // Usuário deslogado
        console.log("[AuthContext INFO] Usuário deslogado.");
        setUser(null);
      }
      setLoading(false); // Sinaliza que o carregamento da autenticação e do perfil está completo
    });

    return () => unsubscribe(); // Limpeza do listener
  }, []);

  // O valor fornecido pelo contexto agora é o 'user' completo com dados do Firestore
  const value = {
    user, // Agora 'user' terá 'uid', 'email', 'perfil', 'nome', 'escolas', etc.
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Renderiza os filhos somente após o carregamento inicial */}
      {!loading && children}
    </AuthContext.Provider>
  );
};
