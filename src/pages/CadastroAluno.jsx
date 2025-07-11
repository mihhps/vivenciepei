// src/pages/CadastroAluno.js (MODIFICADO)

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import BotaoVoltar from "../components/BotaoVoltar";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
} from "firebase/firestore";

// --- Styled Components (Mantenha os mesmos que você já tem ou do exemplo anterior) ---
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
// --- Fim Styled Components ---

async function criarPEIPlaceholderParaAluno(
  alunoId,
  escolaIdDoAluno,
  anoLetivo
) {
  if (!alunoId || !escolaIdDoAluno || !anoLetivo) {
    console.error("Dados insuficientes para criar PEI placeholder:", {
      alunoId,
      escolaIdDoAluno,
      anoLetivo,
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
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState(""); // Agora guarda o ID da turma
  const [turnoExibido, setTurnoExibido] = useState(""); // Exibe o turno da turma selecionada
  const [idade, setIdade] = useState("");
  const [escolaIdSelecionada, setEscolaIdSelecionada] = useState("");
  const [listaEscolas, setListaEscolas] = useState([]);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([]); // Lista de objetos { id, nome, turno }
  const [loadingEscolas, setLoadingEscolas] = useState(true);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Efeito para carregar Escolas ---
  useEffect(() => {
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

  // --- Efeito para carregar Turmas baseadas na Escola Selecionada ---
  useEffect(() => {
    const fetchTurmas = async () => {
      if (!escolaIdSelecionada) {
        setTurmasDisponiveis([]);
        setTurmaSelecionadaId("");
        setTurnoExibido("");
        return;
      }
      setLoadingTurmas(true);
      try {
        // Busca turmas da SUBCOLEÇÃO 'turmas' dentro da escola selecionada
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
          turno: doc.data().turno, // Importante: pegar o turno da turma
        }));
        setTurmasDisponiveis(
          turmasData.sort((a, b) => a.nome.localeCompare(b.nome))
        );
        setTurmaSelecionadaId(""); // Reseta a seleção da turma
        setTurnoExibido(""); // Limpa o turno ao mudar a escola
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

  // --- Efeito para preencher o Turno automaticamente ao selecionar a Turma ---
  useEffect(() => {
    if (turmaSelecionadaId && turmasDisponiveis.length > 0) {
      const turma = turmasDisponiveis.find((t) => t.id === turmaSelecionadaId);
      if (turma) {
        setTurnoExibido(turma.turno);
      } else {
        setTurnoExibido("");
      }
    } else {
      setTurnoExibido(""); // Limpa se nenhuma turma estiver selecionada
    }
  }, [turmaSelecionadaId, turmasDisponiveis]);

  // --- Funções de Manipulação ---
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

  const handleSalvar = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const turmaSelecionadaObj = turmasDisponiveis.find(
      (t) => t.id === turmaSelecionadaId
    );

    if (
      !nome ||
      !nascimento ||
      !diagnostico ||
      !turmaSelecionadaId || // Agora verificamos o ID da turma
      !turnoExibido || // Verificamos se o turno foi preenchido automaticamente
      !escolaIdSelecionada
    ) {
      alert(
        "Preencha todos os campos obrigatórios, incluindo a escola, turma e turno!"
      );
      setIsSaving(false);
      return;
    }

    const anoLetivoParaCadastro = new Date().getFullYear();

    try {
      const dadosAlunoParaSalvar = {
        nome: nome.trim(),
        nascimento,
        diagnostico: diagnostico.trim(),
        // Salva o NOME da turma e o TURNO associado a ela
        turma: turmaSelecionadaObj.nome,
        turno: turnoExibido,
        escolaId: escolaIdSelecionada,
        anoLetivoAtivo: anoLetivoParaCadastro,
        dataCadastro: serverTimestamp(),
      };

      const alunoDocRef = await addDoc(
        collection(db, "alunos"),
        dadosAlunoParaSalvar // CORRIGIDO: Era 'dadosAlunoParaSalvos'
      );
      console.log("Aluno cadastrado com ID: ", alunoDocRef.id);

      await criarPEIPlaceholderParaAluno(
        alunoDocRef.id,
        dadosAlunoParaSalvar.escolaId,
        anoLetivoParaCadastro
      );

      alert("Aluno cadastrado e PEI inicial criado com sucesso!");

      // Limpar campos do formulário
      setNome("");
      setNascimento("");
      setDiagnostico("");
      setTurmaSelecionadaId("");
      setTurnoExibido("");
      setIdade("");
      // setEscolaIdSelecionada(""); // Descomente se quiser limpar a escola também
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
              setTurmaSelecionadaId(""); // Reseta a turma ao mudar a escola
              setTurnoExibido(""); // Reseta o turno
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

          {/* Select para Turma (Agora busca da subcoleção da escola) */}
          <Select
            value={turmaSelecionadaId} // Usa o ID da turma selecionada
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

          {/* Campo de Turno (Apenas para exibição, preenchido automaticamente) */}
          <Input
            type="text"
            placeholder="Turno (automático)"
            value={turnoExibido}
            readOnly // Não permite edição manual
            disabled={true} // Mantém desabilitado
            style={{ backgroundColor: "#f0f0f0", cursor: "not-allowed" }} // Estilo para indicar que é readOnly
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
