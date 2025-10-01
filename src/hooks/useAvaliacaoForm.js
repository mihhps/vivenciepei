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
  addDoc, // Adicionado para criar documentos com ID automático
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
      // Garante que o objeto de data é criado corretamente
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

    // --- CONSOLE.LOG PARA DEBUG ---
    console.log("Tentando carregar avaliação para Aluno ID:", alunoId);
    // ------------------------------------

    setEstado((prev) => ({
      ...prev,
      carregandoAvaliacao: true,
      erro: null,
      sucesso: null,
    }));

    try {
      let avaliacaoEncontrada = null;
      let docSnap;

      // Garante que o ID do aluno está limpo
      const cleanedAlunoId = alunoId.trim();
      // Converte para minúsculas apenas para buscas adicionais, caso haja inconsistência de case
      const lowerCaseAlunoId = cleanedAlunoId.toLowerCase();

      // 1. Tenta buscar pelo formato antigo/direto (ID do Documento = ID do Aluno)
      // Nota: Esta busca é case-sensitive no ID do documento.
      const docRef = doc(db, "avaliacoesIniciais", cleanedAlunoId);
      docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log(
          "Avaliação encontrada na Busca 1 (ID do Documento - Formato Antigo):",
          docSnap.id
        );
        avaliacaoEncontrada = docSnap.data();
        setAvaliacaoDocId(docSnap.id);
      } else {
        // CORREÇÃO CRÍTICA: Alteramos a query para usar 'alunoId' (campo de nível raiz)
        // que foi confirmado no seu documento, em vez de 'aluno.id'.

        // 2. Busca pelo formato ideal: 'alunoId' com ordenação (exige índice composto)
        console.log(
          "Não encontrado na Busca 1. Tentando Busca 2 (Query - Ordenada) usando 'alunoId'..."
        );
        // Tentativa 1: Busca com o ID original (case-sensitive)
        let q2 = query(
          collection(db, "avaliacoesIniciais"),
          where("alunoId", "==", cleanedAlunoId), // <<-- CAMPO CORRIGIDO para 'alunoId'
          orderBy("dataCriacao", "desc"),
          limit(1)
        );

        let querySnapshot = await getDocs(q2);

        // Tentativa 2: Busca com o ID em minúsculas (para contornar inconsistência no Firestore)
        if (querySnapshot.empty && cleanedAlunoId !== lowerCaseAlunoId) {
          console.log(
            "Busca 2 (Original) falhou. Tentando Busca 2 (Lowercase) usando 'alunoId'..."
          );
          q2 = query(
            collection(db, "avaliacoesIniciais"),
            where("alunoId", "==", lowerCaseAlunoId), // <<-- CAMPO CORRIGIDO para 'alunoId'
            orderBy("dataCriacao", "desc"),
            limit(1)
          );
          querySnapshot = await getDocs(q2);
        }

        if (!querySnapshot.empty) {
          docSnap = querySnapshot.docs[0];
          console.log(
            "Avaliação encontrada na Busca 2 (Query - Ordenada):",
            docSnap.id
          );
          avaliacaoEncontrada = docSnap.data();
          setAvaliacaoDocId(docSnap.id);
        } else {
          // 3. Busca de fallback: Apenas pelo 'alunoId' (Busca Simples)
          console.log(
            "Não encontrado na Busca 2. Tentando Busca 3 (Query - Simples) usando 'alunoId'..."
          );
          // Tentativa 1: Busca com o ID original (case-sensitive)
          let q3 = query(
            collection(db, "avaliacoesIniciais"),
            where("alunoId", "==", cleanedAlunoId), // <<-- CAMPO CORRIGIDO para 'alunoId'
            limit(1) // Pega apenas um resultado
          );

          querySnapshot = await getDocs(q3);

          // Tentativa 2: Busca com o ID em minúsculas
          if (querySnapshot.empty && cleanedAlunoId !== lowerCaseAlunoId) {
            console.log(
              "Busca 3 (Original) falhou. Tentando Busca 3 (Lowercase) usando 'alunoId'..."
            );
            q3 = query(
              collection(db, "avaliacoesIniciais"),
              where("alunoId", "==", lowerCaseAlunoId), // <<-- CAMPO CORRIGIDO para 'alunoId'
              limit(1)
            );
            querySnapshot = await getDocs(q3);
          }

          if (!querySnapshot.empty) {
            docSnap = querySnapshot.docs[0];
            console.log(
              "Avaliação encontrada na Busca 3 (Query - Simples):",
              docSnap.id
            );
            avaliacaoEncontrada = docSnap.data();
            setAvaliacaoDocId(docSnap.id);
          } else {
            console.log("Nenhuma avaliação encontrada nas três buscas.");
          }
        }
      }

      if (avaliacaoEncontrada) {
        // Formata as datas corretamente a partir do timestamp do Firestore
        // Melhoria: Lida com Timestamps do Firestore, objetos Date, e strings ISO
        const formatarData = (data) => {
          if (!data) return "";
          if (data.seconds)
            return new Date(data.seconds * 1000).toISOString().split("T")[0];
          if (data instanceof Date) return data.toISOString().split("T")[0];
          // Tenta converter strings ISO (como "2025-07-14T19:11:42.232Z") para o formato YYYY-MM-DD
          if (typeof data === "string" && data.includes("T")) {
            return new Date(data).toISOString().split("T")[0];
          }
          // Lida com Timestamps do Firebase que podem ter sido salvos como objetos aninhados
          if (
            data &&
            typeof data === "object" &&
            data.hasOwnProperty("nanoseconds") &&
            data.hasOwnProperty("seconds")
          ) {
            return new Date(data.seconds * 1000).toISOString().split("T")[0];
          }
          return data; // Assume que já é uma string 'YYYY-MM-DD' ou valor inválido/inexistente
        };

        const inicioFormatado = formatarData(avaliacaoEncontrada.inicio);
        const proximaAvaliacaoFormatada = formatarData(
          avaliacaoEncontrada.proximaAvaliacao
        );

        // Usa o docSnap.id que foi definido na busca de sucesso
        const docIdLog = docSnap ? docSnap.id : "ID não definido";
        setAvaliacaoDocId(docSnap.id);

        setInicio(inicioFormatado);
        setProximaAvaliacao(proximaAvaliacaoFormatada);
        setRespostas(avaliacaoEncontrada.respostas || {});
        setObservacoes(avaliacaoEncontrada.observacoes || {});

        console.log(
          "Dados da avaliação carregados com sucesso. Doc ID:",
          docIdLog
        );
        console.log(
          "Início:",
          inicioFormatado,
          "Próxima Avaliação:",
          proximaAvaliacaoFormatada
        );
      } else {
        limparFormulario();
      }

      setEstado((prev) => ({ ...prev, carregandoAvaliacao: false }));
    } catch (error) {
      console.error("Erro FATAL ao carregar avaliação do Firestore:", error);
      setEstado((prev) => ({
        ...prev,
        carregandoAvaliacao: false,
        erro: "Erro ao carregar avaliação. Verifique o console.",
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
        const dadosBase = {
          alunoId: alunoSelecionado.id, // ID na raiz, USADO PARA CONSULTAS
          aluno: {
            // Removido o campo 'id' daqui para evitar duplicação e inconsistência na busca.
            nome: alunoSelecionado.nome,
          },
          turma: alunoSelecionado.turma,
          inicio,
          proximaAvaliacao,
          respostas,
          observacoes,
          criador: usuarioLogado.nome,
          criadorId: usuarioLogado.id || usuarioLogado.email,
          escolaId: usuarioLogado.escolas
            ? Object.keys(usuarioLogado.escolas)[0]
            : null,
        };

        if (avaliacaoDocId) {
          // Lógica para ATUALIZAR (mantém o ID original do documento)
          const docRef = doc(db, "avaliacoesIniciais", avaliacaoDocId);
          await updateDoc(docRef, {
            ...dadosBase,
            dataUltimaAtualizacao: serverTimestamp(),
          });
          console.log("Avaliação atualizada com sucesso! ID:", avaliacaoDocId);
        } else {
          // Lógica para CRIAR (usa addDoc para ID automático, o padrão correto)
          const avaliacoesRef = collection(db, "avaliacoesIniciais");

          // Usa addDoc para criar um novo documento com ID automático
          const newDoc = await addDoc(avaliacoesRef, {
            ...dadosBase,
            dataCriacao: serverTimestamp(),
          });

          // Seta o ID recém-criado (o UUID automático)
          setAvaliacaoDocId(newDoc.id);

          console.log("Nova avaliação salva com sucesso! ID:", newDoc.id);
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
