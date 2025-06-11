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

  // O useEffect agora reavalia o login a cada mudança de rota
  useEffect(() => {
    try {
      const userData = localStorage.getItem("usuarioLogado");
      setUsuario(userData ? JSON.parse(userData) : null);
    } catch {
      setUsuario(null);
    } finally {
      setLoadingAuth(false);
    }
  }, [location.pathname]);

  // ==================================================================
  // --- INÍCIO DO BLOCO DE DEBUG ---
  // Este código vai nos mostrar os valores exatos durante a execução
  // Ele roda a cada vez que você navega para uma nova página.
  console.clear(); // Limpa o console para facilitar a leitura
  console.log(
    "%c--- DEBUG DE ROTA PROTEGIDA ---",
    "background: #1d3557; color: #fff; font-size: 14px; padding: 2px;"
  );
  console.log("Caminho que estou tentando acessar:", location.pathname);
  console.log("Objeto 'usuario' que o PrivateRoute está vendo:", usuario);

  if (usuario) {
    // --- ADICIONE ESTA LINHA PARA PADRONIZAR O PERFIL ---
    const usuarioPerfilFormatado = usuario.perfil
      ? usuario.perfil.toLowerCase()
      : "";
    console.log("-> Perfil do usuário (original):", usuario.perfil);
    console.log(
      "-> Perfil do usuário (formatado p/ minúsculas):",
      usuarioPerfilFormatado
    ); // Adicionado para debug

    console.log(
      "-> Perfil de DEV esperado da configuração:",
      PERFIS.DESENVOLVEDOR
    );

    // Testando a condição de Super Usuário
    const isSuperUserCheck =
      usuario.email?.trim().toLowerCase() ===
        desenvolvedoraEmail.toLowerCase() ||
      usuario.perfil === PERFIS.DESENVOLVEDOR; // <<<<<< Manter 'usuario.perfil' aqui se PERFIS.DESENVOLVEDOR já estiver em maiúsculas como "DESENVOLVEDOR"
    console.log("-> É considerado Super Usuário?", isSuperUserCheck);

    // Testando a condição de Rota Autorizada (só se não for Super Usuário)
    if (!isSuperUserCheck) {
      const rotaBase = Object.keys(AUTORIZACAO_ROTAS).find((base) =>
        matchPath({ path: base, end: false }, location.pathname)
      );
      console.log(
        "-> Regra encontrada na configuração para esta rota:",
        rotaBase
      );

      if (rotaBase) {
        const allowedRoles = AUTORIZACAO_ROTAS[rotaBase];
        console.log("-> Perfis permitidos para esta rota:", allowedRoles);
        // --- USE O PERFIL FORMATADO AQUI ---
        const isAllowed = allowedRoles.includes(usuarioPerfilFormatado);
        console.log(
          "-> Meu perfil formatado está na lista de permissões?",
          isAllowed
        );
      } else {
        console.log(
          "-> Nenhuma regra específica encontrada em AUTORIZACAO_ROTAS para este caminho."
        );
      }
    }
  } else {
    console.log(
      "-> Objeto 'usuario' está nulo ou indefinido no momento da verificação."
    );
  }
  console.log("--- FIM DO DEBUG ---");
  // --- FIM DO BLOCO DE DEPURAÇÃO ---
  // ==================================================================

  const publicRoutes = [
    "/",
    "/login",
    "/recuperar-senha",
    "/cadastro-professor",
  ];

  if (loadingAuth) {
    return <div className="app-loading">Verificando autenticação...</div>;
  }

  // Se não há usuário logado e não é uma rota pública, redireciona para login
  if (!usuario) {
    if (publicRoutes.includes(location.pathname)) return <Outlet />;
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // --- ADICIONE ESTA LINHA AQUI TAMBÉM ---
  const usuarioPerfilFormatado = usuario.perfil
    ? usuario.perfil.toLowerCase()
    : "";

  // Lógica para Super Usuário (Desenvolvedor)
  // Certifique-se que PERFIS.DESENVOLVEDOR está em maiúsculas se o comparar com usuario.perfil diretamente
  // Ou use usuarioPerfilFormatado se PERFIS.DESENVOLVEDOR estiver em minúsculas
  const isSuperUser =
    usuario.email?.trim().toLowerCase() === desenvolvedoraEmail.toLowerCase() ||
    usuarioPerfilFormatado === PERFIS.DESENVOLVEDOR.toLowerCase(); // <<<<<< Modificado para padronizar DEV também

  if (isSuperUser) {
    if (publicRoutes.includes(location.pathname))
      return <Navigate to="/painel-dev" replace />;
    return <Outlet />; // Permite acesso a qualquer rota se for Super Usuário
  }

  // Redireciona usuários logados de rotas públicas para sua rota padrão
  if (publicRoutes.includes(location.pathname)) {
    // Usa o perfil formatado aqui também para o redirect map
    return (
      <Navigate to={perfilRedirectMap[usuarioPerfilFormatado] || "/"} replace />
    );
  }

  // Lógica de autorização baseada em rota
  const rotaBase = Object.keys(AUTORIZACAO_ROTAS).find((base) =>
    matchPath({ path: base, end: false }, location.pathname)
  );
  // Garante que allowedRoles seja um array, mesmo que rotaBase não encontre nada
  const allowedRoles = rotaBase ? AUTORIZACAO_ROTAS[rotaBase] : [];

  // Se há roles permitidos para a rota E o perfil formatado do usuário NÃO está entre eles, redireciona
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(usuarioPerfilFormatado)
  ) {
    return (
      <Navigate to={perfilRedirectMap[usuarioPerfilFormatado] || "/"} replace />
    );
  }

  // Se tudo passou, permite o acesso à rota
  return <Outlet />;
}

export default PrivateRoute;
