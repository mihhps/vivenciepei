import { resolve, dirname } from "path"; // 'dirname' foi adicionado
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// CORREÇÃO: Esta é uma forma mais explícita de obter o caminho do diretório,
// o que resolve o erro de linting no editor de código.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
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
        start_url: "/app.html",
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
      input: {
        // Agora, com __dirname definido, esta parte funcionará sem erros.
        main: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app.html"),
      },
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
