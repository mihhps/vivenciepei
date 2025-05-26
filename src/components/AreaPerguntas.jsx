import React from 'react';
import PropTypes from 'prop-types';
import { legendaNiveis } from '../data/avaliacaoInicialData';
import '../styles/AvaliacaoInicial.css'; // Importa o CSS das bolinhas

const niveis = ["NR", "AF", "AG", "AV", "AVi", "I", "NA"];

const AreaPerguntas = ({ area, dados, respostas, observacoes, onResponder, onObservar }) => {
  return (
    <div style={{ marginBottom: "40px" }}>
      <h3>{area}</h3>

      {dados.map((pergunta, index) => {
        const habilidade = pergunta?.habilidade?.trim() || `habilidade_${index}`;
        const subarea = pergunta?.subarea?.trim() || `subarea_${index}`;

        return (
          <div key={index} className="linha-habilidade">
            <div className="texto-habilidade">
              <strong>{subarea}:</strong> {habilidade}
            </div>

            <div className="niveis-habilidade">
              {niveis.map((nivel) => (
                <div
                  key={nivel}
                  className={`circulo-nivel ${nivel} ${
                    respostas?.[habilidade] === nivel ? "ativo" : ""
                  }`}
                  onClick={() => onResponder(area, habilidade, nivel)}
                >
                  {nivel}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: "20px" }}>
        <label><strong>Observações sobre "{area}":</strong></label>
        <textarea
          style={{ width: "100%", minHeight: "80px", marginTop: "6px" }}
          value={observacoes?.[area] || ""}
          onChange={(e) => onObservar(area, e.target.value)}
        />
      </div>

      <div style={{
        background: "#f9f9f9",
        padding: "12px",
        borderRadius: "8px",
        marginTop: "25px",
        fontSize: "13px"
      }}>
        <strong>Legenda:</strong>
        <ul style={{ paddingLeft: "20px", marginTop: "10px" }}>
          {Object.entries(legendaNiveis).map(([sigla, descricao]) => (
            <li key={sigla} style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
              <div className={`circulo-nivel ${sigla}`} style={{ width: "20px", height: "20px" }}>{sigla}</div>
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
      habilidade: PropTypes.string,
      subarea: PropTypes.string
    })
  ).isRequired,
  respostas: PropTypes.object,
  observacoes: PropTypes.object,
  onResponder: PropTypes.func.isRequired,
  onObservar: PropTypes.func.isRequired
};

export default AreaPerguntas;
