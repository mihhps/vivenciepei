import React, { useEffect, useState } from "react";
import BotaoVoltar from "../components/BotaoVoltar";
import { useNavigate } from "react-router-dom";

function VerAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const dadosSalvos = JSON.parse(localStorage.getItem("avaliacoesIniciais")) || [];
    setAvaliacoes(dadosSalvos);
  }, []);

  const excluirAvaliacao = (aluno) => {
    const confirmar = window.confirm(`Deseja realmente excluir a avaliação de ${aluno}?`);
    if (!confirmar) return;

    const atualizadas = avaliacoes.filter((av) => av.aluno !== aluno);
    localStorage.setItem("avaliacoesIniciais", JSON.stringify(atualizadas));
    setAvaliacoes(atualizadas);
  };

  const editarAvaliacao = (avaliacao) => {
    localStorage.setItem("avaliacaoEmEdicao", JSON.stringify(avaliacao));
    navigate("/avaliacao-inicial");
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      background: "#1d3557",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      padding: "30px"
    }}>
      <div style={{
        background: "#fff",
        width: "100%",
        maxWidth: "1000px",
        borderRadius: "16px",
        padding: "30px",
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)"
      }}>
        <BotaoVoltar />
        <h2 style={{
          textAlign: "center",
          color: "#1d3557",
          marginBottom: "25px"
        }}>
          Avaliações Iniciais
        </h2>

        {avaliacoes.length === 0 ? (
          <p style={{ textAlign: "center", color: "#777" }}>Nenhuma avaliação encontrada.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
              <thead>
                <tr style={{ backgroundColor: "#1d3557", color: "#fff" }}>
                  <th style={thStyle}>Aluno</th>
                  <th style={thStyle}>Idade</th>
                  <th style={thStyle}>Faixa Etária</th>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {avaliacoes.map((av, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#fff" }}>
                    <td style={tdStyle}>{av.aluno}</td>
                    <td style={tdStyle}>{av.idade}</td>
                    <td style={tdStyle}>{av.faixaEtaria}</td>
                    <td style={tdStyle}>{av.data}</td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => navigate(`/avaliacao/${encodeURIComponent(av.aluno)}`)}
                          style={botaoVisualizar}
                        >
                          Visualizar
                        </button>
                        <button onClick={() => editarAvaliacao(av)} style={botaoEditar}>Editar</button>
                        <button onClick={() => excluirAvaliacao(av.aluno)} style={botaoExcluir}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: "12px",
  textAlign: "left"
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #ddd",
  textAlign: "left"
};

const botaoVisualizar = {
  padding: "6px 12px",
  backgroundColor: "#1d3557",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px"
};

const botaoEditar = {
  padding: "6px 12px",
  backgroundColor: "#457b9d",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px"
};

const botaoExcluir = {
  padding: "6px 12px",
  backgroundColor: "#e63946",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px"
};

export default VerAvaliacoes;