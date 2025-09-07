import React from "react";
import { Navigate, Outlet, useLocation, matchPath } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PERFIS } from "../config/constants";
import {
  AUTORIZACAO_ROTAS,
  desenvolvedoraEmail,
  perfilRedirectMap,
} from "../config/routesConfig";

function PrivateRoute() {
  const location = useLocation();
  const { userId, user, isAuthReady, isLoadingProfile } = useAuth();

  // --- 1. Exibe um loader enquanto a autenticação e o perfil estão carregando ---
  if (!isAuthReady || isLoadingProfile) {
    return (
      <div className="app-loading">
        Verificando autenticação e carregando perfil...
      </div>
    );
  }

  // --- 2. Não logado (userId é null) ---
  const publicRoutes = [
    "/",
    "/login",
    "/recuperar-senha",
    "/cadastro-professor",
  ];

  if (!userId) {
    return publicRoutes.includes(location.pathname) ? (
      <Outlet />
    ) : (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  // ##### A CORREÇÃO ESTÁ AQUI #####
  // Adicionado .trim() para remover espaços em branco do início e do fim do perfil
  const usuarioPerfil = user?.perfil?.trim().toLowerCase() || "";
  const usuarioEmail = user?.email?.trim().toLowerCase();

  // --- Linha de depuração adicionada aqui ---
  console.log(
    "Perfil:",
    usuarioPerfil,
    " | Rota de redirecionamento esperada:",
    perfilRedirectMap[usuarioPerfil]
  );

  // --- 3. Superusuário (Desenvolvedor) ---
  const isSuperUser =
    usuarioEmail === desenvolvedoraEmail.toLowerCase() ||
    usuarioPerfil === PERFIS.DESENVOLVEDOR.toLowerCase();

  if (isSuperUser) {
    return publicRoutes.includes(location.pathname) ? (
      <Navigate to="/painel-dev" replace />
    ) : (
      <Outlet />
    );
  }

  // --- 4. Logado tentando acessar rota pública ---
  if (publicRoutes.includes(location.pathname)) {
    return <Navigate to={perfilRedirectMap[usuarioPerfil] || "/"} replace />;
  }

  // --- 5. Verificação de autorização para a rota atual ---
  console.log(
    "[PrivateRoute] Verificando acesso. Perfil:",
    `'${usuarioPerfil}'`, // Adicionado aspas para ver espaços
    " | Rota:",
    location.pathname
  );

  const rotaBase = Object.keys(AUTORIZACAO_ROTAS).find((base) =>
    matchPath({ path: base, end: false }, location.pathname)
  );

  const permissoes = rotaBase ? AUTORIZACAO_ROTAS[rotaBase] : [];

  console.log("[PrivateRoute] Permissões para esta rota:", permissoes);

  if (
    permissoes.length > 0 &&
    !permissoes.map((p) => p.toLowerCase()).includes(usuarioPerfil)
  ) {
    console.warn(
      `[PrivateRoute] Acesso negado para o perfil '${usuarioPerfil}' na rota '${location.pathname}'. Redirecionando.`
    );
    return <Navigate to={perfilRedirectMap[usuarioPerfil] || "/"} replace />;
  }

  // --- 6. Acesso permitido ---
  return <Outlet />;
}

export default PrivateRoute;
