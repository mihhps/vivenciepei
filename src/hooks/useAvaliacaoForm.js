import { useState, useCallback } from "react";
import { Timestamp } from "firebase/firestore";
import {
  fetchAvaliacaoPorAluno,
  salvarAvaliacao,
} from "../src/services/avaliacaoService";

const calcularIdade = (nascimento) => {
  if (!nascimento) return null;
  const hoje = new Date();
  const nascDate = new Date(nascimento);
  let idade = hoje.getFullYear() - nascDate.getFullYear();
  const m = hoje.getMonth() - nascDate.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascDate.getDate())) {
    idade--;
  }
  return idade;
};

export const useAvaliacaoForm = (alunos) => {
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [idade, setIdade] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [observacoes, setObservacoes] = useState({});
  const [inicio, setInicio] = useState("");
  const [proximaAvaliacao, setProximaAvaliacao] = useState("");

  const [estado, setEstado] = useState({
    carregandoAvaliacao: false,
    salvando: false,
    erro: null,
    sucesso: null,
  });

  const exibirMensagem = (tipo, texto) => {
    setEstado((prev) => ({
      ...prev,
      [tipo]: texto,
      [tipo === "erro" ? "sucesso" : "erro"]: null,
    }));
    setTimeout(() => setEstado((prev) => ({ ...prev, [tipo]: null })), 5000);
  };

  const resetarFormulario = useCallback(() => {
    setRespostas({});
    setObservacoes({});
    setInicio("");
    setProximaAvaliacao("");
    setIdade(null);
    setAlunoSelecionado(null);
  }, []);

  const handleSelecionarAluno = useCallback(
    async (alunoNome) => {
      resetarFormulario();
      const aluno = alunos.find((a) => a.nome === alunoNome);
      if (!aluno) return;

      setAlunoSelecionado(aluno);
      setIdade(calcularIdade(aluno.nascimento));
      setEstado((prev) => ({ ...prev, carregandoAvaliacao: true }));

      try {
        const avaliacao = await fetchAvaliacaoPorAluno(aluno.id);
        if (avaliacao) {
          setRespostas(avaliacao.respostas || {});
          setObservacoes(avaliacao.observacoes || {});
          if (avaliacao.inicio)
            setInicio(avaliacao.inicio.toDate().toISOString().split("T")[0]);
          if (avaliacao.proximaAvaliacao)
            setProximaAvaliacao(
              avaliacao.proximaAvaliacao.toDate().toISOString().split("T")[0]
            );
          exibirMensagem("sucesso", "Avaliação existente carregada.");
        } else {
          exibirMensagem(
            "sucesso",
            "Inicie uma nova avaliação para este aluno."
          );
        }
      } catch (error) {
        console.error("Erro ao carregar avaliação:", error);
        exibirMensagem("erro", "Falha ao carregar dados da avaliação.");
      } finally {
        setEstado((prev) => ({ ...prev, carregandoAvaliacao: false }));
      }
    },
    [alunos, resetarFormulario]
  );

  const handleSalvar = async (usuarioLogado) => {
    if (!alunoSelecionado) {
      exibirMensagem("erro", "Por favor, selecione um aluno.");
      return false;
    }

    setEstado((prev) => ({ ...prev, salvando: true }));
    const avaliacaoData = {
      idade,
      respostas,
      observacoes,
      inicio: inicio
        ? Timestamp.fromDate(new Date(`${inicio}T00:00:00`))
        : null,
      proximaAvaliacao: proximaAvaliacao
        ? Timestamp.fromDate(new Date(`${proximaAvaliacao}T00:00:00`))
        : null,
    };

    try {
      await salvarAvaliacao(avaliacaoData, alunoSelecionado, usuarioLogado);
      exibirMensagem("sucesso", "Avaliação salva com sucesso!");
      return true; // Indica sucesso
    } catch (error) {
      console.error("Erro ao salvar:", error);
      exibirMensagem("erro", `Erro ao salvar: ${error.message}`);
      return false; // Indica falha
    } finally {
      setEstado((prev) => ({ ...prev, salvando: false }));
    }
  };

  return {
    alunoSelecionado,
    idade,
    respostas,
    setRespostas,
    observacoes,
    setObservacoes,
    inicio,
    setInicio,
    proximaAvaliacao,
    setProximaAvaliacao,
    estado,
    handleSelecionarAluno,
    handleSalvar,
  };
};
