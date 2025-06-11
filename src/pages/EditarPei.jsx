// Cole isto em EditarPei.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import "../styles/EditarPei.css";

const LEGENDA_NIVEIS = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
};

const normalizarEstrategias = (estrategias) => {
  if (Array.isArray(estrategias)) return estrategias;
  if (typeof estrategias === "string" && estrategias) return [estrategias];
  return [];
};

function EditarPei() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pei, setPei] = useState(null);
  const [atividadeAplicada, setAtividadeAplicada] = useState("");
  const [entradaManual, setEntradaManual] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarPei = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const ref = doc(db, "peis", id);
      const docSnap = await getDoc(ref);
      if (!docSnap.exists()) {
        setErro("PEI não encontrado.");
        return;
      }
      const dados = docSnap.data();
      const resumoPeiNormalizado = (dados.resumoPEI || []).map((meta) => ({
        ...meta,
        estrategias: normalizarEstrategias(meta.estrategias),
      }));
      setPei({ id, ...dados, resumoPEI: resumoPeiNormalizado });
      setAtividadeAplicada(dados.atividadeAplicada || "");
      const entradaInicial = {};
      resumoPeiNormalizado.forEach((meta) => {
        entradaInicial[meta.habilidade] = {
          estrategias: meta.estrategias,
          estrategiasManuais: "",
        };
      });
      setEntradaManual(entradaInicial);
    } catch (error) {
      console.error("Erro ao carregar PEI:", error);
      setErro("Erro ao carregar dados do PEI. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      carregarPei();
    } else {
      setErro("ID do PEI não fornecido.");
      setCarregando(false);
    }
  }, [id, carregarPei]);

  const handleSalvar = async () => {
    if (!pei) return alert("Não há dados do PEI para salvar.");
    setCarregando(true);
    setErro(null);
    try {
      const resumoAtualizado = pei.resumoPEI.map((meta) => {
        const entrada = entradaManual[meta.habilidade] || {};
        const estrategiasSelecionadas = entrada.estrategias || [];
        const estrategiasManuaisNovas = (entrada.estrategiasManuais || "")
          .split("\n")
          .map((e) => e.trim())
          .filter(Boolean);
        const todasEstrategias = [
          ...new Set([...estrategiasSelecionadas, ...estrategiasManuaisNovas]),
        ];
        return { ...meta, estrategias: todasEstrategias };
      });
      await updateDoc(doc(db, "peis", id), {
        resumoPEI: resumoAtualizado,
        atividadeAplicada: atividadeAplicada,
      });
      alert("PEI atualizado com sucesso!");
      navigate("/ver-peis");
    } catch (error) {
      console.error("Erro ao salvar PEI:", error);
      setErro("Erro ao salvar o PEI. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const handleRemoverMeta = (habilidadeMetaRemover) => {
    if (
      window.confirm(
        `Tem certeza que deseja remover a meta "${habilidadeMetaRemover}"?`
      )
    ) {
      setPei((prevPei) => {
        if (!prevPei) return null;
        const novaListaMetas = prevPei.resumoPEI.filter(
          (meta) => meta.habilidade !== habilidadeMetaRemover
        );
        return { ...prevPei, resumoPEI: novaListaMetas };
      });
      setEntradaManual((prevEntrada) => {
        const { [habilidadeMetaRemover]: _, ...novaEntradaManual } =
          prevEntrada;
        return novaEntradaManual;
      });
    }
  };

  const handleCheckboxChange = (habilidade, estrategia, estaMarcado) => {
    setEntradaManual((prev) => {
      const estrategiasAtuais = prev[habilidade]?.estrategias || [];
      const novasEstrategias = estaMarcado
        ? [...estrategiasAtuais, estrategia]
        : estrategiasAtuais.filter((est) => est !== estrategia);
      return {
        ...prev,
        [habilidade]: { ...prev[habilidade], estrategias: novasEstrategias },
      };
    });
  };

  if (carregando)
    return (
      <div className="estado-container">
        <p>Carregando...</p>
      </div>
    );
  if (erro)
    return (
      <div className="estado-container">
        <p className="mensagem-erro">{erro}</p>
        <BotaoVoltar />
      </div>
    );
  if (!pei)
    return (
      <div className="estado-container">
        <p>Nenhum PEI carregado.</p>
        <BotaoVoltar />
      </div>
    );

  return (
    <div className="editar-pei-fundo">
      <div className="editar-pei-card">
        <BotaoVoltar />
        <h2 className="editar-pei-titulo">
          Editar PEI: {pei.aluno || "Aluno não identificado"}
        </h2>

        {(pei.resumoPEI || []).map((meta) => {
          const entrada = entradaManual[meta.habilidade] || {
            estrategias: [],
            estrategiasManuais: "",
          };
          return (
            <article key={meta.habilidade} className="meta-card">
              <div className="meta-header">
                <h3 className="meta-card-titulo">{meta.habilidade}</h3>
                <button
                  onClick={() => handleRemoverMeta(meta.habilidade)}
                  className="botao-remover"
                  disabled={carregando}
                >
                  Remover
                </button>
              </div>
              <p>
                <strong>Nível atual:</strong> {meta.nivel} —{" "}
                {LEGENDA_NIVEIS[meta.nivel] || meta.nivel}
              </p>
              <p>
                <strong>Nível almejado:</strong> {meta.nivelAlmejado} —{" "}
                {LEGENDA_NIVEIS[meta.nivelAlmejado] || meta.nivelAlmejado}
              </p>
              <p>
                <strong>Objetivo:</strong> {meta.objetivo}
              </p>

              <fieldset className="meta-fieldset">
                <legend className="meta-legend">Estratégias:</legend>
                {normalizarEstrategias(meta.estrategias).map(
                  (estrategia, i) => (
                    <div
                      key={`${estrategia}-${i}`}
                      className="checkbox-container"
                    >
                      <input
                        type="checkbox"
                        id={`estrategia-${meta.habilidade}-${i}`}
                        checked={entrada.estrategias.includes(estrategia)}
                        disabled={carregando}
                        onChange={(e) =>
                          handleCheckboxChange(
                            meta.habilidade,
                            estrategia,
                            e.target.checked
                          )
                        }
                        className="checkbox-input"
                      />
                      <label
                        htmlFor={`estrategia-${meta.habilidade}-${i}`}
                        className="checkbox-label"
                      >
                        {estrategia}
                      </label>
                    </div>
                  )
                )}
                <label
                  htmlFor={`estrategias-manuais-${meta.habilidade}`}
                  className="label-estrategias-manuais"
                >
                  Adicionar estratégias personalizadas (uma por linha):
                </label>
                <textarea
                  id={`estrategias-manuais-${meta.habilidade}`}
                  value={entrada.estrategiasManuais || ""}
                  disabled={carregando}
                  onChange={(e) =>
                    setEntradaManual((prev) => ({
                      ...prev,
                      [meta.habilidade]: {
                        ...prev[meta.habilidade],
                        estrategiasManuais: e.target.value,
                      },
                    }))
                  }
                  className="textarea-pei"
                  rows={3}
                />
              </fieldset>
            </article>
          );
        })}

        <article className="meta-card">
          <h3 className="meta-card-titulo">Atividade Aplicada</h3>
          <label
            htmlFor="atividade-aplicada"
            className="label-estrategias-manuais"
          >
            Descreva a atividade que foi aplicada com o aluno:
          </label>
          <textarea
            id="atividade-aplicada"
            value={atividadeAplicada}
            onChange={(e) => setAtividadeAplicada(e.target.value)}
            className="textarea-pei"
            rows={4}
            placeholder="Ex: Brincadeira simbólica usando fantoches..."
          />
        </article>

        <button
          className="botao-salvar"
          onClick={handleSalvar}
          disabled={carregando || !pei}
        >
          {carregando ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}

export default EditarPei;
