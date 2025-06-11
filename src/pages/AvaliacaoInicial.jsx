// src/pages/AvaliacaoInicial.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import BotaoVoltar from "../components/BotaoVoltar";
import SelecaoAluno from "../components/SelecaoAluno";
import AreaPerguntas from "../components/AreaPerguntas";
import { useNavigate } from "react-router-dom";
import "../styles/AvaliacaoInicial.css";

const COLLECTIONS = {
  ALUNOS: "alunos",
  AVALIACOES_INICIAIS: "avaliacoesIniciais",
  PEIS: "PEIs",
};

const PEI_STATUS = {
  EM_ELABORACAO: "em elaboração",
};

function AvaliacaoInicial() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoObj, setAlunoSelecionadoObj] = useState(null);
  const [idade, setIdade] = useState(null);
  const [observacoes, setObservacoes] = useState({});
  const [respostas, setRespostas] = useState({});
  const [areaSelecionada, setAreaSelecionada] = useState("");
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);
  const [carregandoAvaliacao, setCarregandoAvaliacao] = useState(false);
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false);
  const [erro, setErro] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState(null);
  const [inicio, setInicio] = useState("");
  const [proximaAvaliacao, setProximaAvaliacao] = useState("");
  const navigate = useNavigate();

  // ======================= LÓGICA DO DESTINO DINÂMICO =======================
  // Lê o usuário logado para descobrir seu perfil
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
  const perfil = usuarioLogado.perfil;

  // Cria a rota do painel dinamicamente. Ex: /painel-dev, /painel-aee
  // Se não encontrar um perfil, volta para a página raiz "/" como segurança.
  const painelDestino = perfil ? `/painel-${perfil}` : "/";
  // ==========================================================================

  const areas = useMemo(() => Object.keys(avaliacaoInicial), []);

  const exibirMensagem = useCallback((tipo, texto) => {
    if (tipo === "erro") {
      setErro(texto);
      setMensagemSucesso(null);
    } else if (tipo === "sucesso") {
      setMensagemSucesso(texto);
      setErro(null);
    }
    setTimeout(() => {
      setErro(null);
      setMensagemSucesso(null);
    }, 5000);
  }, []);

  const buscarAlunos = useCallback(async () => {
    try {
      setCarregandoAlunos(true);
      setErro(null);
      const snapshot = await getDocs(collection(db, COLLECTIONS.ALUNOS));
      const alunosFirestore = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAlunos(alunosFirestore);
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
      exibirMensagem("erro", "Falha ao carregar alunos.");
    } finally {
      setCarregandoAlunos(false);
    }
  }, [exibirMensagem]);

  useEffect(() => {
    buscarAlunos();
  }, [buscarAlunos]);

  const calcularIdade = useCallback((nascimento) => {
    if (!nascimento) return null;
    const nascDate = new Date(nascimento);
    if (isNaN(nascDate.getTime())) return null;
    const hoje = new Date();
    let idadeAtual = hoje.getFullYear() - nascDate.getFullYear();
    const m = hoje.getMonth() - nascDate.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascDate.getDate())) {
      idadeAtual--;
    }
    return idadeAtual;
  }, []);

  const handleSelecionarAluno = useCallback(
    async (e) => {
      const alunoNome = e.target.value;
      const aluno = alunos.find((a) => a.nome === alunoNome);

      setAlunoSelecionadoObj(aluno || null);
      setRespostas({});
      setObservacoes({});
      setInicio("");
      setProximaAvaliacao("");
      setAreaSelecionada("");
      setErro(null);
      setMensagemSucesso(null);

      if (!aluno) {
        setIdade(null);
        return;
      }

      setIdade(calcularIdade(aluno.nascimento));

      try {
        setCarregandoAvaliacao(true);
        const q = query(
          collection(db, COLLECTIONS.AVALIACOES_INICIAIS),
          where("alunoId", "==", aluno.id)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const avaliacaoExistente = snapshot.docs
            .map((doc) => doc.data())
            .sort(
              (a, b) =>
                (b.dataCriacao?.toDate() || new Date(0)).getTime() -
                (a.dataCriacao?.toDate() || new Date(0)).getTime()
            )[0];
          setRespostas(avaliacaoExistente.respostas || {});
          setObservacoes(avaliacaoExistente.observacoes || {});
          if (avaliacaoExistente.inicio instanceof Timestamp)
            setInicio(
              avaliacaoExistente.inicio.toDate().toISOString().split("T")[0]
            );
          if (avaliacaoExistente.proximaAvaliacao instanceof Timestamp)
            setProximaAvaliacao(
              avaliacaoExistente.proximaAvaliacao
                .toDate()
                .toISOString()
                .split("T")[0]
            );
          exibirMensagem("sucesso", "Avaliação existente carregada.");
        } else {
          exibirMensagem("sucesso", "Inicie uma nova avaliação.");
        }
        setAreaSelecionada(areas[0] || "");
      } catch (error) {
        console.error("Erro ao carregar avaliação:", error);
        exibirMensagem("erro", "Erro ao carregar avaliação existente.");
      } finally {
        setCarregandoAvaliacao(false);
      }
    },
    [alunos, calcularIdade, exibirMensagem, areas]
  );

  // Demais funções (handleResposta, handleObservacao, etc.) permanecem iguais...
  const handleResposta = useCallback((area, habilidade, nivel) => {
    setRespostas((prev) => ({
      ...prev,
      [area]: { ...prev[area], [habilidade]: nivel },
    }));
  }, []);
  const handleObservacao = useCallback((area, texto) => {
    setObservacoes((prev) => ({ ...prev, [area]: texto }));
  }, []);
  const createOrUpdatePEI = useCallback(
    async (alunoData, avaliacaoData, usuarioData) => {
      const currentYear = new Date().getFullYear();
      const peiData = {
        alunoId: alunoData.id,
        aluno: alunoData.nome,
        escolaId: alunoData.escolaId,
        anoLetivo: currentYear,
        status: PEI_STATUS.EM_ELABORACAO,
        dataCriacao: Timestamp.now(),
        dataInicio: avaliacaoData.inicio || null,
        dataPrevistaTermino: avaliacaoData.proximaAvaliacao || null,
        criadorId: usuarioData.email || "",
        nomeCriador: usuarioData.nome || "Desconhecido",
        cargoCriador: usuarioData.cargo || "Desconhecido",
      };
      try {
        const peiRef = collection(db, COLLECTIONS.PEIS);
        const q = query(
          peiRef,
          where("alunoId", "==", alunoData.id),
          where("anoLetivo", "==", currentYear)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await updateDoc(snapshot.docs[0].ref, peiData);
        } else {
          await addDoc(peiRef, peiData);
        }
      } catch (error) {
        console.error("Erro ao criar/atualizar PEI:", error);
      }
    },
    []
  );
  const handleSalvar = async () => {
    if (!alunoSelecionadoObj) {
      exibirMensagem("erro", "Selecione um aluno.");
      return;
    }
    try {
      setSalvandoAvaliacao(true);
      const novaAvaliacaoData = {
        alunoId: alunoSelecionadoObj.id,
        aluno: alunoSelecionadoObj.nome,
        idade,
        respostas,
        observacoes,
        inicio: inicio
          ? Timestamp.fromDate(new Date(inicio + "T00:00:00"))
          : null,
        proximaAvaliacao: proximaAvaliacao
          ? Timestamp.fromDate(new Date(proximaAvaliacao + "T00:00:00"))
          : null,
        criadoPor: usuarioLogado.nome || "Desconhecido",
        cargoCriador: usuarioLogado.cargo || "Desconhecido",
        criadorId: usuarioLogado.email || "",
        dataCriacao: Timestamp.now(),
      };
      const ref = collection(db, COLLECTIONS.AVALIACOES_INICIAIS);
      const q = query(ref, where("alunoId", "==", alunoSelecionadoObj.id));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, novaAvaliacaoData);
        exibirMensagem("sucesso", "Avaliação atualizada!");
      } else {
        await addDoc(ref, novaAvaliacaoData);
        exibirMensagem("sucesso", "Avaliação salva!");
      }
      await createOrUpdatePEI(
        alunoSelecionadoObj,
        novaAvaliacaoData,
        usuarioLogado
      );
      navigate("/ver-avaliacoes");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      exibirMensagem("erro", `Erro ao salvar: ${error.message}.`);
    } finally {
      setSalvandoAvaliacao(false);
    }
  };

  const carregandoGeral =
    carregandoAlunos || carregandoAvaliacao || salvandoAvaliacao;

  return (
    <div className="avaliacao-container">
      <div className="avaliacao-card">
        <div className="avaliacao-header">
          {/* ======================= CORREÇÃO FINAL AQUI ======================= */}
          <BotaoVoltar destino={painelDestino} />
          {/* ====================================================================== */}
          <button
            onClick={() => navigate("/ver-avaliacoes")}
            className="botao-ver-avaliacoes"
            disabled={
              carregandoAlunos || carregandoAvaliacao || salvandoAvaliacao
            }
          >
            Ver Avaliações
          </button>
        </div>

        <h1 className="avaliacao-titulo">Avaliação Inicial Modular Completa</h1>

        {/* O resto do seu componente JSX permanece o mesmo */}
        {erro && (
          <div className="mensagem-erro" role="alert">
            {erro}
          </div>
        )}
        {mensagemSucesso && (
          <div className="mensagem-sucesso" role="status">
            {mensagemSucesso}
          </div>
        )}
        {carregandoAlunos ? (
          <div className="loading">Carregando alunos...</div>
        ) : (
          <SelecaoAluno
            alunos={alunos}
            alunoSelecionado={alunoSelecionadoObj?.nome || ""}
            onSelecionar={handleSelecionarAluno}
            disabled={carregandoGeral}
          />
        )}
        {alunoSelecionadoObj && idade !== null && (
          <p style={{ marginBottom: "15px", fontSize: "16px" }}>
            <strong>Idade:</strong> {idade} anos
          </p>
        )}
        {alunoSelecionadoObj && (
          <div
            style={{
              display: "flex",
              gap: "30px",
              marginBottom: "30px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Data de Início:
              </label>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
                disabled={carregandoGeral}
              />
            </div>
            <div>
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Próxima Avaliação:
              </label>
              <input
                type="date"
                value={proximaAvaliacao}
                onChange={(e) => setProximaAvaliacao(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
                disabled={carregandoGeral}
              />
            </div>
          </div>
        )}
        {alunoSelecionadoObj && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "30px",
            }}
          >
            {areas.map((area) => (
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
        )}
        {carregandoAvaliacao && alunoSelecionadoObj && !areaSelecionada && (
          <div className="loading">Carregando avaliação...</div>
        )}
        {areaSelecionada && alunoSelecionadoObj && (
          <AreaPerguntas
            area={areaSelecionada}
            dados={avaliacaoInicial[areaSelecionada]}
            respostas={respostas[areaSelecionada] || {}}
            observacoes={observacoes[areaSelecionada] || ""}
            onResponder={handleResposta}
            onObservar={handleObservacao}
            disabled={carregandoGeral}
          />
        )}
        {alunoSelecionadoObj && (
          <button
            onClick={handleSalvar}
            className="botao-salvar"
            disabled={carregandoGeral}
          >
            {" "}
            {salvandoAvaliacao ? "Salvando..." : "Salvar Avaliação"}{" "}
          </button>
        )}
      </div>
    </div>
  );
}

export default AvaliacaoInicial;
