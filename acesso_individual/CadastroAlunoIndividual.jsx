import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";

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

const MensagemAlerta = styled.div`
  padding: 10px;
  background-color: #ffc107;
  color: #333;
  border-radius: 6px;
  margin-bottom: 15px;
  text-align: center;
  font-weight: bold;
`;
// --- Fim Styled Components ---

// --- CONSTANTES E FUNÇÕES DO NOVO FLUXO ---

// ROTA DE RETORNO ADAPTADA
const ROTA_PAINEL_INDIVIDUAL = "/painel-individual";

// FUNÇÃO CRIAR PEI PLACEHOLDER (adaptada para usar constantes)
async function criarPEIPlaceholderParaAluno(
  alunoDocRef,
  alunoNome,
  emailCriador
) {
  const anoLetivo = new Date().getFullYear();
  const dadosPEIPlaceholder = {
    alunoId: alunoDocRef.id,
    aluno: alunoNome,
    turma: "Individual", // Valor Fixo
    escolaId: "INDIVIDUAL", // Valor Fixo
    anoLetivo: Number(anoLetivo),
    status: "Pendente de Criação",
    criadorId: emailCriador,
    criadoEm: serverTimestamp(),
    ultimaModificacao: serverTimestamp(),
    resumoPEI: [],
  };
  try {
    const peiDocRef = await addDoc(collection(db, "peis"), dadosPEIPlaceholder);
    console.log(
      `PEI Placeholder criado para aluno ${alunoDocRef.id} com ID: ${peiDocRef.id}`
    );
  } catch (e) {
    console.error("Erro ao criar PEI Placeholder: ", e);
    alert(
      "Aluno cadastrado, mas houve um erro ao criar o PEI inicial. Por favor, verifique ou contate o suporte."
    );
  }
}

// FUNÇÃO CRÍTICA: Verifica o limite do plano do professor
const verificarLimitePlano = async (emailProfessor) => {
  // 1. **OBTER O LIMITE DO PLANO:**
  // ESTE PASSO DEPENDE DO SEU SISTEMA DE ASSINATURA/PLANO.
  // Por exemplo, buscar em uma coleção 'professores' ou 'planos' no Firebase.

  // *** SIMULAÇÃO: No plano atual, o limite é 10 alunos ***
  const LIMITE_ALUNOS = 10;
  // *******************************************************

  // 2. **CONTAR ALUNOS ATUAIS:**
  const q = query(
    collection(db, "alunos"),
    where("criadorId", "==", emailProfessor)
  );
  const snapshot = await getDocs(q);
  const alunosAtuais = snapshot.size;

  if (alunosAtuais >= LIMITE_ALUNOS) {
    return {
      podeCadastrar: false,
      limite: LIMITE_ALUNOS,
      alunosAtuais: alunosAtuais,
    };
  }

  return {
    podeCadastrar: true,
    limite: LIMITE_ALUNOS,
    alunosAtuais: alunosAtuais,
  };
};

