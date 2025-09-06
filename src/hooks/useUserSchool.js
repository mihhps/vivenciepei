import { useState, useEffect, useContext, useCallback } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { PERFIS } from "../config/constants";

export const useUserSchool = () => {
  const {
    user: authUserProfileData,
    isAuthReady,
    isLoadingProfile,
  } = useContext(AuthContext);

  const [userSchoolData, setUserSchoolData] = useState(null);
  const [userSchoolId, setUserSchoolId] = useState(null);
  const [isLoadingUserSchool, setIsLoadingUserSchool] = useState(true);
  const [userSchoolError, setUserSchoolError] = useState(null);
  const [canViewAllSchools, setCanViewAllSchools] = useState(false); // Novo state

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
    if (!isAuthReady || isLoadingProfile) {
      setIsLoadingUserSchool(true);
      return;
    }

    if (!authUserProfileData) {
      handleFetchError(
        "Você precisa estar logado para acessar esta funcionalidade.",
        "Usuário não autenticado ou perfil não carregado após AuthContext pronto. Redirecionando para login.",
        true
      );
      navigate("/login");
      return;
    }

    setIsLoadingUserSchool(true);
    setUserSchoolError(null);

    const fetchData = async () => {
      try {
        const userData = authUserProfileData;
        let determinedSchoolId = null;
        let canViewAll = false;

        const perfilUsuario = userData.perfil?.toLowerCase();

        const perfisSemEscola = [PERFIS.SEME, PERFIS.DESENVOLVEDOR].map((p) =>
          p.toLowerCase()
        );
        const perfisComMultiplasEscolas = [
          PERFIS.DIRETOR,
          PERFIS.DIRETOR_ADJUNTO,
          PERFIS.GESTAO,
          PERFIS.AEE,
          PERFIS.ORIENTADOR_PEDAGOGICO,
          PERFIS.PROFESSOR,
        ].map((p) => p.toLowerCase());

        // Lógica de correção: Perfis "sem escola" na verdade têm acesso a todas
        if (perfisSemEscola.includes(perfilUsuario)) {
          canViewAll = true;
          // O determinedSchoolId continua nulo, pois não se refere a uma única escola.
        } else if (perfisComMultiplasEscolas.includes(perfilUsuario)) {
          if (
            userData.escolas &&
            typeof userData.escolas === "object" &&
            Object.keys(userData.escolas).length > 0
          ) {
            determinedSchoolId = Object.keys(userData.escolas)[0];
          } else {
            handleFetchError(
              "Sua conta não está vinculada a uma escola. Contate o suporte.",
              "ID da escola não encontrado no documento do usuário para perfil que requer escola.",
              true
            );
            return;
          }
        }

        const turmas = userData.turmas || {};

        setUserSchoolId(determinedSchoolId);
        setCanViewAllSchools(canViewAll); // Define o novo state
        setUserSchoolData({
          ...userData,
          escolaId: determinedSchoolId,
          turmas: turmas,
        });
      } catch (error) {
        handleFetchError(
          `Não foi possível processar suas informações de usuário. Tente novamente. Erro: ${error.message}`,
          `Erro ao processar dados do usuário do AuthContext: ${error.message}`,
          true
        );
      } finally {
        console.log(
          `[useUserSchool] Finalizado o carregamento. Dados do usuário:`,
          {
            perfil: authUserProfileData?.perfil,
            escolaId: userSchoolId,
            turmas: userSchoolData?.turmas,
            uid: authUserProfileData?.uid,
            email: authUserProfileData?.email,
            canViewAllSchools: canViewAllSchools,
          }
        );
        setIsLoadingUserSchool(false);
      }
    };

    fetchData();
  }, [
    authUserProfileData,
    isAuthReady,
    isLoadingProfile,
    navigate,
    handleFetchError,
  ]);

  // NOVO useEffect para confirmar a atualização do estado
  useEffect(() => {
    if (!isLoadingUserSchool) {
      console.log(`[useUserSchool] Estado final ATUALIZADO:`, {
        perfil: authUserProfileData?.perfil,
        escolaId: userSchoolId,
        turmas: userSchoolData?.turmas,
        uid: authUserProfileData?.uid,
        email: authUserProfileData?.email,
        canViewAllSchools: canViewAllSchools,
      });
    }
  }, [
    userSchoolId,
    userSchoolData,
    canViewAllSchools,
    isLoadingUserSchool,
    authUserProfileData,
  ]);

  return {
    userSchoolData,
    userSchoolId,
    isLoadingUserSchool,
    userSchoolError,
    canViewAllSchools, // Retorna o novo state
  };
};
