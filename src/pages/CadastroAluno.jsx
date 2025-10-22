// src/pages/CadastroAluno.js (FINAL COM FOTO E PEI CORRIGIDOS E VALIDAÇÕES DE FOTO)

import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import BotaoVoltar from "../components/BotaoVoltar";
import { db, storage } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- Styled Components (MANTIDOS) ---
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background-color: #f4f7f6;
  min-height: 100vh;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
`;

const FormContainer = styled.div`
  background-color: #ffffff;
  padding: 30px 40px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
  position: relative;
`;

const Titulo = styled.h2`
  text-align: center;
  margin-bottom: 25px;
  color: #1d3557;
  font-size: 1.8em;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 15px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 1em;
  box-sizing: border-box;

  &:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    outline: none;
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
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234c51bf' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  cursor: pointer;

  &:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    outline: none;
  }
`;

const BotaoSalvar = styled.button`
  width: 100%;
  padding: 15px;
  background-color: #28a745;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #218838;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const MensagemIdade = styled.p`
  font-size: 0.9em;
  color: #555;
  margin: -10px 0 5px 0;
`;

const FileInputLabel = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
`;

const FileInputContainer = styled.div`
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  background-color: #f9f9f9;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f0f0f0;
  }

  input[type="file"] {
    display: none;
  }
`;

const FileNameDisplay = styled.span`
  display: block;
  margin-top: 10px;
  font-size: 0.9em;
  color: #666;
`;

