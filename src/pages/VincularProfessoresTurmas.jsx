import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  doc
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";

export default function VincularProfessoresTurmas() {
  const [professores, setProfessores] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]);
  const [vinculoAtual, setVinculoAtual] = useState(null);

  useEffect(() => {
   const carregarProfessores = async () => {
  const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
  const snap = await getDocs(collection(db, "usuarios"));
  const escolaAtiva = localStorage.getItem("escolaAtiva");

  let lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));


  const perfilOuCargo = (usuario.perfil || usuario.cargo || "").toLowerCase();

// Apenas aplica filtro para professores comuns
const deveFiltrar = perfilOuCargo !== "seme" && perfilOuCargo !== "gestao";

if (deveFiltrar) {
  lista = lista.filter(p =>
    p.escolas &&
    typeof p.escolas === "object" &&
    Object.keys(p.escolas).includes(escolaAtiva)
  );
}

  console.log("Professores filtrados por escola ativa:", lista);
  setProfessores(lista);
};



    carregarProfessores();
  }, []);
const carregarTurmas = async (escolaId) => {
  console.log("Escola usada para buscar turmas:", escolaId);
  if (!escolaId) return;

  const snap = await getDocs(collection(db, "alunos"));
  const turmasUnicas = new Set();

  snap.docs.forEach(doc => {
    const aluno = doc.data();
    if (aluno.escolaId === escolaId && aluno.turma) {
      turmasUnicas.add(aluno.turma);
    }
  });

  setTurmas(Array.from(turmasUnicas).sort());
};
  const carregarVinculo = async (professor) => {
    const docRef = doc(db, "vinculosProfessores", professor.id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const dados = snap.data();
      setTurmasSelecionadas(dados.turmas || []);
      setVinculoAtual(dados);
    } else {
      setTurmasSelecionadas([]);
      setVinculoAtual(null);
    }
  };

  const handleSelecionarProfessor = async (id) => {
    const prof = professores.find(p => p.id === id);
    if (!prof) return;

   let escolaNome = "Não informada";
const escolasIds = Object.keys(prof.escolas || {});
const primeiraEscolaId = escolasIds[0];

if (primeiraEscolaId) {
  const escolaSnap = await getDoc(doc(db, "escolas", primeiraEscolaId));
  if (escolaSnap.exists()) {
    escolaNome = escolaSnap.data().nome;
  }
}

    setSelecionado({ ...prof, escolaNome });
    await carregarTurmas(primeiraEscolaId);
    const turmasObj = prof.turmas || {};
const turmasMarcadas = Object.keys(turmasObj).filter(t => turmasObj[t]);
setTurmasSelecionadas(turmasMarcadas);
  };

  const handleSalvar = async () => {
  if (!selecionado) return;

  try {
    // Monta objeto como { "Pré II A": true, "1º ano B": true }
    const turmasObj = {};
    turmasSelecionadas.forEach(turma => {
      turmasObj[turma] = true;
    });

    await updateDoc(doc(db, "usuarios", selecionado.id), {
      turmas: turmasObj
    });

    alert("Vínculo de turmas atualizado com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar turmas:", error);
    alert("Erro ao salvar turmas.");
  }
};

  const gerarRelatorio = async () => {
    const snap = await getDocs(collection(db, "vinculosProfessores"));
    const escolasSnap = await getDocs(collection(db, "escolas"));

    const escolasMap = {};
    escolasSnap.docs.forEach(doc => {
      escolasMap[doc.id] = doc.data().nome;
    });

    const linhasCSV = [
      ["Professor", "Escola", "Turmas vinculadas"]
    ];

    snap.forEach(doc => {
      const d = doc.data();
      linhasCSV.push([
        d.nome,
        escolasMap[d.escolaId] || "Desconhecida",
        (d.turmas || []).join(" / ")
      ]);
    });

    const csv = linhasCSV.map(l => l.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "relatorio_vinculos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      background: "linear-gradient(to bottom, #00264d, #005b96)",
      padding: "40px"
    }}>
      <div style={{
        background: "#fff",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
      }}>
        <BotaoVoltar />
        <h2 style={{ color: "#1d3557", marginBottom: "20px", textAlign: "center" }}>
          Vincular Professores às Turmas
        </h2>

        <label style={{ fontWeight: "bold" }}>Selecione um professor:</label>
        <select
          onChange={(e) => handleSelecionarProfessor(e.target.value)}
          value={selecionado?.id || ""}
          style={{
            padding: 10,
            marginBottom: 20,
            width: "100%",
            borderRadius: "6px",
            border: "1px solid #ccc"
          }}
        >
          <option value="">Selecione...</option>
          {professores.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>

        {selecionado && (
          <>
            <p><strong>Escola:</strong> {selecionado.escolaNome || "Não informada"}</p>

            <p><strong>Turmas disponíveis:</strong></p>
            {turmas.map(turma => (
              <div key={turma}>
                <label>
                  <input
                    type="checkbox"
                    checked={turmasSelecionadas.includes(turma)}
                    onChange={(e) => {
                      const atualizadas = e.target.checked
                        ? [...turmasSelecionadas, turma]
                        : turmasSelecionadas.filter(t => t !== turma);
                      setTurmasSelecionadas(atualizadas);
                    }}
                  />
                  {" "}{turma}
                </label>
              </div>
            ))}

            <button
              onClick={handleSalvar}
              style={{
                marginTop: 20,
                padding: "10px 20px",
                backgroundColor: "#2a9d8f",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Salvar Vínculo
            </button>

            {vinculoAtual && (
              <div style={{ marginTop: 20 }}>
                <p><strong>Turmas atualmente vinculadas:</strong></p>
                <ul>
                  {vinculoAtual.turmas.map((turma, index) => (
                    <li key={index}>{turma}</li>
                  ))}
                </ul>
              </div>
            )}

            <hr style={{ margin: "30px 0" }} />

            <button
              onClick={gerarRelatorio}
              style={{
                padding: "10px 20px",
                backgroundColor: "#1d3557",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Exportar Relatório de Vínculos (CSV)
            </button>
          </>
        )}
      </div>
    </div>
  );
}