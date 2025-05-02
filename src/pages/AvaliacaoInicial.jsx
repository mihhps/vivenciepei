import React, { useState, useEffect } from "react";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import BotaoVoltar from "../components/BotaoVoltar";
import SelecaoAluno from "../components/SelecaoAluno";
import AreaPerguntas from "../components/AreaPerguntas";
import BotaoSalvar from "../components/BotaoSalvar";
import { useNavigate } from "react-router-dom";

function AvaliacaoInicial() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState("");
  const [idade, setIdade] = useState(null);
  const [faixaEtaria, setFaixaEtaria] = useState("");
  const [observacoes, setObservacoes] = useState({});
  const [respostas, setRespostas] = useState({});
  const [areaSelecionada, setAreaSelecionada] = useState("");
  const [editando, setEditando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const listaAlunos = JSON.parse(localStorage.getItem("alunos")) || [];
    setAlunos(listaAlunos);
  }, []);

  useEffect(() => {
    const edicao = JSON.parse(localStorage.getItem("avaliacaoEmEdicao"));
    if (edicao) {
      setAlunoSelecionado(edicao.aluno);
      setIdade(edicao.idade);
      setFaixaEtaria(edicao.faixaEtaria);
      setRespostas(edicao.respostas);
      setObservacoes(edicao.observacoes);
      setEditando(true);
      localStorage.removeItem("avaliacaoEmEdicao");
    }
  }, []);

  const calcularIdadeEFaixa = (nascimento) => {
    if (!nascimento) return [null, ""];
    const hoje = new Date();
    const nasc = new Date(nascimento);
    let idadeAtual = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idadeAtual--;

    let faixa =
      idadeAtual <= 3 ? null :
      idadeAtual <= 5 ? "4-5" :
      idadeAtual <= 10 ? "6-10" :
      idadeAtual <= 14 ? "11-14" :
      idadeAtual === 15 ? "15" : null;

    return faixa ? [idadeAtual, faixa] : [idadeAtual, ""];
  };

  const handleSelecionarAluno = (e) => {
    const nome = e.target.value;
    setAlunoSelecionado(nome);
    const aluno = alunos.find((a) => a.nome === nome);
    const [idadeCalculada, faixa] = calcularIdadeEFaixa(aluno?.nascimento);
    setIdade(idadeCalculada);
    setFaixaEtaria(faixa);
    setAreaSelecionada("");
    setRespostas({});
    setObservacoes({});
  };

  const handleResposta = (area, item, valor) => {
    setRespostas((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        [item]: valor,
      },
    }));
  };

  const handleObservacao = (area, texto) => {
    setObservacoes((prev) => ({
      ...prev,
      [area]: texto,
    }));
  };

  const areas = faixaEtaria && avaliacaoInicial[faixaEtaria]
    ? Object.keys(avaliacaoInicial[faixaEtaria])
    : [];

  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: "#1d3557", padding: "30px" }}>
      <div style={{
        background: "#fff",
        maxWidth: "900px",
        margin: "0 auto",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <BotaoVoltar />
          <button
            onClick={() => navigate("/ver-avaliacoes")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#457b9d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px"
            }}
          >
            Ver Avaliações
          </button>
        </div>

        <h2 style={{ textAlign: "center", color: "#1d3557", marginBottom: "25px" }}>Avaliação Inicial</h2>

        <SelecaoAluno
          alunos={alunos}
          alunoSelecionado={alunoSelecionado}
          onSelecionar={handleSelecionarAluno}
          editando={editando}
        />

        {faixaEtaria && (
          <>
            <p style={{ marginBottom: "15px", fontSize: "16px" }}>
              <strong>Idade:</strong> {idade} anos — <strong>Faixa Etária:</strong> {faixaEtaria}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "30px" }}>
              {areas.map((area) => (
                <button
                  key={area}
                  onClick={() => setAreaSelecionada(area)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "20px",
                    border: "none",
                    backgroundColor: areaSelecionada === area ? "#1d3557" : "#f0f0f0",
                    color: areaSelecionada === area ? "#fff" : "#333",
                    cursor: "pointer",
                    fontWeight: areaSelecionada === area ? "bold" : "normal"
                  }}
                >
                  {area.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </>
        )}

        {areaSelecionada && (
          <AreaPerguntas
            area={areaSelecionada}
            faixaEtaria={faixaEtaria}
            dados={avaliacaoInicial[faixaEtaria][areaSelecionada]}
            respostas={respostas}
            observacoes={observacoes}
            onResponder={handleResposta}
            onObservar={handleObservacao}
          />
        )}
      </div>

      {alunoSelecionado && (
        <BotaoSalvar
          aluno={alunoSelecionado}
          idade={idade}
          faixa={faixaEtaria}
          respostas={respostas}
          observacoes={observacoes}
          editando={editando}
        />
      )}
    </div>
  );
}

export default AvaliacaoInicial;