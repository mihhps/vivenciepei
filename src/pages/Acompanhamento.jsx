// src/pages/AcompanhamentoSEME.jsx
import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import DetalhesEscolaPEIs from "../components/DetalhesEscolaPEIs";
import BotaoVoltar from "../components/BotaoVoltar";
import "../styles/Acompanhamento.css";

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// --- Constantes para Status do PEI ---
const PEI_STATUS = {
  CONCLUIDO: "concluído",
  EM_ELABORACAO: "em elaboração",
  // Adicione outros status que você considerar "ativos" ou "finalizados" aqui
  // EX: AGUARDANDO_REVISAO: "aguardando revisão",
};

// --- Styled Components ---
const PageContainer = styled.div`
  padding: 25px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f4f7f6;
  min-height: 100vh;
`;
const TopNavigation = styled.div`
  width: 100%;
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
`;
const HeaderControls = styled.div`
  margin-bottom: 25px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  label {
    font-weight: 500;
    color: #333;
    margin-right: 5px;
  }
  select,
  input[type="text"] {
    padding: 10px 14px;
    border-radius: 6px;
    border: 1px solid #ccc;
    background-color: white;
    font-size: 1em;
  }
  input[type="text"] {
    flex-grow: 1;
    max-width: 300px;
  }
  select {
    min-width: 150px;
  }
`;
const ChartContainer = styled.div`
  margin-bottom: 40px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  padding: 25px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
`;
const TableResponsiveContainer = styled.div`
  width: 100%;
  overflow-x: auto;
`;
// Fim dos Styled Components

