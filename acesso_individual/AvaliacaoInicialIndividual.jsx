import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import { interesses } from "../data/interessesData";

// MANTER ESSAS IMPORTAÇÕES, POIS ELAS CONTÊM A LÓGICA REAPROVEITÁVEL:
import { useAlunos } from "../hooks/useAlunos";
import { useAvaliacaoForm } from "../hooks/useAvaliacaoForm";
import AvaliacaoHeader from "../components/AvaliacaoHeader";
import SelecaoAluno from "../components/SelecaoAluno";
import AreaPerguntas from "../components/AreaPerguntas";
import { gerarPDFAvaliacaoInicialParaPreencher } from "../utils/gerarPDFAvaliacaoInicial";
import { gerarPDFAvaliacaoInicialPreenchida } from "../utils/gerarPDFAvaliacaoInicialPreenchida";

import "../styles/AvaliacaoInicial.css";

// REMOVIDO: O mapeamento de painéis de destino da escola
// const painelDestinoMapeado = { ... };

// NOVO: Destino de retorno para o painel principal do usuário individual
const PAINEL_DESTINO_INDIVIDUAL = "/painel-individual";
const ROTA_VER_AVALIACOES_INDIVIDUAL = "/ver-avaliacoes-individual";

function AvaliacaoInicialIndividual() {
  // RENOMEADO para evitar conflito
  const navigate = useNavigate();

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );

  // REMOVIDO: perfis e mapeamento de destino da escola.
  const perfilNormalizado = (usuarioLogado.perfil || "").toLowerCase().trim();
  const painelDestino = PAINEL_DESTINO_INDIVIDUAL; // Destino fixo

  // HOOKS REAPROVEITADOS
  // NOTA: O hook useAlunos deve ser adaptado no arquivo original (useAlunos.js)
  // para que, se o perfil for 'individual', ele filtre por 'criadorId' e não por 'escolaId'.
  const {
    alunos,
    carregando: carregandoAlunos,
    erro: erroAlunos,
  } = useAlunos();

  const form = useAvaliacaoForm(alunos);

  const [areaSelecionada, setAreaSelecionada] = useState("");
  const todasAsAreas = useMemo(() => ({ ...avaliacaoInicial }), []);
  const areasParaAbas = useMemo(
    () => Object.keys(todasAsAreas),
    [todasAsAreas]
  );

  const handleSelecionarAlunoWrapper = useCallback(
    async (e) => {
      const alunoNome = e.target.value;
      await form.handleSelecionarAluno(alunoNome);
      setAreaSelecionada(alunoNome ? areasParaAbas[0] || "" : "");
    },
    [form, areasParaAbas]
  );

  const onSalvarClick = useCallback(async () => {
    if (!form.inicio || !form.proximaAvaliacao) {
      alert("Por favor, preencha as datas de Início e Próxima Avaliação.");
      return;
    }

    // A chamada para handleSalvar deve funcionar, pois o useAvaliacaoForm
    // usa o objeto usuarioLogado, que deve ter o perfil "individual".
    const sucesso = await form.handleSalvar(usuarioLogado);
    if (sucesso) {
      // Rota de navegação adaptada para o módulo individual
      setTimeout(() => navigate(ROTA_VER_AVALIACOES_INDIVIDUAL), 1500);
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

  const handleGerarPDFAvaliacaoVazia = useCallback(() => {
    if (form.alunoSelecionado) {
      gerarPDFAvaliacaoInicialParaPreencher(form.alunoSelecionado);
    } else {
      alert("Selecione um aluno para gerar o PDF.");
    }
  }, [form.alunoSelecionado]);

  const handleGerarPDFAvaliacaoPreenchida = useCallback(() => {
    if (form.alunoSelecionado && form.avaliacaoExiste) {
      // Esta função (gerarPDFAvaliacaoInicialPreenchida) não precisa de alteração
      // desde que os dados do aluno e do professor estejam formatados corretamente.
      gerarPDFAvaliacaoInicialPreenchida(
        form.alunoSelecionado,
        form.inicio,
        form.proximaAvaliacao,
        form.respostas,
        form.observacoes,
        usuarioLogado // O objeto usuarioLogado é suficiente
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

  const handleIniciarReavaliacao = useCallback(() => {
    if (form.alunoSelecionado && form.alunoSelecionado.id) {
      // Rota adaptada para o novo módulo
      navigate(`/individual/reavaliacao/${form.alunoSelecionado.id}`);
    } else {
      alert("Por favor, selecione um aluno primeiro.");
    }
  }, [navigate, form.alunoSelecionado]);

  const carregandoGeral =
    carregandoAlunos || form.estado.carregandoAvaliacao || form.estado.salvando;

  return (
    <div className="avaliacao-card">
      <AvaliacaoHeader
        destinoVoltar={painelDestino}
        onVerAvaliacoesClick={() => navigate(ROTA_VER_AVALIACOES_INDIVIDUAL)} // Rota adaptada
        disabled={carregandoGeral}
      />

      {erroAlunos && <div className="mensagem-erro">{erroAlunos}</div>}
      {form.estado.erro && (
        <div className="mensagem-erro">{form.estado.erro}</div>
      )}
      {form.estado.sucesso && (
        <div className="mensagem-sucesso">{form.estado.sucesso}</div>
      )}

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

      {form.estado.carregandoAvaliacao && (
        <div className="loading-message">Carregando avaliação...</div>
      )}

      {form.alunoSelecionado && (
        <>
          <p className="aluno-idade">
            Idade: <strong>{form.idade}</strong> anos
          </p>

          <div style={estilos.botoesPDF}>
            <button
              onClick={handleGerarPDFAvaliacaoVazia}
              disabled={carregandoGeral}
              style={estilos.botaoPDFVazio}
            >
              Baixar PDF Vazio
            </button>
            {form.avaliacaoExiste && (
              <button
                onClick={handleGerarPDFAvaliacaoPreenchida}
                disabled={carregandoGeral}
                style={estilos.botaoPDFPreenchido}
              >
                Baixar PDF Preenchido
              </button>
            )}
          </div>

          <div className="date-inputs-container">
            <div className="date-input-group">
              <label htmlFor="dataInicio">Data de Início:</label>
              <input
                id="dataInicio"
                type="date"
                value={form.inicio}
                onChange={(e) => form.setInicio(e.target.value)}
                disabled={!!form.avaliacaoDocId || carregandoGeral}
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="proximaAvaliacao">Próxima Avaliação:</label>
              <input
                id="proximaAvaliacao"
                type="date"
                value={form.proximaAvaliacao}
                onChange={(e) => form.setProximaAvaliacao(e.target.value)}
                disabled={!!form.avaliacaoDocId || carregandoGeral}
              />
            </div>
          </div>

          {!form.avaliacaoExiste && (
            <p className="info-message">
              Nenhuma avaliação inicial encontrada para este aluno. Preencha o
              formulário para criar uma nova avaliação.
            </p>
          )}

          <div className="area-tabs-container">
            {areasParaAbas.map((area) => (
              <button
                key={area}
                onClick={() => setAreaSelecionada(area)}
                className={`area-botao ${
                  areaSelecionada === area ? "ativo" : ""
                }`}
                disabled={carregandoGeral}
              >
                {area}
              </button>
            ))}
          </div>

          {areaSelecionada && (
            <AreaPerguntas
              area={areaSelecionada}
              dados={todasAsAreas[areaSelecionada]}
              respostas={form.respostas[areaSelecionada] || {}}
              observacoes={form.observacoes[areaSelecionada] || ""}
              onResponder={handleResposta}
              onObservar={handleObservacao}
            />
          )}

          <div style={estilos.botoesContainer}>
            {form.avaliacaoExiste ? (
              <>
                <button
                  onClick={onSalvarClick}
                  disabled={carregandoGeral}
                  style={estilos.botaoSalvar}
                >
                  {form.estado.salvando ? "Salvando..." : "Salvar Alterações"}
                </button>
                <button
                  onClick={handleIniciarReavaliacao}
                  disabled={carregandoGeral}
                  style={estilos.botaoReavaliacao}
                >
                  Iniciar Reavaliação
                </button>
              </>
            ) : (
              <button
                onClick={onSalvarClick}
                disabled={
                  carregandoGeral || !form.inicio || !form.proximaAvaliacao
                }
                style={estilos.botaoSalvar}
              >
                {form.estado.salvando ? "Salvando..." : "Salvar Avaliação"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Estilos inline para os novos botões (mantidos)
const estilos = {
  botoesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    alignItems: "center",
    width: "100%",
    margin: "20px 0",
  },
  botaoReavaliacao: {
    backgroundColor: "#ffc107",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    width: "100%",
    transition: "background-color 0.2s",
  },
  botaoSalvar: {
    backgroundColor: "#2a9d8f",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    width: "100%",
    transition: "background-color 0.2s",
  },
  botoesPDF: {
    display: "flex",
    gap: "10px",
    width: "100%",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  botaoPDFVazio: {
    backgroundColor: "#457b9d",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    flex: "1 1 auto",
  },
  botaoPDFPreenchido: {
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    flex: "1 1 auto",
  },
};

export default AvaliacaoInicialIndividual; // EXPORT RENOMEADO
