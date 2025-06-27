// src/components/PEIMetaCard.jsx

import React from "react";
import PropTypes from "prop-types";
import { LEGENDA_NIVEIS } from "../utils/constants"; // Importa do arquivo de constantes

export default function PEIMetaCard({
  meta,
  areaAtiva,
  entradaManual,
  setEntradaManual,
}) {
  if (!meta || typeof meta !== "object" || !meta.habilidade) {
    return null;
  }

  const chaveEntradaManual = `${areaAtiva}-${meta.habilidade.replace(/[^a-zA-Z0-9-]/g, "")}`;
  const dadosManuais = entradaManual[chaveEntradaManual] || {};

  const estrategiasSugeridasDisponiveis = Array.isArray(
    meta.sugestoesEstrategias
  )
    ? meta.sugestoesEstrategias
    : [];

  const handleCheckboxChange = (estrategia, isChecked) => {
    setEntradaManual((prev) => {
      const currentEstrategias = new Set(
        prev[chaveEntradaManual]?.estrategias || []
      );
      if (isChecked) {
        currentEstrategias.add(estrategia);
      } else {
        currentEstrategias.delete(estrategia);
      }
      return {
        ...prev,
        [chaveEntradaManual]: {
          ...prev[chaveEntradaManual],
          estrategias: Array.from(currentEstrategias),
          estrategiasManuais: dadosManuais.estrategiasManuais || "",
        },
      };
    });
  };

  const handleManualTextChange = (e) => {
    setEntradaManual((prev) => ({
      ...prev,
      [chaveEntradaManual]: {
        ...prev[chaveEntradaManual],
        estrategiasManuais: e.target.value,
        estrategias: dadosManuais.estrategias || [],
      },
    }));
  };

  return (
    <article
      className="meta-card"
      aria-labelledby={`meta-${chaveEntradaManual}-habilidade`}
    >
      <h3 id={`meta-${chaveEntradaManual}-habilidade`}>{meta.habilidade}</h3>
      <p>
        <strong>Nível avaliado:</strong> {meta.nivel} —{" "}
        {LEGENDA_NIVEIS[meta.nivel]}
      </p>
      <p>
        <strong>Nível almejado:</strong> {meta.nivelAlmejado} —{" "}
        {LEGENDA_NIVEIS[meta.nivelAlmejado]}
      </p>

      <div>
        <p className="form-label">
          Objetivo sugerido ({LEGENDA_NIVEIS[meta.nivelAlmejado]}):
        </p>
        <p className="meta-objective">{meta.objetivo}</p>
      </div>

      <fieldset className="meta-fieldset">
        <legend>Estratégias:</legend>

        {estrategiasSugeridasDisponiveis.length > 0 ? (
          estrategiasSugeridasDisponiveis.map((estrategia, i) => (
            <div
              key={`sug-${chaveEntradaManual}-${i}`}
              className="checkbox-container"
            >
              <input
                type="checkbox"
                id={`estrategia-${chaveEntradaManual}-${i}`}
                className="custom-checkbox-input"
                checked={(dadosManuais.estrategias || []).includes(estrategia)}
                onChange={(e) =>
                  handleCheckboxChange(estrategia, e.target.checked)
                }
              />
              <label
                htmlFor={`estrategia-${chaveEntradaManual}-${i}`}
                className="custom-checkbox-label"
              >
                {estrategia}
              </label>
            </div>
          ))
        ) : (
          <p className="info-text">
            Nenhuma estratégia sugerida para este nível. Adicione uma
            personalizada abaixo.
          </p>
        )}

        <label
          htmlFor={`estrategias-manuais-${chaveEntradaManual}`}
          className="form-label"
        >
          Estratégias personalizadas (uma por linha):
        </label>
        <textarea
          id={`estrategias-manuais-${chaveEntradaManual}`}
          className="textarea-form"
          value={dadosManuais.estrategiasManuais || ""}
          onChange={handleManualTextChange}
          placeholder="Adicione novas estratégias aqui, uma por linha..."
          rows="3"
        />
      </fieldset>
    </article>
  );
}

PEIMetaCard.propTypes = {
  meta: PropTypes.shape({
    habilidade: PropTypes.string.isRequired,
    nivel: PropTypes.string.isRequired,
    nivelAlmejado: PropTypes.string.isRequired,
    objetivo: PropTypes.string.isRequired,
    sugestoesEstrategias: PropTypes.arrayOf(PropTypes.string), // Adicione este propType
  }).isRequired,
  areaAtiva: PropTypes.string.isRequired,
  entradaManual: PropTypes.object.isRequired,
  setEntradaManual: PropTypes.func.isRequired,
};
