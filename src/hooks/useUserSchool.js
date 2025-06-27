import { useEffect, useState, useMemo } from "react";
import { auth, db } from "../firebase"; // Importar auth e db
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext"; // <--- ONDE VOCÊ PEGA O ESTADO DE AUTENTICAÇÃO

export const useUserSchool = () => {
  const { user, loading: authLoading } = useAuth(); // Obter user e loading do AuthContext
  const [userSchoolData, setUserSchoolData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // NOVO LOG 1: Para observar user e authLoading diretamente do useAuth em cada render
  useEffect(() => {
    console.log("[useUserSchool DEBUG 1] user from useAuth (render):", user);
    console.log(
      "[useUserSchool DEBUG 2] authLoading from useAuth (render):",
      authLoading
    );
  }, [user, authLoading]);

  useEffect(() => {
    console.log(
      "[useUserSchool DEBUG 3] Effect started. authLoading:",
      authLoading,
      "user UID:",
      user ? user.uid : "null"
    ); // Log de início do useEffect

    // Se o AuthContext ainda está carregando, apenas define loading local e sai
    if (authLoading) {
      setIsLoading(true);
      setError(null); // Limpa erros anteriores
      console.log("[useUserSchool DEBUG 4] Auth still loading, returning.");
      return;
    }

    // Se AuthContext terminou de carregar (authLoading é false) e NÃO HÁ usuário
    if (!user) {
      console.log(
        "[useUserSchool DEBUG 5] User is null after authLoading is false. Setting error."
      );
      setError(
        "Usuário não autenticado no Firebase Auth. Redirecionando para login."
      );
      setIsLoading(false);
      return;
    }

    // A partir daqui, sabemos que user NÃO É nulo e authLoading É falso.
    console.log(
      "[useUserSchool DEBUG 6] User is authenticated. Proceeding to fetch detailed data."
    );
    console.log(
      "[useUserSchool DEBUG 7] User object (from useAuth):",
      JSON.stringify(user, null, 2)
    ); // Log do objeto user completo
    console.log(
      "[useUserSchool DEBUG 8] User UID (for Firestore doc):",
      user.uid
    ); // Log do UID que será usado

    setIsLoading(true); // Reinicia loading para a busca de dados detalhados
    setError(null); // Limpa erros

    const fetchUserData = async () => {
      try {
        // Se o objeto 'user' do AuthContext já vem com 'escolaId' e 'escolas',
        // você pode usá-lo diretamente, sem outra busca por 'usuarios'
        if (user.escolaId && user.escolas) {
          // Assumindo que AuthContext já carrega esses dados
          console.log(
            "[useUserSchool DEBUG 9] User data already available from AuthContext. No Firestore fetch needed."
          );
          setUserSchoolData({
            id: user.uid,
            perfil: user.perfil,
            escolaId: user.escolaId,
            escolasVinculadasIds:
              user.escolasVinculadasIds ||
              (user.escolas ? Object.keys(user.escolas) : []),
          });
          setIsLoading(false);
          return;
        }

        // Fallback: Se AuthContext não carrega tudo, busca aqui.
        console.log(
          "[useUserSchool DEBUG 10] Fetching user data from Firestore for UID:",
          user.uid
        ); // Log da tentativa de fetch no Firestore
        const userDocRef = doc(db, "usuarios", user.uid); // A linha que pode falhar se user.uid é inválido
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const escolasVinculadasIds = userData.escolas
            ? Object.keys(userData.escolas)
            : [];
          setUserSchoolData({
            id: user.uid,
            perfil: userData.perfil,
            escolaId:
              userData.escolaId ||
              (escolasVinculadasIds.length > 0
                ? escolasVinculadasIds[0]
                : null),
            escolasVinculadasIds: escolasVinculadasIds,
          });
          console.log(
            "[useUserSchool DEBUG 11] User data successfully fetched from Firestore."
          );
        } else {
          console.error(
            "[useUserSchool ERROR 12] Dados do perfil do usuário não encontrados no Firestore para UID:",
            user.uid
          );
          setError("Dados do perfil do usuário não encontrados no Firestore.");
        }
      } catch (err) {
        console.error(
          "[useUserSchool ERROR 13] Erro ao buscar dados da escola do usuário (try/catch):",
          err
        ); // Capture erros aqui
        setError("Erro ao carregar dados do usuário. Tente novamente.");
      } finally {
        setIsLoading(false);
        console.log("[useUserSchool DEBUG 14] fetchUserData finished.");
      }
    };

    fetchUserData();
  }, [user, authLoading]); // Depende do user e authLoading do AuthContext

  return { userSchoolData, isLoading, error };
};
