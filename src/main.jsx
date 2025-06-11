import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // Estilo global do app
import App from "./App.jsx"; // Componente principal da aplicação
import React from "react";

// Cria e renderiza a aplicação no elemento <div id="root"> do HTML
const root = createRoot(document.getElementById("root"));

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
