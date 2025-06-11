import React, { useState, useEffect } from "react";
import styled from "styled-components";
import BotaoVoltar from "../components/BotaoVoltar"; // Presumindo que este componente existe e funciona
import { db } from "../firebase"; // Ajuste o caminho se necessário
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

// --- Styled Components ---
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
`;

const Titulo = styled.h2`
  text-align: center;
  margin-bottom: 25px;
  color: #1d3557; // Azul SEME
  font-size: 1.8em;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px; // Espaçamento entre os campos
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 15px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 1em;
  box-sizing: border-box; /* Para o padding não aumentar a largura total */

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
  background-color: #28a745; // Verde sucesso
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
`;

const MensagemIdade = styled.p`
  font-size: 0.9em;
  color: #555;
  margin: -10px 0 5px 0; // Ajusta o espaçamento
`;
// --- Fim Styled Components ---

// Função para criar o PEI placeholder (pode ser movida para um arquivo de utils se usada em mais lugares)
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
    // Poderia lançar um erro ou retornar um status de falha
    return;
  }
  const dadosPEIPlaceholder = {
    alunoId: alunoId,
    escolaId: escolaIdDoAluno,
    anoLetivo: Number(anoLetivo), // Garante que seja número se vier de um input/select
    status: "Pendente de Criação",
    criadoEm: serverTimestamp(),
    ultimaModificacao: serverTimestamp(),
    resumoPEI: [], // Ou uma estrutura inicial padrão
    // Adicione outros campos padrão que um PEI possa ter
  };
  try {
    const peiDocRef = await addDoc(collection(db, "PEIs"), dadosPEIPlaceholder);
    console.log(
      `PEI Placeholder criado para aluno ${alunoId} com ID: ${peiDocRef.id}`
    );
  } catch (e) {
    console.error("Erro ao criar PEI Placeholder: ", e);
    // Importante: Decidir como lidar com este erro. O aluno foi criado, mas o PEI não.
    // Talvez mostrar uma mensagem específica ao usuário ou logar para admin verificar.
    alert(
      "Aluno cadastrado, mas houve um erro ao criar o PEI inicial. Por favor, verifique ou contate o suporte."
    );
  }
}

function CadastroAluno() {
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [turma, setTurma] = useState("");
  const [turno, setTurno] = useState("");
  const [idade, setIdade] = useState("");
  const [escolaIdSelecionada, setEscolaIdSelecionada] = useState("");
  const [listaEscolas, setListaEscolas] = useState([]);
  const [loadingEscolas, setLoadingEscolas] = useState(true);

  // Buscar escolas para o dropdown
  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const escolasSnapshot = await getDocs(collection(db, "escolas"));
        const escolasData = escolasSnapshot.docs.map((doc) => ({
          id: doc.id,
          nome: doc.data().nome || "Escola sem nome", // Garante que há um nome
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

    if (
      !nome ||
      !nascimento ||
      !diagnostico ||
      !turma ||
      !turno ||
      !escolaIdSelecionada
    ) {
      alert("Preencha todos os campos obrigatórios, incluindo a escola!");
      return;
    }

    const anoLetivoParaCadastro = new Date().getFullYear(); // Ou de um seletor/contexto global

    try {
      const dadosAlunoParaSalvar = {
        nome: nome.trim(),
        nascimento, // Formato YYYY-MM-DD
        diagnostico: diagnostico.trim(),
        turma: turma.trim(),
        turno,
        escolaId: escolaIdSelecionada,
        anoLetivoAtivo: anoLetivoParaCadastro,
        dataCadastro: serverTimestamp(),
        // O campo 'idade' é calculado, geralmente não se salva idade, mas sim data de nascimento.
        // Se quiser salvar a idade no momento do cadastro:
        // idadeNoCadastro: idade,
      };

      const alunoDocRef = await addDoc(
        collection(db, "alunos"),
        dadosAlunoParaSalvar
      );
      console.log("Aluno cadastrado com ID: ", alunoDocRef.id);

      // Criação automática do PEI Placeholder
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
      setTurma("");
      setTurno("");
      setIdade("");
      setEscolaIdSelecionada("");
    } catch (error) {
      console.error("Erro ao salvar aluno no Firestore:", error);
      alert(
        "Erro ao salvar aluno. Verifique o console para mais detalhes e tente novamente."
      );
    }
  };

  return (
    <PageContainer>
      <FormContainer>
        {/* BotaoVoltar pode precisar de um estilo que combine com o PageContainer */}
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
          />
          <Input
            type="date" // O navegador já oferece um seletor de data
            value={nascimento}
            onChange={handleNascimentoChange}
            required
            aria-label="Data de Nascimento"
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
          />
          <Select
            value={escolaIdSelecionada}
            onChange={(e) => setEscolaIdSelecionada(e.target.value)}
            required
            disabled={loadingEscolas}
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

          <Input
            type="text"
            placeholder="Turma"
            value={turma}
            onChange={(e) => setTurma(e.target.value)}
            required
          />

          <Select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            required
          >
            <option value="">Selecione o turno</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Integral">Integral</option>{" "}
            {/* Adicionei Integral como opção */}
          </Select>

          <BotaoSalvar type="submit">Salvar Aluno</BotaoSalvar>
        </StyledForm>
      </FormContainer>
    </PageContainer>
  );
}

export default CadastroAluno;
