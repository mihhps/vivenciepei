import React from "react";
import { Outlet } from "react-router-dom";
import EscolaAtual from "./components/EscolaAtual";

// Este componente NÃO precisa importar nenhum CSS. O CSS principal cuidará dele.
export default function AppLayout() {
  return (
    // Este div é o nosso alvo principal para o CSS
    <div className="layout-container">
      <EscolaAtual />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
