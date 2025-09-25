// eslint.config.js

const globals = require("globals");
const js = require("@eslint/js");
const pluginReact = require("eslint-plugin-react");
const pluginReactHooks = require("eslint-plugin-react-hooks");
const pluginJsxA11y = require("eslint-plugin-jsx-a11y");
const pluginPrettier = require("eslint-plugin-prettier");

module.exports = [
  // --- Configuração de Ignorar Global ---
  {
    ignores: [
      "node_modules/**",
      "build/**",
      "dist/**",
      "functions/**",
      "public/**/*.mjs",
      "src/styles/**",
    ],
  },

  // --- Configuração para o AMBIENTE NODE.JS (suas Cloud Functions) ---
  {
    files: ["functions/**/*.js"],
    extends: [js.configs.recommended, "google"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
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
    files: ["src/**/*.{js,jsx}"],
    env: {
      browser: true,
      es2021: true,
      node: false,
    },
    extends: [
      js.configs.recommended,
      "plugin:react/recommended",
      "plugin:react-hooks/recommended",
      "plugin:jsx-a11y/recommended",
      "plugin:prettier/recommended",
    ],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2021,
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        // Adicione outras globais do frontend aqui se necessário
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "jsx-a11y": pluginJsxA11y,
      prettier: pluginPrettier,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "warn",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_e",
        },
      ],
      "no-prototype-builtins": "off",
      "no-undef": "error",
      "no-case-declarations": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-control-regex": "off",
      "getter-return": "warn",
      "react/no-unescaped-entities": "error",
    },
  },

  // --- 🟢 CORREÇÃO: CONFIGURAÇÃO PARA O SERVICE WORKER ---
  {
    files: ["public/service-worker.js"], // Aplica-se APENAS ao arquivo do Service Worker
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script", // Workers geralmente usam 'script'
      globals: {
        // Habilita as variáveis globais específicas do Service Worker, incluindo 'self'
        ...globals.serviceworker,
        self: "readonly",
      },
    },
    rules: {
      // Desativa regras que causam o erro 'self is not defined' no ambiente de worker.
      "no-restricted-globals": "off",
      // Manter 'no-undef' desligado aqui garante que outras variáveis de worker também sejam aceitas.
      "no-undef": "off",
    },
  },
];
