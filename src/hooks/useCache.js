// src/hooks/useCache.js
import { useState, useEffect, useCallback } from "react";

// Este é um hook de exemplo para demonstração.
// A lógica real de cache (ex: com IndexedDB, LocalStorage ou Context) precisaria ser implementada aqui.
export function useCache() {
  // Exemplo simples: cache em memória (não persistente ao recarregar a página)
  // Em um ambiente de produção, considere soluções mais robustas.
  const [cache, setCache] = useState({});

  const getFromCache = useCallback(
    async (key) => {
      console.log(`[useCache] Tentando obter do cache: ${key}`);
      return cache[key];
    },
    [cache]
  );

  const saveToCache = useCallback(async (key, data) => {
    console.log(`[useCache] Salvando no cache: ${key}`);
    setCache((prevCache) => ({ ...prevCache, [key]: data }));
  }, []);

  return { getFromCache, saveToCache };
}
