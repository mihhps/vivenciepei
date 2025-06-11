import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import * as pdfjsLib from "pdfjs-dist";

// ANOTAÇÃO: Usando a versão moderna do worker que já corrigimos.
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function ImportarAlunos() {
  const [escolas, setEscolas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState("");
  const [status, setStatus] = useState("");
  const [alunosDetectados, setAlunosDetectados] = useState([]);

  const thStyle = {
    padding: "8px",
    textAlign: "left",
    borderBottom: "1px solid #ddd",
    fontWeight: "bold",
  };
  const tdStyle = {
    padding: "8px",
    borderBottom: "1px solid #ddd",
    fontSize: "14px",
  };

  useEffect(() => {
    const carregarEscolas = async () => {
      try {
        const snapshot = await getDocs(collection(db, "escolas"));
        const lista = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEscolas(lista);
        if (lista.length > 0) setEscolaSelecionada(lista[0].id);
      } catch (error) {
        console.error("Erro ao carregar escolas:", error);
        setStatus("Erro ao carregar a lista de escolas.");
      }
    };
    carregarEscolas();
  }, []);

  const formatarDataIso = (dataBr) => {
    if (!dataBr || dataBr.length !== 10) return "";
    const [dia, mes, ano] = dataBr.split("/");
    return `${ano}-${mes}-${dia}`;
  };

  const extrairAlunosDoTexto = (texto) => {
    const linhas = texto.split("\n").filter((l) => l.trim());
    const alunos = [];

    let turmaAtual = "Não identificada";
    let turnoAtual = "Não identificado";

    const regexTurma = /Nome:\s+(.+?)\s+Turno:\s+(Matutino|Vespertino)/;

    // ANOTAÇÃO: Esta é a nova Expressão Regular, mais robusta e flexível.
    const regexAluno =
      /^(\d{5})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+.*?\s+(Enturmada|Finalizada)\s+(.+)\s+(Sim|Não)\s*$/;

    for (const linha of linhas) {
      const matchTurma = linha.match(regexTurma);
      const matchAluno = linha.match(matchTurma ? null : regexAluno); // Evita que a linha da turma seja lida como aluno

      if (matchTurma) {
        turmaAtual = matchTurma[1].trim().replace(/\s+/g, " ");
        turnoAtual = matchTurma[2].trim();
        continue;
      }

      if (matchAluno) {
        // O grupo de captura para deficiência pode pegar a palavra 'Espectro' ou 'Intelectual'
        // e o resto em linhas separadas. Vamos juntar tudo e limpar.
        const deficienciaBruta = matchAluno[5].trim().replace(/\s+/g, " ");

        alunos.push({
          matricula: matchAluno[1].trim(),
          nome: matchAluno[2].trim().replace(/\s+/g, " "),
          nascimento: formatarDataIso(matchAluno[3].trim()),
          situacao: matchAluno[4].trim(),
          deficiencia: deficienciaBruta,
          recursoProva: matchAluno[6].trim(),
          turma: turmaAtual,
          turno: turnoAtual,
          escolaId: escolaSelecionada,
        });
      }
    }
    return alunos;
  };

  const handleArquivoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!escolaSelecionada) {
      alert("Por favor, selecione uma escola primeiro.");
      return;
    }

    setStatus("Analisando PDF...");
    setAlunosDetectados([]);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const typedArray = new Uint8Array(event.target.result);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let textoCompleto = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            textoCompleto +=
              content.items.map((item) => item.str).join(" ") + "\n";
          }

          const dados = extrairAlunosDoTexto(textoCompleto);

          if (dados.length === 0) {
            setStatus(
              "Nenhum aluno encontrado no formato esperado dentro do PDF."
            );
          } else {
            setAlunosDetectados(dados);
            setStatus(
              `${dados.length} alunos detectados e prontos para importação.`
            );
          }
        } catch (error) {
          console.error("Erro ao processar PDF:", error);
          setStatus("Erro ao processar o arquivo PDF.");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (erro) {
      console.error("Erro ao ler arquivo:", erro);
      setStatus("Erro ao ler o arquivo.");
    }
  };

  const handleImportar = async () => {
    if (alunosDetectados.length === 0) {
      alert("Nenhum aluno para importar.");
      return;
    }

    if (
      !window.confirm(
        `Tem certeza que deseja importar ${alunosDetectados.length} alunos para a escola selecionada?`
      )
    ) {
      return;
    }

    setStatus("Importando... Por favor, aguarde.");
    let importadosComSucesso = 0;
    try {
      const alunosCollection = collection(db, "alunos");
      for (const aluno of alunosDetectados) {
        await addDoc(alunosCollection, aluno);
        importadosComSucesso++;
      }
      setStatus(
        `Importação concluída! ${importadosComSucesso} de ${alunosDetectados.length} alunos foram salvos com sucesso.`
      );
      setAlunosDetectados([]);
    } catch (err) {
      console.error("Erro durante a importação:", err);
      setStatus(
        `Erro na importação após salvar ${importadosComSucesso} alunos. Verifique o console.`
      );
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(to bottom, #00264d, #005b96)",
        padding: "30px",
      }}
    >
      <div
        style={{
          background: "#fff",
          maxWidth: "900px",
          margin: "0 auto",
          padding: "30px",
          borderRadius: "16px",
        }}
      >
        <BotaoVoltar />
        <h2
          style={{
            color: "#1d3557",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          Importar Alunos por Escola
        </h2>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              fontWeight: "bold",
              display: "block",
              marginBottom: "8px",
            }}
          >
            1. Selecione a Escola de Destino:
          </label>
          <select
            value={escolaSelecionada}
            onChange={(e) => setEscolaSelecionada(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          >
            <option value="">-- Selecione uma escola --</option>
            {escolas.map((escola) => (
              <option key={escola.id} value={escola.id}>
                {escola.nome}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              fontWeight: "bold",
              display: "block",
              marginBottom: "8px",
            }}
          >
            2. Escolha o arquivo PDF:
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleArquivoChange}
            disabled={!escolaSelecionada}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          />
        </div>

        {status && (
          <div
            style={{
              marginTop: "20px",
              padding: "10px",
              borderRadius: "6px",
              backgroundColor: status.includes("Erro")
                ? "#ffebee"
                : status.includes("detectados")
                ? "#e8f5e9"
                : "#fff3cd",
              color: status.includes("Erro")
                ? "#c62828"
                : status.includes("detectados")
                ? "#2e7d32"
                : "#856404",
              fontWeight: "bold",
            }}
          >
            {status}
          </div>
        )}

        {alunosDetectados.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <h3>Pré-visualização dos Alunos a Serem Importados:</h3>
            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Nome</th>
                    <th style={thStyle}>Nascimento</th>
                    <th style={thStyle}>Turma</th>
                    <th style={thStyle}>Deficiência</th>
                  </tr>
                </thead>
                <tbody>
                  {alunosDetectados.map((aluno, index) => (
                    <tr
                      key={index}
                      style={{
                        backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white",
                      }}
                    >
                      <td style={tdStyle}>{aluno.nome}</td>
                      <td style={tdStyle}>{aluno.nascimento}</td>
                      <td style={tdStyle}>{aluno.turma}</td>
                      <td style={tdStyle}>{aluno.deficiencia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                cursor: "pointer",
                marginTop: "20px",
              }}
            >
              Confirmar e Importar {alunosDetectados.length} Alunos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
