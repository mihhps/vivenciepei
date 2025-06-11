import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar";
import "../styles/AcompanharMetas.css";

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

  if (carregando || !pei) return <p className="carregando">Carregando...</p>;

  return (
    <div className="acompanhamento-wrapper">
      <div className="acompanhamento-card">
        <BotaoVoltar />
        <h2 className="titulo-pagina">Acompanhamento das Metas - {pei.nome}</h2>

        {pei.resumoPEI?.map((meta, index) => (
          <div key={index} className="meta-bloco">
            <p>
              <strong>Área:</strong> {meta.area}
            </p>
            <p>
              <strong>Habilidade:</strong> {meta.habilidade}
            </p>
            <p>
              <strong>Nível Almejado:</strong> {meta.nivelAlmejado}
            </p>

            <div className="botoes-status">
              {["Sim", "Parcial", "Não"].map((opcao) => {
                const selecionado =
                  acompanhamento[meta.habilidade]?.status === opcao;
                return (
                  <button
                    key={opcao}
                    type="button"
                    className={`botao-status ${
                      selecionado ? "ativo" : ""
                    } botao-${opcao
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .toLowerCase()}
`}
                    onClick={() => handleStatusChange(meta.habilidade, opcao)}
                  >
                    {opcao}
                  </button>
                );
              })}
            </div>

            <textarea
              placeholder="Observações..."
              value={acompanhamento[meta.habilidade]?.observacoes || ""}
              onChange={(e) =>
                handleObservacaoChange(meta.habilidade, e.target.value)
              }
            />
          </div>
        ))}

        <button className="botao-salvar" onClick={handleSalvar}>
          Salvar Acompanhamento
        </button>
      </div>
    </div>
  );
}
