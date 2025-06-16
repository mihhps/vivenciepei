import { useState, useEffect } from "react";
import { fetchAlunos } from "../src/services/avaliacaoService";

export const useAlunos = () => {
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const carregarAlunos = async () => {
      try {
        setCarregando(true);
        const alunosFirestore = await fetchAlunos();
        setAlunos(alunosFirestore);
      } catch (error) {
        console.error("Erro ao carregar alunos:", error);
        setErro("Falha ao carregar alunos.");
      } finally {
        setCarregando(false);
      }
    };
    carregarAlunos();
  }, []);

  return { alunos, carregando, erro };
};
