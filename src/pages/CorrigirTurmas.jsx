import React, { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";

function CorrigirTurmas() {
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  // === ATENÇÃO: AJUSTE ESTES NOMES ANTES DE EXECUTAR ===
  // Substitua 'Nome da Turma Errada' pelo nome exato da turma duplicada
  const turmaDuplicada = "turma 3 ano";
  // Substitua 'Nome da Turma Correta' pelo nome exato da turma que deve ser mantida
  const turmaCorreta = "3º ano";
  // ======================================================

  const corrigirTurmas = async () => {
    setCarregando(true);
    setMensagem("Iniciando a correção...");

    if (!turmaDuplicada || !turmaCorreta || turmaDuplicada === turmaCorreta) {
      setMensagem(
        "Nomes de turma inválidos. Verifique as variáveis no código."
      );
      setCarregando(false);
      return;
    }

    try {
      const alunosRef = collection(db, "alunos");
      const q = query(alunosRef, where("turma", "==", turmaDuplicada));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setMensagem(`Nenhum aluno encontrado na turma '${turmaDuplicada}'.`);
        setCarregando(false);
        return;
      }

      const batch = writeBatch(db);
      let count = 0;

      querySnapshot.forEach((documento) => {
        const alunoRef = doc(db, "alunos", documento.id);
        batch.update(alunoRef, { turma: turmaCorreta });
        count++;
      });

      await batch.commit();

      setMensagem(
        `Sucesso! ${count} aluno(s) foram atualizados para a turma '${turmaCorreta}'.`
      );
    } catch (error) {
      console.error("Erro ao corrigir turmas:", error);
      setMensagem(
        `Erro ao corrigir turmas. Verifique o console para mais detalhes.`
      );
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
      <h2 style={{ color: "#1d3557" }}>Ferramenta de Correção de Turmas</h2>
      <p style={{ color: "#457b9d" }}>
        Esta ferramenta irá atualizar a turma de todos os alunos de " **
        {turmaDuplicada}**" para " **{turmaCorreta}**".
      </p>
      <button
        onClick={corrigirTurmas}
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
        {carregando ? "Corrigindo..." : "Corrigir Turmas Agora"}
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
