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
  getDoc,
  orderBy
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import { FaPencilAlt, FaTrashAlt, FaPlus } from "react-icons/fa";
import Loader from "../components/Loader";

// Estilos consolidados
const styles = {
  container: {
    minHeight: "100vh",
    background: "#f1f8fc",
    padding: "40px 20px"
  },
  content: {
    maxWidth: "1200px",
    margin: "0 auto"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  title: {
    color: "#1d3557"
  },
  buttonPrimary: {
    background: "#1d3557",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer"
  },
  schoolFilter: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: 30
  },
  schoolButton: (active) => ({
    padding: "10px 16px",
    borderRadius: "20px",
    border: active ? "2px solid #1d3557" : "1px solid #ccc",
    background: active ? "#1d3557" : "#fff",
    color: active ? "#fff" : "#1d3557",
    fontWeight: active ? "bold" : "normal",
    cursor: "pointer"
  }),
  studentGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 20
  },
  studentCard: {
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    padding: "20px",
    width: "260px"
  },
  actionButtons: {
    marginTop: 10,
    display: "flex",
    gap: 10
  },
  editButton: {
    background: "#457b9d",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: "5px",
    cursor: "pointer"
  },
  deleteButton: {
    background: "#e63946",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: "5px",
    cursor: "pointer"
  },
  modalContent: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    padding: 30,
    borderRadius: 10,
    width: '400px',
    maxWidth: '90%'
  },
  inputField: {
    margin: "10px 0",
    padding: 10,
    width: "100%",
    border: "1px solid #ddd",
    borderRadius: "4px"
  },
  modalActions: {
    marginTop: 20,
    display: "flex",
    gap: 10,
    justifyContent: "flex-end"
  },
  saveButton: {
    background: "#4CAF50",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: 6,
    cursor: "pointer"
  },
  cancelButton: {
    background: "#ccc",
    border: "none",
    padding: "10px 20px",
    borderRadius: 6,
    cursor: "pointer"
  }
};

