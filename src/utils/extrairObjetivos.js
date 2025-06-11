import { avaliacaoInicialEstruturada } from "../data/avaliacaoInicialData.js"; // ajuste o caminho conforme necessário

console.log("📚 Habilidades por Área e Subárea:\n");

Object.entries(avaliacaoInicialEstruturada).forEach(([area, itens]) => {
  console.log(`🔷 ${area.toUpperCase()}\n`);

  // Agrupar por subárea
  const subareasMap = {};

  itens.forEach((item) => {
    if (!subareasMap[item.subarea]) {
      subareasMap[item.subarea] = [];
    }
    subareasMap[item.subarea].push(item.habilidade);
  });

  // Exibir cada subárea e suas habilidades
  Object.entries(subareasMap).forEach(([subarea, habilidades]) => {
    console.log(`  🔸 Subárea: ${subarea}`);
    habilidades.forEach((habilidade, index) => {
      console.log(`    ${index + 1}. ${habilidade}`);
    });
    console.log(""); // linha em branco entre subáreas
  });

  console.log(""); // linha em branco entre áreas
});