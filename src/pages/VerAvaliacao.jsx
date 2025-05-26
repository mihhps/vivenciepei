// src/pages/VerAvaliacao.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const NIVEL_CONFIG = {
  NR: { cor: "#e63946", descricao: "Necessita de recursos e apoio total" },
  AF: { cor: "#f1a208", descricao: "Apoio frequente" },
  AV: { cor: "#457b9d", descricao: "Apoio eventual" },
  AVi: { cor: "#2a9d8f", descricao: "Apoio visual ou lembrete" },
  I: { cor: "#2b9348", descricao: "Independente" },
  NA: { cor: "#adb5bd", descricao: "Não aplicável" }
};

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
    data.setDate(data.getDate() + 1);
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
    <div style={{ minHeight: "100vh", width:"100vw", background: "#f0f4f8", padding: "5px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", background: "#fff", borderRadius: "12px", padding: "30px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ color: "#1d3557", fontSize: "22px" }}>Resumo da Avaliação Inicial</h2>
          <button
            onClick={() => navigate("/ver-avaliacoes")}
            style={{ backgroundColor: "#1d3557", color: "#fff", padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}
          >
            Voltar
          </button>
        </div>

        <div style={{ marginBottom: "24px", fontSize: "15px", lineHeight: 1.6 }}>
          <p><strong>Aluno:</strong> {avaliacao.aluno}</p>
          <p><strong>Data da Avaliação:</strong> {formatarData(avaliacao.inicio || avaliacao.dataCriacao)}</p>
          {avaliacao.proximaAvaliacao && (
            <p><strong>Próxima Avaliação:</strong> {formatarData(avaliacao.proximaAvaliacao)}</p>
          )}
        </div>

        {Object.entries(avaliacao.respostas).map(([area, habilidades], i) => {
          const habilidadesFiltradas = Object.entries(habilidades).filter(([_, nivel]) => nivel !== "I" && nivel !== "NA");
          if (habilidadesFiltradas.length === 0) return null;

          return (
            <div key={i} style={{ marginBottom: "40px" }}>
              <h3 style={{ backgroundColor: "#1d3557", color: "#fff", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px" }}>{area}</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {habilidadesFiltradas.map(([habilidade, nivel], j) => {
                  const info = NIVEL_CONFIG[nivel];
                  return (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", backgroundColor: info?.cor || "#f1f1f1", borderRadius: "8px", color: "#000", fontWeight: "500" }}>
                      <span style={{ fontSize: "15px", flex: 1 }}>{habilidade}</span>
                      <span style={{ background: "#fff", color: info?.cor || "#000", padding: "4px 10px", borderRadius: "16px", fontSize: "13px", fontWeight: "bold" }}>{nivel}</span>
                    </div>
                  );
                })}
              </div>

              {avaliacao.observacoes[area] && (
                <div style={{ marginTop: "14px", backgroundColor: "#fffceb", padding: "12px", borderLeft: "4px solid #f4a261", borderRadius: "6px", fontSize: "14px", color: "#333" }}>
                  <strong>Observações:</strong> {avaliacao.observacoes[area]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VerAvaliacao;
