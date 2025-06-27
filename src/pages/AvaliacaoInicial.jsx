import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Dados estáticos da avaliação - Certifique-se de que este caminho está correto
import { avaliacaoInicial } from "../data/avaliacaoInicialData";

// Hooks customizados que encapsulam a lógica
import { useAlunos } from "../hooks/useAlunos";
import { useAvaliacaoForm } from "../hooks/useAvaliacaoForm"; // Verifique se este hook retorna 'avaliacaoExiste'

// Componentes de UI reutilizáveis
import SelecaoAluno from "../components/SelecaoAluno";
import AreaPerguntas from "../components/AreaPerguntas";
import AvaliacaoHeader from "../components/AvaliacaoHeader"; // Certifique-se de que BotaoVoltar está dentro de AvaliacaoHeader ou é importado separadamente
import { gerarPDFAvaliacaoInicialParaPreencher } from "../utils/gerarPDFAvaliacaoInicial";
import { gerarPDFAvaliacaoInicialPreenchida } from "../utils/gerarPDFAvaliacaoInicialPreenchida"; // Você precisará criar esta função utilitária

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

  // Certifique-se que useAvaliacaoForm retorna 'avaliacaoExiste'
  const form = useAvaliacaoForm(alunos);

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
    // Adiciona a validação antes de salvar
    if (!form.inicio || !form.proximaAvaliacao) {
      alert("Por favor, preencha as datas de Início e Próxima Avaliação.");
      return;
    }

    const sucesso = await form.handleSalvar(usuarioLogado);
    if (sucesso) {
      // Pequeno atraso para a mensagem de sucesso ser visível antes de navegar
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

  const handleGerarPDFAvaliacaoPreenchida = useCallback(() => {
    if (form.alunoSelecionado && form.avaliacaoExiste) {
      gerarPDFAvaliacaoInicialPreenchida(
        form.alunoSelecionado,
        form.inicio,
        form.proximaAvaliacao,
        form.respostas,
        form.observacoes,
        usuarioLogado // Passa o usuário logado se precisar de informações do criador no PDF
      );
    } else {
      alert(
        "Selecione um aluno com avaliação inicial preenchida para gerar o PDF."
      );
    }
  }, [
    form.alunoSelecionado,
    form.avaliacaoExiste,
    form.inicio,
    form.proximaAvaliacao,
    form.respostas,
    form.observacoes,
    usuarioLogado,
  ]);

  // Flag consolidada para desabilitar elementos durante carregamentos e salvamentos
  const carregandoGeral =
    carregandoAlunos || form.estado.carregandoAvaliacao || form.estado.salvando;

  return (
    <div className="avaliacao-card">
      <AvaliacaoHeader
        destinoVoltar={painelDestino}
        onVerAvaliacoesClick={() => navigate("/ver-avaliacoes")}
        disabled={carregandoGeral}
      />

      {/* Área de Mensagens de Erro/Sucesso */}
      {erroAlunos && <div className="mensagem-erro">{erroAlunos}</div>}
      {form.estado.erro && (
        <div className="mensagem-erro">{form.estado.erro}</div>
      )}
      {form.estado.sucesso && (
        <div className="mensagem-sucesso">{form.estado.sucesso}</div>
      )}

      {/* Seção de Seleção de Aluno */}
      {carregandoAlunos ? (
        <div className="loading-message">Carregando alunos...</div>
      ) : (
        <SelecaoAluno
          alunos={alunos}
          alunoSelecionado={form.alunoSelecionado?.nome || ""}
          onSelecionar={handleSelecionarAlunoWrapper}
          disabled={carregandoGeral}
        />
      )}

      {/* Mensagens de Carregamento de Avaliação */}
      {form.estado.carregandoAvaliacao && (
        <div className="loading-message">Carregando avaliação...</div>
      )}

      {/* Conteúdo Principal da Avaliação (visível apenas após selecionar um aluno) */}
      {form.alunoSelecionado && (
        <>
          <p className="aluno-idade">
            Idade: <strong>{form.idade}</strong> anos
          </p>

          {/* Botões de Geração de PDF */}
          <div className="pdf-buttons-container">
            <button
              onClick={gerarPDFAvaliacaoInicialParaPreencher}
              disabled={carregandoGeral}
              className="pdf-button"
            >
              Baixar PDF (Modelo Vazio)
            </button>
            {form.avaliacaoExiste && (
              <button
                onClick={handleGerarPDFAvaliacaoPreenchida}
                disabled={carregandoGeral}
                className="pdf-button filled-pdf-button" // Nova classe para diferenciar
              >
                Baixar PDF (Preenchido)
              </button>
            )}
          </div>

          {/* Datas da Avaliação */}
          <div className="date-inputs-container">
            <div className="date-input-group">
              <label htmlFor="dataInicio">Data de Início:</label>
              <input
                id="dataInicio"
                type="date"
                value={form.inicio}
                onChange={(e) => form.setInicio(e.target.value)}
                disabled={carregandoGeral}
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="proximaAvaliacao">Próxima Avaliação:</label>
              <input
                id="proximaAvaliacao"
                type="date"
                value={form.proximaAvaliacao}
                onChange={(e) => form.setProximaAvaliacao(e.target.value)}
                disabled={carregandoGeral}
              />
            </div>
          </div>

          {/* Mensagem para Avaliação Nova */}
          {!form.avaliacaoExiste && (
            <p className="info-message">
              Nenhuma avaliação inicial encontrada para este aluno. Preencha o
              formulário para **criar uma nova avaliação**.
            </p>
          )}

          {/* Abas das Áreas de Conhecimento */}
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

          {/* Área de Perguntas da Aba Selecionada */}
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

          {/* Botão Salvar Avaliação */}
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
