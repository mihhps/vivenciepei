import { useState, useEffect, useCallback } from "react";

// Função para ler do localStorage com segurança
function getStorageValue(key, defaultValue) {
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null && saved !== "undefined") {
      return JSON.parse(saved);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Erro ao parsear ${key} do localStorage:`, error);
    return defaultValue;
  }
}

export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => getStorageValue(key, defaultValue));

  // Efeito para atualizar o localStorage quando o estado 'value' mudar
  useEffect(() => {
    // Evita salvar um valor 'undefined'
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
