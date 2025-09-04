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
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import BotaoVoltar from "../components/BotaoVoltar";

export default function VerAnamneses() {
  const [anamnesesComAlunos, setAnamnesesComAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  if (loading) return <Loader />;

  return (
    <div
      style={{
        backgroundColor: "#f0f8ff",
        padding: "20px",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "8px",
          position: "relative",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        }}
      >
        <BotaoVoltar />
        <h1 style={{ textAlign: "center", color: "#1d3557" }}>
          Anamneses Preenchidas
        </h1>
        {error && (
          <p
            style={{
              color: "red",
              textAlign: "center",
              fontSize: "18px",
              margin: "30px 0",
            }}
          >
            {error}
          </p>
        )}
        {!error && anamnesesComAlunos.length > 0 && (
          <table
            style={{
              width: "100%",
              marginTop: "30px",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #1d3557" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Aluno</th>
                <th style={{ padding: "12px", textAlign: "left" }}>
                  Data de Preenchimento
                </th>
                <th style={{ padding: "12px", textAlign: "left" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {anamnesesComAlunos.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "12px" }}>{item.alunoNome}</td>
                  <td style={{ padding: "12px" }}>{item.dataCriacao}</td>
                  <td style={{ padding: "12px" }}>
                    <button
                      onClick={() =>
                        navigate(`/visualizar-anamnese/${item.alunoId}`)
                      }
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#457b9d",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Visualizar
                    </button>
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
