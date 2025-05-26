import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  getDoc
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import { FaPencilAlt, FaTrashAlt } from "react-icons/fa";

// Função utilitária
const calcularIdade = (dataNascimento) => {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
};

export default function VerAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [formulario, setFormulario] = useState(null);

  const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "{}");
  const podeEditar = ["gestao", "aee"].includes(usuario.perfil);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const escolasSnap = await getDocs(collection(db, "escolas"));
        const escolasList = escolasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEscolas(escolasList);
        setEscolaSelecionada(escolasList[0]?.id || "");

        let alunosSnap;
        if (usuario.perfil === "aee") {
          const vinculoSnap = await getDoc(doc(db, "vinculosProfessores", usuario.uid));
          const vinculo = vinculoSnap.data();
          alunosSnap = await getDocs(query(
            collection(db, "alunos"),
            where("escolaId", "==", vinculo.escolaId),
            where("turma", "in", vinculo.turmas)
          ));
        } else if (usuario.perfil === "gestao") {
          alunosSnap = await getDocs(collection(db, "alunos"));
        } else {
          alunosSnap = await getDocs(query(
            collection(db, "alunos"),
            where("escolaId", "==", localStorage.getItem("escolaAtiva"))
          ));
        }

        setAlunos(alunosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        alert("Erro ao carregar dados.");
      }
    };

    carregarDados();
  }, []);

  const handleSalvar = async () => {
    try {
      if (formulario.id) {
        await updateDoc(doc(db, "alunos", formulario.id), formulario);
      } else {
        await addDoc(collection(db, "alunos"), {
          ...formulario,
          escolaId: escolaSelecionada
        });
      }
      setModalAberto(false);
      window.location.reload();
    } catch (error) {
      alert("Erro ao salvar aluno.");
    }
  };

  const handleExcluir = async (id) => {
    if (window.confirm("Deseja excluir este aluno?")) {
      await deleteDoc(doc(db, "alunos", id));
      window.location.reload();
    }
  };

  const alunosDaEscola = alunos.filter(a => a.escolaId === escolaSelecionada);

  return (
    <div style={{ padding: 20 }}>
      <BotaoVoltar />
      <h2 style={{ color: "#1d3557", marginBottom: 20 }}>Alunos Cadastrados</h2>

      <div style={{ marginBottom: 20 }}>
        {escolas.map(escola => (
          <button
            key={escola.id}
            onClick={() => setEscolaSelecionada(escola.id)}
            style={{
              margin: "0 5px 10px 0",
              padding: "10px 16px",
              borderRadius: "20px",
              border: escolaSelecionada === escola.id ? "2px solid #1d3557" : "1px solid #ccc",
              background: escolaSelecionada === escola.id ? "#1d3557" : "#fff",
              color: escolaSelecionada === escola.id ? "#fff" : "#1d3557",
              fontWeight: escolaSelecionada === escola.id ? "bold" : "normal",
              cursor: "pointer"
            }}
          >
            {escola.nome}
          </button>
        ))}
      </div>

      {podeEditar && (
        <button
          onClick={() => {
            setFormulario({ nome: "", nascimento: "", turma: "", turno: "", diagnostico: "" });
            setModalAberto(true);
          }}
          style={{
            background: "#1d3557",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            fontSize: "16px",
            marginBottom: 20
          }}
        >
          + Novo Aluno
        </button>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {alunosDaEscola.length === 0 ? (
          <p>Nenhum aluno encontrado.</p>
        ) : (
          alunosDaEscola.map(aluno => (
            <div key={aluno.id} style={{
              background: "#fff",
              borderRadius: "10px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              padding: "20px",
              width: "250px"
            }}>
              <h4 style={{ margin: "0 0 10px" }}>{aluno.nome}</h4>
              <p><strong>Turma:</strong> {aluno.turma}</p>
              <p><strong>Turno:</strong> {aluno.turno}</p>
              <p><strong>Idade:</strong> {calcularIdade(aluno.nascimento)}</p>
              <p><strong>Diagnóstico:</strong> {aluno.diagnostico}</p>
              {podeEditar && (
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <button
                    onClick={() => {
                      setFormulario(aluno);
                      setModalAberto(true);
                    }}
                    style={{ background: "#457b9d", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "5px" }}
                  >
                    <FaPencilAlt />
                  </button>
                  <button
                    onClick={() => handleExcluir(aluno.id)}
                    style={{ background: "#e63946", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "5px" }}
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={modalAberto}
        onRequestClose={() => setModalAberto(false)}
        style={{
          content: {
            top: '50%', left: '50%', right: 'auto', bottom: 'auto',
            transform: 'translate(-50%, -50%)', padding: 30, borderRadius: 10
          }
        }}
      >
        <h3>{formulario?.id ? "Editar Aluno" : "Novo Aluno"}</h3>
        <input
          placeholder="Nome"
          value={formulario?.nome || ""}
          onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
          style={{ margin: "10px 0", padding: 10, width: "100%" }}
        />
        <input
          type="date"
          value={formulario?.nascimento || ""}
          onChange={(e) => setFormulario({ ...formulario, nascimento: e.target.value })}
          style={{ margin: "10px 0", padding: 10, width: "100%" }}
        />
        <input
          placeholder="Turma"
          value={formulario?.turma || ""}
          onChange={(e) => setFormulario({ ...formulario, turma: e.target.value })}
          style={{ margin: "10px 0", padding: 10, width: "100%" }}
        />
        <input
          placeholder="Turno"
          value={formulario?.turno || ""}
          onChange={(e) => setFormulario({ ...formulario, turno: e.target.value })}
          style={{ margin: "10px 0", padding: 10, width: "100%" }}
        />
        <input
          placeholder="Diagnóstico"
          value={formulario?.diagnostico || ""}
          onChange={(e) => setFormulario({ ...formulario, diagnostico: e.target.value })}
          style={{ margin: "10px 0", padding: 10, width: "100%" }}
        />
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <button onClick={handleSalvar} style={{ background: "#4CAF50", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6 }}>Salvar</button>
          <button onClick={() => setModalAberto(false)} style={{ background: "#ccc", border: "none", padding: "10px 20px", borderRadius: 6 }}>Cancelar</button>
        </div>
      </Modal>
    </div>
  );
}