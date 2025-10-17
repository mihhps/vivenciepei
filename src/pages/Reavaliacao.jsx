// src/pages/Reavaliacao.jsx

import React, { useState, useMemo, useCallback, useEffect } from "react"; // <-- CORREÇÃO: useEffect importado
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
import { FaUserCircle } from "react-icons/fa"; // Importar ícone para placeholder

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

// NOVO: Função para calcular a idade exata (MOVIDA PARA FORA DO COMPONENTE)
const calcularIdadeExata = (dataNascimentoString) => {
  if (!dataNascimentoString) return null;

  const dataNascimento = new Date(dataNascimentoString);
  const hoje = new Date();

  if (isNaN(dataNascimento)) return null;

  let anos = hoje.getFullYear() - dataNascimento.getFullYear();
  let meses = hoje.getMonth() - dataNascimento.getMonth();
  let dias = hoje.getDate() - dataNascimento.getDate();

  if (dias < 0) {
    meses--;
    dias += new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    anos--;
    meses += 12;
  }

  const idadeDecimal = anos + meses / 12 + dias / 365.25;
  return idadeDecimal;
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
    // Idade não precisa ser usada aqui, pois a calcularemos internamente se o hook não a fornecer.
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
      const cleanedAlunoId = alunoId.trim();
      const lowerCaseAlunoId = cleanedAlunoId.toLowerCase();
      let querySnapshot;

      // Busca a última avaliação inicial
      let q = query(
        collection(db, "avaliacoesIniciais"),
        where("alunoId", "==", cleanedAlunoId),
        orderBy("dataCriacao", "desc"),
        limit(1)
      );
      querySnapshot = await getDocs(q);

      if (querySnapshot.empty && cleanedAlunoId !== lowerCaseAlunoId) {
        q = query(
          collection(db, "avaliacoesIniciais"),
          where("alunoId", "==", lowerCaseAlunoId),
          orderBy("dataCriacao", "desc"),
          limit(1)
        );
        querySnapshot = await getDocs(q);
      }

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

  // CORREÇÃO: useEffect para carregar a avaliação
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
      setEstado((prev) => ({
        ...prev,
        erro: "Por favor, preencha as datas de Início e Próxima Avaliação e selecione um aluno.",
      }));
      return;
    }

    setEstado({ salvando: true, erro: null });

    const dadosParaSalvar = {
      alunoId: alunoSelecionado.id,
      aluno: {
        nome: alunoSelecionado.nome,
      },
      turma: alunoSelecionado.turma,
      respostas: respostas,
      observacoes: observacoes,
      inicio: inicio,
      proximaAvaliacao: proximaAvaliacao,
      criador: usuarioLogado.nome,
      criadorId: usuarioLogado.id || usuarioLogado.email,
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

  // NOVO: Função para formatar a idade para exibição
  const formatarIdadeExibicao = useCallback((aluno) => {
    const dataNascimento = aluno?.nascimento;
    const idadeDecimal = calcularIdadeExata(dataNascimento);
    const idadeNum = Number(idadeDecimal);

    if (isNaN(idadeNum) || idadeNum <= 0) {
      return "N/A";
    }
    const idadeAnos = Math.floor(idadeNum);
    const idadeMeses = Math.round((idadeNum - idadeAnos) * 12);

    let resultado = `${idadeAnos} ano${idadeAnos !== 1 ? "s" : ""}`;
    if (idadeMeses > 0) {
      resultado += ` e ${idadeMeses} mes${idadeMeses !== 1 ? "es" : ""}`;
    }
    return resultado;
  }, []);

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

      {(carregandoAlunos || estado.carregandoAvaliacao) && (
        <div className="mensagem-carregando">Carregando dados...</div>
      )}

      {alunoSelecionado && !carregandoAlunos && !estado.carregandoAvaliacao && (
        <>
          {/* --- NOVO BLOCO: FOTO E IDADE --- */}
          <div style={estilos.infoGeralContainer}>
            {/* FOTO / PLACEHOLDER */}
            <div style={estilos.fotoContainer}>
              {alunoSelecionado.fotoUrl ? (
                <img
                  src={alunoSelecionado.fotoUrl}
                  alt={`Foto de ${alunoSelecionado.nome}`}
                  style={estilos.foto}
                />
              ) : (
                <FaUserCircle style={estilos.fotoPlaceholder} />
              )}
            </div>

            {/* IDADE */}
            <p className="aluno-idade" style={estilos.idadeText}>
              Idade: <strong>{formatarIdadeExibicao(alunoSelecionado)}</strong>
            </p>
          </div>
          {/* --- FIM DO BLOCO FOTO/IDADE --- */}

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
                className={`area-botao ${
                  areaSelecionada === area ? "ativo" : ""
                }`}
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

// --- Estilos Inline Replicados de AvaliacaoInicial.js (Para a Foto) ---
const estilos = {
  infoGeralContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "20px",
    borderBottom: "1px solid #e2e8f0",
  },
  fotoContainer: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    overflow: "hidden",
    marginRight: "15px",
    flexShrink: 0,
    border: "2px solid #4c51bf", // Cor primária
    backgroundColor: "#edf2f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  foto: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  fotoPlaceholder: {
    fontSize: "2.5em",
    color: "#4c51bf",
  },
  idadeText: {
    margin: 0,
    fontSize: "1.1rem",
    color: "#4a5568",
  },
};

export default Reavaliacao;