const ImagePreview = styled.img`
  max-width: 150px;
  max-height: 150px;
  border-radius: 50%;
  object-fit: cover;
  margin: 15px auto 5px auto;
  display: block;
  border: 3px solid #eee;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;
// --- Fim Styled Components ---

// Função para obter o UID do usuário logado do localStorage
const getCurrentUserId = () => {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  return usuarioLogado?.uid || null;
};

async function criarPEIPlaceholderParaAluno(
  alunoId,
  escolaIdDoAluno,
  anoLetivo,
  criadorId
) {
  if (!alunoId || !escolaIdDoAluno || !anoLetivo || !criadorId) {
    console.error("Dados insuficientes para criar PEI placeholder:", {
      alunoId,
      escolaIdDoAluno,
      anoLetivo,
      criadorId,
    });
    return;
  }
  const dadosPEIPlaceholder = {
    alunoId: alunoId,
    escolaId: escolaIdDoAluno,
    anoLetivo: Number(anoLetivo),
    status: "Pendente de Criação",
    criadoEm: serverTimestamp(),
    ultimaModificacao: serverTimestamp(),
    resumoPEI: [],
    criadorId: criadorId,
  };
  try {
    const peiDocRef = await addDoc(collection(db, "peis"), dadosPEIPlaceholder);
    console.log(
      `PEI Placeholder criado para aluno ${alunoId} com ID: ${peiDocRef.id}`
    );
  } catch (e) {
    console.error("Erro ao criar PEI Placeholder: ", e);
    alert(
      "Aluno cadastrado, mas houve um erro ao criar o PEI inicial. Por favor, verifique ou contate o suporte."
    );
  }
}

function CadastroAluno() {
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState("");
  const [turnoExibido, setTurnoExibido] = useState("");
  const [idade, setIdade] = useState("");
  const [escolaIdSelecionada, setEscolaIdSelecionada] = useState("");
  const [listaEscolas, setListaEscolas] = useState([]);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);
  const [loadingEscolas, setLoadingEscolas] = useState(true);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fotoAluno, setFotoAluno] = useState(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState("");

  // Ref para manipular o clique no input file escondido
  const fileInputRef = useRef(null);

  // --- Efeitos e Lógica de Cálculo de Idade ---
  useEffect(() => {
    // ... (Efeito para carregar Escolas) ...
    const fetchEscolas = async () => {
      setLoadingEscolas(true);
      try {
        const escolasSnapshot = await getDocs(collection(db, "escolas"));
        const escolasData = escolasSnapshot.docs.map((doc) => ({
          id: doc.id,
          nome: doc.data().nome || "Escola sem nome",
        }));
        setListaEscolas(escolasData);
      } catch (error) {
        console.error("Erro ao buscar escolas:", error);
        alert("Não foi possível carregar a lista de escolas.");
      } finally {
        setLoadingEscolas(false);
      }
    };
    fetchEscolas();
  }, []);

  useEffect(() => {
    // ... (Efeito para carregar Turmas) ...
    const fetchTurmas = async () => {
      if (!escolaIdSelecionada) {
        setTurmasDisponiveis([]);
        setTurmaSelecionadaId("");
        setTurnoExibido("");
        return;
      }
      setLoadingTurmas(true);
      try {
        const turmasQuery = collection(
          db,
          "escolas",
          escolaIdSelecionada,
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
        setTurmaSelecionadaId("");
        setTurnoExibido("");
      } catch (error) {
        console.error("Erro ao buscar turmas:", error);
        alert("Não foi possível carregar as turmas para a escola selecionada.");
        setTurmasDisponiveis([]);
      } finally {
        setLoadingTurmas(false);
      }
    };

    fetchTurmas();
  }, [escolaIdSelecionada]);

  useEffect(() => {
    // ... (Efeito para preencher o Turno) ...
    if (turmaSelecionadaId && turmasDisponiveis.length > 0) {
      const turma = turmasDisponiveis.find((t) => t.id === turmaSelecionadaId);
      if (turma) {
        setTurnoExibido(turma.turno);
      } else {
        setTurnoExibido("");
      }
    } else {
      setTurnoExibido("");
    }
  }, [turmaSelecionadaId, turmasDisponiveis]);

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
    setNascimento(data);
    setIdade(calcularIdade(data));
  };

  // --- ALTERAÇÃO PRINCIPAL: Validação de Formato e Tamanho/Dimensão ---
  const handleFotoChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      // 1. VALIDAÇÃO DE TAMANHO MÁXIMO (2 MB)
      const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB em bytes
      if (file.size > MAX_FILE_SIZE) {
        alert("A foto é muito grande. O tamanho máximo permitido é de 2MB.");
        e.target.value = null; // Limpa o input
        setFotoAluno(null);
        setFotoPreviewUrl("");
        return;
      }

      // 2. VALIDAÇÃO DE DIMENSÃO MÍNIMA (150x150 pixels)
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const MIN_DIMENSION = 150;

          if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
            alert(
              `A imagem deve ter no mínimo ${MIN_DIMENSION}x${MIN_DIMENSION} pixels. Recomendamos fotos quadradas para o melhor ajuste na visualização de perfil.`
            );
            e.target.value = null;
            setFotoAluno(null);
            setFotoPreviewUrl("");
          } else {
            // Se passou nas validações
            setFotoAluno(file);
            setFotoPreviewUrl(URL.createObjectURL(file));
          }
        };
        img.onerror = () => {
          alert("Não foi possível carregar a imagem para validação.");
          e.target.value = null;
          setFotoAluno(null);
          setFotoPreviewUrl("");
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      setFotoAluno(null);
      setFotoPreviewUrl("");
    }
  };
  // --- FIM DA ALTERAÇÃO PRINCIPAL ---

  // Função para disparar o clique no input file
  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const criadorId = getCurrentUserId();
    if (!criadorId) {
      alert(
        "Erro: ID do usuário logado não encontrado. Por favor, faça login novamente."
      );
      setIsSaving(false);
      return;
    }

    const turmaSelecionadaObj = turmasDisponiveis.find(
      (t) => t.id === turmaSelecionadaId
    );

    if (
      !nome ||
      !nascimento ||
      !diagnostico ||
      !turmaSelecionadaId ||
      !turnoExibido ||
      !escolaIdSelecionada
    ) {
      alert(
        "Preencha todos os campos obrigatórios, incluindo a escola, turma e turno!"
      );
      setIsSaving(false);
      return;
    }

    const anoLetivoParaCadastro = new Date().getFullYear();
    let fotoUrl = "";

    try {
      // 1. Upload da foto, se houver
      if (fotoAluno) {
        const storageRef = ref(
          storage,
          `fotos_alunos/${nome.trim()}_${Date.now()}_${fotoAluno.name}`
        );
        const uploadTask = await uploadBytes(storageRef, fotoAluno);
        fotoUrl = await getDownloadURL(uploadTask.ref);
        console.log("Foto do aluno enviada:", fotoUrl);
      }

      // 2. Salvar dados do aluno no Firestore
      const dadosAlunoParaSalvar = {
        nome: nome.trim(),
        nascimento,
        diagnostico: diagnostico.trim(),
        turma: turmaSelecionadaObj.nome,
        turno: turnoExibido,
        escolaId: escolaIdSelecionada,
        anoLetivoAtivo: anoLetivoParaCadastro,
        dataCadastro: serverTimestamp(),
        fotoUrl: fotoUrl,
      };

      const alunoDocRef = await addDoc(
        collection(db, "alunos"),
        dadosAlunoParaSalvar
      );
      console.log("Aluno cadastrado com ID: ", alunoDocRef.id);

      // 3. Criar PEI Placeholder
      await criarPEIPlaceholderParaAluno(
        alunoDocRef.id,
        dadosAlunoParaSalvar.escolaId,
        anoLetivoParaCadastro,
        criadorId
      );

      alert("Aluno cadastrado e PEI inicial criado com sucesso!");

      // Limpar campos do formulário
      setNome("");
      setNascimento("");
      setDiagnostico("");
      setTurmaSelecionadaId("");
      setTurnoExibido("");
      setIdade("");
      setFotoAluno(null);
      setFotoPreviewUrl("");
    } catch (error) {
      console.error("Erro ao salvar aluno no Firestore:", error);
      alert(
        "Erro ao salvar aluno. Verifique o console para mais detalhes e tente novamente."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer>
      <FormContainer>
        <div style={{ position: "absolute", top: "20px", left: "20px" }}>
          <BotaoVoltar />
        </div>
        <Titulo>Cadastro de Aluno</Titulo>
        <StyledForm onSubmit={handleSalvar}>
          {/* Pré-visualização da Foto */}
          {fotoPreviewUrl && (
            <ImagePreview src={fotoPreviewUrl} alt="Pré-visualização da foto" />
          )}

          {/* Campo de Upload de Foto */}
          <FileInputLabel>Foto do Aluno (opcional):</FileInputLabel>
          <FileInputContainer onClick={handleFileUploadClick}>
            <input
              id="fotoAluno"
              type="file"
              // AQUI ESTÁ A ESPECIFICAÇÃO DE FORMATO
              accept="image/jpeg, image/png, image/webp"
              onChange={handleFotoChange}
              disabled={isSaving}
              ref={fileInputRef}
            />
            {fotoAluno ? (
              <FileNameDisplay>{fotoAluno.name}</FileNameDisplay>
            ) : (
              <span>
                Clique ou arraste para selecionar uma foto
                <br />
                (JPG/PNG/WEBP, máx. 2MB, mín. 150x150)
              </span>
            )}
          </FileInputContainer>

          <Input
            type="text"
            placeholder="Nome Completo do Aluno"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            disabled={isSaving}
          />
          <Input
            type="date"
            value={nascimento}
            onChange={handleNascimentoChange}
            required
            aria-label="Data de Nascimento"
            disabled={isSaving}
          />
          {idade && (
            <MensagemIdade>
              <strong>Idade:</strong> {idade}
            </MensagemIdade>
          )}

          <Input
            type="text"
            placeholder="Diagnóstico (se houver)"
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            disabled={isSaving}
          />
          <Select
            value={escolaIdSelecionada}
            onChange={(e) => {
              setEscolaIdSelecionada(e.target.value);
              setTurmaSelecionadaId("");
              setTurnoExibido("");
            }}
            required
            disabled={loadingEscolas || isSaving}
          >
            <option value="">
              {loadingEscolas ? "Carregando escolas..." : "Selecione a Escola"}
            </option>
            {listaEscolas.map((escola) => (
              <option key={escola.id} value={escola.id}>
                {escola.nome}
              </option>
            ))}
          </Select>

          <Select
            value={turmaSelecionadaId}
            onChange={(e) => setTurmaSelecionadaId(e.target.value)}
            required
            disabled={!escolaIdSelecionada || loadingTurmas || isSaving}
          >
            <option value="">
              {!escolaIdSelecionada
                ? "Selecione uma escola primeiro"
                : loadingTurmas
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

          <Input
            type="text"
            placeholder="Turno (automático)"
            value={turnoExibido}
            readOnly
            disabled={true}
            style={{ backgroundColor: "#f0f0f0", cursor: "not-allowed" }}
          />

          <BotaoSalvar type="submit" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Aluno"}
          </BotaoSalvar>
        </StyledForm>
      </FormContainer>
    </PageContainer>
  );
}

export default CadastroAluno;
