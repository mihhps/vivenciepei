// src/components/PrivateRoute.jsx

import React from "react";
import { Navigate, Outlet, useLocation, matchPath } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Importa o useAuth
import { PERFIS } from "../config/constants";
import {
  AUTORIZACAO_ROTAS,
  desenvolvedoraEmail,
  perfilRedirectMap,
} from "../config/routesConfig";

function PrivateRoute() {
  const location = useLocation();
  // Usa o hook useAuth para obter o estado de autenticação e perfil
  const { userId, user, isAuthReady, isLoadingProfile } = useAuth();

  // --- 1. Exibe um loader enquanto a autenticação e o perfil estão carregando ---
  // É crucial esperar por ambos os estados para evitar redirecionamentos prematuros
  if (!isAuthReady || isLoadingProfile) {
    return (
      <div className="app-loading">
        Verificando autenticação e carregando perfil...
      </div>
    );
  }

  // Agora que a autenticação e o perfil estão prontos:

  // --- 2. Não logado (userId é null) ---
  const publicRoutes = [
    "/",
    "/login",
    "/recuperar-senha",
    "/cadastro-professor",
  ];

  if (!userId) {
    // Se não há userId e a rota não é pública, redireciona para o login
    return publicRoutes.includes(location.pathname) ? (
      <Outlet /> // Permite acesso a rotas públicas se não logado
    ) : (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  // Se o usuário está logado (userId existe), obtenha os dados do perfil
  const usuarioPerfil = user?.perfil?.toLowerCase() || "";
  const usuarioEmail = user?.email?.trim().toLowerCase();

  // --- 3. Superusuário (Desenvolvedor) ---
  const isSuperUser =
    usuarioEmail === desenvolvedoraEmail.toLowerCase() ||
    usuarioPerfil === PERFIS.DESENVOLVEDOR.toLowerCase();

  if (isSuperUser) {
    // Se é superusuário e está tentando acessar uma rota pública, redireciona para o painel dev
    return publicRoutes.includes(location.pathname) ? (
      <Navigate to="/painel-dev" replace />
    ) : (
      <Outlet /> // Permite acesso a todas as outras rotas
    );
  }

  // --- 4. Logado tentando acessar rota pública ---
  // Se o usuário está logado e tenta acessar uma rota pública, redireciona para o seu painel padrão
  if (publicRoutes.includes(location.pathname)) {
    return <Navigate to={perfilRedirectMap[usuarioPerfil] || "/"} replace />;
  }

  // --- 5. Verificação de autorização para a rota atual ---
  // Encontra a rota base que corresponde ao caminho atual
  const rotaBase = Object.keys(AUTORIZACAO_ROTAS).find((base) =>
    matchPath({ path: base, end: false }, location.pathname)
  );

  // Obtém as permissões para a rota base encontrada
  const permissoes = rotaBase ? AUTORIZACAO_ROTAS[rotaBase] : [];

  // Se a rota tem permissões definidas e o perfil do usuário não está entre elas, redireciona
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
  // Se todas as verificações passaram, permite o acesso à rota
  return <Outlet />;
}

export default PrivateRoute;
