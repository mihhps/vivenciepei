import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar"; // Importando o componente

// Configuração de estilos e níveis (mantida, mas as cores serão aplicadas via CSS para as bolinhas)
const NIVEL_CONFIG = {
  NR: {
    cor: "#e63946",
    descricao: "Necessita de recursos e apoio total",
    corTexto: "#FFFFFF",
  },
  AF: { cor: "#f1a208", descricao: "Apoio frequente", corTexto: "#000000" },
  AG: { cor: "#e9c46a", descricao: "Apoio gestual", corTexto: "#000000" }, // Corrigido para corresponder ao CSS
  AV: { cor: "#2a9d8f", descricao: "Apoio eventual", corTexto: "#FFFFFF" }, // Corrigido para corresponder ao CSS
  AVi: {
    cor: "#8ecae6",
    descricao: "Apoio visual ou lembrete",
    corTexto: "#000000", // Corrigido para corresponder ao CSS
  },
  I: { cor: "#4caf50", descricao: "Independente", corTexto: "#FFFFFF" }, // Corrigido para corresponder ao CSS
  NA: { cor: "#adb5bd", descricao: "Não aplicável", corTexto: "#000000" },
};

function VerAvaliacao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [avaliacao, setAvaliacao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const carregarAvaliacao = async () => {
      if (!id) {
        setError("ID da avaliação não fornecido.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const docRef = doc(db, "avaliacoesIniciais", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAvaliacao(docSnap.data());
        } else {
          setError("Avaliação não encontrada.");
        }
      } catch (err) {
        setError("Falha ao carregar os dados da avaliação.");
      } finally {
        setLoading(false);
      }
    };
    carregarAvaliacao();
  }, [id]);

  const formatarData = (dataInput) => {
    if (!dataInput) return "-";
    try {
      const dateObj =
        typeof dataInput.toDate === "function"
          ? dataInput.toDate()
          : new Date(dataInput);
      return dateObj.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    } catch (e) {
      return "Data inválida";
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="mensagem-erro">{error}</div>;
  if (!avaliacao)
    return <div className="loading">Avaliação não disponível.</div>;

  return (
    <div className="pagina-container">
      {" "}
      {/* Container principal para o background */}
      <div className="avaliacao-card">
        {" "}
        {/* Card principal com sombra e borda */}
        <div className="avaliacao-header">
          {" "}
          {/* Cabeçalho com título e botão voltar */}
          <h2 className="avaliacao-titulo">Resumo da Avaliação Inicial</h2>
          <BotaoVoltar destino="/ver-avaliacoes" />
        </div>
        <div className="info-aluno-container">
          {" "}
          {/* Informações do aluno */}
          <p>
            <strong>Aluno:</strong> {avaliacao.aluno || "Não informado"}
          </p>
          <p>
            <strong>Data da Avaliação:</strong>{" "}
            {formatarData(avaliacao.inicio || avaliacao.dataCriacao)}
          </p>
          {avaliacao.proximaAvaliacao && (
            <p>
              <strong>Próxima Avaliação:</strong>{" "}
              {formatarData(avaliacao.proximaAvaliacao)}
            </p>
          )}
        </div>
        {Object.entries(avaliacao.respostas || {}).map(
          ([area, habilidades]) => {
            // Não filtramos nenhuma habilidade aqui, todas serão exibidas com suas opções de nível
            const todasHabilidadesDaArea = Object.entries(habilidades || {});

            if (todasHabilidadesDaArea.length === 0) return null;

            return (
              <div key={area} className="area-perguntas-wrapper">
                {" "}
                {/* Usando a classe do CSS */}
                <div className="area-header-with-button">
                  {" "}
                  {/* Container para o título da área */}
                  <h3 className="area-titulo">{area}</h3> {/* Título da área */}
                  {/* O botão "Marcar área como NA" não é necessário aqui, pois é uma visualização */}
                </div>
                <div className="accordion-item">
                  {" "}
                  {/* Simula o item do acordeão para a área */}
                  <div className="accordion-content open">
                    {" "}
                    {/* Conteúdo sempre aberto para visualização */}
                    <div className="habilidades-lista">
                      {" "}
                      {/* Lista de habilidades */}
                      {todasHabilidadesDaArea.map(([habilidade, nivel]) => {
                        return (
                          <div
                            key={habilidade}
                            className="linha-habilidade" // Classe do seu CSS para a linha da habilidade
                          >
                            <span className="texto-habilidade">
                              {habilidade}
                            </span>
                            <div className="niveis-habilidade">
                              {" "}
                              {/* Container para todas as bolinhas */}
                              {Object.keys(NIVEL_CONFIG).map((optionLevel) => {
                                const isSelected = optionLevel === nivel; // Verifica se esta bolinha é o nível avaliado
                                const className = `circulo-nivel ${optionLevel} ${isSelected ? "ativo" : ""}`; // Constrói as classes

                                return (
                                  <span
                                    key={optionLevel}
                                    className={className} // Aplica as classes dinamicamente
                                    title={NIVEL_CONFIG[optionLevel].descricao} // Descrição ao passar o mouse
                                  >
                                    {optionLevel}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {avaliacao.observacoes?.[area] && (
                  <div className="observacoes-area">
                    {" "}
                    {/* Usando a classe do CSS */}
                    <label>Observações:</label>
                    <p>{avaliacao.observacoes[area]}</p>{" "}
                    {/* Exibe o texto da observação */}
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

// Removendo objetos de estilo inline, pois agora usamos classes CSS do AvaliacaoInicial.css
// Certifique-se de que seu AvaliacaoInicial.css está linkado corretamente e contém as classes:
// .pagina-container, .avaliacao-card, .avaliacao-header, .avaliacao-titulo,
// .info-aluno-container, .area-perguntas-wrapper, .area-header-with-button, .area-titulo,
// .accordion-item, .accordion-content, .accordion-content.open, .habilidades-lista,
// .linha-habilidade, .texto-habilidade, .niveis-habilidade, .circulo-nivel,
// .circulo-nivel.ativo, .circulo-nivel.NR, .circulo-nivel.AF, .circulo-nivel.AG,
// .circulo-nivel.AV, .circulo-nivel.AVi, .circulo-nivel.I, .circulo-nivel.NA,
// .observacoes-area, .loading, .mensagem-erro
// (As cores específicas para .circulo-nivel.NR, .AF, etc., devem estar no CSS para funcionar)

export default VerAvaliacao;
