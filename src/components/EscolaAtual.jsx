// src/components/EscolaAtual.jsx
import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function EscolaAtual() {
  const [nomeEscola, setNomeEscola] = useState("");

  const carregarNomeEscola = async () => {
    const escolaAtivaId = localStorage.getItem("escolaAtiva");
    if (!escolaAtivaId) {
      setNomeEscola("Nenhuma escola selecionada");
      return;
    }

    try {
      const ref = doc(db, "escolas", escolaAtivaId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const dados = snap.data();
        setNomeEscola(dados.nome || "Escola desconhecida");
      } else {
        setNomeEscola("Escola não encontrada");
      }
    } catch (error) {
      console.error("Erro ao buscar escola ativa:", error);
      setNomeEscola("Erro ao carregar escola");
    }
  };

  useEffect(() => {
    carregarNomeEscola();

    // Verifica mudanças no localStorage a cada 5 segundos
    const intervalo = setInterval(() => {
      carregarNomeEscola();
    }, 5000);

    // Escuta eventos de mudança do storage (ex: em outra aba)
    const listener = (e) => {
      if (e.key === "escolaAtiva") carregarNomeEscola();
    };
    window.addEventListener("storage", listener);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener("storage", listener);
    };
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "6px", fontSize: "14px", background: "#f2f2f2", color: "#1d3557" }}>
      Escola Ativa: <strong>{nomeEscola}</strong>
    </div>
  );
}