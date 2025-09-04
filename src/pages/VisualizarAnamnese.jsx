// src/pages/VisualizarAnamnese.jsx

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import Loader from "../components/Loader";
import BotaoVoltar from "../components/BotaoVoltar";
// ✅ Importa a função de gerar PDF do novo arquivo
import { gerarAnamnesePDF } from "../utils/gerarAnamnesePDF";
// ✅ Importa as perguntas e seções do arquivo de configuração
import { labelMap, secoesAnamneses } from "../utils/anamneseConfig";

const DisplayItem = ({ labelKey, labelText, value }) => {
  if (value === null || value === undefined || value === "") return null;

  const finalLabel =
    labelText ||
    labelKey
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());

  let displayValue = value;

  if (typeof value === "boolean") {
    displayValue = value ? "Sim" : "Não";
  } else if (
    labelKey === "dataNascimento" &&
    typeof value === "string" &&
    value.includes("-")
  ) {
    displayValue = value.split("-").reverse().join("/");
  } else if (labelKey === "sexo") {
    if (String(value).toUpperCase() === "M") displayValue = "Masculino";
    else if (String(value).toUpperCase() === "F") displayValue = "Feminino";
  } else if (labelKey === "idade") {
    displayValue = `${value} anos`;
  }

  return (
    <div
      style={{
        marginBottom: "16px",
        borderBottom: "1px solid #eee",
        paddingBottom: "12px",
        wordBreak: "break-word",
      }}
    >
      <strong
        style={{
          color: "#1d3557",
          fontSize: "16px",
          display: "block",
          marginBottom: "4px",
        }}
      >
        {finalLabel}
      </strong>
      <p
        style={{
          margin: "0",
          color: "#495057",
          fontSize: "15px",
          whiteSpace: "pre-wrap",
        }}
      >
        {String(displayValue)}
      </p>
    </div>
  );
};

export default function VisualizarAnamnese() {
  const { alunoId } = useParams();
  const [aluno, setAluno] = useState(null);
  const [anamnese, setAnamnese] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!alunoId) {
      setError("ID do aluno não fornecido.");
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        const alunoDoc = await getDoc(doc(db, "alunos", alunoId));
        if (alunoDoc.exists()) {
          setAluno(alunoDoc.data());
        } else {
          throw new Error("Aluno não encontrado.");
        }
        const q = query(
          collection(db, `alunos/${alunoId}/anamneses`),
          orderBy("criadoEm", "desc"),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setAnamnese(querySnapshot.docs[0].data());
        } else {
          setError("Nenhuma anamnese encontrada para este aluno.");
        }
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        setError("Ocorreu um erro ao carregar os dados da anamnese.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [alunoId]);

  const handleDownloadPdf = async () => {
    if (anamnese && aluno) {
      await gerarAnamnesePDF(anamnese, aluno);
    } else {
      alert("Os dados ainda não foram carregados para gerar o PDF.");
    }
  };

  if (loading) return <Loader />;

  const camposRenderizados = new Set(secoesAnamneses.flatMap((s) => s.campos));
  const camposDeSistema = new Set([
    "criadoEm",
    "alunoId",
    "professorId",
    "anexos",
  ]);
  const camposRestantes = anamnese
    ? Object.entries(anamnese).filter(
        ([key]) => !camposRenderizados.has(key) && !camposDeSistema.has(key)
      )
    : [];

  return (
    <div
      style={{
        backgroundColor: "#f0f8ff",
        padding: "20px",
        minHeight: "100vh",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
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
        <h1
          style={{
            textAlign: "center",
            color: "#1d3557",
            marginBottom: "10px",
          }}
        >
          Anamnese Completa
        </h1>
        {aluno && (
          <h2
            style={{
              textAlign: "center",
              color: "#457b9d",
              marginTop: 0,
              fontWeight: "normal",
              marginBottom: "30px",
            }}
          >
            {aluno.nome}
          </h2>
        )}
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
        {anamnese && (
          <>
            <button
              onClick={handleDownloadPdf}
              style={{
                display: "block",
                margin: "0 auto 30px auto",
                padding: "12px 25px",
                backgroundColor: "#2a9d8f",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              📄 Baixar em PDF
            </button>
            <div id="pdf-content">
              {secoesAnamneses.map((secao) => (
                <div key={secao.titulo} style={{ marginBottom: "2.5rem" }}>
                  <h3
                    style={{
                      color: "#1d3557",
                      borderBottom: "2px solid #457b9d",
                      paddingBottom: "8px",
                      marginBottom: "20px",
                      fontSize: "1.2rem",
                    }}
                  >
                    {secao.titulo}
                  </h3>
                  {secao.campos.map((campo) => (
                    <DisplayItem
                      key={campo}
                      labelKey={campo}
                      labelText={labelMap[campo]}
                      value={anamnese[campo]}
                    />
                  ))}
                </div>
              ))}
              {camposRestantes.length > 0 && (
                <div style={{ marginTop: "30px" }}>
                  <h3
                    style={{
                      color: "#1d3557",
                      borderBottom: "2px solid #457b9d",
                      paddingBottom: "8px",
                      marginBottom: "20px",
                      fontSize: "1.2rem",
                    }}
                  >
                    Outras Informações
                  </h3>
                  {camposRestantes.map(([key, value]) => (
                    <DisplayItem
                      key={key}
                      labelKey={key}
                      labelText={labelMap[key]}
                      value={value}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