const calcularIdade = (dataNascimento) => {
  if (!dataNascimento) return "N/A";
  
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
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [formulario, setFormulario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || {});
  const podeEditar = ["gestao", "aee"].includes(usuario.perfil);

  useEffect(() => {
    Modal.setAppElement('#root');
    
    const carregarDados = async () => {
      try {
        setLoading(true);
        
        // Carrega escolas
        const escolasSnap = await getDocs(collection(db, "escolas"));
        const escolasList = escolasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEscolas(escolasList);
        
        if (escolasList.length > 0) {
          setEscolaSelecionada(escolasList[0].id);
        }

        // Carrega alunos conforme perfil
        let alunosQuery;
        if (usuario.perfil === "aee") {
          const vinculoSnap = await getDoc(doc(db, "vinculosProfessores", usuario.uid));
          const vinculo = vinculoSnap.data();
          
          if (!vinculo) {
            throw new Error("Você não está vinculado a nenhuma escola/turma");
          }
          
          alunosQuery = query(
            collection(db, "alunos"),
            where("escolaId", "==", vinculo.escolaId),
            where("turma", "in", vinculo.turmas),
            orderBy("nome")
          );
        } else if (usuario.perfil === "gestao") {
          alunosQuery = query(collection(db, "alunos"), orderBy("nome"));
        } else {
          const escolaAtiva = localStorage.getItem("escolaAtiva");
          if (!escolaAtiva) {
            throw new Error("Nenhuma escola selecionada");
          }
          alunosQuery = query(
            collection(db, "alunos"),
            where("escolaId", "==", escolaAtiva),
            orderBy("nome")
          );
        }

        const alunosSnap = await getDocs(alunosQuery);
        setAlunos(alunosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [usuario.perfil, usuario.uid]);

  const handleSalvar = async () => {
    try {
      // Validação dos campos obrigatórios
      if (!formulario?.nome) {
        throw new Error("Nome é obrigatório");
      }
      if (!formulario?.nascimento) {
        throw new Error("Data de nascimento é obrigatória");
      }

      if (formulario.id) {
        // Atualização de aluno existente
        await updateDoc(doc(db, "alunos", formulario.id), formulario);
      } else {
        // Criação de novo aluno
        await addDoc(collection(db, "alunos"), {
          ...formulario,
          escolaId: escolaSelecionada
        });
      }

      // Atualiza a lista de alunos sem recarregar a página
      const alunosSnap = await getDocs(query(collection(db, "alunos"), orderBy("nome")));
      setAlunos(alunosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      setModalAberto(false);
    } catch (error) {
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  const handleExcluir = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este aluno?")) {
      try {
        await deleteDoc(doc(db, "alunos", id));
        
        // Atualiza a lista de alunos sem recarregar a página
        setAlunos(prev => prev.filter(aluno => aluno.id !== id));
      } catch (error) {
        alert("Erro ao excluir aluno");
      }
    }
  };

  const alunosDaEscola = escolaSelecionada 
    ? alunos.filter(a => a.escolaId === escolaSelecionada)
    : [];

  if (loading) return <Loader />;
  if (error) return <div style={styles.container}><p style={{color: "red"}}>{error}</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <BotaoVoltar />
        
        <div style={styles.header}>
          <h2 style={styles.title}>Alunos Cadastrados</h2>
          {podeEditar && (
            <button
              onClick={() => {
                setFormulario({ 
                  nome: "", 
                  nascimento: "", 
                  turma: "", 
                  turno: "", 
                  diagnostico: "" 
                });
                setModalAberto(true);
              }}
              style={styles.buttonPrimary}
            >
              <FaPlus /> Novo Aluno
            </button>
          )}
        </div>

        {escolas.length > 0 && (
          <div style={styles.schoolFilter}>
            {escolas.map(escola => (
              <button
                key={escola.id}
                onClick={() => setEscolaSelecionada(escola.id)}
                style={styles.schoolButton(escolaSelecionada === escola.id)}
              >
                {escola.nome}
              </button>
            ))}
          </div>
        )}

        <div style={styles.studentGrid}>
          {alunosDaEscola.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#555" }}>
              Nenhum aluno cadastrado{escolaSelecionada ? " nesta escola" : ""}.
            </p>
          ) : (
            alunosDaEscola.map(aluno => (
              <div key={aluno.id} style={styles.studentCard}>
                <h4 style={{ marginBottom: 10 }}>{aluno.nome}</h4>
                <p><strong>Turma:</strong> {aluno.turma || "N/A"}</p>
                <p><strong>Turno:</strong> {aluno.turno || "N/A"}</p>
                <p><strong>Idade:</strong> {calcularIdade(aluno.nascimento)}</p>
                <p><strong>Diagnóstico:</strong> {aluno.diagnostico || "N/A"}</p>
                
                {podeEditar && (
                  <div style={styles.actionButtons}>
                    <button
                      onClick={() => {
                        setFormulario(aluno);
                        setModalAberto(true);
                      }}
                      style={styles.editButton}
                      aria-label="Editar aluno"
                    >
                      <FaPencilAlt />
                    </button>
                    <button
                      onClick={() => handleExcluir(aluno.id)}
                      style={styles.deleteButton}
                      aria-label="Excluir aluno"
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
          style={{ content: styles.modalContent }}
          ariaHideApp={false}
        >
          <h3>{formulario?.id ? "Editar Aluno" : "Novo Aluno"}</h3>
          
          {["nome", "nascimento", "turma", "turno", "diagnostico"].map((campo) => (
            <div key={campo}>
              <label htmlFor={campo}>
                {campo.charAt(0).toUpperCase() + campo.slice(1)}:
              </label>
              <input
                id={campo}
                type={campo === "nascimento" ? "date" : "text"}
                value={formulario?.[campo] || ""}
                onChange={(e) => setFormulario({ ...formulario, [campo]: e.target.value })}
                style={styles.inputField}
                required={campo === "nome" || campo === "nascimento"}
              />
            </div>
          ))}
          
          <div style={styles.modalActions}>
            <button 
              onClick={() => setModalAberto(false)} 
              style={styles.cancelButton}
            >
              Cancelar
            </button>
            <button 
              onClick={handleSalvar} 
              style={styles.saveButton}
            >
              Salvar
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}