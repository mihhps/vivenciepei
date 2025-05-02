import React from "react";
import { useNavigate } from "react-router-dom";

function BotaoSalvar({ aluno, idade, faixa, respostas, observacoes, editando }) {
  const navigate = useNavigate();

  const salvar = () => {
    if (!aluno || !faixa || !idade) {
      alert("Preencha todas as informações antes de salvar.");
      return;
    }

    const novaAvaliacao = {
      aluno,
      idade,
      faixaEtaria: faixa,
      respostas,
      observacoes,
      data: new Date().toLocaleDateString("pt-BR"),
    };

    let avaliacoes = JSON.parse(localStorage.getItem("avaliacoesIniciais")) || [];
    avaliacoes = avaliacoes.filter((a) => a.aluno !== aluno);
    avaliacoes.push(novaAvaliacao);
    localStorage.setItem("avaliacoesIniciais", JSON.stringify(avaliacoes));

    alert(editando ? "Avaliação atualizada!" : "Avaliação salva!");
    navigate("/ver-avaliacoes");
  };

  return (
    <div style={{ marginTop: "50px", textAlign: "center" }}>
      <button
        onClick={salvar}
        style={{
          padding: "16px 32px",
          borderRadius: "8px",
          backgroundColor: "#1d3557",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "17px",
          border: "none",
          cursor: "pointer",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)"
        }}
      >
        Salvar Avaliação
      </button>
    </div>
  );
}

export default BotaoSalvar;