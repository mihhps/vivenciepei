// vite.config.js
import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

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
        // A MUDANÇA ESTÁ AQUI:
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
