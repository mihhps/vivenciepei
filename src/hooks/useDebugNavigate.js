// src/hooks/useDebugNavigate.js

import { useNavigate } from "react-router-dom";
import { useCallback } from "react";

// Este é o nosso "espião". Ele envolve a função original de navegação.
export function useDebugNavigate() {
  const originalNavigate = useNavigate();

  const debugNavigate = useCallback(
    (to, options) => {
      console.group("--- DEBUG DE NAVEGAÇÃO ---");
      console.log("Tentando navegar para:", to);
      console.log("Opções recebidas:", options);

      // A condição que estamos caçando!
      if (options?.replace === true) {
        console.error("ALERTA: Navegação com 'replace: true' foi detectada!");
        // Esta linha vai PAUSAR a execução do código no navegador.
        debugger;
      }

      console.groupEnd();

      // Continua com a navegação original
      return originalNavigate(to, options);
    },
    [originalNavigate]
  );

  return debugNavigate;
}
