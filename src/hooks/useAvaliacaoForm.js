import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  limit,
  orderBy,
} from "firebase/firestore";

export function useAvaliacaoForm(alunos) {
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [inicio, setInicio] = useState("");
  const [proximaAvaliacao, setProximaAvaliacao] = useState("");
  const [respostas, setRespostas] = useState({});
  const [observacoes, setObservacoes] = useState({});
  const [avaliacaoDocId, setAvaliacaoDocId] = useState(null);

  const [estado, setEstado] = useState({
    carregandoAvaliacao: false,
    salvando: false,
    erro: null,
    sucesso: null,
  });

  const avaliacaoExiste = useMemo(() => !!avaliacaoDocId, [avaliacaoDocId]);

  const idade = useMemo(() => {
    if (alunoSelecionado && alunoSelecionado.dataNascimento) {
      const hoje = new Date();
      const nascimento = alunoSelecionado.dataNascimento.toDate
        ? alunoSelecionado.dataNascimento.toDate()
        : new Date(alunoSelecionado.dataNascimento);
      let idadeCalculada = hoje.getFullYear() - nascimento.getFullYear();
      const mes = hoje.getMonth() - nascimento.getMonth();
      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idadeCalculada--;
      }
      return idadeCalculada;
    }
    return "";
  }, [alunoSelecionado]);

  const limparFormulario = () => {
    setRespostas({});
    setObservacoes({});
    setInicio("");
    setProximaAvaliacao("");
    setAvaliacaoDocId(null);
  };

  const carregarAvaliacaoDoAluno = useCallback(async (alunoId) => {
    if (!alunoId) {
      limparFormulario();
      return;
    }

    setEstado((prev) => ({
      ...prev,
      carregandoAvaliacao: true,
      erro: null,
      sucesso: null,
    }));

    try {
      // LÓGICA MELHORADA: Tenta buscar diretamente pelo ID do aluno primeiro (mais eficiente)
      const docRef = doc(db, "avaliacoesIniciais", alunoId);
      let docSnap = await getDoc(docRef);
      let avaliacaoEncontrada = null;

      if (docSnap.exists()) {
        avaliacaoEncontrada = docSnap.data();
        setAvaliacaoDocId(docSnap.id);
      } else {
        // Fallback: Se não encontrou pelo ID, procura via query (para dados antigos)
        const q = query(
          collection(db, "avaliacoesIniciais"),
          where("aluno.id", "==", alunoId),
          orderBy("dataCriacao", "desc"),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          docSnap = querySnapshot.docs[0];
          avaliacaoEncontrada = docSnap.data();
          setAvaliacaoDocId(docSnap.id);
        }
      }

      if (avaliacaoEncontrada) {
        // Formata as datas corretamente a partir do timestamp do Firestore
        const formatarData = (data) => {
          if (!data) return "";
          if (data.seconds)
            return new Date(data.seconds * 1000).toISOString().split("T")[0];
          if (data instanceof Date) return data.toISOString().split("T")[0];
          return data; // Assume que já é uma string 'YYYY-MM-DD'
        };

        setInicio(formatarData(avaliacaoEncontrada.inicio));
        setProximaAvaliacao(formatarData(avaliacaoEncontrada.proximaAvaliacao));
        setRespostas(avaliacaoEncontrada.respostas || {});
        setObservacoes(avaliacaoEncontrada.observacoes || {});
      } else {
        limparFormulario();
      }

      setEstado((prev) => ({ ...prev, carregandoAvaliacao: false }));
    } catch (error) {
      console.error("Erro ao carregar avaliação do Firestore:", error);
      setEstado((prev) => ({
        ...prev,
        carregandoAvaliacao: false,
        erro: "Erro ao carregar avaliação.",
      }));
    }
  }, []);

  const handleSelecionarAluno = useCallback(
    async (alunoNome) => {
      const aluno = alunos.find((a) => a.nome === alunoNome);
      setAlunoSelecionado(aluno || null);
      await carregarAvaliacaoDoAluno(aluno?.id || null);
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
        // ALTERAÇÃO: Adicionado o campo 'alunoId' para consistência dos dados
        const dadosBase = {
          alunoId: alunoSelecionado.id, // <-- CORREÇÃO PRINCIPAL
          aluno: {
            id: alunoSelecionado.id,
            nome: alunoSelecionado.nome,
          },
          turma: alunoSelecionado.turma,
          inicio,
          proximaAvaliacao,
          respostas,
          observacoes,
          criador: usuarioLogado.nome,
          criadorId: usuarioLogado.id || usuarioLogado.email, // Garante que um ID seja salvo
          escolaId: usuarioLogado.escolas
            ? Object.keys(usuarioLogado.escolas)[0]
            : null,
        };

        if (avaliacaoDocId) {
          // Atualiza o documento existente
          const docRef = doc(db, "avaliacoesIniciais", avaliacaoDocId);
          await updateDoc(docRef, {
            ...dadosBase,
            dataUltimaAtualizacao: serverTimestamp(),
          });
          console.log("Avaliação atualizada com sucesso! ID:", avaliacaoDocId);
        } else {
          // Cria um novo documento usando o ID do aluno
          const newDocRef = doc(db, "avaliacoesIniciais", alunoSelecionado.id);
          await setDoc(newDocRef, {
            ...dadosBase,
            dataCriacao: serverTimestamp(),
          });
          setAvaliacaoDocId(alunoSelecionado.id);
          console.log(
            "Nova avaliação salva com sucesso! ID:",
            alunoSelecionado.id
          );
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
          erro: "Erro ao salvar avaliação.",
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
      avaliacaoDocId,
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
      avaliacaoDocId,
    ]
  );
}
