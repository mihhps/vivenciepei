import { useState, useEffect, useCallback } from "react";

function getStorageValue(key, defaultValue) {
  const saved = localStorage.getItem(key);
  if (saved === null) return defaultValue;

  try {
    // Tenta tratar como JSON
    return JSON.parse(saved);
  } catch (error) {
    // Se falhar (erro de parse), retorna a string pura sem logar erro no console
    return saved;
  }
}

export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => getStorageValue(key, defaultValue));

  useEffect(() => {
    if (value === undefined || value === null) {
      localStorage.removeItem(key);
    } else {
      // Salva sempre como JSON para manter o padrão
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  const handleStorageChange = useCallback(
    (event) => {
      if (event.key === key) {
        setValue(getStorageValue(key, defaultValue));
      } else if (event.key === null) {
        setValue(defaultValue);
      }
    },
    [key, defaultValue]
  );

  useEffect(() => {
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [handleStorageChange]);

  return [value, setValue];
};

export default useLocalStorage;
