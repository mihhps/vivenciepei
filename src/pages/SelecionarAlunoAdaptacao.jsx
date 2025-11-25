import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserEdit, FaSpinner } from "react-icons/fa"; // Manter FaSpinner se for usado no Loader
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader"; // Componente de carregamento
import { useAlunos } from "../hooks/useAlunos";
import "../styles/SelecionarAlunoAdaptacao.css";

const SelecionarAlunoAdaptacao = () => {
  const navigate = useNavigate();
  // Assume que o hook useAlunos retorna uma array 'alunos', um booleano 'carregando', e 'erro'.
  const {
    alunos = [], // Garante que 'alunos' é sempre uma array para evitar erros
    carregando: carregandoAlunos,
    erro: erroAlunos,
  } = useAlunos();

  const [selectedAlunoId, setSelectedAlunoId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleNavigateToEstudio = (alunoId) => {
    if (alunoId) {
      // Rota final: /adaptar/:alunoId
      navigate(`/adaptar/${alunoId}`);
    }
  };

  const handleSelectChange = (e) => {
    const id = e.target.value;
    setSelectedAlunoId(id);
    // Navega imediatamente após a seleção no dropdown
    if (id) {
      handleNavigateToEstudio(id);
    }
  };

  // Memoiza a lista filtrada para melhor performance
  const filteredAlunos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return alunos; // Retorna todos se a busca estiver vazia

    return alunos.filter((aluno) => {
      return (
        aluno.nome?.toLowerCase().includes(term) ||
        aluno.turma?.toLowerCase().includes(term) ||
        aluno.diagnostico?.toLowerCase().includes(term)
      );
    });
  }, [alunos, searchTerm]);

  // --- Renderização Principal ---
  return (
    <div className="selecao-container">
      <div className="selecao-card">
        <div className="selecao-header">
          <BotaoVoltar />
          <h2 className="selecao-title">
            <FaUserEdit /> Selecione o Aluno para Adaptação
          </h2>
        </div>

        {erroAlunos && (
          <div className="selecao-mensagem-erro">
            Erro ao carregar alunos: {erroAlunos}
          </div>
        )}

        <p className="selecao-descricao">
          Para iniciar o Estúdio de Adaptação de Conteúdo, escolha o aluno para
          o qual o material será diferenciado.
        </p>

        {/* Usamos o Loader para o container inteiro se estiver carregando */}
        {carregandoAlunos ? (
          <div className="loading-area">
            <Loader /> Carregando lista de alunos...
          </div>
        ) : (
          <>
            {/* --- SELETOR RÁPIDO (DropDown) --- */}
            <div className="selecao-seletor-aluno">
              <label className="selecao-label">
                Opção 1: Selecionar e Iniciar
              </label>
              <select
                value={selectedAlunoId}
                onChange={handleSelectChange}
                className="selecao-select"
                disabled={alunos.length === 0} // Desabilita se não houver alunos
              >
                <option value="">
                  {alunos.length === 0
                    ? "Nenhum aluno disponível"
                    : "Selecione um aluno"}
                </option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome} ({aluno.turma || "Sem Turma"})
                  </option>
                ))}
              </select>
            </div>

            <div className="selecao-separator">OU</div>

            {/* --- OPÇÃO 2: BUSCA E LISTA DETALHADA --- */}
            <div className="selecao-busca-aluno">
              <label className="selecao-label">Opção 2: Buscar Aluno</label>
              <input
                type="text"
                placeholder="Digite o nome, turma ou diagnóstico do aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="selecao-input-busca"
              />
            </div>

            {/* --- RENDERIZAÇÃO CONDICIONAL DA LISTA --- */}
            <div className="selecao-lista-aluno">
              {filteredAlunos.length === 0 ? (
                <p className="selecao-info-message">
                  {searchTerm
                    ? "Nenhum aluno encontrado com este filtro."
                    : "Nenhum aluno cadastrado. Por favor, cadastre um aluno primeiro."}
                </p>
              ) : (
                <div className="selecao-lista-container">
                  {filteredAlunos.map((aluno) => (
                    <div key={aluno.id} className="aluno-item-adaptacao">
                      <div className="aluno-info-adaptacao">
                        <span className="aluno-nome-adaptacao">
                          {aluno.nome}
                        </span>
                        <span className="aluno-detalhe-adaptacao">
                          Turma: {aluno.turma || "N/I"} | Laudo:{" "}
                          {aluno.diagnostico || "N/I"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNavigateToEstudio(aluno.id)}
                        className="botao-iniciar-estudio"
                      >
                        <FaUserEdit /> Iniciar Estúdio
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SelecionarAlunoAdaptacao;
