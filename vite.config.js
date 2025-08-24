// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa"; // 1. ADICIONE ESTA LINHA

export default defineConfig({
  plugins: [
    react(),
    // 2. ADICIONE TODA ESTA SEÇÃO DO PWA AQUI
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,webp}"],
      },
      manifest: {
        name: "Vivencie PEI",
        short_name: "VivenciePEI",
        description:
          "Plataforma para criação e gestão de Planos Educacionais Individualizados.",
        theme_color: "#1d3557",
        background_color: "#ffffff",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  // O resto da sua configuração original permanece intacto
  server: {
    port: 5199,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "@firebase/auth",
      "@firebase/firestore",
      "pdfjs-dist/build/pdf.worker.mjs",
    ],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return id.toString().split("node_modules/")[1].split("/")[0];
          }
        },
      },
    },
  },
});
