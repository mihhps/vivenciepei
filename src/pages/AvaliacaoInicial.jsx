import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import { interesses } from "../data/interessesData";
import { useAlunos } from "../hooks/useAlunos";
import { useAvaliacaoForm } from "../hooks/useAvaliacaoForm";
import AvaliacaoHeader from "../components/AvaliacaoHeader";
import SelecaoAluno from "../components/SelecaoAluno";
import AreaPerguntas from "../components/AreaPerguntas";
import { gerarPDFAvaliacaoInicialParaPreencher } from "../utils/gerarPDFAvaliacaoInicial";
import { gerarPDFAvaliacaoInicialPreenchida } from "../utils/gerarPDFAvaliacaoInicialPreenchida";

import "../styles/AvaliacaoInicial.css";
// NOVO: Import do ícone de usuário
import { FaUserCircle } from "react-icons/fa";

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

// NOVO: Função para calcular a idade exata em anos e meses a partir da data de nascimento
const calcularIdadeExata = (dataNascimentoString) => {
  if (!dataNascimentoString) return null;

  const dataNascimento = new Date(dataNascimentoString);
  const hoje = new Date();

  if (isNaN(dataNascimento)) return null;

  let anos = hoje.getFullYear() - dataNascimento.getFullYear();
  let meses = hoje.getMonth() - dataNascimento.getMonth();
  let dias = hoje.getDate() - dataNascimento.getDate();

  // Ajusta anos e meses se o aniversário ainda não ocorreu neste mês
  if (dias < 0) {
    meses--;
    // Pega o número de dias do mês anterior
    dias += new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    anos--;
    meses += 12;
  }

  // Converte para decimal
  const idadeDecimal = anos + meses / 12 + dias / 365.25;
  return idadeDecimal;
};

