import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar";
import "../styles/AvaliacaoInicial.css";

export default function AcompanharMetas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pei, setPei] = useState(null);
  const [acompanhamento, setAcompanhamento] = useState({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarPEI = async () => {
      try {
        const docRef = doc(db, "peis", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const dados = docSnap.data();
          setPei(dados);
          setAcompanhamento(dados.acompanhamento || {});
        } else {
          alert("PEI não encontrado.");
          navigate("/ver-peis");
        }
      } catch (erro) {
        console.error("Erro ao carregar PEI:", erro);
        alert("Erro ao carregar dados.");
      } finally {
        setCarregando(false);
      }
    };
    carregarPEI();
  }, [id, navigate]);

  const handleStatusChange = (habilidade, status) => {
    setAcompanhamento((prev) => ({
      ...prev,
      [habilidade]: {
        ...(prev[habilidade] || {}),
        status,
      },
    }));
  };

  const handleObservacaoChange = (habilidade, texto) => {
    setAcompanhamento((prev) => ({
      ...prev,
      [habilidade]: {
        ...(prev[habilidade] || {}),
        observacoes: texto,
      },
    }));
  };

  const handleSalvar = async () => {
    try {
      await updateDoc(doc(db, "peis", id), {
        acompanhamento,
        ultimaAtualizacao: new Date().toISOString(),
      });
      alert("Acompanhamento salvo com sucesso!");
      navigate("/ver-peis");
    } catch (erro) {
      console.error("Erro ao salvar:", erro);
      alert("Erro ao salvar acompanhamento.");
    }
  };

  if (carregando || !pei) return <p>Carregando...</p>;

  return (
    <div className="editar-container">
      <BotaoVoltar />
      <h2 className="editar-titulo">Acompanhamento das Metas - {pei.nome}</h2>

      {pei.resumoPEI?.map((meta, index) => (
  <div key={index} style={{ marginBottom: "30px" }}>
    <p><strong>Área:</strong> {meta.area}</p>
    <p><strong>Habilidade:</strong> {meta.habilidade}</p>
    <p><strong>Nível Almejado:</strong> {meta.nivelAlmejado}</p>

    <div style={{ display: "flex", gap: "15px", marginBottom: "10px" }}>
      {["Sim", "Parcial", "Não"].map((opcao) => (
        <label key={opcao} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <input
            type="radio"
            name={`status-${index}`}
            value={opcao}
            checked={acompanhamento[meta.habilidade]?.status === opcao}
            onChange={() => handleStatusChange(meta.habilidade, opcao)}
          />
          {opcao}
        </label>
      ))}
    </div>

    <textarea
      placeholder="Observações..."
      style={{
        width: "100%",
        height: "60px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        padding: "8px",
      }}
      value={acompanhamento[meta.habilidade]?.observacoes || ""}
      onChange={(e) => handleObservacaoChange(meta.habilidade, e.target.value)}
    />
  </div>
))}

      <button className="botao-salvar" onClick={handleSalvar}>
        Salvar Acompanhamento
      </button>
    </div>
  );
}