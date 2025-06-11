// src/components/PrivateRoute.jsx

import React, { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation, matchPath } from "react-router-dom";
import { PERFIS } from "../config/constants";
import {
  AUTORIZACAO_ROTAS,
  desenvolvedoraEmail,
  perfilRedirectMap,
} from "../config/routesConfig";

function PrivateRoute() {
  const location = useLocation();
  const [usuario, setUsuario] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    try {
      const userData = localStorage.getItem("usuarioLogado");
      setUsuario(userData ? JSON.parse(userData) : null);
    } catch (e) {
      console.error("Erro ao parsear usuarioLogado do localStorage:", e);
      setUsuario(null);
    } finally {
      setLoadingAuth(false);
    }
  }, [location.pathname]);

  if (loadingAuth) {
    return <div className="app-loading">Verificando autenticação...</div>;
  }

  const usuarioPerfil = usuario?.perfil?.toLowerCase() || "";
  const usuarioEmail = usuario?.email?.trim().toLowerCase();

  const publicRoutes = [
    "/",
    "/login",
    "/recuperar-senha",
    "/cadastro-professor",
  ];

  // --- 1. Não logado ---
  if (!usuario) {
    return publicRoutes.includes(location.pathname) ? (
      <Outlet />
    ) : (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  // --- 2. Superusuário ---
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

  // --- 3. Logado tentando acessar rota pública ---
  if (publicRoutes.includes(location.pathname)) {
    return <Navigate to={perfilRedirectMap[usuarioPerfil] || "/"} replace />;
  }

  // --- 4. Verificação de autorização para a rota atual ---
  const rotaBase = Object.keys(AUTORIZACAO_ROTAS).find((base) =>
    matchPath({ path: base, end: false }, location.pathname)
  );

  const permissoes = rotaBase ? AUTORIZACAO_ROTAS[rotaBase] : [];

  if (
    permissoes.length > 0 &&
    !permissoes.map((p) => p.toLowerCase()).includes(usuarioPerfil)
  ) {
    return <Navigate to={perfilRedirectMap[usuarioPerfil] || "/"} replace />;
  }

  // --- 5. Acesso permitido ---
  return <Outlet />;
}

export default PrivateRoute;