function AcompanhamentoSEME() {
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState(
    new Date().getFullYear()
  );
  const [dadosAcompanhamento, setDadosAcompanhamento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);

  // Novos estados para filtro e ordenação
  const [filtroNomeEscola, setFiltroNomeEscola] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "nomeEscola", // Chave inicial para ordenação
    direction: "ascending",
  });

  // Carrega os anos disponíveis para o select
  useEffect(() => {
    const anoAtual = new Date().getFullYear();
    const rangeAnos = [
      anoAtual + 1,
      anoAtual,
      anoAtual - 1,
      anoAtual - 2,
      anoAtual - 3,
    ];
    setAnosDisponiveis(rangeAnos);
  }, []);

  // Busca os dados de acompanhamento quando o ano letivo muda ou quando se volta da tela de detalhes da escola
  useEffect(() => {
    // Se uma escola está selecionada, não recarrega os dados globais
    if (escolaSelecionada) {
      setLoading(false);
      return;
    }
    // Não executa a busca se o ano letivo ainda não foi definido
    if (!anoLetivoSelecionado) {
      setLoading(false);
      return;
    }

    const fetchDadosAcompanhamento = async () => {
      setLoading(true);
      setError(null);
      setDadosAcompanhamento([]); // Limpa dados anteriores antes de carregar
      try {
        // 1. Busca todas as escolas
        const escolasSnapshot = await getDocs(collection(db, "escolas"));
        const escolas = escolasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 2. Para cada escola, agrega os dados de alunos e PEIs
        const dadosAgregadosPromises = escolas.map(async (escola) => {
          // Total de alunos que necessitam de monitoramento na escola
          const alunosNecessitandoQuery = query(
            collection(db, "alunos"),
            where("escolaId", "==", escola.id)
            // Futuramente, pode ser necessário filtrar alunos por ano letivo, se aplicável.
            // where("anoIngresso", "==", anoLetivoSelecionado)
          );
          const totalNecessitandoSnapshot = await getCountFromServer(
            alunosNecessitandoQuery
          );
          const totalNecessitando = totalNecessitandoSnapshot.data().count;

          // PEIs da escola para o ano letivo selecionado
          const peisQuery = query(
            collection(db, "PEIs"),
            where("escolaId", "==", escola.id),
            where("anoLetivo", "==", anoLetivoSelecionado)
          );
          const peisSnapshot = await getDocs(peisQuery);

          let peisComStatusEmElaboracao = 0;
          let peisComStatusConcluido = 0;
          let peisAtrasados = 0;

          peisSnapshot.forEach((doc) => {
            const pei = doc.data();
            const statusOriginal = pei.status;
            const statusPEI = statusOriginal
              ? statusOriginal.trim().toLowerCase()
              : "";

            // Contagem baseada nos status definidos
            if (statusPEI === PEI_STATUS.CONCLUIDO) {
              peisComStatusConcluido++;
            } else if (statusPEI === PEI_STATUS.EM_ELABORACAO) {
              peisComStatusEmElaboracao++;
              // Verifica se o PEI "Em Elaboração" está atrasado
              if (pei.dataPrevistaTermino && pei.dataPrevistaTermino.toDate) {
                try {
                  const dataPrevista = pei.dataPrevistaTermino.toDate();
                  const hoje = new Date();
                  hoje.setHours(0, 0, 0, 0); // Zera horas para comparar apenas a data
                  if (dataPrevista < hoje) peisAtrasados++;
                } catch (e) {
                  // Loga erro se a data for inválida, mas não interrompe o processo
                  console.warn(
                    `[AcompanhamentoSEME] Erro ao processar dataPrevistaTermino para PEI ${doc.id}:`,
                    e
                  );
                }
              }
            }
            // Adicione mais `else if` aqui para outros status, se necessário
            // Ex: else if (statusPEI === PEI_STATUS.AGUARDANDO_REVISAO) { /* ... */ }
          });

          // PEIs que já existem (seja em elaboração ou concluídos)
          const peisExistentes =
            peisComStatusEmElaboracao + peisComStatusConcluido;
          // PEIs que deveriam existir, mas ainda não foram criados
          const pendenteCriacaoCalculado = Math.max(
            0,
            totalNecessitando - peisExistentes
          );

          const percentualConcluidosNum =
            totalNecessitando > 0
              ? (peisComStatusConcluido / totalNecessitando) * 100
              : 0;

          return {
            id: escola.id,
            nomeEscola: escola.nome || "Nome Indisponível",
            totalNecessitando,
            pendenteCriacao: pendenteCriacaoCalculado,
            emElaboracao: peisComStatusEmElaboracao, // Total em elaboração
            atrasados: peisAtrasados, // Desses em elaboração, quantos estão atrasados
            concluidos: peisComStatusConcluido,
            percentualConcluidosNum: percentualConcluidosNum, // Adicionado para ordenação numérica
          };
        });

        const dadosFinais = await Promise.all(dadosAgregadosPromises);
        setDadosAcompanhamento(dadosFinais);
      } catch (err) {
        console.error(
          "[AcompanhamentoSEME] Erro geral ao buscar dados de acompanhamento:",
          err
        );
        setError("Falha ao carregar os dados. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };
    fetchDadosAcompanhamento();
  }, [anoLetivoSelecionado, escolaSelecionada]); // Dependências: ano letivo e estado da seleção de escola

  // Lógica para filtrar e ordenar os dados da tabela
  const dadosFiltradosESortidos = useMemo(() => {
    let dadosProcessados = [...dadosAcompanhamento];

    // 1. Filtragem por nome da escola
    if (filtroNomeEscola) {
      dadosProcessados = dadosProcessados.filter((escola) =>
        escola.nomeEscola.toLowerCase().includes(filtroNomeEscola.toLowerCase())
      );
    }

    // 2. Ordenação
    if (sortConfig.key) {
      dadosProcessados.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Tratamento para ordenação numérica vs. string para garantir a comparação correta
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return dadosProcessados;
  }, [dadosAcompanhamento, filtroNomeEscola, sortConfig]);

  // Alterna a direção da ordenação ao clicar no cabeçalho da coluna
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Retorna o ícone de ordenação para os cabeçalhos da tabela
  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "ascending" ? " ▲" : " ▼";
    }
    return ""; // Ou ' ↕' para indicar que é ordenável sem direção atual
  };

  // Dados para o gráfico de barras (otimizado com useMemo)
  const chartData = useMemo(() => {
    // Escolhe qual conjunto de dados usar para o gráfico: filtrados ou todos
    const dataParaGrafico = filtroNomeEscola
      ? dadosFiltradosESortidos
      : dadosAcompanhamento;

    if (!dataParaGrafico.length) {
      return { labels: [], datasets: [] }; // Retorna dados vazios se não houver dados
    }

    // Soma os totais para o gráfico
    const totalPendenteCriacao = dataParaGrafico.reduce(
      (sum, data) => sum + data.pendenteCriacao,
      0
    );
    const totalEmElaboracaoBruto = dataParaGrafico.reduce(
      (sum, data) => sum + data.emElaboracao,
      0
    );
    const totalAtrasados = dataParaGrafico.reduce(
      (sum, data) => sum + data.atrasados,
      0
    );
    const totalConcluidos = dataParaGrafico.reduce(
      (sum, data) => sum + data.concluidos,
      0
    );

    const emElaboracaoNoPrazo = totalEmElaboracaoBruto - totalAtrasados;

    return {
      labels: [
        "Status Geral dos PEIs" +
          (filtroNomeEscola ? ` (Escola: ${filtroNomeEscola})` : ""),
      ],
      datasets: [
        {
          label: "Pendente de Criação",
          data: [totalPendenteCriacao],
          backgroundColor: "rgba(220, 53, 69, 0.7)", // Vermelho
        },
        {
          label: "Em Elaboração (no prazo)",
          data: [emElaboracaoNoPrazo < 0 ? 0 : emElaboracaoNoPrazo], // Evita valores negativos
          backgroundColor: "rgba(54, 162, 235, 0.7)", // Azul
        },
        {
          label: "Atrasados",
          data: [totalAtrasados],
          backgroundColor: "rgba(255, 140, 0, 0.7)", // Laranja
        },
        {
          label: "Concluídos",
          data: [totalConcluidos],
          backgroundColor: "rgba(40, 167, 69, 0.7)", // Verde
        },
      ],
    };
  }, [dadosAcompanhamento, dadosFiltradosESortidos, filtroNomeEscola]); // Dependências do gráfico

  // Opções de configuração do gráfico de barras
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: `Resumo de Status dos PEIs - ${anoLetivoSelecionado}`,
      },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }, // Assegura que o eixo Y mostre números inteiros
    },
  };

  // Funções para navegação entre o resumo e os detalhes da escola
  const handleSelecionarEscola = (escola) => setEscolaSelecionada(escola);
  const handleVoltarParaResumo = () => setEscolaSelecionada(null);

  // Exibe mensagem de erro se houver
  if (error)
    return (
      <PageContainer>
        <TopNavigation>
          <BotaoVoltar />
        </TopNavigation>
        <p style={{ color: "red", textAlign: "center" }}>{error}</p>
      </PageContainer>
    );

  // Renderiza o componente de detalhes da escola se uma escola for selecionada
  if (escolaSelecionada) {
    return (
      <PageContainer>
        <DetalhesEscolaPEIs
          escolaId={escolaSelecionada.id}
          nomeEscola={escolaSelecionada.nomeEscola}
          anoLetivo={anoLetivoSelecionado}
          onVoltar={handleVoltarParaResumo}
        />
      </PageContainer>
    );
  }

  // Renderização principal da página de acompanhamento
  return (
    <PageContainer>
      <TopNavigation>
        <BotaoVoltar />
      </TopNavigation>
      <HeaderControls>
        <div>
          <label htmlFor="anoLetivoSelect">Ano Letivo:</label>
          <select
            id="anoLetivoSelect"
            value={anoLetivoSelecionado}
            onChange={(e) => setAnoLetivoSelecionado(Number(e.target.value))}
            disabled={loading} // Desabilita o select durante o carregamento
          >
            {anosDisponiveis.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtroEscola">Filtrar Escola:</label>
          <input
            type="text"
            id="filtroEscola"
            placeholder="Digite o nome da escola..."
            value={filtroNomeEscola}
            onChange={(e) => setFiltroNomeEscola(e.target.value)}
            disabled={loading} // Desabilita o input durante o carregamento
          />
        </div>
        {loading && (
          <p style={{ margin: 0, marginLeft: "auto", color: "#007bff" }}>
            Carregando...
          </p>
        )}
      </HeaderControls>

      {/* Renderiza o gráfico apenas se não estiver carregando e houver dados para exibir */}
      {!loading &&
        (filtroNomeEscola
          ? dadosFiltradosESortidos.length > 0
          : dadosAcompanhamento.length > 0) && (
          <ChartContainer style={{ height: "350px", position: "relative" }}>
            <Bar options={chartOptions} data={chartData} />
          </ChartContainer>
        )}

      <TableResponsiveContainer>
        <table className="acompanhamento-table">
          <thead>
            <tr>
              <th onClick={() => requestSort("nomeEscola")}>
                Escola {getSortIndicator("nomeEscola")}
              </th>
              <th
                className="text-center"
                onClick={() => requestSort("totalNecessitando")}
              >
                Total Alunos Monitorados {getSortIndicator("totalNecessitando")}
              </th>
              <th
                className="text-center"
                onClick={() => requestSort("pendenteCriacao")}
              >
                PEIs Pendentes {getSortIndicator("pendenteCriacao")}
              </th>
              <th
                className="text-center"
                onClick={() => requestSort("emElaboracao")}
              >
                Em Elaboração (no prazo) {getSortIndicator("emElaboracao")}
              </th>
              <th
                className="text-center"
                onClick={() => requestSort("atrasados")}
              >
                Atrasados {getSortIndicator("atrasados")}
              </th>
              <th
                className="text-center"
                onClick={() => requestSort("concluidos")}
              >
                Concluídos {getSortIndicator("concluidos")}
              </th>
              <th
                className="text-center"
                onClick={() => requestSort("percentualConcluidosNum")}
              >
                % Concluídos {getSortIndicator("percentualConcluidosNum")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && dadosFiltradosESortidos.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center">
                  Carregando dados das escolas...
                </td>
              </tr>
            ) : (
              dadosFiltradosESortidos.map((escola) => {
                const emElaboracaoNoPrazo =
                  escola.emElaboracao - escola.atrasados;
                const percentualConcluidosFormatado =
                  escola.totalNecessitando > 0
                    ? `${escola.percentualConcluidosNum.toFixed(1)}%`
                    : "N/A";

                return (
                  <tr key={escola.id}>
                    <td>
                      <button
                        type="button"
                        className="escola-link-button"
                        onClick={() => handleSelecionarEscola(escola)}
                      >
                        {escola.nomeEscola}
                      </button>
                    </td>
                    <td className="text-center">{escola.totalNecessitando}</td>
                    <td
                      className={`text-center ${
                        escola.pendenteCriacao > 0 ? "status-pendente" : ""
                      }`}
                    >
                      {escola.pendenteCriacao}
                    </td>
                    <td className="text-center">
                      {emElaboracaoNoPrazo < 0 ? 0 : emElaboracaoNoPrazo}
                    </td>
                    <td
                      className={`text-center ${
                        escola.atrasados > 0 ? "status-atrasado" : ""
                      }`}
                    >
                      {escola.atrasados}
                    </td>
                    <td className={`text-center status-concluido`}>
                      {escola.concluidos}
                    </td>
                    <td className="text-center">
                      {percentualConcluidosFormatado}
                    </td>
                  </tr>
                );
              })
            )}
            {/* Mensagem quando não há dados após filtros/carregamento */}
            {!loading && dadosFiltradosESortidos.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center">
                  {filtroNomeEscola
                    ? "Nenhuma escola encontrada com o filtro aplicado."
                    : "Nenhuma escola encontrada ou nenhum dado de PEI disponível para o ano letivo selecionado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableResponsiveContainer>
      <p style={{ fontSize: "0.9em", marginTop: "15px", color: "#555" }}>
        <br />

        <br />
      </p>
    </PageContainer>
  );
}
export default AcompanhamentoSEME;
