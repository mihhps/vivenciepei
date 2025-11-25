import { useState, useEffect, useContext, useCallback } from "react";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore"; // Mantidos para compatibilidade, embora não usados aqui
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

  // Função de tratamento de erro memorizada
  const handleFetchError = useCallback(
    (message, consoleError, showToast = true) => {
      console.error(`[useUserSchool ERROR] ${consoleError}`);
      setUserSchoolData(null);
      setUserSchoolId(null);
      setUserSchoolError(message);
      setIsLoadingUserSchool(false); // Garante que o estado de carregamento termine
      if (showToast) {
        toast.error(message);
      }
    },
    [] // Dependências vazias para garantir que esta função nunca mude
  );

  useEffect(() => {
    // 1. Checagem inicial de estado
    if (!isAuthReady || isLoadingProfile) {
      setIsLoadingUserSchool(true);
      return;
    }

    // 2. Checagem de autenticação (Redirecionamento)
    if (!authUserProfileData) {
      handleFetchError(
        "Você precisa estar logado para acessar esta funcionalidade.",
        "Usuário não autenticado ou perfil não carregado após AuthContext pronto. Redirecionando para login.",
        true
      );
      navigate("/login");
      return;
    }

    // 3. Início do processo de determinação de escola
    setUserSchoolError(null);

    const fetchData = async () => {
      // Inicia o carregamento (Define a flag, que será redefinida no fim)
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

        // Lógica de determinação de escola
        if (perfisSemEscola.includes(perfilUsuario)) {
          canViewAll = true;
        } else if (perfisComMultiplasEscolas.includes(perfilUsuario)) {
          if (
            userData.escolas &&
            typeof userData.escolas === "object" &&
            Object.keys(userData.escolas).length > 0
          ) {
            // Seleciona a primeira escola vinculada como padrão
            determinedSchoolId = Object.keys(userData.escolas)[0];
          } else {
            handleFetchError(
              "Sua conta não está vinculada a uma escola. Contate o suporte.",
              "ID da escola não encontrado no documento do usuário para perfil que requer escola.",
              true
            );
            // Retorna aqui para evitar a execução das linhas seguintes
            setIsLoadingUserSchool(false);
            return;
          }
        }

        const turmas = userData.turmas || {};

        // 4. ATUALIZAÇÃO CONSOLIDADA DOS ESTADOS
        setUserSchoolId(determinedSchoolId);
        setCanViewAllSchools(canViewAll);
        setUserSchoolData({
          ...userData,
          escolaId: determinedSchoolId,
          turmas: turmas,
        });

        // 5. CORREÇÃO PRINCIPAL: SÓ FINALIZA O CARREGAMENTO APÓS TODOS OS ESTADOS MUDAREM
        setIsLoadingUserSchool(false);

        console.log(
          `[useUserSchool] Finalizado o carregamento com sucesso. Dados definidos:`
        );
      } catch (error) {
        handleFetchError(
          `Não foi possível processar suas informações de usuário. Tente novamente. Erro: ${error.message}`,
          `Erro ao processar dados do usuário do AuthContext: ${error.message}`,
          true
        );
        // O handleFetchError já chama setIsLoadingUserSchool(false)
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
    // Remover todas as dependências de estado do próprio hook, como userSchoolId, etc.
  ]);

  // Remover o segundo useEffect que apenas logava o estado, pois ele é redundante e pode adicionar complexidade.

  return {
    userSchoolData,
    userSchoolId,
    isLoadingUserSchool,
    userSchoolError,
    canViewAllSchools,
  };
};
