// src/components/AreaPerguntas.jsx
import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { legendaNiveis } from "../data/avaliacaoInicialData";
import "../styles/NiveisDeAvaliacao.css";
import { FaChevronDown } from "react-icons/fa"; // Importe o ícone de seta

const niveis = ["NR", "AF", "AG", "AV", "AVi", "I", "NA"];

const AreaPerguntas = ({
  area,
  dados,
  respostas,
  observacoes,
  onResponder,
  onObservar,
  disabled,
}) => {
  const [subareasExpandidas, setSubareasExpandidas] = useState(() => {
    // Inicia com todas as subáreas abertas por padrão para facilitar a visualização inicial
    const uniqueSubareas = [...new Set(dados.map((item) => item.subarea))];
    return uniqueSubareas;
  });

  const toggleSubarea = (subareaName) => {
    setSubareasExpandidas((prev) =>
      prev.includes(subareaName)
        ? prev.filter((name) => name !== subareaName)
        : [...prev, subareaName]
    );
  };

  const habilidadesAgrupadas = useMemo(() => {
    return dados.reduce((acc, item) => {
      if (!acc[item.subarea]) {
        acc[item.subarea] = [];
      }
      acc[item.subarea].push(item);
      return acc;
    }, {});
  }, [dados]);

  // Função para marcar todas as habilidades da área como "NA"
  const handleMarcarAreaComoNA = () => {
    if (disabled) return;

    if (
      window.confirm(
        `Tem certeza que deseja marcar TODAS as habilidades da área "${area}" como "NÃO APLICÁVEL" (NA)?`
      )
    ) {
      // Chama onResponder para cada habilidade, atualizando o estado no componente pai
      dados.forEach((habilidadeItem) => {
        if (habilidadeItem.habilidade) {
          onResponder(area, habilidadeItem.habilidade, "NA");
        }
      });
      // Opcional: pode colapsar as subáreas após marcar como NA
      // setSubareasExpandidas([]);
    }
  };

  // Verifica se a área é uma daquelas que podem ter o botão "NA"
  const areaPodeSerIgnorada = [
    "Altas Habilidades",
    "Comunicação Alternativa e Não Verbal",
  ].includes(area);

  return (
    <div className="area-perguntas-wrapper" aria-disabled={disabled}>
      <div className="area-header-with-button">
        {" "}
        {/* Novo container para título e botão */}
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

            <div
              id={`subarea-content-${subareaIndex}`}
              className={`accordion-content ${
                subareasExpandidas.includes(subareaName) ? "open" : ""
              }`}
              style={{
                maxHeight: subareasExpandidas.includes(subareaName)
                  ? "1000px"
                  : "0",
              }}
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
                      {niveis.map((nivel) => (
                        <div
                          key={nivel}
                          className={`circulo-nivel ${nivel} ${
                            respostas && respostas[habilidade] === nivel
                              ? "ativo"
                              : ""
                          }`}
                          onClick={
                            !disabled
                              ? () => onResponder(area, habilidade, nivel)
                              : undefined
                          }
                          aria-label={`Marcar ${habilidade} como ${legendaNiveis[nivel]}`}
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
                            }
                          }}
                          style={{ pointerEvents: disabled ? "none" : "auto" }}
                        >
                          {nivel}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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

      <div className="legenda-niveis">
        <strong>Legenda:</strong>
        <ul>
          {Object.entries(legendaNiveis).map(([sigla, descricao]) => (
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
    })
  ).isRequired,
  respostas: PropTypes.object,
  observacoes: PropTypes.string,
  onResponder: PropTypes.func.isRequired,
  onObservar: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default AreaPerguntas;
