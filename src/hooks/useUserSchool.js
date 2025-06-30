import { useState, useEffect, useContext, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
// --- CORRECTED IMPORT PATH ---
import { AuthContext } from "../context/AuthContext"; // Ensure this path is correct:
// If AuthContext.js is in src/context, and useUserSchool.js is in src/hooks,
// then "../context/AuthContext" is the correct path.

// If you prefer to use your custom hook from AuthContext.js:
// import { useAuth } from "../context/AuthContext";

export const useUserSchool = () => {
  // --- CONSUMING AuthContext ---
  // We use useContext(AuthContext) to get the values provided by AuthProvider.
  // currentUser: The Firebase user object (or null if not logged in).
  // loading: A boolean from AuthContext indicating if the auth state is still being determined.
  const { currentUser, loading } = useContext(AuthContext); // Destructure 'loading' as it's provided by AuthContext.

  // Renaming 'loading' from context to 'isLoadingAuth' for clarity within this hook
  // if you prefer to keep your existing variable name.
  const isLoadingAuth = loading;

  const [usuario, setUsuario] = useState(null); // Objeto completo do usuário do Firestore
  const [userSchoolId, setUserSchoolId] = useState(null); // ID da escola principal do usuário
  const [isLoadingUserSchool, setIsLoadingUserSchool] = useState(true); // Começa como true, pois precisa verificar auth e Firestore
  const [userSchoolError, setUserSchoolError] = useState(null);

  const navigate = useNavigate();

  const handleFetchError = useCallback(
    (message, consoleError, showToast = true) => {
      console.error(`[useUserSchool ERROR] ${consoleError}`);
      setUsuario(null);
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
    const fetchUserData = async () => {
      console.log("[useUserSchool DEBUG] Início do fetchUserData.");
      console.log("[useUserSchool DEBUG] isLoadingAuth:", isLoadingAuth);
      console.log(
        "[useUserSchool DEBUG] currentUser:",
        currentUser ? currentUser.uid : "Nulo"
      );

      // 1. Aguarda o estado de autenticação ser carregado
      // If AuthContext is still determining the user's auth state, wait.
      if (isLoadingAuth) {
        setIsLoadingUserSchool(true); // Ensure the loading state is active while waiting for auth.
        return; // Exit and wait for the auth state to resolve.
      }

      // 2. Se a autenticação falhou (nenhum currentUser), redireciona e define o erro
      // If authentication is complete but no currentUser is found (not logged in).
      if (!currentUser) {
        handleFetchError(
          "Você precisa estar logado para acessar esta funcionalidade.",
          "Usuário não autenticado no Firebase Auth. Redirecionando para login.",
          true
        );
        navigate("/login");
        return; // Stop further execution as user is not authenticated.
      }

      // 3. Se o usuário está autenticado, inicia o carregamento dos dados do perfil
      // Now that we have a currentUser, proceed to fetch their Firestore profile.
      setIsLoadingUserSchool(true);
      setUserSchoolError(null); // Clear any previous errors.

      try {
        // Construct the document reference using currentUser.uid.
        const userDocRef = doc(db, "usuarios", currentUser.uid); // Assuming collection 'usuarios'
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          console.log(
            "[useUserSchool DEBUG] Dados do usuário do Firestore:",
            JSON.stringify(userData, null, 2)
          );

          // Set the complete user object from Firestore in the hook's state.
          setUsuario(userData);

          let determinedSchoolId = null;
          let determinedTurmas = {};

          const perfilUsuario = userData.perfil?.toLowerCase();

          // Logic to determine the primary school ID (userSchoolId)
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
            // Fallback: If 'escolaId' is not direct, use the first ID from the 'escolas' map.
            determinedSchoolId = Object.keys(userData.escolas)[0];
            console.warn(
              "[useUserSchool WARN] Campo 'escolaId' não encontrado diretamente no documento do usuário. Usando o primeiro ID do mapa 'escolas':",
              determinedSchoolId
            );
          } else {
            // If the profile is not SEME/Developer and no school is associated, it's an issue.
            if (!["seme", "desenvolvedor"].includes(perfilUsuario)) {
              handleFetchError(
                "Sua conta não está vinculada a uma escola. Contate o suporte.",
                "ID da escola não encontrado no documento do usuário para perfil que requer escola. Queries podem falhar.",
                true
              );
              // Since the error has been handled and toast shown, we can return.
              return;
            }
          }

          // Logic to determine the classes (turmas)
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

          // Update the final states of the hook
          setUserSchoolId(determinedSchoolId);
          setUsuario((prev) => ({ ...prev, turmas: determinedTurmas })); // Ensure 'turmas' is part of the user object

          console.log(
            `[useUserSchool INFO] Usuário ${currentUser.uid} carregado. Perfil: ${perfilUsuario}, Final userSchoolId: ${determinedSchoolId}, Final usuario.turmas:`,
            determinedTurmas
          );
        } else {
          // User document not found in Firestore.
          handleFetchError(
            "Seu perfil de usuário não foi encontrado. Contate o administrador.",
            `Documento de usuário NÃO encontrado para UID: ${currentUser.uid}. Verifique a coleção 'usuarios'.`,
            true
          );
        }
      } catch (error) {
        // Catch any errors during Firestore data fetching.
        handleFetchError(
          `Não foi possível carregar suas informações de usuário. Tente novamente. Erro: ${error.message}`,
          `Erro ao buscar dados do usuário: ${error.message}`,
          true
        );
      } finally {
        // Ensure loading state is set to false after attempt.
        setIsLoadingUserSchool(false);
        console.log(
          "[useUserSchool DEBUG] Final do fetchUserData. isLoadingUserSchool setado para false."
        );
      }
    };

    // Call the function to fetch user data.
    fetchUserData();
    // Dependencies: Re-run this effect when currentUser or isLoadingAuth changes,
    // or when navigate or handleFetchError (stable via useCallback) changes.
  }, [currentUser, isLoadingAuth, navigate, handleFetchError]);

  return {
    usuario,
    userSchoolId,
    isLoadingUserSchool,
    userSchoolError,
  };
};
