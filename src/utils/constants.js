// src/utils/constants.js

export const NIVEIS_PROGRESSAO = ["NR", "AF", "AG", "AV", "AVi", "I"];

export const LEGENDA_NIVEIS = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
  NA: "Não aplicável",
};

export const PERFIS_INICIADORES = [
  "gestao",
  "aee",
  "professor",
  "professor regente",
  "professor de suporte",
  "diretor",
  "diretor adjunto",
  "orientador pedagógico",
  "seme",
  "desenvolvedor",
];

// CERTIFIQUE-SE DE QUE ESTA FUNÇÃO ESTÁ PRESENTE E EXPORTADA AQUI
export function getTrimestreAtual() {
  // <-- Note o 'export' aqui
  const hoje = new Date();
  const mes = hoje.getMonth() + 1; // getMonth() retorna 0-11

  // Considerando o calendário escolar brasileiro como exemplo (ajuste conforme necessário)
  if (mes >= 2 && mes <= 4) return "1"; // Fevereiro, Março, Abril
  if (mes >= 5 && mes <= 7) return "2"; // Maio, Junho, Julho
  if (mes >= 8 && mes >= 10) return "3"; // Agosto, Setembro, Outubro
  return "4"; // Novembro, Dezembro, Janeiro (ou "Extra/Verão")
}
