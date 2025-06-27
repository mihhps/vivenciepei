// src/utils/helpers.js

export function calcularIdadeEFaixa(nascimento) {
  if (!nascimento) return ["-", "-"];
  const hoje = new Date();
  const nasc = new Date(nascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  let faixa =
    idade <= 3
      ? "0-3 anos"
      : idade <= 5
        ? "4-5 anos"
        : idade <= 8
          ? "6-8 anos"
          : idade <= 11
            ? "9-11 anos"
            : "12+ anos";
  return [idade, faixa];
}

// **COLE A NOVA VERSÃO DE formatarData AQUI, SUBSTITUINDO A ANTIGA**
export function formatarData(data) {
  // Mudança de dataISO para data no parâmetro é um detalhe, data funciona bem.
  if (!data) {
    return "-"; // Retorna "-" se a data for nula ou indefinida
  }

  let dataObjeto;

  // Tenta converter se for um Timestamp do Firebase (para futuras compatibilidades)
  if (
    typeof data === "object" &&
    data.toDate &&
    typeof data.toDate === "function"
  ) {
    dataObjeto = data.toDate();
  }
  // Tenta converter se for uma string no formato "YYYY-MM-DD" (o seu caso atual)
  else if (typeof data === "string" && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Adiciona "T00:00:00" para garantir que seja interpretado como UTC
    // ou para evitar problemas de fuso horário em alguns navegadores.
    dataObjeto = new Date(data + "T00:00:00");
  }
  // Assume que já é um objeto Date ou algo que o construtor Date pode entender
  else {
    dataObjeto = new Date(data);
  }

  // Verifica se a conversão resultou em uma data válida
  if (isNaN(dataObjeto.getTime())) {
    return "-"; // Retorna "-" se a data ainda for inválida
  }

  const dia = String(dataObjeto.getDate()).padStart(2, "0");
  const mes = String(dataObjeto.getMonth() + 1).padStart(2, "0"); // Mês é base 0
  const ano = dataObjeto.getFullYear();

  return `${dia}/${mes}/${ano}`; // Use '/' para o formato DD/MM/AAAA, que é mais comum no Brasil.
}

export function agruparMetasPorArea(resumoPEI) {
  const metasAgrupadas = {};
  resumoPEI?.forEach((meta) => {
    if (!metasAgrupadas[meta.area]) metasAgrupadas[meta.area] = {};
    if (!metasAgrupadas[meta.area][meta.subarea])
      metasAgrupadas[meta.area][meta.subarea] = [];
    metasAgrupadas[meta.area][meta.subarea].push(meta);
  });
  return metasAgrupadas;
}

export const coresPorNivel = {
  NR: "#ffcccc",
  AF: "#fff2cc",
  AL: "#cce5ff",
  AG: "#d0f0c0",
  AV: "#eeeeee",
  I: "#f0ccff",
};
