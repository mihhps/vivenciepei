import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import BotaoVoltar from "../components/BotaoVoltar";
import "../styles/EditarAvaliacao.css"; // reutiliza o CSS das bolinhas

const niveis = ["NR", "AF", "AG", "AV", "AVi", "I", "NA"];

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
          setAvaliacao({ id: docSnap.id, ...dados });
          setObservacoes(dados.observacoes || {});
          setRespostas(dados.respostas || {});
          const primeiraArea = Object.keys(avaliacaoInicial)[0];
          setAreaSelecionada(primeiraArea || "");
        } else {
          alert("Avaliação não encontrada.");
          navigate("/ver-avaliacoes");
        }
      } catch (erro) {
        console.error("Erro ao carregar avaliação:", erro);
        alert("Erro ao carregar dados.");
      } finally {
        setCarregando(false);
      }
    };

    carregarAvaliacao();
  }, [id, navigate]);

  const handleResposta = (area, habilidade, nivel) => {
    setRespostas((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        [habilidade]: nivel,
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
    try {
      const docRef = doc(db, "avaliacoesIniciais", id);
      await updateDoc(docRef, {
        respostas,
        observacoes,
        inicio: avaliacao.inicio || "",
        proximaAvaliacao: avaliacao.proximaAvaliacao || "",
        ultimaEdicao: new Date().toISOString(),
      });
      alert("Avaliação atualizada com sucesso!");
      navigate("/ver-avaliacoes");
    } catch (erro) {
      console.error("Erro ao salvar:", erro);
      alert("Erro ao salvar avaliação.");
    }
  };

  if (carregando) return <p>Carregando...</p>;
  if (!avaliacao) return null;

  return (
    <div className="editar-container">
      <BotaoVoltar />
      <h2 className="editar-titulo">Editar Avaliação - {avaliacao.aluno}</h2>

      <div style={{ display: "center", gap: "30px", marginBottom: "30px", flexWrap: "wrap" }}>
        <div style={{ flex: "1" }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}>
            Data de Início:
          </label>
          <input
            type="date"
            value={avaliacao.inicio || ""}
            onChange={(e) =>
              setAvaliacao((prev) => ({ ...prev, inicio: e.target.value }))
            }
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "14px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        <div style={{ flex: "1" }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}>
            Próxima Avaliação:
          </label>
          <input
            type="date"
            value={avaliacao.proximaAvaliacao || ""}
            onChange={(e) =>
              setAvaliacao((prev) => ({ ...prev, proximaAvaliacao: e.target.value }))
            }
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "14px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>
      </div>

      {/* Abas por área */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "30px" }}>
        {Object.keys(avaliacaoInicial).map((area) => (
          <button
            key={area}
            onClick={() => setAreaSelecionada(area)}
            className={`area-botao ${areaSelecionada === area ? "ativo" : ""}`}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              backgroundColor: areaSelecionada === area ? "#1d3557" : "#f1f1f1",
              color: areaSelecionada === area ? "#fff" : "#000",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {area}
          </button>
        ))}
      </div>

      {/* Conteúdo da área selecionada */}
      {areaSelecionada && (
        <div style={{ marginBottom: "40px" }}>
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
                      respostas?.[areaSelecionada]?.[item.habilidade] === nivel ? "ativo" : ""
                    }`}
                    onClick={() => handleResposta(areaSelecionada, item.habilidade, nivel)}
                  >
                    {nivel}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginTop: "10px" }}>
            <label>Observações ({areaSelecionada}):</label>
            <textarea
              style={{ width: "100%", height: "60px" }}
              value={observacoes?.[areaSelecionada] || ""}
              onChange={(e) => handleObservacao(areaSelecionada, e.target.value)}
            />
          </div>
        </div>
      )}

      <button onClick={handleSalvar} className="botao-salvar">
        Salvar Alterações
      </button>
    </div>
  );
}
