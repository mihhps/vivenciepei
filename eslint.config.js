// eslint.config.js
import globals from "globals";
import js from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import pluginReactHooks from "eslint-plugin-react-hooks"; // <-- 1. IMPORT THE PLUGIN
// import eslintConfigPrettier from "eslint-config-prettier"; // If using Prettier

export default [
  // Configurations for your JS/JSX files
  {
    files: ["src/**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      // You can define plugins here if not using their pre-built configs below
      // 'react-hooks': pluginReactHooks, // <-- 2. OPTION A: Add plugin here
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
      "no-console": "off",
      "react/prop-types": "off",
      // ... other custom rules ...

      // OPTION B (Recommended): Use the plugin's recommended rules directly
      // If you add the plugin object below, these might already be included.
      // If not, you can add them specifically:
      // "react-hooks/rules-of-hooks": "error",
      // "react-hooks/exhaustive-deps": "warn", // Or "error"
    },
  },

  // Base ESLint recommended config
  js.configs.recommended,

  // React recommended config
  pluginReactConfig,

  // React Hooks plugin configuration (Recommended way) <-- 3. ADD THIS OBJECT
  {
    files: ["src/**/*.{js,jsx,mjs,cjs}"], // Apply to the same files
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules, // This includes exhaustive-deps
    },
  },

  // Prettier config (should be last)
  // eslintConfigPrettier,
];
