import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import BotaoVoltar from "../components/BotaoVoltar";
import { FaPencilAlt } from "react-icons/fa";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc
} from "firebase/firestore";

if (document.getElementById('root')) {
  Modal.setAppElement('#root');
}

function calcularIdadeEFaixa(nascimento) {
  if (!nascimento) return ["-", "-"];
  const nasc = new Date(nascimento);
  if (isNaN(nasc.getTime())) return ["-", "-"];
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;

  let faixa = idade <= 3 ? "0-3 anos"
           : idade <= 5 ? "4-5 anos"
           : idade <= 8 ? "6-8 anos"
           : idade <= 11 ? "9-11 anos"
           : "12+ anos";
  return [idade, faixa];
}

function formatarData(dataIso) {
  if (!dataIso) return "-";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}-${mes}-${ano}`;
}

function VerAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [novoAluno, setNovoAluno] = useState({ nome: '', nascimento: '', diagnostico: '', turma: '' });
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [dadosEditados, setDadosEditados] = useState({});

  useEffect(() => {
    const carregarAlunos = async () => {
      try {
        const snapshot = await getDocs(collection(db, "alunos"));
        const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlunos(lista);
      } catch (error) {
        console.error("Erro ao carregar alunos:", error);
        alert("Erro ao carregar alunos.");
      }
    };

    carregarAlunos();
  }, []);

  const salvarAluno = async () => {
    if (!novoAluno.nome || !novoAluno.nascimento || !novoAluno.diagnostico || !novoAluno.turma) {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "alunos"), novoAluno);
      const novo = { ...novoAluno, id: docRef.id };
      setAlunos([...alunos, novo]);
      setModalAberto(false);
      setNovoAluno({ nome: '', nascimento: '', diagnostico: '', turma: '' });
    } catch (error) {
      console.error("Erro ao salvar aluno:", error);
      alert("Erro ao salvar aluno.");
    }
  };

  const salvarEdicao = async () => {
    try {
      const ref = doc(db, "alunos", alunoEditando.id);
      await updateDoc(ref, dadosEditados);

      const atualizados = alunos.map(aluno =>
        aluno.id === alunoEditando.id ? { ...aluno, ...dadosEditados } : aluno
      );
      setAlunos(atualizados);
      setAlunoEditando(null);
    } catch (error) {
      console.error("Erro ao editar aluno:", error);
      alert("Erro ao salvar edição.");
    }
  };

  const excluirAluno = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este aluno?")) return;

    try {
      await deleteDoc(doc(db, "alunos", id));
      const atualizados = alunos.filter(aluno => aluno.id !== id);
      setAlunos(atualizados);
    } catch (error) {
      console.error("Erro ao excluir aluno:", error);
      alert("Erro ao excluir aluno.");
    }
  };

  return (
    <div style={{ padding: "10px", backgroundColor: "#f7f9fb", width: "100vw", minHeight: "100vh" }}>
      <BotaoVoltar />
      <h2 style={{ textAlign: "center", marginBottom: "20px", color: "#1d3557" }}>Alunos Cadastrados</h2>
      <button style={botaoAbrir} onClick={() => setModalAberto(true)}>+ Novo Aluno</button>

      {alunos.length === 0 ? (
        <p style={{ textAlign: 'center', color: "#555" }}>Nenhum aluno cadastrado ainda.</p>
      ) : (
        <div style={listStyle}>
          {alunos.map((aluno) => {
            const [idade, faixa] = calcularIdadeEFaixa(aluno.nascimento);
            return (
              <div key={aluno.id} style={cartao}>
                <h3 style={{ color: "#1d3557" }}>{aluno.nome}</h3>
                <p><strong>Turma:</strong> {aluno.turma}</p>
                <p><strong>Data de Nascimento:</strong> {formatarData(aluno.nascimento)}</p>
                <p><strong>Idade:</strong> {idade} anos ({faixa})</p>
                <p><strong>Diagnóstico:</strong> {aluno.diagnostico}</p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button style={btnIcone} onClick={() => {
                    setAlunoEditando(aluno);
                    setDadosEditados({ ...aluno });
                  }}>
                    <FaPencilAlt /> Editar
                  </button>
                  <button style={btnExcluir} onClick={() => excluirAluno(aluno.id)}>Excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para adicionar novo aluno */}
      <Modal
        isOpen={modalAberto}
        onRequestClose={() => setModalAberto(false)}
        contentLabel="Cadastro de Aluno"
        style={{ content: modalContent }}
      >
        <h3>Cadastro de Aluno</h3>
        <input type="text" placeholder="Nome" style={input} value={novoAluno.nome} onChange={(e) => setNovoAluno({ ...novoAluno, nome: e.target.value })} />
        <input type="date" style={input} value={novoAluno.nascimento} onChange={(e) => setNovoAluno({ ...novoAluno, nascimento: e.target.value })} />
        <input type="text" placeholder="Diagnóstico" style={input} value={novoAluno.diagnostico} onChange={(e) => setNovoAluno({ ...novoAluno, diagnostico: e.target.value })} />
        <input type="text" placeholder="Turma" style={input} value={novoAluno.turma} onChange={(e) => setNovoAluno({ ...novoAluno, turma: e.target.value })} />
        <button onClick={salvarAluno} style={botaoSalvar}>Salvar</button>
        <button onClick={() => setModalAberto(false)} style={botaoCancelar}>Cancelar</button>
      </Modal>

      {/* Modal de edição */}
      {alunoEditando && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>Editar Aluno</h3>
            <input type="text" value={dadosEditados.nome} onChange={(e) => setDadosEditados({ ...dadosEditados, nome: e.target.value })} style={input} />
            <input type="date" value={dadosEditados.nascimento} onChange={(e) => setDadosEditados({ ...dadosEditados, nascimento: e.target.value })} style={input} />
            <input type="text" value={dadosEditados.diagnostico} onChange={(e) => setDadosEditados({ ...dadosEditados, diagnostico: e.target.value })} style={input} />
            <input type="text" value={dadosEditados.turma} onChange={(e) => setDadosEditados({ ...dadosEditados, turma: e.target.value })} style={input} />
            <div style={{ marginTop: "20px" }}>
              <button style={btnSalvar} onClick={salvarEdicao}>Salvar</button>
              <button style={btnCancelar} onClick={() => setAlunoEditando(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Estilos ===
const cartao = {
  backgroundColor: '#fff',
  color: '#000',
  borderRadius: '10px',
  padding: '15px',
  width: '260px',
  boxShadow: '0 0 10px rgba(0,0,0,0.1)',
};

const listStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '20px',
  justifyContent: 'center',
  marginTop: '30px',
};

const input = {
  width: '100%',
  padding: '10px',
  marginBottom: '15px',
  borderRadius: '6px',
  border: '1px solid #ccc',
};

const botaoAbrir = {
  backgroundColor: '#1d3557',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '10px 20px',
  cursor: 'pointer',
};

const botaoSalvar = {
  backgroundColor: '#4CAF50',
  color: '#fff',
  width: '100%',
  padding: '12px',
  border: 'none',
  borderRadius: '6px',
  marginBottom: '10px',
  cursor: 'pointer'
};

const botaoCancelar = {
  backgroundColor: '#ccc',
  color: '#333',
  width: '100%',
  padding: '12px',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer'
};

const btnIcone = {
  backgroundColor: '#457b9d',
  color: '#fff',
  border: 'none',
  padding: '8px 12px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '14px'
};

const btnExcluir = {
  ...btnIcone,
  backgroundColor: '#e63946',
};

const modalOverlay = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalContent = {
  backgroundColor: '#fff',
  padding: '30px',
  borderRadius: '8px',
  width: '400px',
  boxShadow: '0 0 15px rgba(0,0,0,0.2)',
  textAlign: 'center',
};

const btnSalvar = {
  ...btnIcone,
  backgroundColor: '#4CAF50',
  marginRight: '10px'
};

const btnCancelar = {
  ...btnIcone,
  backgroundColor: '#9e9e9e',
};

export default VerAlunos;