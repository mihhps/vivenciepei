import React from "react";

function SelecaoAluno({ alunos, alunoSelecionado, onSelecionar, editando }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label><strong>Selecione o aluno:</strong></label>
      <select
        value={alunoSelecionado}
        onChange={onSelecionar}
        disabled={editando}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          marginTop: "8px",
          backgroundColor: editando ? "#e0e0e0" : "white"
        }}
      >
        <option value="">-- Escolher --</option>
        {alunos.map((aluno) => (
          <option key={aluno.nome} value={aluno.nome}>{aluno.nome}</option>
        ))}
      </select>
    </div>
  );
}

export default SelecaoAluno;