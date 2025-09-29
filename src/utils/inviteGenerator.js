// src/utils/inviteGenerator.js

/**
 * Gera um código de convite único e fácil de ler.
 * Exemplo: A8BC-XYZ9
 * @returns {string} O código de convite gerado.
 */
export const generateInviteCode = () => {
  // Gera duas partes alfanuméricas de 4 caracteres
  const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${part1}-${part2}`;
};
