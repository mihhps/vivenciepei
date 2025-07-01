import { useState, useEffect, useContext, useCallback } from "react";
import { db } from "../firebase"; // Você ainda pode precisar do 'db' para outras operações, mas não para a busca inicial do perfil.
import { doc, getDoc } from "firebase/firestore"; // Manter se precisar para outras funções que busquem Docs
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export const useUserSchool = () => {
  // Use o 'user' e 'loading' diretamente do AuthContext
  const { user: authUserFromContext, loading: isLoadingAuth } =
    useContext(AuthContext);

  // Renomeado para evitar confusão com 'user' do AuthContext
  const [userSchoolData, setUserSchoolData] = useState(null); // Objeto completo do usuário do Firestore (já vem do AuthContext)
  const [userSchoolId, setUserSchoolId] = useState(null); // ID da escola principal do usuário
  const [isLoadingUserSchool, setIsLoadingUserSchool] = useState(true); // Começa como true
  const [userSchoolError, setUserSchoolError] = useState(null);

  const navigate = useNavigate();

  const handleFetchError = useCallback(
    (message, consoleError, showToast = true) => {
      console.error(`[useUserSchool ERROR] ${consoleError}`);
      setUserSchoolData(null); // Limpa os dados se houver erro
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
      "[useUserSchool DEBUG] isLoadingAuth (do AuthContext):",
      isLoadingAuth
    );
    console.log(
      "[useUserSchool DEBUG] authUserFromContext (do AuthContext):",
      authUserFromContext ? authUserFromContext.uid : "Nulo"
    );

    // 1. Aguarda o estado de autenticação ser carregado pelo AuthContext
    if (isLoadingAuth) {
      setIsLoadingUserSchool(true); // Garante que o loading está ativo enquanto o AuthContext carrega
      return; // Sai e espera pelo AuthContext resolver
    }

    // 2. Se o AuthContext terminou e não há usuário (não logado)
    if (!authUserFromContext) {
      handleFetchError(
        "Você precisa estar logado para acessar esta funcionalidade.",
        "Usuário não autenticado pelo AuthContext. Redirecionando para login.",
        true
      );
      navigate("/login"); // Redireciona para login
      return; // Para a execução
    }

    // 3. Se o usuário está logado e o AuthContext já carregou os dados do perfil
    // Agora, usamos os dados JÁ carregados pelo AuthContext.
    setIsLoadingUserSchool(true); // Reativa o loading para o processamento final
    setUserSchoolError(null); // Limpa erros anteriores

    try {
      const userData = authUserFromContext; // Os dados já vêm completos do AuthContext
      console.log(
        "[useUserSchool DEBUG] Dados do usuário recebidos do AuthContext:",
        JSON.stringify(userData, null, 2)
      );

      // Define os dados completos do usuário
      setUserSchoolData(userData);

      let determinedSchoolId = null;
      let determinedTurmas = {};

      const perfilUsuario = userData.perfil?.toLowerCase();

      // Lógica para determinar a escola principal (userSchoolId)
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
        // Fallback: Se 'escolaId' não for direto, usa o primeiro ID do mapa 'escolas'.
        determinedSchoolId = Object.keys(userData.escolas)[0];
        console.warn(
          "[useUserSchool WARN] Campo 'escolaId' não encontrado diretamente no documento do usuário. Usando o primeiro ID do mapa 'escolas':",
          determinedSchoolId
        );
      } else {
        // Se o perfil não é SEME/Desenvolvedor e nenhuma escola está associada
        if (!["seme", "desenvolvedor"].includes(perfilUsuario)) {
          handleFetchError(
            "Sua conta não está vinculada a uma escola. Contate o suporte.",
            "ID da escola não encontrado no documento do usuário para perfil que requer escola.",
            true
          );
          return;
        }
      }

      // Lógica para determinar as turmas
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

      // Atualiza os estados finais do hook
      setUserSchoolId(determinedSchoolId);
      // Se 'turmas' não está diretamente no userData, adicione-o aqui, mas o AuthContext já deveria fornecer.
      // Se o AuthContext já fornece, setUserSchoolData(userData) é suficiente.
      // Caso contrário: setUserSchoolData(prev => ({ ...prev, turmas: determinedTurmas }));

      console.log(
        `[useUserSchool INFO] Usuário ${authUserFromContext.uid} processado. Perfil: ${perfilUsuario}, Final userSchoolId: ${determinedSchoolId}, Final userSchoolData.turmas:`,
        determinedTurmas
      );
    } catch (error) {
      // Captura quaisquer erros durante o processamento dos dados do AuthContext
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
  }, [authUserFromContext, isLoadingAuth, navigate, handleFetchError]); // Dependências atualizadas

  return {
    userSchoolData, // Objeto completo do usuário (com perfil, escolas, turmas)
    userSchoolId,
    isLoadingUserSchool,
    userSchoolError,
  };
};
