// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import commonjs from "@rollup/plugin-commonjs"; // <--- Importe o plugin commonjs

export default defineConfig({
  plugins: [
    react(),
    // Adicione o plugin commonjs para lidar com módulos CommonJS que podem estar no Firebase SDK
    // Isso é útil se o Firebase estiver causando o problema devido ao seu formato de módulo.
    commonjs(),
  ],
  server: {
    port: 5199,
  },
  optimizeDeps: {
    include: [
      "pdfjs-dist/build/pdf.worker.mjs",
      // Adicione aqui os módulos do Firebase que podem estar causando problemas
      // Isso força o Vite a pré-bundle-los e otimiza-los como CommonJS/ESM.
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "@firebase/auth", // Módulos internos do Firebase que podem ser problemáticos
      "@firebase/firestore",
    ],
  },
  build: {
    rollupOptions: {
      // Marque o Firebase como "externo" para que o Rollup não tente empacotá-lo
      // Se você estiver usando o SDK modular (import { initializeApp } from "firebase/app";),
      // isso pode ser necessário para que ele lide com as exportações corretamente.
      // external: [
      //   /^firebase\/.*/ // Exclui tudo que começa com 'firebase/'
      // ],
      output: {
        // Isso ajuda a controlar o formato de saída e a interoperação de módulos.
        // Garante que default imports funcionem para módulos CommonJS.
        // `auto` é o padrão, mas às vezes explicitá-lo ou usar `named` resolve problemas.
        // intro: 'import { setDefaultResultOrder } from "dns"; setDefaultResultOrder("verbatim");', // Opcional, para Node.js v17+
      },
    },
  },
});
