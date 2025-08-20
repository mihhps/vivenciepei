import React, { useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

function BackupDados() {
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const fazerBackup = async () => {
    setCarregando(true);
    setMensagem("Iniciando o backup...");

    try {
      const alunosSnapshot = await getDocs(collection(db, "alunos"));
      const turmasSnapshot = await getDocs(collection(db, "turmas"));

      const dadosAlunos = alunosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const dadosTurmas = turmasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const backupData = {
        timestamp: new Date().toISOString(),
        alunos: dadosAlunos,
        turmas: dadosTurmas,
      };

      const jsonData = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `backup_vivencie_pei_${new Date().toISOString()}.json`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMensagem("Backup concluído com sucesso! O download foi iniciado.");
    } catch (error) {
      console.error("Erro ao fazer backup:", error);
      setMensagem("Erro ao fazer backup. Verifique o console.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      style={{ padding: "20px", fontFamily: "sans-serif", textAlign: "center" }}
    >
      <h2 style={{ color: "#1d3557" }}>Ferramenta de Backup</h2>
      <p style={{ color: "#457b9d" }}>
        Esta ferramenta irá baixar um arquivo JSON com todos os dados de alunos
        e turmas. Guarde este arquivo em um local seguro.
      </p>
      <button
        onClick={fazerBackup}
        disabled={carregando}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: carregando ? "#a8dadc" : "#1d3557",
          color: "white",
          cursor: "pointer",
        }}
      >
        {carregando ? "Fazendo backup..." : "Fazer Backup Agora"}
      </button>
      {mensagem && (
        <p style={{ marginTop: "20px", fontWeight: "bold", color: "#2a9d8f" }}>
          {mensagem}
        </p>
      )}
    </div>
  );
}

export default BackupDados;
