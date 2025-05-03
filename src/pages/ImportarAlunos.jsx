import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";

export default function ImportarAlunos() {
  const [status, setStatus] = useState("");

  const handleImportar = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const texto = await file.text();
      const dados = JSON.parse(texto);

      const alunosCollection = collection(db, "alunos");
      for (const aluno of dados) {
        await addDoc(alunosCollection, aluno);
      }

      setStatus("Alunos importados com sucesso!");
    } catch (erro) {
      console.error("Erro ao importar alunos:", erro);
      setStatus("Erro ao importar alunos. Verifique o formato do arquivo.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(to bottom, #00264d, #005b96)",
      padding: "40px"
    }}>
      <div style={{
        background: "#fff",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
      }}>
        <BotaoVoltar />
        <h2 style={{
          color: "#1d3557",
          marginBottom: "20px",
          textAlign: "center"
        }}>
          Importar Lista de Alunos
        </h2>

        <label style={{
          display: "block",
          marginBottom: "12px",
          fontWeight: "bold",
          color: "#1d3557"
        }}>
          Selecione o arquivo .json com os alunos:
        </label>

        <input
          type="file"
          accept=".json"
          onChange={handleImportar}
          style={{
            marginBottom: "20px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            width: "100%",
            background: "#f5f5f5"
          }}
        />

        <p style={{
          color: status.includes("Erro") ? "red" : "green",
          fontWeight: "bold"
        }}>
          {status}
        </p>
      </div>
    </div>
  );
}