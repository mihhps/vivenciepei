import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import BotaoVoltar from "../components/BotaoVoltar";

export default function EditarAvaliacao() {
  const { aluno } = useParams();
  const navigate = useNavigate();
  const [avaliacao, setAvaliacao] = useState(null);
  const [observacoes, setObservacoes] = useState({});
  const [respostas, setRespostas] = useState({});

  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("avaliacoesIniciais")) || [];
    const avaliacaoEncontrada = dados.find((a) => a.aluno === aluno);
    if (avaliacaoEncontrada) {
      setAvaliacao(avaliacaoEncontrada);
      setObservacoes(avaliacaoEncontrada.observacoes || {});
      setRespostas(avaliacaoEncontrada.respostas || {});
    } else {
      alert("Avaliação não encontrada.");
      navigate("/ver-avaliacoes");
    }
  }, [aluno, navigate]);

  const handleRespostaChange = (area, subarea, pergunta, valor) => {
    setRespostas((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        [subarea]: {
          ...((prev[area] && prev[area][subarea]) || {}),
          [pergunta]: valor,
        },
      },
    }));
  };

  const handleObservacaoChange = (area, texto) => {
    setObservacoes((prev) => ({
      ...prev,
      [area]: texto,
    }));
  };

  const handleSalvar = () => {
    const dados = JSON.parse(localStorage.getItem("avaliacoesIniciais")) || [];
    const novosDados = dados.map((a) => {
      if (a.aluno === aluno) {
        return {
          ...a,
          respostas,
          observacoes,
        };
      }
      return a;
    });
    localStorage.setItem("avaliacoesIniciais", JSON.stringify(novosDados));
    alert("Avaliação atualizada com sucesso!");
    navigate("/ver-avaliacoes");
  };

  if (!avaliacao) return <p>Carregando...</p>;

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <BotaoVoltar />
      <h2 style={{ marginBottom: "20px" }}>Editar Avaliação - {avaliacao.aluno}</h2>

      {avaliacaoInicial.map((areaObj) => (
        <div key={areaObj.area} style={{ marginBottom: "30px" }}>
          <h3>{areaObj.area}</h3>
          {areaObj.subareas.map((subareaObj) => (
            <div key={subareaObj.subarea} style={{ marginLeft: "20px" }}>
              <h4>{subareaObj.subarea}</h4>
              {subareaObj.perguntas.map((pergunta, index) => (
                <div key={index} style={{ marginBottom: "10px" }}>
                  <label>{pergunta}</label>
                  <select
                    value={
                      respostas?.[areaObj.area]?.[subareaObj.subarea]?.[pergunta] || ""
                    }
                    onChange={(e) =>
                      handleRespostaChange(
                        areaObj.area,
                        subareaObj.subarea,
                        pergunta,
                        e.target.value
                      )
                    }
                  >
                    <option value="">Selecione</option>
                    <option value="NR">Não Realiza</option>
                    <option value="AF">Ajuda Física</option>
                    <option value="AL">Ajuda Leve</option>
                    <option value="AG">Ajuda Gestual</option>
                    <option value="AV">Ajuda Verbal</option>
                    <option value="I">Independente</option>
                  </select>
                </div>
              ))}
            </div>
          ))}
          <div style={{ marginTop: "10px" }}>
            <label>Observações ({areaObj.area}):</label>
            <textarea
              style={{ width: "100%", height: "60px" }}
              value={observacoes?.[areaObj.area] || ""}
              onChange={(e) => handleObservacaoChange(areaObj.area, e.target.value)}
            />
          </div>
        </div>
      ))}

      <button
        onClick={handleSalvar}
        style={{
          padding: "12px 24px",
          backgroundColor: "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "5px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Salvar Alterações
      </button>
    </div>
  );
}