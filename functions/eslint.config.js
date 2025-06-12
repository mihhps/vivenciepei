// /Users/aeeemebolf/Documents/vivenciepei/functions/eslint.config.js

const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
  // --- Configuração para todo o projeto (Backend, Node.js) ---
  {
    // Define quais arquivos esta configuração se aplica (sua pasta functions)
    files: ["**/*.js"], // Aplica-se a todos os .js nesta pasta e subpastas
    ignores: ["node_modules/**", "*.mjs"], // Ignora node_modules e arquivos .mjs compilados de libs

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs", // Suas Cloud Functions usam 'require', então CommonJS
      globals: {
        ...globals.node, // Variáveis globais do Node.js
        functions: "readonly", // Variável global do Firebase Functions
        admin: "readonly", // Variável global do Firebase Admin SDK
        firebase: "readonly", // Se usar a global 'firebase'
      },
    },
    rules: {
      // Regras gerais para o código Node.js
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      "no-restricted-globals": "off",
      "prefer-arrow-callback": "error",
      "no-use-before-define": "off",
      indent: ["error", 2, { SwitchCase: 0 }],
      "new-cap": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }], // Aviso para vars não usadas, ignorando as que começam com _
      "no-prototype-builtins": "warn", // Mudar para aviso para não quebrar
      "no-undef": "error", // Manter erro para variáveis não definidas em Node.js
      "no-case-declarations": "error", // Manter erro para variáveis dentro de case sem bloco
      "getter-return": "warn", // Manter aviso para getters sem return
      "no-empty": ["error", { allowEmptyCatch: true }], // Permitir catch vazio
    },
  },

  // --- Configuração para arquivos de teste (se usar Mocha) ---
  {
    files: ["**/*.spec.*"], // Aplica-se a arquivos que terminam com .spec.
    languageOptions: {
      globals: {
        ...globals.mocha, // Variáveis globais do Mocha
      },
    },
    rules: {}, // Regras específicas para testes, se houver
  },

  // --- Regra para ignorar a pasta 'src' do frontend (nível superior) ---
  // IMPORTANTE: Isso ignora a pasta 'src' para QUALQUER configuração neste eslint.config.js.
  // A configuração do frontend (src/) DEVE estar em um arquivo `.eslintrc.js` na raiz do PROJETO.
  {
    ignores: ["../src/**"], // Ignora qualquer arquivo dentro da pasta 'src' na raiz do projeto
  },
];
