import React from "react";
import styled from "styled-components";
import { FaChevronDown } from "react-icons/fa";

// --- 1. Componentes Estilizados ---

const SelectWrapper = styled.div`
  position: relative;
  margin-top: 8px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ddd;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08); /* Sombra mais visível e moderna */
  transition: all 0.3s ease;

  /* Efeito de foco/hover moderno */
  &:hover {
    border-color: #457b9d; /* Borda azul ao passar o mouse */
    box-shadow: 0 0 0 3px rgba(69, 123, 157, 0.2); /* Sombra de foco sutil */
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  /* Padding extra à direita para o ícone */
  padding: 12px 40px 12px 15px;

  border: none; /* Remove a borda nativa */
  background-color: ${(props) =>
    props.disabled
      ? "#f0f0f0"
      : "white"}; /* Cor de fundo branca, cinza se desabilitado */
  color: #333;
  font-size: 1em;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  outline: none;

  /* CRUCIAL: Remove a aparência nativa do navegador */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  /* Estiliza o placeholder/opção padrão */
  option[value=""] {
    color: #999;
  }
`;

const DropdownIcon = styled(FaChevronDown)`
  position: absolute;
  top: 50%;
  right: 15px;
  transform: translateY(-50%);
  pointer-events: none;
  color: ${(props) =>
    props.$disabled ? "#999" : "#457b9d"}; /* Cor do ícone azul */
  font-size: 0.9em;
  transition: color 0.3s ease;
`;

const Label = styled.label`
  font-size: 0.95em;
  color: #4a5568;
  font-weight: 600;
  display: block;
`;

// --- 2. Componente Principal ---

function SelecaoAluno({ alunos, alunoSelecionado, onSelecionar, disabled }) {
  return (
    <div style={{ marginBottom: "25px" }}>
      <Label>Selecione o aluno:</Label>

      <SelectWrapper>
        <StyledSelect
          value={alunoSelecionado}
          onChange={onSelecionar}
          disabled={disabled}
        >
          <option value="" disabled hidden>
            -- Escolher --
          </option>
          {alunos.map((aluno) => (
            // A chave deve ser única (ID), mas o valor é o nome
            <option key={aluno.nome} value={aluno.nome}>
              {aluno.nome}
            </option>
          ))}
        </StyledSelect>

        {/* Usamos $disabled para passar a prop para o styled-component e evitar warnings do DOM */}
        <DropdownIcon $disabled={disabled} />
      </SelectWrapper>
    </div>
  );
}

export default SelecaoAluno;
