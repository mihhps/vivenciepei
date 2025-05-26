import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

export default function ImportarAlunos() {
  const [escolas, setEscolas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [status, setStatus] = useState("");
  const [alunosDetectados, setAlunosDetectados] = useState([]);

  const thStyle = {
    padding: "8px",
    textAlign: "left",
    borderBottom: "1px solid #ddd",
    fontWeight: "bold"
  };

  const tdStyle = {
    padding: "8px"
  };

  useEffect(() => {
    const carregarEscolas = async () => {
      const snapshot = await getDocs(collection(db, "escolas"));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEscolas(lista);
      if (lista.length > 0) setEscolaSelecionada(lista[0].id);
    };
    carregarEscolas();
  }, []);

  const formatarDataIso = (dataBr) => {
    if (!dataBr) return "";
    const [dia, mes, ano] = dataBr.split("/");
    return `${ano}-${mes}-${dia}`;
  };

  const extrairTextoPDF = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const typedArray = new Uint8Array(reader.result);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let texto = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            texto += content.items.map(item => item.str).join(" ") + "\n";
          }
          resolve(texto);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const extrairAlunos = (texto) => {
    const linhas = texto.split("\n").filter(l => l.trim());
    const alunos = [];
    let turmaAtual = "", turnoAtual = "";

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];

      const turmaMatch = linha.match(/Turma\s+Código:\s+\d+\s+Nome:\s+(.+?)\s+Turno:\s+(Matutino|Vespertino)/);
      if (turmaMatch) {
        turmaAtual = turmaMatch[1].trim();
        turnoAtual = turmaMatch[2].trim();
        continue;
      }

      const alunoMatch = linha.match(/^(\d{5})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+.*?\s+(Enturmada|Finalizada)\s+(.+?)\s+(Sim|Não)$/);
      if (alunoMatch) {
        alunos.push({
          nome: alunoMatch[2].trim(),
          nascimento: formatarDataIso(alunoMatch[3]),
          diagnostico: alunoMatch[5].trim(),
          turma: turmaAtual,
          turno: turnoAtual,
          escolaId: escolaSelecionada
        });
      }
    }

    return alunos;
  };

  const handleArquivoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === "json") {
      setStatus("Lendo arquivo JSON...");
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const dados = JSON.parse(event.target.result);
          const comEscola = dados.map(aluno => ({
            ...aluno,
            escolaId: escolaSelecionada
          }));
          setAlunosDetectados(comEscola);
          setStatus(`Pronto para importar - ${comEscola.length} alunos detectados`);
        } catch (error) {
          console.error("Erro ao ler JSON:", error);
          setStatus("Erro ao ler o arquivo JSON.");
        }
      };
      reader.readAsText(file);
      return;
    }

    setStatus("Analisando PDF...");
    try {
      const texto = await extrairTextoPDF(file);
      const dados = extrairAlunos(texto);
      if (dados.length === 0) {
        setStatus("Nenhum aluno encontrado no PDF.");
        setAlunosDetectados([]);
      } else {
        setStatus(`Pronto para importar - ${dados.length} alunos detectados`);
        setAlunosDetectados(dados);
      }
    } catch (erro) {
      console.error("Erro ao analisar PDF:", erro);
      setStatus("Erro ao ler o PDF.");
      setAlunosDetectados([]);
    }
  };

  const handleImportar = async () => {
    if (!escolaSelecionada || alunosDetectados.length === 0) return;

    if (!window.confirm(`Importar ${alunosDetectados.length} alunos para esta escola?`)) return;

    try {
      const alunosCollection = collection(db, "alunos");
      let importados = 0;

      for (const aluno of alunosDetectados) {
        try {
          await addDoc(alunosCollection, aluno);
          importados++;
        } catch (err) {
          console.error("Erro ao importar:", err);
        }
      }

      setStatus(`Importação concluída: ${importados} alunos salvos.`);
      setAlunosDetectados([]);
    } catch (err) {
      console.error("Erro geral:", err);
      setStatus("Erro ao importar alunos.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", width:"100vw", background: "linear-gradient(to bottom, #00264d, #005b96)", padding: "30px" }}>
      <div style={{ background: "#fff", maxWidth: "900px", margin: "0 auto", padding: "30px", borderRadius: "16px" }}>
        <BotaoVoltar />
        <h2 style={{ color: "#1d3557", textAlign: "center", marginBottom: "20px" }}>Importar Alunos por Escola</h2>

        <div style={{ display: "flex", overflowX: "auto", marginBottom: "20px" }}>
          {escolas.map(escola => (
            <button
              key={escola.id}
              onClick={() => setEscolaSelecionada(escola.id)}
              style={{
                padding: "10px 16px",
                marginRight: "8px",
                borderRadius: "8px",
                border: escolaSelecionada === escola.id ? "2px solid #2a9d8f" : "1px solid #ccc",
                backgroundColor: escolaSelecionada === escola.id ? "#2a9d8f" : "#f7f7f7",
                color: escolaSelecionada === escola.id ? "#fff" : "#333",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              {escola.nome}
            </button>
          ))}
        </div>

        <input
          type="file"
          accept=".pdf,.json"
          onChange={handleArquivoChange}
          style={{
            marginBottom: "20px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            width: "100%"
          }}
        />

        {alunosDetectados.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h3>Alunos Detectados:</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Nascimento</th>
                  <th style={thStyle}>Diagnóstico</th>
                  <th style={thStyle}>Turma</th>
                  <th style={thStyle}>Turno</th>
                </tr>
              </thead>
              <tbody>
                {alunosDetectados.map((aluno, index) => (
                  <tr key={index}>
                    <td style={tdStyle}>{aluno.nome}</td>
                    <td style={tdStyle}>{aluno.nascimento}</td>
                    <td style={tdStyle}>{aluno.diagnostico}</td>
                    <td style={tdStyle}>{aluno.turma}</td>
                    <td style={tdStyle}>{aluno.turno}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {alunosDetectados.length > 0 && (
          <button
            onClick={handleImportar}
            style={{
              backgroundColor: "#2a9d8f",
              color: "#fff",
              border: "none",
              padding: "12px",
              borderRadius: "6px",
              width: "100%",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Importar {alunosDetectados.length} Alunos
          </button>
        )}

        {status && (
          <div style={{
            marginTop: "20px",
            padding: "10px",
            borderRadius: "6px",
            backgroundColor: status.includes("Erro") ? "#ffebee" : "#e8f5e9",
            color: status.includes("Erro") ? "#c62828" : "#2e7d32",
            fontWeight: "bold"
          }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}