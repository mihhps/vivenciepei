// Localização Esperada: src/components/AreaPerguntas.jsx

import React, { useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { FaChevronDown } from "react-icons/fa";
import "../styles/NiveisDeAvaliacao.css";
// 1. NOVO: Importa a legenda fixa. Ajuste o caminho, se necessário.
import { legendaNiveis as legendaEstatica } from "../utils/legendaNiveis";

const AreaPerguntas = ({
  area,
  dados, // Array de habilidades
  respostas,
  observacoes,
  onResponder,
  onObservar,
  disabled,
}) => {
  const [subareasExpandidas, setSubareasExpandidas] = useState(() => {
    if (!dados || dados.length === 0) return [];
    const uniqueSubareas = [...new Set(dados.map((item) => item.subarea))];
    // Deixa apenas a primeira subárea expandida por padrão
    return uniqueSubareas.length > 0 ? [uniqueSubareas[0]] : [];
  });

  const [tooltipVisivel, setTooltipVisivel] = useState({
    habilidade: null,
    nivel: null,
  });

  const toggleSubarea = useCallback((subareaName) => {
    setSubareasExpandidas((prev) =>
      prev.includes(subareaName)
        ? prev.filter((name) => name !== subareaName)
        : [...prev, subareaName]
    );
  }, []);

  const habilidadesAgrupadas = useMemo(() => {
    if (!dados || dados.length === 0) return {};
    return dados.reduce((acc, item) => {
      if (!acc[item.subarea]) {
        acc[item.subarea] = [];
      }
      acc[item.subarea].push(item);
      return acc;
    }, {});
  }, [dados]);

  const handleMarcarAreaComoNA = useCallback(() => {
    if (disabled) return;
    if (
      window.confirm(
        `Tem certeza que deseja marcar TODAS as habilidades da área "${area}" como "NÃO APLICÁVEL" (NA)?`
      )
    ) {
      if (dados) {
        dados.forEach((habilidadeItem) => {
          if (habilidadeItem.habilidade) {
            onResponder(area, habilidadeItem.habilidade, "NA");
          }
        });
      }
    }
  }, [disabled, area, dados, onResponder]);

  const handleToggleTooltip = useCallback((habilidade, nivel) => {
    setTooltipVisivel((prev) =>
      prev.habilidade === habilidade && prev.nivel === nivel
        ? { habilidade: null, nivel: null }
        : { habilidade, nivel }
    );
  }, []);

  const areaPodeSerIgnorada = useMemo(() => {
    return [
      "Altas Habilidades",
      "Comunicação Alternativa e Não Verbal",
    ].includes(area);
  }, [area]);

  // 2. Lógica de geração dinâmica da legenda FOI REMOVIDA.
  //    Agora usamos a constante 'legendaEstatica' importada.

  // Se não houver dados, não renderiza nada
  if (!dados || dados.length === 0) {
    return null;
  }

  return (
    <div className="area-perguntas-wrapper" aria-disabled={disabled}>
      <div className="area-header-with-button">
        <h3 className="area-titulo">{area}</h3>
        {areaPodeSerIgnorada && (
          <button
            onClick={handleMarcarAreaComoNA}
            className="marcar-na-area-btn"
            disabled={disabled}
          >
            Marcar área como NA
          </button>
        )}
      </div>

      {Object.entries(habilidadesAgrupadas).map(
        ([subareaName, habilidadesNaSubarea], subareaIndex) => (
          <div key={subareaName} className="accordion-item">
            <button
              className={`accordion-header ${
                subareasExpandidas.includes(subareaName) ? "expanded" : ""
              }`}
              onClick={() => toggleSubarea(subareaName)}
              disabled={disabled}
              aria-expanded={subareasExpandidas.includes(subareaName)}
              aria-controls={`subarea-content-${subareaIndex}`}
            >
              <h4 className="accordion-title">{subareaName}</h4>
              <FaChevronDown className="accordion-icon" />
            </button>
            {subareasExpandidas.includes(subareaName) && (
              <div
                id={`subarea-content-${subareaIndex}`}
                className="accordion-content open"
              >
                {habilidadesNaSubarea.map((pergunta) => {
                  const habilidade = pergunta?.habilidade?.trim();
                  if (!habilidade) {
                    return null;
                  }
                  return (
                    <div key={habilidade} className="linha-habilidade">
                      <div className="texto-habilidade">{habilidade}</div>
                      <div className="niveis-habilidade">
                        {Object.entries(pergunta.niveis).map(
                          ([nivel, descricao]) => (
                            <div
                              key={nivel}
                              className={`circulo-nivel ${nivel} ${
                                respostas && respostas[habilidade] === nivel
                                  ? "ativo"
                                  : ""
                              }`}
                              onClick={() => {
                                if (!disabled) {
                                  onResponder(area, habilidade, nivel);
                                  handleToggleTooltip(habilidade, nivel);
                                }
                              }}
                              onMouseLeave={() =>
                                setTooltipVisivel({
                                  habilidade: null,
                                  nivel: null,
                                })
                              }
                              aria-label={`Marcar ${habilidade} como ${descricao}`}
                              role="radio"
                              aria-checked={
                                respostas && respostas[habilidade] === nivel
                              }
                              tabIndex={disabled ? -1 : 0}
                              onKeyPress={(e) => {
                                if (
                                  !disabled &&
                                  (e.key === "Enter" || e.key === " ")
                                ) {
                                  e.preventDefault();
                                  onResponder(area, habilidade, nivel);
                                  handleToggleTooltip(habilidade, nivel);
                                }
                              }}
                              style={{
                                pointerEvents: disabled ? "none" : "auto",
                              }}
                            >
                              {nivel}
                              {/* O TOOLTIP continua mostrando a descrição detalhada da habilidade (vindo do 'dados') */}
                              {tooltipVisivel.habilidade === habilidade &&
                                tooltipVisivel.nivel === nivel && (
                                  <div className="tooltip-texto">
                                    {descricao}
                                  </div>
                                )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      <div className="observacoes-area">
        <label htmlFor={`observacoes-${area}`}>
          <strong>Observações sobre "{area}":</strong>
        </label>
        <textarea
          id={`observacoes-${area}`}
          value={observacoes || ""}
          onChange={(e) => onObservar(area, e.target.value)}
          disabled={disabled}
        />
      </div>

      {/* 3. CORREÇÃO: Renderização da legenda usando a constante estática 'legendaEstatica' */}
      <div className="legenda-niveis">
        <strong>Legenda:</strong>
        <ul>
          {Object.entries(legendaEstatica).map(([sigla, descricao]) => (
            <li key={sigla}>
              <div
                className={`circulo-nivel ${sigla}`}
                style={{ width: "20px", height: "20px" }}
              >
                {sigla}
              </div>
              <span>{descricao}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

AreaPerguntas.propTypes = {
  area: PropTypes.string.isRequired,
  dados: PropTypes.arrayOf(
    PropTypes.shape({
      habilidade: PropTypes.string.isRequired,
      subarea: PropTypes.string.isRequired,
      niveis: PropTypes.object.isRequired,
    })
  ).isRequired,
  respostas: PropTypes.object,
  observacoes: PropTypes.string,
  onResponder: PropTypes.func.isRequired,
  onObservar: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default AreaPerguntas;
