// src/pages/CadastroTurma.js

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import BotaoVoltar from "../components/BotaoVoltar";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore"; // Removi 'query' e 'where' que não são usados aqui para simplificar a importação.

// --- Styled Components ---
// Você pode reutilizar os styled components do CadastroAluno.js ou definir novos aqui.
// Para esta refatoração, vou usar nomes genéricos para ilustrar.
// **IMPORTANTE**: Certifique-se de que estes styled components estejam definidos
// no seu arquivo de estilos global ou copiados para este arquivo se não forem globais.
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

const ListaTurmasContainer = styled.div`
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
`;

const TurmaItem = styled.li`
  background-color: #e9ecef;
  padding: 10px 15px;
  margin-bottom: 8px;
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95em;
  color: #343a40;
`;

// --- Fim Styled Components ---

const turnosDisponiveis = ["Matutino", "Vespertino", "Noturno", "Integral"];

function CadastroTurma() {
  const [nomeTurma, setNomeTurma] = useState("");
  const [turnoTurma, setTurnoTurma] = useState("");
  const [escolaIdSelecionada, setEscolaIdSelecionada] = useState("");
  const [listaEscolas, setListaEscolas] = useState([]);
  const [turmasCadastradas, setTurmasCadastradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- Carregar Escolas ---
  useEffect(() => {
    const fetchEscolas = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };
    fetchEscolas();
  }, []);

  // --- Carregar Turmas já cadastradas para a escola selecionada ---
  useEffect(() => {
    const fetchTurmasExistentes = async () => {
      if (!escolaIdSelecionada) {
        setTurmasCadastradas([]);
        return;
      }
      setLoading(true);
      try {
        // Busca turmas da subcoleção 'turmas' dentro da escola
        const turmasQuery = collection(
          db,
          "escolas",
          escolaIdSelecionada,
          "turmas"
        );
        const turmasSnapshot = await getDocs(turmasQuery);
        const turmasData = turmasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTurmasCadastradas(
          turmasData.sort((a, b) => a.nome.localeCompare(b.nome))
        );
      } catch (error) {
        console.error("Erro ao carregar turmas existentes:", error);
        alert("Erro ao carregar turmas já cadastradas para esta escola.");
      } finally {
        setLoading(false);
      }
    };
    fetchTurmasExistentes();
  }, [escolaIdSelecionada]);

  const handleSalvarTurma = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    if (!nomeTurma.trim() || !turnoTurma || !escolaIdSelecionada) {
      // Adicionado .trim()
      alert(
        "Por favor, preencha todos os campos: Nome da Turma, Turno e Escola."
      );
      setIsSaving(false);
      return;
    }

    // Verificar se a turma já existe para a escola
    const turmaExistente = turmasCadastradas.some(
      (turma) => turma.nome.toLowerCase() === nomeTurma.trim().toLowerCase()
    );
    if (turmaExistente) {
      alert(`A turma "${nomeTurma.trim()}" já existe para esta escola.`);
      setIsSaving(false);
      return;
    }

    try {
      // Adiciona a nova turma na subcoleção 'turmas' da escola selecionada
      const turmaRef = await addDoc(
        collection(db, "escolas", escolaIdSelecionada, "turmas"),
        {
          nome: nomeTurma.trim(),
          turno: turnoTurma,
          criadoEm: serverTimestamp(),
        }
      );
      alert(
        `Turma "${nomeTurma.trim()}" (${turnoTurma}) cadastrada com sucesso!`
      );
      setNomeTurma("");
      setTurnoTurma("");
      // Atualiza a lista de turmas cadastradas para refletir a nova turma
      setTurmasCadastradas((prev) =>
        [
          ...prev,
          { id: turmaRef.id, nome: nomeTurma.trim(), turno: turnoTurma },
        ].sort((a, b) => a.nome.localeCompare(b.nome))
      );
    } catch (error) {
      console.error("Erro ao cadastrar turma:", error);
      alert("Erro ao cadastrar turma. Tente novamente.");
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
        <Titulo>Cadastro de Turmas</Titulo>
        <StyledForm onSubmit={handleSalvarTurma}>
          <label htmlFor="escolaSelect">Escola:</label>
          <Select
            id="escolaSelect"
            value={escolaIdSelecionada}
            onChange={(e) => setEscolaIdSelecionada(e.target.value)}
            disabled={loading || isSaving}
            required
          >
            <option value="">
              {loading ? "Carregando escolas..." : "Selecione a Escola"}
            </option>
            {listaEscolas.map((escola) => (
              <option key={escola.id} value={escola.id}>
                {escola.nome}
              </option>
            ))}
          </Select>

          <label htmlFor="nomeTurmaInput">Nome da Turma:</label>
          <Input
            id="nomeTurmaInput"
            type="text"
            placeholder="Ex: 1º Ano A, Maternal I"
            value={nomeTurma}
            onChange={(e) => setNomeTurma(e.target.value)}
            disabled={isSaving}
            required
          />

          <label htmlFor="turnoTurmaSelect">Turno:</label>
          <Select
            id="turnoTurmaSelect"
            value={turnoTurma}
            onChange={(e) => setTurnoTurma(e.target.value)}
            disabled={isSaving}
            required
          >
            <option value="">Selecione o Turno</option>
            {turnosDisponiveis.map((turno) => (
              <option key={turno} value={turno}>
                {turno}
              </option>
            ))}
          </Select>

          <BotaoSalvar type="submit" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Cadastrar Turma"}
          </BotaoSalvar>
        </StyledForm>

        {escolaIdSelecionada && (
          <ListaTurmasContainer>
            <h3>Turmas Cadastradas para esta Escola:</h3>
            {loading ? (
              <p>Carregando turmas...</p>
            ) : turmasCadastradas.length > 0 ? (
              <ul>
                {turmasCadastradas.map((turma) => (
                  <TurmaItem key={turma.id}>
                    {turma.nome} ({turma.turno})
                  </TurmaItem>
                ))}
              </ul>
            ) : (
              <p>Nenhuma turma cadastrada para esta escola ainda.</p>
            )}
          </ListaTurmasContainer>
        )}
      </FormContainer>
    </PageContainer>
  );
}

export default CadastroTurma;
