import React from "react";
import { useNavigate } from "react-router-dom";

export default function BotaoSalvar({
  aluno,
  idade,
  faixa,
  turma, // novo campo adicionado
  respostas,
  observacoes,
  editando,
}) {
  const navigate = useNavigate();

  const handleSalvar = () => {
    if (!aluno || !faixa || !idade || !respostas) {
      alert("Preencha todos os campos antes de salvar.");
      return;
    }

    const novaAvaliacao = {
      aluno,
      idade,
      faixa,
      turma, // turma será salva junto
      respostas,
      observacoes,
      data: new Date().toISOString(),
    };

    const dadosSalvos =
      JSON.parse(localStorage.getItem("avaliacoesIniciais")) || [];

    let atualizados;
    if (editando) {
      atualizados = dadosSalvos.map((item) =>
        item.aluno === aluno ? novaAvaliacao : item
      );
    } else {
      atualizados = [...dadosSalvos, novaAvaliacao];
    }

    alert("Avaliação salva com sucesso!");
    navigate("/ver-avaliacoes");
  };

  return (
    <div style={{ marginTop: "30px", textAlign: "center" }}>
      <button
        onClick={handleSalvar}
        style={{
          padding: "12px 28px",
          backgroundColor: "#1d3557",
          color: "white",
          fontSize: "16px",
          fontWeight: "bold",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Salvar Avaliação
      </button>
    </div>
  );
}
