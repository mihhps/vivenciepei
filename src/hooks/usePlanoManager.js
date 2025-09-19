import { useState, useCallback } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  Timestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export function usePlanoManager() {
  const [estado, setEstado] = useState({ carregando: false, erro: null });
  const navigate = useNavigate();

  const checkPlanExists = useCallback(async (alunoId) => {
    if (!alunoId) return null;
    setEstado({ carregando: true, erro: null });
    try {
      const planoRef = doc(db, "alunos", alunoId, "planoAEE", "planoAtivo");
      const planoSnap = await getDoc(planoRef);
      return planoSnap.exists();
    } catch (e) {
      console.error("Erro ao verificar plano:", e);
      setEstado({
        carregando: false,
        erro: "Falha ao verificar o plano do aluno.",
      });
      return null;
    } finally {
      setEstado((s) => ({ ...s, carregando: false }));
    }
  }, []);

  const criarPlanoEmBranco = useCallback(
    async (alunoId) => {
      if (!alunoId) return;
      setEstado({ carregando: true, erro: null });
      try {
        const novoPlano = {
          habilidades: [],
          criadoEm: Timestamp.now(),
          dataPlano: new Date().toISOString().split("T")[0],
          alunoId: alunoId,
          horariosAtendimento: [],
        };
        const planoRef = doc(db, "alunos", alunoId, "planoAEE", "planoAtivo");
        await setDoc(planoRef, novoPlano);
        navigate(`/acompanhamento-aee/${alunoId}`);
      } catch (e) {
        console.error("Erro ao criar plano:", e);
        setEstado({ carregando: false, erro: "Falha ao criar o plano." });
      }
    },
    [navigate]
  );

  const importarDaAvaliacao = useCallback(
    async (alunoId) => {
      if (!alunoId) return;
      setEstado({ carregando: true, erro: null });
      try {
        const q1 = query(
          collection(db, "avaliacoesIniciais"),
          where("aluno.id", "==", alunoId),
          limit(1)
        );
        let avaliacaoSnap = await getDocs(q1);
        if (avaliacaoSnap.empty) {
          const q2 = query(
            collection(db, "avaliacoesIniciais"),
            where("alunoId", "==", alunoId),
            limit(1)
          );
          avaliacaoSnap = await getDocs(q2);
          if (avaliacaoSnap.empty)
            throw new Error(
              "Nenhuma avaliação inicial encontrada para este aluno."
            );
        }

        const avaliacaoData = avaliacoSnap.docs[0].data();
        const respostas = avaliacaoData.respostas || {};
        const habilidadesParaPlanejar = [];
        Object.entries(respostas).forEach(([area, habilidades]) => {
          Object.entries(habilidades).forEach(([habilidadeId, nivel]) => {
            if (nivel !== "I" && nivel !== "NA") {
              habilidadesParaPlanejar.push({
                id: `${area}-${habilidadeId.replace(/\s+/g, "_")}`,
                area,
                habilidade: habilidadeId,
                status: "A iniciar",
              });
            }
          });
        });

        if (habilidadesParaPlanejar.length === 0)
          throw new Error(
            "Nenhuma habilidade a ser trabalhada foi encontrada na avaliação."
          );

        const novoPlano = {
          habilidades: habilidadesParaPlanejar,
          criadoEm: Timestamp.now(),
          dataPlano: new Date().toISOString().split("T")[0],
          baseadoEm: avaliacaoSnap.docs[0].id,
          alunoId: alunoId,
          horariosAtendimento: [],
        };
        const planoRef = doc(db, "alunos", alunoId, "planoAEE", "planoAtivo");
        await setDoc(planoRef, novoPlano);
        navigate(`/acompanhamento-aee/${alunoId}`);
      } catch (e) {
        console.error("Erro ao importar da avaliação:", e);
        setEstado({ carregando: false, erro: e.message });
      }
    },
    [navigate]
  );

  return { estado, checkPlanExists, criarPlanoEmBranco, importarDaAvaliacao };
}
