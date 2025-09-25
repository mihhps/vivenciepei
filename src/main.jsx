import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // Estilo global do app
import App from "./App.jsx"; // Componente principal da aplicação
import React from "react";

// ----------------------------------------------------
// NOVO: REGISTRO DO SERVICE WORKER
// ----------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // O caminho '/service-worker.js' assume que o arquivo está na pasta 'public'.
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log(
          "Service Worker registrado com sucesso. Escopo:",
          registration.scope
        );
      })
      .catch((error) => {
        console.error("Falha no registro do Service Worker:", error);
      });
  });
}
// ----------------------------------------------------

// Cria e renderiza a aplicação no elemento <div id="root"> do HTML
const root = createRoot(document.getElementById("root"));

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
