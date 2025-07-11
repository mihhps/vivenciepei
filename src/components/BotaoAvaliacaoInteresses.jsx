import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const StyledButton = styled.button`
  background-color: #28a745; /* Verde para ação principal */
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  margin-top: 20px; /* Espaçamento */
  margin-bottom: 20px; /* Adicionado para espaçamento inferior */

  &:hover {
    background-color: #218838;
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    box-shadow: none;
    transform: translateY(0);
  }
`;

function BotaoAvaliacaoInteresses() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/selecionar-aluno-para-interesses");
  };

  return (
    <StyledButton onClick={handleClick}>
      Iniciar Avaliação de Interesses
    </StyledButton>
  );
}

export default BotaoAvaliacaoInteresses;
