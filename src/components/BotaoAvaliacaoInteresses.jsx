// BotaoNavegacao.jsx (Nome mais genérico)
import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const StyledButton = styled.button`
  /* Seus estilos permanecem os mesmos */
  background-color: #28a745;
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
  margin-top: 20px;
  margin-bottom: 20px;

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

// O componente agora aceita 'to' e 'children' como props
function BotaoNavegacao({ to, children, disabled }) {
  const navigate = useNavigate();

  const handleClick = () => {
    // A navegação agora usa a prop 'to'
    if (to) {
      navigate(to);
    }
  };

  return (
    // O conteúdo do botão vem da prop 'children'
    // A prop 'disabled' é passada diretamente para o botão
    <StyledButton onClick={handleClick} disabled={disabled}>
      {children}
    </StyledButton>
  );
}

export default BotaoNavegacao;
