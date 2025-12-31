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

  // --- 1. Loader ---
  if (!isAuthReady || isLoadingProfile) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020617] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold tracking-widest uppercase">
            Carregando Perfil...
          </span>
        </div>
      </div>
    );
  }

  // --- 2. Rotas Públicas ---
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

  // --- 3. CORREÇÃO DA SUJEIRA NO PERFIL ---
  // Remove aspas simples (') ou duplas (") que vieram do JSON mal formatado
  const usuarioPerfil = user?.perfil
    ? user.perfil.replace(/['"]+/g, "").trim().toLowerCase()
    : "";

  const usuarioEmail = user?.email?.trim().toLowerCase();

  // --- 4. Superusuário ---
  const isSuperUser =
    usuarioEmail === desenvolvedoraEmail.toLowerCase() ||
    usuarioPerfil === PERFIS.DESENVOLVEDOR?.toLowerCase(); // Safe check

  if (isSuperUser) {
    return publicRoutes.includes(location.pathname) ? (
      <Navigate to="/painel-dev" replace />
    ) : (
      <Outlet />
    );
  }

  // --- 5. Logado tentando acessar rota pública ---
  if (publicRoutes.includes(location.pathname)) {
    const destino = perfilRedirectMap[usuarioPerfil] || "/";
    return <Navigate to={destino} replace />;
  }

  // --- 6. Verificação de Permissões ---

  // Tenta encontrar a configuração exata ou parcial da rota
  const rotaBase = Object.keys(AUTORIZACAO_ROTAS).find((base) =>
    matchPath({ path: base, end: false }, location.pathname)
  );

  const permissoes = rotaBase ? AUTORIZACAO_ROTAS[rotaBase] : [];

  // DEBUG DETALHADO NO CONSOLE
  if (permissoes.length === 0) {
    console.warn(
      `⚠️ AVISO: A rota '${location.pathname}' NÃO está cadastrada em AUTORIZACAO_ROTAS.`
    );
    console.warn("Isso fará o sistema bloquear o acesso por segurança.");
  }

  // Se a rota tem permissões definidas, verifica se o usuário tem o perfil
  if (permissoes.length > 0) {
    const perfilPermitido = permissoes
      .map((p) => p.replace(/['"]+/g, "").toLowerCase())
      .includes(usuarioPerfil);

    if (!perfilPermitido) {
      console.error(
        `⛔ ACESSO NEGADO. Usuário: '${usuarioPerfil}' | Rota exige: [${permissoes.join(
          ", "
        )}]`
      );
      const destino = perfilRedirectMap[usuarioPerfil] || "/";
      return <Navigate to={destino} replace />;
    }
  }

  // --- 7. Se passou por tudo, libera ---
  return <Outlet />;
}

export default PrivateRoute;
