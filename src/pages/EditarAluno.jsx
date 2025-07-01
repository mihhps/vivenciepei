// src/pages/editaraluno.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar";
import styled from "styled-components";

// --- Styled Components ---
const FormContainer = styled.div`
  max-width: 500px;
  margin: 0 auto;
  background-color: #ffffff;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 15px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 1em;
  box-sizing: border-box;
  margin-bottom: 15px;

  &:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    outline: none;
  }

  &:disabled {
    background-color: #f0f0f0;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 15px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 1em;
  background-color: white;
  box-sizing: border-box;
  margin-bottom: 15px;

  &:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    outline: none;
  }

  &:disabled {
    background-color: #f0f0f0;
    cursor: not-allowed;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
`;

const BotaoSalvar = styled.button`
  background-color: #4caf50;
  color: #fff;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #45a049;
  }
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;
// --- Fim Styled Components ---

function EditarAluno() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [alunoData, setAlunoData] = useState(null);
  const [escolaIdDoAluno, setEscolaIdDoAluno] = useState("");
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState("");
  const [turnoExibido, setTurnoExibido] = useState("");
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);

  const [carregandoDadosAluno, setCarregandoDadosAluno] = useState(true);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Efeito 1: Carregar os dados do Aluno ---
  useEffect(() => {
    async function buscarAluno() {
      setCarregandoDadosAluno(true);
      try {
        const docRef = doc(db, "alunos", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          alert("Aluno não encontrado.");
          navigate("/ver-alunos");
          return;
        }

        const data = docSnap.data();
        setAlunoData(data);

        if (data.escolaId) {
          setEscolaIdDoAluno(data.escolaId);
        } else {
          console.warn(
            "Aluno sem escolaId definido. Não será possível carregar turmas por escola."
          );
        }
      } catch (erro) {
        console.error("Erro ao buscar aluno:", erro);
        alert("Erro ao carregar dados do aluno.");
        navigate("/ver-alunos");
      } finally {
        setCarregandoDadosAluno(false);
      }
    }

    buscarAluno();
  }, [id, navigate]);

  // --- Efeito 2: Carregar Turmas baseadas na Escola do Aluno (após o aluno ser carregado) ---
  useEffect(() => {
    const fetchTurmasDaEscola = async () => {
      if (!escolaIdDoAluno) {
        setTurmasDisponiveis([]);
        setTurmaSelecionadaId("");
        setTurnoExibido("");
        return;
      }

      setCarregandoTurmas(true);
      try {
        const turmasQuery = collection(
          db,
          "escolas",
          escolaIdDoAluno,
          "turmas"
        );
        const turmasSnapshot = await getDocs(turmasQuery);
        const turmasData = turmasSnapshot.docs.map((doc) => ({
          id: doc.id,
          nome: doc.data().nome,
          turno: doc.data().turno,
        }));
        setTurmasDisponiveis(
          turmasData.sort((a, b) => a.nome.localeCompare(b.nome))
        );

        if (alunoData && alunoData.turma) {
          const turmaExistente = turmasData.find(
            (t) => t.nome === alunoData.turma && t.turno === alunoData.turno
          );
          if (turmaExistente) {
            setTurmaSelecionadaId(turmaExistente.id);
            setTurnoExibido(turmaExistente.turno);
          } else {
            console.warn(
              `Turma "${alunoData.turma}" (${alunoData.turno}) do aluno NÃO encontrada nas turmas padronizadas da escola.`
            );
            setTurmaSelecionadaId("");
            setTurnoExibido(alunoData.turno || "");
          }
        } else {
          setTurmaSelecionadaId("");
          setTurnoExibido("");
        }
      } catch (error) {
        console.error("Erro ao buscar turmas da escola:", error);
        alert("Não foi possível carregar as turmas para a escola do aluno.");
        setTurmasDisponiveis([]);
        setTurmaSelecionadaId("");
        setTurnoExibido("");
      } finally {
        setCarregandoTurmas(false);
      }
    };

    if (!carregandoDadosAluno) {
      fetchTurmasDaEscola();
    }
  }, [escolaIdDoAluno, carregandoDadosAluno, alunoData]);

  // --- Efeito 3: Atualizar Turno Exibido ao Mudar Turma Selecionada ---
  useEffect(() => {
    if (turmaSelecionadaId && turmasDisponiveis.length > 0) {
      const turma = turmasDisponiveis.find((t) => t.id === turmaSelecionadaId);
      if (turma) {
        setTurnoExibido(turma.turno);
      } else {
        setTurnoExibido("");
      }
    } else if (alunoData && !turmaSelecionadaId && !carregandoTurmas) {
      setTurnoExibido(alunoData.turno || "");
    }
  }, [turmaSelecionadaId, turmasDisponiveis, alunoData, carregandoTurmas]);

  // --- Funções de Manipulação ---
  const handleCampoChange = (e) => {
    const { name, value } = e.target;
    setAlunoData({ ...alunoData, [name]: value });
  };

  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return "";
    const hoje = new Date();
    const [ano, mes, dia] = dataNasc.split("-").map(Number);
    const dataDeNascimento = new Date(ano, mes - 1, dia);
    let idadeCalculada = hoje.getFullYear() - dataDeNascimento.getFullYear();
    const m = hoje.getMonth() - dataDeNascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < dataDeNascimento.getDate())) {
      idadeCalculada--;
    }
    return `${idadeCalculada} anos`;
  };

  const handleNascimentoChange = (e) => {
    const data = e.target.value;
    setAlunoData({ ...alunoData, nascimento: data });
  };

  const salvar = async () => {
    setIsSaving(true);
    const turmaSelecionadaObj = turmasDisponiveis.find(
      (t) => t.id === turmaSelecionadaId
    );

    if (
      !alunoData ||
      !alunoData.nome ||
      !alunoData.nascimento ||
      !escolaIdDoAluno ||
      !turmaSelecionadaObj ||
      !turnoExibido
    ) {
      alert(
        "Por favor, preencha todos os campos obrigatórios (Nome, Nascimento, Escola, Turma e Turno)."
      );
      setIsSaving(false);
      return;
    }

    try {
      const docRef = doc(db, "alunos", id);
      const dadosParaAtualizar = {
        ...alunoData,
        turma: turmaSelecionadaObj.nome,
        turno: turnoExibido,
        turmaId: turmaSelecionadaObj.id,
      };
      await updateDoc(docRef, dadosParaAtualizar);
      alert("Dados atualizados com sucesso!");
      navigate("/ver-alunos");
    } catch (erro) {
      console.error("Erro ao salvar dados do aluno:", erro);
      alert("Erro ao salvar dados. Verifique o console.");
    } finally {
      setIsSaving(false);
    }
  };

  if (carregandoDadosAluno)
    return (
      <p style={{ textAlign: "center", marginTop: 40 }}>
        Carregando dados do aluno...
      </p>
    );
  if (!alunoData)
    return (
      <p style={{ textAlign: "center", marginTop: 40 }}>
        Erro: Dados do aluno não disponíveis.
      </p>
    );

  return (
    <div
      style={{
        padding: "40px",
        backgroundColor: "#f7f7f7",
        minHeight: "100vh",
      }}
    >
      <BotaoVoltar />
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        Editar Aluno
      </h2>

      <FormContainer>
        <Label htmlFor="nome">Nome:</Label>
        <Input
          id="nome"
          type="text"
          name="nome"
          value={alunoData.nome}
          onChange={handleCampoChange}
          disabled={isSaving}
        />

        <Label htmlFor="nascimento">Data de Nascimento:</Label>
        <Input
          id="nascimento"
          type="date"
          name="nascimento"
          value={alunoData.nascimento}
          onChange={handleNascimentoChange}
          disabled={isSaving}
        />
        {alunoData.nascimento && (
          <p
            style={{
              fontSize: "0.9em",
              color: "#555",
              marginTop: "-10px",
              marginBottom: "15px",
            }}
          >
            <strong>Idade:</strong> {calcularIdade(alunoData.nascimento)}
          </p>
        )}

        <Label htmlFor="diagnostico">Diagnóstico:</Label>
        <Input
          id="diagnostico"
          type="text"
          name="diagnostico"
          value={alunoData.diagnostico}
          onChange={handleCampoChange}
          disabled={isSaving}
        />

        <Label htmlFor="turma">Escola do Aluno:</Label>
        <Input
          id="escola"
          type="text"
          value={
            alunoData.escolaId
              ? `ID: ${alunoData.escolaId}`
              : "Escola não definida"
          }
          readOnly
          disabled
          style={{ backgroundColor: "#e9ecef", cursor: "not-allowed" }}
        />

        <Label htmlFor="turmaSelect">Turma:</Label>
        <Select
          id="turmaSelect"
          name="turma"
          value={turmaSelecionadaId}
          onChange={(e) => setTurmaSelecionadaId(e.target.value)}
          disabled={!escolaIdDoAluno || carregandoTurmas || isSaving}
        >
          <option value="">
            {!escolaIdDoAluno
              ? "Escola do aluno não definida"
              : carregandoTurmas
                ? "Carregando turmas..."
                : turmasDisponiveis.length === 0
                  ? "Nenhuma turma cadastrada para esta escola"
                  : "Selecione a Turma"}
          </option>
          {turmasDisponiveis.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}
            </option>
          ))}
        </Select>

        <Label htmlFor="turnoInput">Turno:</Label>
        <Input
          id="turnoInput"
          type="text"
          name="turno"
          value={turnoExibido}
          readOnly
          disabled
          style={{ backgroundColor: "#f0f0f0", cursor: "not-allowed" }}
        />

        <BotaoSalvar onClick={salvar} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar"}
        </BotaoSalvar>
      </FormContainer>
    </div>
  );
}

export default EditarAluno;
