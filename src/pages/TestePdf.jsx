// src/pages/TestePdf.jsx

import React from "react";
import * as pdfjsLib from "pdfjs-dist";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function TestePdf() {
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log("Nenhum arquivo selecionado.");
      return;
    }

    console.log("--- INICIANDO TESTE DE PDF ---");
    console.log("Arquivo selecionado:", file.name);

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        console.log("1. FileReader.onload - Arquivo lido na memória.");
        const typedArray = new Uint8Array(event.target.result);

        console.log(
          "2. Chamando pdfjsLib.getDocument()... Aguardando o worker..."
        );
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        console.log(
          "%c3. SUCESSO! PDF carregado. Número de páginas:",
          "color: green; font-weight: bold;",
          pdf.numPages
        );

        const page = await pdf.getPage(1);
        console.log("4. Primeira página obtida.");

        const content = await page.getTextContent();
        console.log(
          "%c5. SUCESSO! Conteúdo da primeira página extraído.",
          "color: green; font-weight: bold;"
        );
        // console.log(content.items.map(item => item.str).join(" ")); // Opcional: loga o texto
        alert(
          "SUCESSO! O PDF foi lido e o texto extraído. Verifique o console."
        );
      } catch (error) {
        console.error(
          "%cERRO CRÍTICO DURANTE O PROCESSAMENTO:",
          "color: red; font-weight: bold;",
          error
        );
        alert("ERRO: O processamento do PDF falhou. Verifique o console.");
      }
    };

    reader.onerror = () => {
      console.error(
        "%cERRO: FileReader.onerror - Não foi possível ler o arquivo.",
        "color: red; font-weight: bold;"
      );
      alert("ERRO: O FileReader não conseguiu ler o arquivo.");
    };

    reader.readAsArrayBuffer(file);
    console.log("Iniciando reader.readAsArrayBuffer()...");
  };

  return (
    <div
      style={{ padding: "50px", fontFamily: "sans-serif", lineHeight: "1.6" }}
    >
      <h1>Teste Fundamental de PDF.js</h1>
      <p>
        Este teste verifica se a biblioteca PDF.js consegue carregar e processar
        um PDF no seu ambiente, isolado de qualquer outro componente.
      </p>
      <hr />
      <h3>Instruções:</h3>
      <ol>
        <li>Abra o console do navegador (F12 ou Option+Cmd+I).</li>
        <li>Selecione o mesmo arquivo PDF que estava dando problema.</li>
        <li>Observe as mensagens que aparecem no console.</li>
      </ol>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        style={{ marginTop: "20px", fontSize: "16px" }}
      />
    </div>
  );
}
