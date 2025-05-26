// src/pages/EditarPei.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const LEGENDA_NIVEIS = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente"
};

function EditarPei() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pei, setPei] = useState(null);
  const [entradaManual, setEntradaManual] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const carregarPei = async () => {
      try {
        const ref = doc(db, "peis", id);
        const docSnap = await getDoc(ref);

        if (!docSnap.exists()) {
          alert("PEI não encontrado.");
          return navigate("/ver-peis");
        }

        const dados = docSnap.data();
        setPei({ id, ...dados });

        const entradaInicial = {};
        (dados.resumoPEI || []).forEach((meta) => {
          entradaInicial[meta.habilidade] = {
            estrategias: meta.estrategias || [],
            estrategiasManuais: ""
          };
        });
        setEntradaManual(entradaInicial);
      } catch (error) {
        console.error("Erro ao carregar PEI:", error);
        setErro("Erro ao carregar dados.");
      } finally {
        setCarregando(false);
      }
    };

    carregarPei();
  }, [id, navigate]);

  const handleSalvar = async () => {
    try {
      setCarregando(true);

      const resumoAtualizado = (pei.resumoPEI || []).map((meta) => {
        const entrada = entradaManual[meta.habilidade] || {};
        const estrategiasSelecionadas = entrada.estrategias || [];
        const estrategiasManuais = entrada.estrategiasManuais
          .split("\n")
          .filter((e) => e.trim());

        return {
          ...meta,
          estrategias: [...estrategiasSelecionadas, ...estrategiasManuais]
        };
      });

      await updateDoc(doc(db, "peis", id), {
        resumoPEI: resumoAtualizado
      });

      alert("PEI atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar PEI:", error);
      alert("Erro ao salvar PEI.");
    } finally {
      setCarregando(false);
    }
  };

  const handleRemoverMeta = (idxRemover, habilidade) => {
    const novaLista = pei.resumoPEI.filter((_, i) => i !== idxRemover);
    const novaEntradaManual = { ...entradaManual };
    delete novaEntradaManual[habilidade];

    setPei((prev) => ({ ...prev, resumoPEI: novaLista }));
    setEntradaManual(novaEntradaManual);
  };

  if (carregando) return <p>Carregando...</p>;
  if (!pei) return null;

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h2 style={estilos.titulo}>Editar PEI: {pei.aluno}</h2>

        {(pei.resumoPEI || []).map((meta, idx) => {
          const entrada = entradaManual[meta.habilidade] || {};

          const estrategiasOriginais = Array.isArray(meta.estrategias)
            ? meta.estrategias
            : typeof meta.estrategias === "string"
            ? [meta.estrategias]
            : [];

          const selecionadas = entrada.estrategias || [];

          return (
            <article key={idx} style={estilos.metaCard}>
              <h3>{meta.habilidade}</h3>
              <p><strong>Nível atual:</strong> {meta.nivel} — {LEGENDA_NIVEIS[meta.nivel]}</p>
              <p><strong>Nível almejado:</strong> {meta.nivelAlmejado}</p>
              <p><strong>Objetivo:</strong> {meta.objetivo}</p>

              <button
                onClick={() => handleRemoverMeta(idx, meta.habilidade)}
                style={estilos.botaoRemover}
              >
                Remover
              </button>

              <fieldset>
                <legend style={{ fontWeight: "bold" }}>Estratégias:</legend>

                {estrategiasOriginais.map((estrategia, i) => (
                  <div key={i}>
                    <input
                      type="checkbox"
                      id={`estrategia-${idx}-${i}`}
                      checked={selecionadas.includes(estrategia)}
                      onChange={(e) => {
                        const atual = [...selecionadas];
                        const atualizadas = e.target.checked
                          ? [...atual, estrategia]
                          : atual.filter((e) => e !== estrategia);

                        setEntradaManual((prev) => ({
                          ...prev,
                          [meta.habilidade]: {
                            ...prev[meta.habilidade],
                            estrategias: atualizadas
                          }
                        }));
                      }}
                    />
                    <label htmlFor={`estrategia-${idx}-${i}`} style={{ marginLeft: "8px" }}>
                      {estrategia}
                    </label>
                  </div>
                ))}

                <label style={{ display: "block", marginTop: "10px" }}>
                  Estratégias personalizadas (uma por linha):
                </label>
                <textarea
                  value={entrada.estrategiasManuais || ""}
                  onChange={(e) =>
                    setEntradaManual((prev) => ({
                      ...prev,
                      [meta.habilidade]: {
                        ...prev[meta.habilidade],
                        estrategiasManuais: e.target.value
                      }
                    }))
                  }
                  style={estilos.textarea}
                />
              </fieldset>
            </article>
          );
        })}

        <button style={estilos.botaoSalvar} onClick={handleSalvar} disabled={carregando}>
          {carregando ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}

const estilos = {
  container: {
    background: "#1d3557",
    minHeight: "100vh",
    width: "100vw",
    padding: "30px"
  },
  card: {
    background: "#fff",
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "30px",
    borderRadius: "16px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
  },
  titulo: {
    textAlign: "center",
    color: "#1d3557",
    marginBottom: "25px"
  },
  metaCard: {
    background: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "15px",
    marginBottom: "15px"
  },
  textarea: {
    width: "100%",
    minHeight: "60px",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px"
  },
  botaoSalvar: {
    backgroundColor: "#2a9d8f",
    color: "#fff",
    padding: "14px 24px",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    display: "block",
    margin: "30px auto 0",
    cursor: "pointer"
  },
  botaoRemover: {
    backgroundColor: "#e63946",
    color: "#fff",
    padding: "6px 14px",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "10px"
  }
};

export default EditarPei;