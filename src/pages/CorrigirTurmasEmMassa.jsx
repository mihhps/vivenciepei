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

function CorrigirTurmasEmMassa() {
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [turmasCorrigidas, setTurmasCorrigidas] = useState([]);
  const [turmasParaDeletar, setTurmasParaDeletar] = useState([]);

  const corrigirTurmas = async () => {
    setCarregando(true);
    setMensagem("Iniciando a correção em massa...");
    setTurmasCorrigidas([]);
    setTurmasParaDeletar([]);

    try {
      const turmasRef = collection(db, "turmas"); // Ajuste o nome da coleção se for diferente
      const alunosRef = collection(db, "alunos");

      // 1. Coletar todas as turmas e alunos
      const [turmasSnapshot, alunosSnapshot] = await Promise.all([
        getDocs(turmasRef),
        getDocs(alunosRef),
      ]);

      const todasAsTurmas = turmasSnapshot.docs.map((d) => ({
        id: d.id,
        nome: d.data().nome,
      }));
      const todosOsAlunos = alunosSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // 2. Mapear as turmas pelo nome para encontrar duplicatas
      const turmasPorNome = new Map();
      todasAsTurmas.forEach((turma) => {
        const nomeNormalizado = turma.nome.trim().toLowerCase();
        if (!turmasPorNome.has(nomeNormalizado)) {
          turmasPorNome.set(nomeNormalizado, []);
        }
        turmasPorNome.get(nomeNormalizado).push(turma);
      });

      const turmasCorrigidasLog = [];
      const turmasParaDeletarLog = [];
      const batch = writeBatch(db);

      // 3. Iterar e corrigir duplicatas
      for (const [nomeTurma, entradas] of turmasPorNome.entries()) {
        if (entradas.length > 1) {
          // Temos duplicatas!
          console.log(`Duplicatas encontradas para a turma: '${nomeTurma}'`);

          // Identificar a entrada "correta" (a que tem mais alunos)
          let turmaCorreta = entradas[0];
          let maxAlunos = 0;

          for (const entrada of entradas) {
            const alunosNaTurma = todosOsAlunos.filter(
              (aluno) => aluno.turma === entrada.nome // Usa o nome para encontrar os alunos
            ).length;

            if (alunosNaTurma > maxAlunos) {
              maxAlunos = alunosNaTurma;
              turmaCorreta = entrada;
            }
          }

          console.log(
            `Turma correta para '${nomeTurma}' (ID: ${turmaCorreta.id})`
          );

          // Atualizar os alunos das outras entradas
          for (const entradaDuplicada of entradas) {
            if (entradaDuplicada.id !== turmaCorreta.id) {
              console.log(
                `Corrigindo alunos da turma duplicada (ID: ${entradaDuplicada.id})...`
              );

              const alunosDuplicados = todosOsAlunos.filter(
                (aluno) => aluno.turma === entradaDuplicada.nome
              );

              alunosDuplicados.forEach((aluno) => {
                const alunoRef = doc(db, "alunos", aluno.id);
                batch.update(alunoRef, { turma: turmaCorreta.nome });
                console.log(
                  `  - Aluno '${aluno.nome}' (${aluno.id}) atualizado.`
                );
              });

              turmasCorrigidasLog.push(
                `Turma '${entradaDuplicada.nome}' (ID: ${entradaDuplicada.id}) corrigida. ${alunosDuplicados.length} aluno(s) atualizado(s).`
              );
              turmasParaDeletarLog.push(
                `Turma '${entradaDuplicada.nome}' (ID: ${entradaDuplicada.id})`
              );
            }
          }
        }
      }

      await batch.commit();

      setMensagem("Correção em massa concluída!");
      setTurmasCorrigidas(turmasCorrigidasLog);
      setTurmasParaDeletar(turmasParaDeletarLog);
    } catch (error) {
      console.error("Erro ao corrigir turmas em massa:", error);
      setMensagem(
        "Erro ao corrigir turmas. Verifique o console para mais detalhes."
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      style={{ padding: "20px", fontFamily: "sans-serif", textAlign: "center" }}
    >
      <h2 style={{ color: "#1d3557" }}>
        Ferramenta de Correção de Turmas em Massa
      </h2>
      <p style={{ color: "#457b9d" }}>
        Esta ferramenta irá encontrar e unificar turmas duplicadas no seu banco
        de dados.
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
      {turmasCorrigidas.length > 0 && (
        <div style={{ marginTop: "30px", textAlign: "left" }}>
          <h3 style={{ color: "#2a9d8f" }}>Detalhes da Correção:</h3>
          <ul>
            {turmasCorrigidas.map((log, index) => (
              <li key={index}>{log}</li>
            ))}
          </ul>
          <h3 style={{ color: "#e63946", marginTop: "20px" }}>Atenção:</h3>
          <p>
            As seguintes turmas duplicadas agora estão vazias e devem ser
            removidas **manualmente** do seu banco de dados para evitar futuros
            problemas.
          </p>
          <ul>
            {turmasParaDeletar.map((turma, index) => (
              <li key={index}>{turma}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CorrigirTurmasEmMassa;
