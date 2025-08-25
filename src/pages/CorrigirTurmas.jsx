import React, { useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

function CorrigirTurmas() {
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const corrigirTodasAsTurmas = async () => {
    setCarregando(true);
    setMensagem("Iniciando a correção de todas as turmas...");

    try {
      const alunosRef = collection(db, "alunos");
      const querySnapshot = await getDocs(alunosRef);

      if (querySnapshot.empty) {
        setMensagem("Nenhum aluno encontrado.");
        setCarregando(false);
        return;
      }

      const batch = writeBatch(db);
      let count = 0;

      querySnapshot.forEach((documento) => {
        const aluno = documento.data();
        if (aluno.turma) {
          const turmaOriginal = aluno.turma;
          // Padroniza a turma para minúsculas
          const turmaPadronizada = turmaOriginal.trim().toLowerCase();

          // Se a turma original for diferente da padronizada,
          // significa que ela precisa ser corrigida.
          if (turmaOriginal !== turmaPadronizada) {
            const alunoRef = doc(db, "alunos", documento.id);
            batch.update(alunoRef, { turma: turmaPadronizada });
            count++;
          }
        }
      });

      if (count > 0) {
        await batch.commit();
        setMensagem(
          `Sucesso! ${count} turma(s) de alunos foram corrigidas e padronizadas.`
        );
      } else {
        setMensagem(
          "Todas as turmas já estão padronizadas. Nenhuma correção necessária."
        );
      }
    } catch (error) {
      console.error("Erro ao corrigir turmas:", error);
      setMensagem("Erro ao corrigir turmas. Verifique o console.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "sans-serif",
        textAlign: "center",
      }}
    >
      <h2 style={{ color: "#1d3557" }}>Ferramenta de Padronização de Turmas</h2>
      <p style={{ color: "#457b9d" }}>
        Esta ferramenta irá percorrer todos os alunos e garantir que o nome das
        turmas estejam sempre em minúsculas.
      </p>
      <button
        onClick={corrigirTodasAsTurmas}
        disabled={carregando}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: carregando ? "#a8dadc" : "#457b9d",
          color: "white",
          cursor: "pointer",
        }}
      >
        {carregando ? "Corrigindo..." : "Corrigir Todas as Turmas"}
      </button>
      {mensagem && (
        <p style={{ marginTop: "20px", fontWeight: "bold", color: "#e63946" }}>
          {mensagem}
        </p>
      )}
    </div>
  );
}

export default CorrigirTurmas;
