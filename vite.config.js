import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5199,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
    },
  },
  resolve: {
    alias: {
      // Isso força o app a usar uma única cópia do React,
      // resolvendo o erro "Invalid Hook Call"
      react: path.resolve("./node_modules/react"),
      "react-dom": path.resolve("./node_modules/react-dom"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
    ],
  },
});
