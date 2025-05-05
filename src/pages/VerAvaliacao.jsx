// src/pages/VerAvaliacao.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

function VerAvaliacao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [avaliacao, setAvaliacao] = useState(null);

  useEffect(() => {
    const carregarAvaliacao = async () => {
      try {
        const docRef = doc(db, "avaliacoesIniciais", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAvaliacao(docSnap.data());
        } else {
          setAvaliacao(null);
        }
      } catch (error) {
        console.error("Erro ao buscar avaliação:", error);
        setAvaliacao(null);
      }
    };

    carregarAvaliacao();
  }, [id]);

  const formatarData = (dataISO) => {
    if (!dataISO) return "-";
    const data = new Date(dataISO);
    return data.toLocaleDateString("pt-BR");
  };

  if (!avaliacao || !avaliacao.respostas || !avaliacao.observacoes) {
    return (
      <div style={{ padding: "30px", textAlign: "center", color: "#e63946" }}>
        Avaliação incompleta ou não encontrada.
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
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "30px" }}>
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
            Voltar à Lista
          </button>
        </div>

        <h2 style={{ textAlign: "center", color: "#1d3557", marginBottom: "30px" }}>
          Avaliação Inicial – Relatório Visual
        </h2>

        <div style={{ marginBottom: "30px", lineHeight: "1.8", fontSize: "16px", color: "#333" }}>
          <p><strong>Aluno:</strong> {avaliacao.aluno}</p>
          <p><strong>Data da Avaliação:</strong> {formatarData(avaliacao.dataCriacao)}</p>
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