import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar"; // Importando o componente

// Configuração de estilos e níveis
const NIVEL_CONFIG = {
  NR: {
    cor: "#e63946",
    descricao: "Necessita de recursos e apoio total",
    corTexto: "#FFFFFF",
  },
  AF: { cor: "#f1a208", descricao: "Apoio frequente", corTexto: "#000000" },
  AV: { cor: "#457b9d", descricao: "Apoio eventual", corTexto: "#FFFFFF" },
  AVi: {
    cor: "#2a9d8f",
    descricao: "Apoio visual ou lembrete",
    corTexto: "#FFFFFF",
  },
  I: { cor: "#2b9348", descricao: "Independente", corTexto: "#FFFFFF" },
  NA: { cor: "#adb5bd", descricao: "Não aplicável", corTexto: "#000000" },
};

function VerAvaliacao() {
  const { id } = useParams();
  const navigate = useNavigate(); // Usado apenas como fallback no BotaoVoltar
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

  if (loading)
    return <div style={estilosGlobais.statusContainer}>Carregando...</div>;
  if (error)
    return (
      <div style={{ ...estilosGlobais.statusContainer, color: "#e63946" }}>
        {error}
      </div>
    );
  if (!avaliacao)
    return (
      <div style={estilosGlobais.statusContainer}>
        Avaliação não disponível.
      </div>
    );

  return (
    <div style={estilos.paginaContainer}>
      <div style={estilos.cardPrincipal}>
        <div style={estilos.cabecalhoCard}>
          <h2 style={estilos.tituloPrincipal}>Resumo da Avaliação Inicial</h2>

          {/* ======================= CORREÇÃO APLICADA AQUI ======================= */}
          <BotaoVoltar destino="/ver-avaliacoes" />
          {/* ====================================================================== */}
        </div>

        <div style={estilos.infoAlunoContainer}>
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
            const habilidadesFiltradas = Object.entries(
              habilidades || {}
            ).filter(([_, nivel]) => nivel !== "I" && nivel !== "NA");
            if (habilidadesFiltradas.length === 0) return null;

            return (
              <div key={area} style={estilos.areaContainer}>
                <h3 style={estilos.tituloArea}>{area}</h3>
                <div style={estilos.habilidadesLista}>
                  {habilidadesFiltradas.map(([habilidade, nivel]) => {
                    const configNivel = NIVEL_CONFIG[nivel] || {
                      cor: "#f1f1f1",
                      corTexto: "#000000",
                      descricao: "Nível desconhecido",
                    };
                    return (
                      <div
                        key={habilidade}
                        style={{
                          ...estilos.habilidadeItem,
                          backgroundColor: configNivel.cor,
                          color: configNivel.corTexto,
                        }}
                        title={configNivel.descricao}
                      >
                        <span style={estilos.habilidadeTexto}>
                          {habilidade}
                        </span>
                        <span
                          style={{
                            ...estilos.habilidadeNivelBadge,
                            backgroundColor: configNivel.corTexto,
                            color: configNivel.cor,
                          }}
                        >
                          {nivel}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {avaliacao.observacoes?.[area] && (
                  <div style={estilos.observacoesContainer}>
                    <strong>Observações:</strong> {avaliacao.observacoes[area]}
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

// Estilos
const estilosGlobais = {
  statusContainer: {
    padding: "30px",
    textAlign: "center",
    fontSize: "18px",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

const estilos = {
  paginaContainer: {
    minHeight: "100vh",
    width: "100%",
    background: "#f0f4f8",
    padding: "20px",
    boxSizing: "border-box",
  },
  cardPrincipal: {
    maxWidth: "1100px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "12px",
    padding: "30px 40px",
    boxShadow: "0 4px 18px rgba(0,0,0,0.10)",
  },
  cabecalhoCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    borderBottom: "1px solid #e0e0e0",
    paddingBottom: "20px",
  },
  tituloPrincipal: {
    color: "#1d3557",
    fontSize: "24px",
    margin: 0,
  },
  infoAlunoContainer: {
    marginBottom: "30px",
    fontSize: "16px",
    lineHeight: 1.7,
    padding: "15px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
  },
  areaContainer: {
    marginBottom: "40px",
  },
  tituloArea: {
    backgroundColor: "#1d3557",
    color: "#fff",
    padding: "12px 18px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "20px",
  },
  habilidadesLista: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  habilidadeItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 18px",
    borderRadius: "8px",
    fontWeight: "500",
  },
  habilidadeTexto: {
    fontSize: "16px",
    flex: 1,
  },
  habilidadeNivelBadge: {
    padding: "5px 12px",
    borderRadius: "16px",
    fontSize: "13px",
    fontWeight: "bold",
    minWidth: "30px",
    textAlign: "center",
  },
  observacoesContainer: {
    marginTop: "20px",
    backgroundColor: "#fffceb",
    padding: "15px",
    borderLeft: "5px solid #f4a261",
    borderRadius: "0 8px 8px 0",
    fontSize: "15px",
    color: "#543D2B",
    lineHeight: 1.6,
  },
};

export default VerAvaliacao;
