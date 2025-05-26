import estruturaPEI from "../data/estruturaPEI.js";

// Lista final para armazenar os dados extraídos
const dadosExtraidos = [];

for (const [area, subareas] of Object.entries(estruturaPEI)) {
  for (const [subarea, objetivos] of Object.entries(subareas)) {
    for (const [nomeObjetivo, niveis] of Object.entries(objetivos)) {
      for (const [nivel, conteudo] of Object.entries(niveis)) {
        if (conteudo?.objetivo) {
          dadosExtraidos.push({
            area,
            subarea,
            objetivo: conteudo.objetivo,
            nivel
          });
        }
      }
    }
  }
}

// Imprimir no terminal
dadosExtraidos.forEach((item) => {
  console.log(`${item.area} | ${item.subarea} | ${item.nivel}: ${item.objetivo}`);
});