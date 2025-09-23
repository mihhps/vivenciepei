import React, { useState, useEffect } from "react";

// Função para formatar a descrição completa para o formulário principal
function formatarDescricaoParaFormulario(sugestao) {
  if (!sugestao || typeof sugestao !== "object") {
    return sugestao || "";
  }
  const { titulo, objetivos, recursos, metodologia, duracao } = sugestao;
  const objetivosFormatados = (objetivos || []).map((o) => `- ${o}`).join("\n");
  return `Título: ${
    titulo || ""
  }\n\nObjetivos:\n${objetivosFormatados}\n\nRecursos: ${
    recursos || ""
  }\n\nMetodologia: ${metodologia || ""}\n\nDuração: ${duracao || ""}`;
}

function SugestoesAtividades({
  habilidade,
  getSugestoes,
  onSelectSugestao,
  onClose,
}) {
  const [sugestoesList, setSugestoesList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarSugestoesIniciais = (forceRefresh = false) => {
    setCarregando(true);
    setErro(null);
    getSugestoes("atividadePrincipal", habilidade, forceRefresh)
      .then((resultado) => {
        if (resultado && resultado.length > 0) {
          setSugestoesList(resultado);
          setCurrentIndex(0);
        } else {
          setErro("Nenhuma sugestão foi encontrada.");
        }
      })
      .catch((err) => {
        console.error("SugestoesAtividades: Erro ao buscar sugestões.", err);
        setErro("Não foi possível gerar a sugestão.");
      })
      .finally(() => {
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregarSugestoesIniciais();
  }, [habilidade]);

  const handleMostrarProximaSugestao = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % sugestoesList.length);
  };

  const handleUsarAtividade = () => {
    const sugestaoAtual = sugestoesList[currentIndex];
    if (sugestaoAtual) {
      const descricaoFormatada = formatarDescricaoParaFormulario(sugestaoAtual);
      onSelectSugestao({ habilidade, descricao: descricaoFormatada });
    }
  };

  const sugestaoAtual = sugestoesList[currentIndex];

  if (carregando) {
    return (
      <div className="sugestoes-wrapper">
        <div className="sugestoes-loading">Gerando sugestões com IA...</div>
      </div>
    );
  }

  if (erro || !sugestaoAtual) {
    return (
      <div className="sugestoes-wrapper">
        <div className="sugestoes-erro">
          {erro || "Não há sugestões para exibir."}
        </div>
        <button onClick={onClose} className="sugestoes-close-btn">
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="sugestoes-wrapper">
      <button onClick={onClose} className="sugestoes-close-btn" title="Fechar">
        ×
      </button>

      <div className="sugestao-card">
        <h4>{sugestaoAtual.titulo}</h4>

        <div className="sugestao-section">
          <strong>Objetivos:</strong>
          <ul>
            {(sugestaoAtual.objetivos || []).map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>

        <div className="sugestao-section">
          <strong>Recursos:</strong>
          <p>{sugestaoAtual.recursos}</p>
        </div>

        <div className="sugestao-section">
          <strong>Metodologia:</strong>
          <p style={{ whiteSpace: "pre-wrap" }}>{sugestaoAtual.metodologia}</p>
        </div>

        <div className="sugestao-section">
          <strong>Duração:</strong>
          <p>{sugestaoAtual.duracao}</p>
        </div>

        <div className="sugestao-actions">
          <button
            className="botao-gerar-novas"
            onClick={handleMostrarProximaSugestao}
          >
            Próxima Sugestão
          </button>
          <button className="botao-usar-sugestao" onClick={handleUsarAtividade}>
            Usar esta Atividade
          </button>
        </div>
      </div>

      <button
        className="botao-forcar-novas"
        onClick={() => carregarSugestoesIniciais(true)}
      >
        Buscar novas ideias (ignora o cache)
      </button>
    </div>
  );
}

export default SugestoesAtividades;
