// /Users/aeeemebolf/Documents/vivenciepei/functions/eslint.config.js

const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
  // Configurações recomendadas básicas do ESLint
  js.configs.recommended,

  // Configuração específica para o ambiente das Cloud Functions (Node.js)
  {
    languageOptions: {
      ecmaVersion: 2018, // Ou uma versão mais recente (ex: 2022) se você usa features novas
      sourceType: "commonjs", // ESSENCIAL para 'require', 'module', 'exports'
      globals: {
        ...globals.node, // Inclui todas as variáveis globais do Node.js (console, process, require, module, exports)
        functions: "readonly", // Variável global do Firebase Functions
        admin: "readonly", // Variável global do Firebase Admin SDK
        firebase: "readonly", // Se você usar a global 'firebase'
      },
    },
    rules: {
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      "no-restricted-globals": "off", // Desativa a regra 'no-restricted-globals'
      "prefer-arrow-callback": "error",
      "no-use-before-define": "off",
      indent: ["error", 2, { SwitchCase: 0 }],
      "new-cap": "off",
    },
  },

  // Configuração para arquivos de teste (se você usa Mocha)
  {
    files: ["**/*.spec.*"], // Aplica-se a arquivos que terminam com .spec.
    languageOptions: {
      globals: {
        ...globals.mocha, // Variáveis globais do Mocha
      },
    },
    rules: {},
  },
];
