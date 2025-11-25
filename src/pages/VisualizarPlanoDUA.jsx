import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase"; // Ajuste o caminho conforme a estrutura real do seu projeto
import {
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaExclamationTriangle,
  FaDownload,
} from "react-icons/fa";
import "../styles/VisualizarPlanoDUA.css";

// CORREÇÃO 1: Ajuste no caminho de importação da função de geração de PDF
// *ASSUMINDO que o caminho correto é '../utils/gerarPDFPlanoDUA'*
import { gerarPDFPlanoDUA } from "../utils/gerarPDFPlanoDUA";

// =========================================================================
// HOOKS E COMPONENTES AUXILIARES
// =========================================================================

// Componente placeholder para voltar
const BotaoVoltar = () => {
  const navigate = useNavigate();
  return (
    <button
      className="botao-voltar"
      onClick={() => navigate(-1)}
      aria-label="Voltar"
    >
      <FaArrowLeft /> Voltar para a Lista
    </button>
  );
};

// =========================================================================
// COMPONENTE PRINCIPAL: VisualizarPlanoDUA
// =========================================================================

export default function VisualizarPlanoDUA() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plano, setPlano] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // A variável dataHoje não é mais usada no subtítulo, mas pode ser útil para outras coisas
  const dataHoje = useMemo(() => new Date().toLocaleDateString("pt-BR"), []);

  /**
   * Função para buscar o plano de aula específico pelo ID.
   */
  const fetchPlano = async () => {
    if (!id) {
      setErro("ID do plano não fornecido.");
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const planoRef = doc(db, "planosAulaDUA", id);
      const docSnap = await getDoc(planoRef);

      if (docSnap.exists()) {
        const dadosPlano = docSnap.data();

        // Formatação da data da aula
        const dataAulaFormatada = dadosPlano.data
          ? new Date(dadosPlano.data).toLocaleDateString("pt-BR")
          : "N/A";

        // CORREÇÃO 2: Formatação da data de criação (timestamp do Firestore)
        let dataCriacaoFormatada = "N/A";
        if (dadosPlano.dataCriacao && dadosPlano.dataCriacao.seconds) {
          // Converte segundos do timestamp para milissegundos
          const timestampMs = dadosPlano.dataCriacao.seconds * 1000;
          dataCriacaoFormatada = new Date(timestampMs).toLocaleDateString(
            "pt-BR"
          );
        }

        setPlano({
          id: docSnap.id,
          ...dadosPlano,
          dataAulaFormatada,
          dataCriacaoFormatada, // NOVO CAMPO ADICIONADO
        });
      } else {
        setErro("Plano de Aula não encontrado.");
      }
    } catch (err) {
      console.error("Erro ao buscar plano de aula:", err);
      setErro(`Erro ao carregar os detalhes do plano: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    fetchPlano();
  }, [id]);

  // --- FUNÇÕES DE AÇÃO ---

  const handleEdit = () => {
    navigate(`/editar-plano-dua/${id}`);
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir o plano "${plano.tituloAula}"? Esta ação é irreversível.`
      )
    ) {
      setCarregando(true);
      try {
        await deleteDoc(doc(db, "planosAulaDUA", id));
        // Após exclusão bem-sucedida, volta para a lista
        navigate("/ver-planos-dua", {
          state: { message: "Plano excluído com sucesso!" },
        });
      } catch (err) {
        console.error("Erro ao excluir plano:", err);
        setErro(`Erro ao excluir o plano: ${err.message}`);
      } finally {
        setCarregando(false);
      }
    }
  };

  // FUNÇÃO DE DOWNLOAD: Chama a função externa para gerar o PDF
  const handleDownload = () => {
    if (plano) {
      // Passa a data de hoje apenas se for necessária no PDF, senão pode passar dataCriacaoFormatada
      gerarPDFPlanoDUA(plano, plano.dataCriacaoFormatada);
    }
  };

  // --- ESTRUTURA JSX DA PÁGINA ---

  if (carregando) {
    return (
      <div className="container-plano-dua">
        <div className="loading-state">
          <FaSpinner className="icon-spin" /> Carregando detalhes do Plano...
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="container-plano-dua">
        <div className="card-header">
          <BotaoVoltar />
        </div>
        <div className="mensagem-erro">
          <FaExclamationTriangle /> {erro}
        </div>
      </div>
    );
  }

  // Se carregou e não deu erro, exibe o plano
  return (
    <div className="container-plano-dua visualizacao">
      <div className="card-header">
        <BotaoVoltar />
        <div className="botoes-acao-detalhe">
          {/* BOTÃO DE DOWNLOAD (PDF) - Usa classe 'botao-secundario' (Laranja/Amarelo) */}
          <button
            className="botao-secundario"
            onClick={handleDownload}
            disabled={carregando}
          >
            <FaDownload /> Baixar PDF
          </button>

          {/* BOTÃO DE EDITAR - Usa 'botao-secundario' e a classe única 'botao-editar' (Azul) */}
          <button
            className="botao-secundario botao-editar"
            onClick={handleEdit}
            disabled={carregando}
          >
            <FaEdit /> Editar Plano
          </button>

          <button
            className="acao-delete"
            onClick={handleDelete}
            disabled={carregando}
          >
            <FaTrash /> Excluir
          </button>
        </div>
      </div>
      <h1 className="titulo-principal">{plano.tituloAula}</h1>

      {/* CORREÇÃO 3: Usando a data de criação real (plano.dataCriacaoFormatada) */}
      <p className="subtitulo-contexto">
        Criado por: {plano.criadorNome || "N/A"} em
        {plano.dataCriacaoFormatada || "N/A"}
      </p>

      {/* CORREÇÃO ESTRUTURAL 4: Adicionado 'secao-detalhe' ao container DUA para corrigir o estilo do H2 */}
      <div className="secao-detalhe">
        <h2>Informações Gerais</h2>
        {/* Grid com ajuste para Tema/Conteúdo */}
        <div className="detalhes-grid">
          <div>
            <strong>Turma:</strong>{" "}
            <span className="valor">{plano.turmaNome}</span>
          </div>
          <div>
            <strong>Data da Aula:</strong>{" "}
            <span className="valor">{plano.dataAulaFormatada}</span>
          </div>
          <div>
            <strong>Duração:</strong>{" "}
            <span className="valor">{plano.duracao || "N/I"} min</span>
          </div>

          {/* Item de conteúdo longo para quebrar a linha */}
          <div className="item-conteudo-longo">
            <strong>Tema/Conteúdo:</strong>{" "}
            <span className="valor">{plano.conteudoTema}</span>
          </div>
        </div>

        <div className="detalhes-bloco">
          <p>
            <strong>Objetivo Curricular (BNCC):</strong>
          </p>
          <blockquote className="bloco-bncc">
            {plano.objetivoCurricularBNCC}
          </blockquote>
        </div>
      </div>

      {/* CORREÇÃO ESTRUTURAL 4: Adicionado 'secao-detalhe' ao container DUA para corrigir o estilo do H2 */}
      <div className="secao-detalhe dua-container-visualizacao">
        <h2>Estratégias de Inclusão (DUA)</h2>

        {/* Princípio 1: Representação */}
        <div className="dua-principio">
          <h3>1. Múltiplos Meios de REPRESENTAÇÃO</h3>
          <ul>
            {plano.representacao && plano.representacao.length > 0 ? (
              plano.representacao.map((item, index) => (
                <li key={index}>{item}</li>
              ))
            ) : (
              <li className="vazio">
                Nenhuma estratégia de Representação selecionada.
              </li>
            )}
          </ul>
        </div>

        {/* Princípio 2: Ação e Expressão */}
        <div className="dua-principio">
          <h3>2. Múltiplos Meios de AÇÃO E EXPRESSÃO</h3>
          <ul>
            {plano.acaoExpressao && plano.acaoExpressao.length > 0 ? (
              plano.acaoExpressao.map((item, index) => (
                <li key={index}>{item}</li>
              ))
            ) : (
              <li className="vazio">
                Nenhuma estratégia de Ação e Expressão selecionada.
              </li>
            )}
          </ul>
        </div>

        {/* Princípio 3: Engajamento */}
        <div className="dua-principio">
          <h3>3. Múltiplos Meios de ENGAJAMENTO</h3>
          <ul>
            {plano.engajamento && plano.engajamento.length > 0 ? (
              plano.engajamento.map((item, index) => (
                <li key={index}>{item}</li>
              ))
            ) : (
              <li className="vazio">
                Nenhuma estratégia de Engajamento selecionada.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* 3. MATERIAIS E OBSERVAÇÕES (SEPARADOS E COLORIDOS) */}
      <div className="secao-detalhe">
        <h2>Recursos e Observações</h2>

        {/* DIV CRUCIAL PARA SEPARAÇÃO LADO A LADO E CORES */}
        <div className="secao-recursos-observacoes">
          {/* Bloco de Recursos - Laranja */}
          <div className="bloco-item-recurso">
            <h3>Materiais Necessários:</h3>
            <div className="conteudo-bloco">
              {plano.materiais || "Nenhum material listado."}
            </div>
          </div>

          {/* Bloco de Observações - Cinza */}
          <div className="bloco-item-observacao">
            <h3>Observações/ Reflexões:</h3>
            <div className="conteudo-bloco">
              {plano.observacoes || "Nenhuma observação registrada."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
