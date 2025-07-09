// src/scripts/refatorarEstruturaPEI.mjs

import fs from "fs";
import path from "path";
import { createRequire } from "module"; // <-- NOVO: Importa createRequire
const require = createRequire(import.meta.url); // <-- NOVO: Cria uma função require para este módulo

// ====================================================================================
// PASSO CRÍTICO: DEFINA O CAMINHO ABSOLUTO PARA A RAIZ DO SEU PROJETO
// ====================================================================================
// Este é o caminho completo da pasta 'vivenciepei'.
// Por favor, CONFIRME que este é o caminho EXATO no seu sistema.
const PROJECT_BASE_PATH = "/Users/aeeemebolf/Documents/vivenciepei";
// ====================================================================================

// NOVO: Usamos `require` para importar os módulos.
// Como `require` não entende template literals com variáveis diretamente,
// usamos `path.join` para construir o caminho de forma segura no sistema de arquivos.
const estruturaPEIOriginal = require(
  path.join(PROJECT_BASE_PATH, "src", "data", "estruturaPEI2.js")
).default;
const { mapeamentoHabilidadesParaInfinitivo } = require(
  path.join(PROJECT_BASE_PATH, "src", "data", "habilidadeMapeamento.js")
);

// Define o caminho completo para o arquivo estruturaPEI2.js, onde as alterações serão salvas.
// Usamos path.join para construir o caminho de forma segura no sistema de arquivos.
const filePath = path.join(
  PROJECT_BASE_PATH,
  "src",
  "data",
  "estruturaPEI2.js" // Nome do arquivo corrigido
);

// Função principal que executa a refatoração
async function runRefactor() {
  console.log("------------------------------------------");
  console.log("Iniciando a refatoração do estruturaPEI2.js..."); // Nome do arquivo no log
  console.log("------------------------------------------");
  console.log(`Verificando e atualizando o arquivo: ${filePath}`);

  try {
    // As importações já foram feitas no topo do arquivo.
    // O código de processamento segue como estava.

    let estruturaPEINova = JSON.parse(JSON.stringify(estruturaPEIOriginal));
    let totalHabilidadesAtualizadas = 0;

    for (const area in estruturaPEINova) {
      if (estruturaPEINova.hasOwnProperty(area)) {
        const subareas = estruturaPEINova[area];
        for (const subarea in subareas) {
          if (subareas.hasOwnProperty(subarea)) {
            const habilidades = subareas[subarea];
            let novasHabilidades = {};
            for (const habilidadeAntiga in habilidades) {
              if (habilidades.hasOwnProperty(habilidadeAntiga)) {
                if (mapeamentoHabilidadesParaInfinitivo[habilidadeAntiga]) {
                  const habilidadeNova =
                    mapeamentoHabilidadesParaInfinitivo[habilidadeAntiga];
                  novasHabilidades[habilidadeNova] =
                    habilidades[habilidadeAntiga];
                  totalHabilidadesAtualizadas++;
                  console.log(
                    `  > Habilidade atualizada em '${area}' > '${subarea}': '${habilidadeAntiga}' -> '${habilidadeNova}'`
                  );
                } else {
                  novasHabilidades[habilidadeAntiga] =
                    habilidades[habilidadeAntiga];
                }
              }
            }
            estruturaPEINova[area][subarea] = novasHabilidades;
          }
        }
      }
    }

    const fileContent = `const estruturaPEI = ${JSON.stringify(
      estruturaPEINova,
      null,
      2
    )};\n\nexport default estruturaPEI;\n`;

    fs.writeFileSync(filePath, fileContent, "utf8");
    console.log("------------------------------------------");
    console.log(`Refatoração concluída com sucesso!`);
    console.log(
      `Total de ${totalHabilidadesAtualizadas} habilidades atualizadas no arquivo '${filePath}'.`
    );
    console.log("------------------------------------------");
  } catch (error) {
    console.error("------------------------------------------");
    console.error("ERRO fatal no script:", error);
    console.error("------------------------------------------");
  }
}

// Chama a função principal para executar a refatoração.
runRefactor().catch((error) => {
  console.error("Erro inesperado ao executar runRefactor:", error);
});
