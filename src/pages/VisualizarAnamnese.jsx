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
import "../styles/AnamneseCompleta.css";
import { gerarAnamnesePDF } from "../utils/gerarAnamnesePDF";
import { labelMap, secoesAnamneses } from "../utils/anamneseConfig";
import { calcularIdadeEFaixa, formatarDataSegura } from "../utils/dataUtils.js";

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
  } else if (labelKey === "sexo") {
    if (String(value).toUpperCase() === "M") displayValue = "Masculino";
    else if (String(value).toUpperCase() === "F") displayValue = "Feminino";
  }

  return (
    <div className="display-item-container">
      <strong className="display-item-label">{finalLabel}</strong>
      <p className="display-item-value">{String(displayValue)}</p>
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

  // ✅ Lista de campos a serem excluídos da exibição principal
  const camposExcluidosDoCorpo = new Set([
    "nome",
    "idade",
    "dataNascimento",
    "turma",
    "turno",
    "sexo",
    "naturalidade",
    "nacionalidade",
    "diagnostico",
  ]);

  const camposRenderizados = new Set(secoesAnamneses.flatMap((s) => s.campos));
  const camposDeSistema = new Set([
    "criadoEm",
    "alunoId",
    "professorId",
    "anexos",
  ]);
  const camposRestantes = anamnese
    ? Object.entries(anamnese).filter(
        ([key]) =>
          !camposRenderizados.has(key) &&
          !camposDeSistema.has(key) &&
          !camposExcluidosDoCorpo.has(key)
      )
    : [];

  const [idadeCalculada] = aluno
    ? calcularIdadeEFaixa(aluno.nascimento)
    : ["-"];

  return (
    <div className="page-container">
      <div className="form-container">
        <BotaoVoltar />
        <h1 className="form-title">Anamnese Completa</h1>
        {error && <p className="error-message">{error}</p>}
        {aluno && (
          <div className="aluno-header-info">
            <h4>Informações do Aluno</h4>
            <p>
              <strong>Nome:</strong> {aluno.nome || "N/A"}
            </p>
            <p>
              <strong>Data de Nascimento:</strong>{" "}
              {formatarDataSegura(aluno.nascimento)}
            </p>
            <p>
              <strong>Idade:</strong>{" "}
              {idadeCalculada ? `${idadeCalculada} anos` : "N/A"}
            </p>
            <p>
              <strong>Diagnóstico:</strong> {aluno.diagnostico || "N/A"}
            </p>
            <p>
              <strong>Turma:</strong> {aluno.turma || "N/A"}
            </p>
            <p>
              <strong>Turno:</strong> {aluno.turno || "N/A"}
            </p>
          </div>
        )}
        {anamnese && (
          <>
            <div id="pdf-content">
              {secoesAnamneses.map((secao) => (
                <div key={secao.titulo} className="section-container">
                  <h3 className="section-title" style={{ cursor: "default" }}>
                    {secao.titulo}
                  </h3>
                  <div className="section-content">
                    {secao.campos
                      .filter((campo) => !camposExcluidosDoCorpo.has(campo))
                      .map((campo) => (
                        <DisplayItem
                          key={campo}
                          labelKey={campo}
                          labelText={labelMap[campo]}
                          value={anamnese[campo]}
                        />
                      ))}
                  </div>
                </div>
              ))}
              {camposRestantes.length > 0 && (
                <div className="section-container">
                  <h3 className="section-title" style={{ cursor: "default" }}>
                    Outras Informações
                  </h3>
                  <div className="section-content">
                    {camposRestantes.map(([key, value]) => (
                      <DisplayItem
                        key={key}
                        labelKey={key}
                        labelText={labelMap[key]}
                        value={value}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
