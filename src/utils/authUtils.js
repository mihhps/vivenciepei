// src/utils/authUtils.js

/**
 * Verifica se o perfil do usuário logado tem permissão para acessar determinadas áreas.
 * Esta função é um utilitário de permissão comum.
 * @param {string} perfil - Perfil do usuário (ex: "gestao", "professor", "aee", "desenvolvedor", "seme").
 * @returns {boolean} True se o perfil for autorizado, false caso contrário.
 */
export const isAuthorized = (perfil) => {
  // <--- PRECISA TER 'export const' AQUI
  return ["gestao", "seme", "aee", "desenvolvedor", "professor"].includes(
    perfil
  );
};
