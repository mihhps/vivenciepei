// src/hooks/useLocalStorage.js

import { useState, useEffect, useCallback } from "react";

// Função para ler do localStorage com segurança
function getStorageValue(key, defaultValue) {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) {
      return defaultValue;
    }

    // Tenta fazer o parse do JSON
    const parsed = JSON.parse(saved);
    return parsed;
  } catch (error) {
    // Se o parse falhar (porque não é um JSON), retorna o valor original
    console.error(`Erro ao parsear ${key} do localStorage:`, error);
    // Retorna o valor original do localStorage (a string pura)
    return localStorage.getItem(key) || defaultValue;
  }
}

export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => getStorageValue(key, defaultValue));

  // Efeito para atualizar o localStorage quando o estado 'value' mudar
  useEffect(() => {
    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  // Efeito para ouvir mudanças no localStorage vindas de outras abas
  const handleStorageChange = useCallback(
    (event) => {
      if (event.key === key) {
        setValue(getStorageValue(key, defaultValue));
      }
    },
    [key, defaultValue]
  );

  useEffect(() => {
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [handleStorageChange]);

  return [value, setValue];
};

export default useLocalStorage;
