import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar";

import "../styles/VerAvaliacao.css";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";

// Configuração de estilos e níveis (pode ser mantida como está)
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

// ========= FUNÇÕES HELPER CORRIGIDAS =========

/**
 * Normaliza uma string para comparação, removendo acentos, espaços e convertendo para minúsculas.
 */
const limparString = (str) => {
  if (typeof str !== "string") return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

/**
 * Encontra a descrição da habilidade com base na área, nome da habilidade e nível.
 * ESTA É A FUNÇÃO CORRIGIDA.
 */
const encontrarDescricaoCompleta = (areaPrincipal, habilidade, nivel) => {
  // Encontra a área correspondente nos dados locais, ignorando acentos/maiúsculas.
  const areaData = avaliacaoInicial[areaPrincipal];

  // Se a área não for encontrada nos dados, retorna uma mensagem de erro.
  if (!areaData) {
    console.warn(
      `Área "${areaPrincipal}" não encontrada em avaliacaoInicialData.`
    );
    return "Área não encontrada na base de dados.";
  }

  // Normaliza a habilidade vinda do Firebase para comparação.
  const habilidadeLimpa = limparString(habilidade);

  // Procura o objeto da habilidade dentro do array da área.
  const habilidadeObj = areaData.find(
    (item) => limparString(item.habilidade) === habilidadeLimpa
  );

  // Se o objeto da habilidade for encontrado, retorna a descrição do nível específico.
  if (habilidadeObj && habilidadeObj.niveis) {
    return (
      habilidadeObj.niveis[nivel] || "Descrição para este nível não encontrada."
    );
  }

  // Se a habilidade específica não for encontrada dentro da área, retorna um aviso.
  return "Habilidade não encontrada na base de dados.";
};

// ========= COMPONENTE REACT =========

function VerAvaliacao() {
  const { id } = useParams();
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
        console.error("Erro ao carregar avaliação:", err);
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
          ([areaPrincipal, habilidades]) => {
            const todasHabilidadesDaArea = Object.entries(habilidades || {});
            if (todasHabilidadesDaArea.length === 0) return null;

            return (
              <div key={areaPrincipal} className="area-perguntas-wrapper">
                <div className="area-header-with-button">
                  <h3 className="area-titulo">{areaPrincipal}</h3>
                </div>
                <div className="accordion-item">
                  <div className="accordion-content open">
                    <div className="habilidades-lista">
                      {todasHabilidadesDaArea.map(([habilidade, nivel]) => {
                        if (nivel === "NA") {
                          return null;
                        }

                        const descricaoCompleta = encontrarDescricaoCompleta(
                          areaPrincipal,
                          habilidade,
                          nivel
                        );

                        return (
                          <div key={habilidade} className="linha-habilidade">
                            <span className="texto-habilidade">
                              {habilidade}
                            </span>
                            <div className="niveis-habilidade">
                              <span
                                key={nivel}
                                className={`circulo-nivel ${nivel} ativo`}
                                title={descricaoCompleta}
                              >
                                {nivel}
                              </span>
                              <span className="descricao-habilidade">
                                {descricaoCompleta}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {avaliacao.observacoes?.[areaPrincipal] && (
                  <div className="observacoes-area">
                    <label>Observações:</label>
                    <p>{avaliacao.observacoes[areaPrincipal]}</p>
                  </div>
                )}
              </div>
            );
          }
        )}
        <div className="legenda-niveis-container">
          <h4>Legenda dos Níveis</h4>
          <div className="legenda-niveis">
            {Object.entries(NIVEL_CONFIG).map(([nivel, config]) => {
              if (nivel === "NA") {
                return null;
              }
              return (
                <div key={nivel} className="legenda-item">
                  <span
                    className={`legenda-circulo circulo-nivel ${nivel}`}
                    title={config.descricao}
                  >
                    {nivel}
                  </span>
                  <span className="legenda-descricao">{config.descricao}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerAvaliacao;