function AvaliacaoInicial() {
  const navigate = useNavigate();

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );
  const perfilNormalizado = (usuarioLogado.perfil || "").toLowerCase().trim();
  const painelDestino = painelDestinoMapeado[perfilNormalizado] || "/";

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

  const handleGerarPDFAvaliacaoVazia = useCallback(() => {
    if (form.alunoSelecionado) {
      gerarPDFAvaliacaoInicialParaPreencher(form.alunoSelecionado);
    } else {
      alert("Selecione um aluno para gerar o PDF.");
    }
  }, [form.alunoSelecionado]);

  const handleGerarPDFAvaliacaoPreenchida = useCallback(() => {
    if (form.alunoSelecionado && form.avaliacaoExiste) {
      gerarPDFAvaliacaoInicialPreenchida(
        form.alunoSelecionado,
        form.inicio,
        form.proximaAvaliacao,
        form.respostas,
        form.observacoes,
        usuarioLogado
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
      navigate(`/reavaliacao/${form.alunoSelecionado.id}`);
    } else {
      alert("Por favor, selecione um aluno primeiro.");
    }
  }, [navigate, form.alunoSelecionado]);

  // NOVO: Função para formatar a idade em anos e meses para exibição
  const formatarIdade = useCallback((idadeDecimal) => {
    const idade = Number(idadeDecimal);
    if (isNaN(idade) || idade <= 0) {
      return "N/A";
    }
    const idadeAnos = Math.floor(idade);
    const idadeMeses = Math.round((idade - idadeAnos) * 12);

    let resultado = `${idadeAnos} ano${idadeAnos !== 1 ? "s" : ""}`;
    if (idadeMeses > 0) {
      resultado += ` e ${idadeMeses} mes${idadeMeses !== 1 ? "es" : ""}`;
    }
    return resultado;
  }, []);

  // MUDANÇA CRÍTICA: Calcular idade no componente usando a data de nascimento do aluno
  const idadeAtual = useMemo(() => {
    const dataNascimento = form.alunoSelecionado?.nascimento;
    return calcularIdadeExata(dataNascimento);
  }, [form.alunoSelecionado]);

  const carregandoGeral =
    carregandoAlunos || form.estado.carregandoAvaliacao || form.estado.salvando;

  return (
    <div className="avaliacao-card">
      <AvaliacaoHeader
        destinoVoltar={painelDestino}
        onVerAvaliacoesClick={() => navigate("/ver-avaliacoes")}
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
          {/* --- NOVO BLOCO: FOTO E IDADE --- */}
          <div style={estilos.infoGeralContainer}>
            {/* FOTO / PLACEHOLDER */}
            <div style={estilos.fotoContainer}>
              {form.alunoSelecionado.fotoUrl ? (
                <img
                  src={form.alunoSelecionado.fotoUrl}
                  alt={`Foto de ${form.alunoSelecionado.nome}`}
                  style={estilos.foto}
                />
              ) : (
                <FaUserCircle style={estilos.fotoPlaceholder} />
              )}
            </div>

            {/* IDADE (MANTIDA) */}
            <p className="aluno-idade" style={estilos.idadeText}>
              Idade: <strong>{formatarIdade(idadeAtual)}</strong>
            </p>
          </div>
          {/* --- FIM DO BLOCO FOTO/IDADE --- */}

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

// Estilos inline para os botões de Ação, PDF e agora FOTO (Modernizados)
const estilos = {
  // --- NOVOS ESTILOS PARA FOTO E IDADE ---
  infoGeralContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "20px",
    borderBottom: "1px solid #e2e8f0",
  },
  fotoContainer: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    overflow: "hidden",
    marginRight: "15px",
    flexShrink: 0,
    border: "2px solid #4c51bf", // Cor primária
    backgroundColor: "#edf2f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  foto: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  fotoPlaceholder: {
    fontSize: "2.5em",
    color: "#4c51bf",
  },
  idadeText: {
    margin: 0,
    fontSize: "1.1rem",
    color: "#4a5568",
  },
  // --- FIM DOS ESTILOS FOTO ---

  botoesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    alignItems: "center",
    width: "100%",
    margin: "30px 0 20px 0",
  },
  // Botão Iniciar Reavaliação (Amarelo)
  botaoReavaliacao: {
    backgroundColor: "#f6ad55",
    color: "#1a202c",
    border: "2px solid #f6ad55",
    padding: "14px 28px",
    borderRadius: "12px",
    fontSize: "17px",
    fontWeight: "700",
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s",
    boxShadow: "0 4px 10px rgba(246, 173, 85, 0.4)",
  },
  // Botão Salvar (Verde/Teal)
  botaoSalvar: {
    backgroundColor: "#38b2ac",
    color: "#fff",
    border: "none",
    padding: "14px 28px",
    borderRadius: "12px",
    fontSize: "17px",
    fontWeight: "700",
    cursor: "pointer",
    width: "100%",
    transition: "background-color 0.2s",
    boxShadow: "0 4px 10px rgba(56, 178, 172, 0.4)",
  },
  // --- BOTÕES PDF MODERNIZADOS ---
  botoesPDF: {
    display: "flex",
    gap: "15px",
    width: "100%",
    flexWrap: "wrap",
    justifyContent: "center",
    margin: "25px 0",
  },
  // Botão de PDF Vazio (Estilo Secundário/Claro)
  botaoPDFVazio: {
    backgroundColor: "#ffffff",
    color: "#4c51bf",
    border: "2px solid #4c51bf",
    padding: "12px 20px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    flex: "1 1 45%",
    minWidth: "150px",
    textTransform: "uppercase",
  },
  // Botão de PDF Preenchido (Estilo Primário/Escuro)
  botaoPDFPreenchido: {
    backgroundColor: "#4c51bf",
    color: "#fff",
    border: "2px solid #4c51bf",
    padding: "12px 20px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    flex: "1 1 45%",
    minWidth: "150px",
    textTransform: "uppercase",
    boxShadow: "0 4px 10px rgba(76, 81, 191, 0.4)",
  },
};

export default AvaliacaoInicial;
