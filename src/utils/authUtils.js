// src/utils/authUtils.js

/**
 * Verifica se o perfil do usuário logado tem permissão para acessar determinadas áreas.
 * Esta função é um utilitário de permissão comum.
 * @param {string} perfil - Perfil do usuário (ex: "gestao", "professor", "aee", "desenvolvedor", "seme").
 * @returns {boolean} True se o perfil for autorizado, false caso contrário.
 */
export const isAuthorized = (perfil) => {
  // Converte o perfil recebido para minúsculas antes de verificar.
  // Isso garante que "Desenvolvedor" ou "GESTAO" sejam tratados como "desenvolvedor" e "gestao".
  const perfilLowerCase = perfil ? perfil.toLowerCase() : "";

  return [
    "gestao",
    "seme",
    "aee",
    "desenvolvedor",
    "professor",
    "diretor", // Inclua outros perfis se necessário, ex: "diretor", "diretor adjunto", "orientador pedagógico", "gestao" (já inclusa)
    "diretor adjunto",
    "orientador pedagógico",
  ].includes(perfilLowerCase);
};
