import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Dados estáticos da avaliação
import { avaliacaoInicial } from "../data/avaliacaoInicialData";

// Hooks customizados que encapsulam a lógica
import { useAlunos } from "../hooks/useAlunos";
import { useAvaliacaoForm } from "../hooks/useAvaliacaoForm";

// Componentes de UI reutilizáveis
import SelecaoAluno from "../components/SelecaoAluno";
import AreaPerguntas from "../components/AreaPerguntas";
import AvaliacaoHeader from "../components/AvaliacaoHeader";
import { gerarPDFAvaliacaoInicialParaPreencher } from "../utils/gerarPDFAvaliacaoInicial";

// Estilos específicos da página
import "../styles/AvaliacaoInicial.css";

// Mapeamento de perfis para rotas, pode ficar fora do componente
const painelDestinoMapeado = {
  desenvolvedor: "/painel-dev",
  desenvolvedora: "/painel-dev",
  gestao: "/painel-gestao",
  aee: "/painel-aee",
  seme: "/acompanhamento",
  professor: "/painel-professor",
  diretor: "/painel-gestao",
  diretor_adjunto: "/painel-gestao",
  orientador_pedagogico: "/painel-gestao",
};

function AvaliacaoInicial() {
  const navigate = useNavigate();

  // --- Lógica de Usuário e Navegação ---
  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );
  const perfilNormalizado = (usuarioLogado.perfil || "").toLowerCase().trim();
  const painelDestino = painelDestinoMapeado[perfilNormalizado] || "/";

  // --- Hooks que gerenciam estado e lógica complexa ---
  const {
    alunos,
    carregando: carregandoAlunos,
    erro: erroAlunos,
  } = useAlunos();
  const form = useAvaliacaoForm(alunos); // Hook para todo o formulário

  // --- Estado local da UI ---
  const [areaSelecionada, setAreaSelecionada] = useState("");
  const areas = useMemo(() => Object.keys(avaliacaoInicial), []);

  // --- Handlers que conectam a UI (eventos) com a lógica dos hooks ---
  const handleSelecionarAlunoWrapper = useCallback(
    async (e) => {
      const alunoNome = e.target.value;
      await form.handleSelecionarAluno(alunoNome);
      // Seleciona a primeira área automaticamente ao escolher um aluno
      setAreaSelecionada(alunoNome ? areas[0] || "" : "");
    },
    [form, areas]
  );

  const onSalvarClick = useCallback(async () => {
    const sucesso = await form.handleSalvar(usuarioLogado);
    if (sucesso) {
      setTimeout(() => navigate("/ver-avaliacoes"), 1500);
    }
  }, [form, usuarioLogado, navigate]);

  const handleResposta = useCallback(
    (area, habilidade, nivel) => {
      form.setRespostas((prev) => ({
        ...prev,
        [area]: { ...prev[area], [habilidade]: nivel },
      }));
    },
    [form.setRespostas]
  );

  const handleObservacao = useCallback(
    (area, texto) => {
      form.setObservacoes((prev) => ({ ...prev, [area]: texto }));
    },
    [form.setObservacoes]
  );

  // Flag consolidada para desabilitar elementos durante carregamentos
  const carregandoGeral =
    carregandoAlunos || form.estado.carregandoAvaliacao || form.estado.salvando;

  return (
    <div className="avaliacao-card">
      <AvaliacaoHeader
        destinoVoltar={painelDestino}
        onVerAvaliacoesClick={() => navigate("/ver-avaliacoes")}
        disabled={carregandoGeral}
      />

      {/* Área de Mensagens e Carregamento */}
      {erroAlunos && <div className="mensagem-erro">{erroAlunos}</div>}
      {form.estado.erro && (
        <div className="mensagem-erro">{form.estado.erro}</div>
      )}
      {form.estado.sucesso && (
        <div className="mensagem-sucesso">{form.estado.sucesso}</div>
      )}

      {carregandoAlunos ? (
        <div className="loading">Carregando alunos...</div>
      ) : (
        <SelecaoAluno
          alunos={alunos}
          alunoSelecionado={form.alunoSelecionado?.nome || ""}
          onSelecionar={handleSelecionarAlunoWrapper}
          disabled={carregandoGeral}
        />
      )}

      {form.estado.carregandoAvaliacao && (
        <div className="loading">Carregando avaliação...</div>
      )}

      {/* Conteúdo da Avaliação (só aparece após selecionar um aluno) */}
      {form.alunoSelecionado && (
        <>
          <p style={{ fontWeight: "bold" }}>Idade: {form.idade} anos</p>

          <button onClick={gerarPDFAvaliacaoInicialParaPreencher}>
            Baixar PDF para Preenchimento
          </button>

          <div className="date-inputs-container">
            <div className="date-input-group">
              <label>Data de Início:</label>
              <input
                type="date"
                value={form.inicio}
                onChange={(e) => form.setInicio(e.target.value)}
                disabled={carregandoGeral}
              />
            </div>
            <div className="date-input-group">
              <label>Próxima Avaliação:</label>
              <input
                type="date"
                value={form.proximaAvaliacao}
                onChange={(e) => form.setProximaAvaliacao(e.target.value)}
                disabled={carregandoGeral}
              />
            </div>
          </div>

          <div className="area-tabs-container">
            {areas.map((area) => (
              <button
                key={area}
                onClick={() => setAreaSelecionada(area)}
                className={`area-botao ${areaSelecionada === area ? "ativo" : ""}`}
                disabled={carregandoGeral}
              >
                {area}
              </button>
            ))}
          </div>

          {areaSelecionada && (
            <AreaPerguntas
              area={areaSelecionada}
              dados={avaliacaoInicial[areaSelecionada]}
              respostas={form.respostas[areaSelecionada] || {}}
              observacoes={form.observacoes[areaSelecionada] || ""}
              onResponder={handleResposta}
              onObservar={handleObservacao}
              disabled={carregandoGeral}
            />
          )}

          <button
            onClick={onSalvarClick}
            className="botao-salvar"
            disabled={carregandoGeral}
          >
            {form.estado.salvando ? "Salvando..." : "Salvar Avaliação"}
          </button>
        </>
      )}
    </div>
  );
}

export default AvaliacaoInicial;
