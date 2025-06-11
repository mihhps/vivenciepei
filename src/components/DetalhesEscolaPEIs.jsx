// src/components/DetalhesEscolaPEIs.jsx
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { db } from "../firebase"; // Ajuste o caminho
import { collection, query, where, getDocs } from "firebase/firestore";

// --- Styled Components ---
const DetalhesContainer = styled.div`
  margin-top: 30px;
  padding: 25px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;

  h3 {
    color: #1d3557;
    margin-top: 0;
    margin-bottom: 20px;
    border-bottom: 2px solid #f0f4f8;
    padding-bottom: 10px;
  }
`;

const BotaoVoltar = styled.button`
  background-color: #6c757d;
  color: white;
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 25px;
  font-size: 0.95em;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #5a6268;
  }
`;

function DetalhesEscolaPEIs({ escolaId, nomeEscola, anoLetivo, onVoltar }) {
  const [alunosComPEIs, setAlunosComPEIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!escolaId || !anoLetivo) return;

    const fetchDetalhesEscola = async () => {
      setLoading(true);
      setError(null);
      console.log(
        `[DetalhesEscolaPEIs] Buscando detalhes para Escola ID: ${escolaId}, Ano: ${anoLetivo}`
      );
      try {
        const alunosQuery = query(
          collection(db, "alunos"),
          where("escolaId", "==", escolaId)
          // Lembre-se: se precisar filtrar alunos por ano, adicione a condição aqui
          // ex: where('anoAtivo', '==', anoLetivo)
        );
        const alunosSnapshot = await getDocs(alunosQuery);
        const listaAlunos = alunosSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log(
          `[DetalhesEscolaPEIs] ${listaAlunos.length} alunos encontrados para a escola.`
        );

        const peisEscolaQuery = query(
          collection(db, "PEIs"),
          where("escolaId", "==", escolaId),
          where("anoLetivo", "==", anoLetivo)
        );
        const peisEscolaSnapshot = await getDocs(peisEscolaQuery);
        console.log(
          `[DetalhesEscolaPEIs] ${peisEscolaSnapshot.size} PEIs encontrados para a escola no ano ${anoLetivo}.`
        );

        const peisMap = new Map();
        peisEscolaSnapshot.forEach((doc) => {
          const peiData = doc.data();
          console.log(
            `[DetalhesEscolaPEIs] PEI encontrado - ID: ${doc.id}, AlunoID: ${peiData.alunoId}, Status Original: '${peiData.status}'`
          ); // DEBUG LOG
          peisMap.set(peiData.alunoId, { id: doc.id, ...peiData });
        });

        const dadosCombinados = listaAlunos.map((aluno) => {
          const peiDoAluno = peisMap.get(aluno.id);
          let statusPEI = "Pendente de Criação";
          let dataPrevista = null;
          let ehAtrasado = false;

          if (peiDoAluno) {
            const statusOriginal = peiDoAluno.status;
            const statusNormalizado = statusOriginal
              ? statusOriginal.trim().toLowerCase()
              : "";
            console.log(
              `[DetalhesEscolaPEIs] Processando Aluno: ${aluno.nome}, PEI ID: ${peiDoAluno.id}, Status Original: '${statusOriginal}', Status Normalizado: '${statusNormalizado}'`
            ); // DEBUG LOG

            if (statusNormalizado === "concluído") {
              // Verifica EXATAMENTE por 'concluído'
              statusPEI = "Concluído";
            } else if (statusNormalizado === "em elaboração") {
              statusPEI = "Em Elaboração";
              if (peiDoAluno.dataPrevistaTermino) {
                dataPrevista = peiDoAluno.dataPrevistaTermino.toDate();
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                if (dataPrevista < hoje) {
                  ehAtrasado = true;
                  statusPEI = "Atrasado";
                }
              }
            } else if (statusNormalizado === "pendente de criação") {
              statusPEI = "Pendente de Criação";
            } else {
              console.warn(
                `[DetalhesEscolaPEIs] Status não reconhecido para PEI ${peiDoAluno.id}: '${statusOriginal}'`
              );
            }
          } else {
            console.log(
              `[DetalhesEscolaPEIs] Aluno ${aluno.nome} (ID: ${aluno.id}) não possui PEI associado no map para o ano ${anoLetivo}. Status definido como 'Pendente de Criação'.`
            );
          }
          return {
            alunoId: aluno.id,
            nomeAluno: aluno.nome || "Aluno sem nome",
            statusPEI,
            ehAtrasado,
            dataPrevistaTermino: dataPrevista,
          };
        });
        setAlunosComPEIs(dadosCombinados);
      } catch (err) {
        console.error(`Erro ao buscar detalhes para escola ${escolaId}:`, err);
        setError("Falha ao carregar os detalhes da escola.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetalhesEscola();
  }, [escolaId, anoLetivo]);

  if (loading)
    return (
      <DetalhesContainer>
        <p>Carregando detalhes da escola...</p>
      </DetalhesContainer>
    );
  if (error)
    return (
      <DetalhesContainer>
        <p style={{ color: "red" }}>{error}</p>
      </DetalhesContainer>
    );

  return (
    <DetalhesContainer>
      <BotaoVoltar onClick={onVoltar}>
        &larr; Voltar para o resumo das escolas
      </BotaoVoltar>
      <h3>
        PEIs para: {nomeEscola} (Ano Letivo: {anoLetivo})
      </h3>
      {alunosComPEIs.length === 0 ? (
        <p>
          Nenhum aluno encontrado para esta escola (ou para o ano letivo, se
          filtrado) ou nenhum PEI iniciado.
        </p>
      ) : (
        <table className="acompanhamento-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th className="text-center">Status do PEI</th>
              <th className="text-center">Data Prevista Término</th>
            </tr>
          </thead>
          <tbody>
            {alunosComPEIs.map((item) => (
              <tr key={item.alunoId}>
                <td>{item.nomeAluno}</td>
                <td
                  className={`text-center ${
                    item.statusPEI === "Concluído"
                      ? "status-concluido"
                      : item.ehAtrasado
                      ? "status-atrasado"
                      : item.statusPEI === "Pendente de Criação"
                      ? "status-pendente"
                      : ""
                  }`}
                >
                  {item.statusPEI}
                </td>
                <td className="text-center">
                  {item.dataPrevistaTermino
                    ? item.dataPrevistaTermino.toLocaleDateString("pt-BR")
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DetalhesContainer>
  );
}
export default DetalhesEscolaPEIs;
