import React, { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, updateDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import BotaoVoltar from "../components/BotaoVoltar";
import SelecaoAluno from "../components/SelecaoAluno";
import AreaPerguntas from "../components/AreaPerguntas";
import { useNavigate } from "react-router-dom";
import "../styles/AvaliacaoInicial.css";
import { Timestamp } from "firebase/firestore";


function AvaliacaoInicial() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState("");
  const [idade, setIdade] = useState(null);
  const [observacoes, setObservacoes] = useState({});
  const [respostas, setRespostas] = useState({});
  const [areaSelecionada, setAreaSelecionada] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const navigate = useNavigate();
  const [inicio, setInicio] = useState("");
const [proximaAvaliacao, setProximaAvaliacao] = useState("");

  const areas = Object.keys(avaliacaoInicial);

  const buscarAlunos = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const snapshot = await getDocs(collection(db, "alunos"));
      const alunosFirestore = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setAlunos(alunosFirestore);
    } catch (erro) {
      console.error("Erro ao carregar alunos:", erro);
      setErro("Falha ao carregar alunos. Tente recarregar a página.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscarAlunos();
  }, [buscarAlunos]);

  const calcularIdade = useCallback((nascimento) => {
    if (!nascimento) return null;

    try {
      const hoje = new Date();
      const nasc = new Date(nascimento);
      if (isNaN(nasc)) return null;

      let idadeAtual = hoje.getFullYear() - nasc.getFullYear();
      const m = hoje.getMonth() - nasc.getMonth();

      if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
        idadeAtual--;
      }

      return idadeAtual;
    } catch (error) {
      console.error("Erro ao calcular idade:", error);
      return null;
    }
  }, []);

  const handleSelecionarAluno = useCallback((e) => {
    const nome = e.target.value;
    setAlunoSelecionado(nome);
    setErro(null);

    const aluno = alunos.find((a) => a.nome === nome);
    if (!aluno) {
      setErro("Aluno não encontrado.");
      return;
    }

    const idadeCalculada = calcularIdade(aluno.nascimento);
    setIdade(idadeCalculada);
    setAreaSelecionada("");
    setRespostas({});
    setObservacoes({});
  }, [alunos, calcularIdade]);

 const handleResposta = useCallback((area, habilidade, nivel) => {
  setRespostas((prev) => ({
    ...prev,
    [area]: {
      ...prev[area],
      [habilidade]: nivel, // nível como valor!
    },
  }));
}, []);
  
  const handleObservacao = useCallback((area, texto) => {
    setObservacoes((prev) => ({
      ...prev,
      [area]: texto,
    }));
  }, []);

  const handleSalvar = async () => {
    if (!alunoSelecionado) {
      setErro("Selecione um aluno antes de salvar.");
      return;
    }

    if (!idade) {
      setErro("Não foi possível determinar a idade do aluno.");
      return;
    }

    try {
      setCarregando(true);
      setErro(null);

      const usuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
      const novaAvaliacao = {
  aluno: alunoSelecionado,
  idade,
  respostas,
  observacoes,
  inicio,
  proximaAvaliacao,
        criadoPor: usuario.nome || "Desconhecido",
        cargoCriador: usuario.cargo || "Desconhecido",
        criadorId: usuario.email || "",
        dataCriacao: Timestamp.now()
      };

      const ref = collection(db, "avaliacoesIniciais");
      const q = query(ref, where("aluno", "==", alunoSelecionado));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, novaAvaliacao);
        alert("Avaliação atualizada com sucesso!");
      } else {
        await addDoc(ref, novaAvaliacao);
        alert("Avaliação salva com sucesso!");
      }

      navigate("/ver-avaliacoes");
    } catch (error) {
      console.error("Erro ao salvar avaliação:", error);
      setErro("Erro ao salvar avaliação. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="avaliacao-container" aria-busy={carregando}>
      <div className="avaliacao-card">
        <div className="avaliacao-header">
          <BotaoVoltar />
          <button
            onClick={() => navigate("/ver-avaliacoes")}
            className="botao-ver-avaliacoes"
            disabled={carregando}
          >
            Ver Avaliações
          </button>
        </div>

        <h1 className="avaliacao-titulo">Avaliação Inicial Modular Completa</h1>

        {erro && <div className="mensagem-erro" role="alert">{erro}</div>}

        <SelecaoAluno
          alunos={alunos}
          alunoSelecionado={alunoSelecionado}
          onSelecionar={handleSelecionarAluno}
          carregando={carregando}
        />

        {idade && (
          <p style={{ marginBottom: "15px", fontSize: "16px" }}>
            <strong>Idade:</strong> {idade} anos
          </p>
        )}
        <div style={{
  display: "flex",
  gap: "30px",
  marginBottom: "30px",
  alignItems: "flex-end",
  flexWrap: "wrap"
}}>
  <div style={{ flex: "1" }}>
    <label style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}>
      Data de Início:
    </label>
    <input
      type="date"
      value={inicio}
      onChange={(e) => setInicio(e.target.value)}
      style={{
        width: "100%",
        padding: "8px",
        fontSize: "14px",
        borderRadius: "4px",
        border: "1px solid #ccc"
      }}
    />
  </div>

  <div style={{ flex: "1" }}>
    <label style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}>
      Próxima Avaliação:
    </label>
    <input
      type="date"
      value={proximaAvaliacao}
      onChange={(e) => setProximaAvaliacao(e.target.value)}
      style={{
        width: "100%",
        padding: "8px",
        fontSize: "14px",
        borderRadius: "4px",
        border: "1px solid #ccc"
      }}
    />
  </div>
</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "30px" }}>
          {areas.map((area) => (
            <button
              key={area}
              onClick={() => setAreaSelecionada(area)}
              className={`area-botao ${areaSelecionada === area ? "ativo" : ""}`}
              disabled={!alunoSelecionado || carregando}
              aria-current={areaSelecionada === area ? "true" : "false"}
            >
              {area}
            </button>
          ))}
        </div>

        {carregando && !areaSelecionada && (
          <div className="loading">Carregando...</div>
        )}

        {areaSelecionada && (
          <AreaPerguntas
            area={areaSelecionada}
            dados={avaliacaoInicial[areaSelecionada]}
            respostas={respostas[areaSelecionada] || {}}
            observacoes={observacoes[areaSelecionada] || ""}
            onResponder={handleResposta}
            onObservar={handleObservacao}
            disabled={carregando}
          />
        )}

        {alunoSelecionado && (
          <button
            onClick={handleSalvar}
            className="botao-salvar"
            disabled={carregando}
            aria-busy={carregando}
          >
            {carregando ? "Salvando..." : "Salvar Avaliação"}
          </button>
        )}
      </div>
    </div>
  );
}

export default AvaliacaoInicial;