// src/hooks/usePaginatedFirestore.js
import { useState, useCallback } from "react";
import { getDocs } from "firebase/firestore";
import { db } from "../firebase"; // Importe a instância do db

// O nome da função aqui (ex: 'useDataFetcher') pode ser mais genérico
export function usePaginatedFirestore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Vamos chamar a função de 'getPaginatedData' para alinhar com o componente
  const getPaginatedData = useCallback(
    async (collectionName_unused, queries) => {
      setLoading(true);
      setError(null);

      try {
        // Se 'queries' não for um array, coloque-o em um para simplificar
        const queriesParaExecutar = Array.isArray(queries)
          ? queries
          : [queries];

        // Se não houver queries, retorne um array vazio para evitar erros
        if (
          queriesParaExecutar.length === 0 ||
          queriesParaExecutar[0] === undefined
        ) {
          setLoading(false);
          return []; // Retorno defensivo
        }

        // Executa todas as queries em paralelo
        const snapshots = await Promise.all(
          queriesParaExecutar.map((q) => getDocs(q))
        );

        setLoading(false);
        // IMPORTANTE: Retorne os snapshots para que peisNovos receba o valor
        return snapshots;
      } catch (err) {
        console.error(`Error fetching data in hook:`, err);
        setError(err.message);
        setLoading(false);
        // IMPORTANTE: Retorne um array vazio em caso de erro para não quebrar o .flat()
        return [];
      }
    },
    []
  ); // A dependência do useCallback pode ser vazia se 'db' não mudar

  // O nome do hook em si não importa tanto quanto o que ele retorna
  // O importante é que a função retornada faça o que o componente espera.
  return { loading, error, getPaginatedData };
}
