import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

function VerAvaliacao() {
  const { aluno } = useParams();
  const navigate = useNavigate();

  const avaliacoes = JSON.parse(localStorage.getItem("avaliacoesIniciais")) || [];
  const avaliacao = avaliacoes.find((a) => a.aluno === aluno);

  if (!avaliacao) {
    return (
      <div style={{ padding: "30px", textAlign: "center", color: "#e63946" }}>
        Avaliação não encontrada.
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      background: "#1d3557",
      padding: "30px",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start"
    }}>
      <div style={{
        background: "#ffffff",
        maxWidth: "900px",
        width: "100%",
        borderRadius: "16px",
        padding: "40px",
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
          <BotaoVoltar />
          <button
            onClick={() => navigate("/ver-avaliacoes")}
            style={{
              backgroundColor: "#1d3557",
              color: "#fff",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Voltar
          </button>
        </div>

        <h2 style={{ textAlign: "center", color: "#1d3557", marginBottom: "30px" }}>
          Avaliação Inicial – Relatório Visual
        </h2>

        <div style={{ marginBottom: "30px", lineHeight: "1.8", fontSize: "16px", color: "#333" }}>
          <p><strong>Aluno:</strong> {avaliacao.aluno}</p>
          <p><strong>Idade:</strong> {avaliacao.idade} anos</p>
          <p><strong>Faixa Etária:</strong> {avaliacao.faixaEtaria}</p>
          <p><strong>Data da Avaliação:</strong> {avaliacao.data}</p>
        </div>

        {Object.keys(avaliacao.respostas).map((area, i) => (
          <div key={i} style={{ marginBottom: "40px" }}>
            <h3 style={{
              backgroundColor: "#1d3557",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: "8px",
              marginBottom: "10px"
            }}>
              {area.replaceAll("_", " ")}
            </h3>

            <ul style={{ paddingLeft: "20px", marginBottom: "10px", color: "#333" }}>
              {Object.entries(avaliacao.respostas[area])
                .filter(([_, checked]) => checked)
                .map(([habilidade], index) => (
                  <li key={index} style={{ marginBottom: "6px" }}>
                    {habilidade}
                  </li>
                ))}
            </ul>

            {avaliacao.observacoes[area] && (
              <div style={{
                backgroundColor: "#fffceb",
                borderLeft: "4px solid #f4a261",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "15px",
                color: "#333"
              }}>
                <strong>Observações:</strong> {avaliacao.observacoes[area]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VerAvaliacao;