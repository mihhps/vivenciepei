import React, { useState, useEffect, useCallback } from "react";

function SugestoesAtividades({
  habilidade,
  onSelectSugestao,
  getSugestoes,
  onClose,
}) {
  const [sugestoes, setSugestoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const buscar = useCallback(async () => {
    if (!habilidade) return;
    setCarregando(true);
    setErro(null);
    setSugestoes([]);
    try {
      const resultado = await getSugestoes(habilidade);
      setSugestoes(resultado);
    } catch (e) {
      setErro("Falha ao carregar sugestões.");
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, [habilidade, getSugestoes]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const handleSelect = (sugestao) => {
    const objetivosFormatados = (sugestao.objetivos || [])
      .map((obj) => `- ${obj}`)
      .join("\n");
    const descricaoCompleta = `Título: ${sugestao.titulo}

Objetivos:
${objetivosFormatados}

Recursos:
${sugestao.recursos}

Como Fazer (Metodologia):
${sugestao.metodologia}

Duração Estimada:
${sugestao.duracao}`;

    onSelectSugestao({ habilidade, descricao: descricaoCompleta });
  };

  return (
    <div className="sugestoes-container-fade-in">
      <div className="sugestoes-header">
        <h4>Sugestões para "{habilidade.habilidade}"</h4>
        <button onClick={onClose} className="sugestoes-close-btn">
          ×
        </button>
      </div>

      <div className="sugestoes-actions">
        <button
          onClick={buscar}
          className="botao-gerar-novas"
          disabled={carregando}
        >
          {carregando ? "Gerando..." : "↻ Gerar Novas Sugestões"}
        </button>
      </div>

      {carregando && (
        <p className="sugestoes-feedback">Pensando em atividades...</p>
      )}
      {erro && <p className="sugestoes-feedback erro">{erro}</p>}

      {!carregando && sugestoes?.length === 0 && !erro && (
        <p className="sugestoes-feedback">Nenhuma sugestão encontrada.</p>
      )}

      <div className="sugestoes-lista">
        {(sugestoes || []).map((sugestao, index) => (
          <div key={index} className="sugestao-card">
            <h5>{sugestao.titulo}</h5>

            <div className="sugestao-detalhe">
              <strong>Objetivos:</strong>
              <ul>
                {(sugestao.objetivos || []).map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>

            <div className="sugestao-detalhe">
              <strong>Recursos:</strong>
              <p>{sugestao.recursos}</p>
            </div>

            <div className="sugestao-detalhe">
              <strong>Como Fazer (Metodologia):</strong>
              <p>{sugestao.metodologia}</p>
            </div>

            <div className="sugestao-detalhe">
              <strong>Duração Estimada:</strong>
              <p>{sugestao.duracao}</p>
            </div>

            <button
              className="botao-usar-sugestao"
              onClick={() => handleSelect(sugestao)}
            >
              Usar esta Atividade
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SugestoesAtividades;
