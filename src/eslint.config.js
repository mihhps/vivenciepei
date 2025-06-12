// /Users/aeeemebolf/Documents/vivenciepei/eslint.config.js

const globals = require("globals");
const js = require("@eslint/js");
const pluginReact = require("eslint-plugin-react");
const pluginReactHooks = require("eslint-plugin-react-hooks");
const pluginJsxA11y = require("eslint-plugin-jsx-a11y");
const pluginPrettier = require("eslint-plugin-prettier"); // Se você usa eslint-plugin-prettier

module.exports = [
  // --- Configuração de Ignorar Global ---
  // Ignora node_modules, pastas de build e a pasta functions para linting do frontend
  {
    ignores: [
      "node_modules/**",
      "build/**",
      "dist/**",
      "functions/**", // Ignora a pasta functions inteira para esta configuração
      "public/**/*.mjs", // Ignora arquivos compilados de libs na pasta public
      "src/styles/**", // Exemplo: se houver arquivos CSS que o ESLint tente parsear
    ],
  },

  // --- Configuração para o AMBIENTE NODE.JS (suas Cloud Functions) ---
  {
    files: ["functions/**/*.js"], // Aplica-se a todos os arquivos .js dentro da pasta functions
    extends: [js.configs.recommended, "google"], // Exemplo: Mantém o google config para Node.js
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs", // Suas Cloud Functions usam 'require', então CommonJS
      globals: {
        ...globals.node,
        functions: "readonly",
        admin: "readonly",
        firebase: "readonly",
      },
    },
    rules: {
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      "no-restricted-globals": "off",
      "prefer-arrow-callback": "error",
      "no-use-before-define": "off",
      indent: ["error", 2, { SwitchCase: 0 }],
      "new-cap": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-prototype-builtins": "warn",
      "no-undef": "error",
      "no-case-declarations": "error",
      "getter-return": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  // --- Configuração para o AMBIENTE DE NAVEGADOR (seu frontend em src/) ---
  {
    files: ["src/**/*.{js,jsx}"], // Aplica-se a arquivos .js e .jsx dentro da pasta src
    env: {
      browser: true, // Habilita variáveis globais de navegador
      es2021: true, // Habilita as últimas features do ES
      node: false, // Desabilita variáveis globais de Node.js
    },
    extends: [
      js.configs.recommended,
      "plugin:react/recommended",
      "plugin:react-hooks/recommended",
      "plugin:jsx-a11y/recommended",
      "plugin:prettier/recommended", // Certifique-se de que eslint-plugin-prettier está instalado
    ],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2021, // Ou 2022, "latest"
        sourceType: "module", // Usa módulos ES
      },
      globals: {
        ...globals.browser, // Variáveis globais do navegador (para console, setTimeout, fetch, etc.)
        // Adicione outras globais que seu frontend possa usar e que não sejam detectadas automaticamente
        // Ex: 'gtag': 'readonly',
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "jsx-a11y": pluginJsxA11y,
      prettier: pluginPrettier, // Se estiver usando eslint-plugin-prettier
    },
    settings: {
      react: {
        version: "detect", // Detecta a versão do React instalada
      },
    },
    rules: {
      // Suas regras personalizadas para o frontend
      "react/react-in-jsx-scope": "off", // Para React 17+
      "react/prop-types": "warn", // Mudar para warn para PropTypes
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_e",
        },
      ],
      "no-prototype-builtins": "off",
      "no-undef": "error", // Manter erro para variáveis realmente não definidas
      "no-case-declarations": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-control-regex": "off",
      "getter-return": "warn",
      "react/no-unescaped-entities": [
        "error",
        {
          forbid: [
            ">",
            "}",
            ")",
            '"',
            "'",
            "]]", // Exemplo de como configurar
            "&apos;",
            "&lsquo;",
            "&#39;",
            "&rsquo;", // Adicione aqui se o erro for este
          ],
        },
      ],
      // Adicione aqui se houver erros 'no-undef' para APIs de navegador específicas que não são globais
      // Ex: 'atob', 'Blob', 'URL', 'XMLHttpRequest', 'TextDecoder', 'WebAssembly', 'OffscreenCanvas', etc.
      // Você pode tentar definir esses no 'globals' do languageOptions acima ou aqui se o erro persistir.
    },
  },
];
