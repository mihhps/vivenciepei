import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar";

// Configuração de estilos e níveis (mantida, mas as cores serão aplicadas via CSS para as bolinhas)
const NIVEL_CONFIG = {
  NR: {
    cor: "#e63946",
    descricao: "Necessita de recursos e apoio total",
    corTexto: "#FFFFFF",
  },
  AF: { cor: "#f1a208", descricao: "Apoio frequente", corTexto: "#000000" },
  AG: { cor: "#e9c46a", descricao: "Apoio gestual", corTexto: "#000000" },
  AV: { cor: "#2a9d8f", descricao: "Apoio eventual", corTexto: "#FFFFFF" },
  AVi: {
    cor: "#8ecae6",
    descricao: "Apoio visual ou lembrete",
    corTexto: "#000000",
  },
  I: { cor: "#4caf50", descricao: "Independente", corTexto: "#FFFFFF" },
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
        // A coleção correta deve ser 'avaliacoesIniciais'
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
      <div className="avaliacao-card">
        <div className="avaliacao-header">
          <h2 className="avaliacao-titulo">Resumo da Avaliação Inicial</h2>
          <BotaoVoltar destino="/ver-avaliacoes" />
        </div>
        <div className="info-aluno-container">
          {/* CORREÇÃO AQUI: Acessa avaliacao.aluno.nome se avaliacao.aluno for um objeto */}
          <p>
            <strong>Aluno:</strong>{" "}
            {typeof avaliacao.aluno === "object" && avaliacao.aluno !== null
              ? avaliacao.aluno.nome
              : avaliacao.aluno || "Não informado"}
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
            const todasHabilidadesDaArea = Object.entries(habilidades || {});

            if (todasHabilidadesDaArea.length === 0) return null;

            return (
              <div key={area} className="area-perguntas-wrapper">
                <div className="area-header-with-button">
                  <h3 className="area-titulo">{area}</h3>
                </div>
                <div className="accordion-item">
                  <div className="accordion-content open">
                    <div className="habilidades-lista">
                      {todasHabilidadesDaArea.map(([habilidade, nivel]) => {
                        return (
                          <div key={habilidade} className="linha-habilidade">
                            <span className="texto-habilidade">
                              {habilidade}
                            </span>
                            <div className="niveis-habilidade">
                              {Object.keys(NIVEL_CONFIG).map((optionLevel) => {
                                const isSelected = optionLevel === nivel;
                                const className = `circulo-nivel ${optionLevel} ${isSelected ? "ativo" : ""}`;

                                return (
                                  <span
                                    key={optionLevel}
                                    className={className}
                                    title={NIVEL_CONFIG[optionLevel].descricao}
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
                    <label>Observações:</label>
                    <p>{avaliacao.observacoes[area]}</p>
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

export default VerAvaliacao;
