// src/pages/VerAnamneses.jsx

import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collectionGroup,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import BotaoVoltar from "../components/BotaoVoltar";
import "../styles/AnamneseCompleta.css";
// ✅ Importa a função de gerar PDF e o arquivo de configuração
import { gerarAnamnesePDF } from "../utils/gerarAnamnesePDF";
import { secoesAnamneses } from "../utils/anamneseConfig";

export default function VerAnamneses() {
  const [anamnesesComAlunos, setAnamnesesComAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // ✅ Nova função para buscar os dados completos do aluno e da anamnese e gerar o PDF
  const handleDownloadPdf = async (alunoId, anamneseId) => {
    try {
      const alunoDoc = await getDoc(doc(db, "alunos", alunoId));
      const anamneseRef = doc(db, `alunos/${alunoId}/anamneses`, anamneseId);
      const anamneseDoc = await getDoc(anamneseRef);

      if (alunoDoc.exists() && anamneseDoc.exists()) {
        const alunoData = alunoDoc.data();
        const anamneseData = anamneseDoc.data();
        await gerarAnamnesePDF(anamneseData, alunoData);
      } else {
        alert("Dados incompletos para gerar o PDF.");
      }
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Ocorreu um erro ao gerar o PDF. Tente novamente.");
    }
  };

  useEffect(() => {
    const fetchAnamneses = async () => {
      try {
        const q = query(
          collectionGroup(db, "anamneses"),
          orderBy("criadoEm", "desc")
        );
        const anamnesesSnapshot = await getDocs(q);

        if (anamnesesSnapshot.empty) {
          setError("Nenhuma anamnese foi preenchida ainda.");
          setLoading(false);
          return;
        }

        const alunosMap = new Map();

        const dadosCompletos = await Promise.all(
          anamnesesSnapshot.docs.map(async (anamneseDoc) => {
            const anamneseData = anamneseDoc.data();
            const alunoId = anamneseData.alunoId;
            let alunoNome = "Aluno não encontrado";

            if (alunoId) {
              if (alunosMap.has(alunoId)) {
                alunoNome = alunosMap.get(alunoId);
              } else {
                const alunoDocRef = doc(db, "alunos", alunoId);
                const alunoSnap = await getDoc(alunoDocRef);
                if (alunoSnap.exists()) {
                  alunoNome = alunoSnap.data().nome;
                  alunosMap.set(alunoId, alunoNome);
                }
              }
            }

            return {
              id: anamneseDoc.id,
              alunoId: alunoId,
              alunoNome: alunoNome,
              dataCriacao:
                anamneseData.criadoEm?.toDate().toLocaleDateString("pt-BR") ||
                "Data indisponível",
            };
          })
        );

        setAnamnesesComAlunos(dadosCompletos);
      } catch (err) {
        if (err.code === "failed-precondition") {
          setError(
            "Índice do Firestore necessário. Verifique o console do navegador, clique no link do erro para criar o índice no Firebase e tente novamente após alguns minutos."
          );
        } else {
          setError("Ocorreu um erro ao buscar as anamneses.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnamneses();
  }, []);

  const handleDelete = async (anamneseId, alunoId) => {
    if (
      window.confirm(
        "Tem certeza que deseja excluir esta anamnese? Esta ação é irreversível."
      )
    ) {
      try {
        const anamneseRef = doc(db, `alunos/${alunoId}/anamneses`, anamneseId);
        await deleteDoc(anamneseRef);

        setAnamnesesComAlunos((prevList) =>
          prevList.filter((item) => item.id !== anamneseId)
        );
        alert("Anamnese excluída com sucesso!");
      } catch (err) {
        console.error("Erro ao excluir anamnese:", err);
        alert("Ocorreu um erro ao excluir a anamnese. Tente novamente.");
      }
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="page-container">
      <div className="form-container">
        <BotaoVoltar />
        <h1 className="form-title" style={{ fontSize: "28px" }}>
          Anamneses Preenchidas
        </h1>
        {error && <p className="error-message">{error}</p>}
        {!error && anamnesesComAlunos.length > 0 && (
          <table className="anamnese-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Data de Preenchimento</th>
                <th className="acoes-header">Ações</th>
              </tr>
            </thead>
            <tbody>
              {anamnesesComAlunos.map((item) => (
                <tr key={item.id}>
                  <td>{item.alunoNome}</td>
                  <td>{item.dataCriacao}</td>
                  <td>
                    <div className="acoes-botoes-container">
                      <button
                        onClick={() =>
                          navigate(`/visualizar-anamnese/${item.alunoId}`)
                        }
                        className="button-visualizar"
                      >
                        Visualizar
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(item.alunoId, item.id)}
                        className="button-download-pdf" // ✅ O nome da classe deve ser este
                      >
                        Baixar PDF
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.alunoId)}
                        className="button-excluir"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
