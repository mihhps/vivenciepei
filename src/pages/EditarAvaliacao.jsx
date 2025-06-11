// src/pages/EditarAvaliacao.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import BotaoVoltar from "../components/BotaoVoltar";
import "../styles/EditarAvaliacao.css";
import "../styles/NiveisDeAvaliacao.css"; // Essencial para as bolinhas

const niveis = ["NR", "AF", "AG", "AV", "AVi", "I", "NA"];

const formatarDataParaInput = (data) => {
  if (!data) return "";
  try {
    const dateObj = data instanceof Timestamp ? data.toDate() : new Date(data);
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

export default function EditarAvaliacao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [avaliacao, setAvaliacao] = useState(null);
  const [observacoes, setObservacoes] = useState({});
  const [respostas, setRespostas] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [areaSelecionada, setAreaSelecionada] = useState("");

  useEffect(() => {
    const carregarAvaliacao = async () => {
      try {
        const docRef = doc(db, "avaliacoesIniciais", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const dados = docSnap.data();
          setAvaliacao({
            id: docSnap.id,
            ...dados,
            inicio: formatarDataParaInput(dados.inicio),
            proximaAvaliacao: formatarDataParaInput(dados.proximaAvaliacao),
          });
          setObservacoes(dados.observacoes || {});
          setRespostas(dados.respostas || {});
          setAreaSelecionada(Object.keys(avaliacaoInicial)[0] || "");
        } else {
          alert("Avaliação não encontrada.");
          navigate("/ver-avaliacoes");
        }
      } catch (erro) {
        console.error("Erro ao carregar avaliação:", erro);
      } finally {
        setCarregando(false);
      }
    };
    carregarAvaliacao();
  }, [id, navigate]);

  const handleResposta = (area, habilidade, nivel) => {
    setRespostas((prev) => ({
      ...prev,
      [area]: { ...prev[area], [habilidade]: nivel },
    }));
  };

  const handleObservacao = (area, texto) => {
    setObservacoes((prev) => ({ ...prev, [area]: texto }));
  };

  const handleSalvar = async () => {
    try {
      const docRef = doc(db, "avaliacoesIniciais", id);
      await updateDoc(docRef, {
        respostas,
        observacoes,
        inicio: avaliacao.inicio
          ? Timestamp.fromDate(new Date(avaliacao.inicio + "T00:00:00"))
          : null,
        proximaAvaliacao: avaliacao.proximaAvaliacao
          ? Timestamp.fromDate(
              new Date(avaliacao.proximaAvaliacao + "T00:00:00")
            )
          : null,
        ultimaEdicao: Timestamp.now(),
      });
      alert("Avaliação atualizada com sucesso!");
      navigate("/ver-avaliacoes");
    } catch (erro) {
      console.error("Erro ao salvar:", erro);
      alert("Erro ao salvar avaliação.");
    }
  };

  if (carregando)
    return (
      <p style={{ textAlign: "center", marginTop: "50px" }}>Carregando...</p>
    );

  return (
    // DIV 1: O FUNDO AZUL
    <div className="fundo-pagina">
      {/* DIV 2: O CARD BRANCO */}
      <div className="card-principal">
        {/* Todo o seu conteúdo original vai aqui dentro */}
        <BotaoVoltar destino="/ver-avaliacoes" />
        <h2 className="editar-titulo">Editar Avaliação - {avaliacao?.aluno}</h2>

        <div className="datas-container">
          <div className="data-input-grupo">
            <label className="data-label">Data de Início:</label>
            <input
              type="date"
              className="data-input"
              value={avaliacao?.inicio || ""}
              onChange={(e) =>
                setAvaliacao((prev) => ({ ...prev, inicio: e.target.value }))
              }
            />
          </div>
          <div className="data-input-grupo">
            <label className="data-label">Próxima Avaliação:</label>
            <input
              type="date"
              className="data-input"
              value={avaliacao?.proximaAvaliacao || ""}
              onChange={(e) =>
                setAvaliacao((prev) => ({
                  ...prev,
                  proximaAvaliacao: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="abas-areas-container">
          {Object.keys(avaliacaoInicial).map((area) => (
            <button
              key={area}
              onClick={() => setAreaSelecionada(area)}
              className={`area-botao ${
                areaSelecionada === area ? "ativo" : ""
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {areaSelecionada && (
          <div className="area-conteudo">
            <h3>{areaSelecionada}</h3>
            {avaliacaoInicial[areaSelecionada].map((item, index) => (
              <div key={index} className="linha-habilidade">
                <div className="texto-habilidade">
                  <strong>{item.subarea}:</strong> {item.habilidade}
                </div>
                <div className="niveis-habilidade">
                  {niveis.map((nivel) => (
                    <div
                      key={nivel}
                      className={`circulo-nivel ${nivel} ${
                        respostas?.[areaSelecionada]?.[item.habilidade] ===
                        nivel
                          ? "ativo"
                          : ""
                      }`}
                      onClick={() =>
                        handleResposta(areaSelecionada, item.habilidade, nivel)
                      }
                    >
                      {nivel}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="observacoes-container">
              <label>Observações ({areaSelecionada}):</label>
              <textarea
                className="observacoes-textarea"
                value={observacoes?.[areaSelecionada] || ""}
                onChange={(e) =>
                  handleObservacao(areaSelecionada, e.target.value)
                }
              />
            </div>
          </div>
        )}

        <button onClick={handleSalvar} className="botao-salvar">
          Salvar Alterações
        </button>
      </div>
    </div>
  );
}
