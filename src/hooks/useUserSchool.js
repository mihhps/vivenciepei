import { useState, useEffect, useContext, useCallback } from "react";
// Imports do Firebase mantidos
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
  const [canViewAllSchools, setCanViewAllSchools] = useState(false);

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
    // 1. Checagem inicial
    if (!isAuthReady || isLoadingProfile) {
      setIsLoadingUserSchool(true);
      return;
    }

    // 2. Checagem de autenticação
    if (!authUserProfileData) {
      handleFetchError(
        "Você precisa estar logado.",
        "Usuário não autenticado.",
        true
      );
      navigate("/login");
      return;
    }

    // 3. Lógica Principal
    setUserSchoolError(null);

    const fetchData = async () => {
      setIsLoadingUserSchool(true);

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

        // --- LÓGICA DE DECISÃO ---
        if (perfisSemEscola.includes(perfilUsuario)) {
          canViewAll = true;
        } else if (perfisComMultiplasEscolas.includes(perfilUsuario)) {
          if (
            userData.escolas &&
            typeof userData.escolas === "object" &&
            Object.keys(userData.escolas).length > 0
          ) {
            // ============================================================
            // 🔥 CORREÇÃO DA HIERARQUIA DE RESPEITO AQUI 🔥
            // ============================================================

            const escolasDoUsuario = Object.keys(userData.escolas);
            const escolhaSalva = localStorage.getItem("escolaId");

            // 1. Verifica se existe escolha salva E se o usuário realmente tem acesso a ela
            if (escolhaSalva && escolasDoUsuario.includes(escolhaSalva)) {
              console.log(
                ">>> [useUserSchool] Respeitando escolha manual do LocalStorage:",
                escolhaSalva
              );
              determinedSchoolId = escolhaSalva;
            } else {
              // 2. Se não tiver escolha (ou for inválida), usa a primeira do banco (Padrão)
              console.log(
                ">>> [useUserSchool] Usando escola padrão do banco (Fallback):",
                escolasDoUsuario[0]
              );
              determinedSchoolId = escolasDoUsuario[0];
            }

            // Atualiza o localStorage para garantir sincronia caso tenha caído no padrão
            if (determinedSchoolId) {
              localStorage.setItem("escolaId", determinedSchoolId);
            }

            // ============================================================
          } else {
            handleFetchError(
              "Conta sem vínculo escolar.",
              "Objeto 'escolas' vazio ou inexistente.",
              true
            );
            setIsLoadingUserSchool(false);
            return;
          }
        }

        const turmas = userData.turmas || {};

        // 4. Atualiza Estados
        setUserSchoolId(determinedSchoolId);
        setCanViewAllSchools(canViewAll);
        setUserSchoolData({
          ...userData,
          escolaId: determinedSchoolId,
          turmas: turmas,
        });

        setIsLoadingUserSchool(false);
      } catch (error) {
        handleFetchError(
          `Erro ao processar dados: ${error.message}`,
          `Erro no try/catch: ${error.message}`,
          true
        );
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authUserProfileData,
    isAuthReady,
    isLoadingProfile,
    navigate,
    handleFetchError,
  ]);

  return {
    userSchoolData,
    userSchoolId,
    isLoadingUserSchool,
    userSchoolError,
    canViewAllSchools,
  };
};
