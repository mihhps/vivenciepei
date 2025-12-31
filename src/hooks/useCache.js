// src/hooks/useCache.js
import { useState, useEffect, useCallback } from "react";

export function useCache() {
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