function CadastroAlunoIndividual() {
  // RENOMEADO
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [turmaManual, setTurmaManual] = useState("Individual"); // Campo simplificado
  const [idade, setIdade] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [limiteAlunosInfo, setLimiteAlunosInfo] = useState({
    podeCadastrar: true,
    limite: 0,
    alunosAtuais: 0,
  });

  const usuarioLogado = JSON.parse(
    localStorage.getItem("usuarioLogado") || "{}"
  );
  const emailCriador = usuarioLogado.email || null;

  // Efeito para calcular a idade (MANTIDO)
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

  // Efeito para verificar o limite do plano ao carregar a página
  useEffect(() => {
    const checkLimit = async () => {
      if (!emailCriador) return;
      const info = await verificarLimitePlano(emailCriador);
      setLimiteAlunosInfo(info);
    };
    checkLimit();
  }, [emailCriador]);

  // Função de Salvamento com Checagem de Limite
  const handleSalvar = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    if (!emailCriador) {
      alert("Erro: Usuário não autenticado.");
      setIsSaving(false);
      return;
    }

    // 1. Checagem de Campos
    if (!nome || !nascimento || !diagnostico) {
      alert("Preencha todos os campos obrigatórios.");
      setIsSaving(false);
      return;
    }

    // 2. CHECAGEM DE LIMITE DO PLANO (CRÍTICO!)
    const info = await verificarLimitePlano(emailCriador);
    if (!info.podeCadastrar) {
      alert(
        `Limite de ${info.limite} alunos atingido. Faça um upgrade para cadastrar mais!`
      );
      setIsSaving(false);
      // Aqui você pode adicionar a navegação para a página de Planos/Upgrade
      return;
    }

    const anoLetivoParaCadastro = new Date().getFullYear();

    try {
      const dadosAlunoParaSalvar = {
        nome: nome.trim(),
        nascimento,
        diagnostico: diagnostico.trim(),
        turma: turmaManual, // Valor Fixo: "Individual"
        turno: "Integral", // Valor Padrão: Integral ou remover se não for relevante
        escolaId: "INDIVIDUAL", // Valor Fixo: Isola do sistema da escola
        criadorId: emailCriador, // CRÍTICO: Vincula o aluno ao professor/assinante
        anoLetivoAtivo: anoLetivoParaCadastro,
        dataCadastro: serverTimestamp(),
      };

      const alunoDocRef = await addDoc(
        collection(db, "alunos"),
        dadosAlunoParaSalvar
      );
      console.log("Aluno cadastrado com ID: ", alunoDocRef.id);

      await criarPEIPlaceholderParaAluno(
        alunoDocRef,
        dadosAlunoParaSalvar.nome,
        emailCriador
      );

      alert("Aluno cadastrado com sucesso!");

      // Limpar campos do formulário e redirecionar
      setNome("");
      setNascimento("");
      setDiagnostico("");
      setTurmaManual("Individual");
      setIdade("");

      navigate("/individual/ver-peis-individual"); // Redireciona para ver o aluno na lista
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
          <BotaoVoltar destino={ROTA_PAINEL_INDIVIDUAL} />
        </div>
        <Titulo>Cadastro de Aluno Individual</Titulo>

        {/* Exibe o status do plano no topo */}
        <MensagemAlerta
          style={{
            backgroundColor: limiteAlunosInfo.podeCadastrar
              ? "#d4edda"
              : "#f8d7da",
            color: limiteAlunosInfo.podeCadastrar ? "#155724" : "#721c24",
          }}
        >
          Status do Plano: {limiteAlunosInfo.alunosAtuais} de{" "}
          {limiteAlunosInfo.limite} alunos cadastrados.
        </MensagemAlerta>

        <StyledForm onSubmit={handleSalvar}>
          <Input
            type="text"
            placeholder="Nome Completo do Aluno"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            disabled={isSaving || !limiteAlunosInfo.podeCadastrar}
          />
          <Input
            type="date"
            value={nascimento}
            onChange={handleNascimentoChange}
            required
            aria-label="Data de Nascimento"
            disabled={isSaving || !limiteAlunosInfo.podeCadastrar}
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
            disabled={isSaving || !limiteAlunosInfo.podeCadastrar}
          />

          {/* CAMPO TURMA SIMPLIFICADO / REMOVIDO ESCOLA */}
          <Input
            type="text"
            placeholder="Turma (Ex: Turma Individual)"
            value={turmaManual}
            onChange={(e) => setTurmaManual(e.target.value)}
            readOnly // Torna o campo apenas leitura (ou apenas um label)
            disabled={true}
            style={{ backgroundColor: "#f0f0f0", cursor: "not-allowed" }}
          />

          <BotaoSalvar
            type="submit"
            disabled={isSaving || !limiteAlunosInfo.podeCadastrar}
          >
            {isSaving
              ? "Salvando..."
              : limiteAlunosInfo.podeCadastrar
              ? "Salvar Aluno"
              : "LIMITE ATINGIDO (Upgrade)"}
          </BotaoSalvar>
        </StyledForm>
      </FormContainer>
    </PageContainer>
  );
}

export default CadastroAlunoIndividual;
