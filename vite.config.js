import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
  port: 5199
  },
  optimizeDeps: {
    include: ["pdfjs-dist/build/pdf.worker.mjs"]
  }
});