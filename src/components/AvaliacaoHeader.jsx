import React from "react";
import BotaoVoltar from "./BotaoVoltar";
import { useNavigate } from "react-router-dom";

const AvaliacaoHeader = ({ destinoVoltar, onVerAvaliacoesClick, disabled }) => (
  <div className="avaliacao-header">
    <BotaoVoltar destino={destinoVoltar} />
    <h1 className="avaliacao-titulo">Avaliação Inicial Modular Completa</h1>
    <button
      onClick={onVerAvaliacoesClick}
      className="botao-ver-avaliacoes"
      disabled={disabled}
    >
      Ver Avaliações
    </button>
  </div>
);

export default AvaliacaoHeader;
