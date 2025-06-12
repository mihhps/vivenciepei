// .eslintrc.js (na RAIZ do projeto, ao lado de package.json)

module.exports = {
  root: true, // Indica que esta é a raiz da configuração do ESLint
  env: {
    browser: true, // Habilita variáveis globais do navegador (window, document, fetch, setTimeout, etc.)
    es2021: true, // Habilita as últimas features do ES (para async/await, optional chaining etc.)
    node: false, // Desabilita variáveis globais de Node.js
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended", // Habilita regras recomendadas para React
    "plugin:react-hooks/recommended", // Habilita regras para Hooks do React
    "plugin:jsx-a11y/recommended", // Melhora a acessibilidade do JSX
    "plugin:prettier/recommended", // Integra Prettier e ESLint
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true, // Habilita o parsing de JSX
    },
    ecmaVersion: 2021, // Ou 2022, "latest"
    sourceType: "module", // Usa módulos ES (import/export)
  },
  settings: {
    react: {
      version: "detect", // Detecta a versão do React instalada
    },
  },
  rules: {
    // Suas regras personalizadas para o frontend
    "react/react-in-jsx-scope": "off", // Para React 17+ não precisar importar React no arquivo
    "react/prop-types": "warn", // Muda de erro para aviso para PropTypes
    "no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_e",
      },
    ], // Aviso para vars não usadas
    "no-prototype-builtins": "off", // Desabilita se você usa muito Object.prototype.hasOwnProperty.call
    "no-undef": "error", // Manter erro para variáveis não definidas
    "no-case-declarations": "error", // Manter erro
    "no-empty": ["error", { allowEmptyCatch: true }], // Permitir catch vazio
    "no-control-regex": "off", // Desabilitar se houver muitas expressões regulares de libs
    "getter-return": "warn", // Mudar para warn para getters sem return
    // Regras específicas de DOM/Browser que podem dar no-undef para libs externas
    "no-undef": [
      "error",
      {
        typeof: [
          "OffscreenCanvas",
          "ReadableStream",
          "CompressionStream",
          "Response",
          "self",
          "DOMMatrix",
          "ImageDecoder",
          "createImageBitmap",
          "Blob",
          "URL",
          "crypto",
          "performance",
          "atob",
          "XMLHttpRequest",
          "TextDecoder",
          "WebAssembly",
          "navigator",
          "setTimeout",
          "clearTimeout",
        ],
      },
    ], // Lista as globais de navegador
    // Para no-unescaped-entities
    "react/no-unescaped-entities": [
      "error",
      { forbid: [">", "}", ")", '"', "'", "]]"] },
    ], // Configure as entidades permitidas, ou use HTML entities
  },
  // Ignorar arquivos e pastas para esta configuração de linter (na raiz do projeto)
  ignorePatterns: [
    "node_modules/",
    "build/",
    "dist/",
    "public/**/*.mjs", // Ignora arquivos compilados ou de libs na pasta public (pdf.worker.min.mjs)
    "functions/", // Ignora a pasta de funções, pois ela tem sua própria configuração
    "src/styles/", // Se tiver arquivos CSS que o ESLint tenta parsear
  ],
};
