import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import BotaoVoltar from "../components/BotaoVoltar";
import SelecaoAluno from "../components/SelecaoAluno";
import AreaPerguntas from "../components/AreaPerguntas";
import { useNavigate } from "react-router-dom";

function AvaliacaoInicial() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState("");
  const [idade, setIdade] = useState(null);
  const [faixaEtaria, setFaixaEtaria] = useState("");
  const [observacoes, setObservacoes] = useState({});
  const [respostas, setRespostas] = useState({});
  const [areaSelecionada, setAreaSelecionada] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const buscarAlunos = async () => {
      try {
        const snapshot = await getDocs(collection(db, "alunos"));
        const alunosFirestore = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlunos(alunosFirestore);
      } catch (erro) {
        console.error("Erro ao carregar alunos do Firestore:", erro);
      }
    };
  
    buscarAlunos();
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

  const handleSalvar = async () => {
    if (!alunoSelecionado || !idade || !faixaEtaria) {
      alert("Preencha todos os campos da avaliação.");
      return;
    }

    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    const novaAvaliacao = {
      aluno: alunoSelecionado,
      idade,
      faixaEtaria,
      respostas,
      observacoes,
      criadoPor: usuario?.nome || "Desconhecido",
      dataCriacao: new Date().toISOString()
    };

    try {
      const ref = collection(db, "avaliacoesIniciais");
      const q = query(ref, where("aluno", "==", alunoSelecionado));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, novaAvaliacao);
        alert("Avaliação atualizada com sucesso!");
      } else {
        await addDoc(ref, novaAvaliacao);
        alert("Avaliação salva com sucesso!");
      }

      navigate("/ver-avaliacoes");
    } catch (error) {
      console.error("Erro ao salvar avaliação:", error);
      alert("Erro ao salvar. Tente novamente.");
    }
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

        {alunoSelecionado && (
          <button
            onClick={handleSalvar}
            style={{
              marginTop: "30px",
              backgroundColor: "#1d3557",
              color: "white",
              padding: "14px 24px",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer",
              display: "block",
              marginLeft: "auto",
              marginRight: "auto"
            }}
          >
            Salvar Avaliação
          </button>
        )}
      </div>
    </div>
  );
}

export default AvaliacaoInicial;