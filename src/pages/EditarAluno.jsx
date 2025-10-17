// src/pages/editaraluno.jsx

import React, { useEffect, useState, useRef } from "react"; // NOVO: useRef
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // NOVO: Import do Storage
import { db, storage } from "../firebase"; // NOVO: Import do objeto storage
import BotaoVoltar from "../components/BotaoVoltar";
import styled from "styled-components";
import { FaUpload } from "react-icons/fa"; // NOVO: Ícone de upload

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

// NOVOS STYLED COMPONENTS PARA FOTO
const PhotoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
`;

const PhotoDisplay = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 15px;
  border: 4px solid #457b9d; /* Borda para destaque */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
`;

const UploadButton = styled.button`
  background-color: #457b9d;
  color: white;
  padding: 8px 15px;
  border: none;
  border-radius: 6px;
  font-size: 0.9em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #386782;
  }
  input[type="file"] {
    display: none;
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

  // NOVO ESTADO: Gerencia a nova foto e a pré-visualização
  const [novaFotoArquivo, setNovaFotoArquivo] = useState(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState("");
  const fileInputRef = useRef(null); // Ref para o input file

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

        // CARREGA A FOTO EXISTENTE PARA PRÉ-VISUALIZAÇÃO
        if (data.fotoUrl) {
          setFotoPreviewUrl(data.fotoUrl);
        }

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

  // NOVO: Manipulador de alteração de foto
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNovaFotoArquivo(file);
      setFotoPreviewUrl(URL.createObjectURL(file)); // Pré-visualização do novo arquivo
    } else {
      setNovaFotoArquivo(null);
      // Volta para a URL original do banco de dados se o usuário cancelar
      setFotoPreviewUrl(alunoData.fotoUrl || "");
    }
  };

  // NOVO: Função para disparar o clique do input file
  const handleUploadButtonClick = () => {
    fileInputRef.current.click();
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
    let novaFotoUrl = alunoData.fotoUrl || ""; // Assume a URL existente

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
      // 1. Upload da Nova Foto (SE HOUVER)
      if (novaFotoArquivo) {
        const storageRef = ref(
          storage,
          `fotos_alunos/${id}_${Date.now()}_${novaFotoArquivo.name}`
        );
        const uploadTask = await uploadBytes(storageRef, novaFotoArquivo);
        novaFotoUrl = await getDownloadURL(uploadTask.ref);
        console.log("Nova foto enviada:", novaFotoUrl);
      }

      // 2. Montar Dados para Atualização
      const docRef = doc(db, "alunos", id);
      const dadosParaAtualizar = {
        ...alunoData,
        // Garante que o nome da turma e turno sejam salvos
        turma: turmaSelecionadaObj.nome,
        turno: turnoExibido,
        // Adiciona a nova URL da foto (ou a antiga, se o upload não ocorreu)
        fotoUrl: novaFotoUrl,
      };

      // Remove campos que não devem ser salvos diretamente no doc se houver
      delete dadosParaAtualizar.escolaId;

      // 3. Atualizar Firestore
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
        Editar Aluno: {alunoData.nome}
      </h2>

      <FormContainer>
        {/* --- NOVO BLOCO: VISUALIZAÇÃO E UPLOAD DE FOTO --- */}
        <PhotoWrapper>
          <PhotoDisplay
            src={
              fotoPreviewUrl || "https://via.placeholder.com/120?text=Sem+Foto"
            }
            alt={`Foto de ${alunoData.nome}`}
          />
          <UploadButton onClick={handleUploadButtonClick} disabled={isSaving}>
            <FaUpload /> {novaFotoArquivo ? "Trocar Foto" : "Adicionar Foto"}
            <input
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              ref={fileInputRef}
              disabled={isSaving}
            />
          </UploadButton>
          {novaFotoArquivo && (
            <p style={{ fontSize: "0.85em", color: "green", marginTop: "5px" }}>
              Nova foto pronta para ser salva!
            </p>
          )}
        </PhotoWrapper>
        {/* --- FIM DO BLOCO FOTO --- */}

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

        <Label htmlFor="escolaInput">Escola do Aluno:</Label>
        <Input
          id="escolaInput"
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
