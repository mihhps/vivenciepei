import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";

import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import { useAlunos } from "../hooks/useAlunos";
import { useAvaliacaoForm } from "../hooks/useAvaliacaoForm";
import AvaliacaoHeader from "../components/AvaliacaoHeader";
import AreaPerguntas from "../components/AreaPerguntas";

import "../styles/AvaliacaoInicial.css";

// Função auxiliar para adicionar meses a uma data
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const Reavaliacao = () => {
  const { alunoId } = useParams();
  const navigate = useNavigate();

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );

  const { alunos, carregando: carregandoAlunos } = useAlunos();

  const {
    alunoSelecionado,
    setAlunoSelecionado,
    setInicio,
    setProximaAvaliacao,
    setRespostas,
    setObservacoes,
    respostas,
    observacoes,
    inicio,
    proximaAvaliacao,
    idade,
    estado,
    setEstado,
  } = useAvaliacaoForm(alunos);

  const [areaSelecionada, setAreaSelecionada] = useState("");
  const todasAsAreas = useMemo(() => {
    return {
      ...avaliacaoInicial,
    };
  }, []);
  const areasParaAbas = useMemo(
    () => Object.keys(todasAsAreas),
    [todasAsAreas]
  );

  const carregarUltimaAvaliacao = useCallback(async () => {
    if (!alunoId) {
      setEstado({ erro: "ID do aluno não fornecido." });
      return;
    }

    setEstado({ carregandoAvaliacao: true, erro: null });
    try {
      const q = query(
        collection(db, "avaliacoesIniciais"),
        where("aluno.id", "==", alunoId),
        orderBy("dataCriacao", "desc"),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setEstado({
          erro: "Nenhuma avaliação inicial encontrada para este aluno.",
          carregandoAvaliacao: false,
        });
        return;
      }

      const ultimaAvaliacao = querySnapshot.docs[0].data();

      const alunoCompleto = alunos.find((a) => a.id === alunoId);

      const dataInicioReavaliacao = new Date().toISOString().split("T")[0];
      const dataProximaReavaliacao = addMonths(new Date(), 6)
        .toISOString()
        .split("T")[0];

      setRespostas(ultimaAvaliacao.respostas || {});
      setObservacoes(ultimaAvaliacao.observacoes || {});
      setAlunoSelecionado(alunoCompleto);
      setInicio(dataInicioReavaliacao);
      setProximaAvaliacao(dataProximaReavaliacao);
      setAreaSelecionada(areasParaAbas[0] || "");

      setEstado({
        sucesso:
          "Última avaliação carregada para reavaliação. Por favor, ajuste os dados e salve.",
        carregandoAvaliacao: false,
      });
    } catch (error) {
      console.error("Erro ao carregar a última avaliação:", error);
      setEstado({
        erro: `Erro ao carregar a avaliação anterior. Tente novamente: ${error.message}`,
        carregandoAvaliacao: false,
      });
    }
  }, [
    alunoId,
    setEstado,
    alunos,
    setRespostas,
    setObservacoes,
    setAlunoSelecionado,
    setInicio,
    setProximaAvaliacao,
    areasParaAbas,
  ]);

  useEffect(() => {
    if (alunoId && alunos.length > 0) {
      carregarUltimaAvaliacao();
    }
  }, [alunoId, alunos, carregarUltimaAvaliacao]);

  const handleResposta = useCallback(
    (area, habilidade, nivel) => {
      setRespostas((prev) => ({
        ...prev,
        [area]: { ...prev[area], [habilidade]: nivel },
      }));
    },
    [setRespostas]
  );

  const handleObservacao = useCallback(
    (area, texto) => {
      setObservacoes((prev) => ({ ...prev, [area]: texto }));
    },
    [setObservacoes]
  );

  const onSalvarReavaliacaoClick = useCallback(async () => {
    if (!inicio || !proximaAvaliacao || !alunoSelecionado) {
      alert(
        "Por favor, preencha as datas de Início e Próxima Avaliação e selecione um aluno."
      );
      return;
    }

    setEstado({ salvando: true, erro: null });

    const dadosParaSalvar = {
      aluno: alunoSelecionado,
      turma: alunoSelecionado.turma,
      respostas: respostas,
      observacoes: observacoes,
      inicio: inicio,
      proximaAvaliacao: proximaAvaliacao,
      criador: usuarioLogado.nome,
      criadorId: usuarioLogado.id,
      escolaId: usuarioLogado.escolas
        ? Object.keys(usuarioLogado.escolas)[0]
        : null,
      dataCriacao: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "avaliacoesIniciais"), dadosParaSalvar);
      setEstado({ sucesso: "Reavaliação salva com sucesso!", salvando: false });
      setTimeout(() => navigate("/ver-avaliacoes"), 1500);
    } catch (error) {
      console.error("Erro ao salvar reavaliação:", error);
      setEstado({ erro: `Erro ao salvar: ${error.message}`, salvando: false });
    }
  }, [
    inicio,
    proximaAvaliacao,
    alunoSelecionado,
    respostas,
    observacoes,
    usuarioLogado,
    navigate,
    setEstado,
  ]);

  const carregandoGeral =
    carregandoAlunos || estado.carregandoAvaliacao || estado.salvando;

  return (
    <div className="avaliacao-card">
      <AvaliacaoHeader
        destinoVoltar={`/ver-avaliacoes`}
        onVerAvaliacoesClick={() => navigate("/ver-avaliacoes")}
        disabled={carregandoGeral}
      />

      <h2 className="card-titulo">
        Reavaliação para: {alunoSelecionado?.nome || "..."}
      </h2>

      {estado.erro && <div className="mensagem-erro">{estado.erro}</div>}
      {estado.sucesso && (
        <div className="mensagem-sucesso">{estado.sucesso}</div>
      )}

      {alunoSelecionado && (
        <>
          <p className="aluno-idade">
            Idade: <strong>{idade}</strong> anos
          </p>

          <div className="date-inputs-container">
            <div className="date-input-group">
              <label htmlFor="dataInicio">Data de Início:</label>
              <input
                id="dataInicio"
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                disabled={carregandoGeral}
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="proximaAvaliacao">Próxima Avaliação:</label>
              <input
                id="proximaAvaliacao"
                type="date"
                value={proximaAvaliacao}
                onChange={(e) => setProximaAvaliacao(e.target.value)}
                disabled={carregandoGeral}
              />
            </div>
          </div>

          <div className="area-tabs-container">
            {areasParaAbas.map((area) => (
              <button
                key={area}
                onClick={() => setAreaSelecionada(area)}
                className={`area-botao ${areaSelecionada === area ? "ativo" : ""}`}
                disabled={carregandoGeral}
              >
                {area}
              </button>
            ))}
          </div>

          {areaSelecionada && (
            <AreaPerguntas
              area={areaSelecionada}
              dados={todasAsAreas[areaSelecionada]}
              respostas={respostas[areaSelecionada] || {}}
              observacoes={observacoes[areaSelecionada] || ""}
              onResponder={handleResposta}
              onObservar={handleObservacao}
              disabled={carregandoGeral}
            />
          )}

          <button
            onClick={onSalvarReavaliacaoClick}
            className="botao-salvar"
            disabled={carregandoGeral || !inicio || !proximaAvaliacao}
          >
            {estado.salvando ? "Salvando..." : "Salvar Reavaliação"}
          </button>
        </>
      )}
    </div>
  );
};

export default Reavaliacao;
