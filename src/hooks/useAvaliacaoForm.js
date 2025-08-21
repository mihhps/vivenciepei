import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  addDoc,
  limit,
  orderBy,
} from "firebase/firestore";

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

  const [avaliacaoDocId, setAvaliacaoDocId] = useState(null);

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

  const carregarAvaliacaoDoAluno = useCallback(async (alunoId) => {
    if (!alunoId) {
      setRespostas({});
      setObservacoes({});
      setInicio("");
      setProximaAvaliacao("");
      setAvaliacaoDocId(null);
      return;
    }

    setEstado((prev) => ({
      ...prev,
      carregandoAvaliacao: true,
      erro: null,
      sucesso: null,
    }));
    try {
      const avaliacoesRef = collection(db, "avaliacoesIniciais");
      const q = query(
        avaliacoesRef,
        where("aluno.id", "==", alunoId),
        orderBy("dataCriacao", "desc"),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const avaliacaoEncontrada = docSnap.data();
        setAvaliacaoDocId(docSnap.id);

        let loadedInicio = avaliacaoEncontrada.inicio;
        let loadedProximaAvaliacao = avaliacaoEncontrada.proximaAvaliacao;

        let formattedInicio = "";
        let formattedProximaAvaliacao = "";

        if (
          loadedInicio &&
          typeof loadedInicio === "object" &&
          loadedInicio.seconds !== undefined
        ) {
          formattedInicio = new Date(loadedInicio.seconds * 1000)
            .toISOString()
            .split("T")[0];
        } else if (loadedInicio instanceof Date) {
          formattedInicio = loadedInicio.toISOString().split("T")[0];
        } else if (typeof loadedInicio === "string") {
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

        setInicio(formattedInicio);
        setProximaAvaliacao(formattedProximaAvaliacao);
        setRespostas(avaliacaoEncontrada.respostas || {});
        setObservacoes(avaliacaoEncontrada.observacoes || {});
      } else {
        setRespostas({});
        setObservacoes({});
        setInicio("");
        setProximaAvaliacao("");
        setAvaliacaoDocId(null);
      }

      setEstado((prev) => ({
        ...prev,
        carregandoAvaliacao: false,
        sucesso: null,
      }));
    } catch (error) {
      console.error("Erro ao carregar avaliação do Firestore:", error);
      setEstado((prev) => ({
        ...prev,
        carregandoAvaliacao: false,
        erro: "Erro ao carregar avaliação. Tente novamente.",
      }));
    }
  }, []);

  const handleSelecionarAluno = useCallback(
    async (alunoNome) => {
      const aluno = alunos.find((a) => a.nome === alunoNome);
      setAlunoSelecionado(aluno || null);
      if (aluno) {
        await carregarAvaliacaoDoAluno(aluno.id);
      } else {
        await carregarAvaliacaoDoAluno(null);
      }
    },
    [alunos, carregarAvaliacaoDoAluno]
  );

  const handleSalvar = useCallback(
    async (usuarioLogado) => {
      if (!alunoSelecionado || !inicio || !proximaAvaliacao) {
        setEstado((prev) => ({
          ...prev,
          erro: "Por favor, preencha as datas e selecione um aluno.",
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
        const dadosAvaliacao = {
          aluno: {
            id: alunoSelecionado.id,
            nome: alunoSelecionado.nome,
          },
          alunoId: alunoSelecionado.id, // <-- Linha adicionada
          turma: alunoSelecionado.turma,
          inicio,
          proximaAvaliacao,
          respostas,
          observacoes,
          criador: usuarioLogado.nome,
          criadorId: usuarioLogado.id,
          escolaId: usuarioLogado.escolas
            ? Object.keys(usuarioLogado.escolas)[0]
            : null,
          dataCriacao: serverTimestamp(),
        };

        const avaliacoesRef = collection(db, "avaliacoesIniciais");

        if (avaliacaoDocId) {
          const docRef = doc(db, "avaliacoesIniciais", avaliacaoDocId);
          await updateDoc(docRef, {
            ...dadosAvaliacao,
            dataUltimaAtualizacao: serverTimestamp(),
          });
          console.log("Avaliação atualizada com sucesso! ID:", avaliacaoDocId);
        } else {
          await addDoc(avaliacoesRef, dadosAvaliacao);
          console.log("Nova avaliação salva com sucesso!");
        }

        setEstado((prev) => ({
          ...prev,
          salvando: false,
          sucesso: "Avaliação salva com sucesso!",
          erro: null,
        }));
        return true;
      } catch (error) {
        console.error("Erro ao salvar avaliação no Firestore:", error);
        setEstado((prev) => ({
          ...prev,
          salvando: false,
          erro: "Erro ao salvar avaliação. Verifique suas permissões do Firestore.",
        }));
        return false;
      }
    },
    [
      alunoSelecionado,
      inicio,
      proximaAvaliacao,
      respostas,
      observacoes,
      avaliacaoDocId,
    ]
  );

  return useMemo(
    () => ({
      alunoSelecionado,
      setAlunoSelecionado,
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
      setEstado,
    }),
    [
      alunoSelecionado,
      handleSelecionarAluno,
      inicio,
      proximaAvaliacao,
      respostas,
      observacoes,
      handleSalvar,
      idade,
      avaliacaoExiste,
      estado,
    ]
  );
}
