// src/hooks/usePEILoader.js

import React from "react";
import { useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { gerarPDFCompleto } from "../utils/gerarPDFCompleto";
import { useUserSchool } from "./useUserSchool";

// --- LÓGICA DE BUSCA DE DADOS ---
// Esta função é chamada pelo nosso hook para carregar tudo do Firestore.
async function carregarDadosDoFirestore(usuarioLogado) {
  if (!usuarioLogado?.uid) return null;

  const perfilUsuario = usuarioLogado.perfil?.toLowerCase();

  // Lógica de Alunos
  let alunosQuery;
  const perfisDeGestao = [
    "aee",
    "gestao",
    "orientador pedagógico",
    "diretor",
    "diretor adjunto",
  ];
  if (perfisDeGestao.includes(perfilUsuario)) {
    console.warn(
      "AVISO: Filtro de escola DESATIVADO. Mostrando todos os alunos."
    );
    alunosQuery = query(collection(db, "alunos"), orderBy("nome"), limit(50));
  } else if (perfilUsuario === "professor") {
    const turmasVinculadas = usuarioLogado.turmas
      ? Object.keys(usuarioLogado.turmas)
      : [];
    alunosQuery =
      turmasVinculadas.length > 0
        ? query(
            collection(db, "alunos"),
            where("turma", "in", turmasVinculadas),
            orderBy("nome")
          )
        : query(collection(db, "alunos"), where("id", "==", "sem-turmas"));
  } else {
    alunosQuery = query(collection(db, "alunos"), orderBy("nome"));
  }

  // Lógica de busca de PEIs e outros dados (corrigida para buscar de ambas as coleções)
  const [
    alunosSnapshot,
    peisNovaColecaoSnapshot,
    peisAntigaColecaoSnapshot,
    avaliacoesSnapshot,
    usuariosSnapshot,
  ] = await Promise.all([
    getDocs(alunosQuery),
    getDocs(collection(db, "pei_contribuicoes")),
    getDocs(collection(db, "peis")),
    getDocs(collection(db, "avaliacoesIniciais")),
    getDocs(
      query(collection(db, "usuarios"), where("perfil", "==", "professor"))
    ),
  ]);

  const alunos = alunosSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const todosPeisMap = new Map();
  peisNovaColecaoSnapshot.docs.forEach((doc) =>
    todosPeisMap.set(doc.id, { id: doc.id, ...doc.data() })
  );
  peisAntigaColecaoSnapshot.docs.forEach((doc) => {
    if (!todosPeisMap.has(doc.id)) {
      todosPeisMap.set(doc.id, { id: doc.id, ...doc.data() });
    }
  });
  const todosPeis = Array.from(todosPeisMap.values());

  // --- CORREÇÃO APLICADA AQUI ---
  // Criamos o mapa de avaliações de forma mais robusta, garantindo
  // que a chave `alunoId` exista no documento.
  const avaliacoesIniciais = {};
  avaliacoesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.alunoId) {
      avaliacoesIniciais[data.alunoId] = { id: doc.id, ...data };
    }
  });

  const peisPorAluno = {};
  alunos.forEach((aluno) => {
    peisPorAluno[aluno.id] = todosPeis
      .filter((p) => p.alunoId === aluno.id)
      .sort(
        (a, b) =>
          (b.dataCriacao?.toDate?.() || 0) - (a.dataCriacao?.toDate?.() || 0)
      );
  });

  const turmasDisponiveis = [...new Set(alunos.map((a) => a.turma))].sort();
  const usuariosParaFiltro = usuariosSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    alunos,
    peisPorAluno,
    avaliacoesIniciais,
    turmasDisponiveis,
    usuariosParaFiltro,
  };
}

// --- O HOOK CUSTOMIZADO (COMPLETO) ---
export function usePEILoader(dispatch, state) {
  const { usuario: usuarioLogado } = useUserSchool();
  const { filtros, avaliacoesIniciais } = state;

  useEffect(() => {
    const carregar = async () => {
      dispatch({ type: "FETCH_START" });
      try {
        const payload = await carregarDadosDoFirestore(usuarioLogado);
        if (payload) {
          dispatch({ type: "FETCH_SUCCESS", payload });
        }
      } catch (error) {
        console.error("Erro no usePEILoader:", error);
        dispatch({ type: "FETCH_ERROR", payload: error.message });
      }
    };
    if (usuarioLogado) {
      carregar();
    }
  }, [usuarioLogado, dispatch]);

  // --- AÇÕES (LÓGICA COMPLETA) ---

  const excluirPEI = useCallback(
    async (peiParaExcluir) => {
      if (
        !window.confirm(
          `Tem a certeza que deseja excluir o PEI de ${peiParaExcluir.alunoNome}?`
        )
      ) {
        return;
      }

      dispatch({ type: "ACTION_START" });
      try {
        // Tenta excluir da coleção nova e faz fallback para a antiga
        await deleteDoc(doc(db, "pei_contribuicoes", peiParaExcluir.id)).catch(
          () => {
            return deleteDoc(doc(db, "peis", peiParaExcluir.id));
          }
        );

        dispatch({ type: "REMOVE_PEI_SUCCESS", payload: peiParaExcluir });
        toast.success("PEI excluído com sucesso!");
      } catch (error) {
        console.error("Erro ao excluir PEI:", error);
        toast.error("Ocorreu um erro ao excluir o PEI.");
        dispatch({ type: "ACTION_FINISH" });
      }
    },
    [dispatch]
  );

  const gerarPDF = useCallback(
    async (aluno, peisDoAluno) => {
      if (!aluno || !peisDoAluno || peisDoAluno.length === 0) {
        toast.error(
          "Não é possível gerar o PDF: dados do aluno ou PEIs em falta."
        );
        return;
      }

      // --- DEBUG ADICIONADO PARA VERIFICAÇÃO ---
      // Estes logs vão te mostrar no console exatamente o que o código está procurando
      // e o que ele tem disponível. A comparação entre eles revelará o problema.
      console.log("Procurando avaliação para o aluno com ID:", aluno.id);
      console.log(
        "Chaves de avaliações disponíveis:",
        Object.keys(avaliacoesIniciais)
      );

      const avaliacao = avaliacoesIniciais[aluno.id];
      if (!avaliacao) {
        // O alerta original foi trocado por um toast.error, que é mais elegante.
        toast.error(`Avaliação Inicial não encontrada para ${aluno.nome}`);
        return;
      }

      dispatch({ type: "ACTION_START" });
      toast.info("A gerar o PDF, por favor aguarde...");
      try {
        await gerarPDFCompleto(aluno, usuarioLogado, peisDoAluno, avaliacao);
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        toast.error(`Ocorreu um erro ao gerar o PDF: ${error.message}`);
      } finally {
        dispatch({ type: "ACTION_FINISH" });
      }
    },
    [usuarioLogado, avaliacoesIniciais, dispatch]
  );

  return { excluirPEI, gerarPDF };
}
