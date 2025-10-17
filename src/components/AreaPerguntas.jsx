// Localização Esperada: src/components/AreaPerguntas.jsx

import React, { useState, useMemo, useCallback, useRef } from "react"; // <-- NOVO: useRef
import PropTypes from "prop-types";
import { FaChevronDown } from "react-icons/fa";
import "../styles/NiveisDeAvaliacao.css";
// Ajuste o caminho para sua legenda
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

  // ESTADO DO TOOLTIP: Gerencia dados e posição (para position: fixed)
  const [tooltipData, setTooltipData] = useState({
    habilidade: null,
    nivel: null,
    descricao: null,
    style: {}, // Armazena top e left fixos
  });

  // NOVO: Ref para armazenar o ID do temporizador de esconder
  const hideTimeoutRef = useRef(null);

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

  // MUDANÇA: Função de mouse enter para CALCULAR E MOSTRAR
  const handleMouseEnter = useCallback(
    (e, habilidade, nivel, descricao) => {
      // 1. Se houver um temporizador para esconder, cancelamos ele!
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      // Não mostrar se já estiver visível no mesmo lugar
      if (
        tooltipData.habilidade === habilidade &&
        tooltipData.nivel === nivel
      ) {
        return;
      }

      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const tooltipWidth = 200;
      const verticalOffset = 90; // Ajuste vertical: Altura da caixa + seta + margem (MANTIDO)

      // 1. Calcula a posição LEFT para centralizar sobre o círculo
      const left = rect.left + rect.width / 2 - tooltipWidth / 2;

      // 2. Calcula a posição TOP
      const top = rect.top - verticalOffset;

      // 3. Define os novos dados do tooltip com o estilo fixed
      setTooltipData({
        habilidade,
        nivel,
        descricao,
        style: {
          position: "fixed",
          top: `${top}px`,
          left: `${left}px`,
        },
      });
    },
    [tooltipData]
  );

  // MUDANÇA: Função de mouse leave para INICIAR O TEMPORIZADOR DE ESCONDER
  const handleMouseLeave = useCallback(() => {
    // 1. Limpa qualquer temporizador anterior
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // 2. Inicia um novo temporizador para esconder após 100ms
    // Se o mouse entrar em outro botão nesse período, o timer será cancelado em handleMouseEnter.
    hideTimeoutRef.current = setTimeout(() => {
      setTooltipData({
        habilidade: null,
        nivel: null,
        descricao: null,
        style: {},
      });
      hideTimeoutRef.current = null;
    }, 100); // Atraso de 100ms
  }, []);

  const handleCircleClick = useCallback((habilidade, nivel) => {
    // Esconde o tooltip ao clicar (e cancela qualquer temporizador de esconder)
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setTooltipData({
      habilidade: null,
      nivel: null,
      descricao: null,
      style: {},
    });
  }, []);

  const areaPodeSerIgnorada = useMemo(() => {
    return [
      "Altas Habilidades",
      "Comunicação Alternativa e Não Verbal",
    ].includes(area);
  }, [area]);

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
                {/* === WRAPPER DE ROLAGEM MANTIDO AQUI === */}
                <div className="habilidades-scroll-wrapper">
                  {habilidadesNaSubarea.map((pergunta) => {
                    const habilidade = pergunta?.habilidade?.trim();
                    // Lógica de TÍTULO/SEPARADOR: verifica se a habilidade tem a propriedade 'niveis'
                    const isAvaliavel =
                      pergunta.niveis &&
                      Object.keys(pergunta.niveis).length > 0;

                    if (!habilidade) {
                      return null;
                    }

                    // 1. Renderiza como TÍTULO/SEPARADOR se NÃO for avaliável
                    if (!isAvaliavel) {
                      return (
                        <h5
                          key={habilidade}
                          className="subarea-separador"
                          style={{
                            // Estilos inline para garantir que o separador se destaque corretamente
                            marginTop: "20px",
                            marginBottom: "5px",
                            color: "#1d3557",
                            fontWeight: "700",
                            fontSize: "15.5px",
                          }}
                        >
                          {habilidade}
                        </h5>
                      );
                    }

                    // 2. Renderiza como LINHA AVALIÁVEL (com os círculos)
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
                                    handleCircleClick(habilidade, nivel);
                                  }
                                }}
                                // MUDANÇA: Usa as novas funções de mouse
                                onMouseEnter={(e) =>
                                  handleMouseEnter(
                                    e,
                                    habilidade,
                                    nivel,
                                    descricao
                                  )
                                }
                                onMouseLeave={handleMouseLeave}
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
                                    handleCircleClick(habilidade, nivel);
                                  }
                                }}
                                style={{
                                  pointerEvents: disabled ? "none" : "auto",
                                }}
                              >
                                {nivel}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* === RENDERIZAÇÃO CENTRALIZADA DO TOOLTIP FORA DO FLUXO DO DOM === */}
      {tooltipData.habilidade && tooltipData.nivel && (
        <div className="tooltip-texto" style={tooltipData.style}>
          {tooltipData.descricao}
        </div>
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

      {/* 3. Renderização da legenda usando a constante estática 'legendaEstatica' */}
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
      niveis: PropTypes.object, // Tornamos 'niveis' opcional para aceitar títulos
    })
  ).isRequired,
  respostas: PropTypes.object,
  observacoes: PropTypes.string,
  onResponder: PropTypes.func.isRequired,
  onObservar: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default AreaPerguntas;
