// src/pages/services/peiStatusChecker.js

import { db } from "../../firebase"; // Ajuste o caminho para seu arquivo firebase.js
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";

/**
 * Verifica o status de PEI (criação e revisões) para um professor específico e seus alunos.
 * Reúne a lógica de busca de prazos, turmas, alunos e PEIs.
 * @param {number} anoLetivoAtual - O ano letivo atual para filtrar prazos e PEIs.
 * @param {string} professorId - O ID do DOCUMENTO do professor no Firestore (não o UID de Auth, a menos que seus alunos estejam vinculados por UID).
 * @returns {object} Um objeto contendo:
 * - `statusGeral`: "Em dia" ou "Atrasado".
 * - `totalAlunosAtrasados`: Contagem de alunos com PEI atrasado.
 * - `detalhesAtraso`: Array de strings descrevendo cada atraso.
 * - `alunosComStatusDetalhado`: Array de objetos com status detalhado de cada aluno.
 * - `erro`: Mensagem de erro se ocorrer um problema.
 * - `mensagem`: Mensagem informativa (ex: "Nenhum aluno encontrado").
 */
export const verificarPrazosPEI = async (anoLetivoAtual, professorId) => {
  let statusGeral = "Em dia";
  let totalAlunosAtrasados = 0;
  let detalhesAtraso = []; // Array de strings com motivos de atraso
  let alunosComStatusDetalhado = []; // Array de objetos com status detalhado por aluno
  let mensagem = null;
  let erro = null;

  try {
    const hoje = new Date();

    // 1. Buscar dados do professor (para pegar nome e turmas)
    const professorDocRef = doc(db, "usuarios", professorId);
    const profDocSnap = await getDoc(professorDocRef);

    if (!profDocSnap.exists()) {
      erro = "Professor não encontrado na base de dados.";
      return {
        statusGeral,
        totalAlunosAtrasados,
        detalhesAtraso,
        alunosComStatusDetalhado,
        mensagem,
        erro,
      };
    }
    const profData = { id: profDocSnap.id, ...profDocSnap.data() };

    const turmasDoProfessor =
      profData.turmas && typeof profData.turmas === "object"
        ? Object.keys(profData.turmas)
        : [];
    const escolasDoProfessor =
      profData.escolas && typeof profData.escolas === "object"
        ? Object.keys(profData.escolas)
        : [];

    if (turmasDoProfessor.length === 0) {
      mensagem = "Seu perfil de professor não está vinculado a nenhuma turma.";
      return {
        statusGeral,
        totalAlunosAtrasados,
        detalhesAtraso,
        alunosComStatusDetalhado,
        mensagem,
        erro,
      };
    }
    if (escolasDoProfessor.length === 0) {
      mensagem = "Seu perfil de professor não está vinculado a nenhuma escola.";
      return {
        statusGeral,
        totalAlunosAtrasados,
        detalhesAtraso,
        alunosComStatusDetalhado,
        mensagem,
        erro,
      };
    }

    // Limita para queries 'in'
    let turmasParaQuery = turmasDoProfessor.slice(0, 10);
    let escolasParaQuery = escolasDoProfessor.slice(0, 10);

    // 2. Buscar prazos anuais do PEI
    const qPrazos = query(
      collection(db, "prazosPEIAnuais"),
      where("anoLetivo", "==", anoLetivoAtual),
      limit(1)
    );
    const prazosSnap = await getDocs(qPrazos);
    const prazoAnualDoc = prazosSnap.empty ? null : prazosSnap.docs[0].data();

    if (!prazoAnualDoc) {
      erro = `Não foi encontrada uma configuração de prazos anual para o PEI do ano de ${anoLetivoAtual}.`;
      return {
        statusGeral,
        totalAlunosAtrasados,
        detalhesAtraso,
        alunosComStatusDetalhado,
        mensagem,
        erro,
      };
    }
    const dataLimiteCriacaoPEI =
      prazoAnualDoc.dataLimiteCriacaoPEI?.toDate() || null;
    const dataLimiteRevisao1Sem =
      prazoAnualDoc.dataLimiteRevisao1Sem?.toDate() || null;
    const dataLimiteRevisao2Sem =
      prazoAnualDoc.dataLimiteRevisao2Sem?.toDate() || null;

    const todosPrazosDefinidos = [
      dataLimiteCriacaoPEI,
      dataLimiteRevisao1Sem,
      dataLimiteRevisao2Sem,
    ].filter(Boolean);
    if (todosPrazosDefinidos.length === 0) {
      erro = `Nenhum prazo válido foi definido para o PEI do ano de ${anoLetivoAtual}.`;
      return {
        statusGeral,
        totalAlunosAtrasados,
        detalhesAtraso,
        alunosComStatusDetalhado,
        mensagem,
        erro,
      };
    }

    // 3. Buscar os ALUNOS deste professor (vinculados às suas turmas E escolas)
    const qAlunos = query(
      collection(db, "alunos"),
      where("turma", "in", turmasParaQuery),
      where("escolaId", "in", escolasParaQuery) // Filtro por escola do professor
    );
    const alunosSnap = await getDocs(qAlunos);
    const alunosList = alunosSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (alunosList.length === 0) {
      mensagem = `Nenhum aluno encontrado para suas turmas e escolas vinculadas neste ano letivo.`;
      return {
        statusGeral,
        totalAlunosAtrasados,
        detalhesAtraso,
        alunosComStatusDetalhado,
        mensagem,
        erro,
      };
    }

    // 4. Para cada aluno, verificar o status do PEI e das revisões
    const alunosProcessados = await Promise.all(
      alunosList.map(async (aluno) => {
        let statusPeiGeral = "Não iniciado";
        let statusRevisao1 = "N/A";
        let statusRevisao2 = "N/A";
        let dataUltimaAtualizacaoPei = null;

        const qPei = query(
          collection(db, "peis"),
          where("alunoId", "==", aluno.id),
          where("anoLetivo", "==", anoLetivoAtual),
          where("escolaId", "in", escolasParaQuery), // Filtro por escola do professor
          orderBy("criadoEm", "desc"),
          limit(1)
        );
        const peiSnap = await getDocs(qPei);

        if (peiSnap.empty) {
          if (dataLimiteCriacaoPEI && hoje >= dataLimiteCriacaoPEI) {
            statusPeiGeral = "Atrasado - Sem PEI";
          } else {
            statusPeiGeral = "Aguardando Criação";
          }
          if (dataLimiteRevisao1Sem && hoje >= dataLimiteRevisao1Sem)
            statusRevisao1 = "Atrasado";
          if (dataLimiteRevisao2Sem && hoje >= dataLimiteRevisao2Sem)
            statusRevisao2 = "Atrasado";
        } else {
          const peiData = peiSnap.docs[0].data();
          const dataCriacaoPei = peiData.criadoEm?.toDate() || null;
          dataUltimaAtualizacaoPei =
            peiData.dataUltimaRevisao?.toDate() || dataCriacaoPei;

          if (dataLimiteCriacaoPEI && hoje >= dataLimiteCriacaoPEI) {
            if (dataCriacaoPei && dataCriacaoPei <= dataLimiteCriacaoPEI) {
              statusPeiGeral = "Criado no Prazo";
            } else if (
              dataCriacaoPei &&
              dataCriacaoPei > dataLimiteCriacaoPEI
            ) {
              statusPeiGeral = "Criado (Atrasado)";
            } else {
              statusPeiGeral = "Atrasado - Sem PEI";
            }
          } else {
            statusPeiGeral = "Aguardando Criação";
            if (dataCriacaoPei)
              statusPeiGeral = "Criado (antes do prazo final)";
          }

          if (dataLimiteRevisao1Sem) {
            if (hoje >= dataLimiteRevisao1Sem) {
              if (
                dataUltimaAtualizacaoPei &&
                dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem
              ) {
                statusRevisao1 = "Em dia (Feita)";
              } else {
                statusRevisao1 = "Atrasado";
              }
            } else {
              statusRevisao1 = "Aguardando";
              if (
                dataUltimaAtualizacaoPei &&
                dataUltimaAtualizacaoPei >= dataLimiteCriacaoPEI
              ) {
                statusRevisao1 = "Feita (Aguardando prazo)";
              }
            }
          }

          if (dataLimiteRevisao2Sem) {
            if (hoje >= dataLimiteRevisao2Sem) {
              if (
                dataUltimaAtualizacaoPei &&
                dataUltimaAtualizacaoPei >= dataLimiteRevisao2Sem
              ) {
                statusRevisao2 = "Em dia (Feita)";
              } else {
                statusRevisao2 = "Atrasado";
              }
            } else {
              statusRevisao2 = "Aguardando";
              if (
                dataUltimaAtualizacaoPei &&
                dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem
              ) {
                statusRevisao2 = "Feita (Aguardando prazo)";
              }
            }
          }
        }

        const isAlunoAtrasado =
          statusPeiGeral.includes("Atrasado") ||
          statusRevisao1.includes("Atrasado") ||
          statusRevisao2.includes("Atrasado");

        if (isAlunoAtrasado) {
          totalAlunosAtrasados++;
          detalhesAtraso.push(
            `- ${aluno.nome}: ${
              statusPeiGeral.includes("Atrasado") ? statusPeiGeral : ""
            } ${statusRevisao1.includes("Atrasado") ? statusRevisao1 : ""} ${
              statusRevisao2.includes("Atrasado") ? statusRevisao2 : ""
            }`.trim()
          );
          statusGeral = "Atrasado"; // Se UM aluno está atrasado, o status geral é Atrasado
        }

        return {
          ...aluno, // Dados originais do aluno
          statusPeiGeral,
          statusRevisao1,
          statusRevisao2,
          dataUltimaAtualizacaoPei,
        };
      })
    );
    alunosComStatusDetalhado = alunosProcessados; // Popula o array que será retornado
  } catch (err) {
    console.error("Erro em verificarPrazosPEI:", err);
    erro = "Erro ao verificar prazos. Detalhes: " + err.message;
  }

  return {
    statusGeral,
    totalAlunosAtrasados,
    detalhesAtraso,
    alunosComStatusDetalhado,
    mensagem,
    erro,
  };
};
