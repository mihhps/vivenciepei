import { useState, useEffect, useCallback, useMemo } from "react";
// Importe seu serviço de dados (Firebase, API, etc.)
// import { getAvaliacao, saveAvaliacao } from "../services/avaliacaoService"; // Exemplo

export function useAvaliacaoForm(alunos) {
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [inicio, setInicio] = useState("");
  const [proximaAvaliacao, setProximaAvaliacao] = useState("");
  const [respostas, setRespostas] = useState({});
  const [observacoes, setObservacoes] = useState({});

  const [estado, setEstado] = useState({
    carregandoAvaliacao: false,
    salvando: false,
    erro: null,
    sucesso: null,
  });

  const avaliacaoExiste = useMemo(() => {
    return (
      Object.keys(respostas).length > 0 || Object.keys(observacoes).length > 0
    );
  }, [respostas, observacoes]);

  const idade = useMemo(() => {
    if (alunoSelecionado && alunoSelecionado.dataNascimento) {
      const hoje = new Date();
      const nascimento = new Date(alunoSelecionado.dataNascimento);
      let idadeCalculada = hoje.getFullYear() - nascimento.getFullYear();
      const mes = hoje.getMonth() - nascimento.getMonth();
      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idadeCalculada--;
      }
      return idadeCalculada;
    }
    return "";
  }, [alunoSelecionado]);

  // Função para carregar a avaliação do aluno
  const carregarAvaliacaoDoAluno = useCallback(async (alunoNome) => {
    if (!alunoNome) {
      setRespostas({});
      setObservacoes({});
      setInicio("");
      setProximaAvaliacao("");
      return;
    }

    setEstado((prev) => ({
      ...prev,
      carregandoAvaliacao: true,
      erro: null,
      sucesso: null,
    }));
    try {
      const avaliacoesSalvas =
        JSON.parse(localStorage.getItem("avaliacoes")) || [];
      const avaliacaoEncontrada = avaliacoesSalvas.find(
        (a) => a.aluno.nome === alunoNome
      );

      if (avaliacaoEncontrada) {
        // --- INÍCIO DA CORREÇÃO ---
        // Lógica para garantir que as datas sejam strings YYYY-MM-DD
        let loadedInicio = avaliacaoEncontrada.inicio;
        let loadedProximaAvaliacao = avaliacaoEncontrada.proximaAvaliacao;

        let formattedInicio = "";
        let formattedProximaAvaliacao = "";

        // Tenta converter de objeto Firebase Timestamp-like para string
        if (
          loadedInicio &&
          typeof loadedInicio === "object" &&
          loadedInicio.seconds !== undefined
        ) {
          formattedInicio = new Date(loadedInicio.seconds * 1000)
            .toISOString()
            .split("T")[0];
        } else if (loadedInicio instanceof Date) {
          // Se for um objeto Date JS
          formattedInicio = loadedInicio.toISOString().split("T")[0];
        } else if (typeof loadedInicio === "string") {
          // Se já for uma string (esperado)
          formattedInicio = loadedInicio;
        }

        if (
          loadedProximaAvaliacao &&
          typeof loadedProximaAvaliacao === "object" &&
          loadedProximaAvaliacao.seconds !== undefined
        ) {
          formattedProximaAvaliacao = new Date(
            loadedProximaAvaliacao.seconds * 1000
          )
            .toISOString()
            .split("T")[0];
        } else if (loadedProximaAvaliacao instanceof Date) {
          formattedProximaAvaliacao = loadedProximaAvaliacao
            .toISOString()
            .split("T")[0];
        } else if (typeof loadedProximaAvaliacao === "string") {
          formattedProximaAvaliacao = loadedProximaAvaliacao;
        }
        // --- FIM DA CORREÇÃO ---

        setInicio(formattedInicio);
        setProximaAvaliacao(formattedProximaAvaliacao);
        setRespostas(avaliacaoEncontrada.respostas || {});
        setObservacoes(avaliacaoEncontrada.observacoes || {});
      } else {
        setRespostas({});
        setObservacoes({});
        setInicio("");
        setProximaAvaliacao("");
      }
      setEstado((prev) => ({
        ...prev,
        carregandoAvaliacao: false,
        sucesso: null,
      }));
    } catch (error) {
      console.error("Erro ao carregar avaliação:", error);
      setEstado((prev) => ({
        ...prev,
        carregandoAvaliacao: false,
        erro: "Erro ao carregar avaliação. Tente novamente.",
      }));
    }
  }, []);

  // Handler para selecionar o aluno
  const handleSelecionarAluno = useCallback(
    async (alunoNome) => {
      const aluno = alunos.find((a) => a.nome === alunoNome);
      setAlunoSelecionado(aluno || null);
      await carregarAvaliacaoDoAluno(alunoNome);
    },
    [alunos, carregarAvaliacaoDoAluno]
  );

  // Handler para salvar a avaliação
  const handleSalvar = useCallback(
    async (usuarioLogado) => {
      if (!alunoSelecionado || !inicio || !proximaAvaliacao) {
        setEstado((prev) => ({
          ...prev,
          erro: "Por favor, preencha todos os campos e selecione um aluno.",
        }));
        return false;
      }

      setEstado((prev) => ({
        ...prev,
        salvando: true,
        erro: null,
        sucesso: null,
      }));
      try {
        const novaAvaliacao = {
          id: alunoSelecionado.id, // Ou um ID gerado
          aluno: alunoSelecionado,
          inicio, // Já é uma string YYYY-MM-DD
          proximaAvaliacao, // Já é uma string YYYY-MM-DD
          respostas,
          observacoes,
          criadoPor: usuarioLogado.nome,
          dataCriacao: new Date().toISOString(),
        };

        let avaliacoes = JSON.parse(localStorage.getItem("avaliacoes")) || [];
        const index = avaliacoes.findIndex(
          (a) => a.aluno.nome === alunoSelecionado.nome
        );

        if (index > -1) {
          avaliacoes[index] = novaAvaliacao;
        } else {
          avaliacoes.push(novaAvaliacao);
        }
        localStorage.setItem("avaliacoes", JSON.stringify(avaliacoes));

        setEstado((prev) => ({
          ...prev,
          salvando: false,
          sucesso: "Avaliação salva com sucesso!",
          erro: null,
        }));
        return true;
      } catch (error) {
        console.error("Erro ao salvar avaliação:", error);
        setEstado((prev) => ({
          ...prev,
          salvando: false,
          erro: "Erro ao salvar avaliação. Tente novamente.",
        }));
        return false;
      }
    },
    [alunoSelecionado, inicio, proximaAvaliacao, respostas, observacoes]
  );

  return {
    alunoSelecionado,
    handleSelecionarAluno,
    inicio,
    setInicio,
    proximaAvaliacao,
    setProximaAvaliacao,
    respostas,
    setRespostas,
    observacoes,
    setObservacoes,
    handleSalvar,
    idade,
    avaliacaoExiste,
    estado,
  };
}
