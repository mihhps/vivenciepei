// src/hooks/useUserSchool.js
import { useState, useEffect, useContext, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export const useUserSchool = () => {
  // Use 'user' e 'isAuthReady' diretamente do AuthContext
  // isLoadingProfile é o estado de carregamento do perfil do Firestore, que também é importante
  const {
    user: authUserProfileData, // Renomeado para maior clareza: são os dados do perfil do Firestore
    isAuthReady,
    isLoadingProfile, // NOVO: Consumir este estado
  } = useContext(AuthContext);

  const [userSchoolData, setUserSchoolData] = useState(null);
  const [userSchoolId, setUserSchoolId] = useState(null);
  const [isLoadingUserSchool, setIsLoadingUserSchool] = useState(true);
  const [userSchoolError, setUserSchoolError] = useState(null);

  const navigate = useNavigate();

  const handleFetchError = useCallback(
    (message, consoleError, showToast = true) => {
      console.error(`[useUserSchool ERROR] ${consoleError}`);
      setUserSchoolData(null);
      setUserSchoolId(null);
      setUserSchoolError(message);
      setIsLoadingUserSchool(false);
      if (showToast) {
        toast.error(message);
      }
    },
    []
  );

  useEffect(() => {
    console.log("[useUserSchool DEBUG] Início do useEffect.");
    console.log(
      "[useUserSchool DEBUG] isAuthReady (do AuthContext):",
      isAuthReady
    );
    console.log(
      "[useUserSchool DEBUG] isLoadingProfile (do AuthContext):", // NOVO LOG
      isLoadingProfile
    );
    console.log(
      "[useUserSchool DEBUG] authUserProfileData (do AuthContext):",
      authUserProfileData ? authUserProfileData.uid : "Nulo"
    );

    // 1. Aguarda tanto a autenticação quanto o carregamento do perfil
    if (!isAuthReady || isLoadingProfile) {
      // AQUI É A MUDANÇA IMPORTANTE
      setIsLoadingUserSchool(true);
      return;
    }

    // 2. Se a autenticação e o perfil carregaram, mas não há usuário logado
    if (!authUserProfileData) {
      handleFetchError(
        "Você precisa estar logado para acessar esta funcionalidade.",
        "Usuário não autenticado ou perfil não carregado após AuthContext pronto. Redirecionando para login.",
        true
      );
      navigate("/login");
      return;
    }

    // 3. Se o usuário está logado e o perfil completo está disponível
    setIsLoadingUserSchool(true);
    setUserSchoolError(null);

    try {
      const userData = authUserProfileData; // AGORA userData JÁ TEM perfil, escolas, turmas
      console.log(
        "[useUserSchool DEBUG] Dados completos do usuário recebidos do AuthContext:",
        JSON.stringify(userData, null, 2)
      );

      setUserSchoolData(userData); // Define os dados completos do usuário

      let determinedSchoolId = null;
      let determinedTurmas = {};

      const perfilUsuario = userData.perfil?.toLowerCase();

      if (userData.escolaId) {
        determinedSchoolId = userData.escolaId;
        console.log(
          "[useUserSchool DEBUG] userSchoolId obtido diretamente de userData.escolaId:",
          determinedSchoolId
        );
      } else if (
        userData.escolas &&
        typeof userData.escolas === "object" &&
        Object.keys(userData.escolas).length > 0
      ) {
        determinedSchoolId = Object.keys(userData.escolas)[0];
        console.warn(
          "[useUserSchool WARN] Campo 'escolaId' não encontrado diretamente no documento do usuário. Usando o primeiro ID do mapa 'escolas':",
          determinedSchoolId
        );
      } else {
        if (!["seme", "desenvolvedor"].includes(perfilUsuario)) {
          handleFetchError(
            "Sua conta não está vinculada a uma escola. Contate o suporte.",
            "ID da escola não encontrado no documento do usuário para perfil que requer escola.",
            true
          );
          return;
        }
      }

      if (userData.turmas && typeof userData.turmas === "object") {
        determinedTurmas = userData.turmas;
        console.log(
          "[useUserSchool DEBUG] Turmas obtidas de userData.turmas:",
          JSON.stringify(determinedTurmas)
        );
      } else if (perfilUsuario && perfilUsuario.includes("professor")) {
        console.warn(
          "[useUserSchool WARN] Perfil professor sem turmas associadas no documento do usuário."
        );
      }

      setUserSchoolId(determinedSchoolId);
      // Nao precisa de setUserSchoolData(prev => ({ ...prev, turmas: determinedTurmas }));
      // pois userData já é o objeto completo do perfil.

      console.log(
        `[useUserSchool INFO] Usuário ${authUserProfileData.uid} processado. Perfil: ${perfilUsuario}, Final userSchoolId: ${determinedSchoolId}, Final userSchoolData.turmas:`,
        determinedTurmas
      );
    } catch (error) {
      handleFetchError(
        `Não foi possível processar suas informações de usuário. Tente novamente. Erro: ${error.message}`,
        `Erro ao processar dados do usuário do AuthContext: ${error.message}`,
        true
      );
    } finally {
      setIsLoadingUserSchool(false);
      console.log(
        "[useUserSchool DEBUG] Final do useEffect. isLoadingUserSchool setado para false."
      );
    }
  }, [
    authUserProfileData,
    isAuthReady,
    isLoadingProfile,
    navigate,
    handleFetchError,
  ]); // Dependências atualizadas

  return {
    userSchoolData,
    userSchoolId,
    isLoadingUserSchool,
    userSchoolError,
  };
};
