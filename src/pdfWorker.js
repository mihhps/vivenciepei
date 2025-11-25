import * as pdfjsLib from "pdfjs-dist"; // <--- CORREÇÃO AQUI
import { GlobalWorkerOptions } from "pdfjs-dist/build/pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

// 1. Configuração do Worker (Esta parte está correta para Vite)
GlobalWorkerOptions.workerSrc = pdfWorker;

// 2. Função de Extração de PDF
const extrairTextoPDF = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const typedArray = new Uint8Array(reader.result);
        // pdfjsLib está agora disponível graças ao import * as pdfjsLib
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

        let textoExtraido = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();

          // Adiciona o texto da página, garantindo quebras de linha entre as páginas
          textoExtraido +=
            content.items.map((item) => item.str).join(" ") + "\n\n";
        }

        resolve(textoExtraido.trim());
      } catch (error) {
        console.error("Erro na extração de PDF:", error);
        reject(new Error(`Falha ao processar PDF: ${error.message}`));
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
