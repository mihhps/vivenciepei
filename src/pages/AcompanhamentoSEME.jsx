// src/pages/AcompanhamentoSEME.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import styled from "styled-components";
import { Bar } from "react-chartjs-2";
import PropTypes from "prop-types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";
import DetalhesEscolaPEIs from "../components/DetalhesEscolaPEIs"; // Certifique-se que o caminho está correto
import "../styles/Acompanhamento.css"; // Para estilos da tabela e status

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CLOUD_FUNCTION_URL =
  "https://getpeiacompanhamentobyschool-hc7r4cnuvq-uc.a.run.app";
// --- Constantes para Status do PEI ---
const PEI_STATUS = {
  CONCLUIDO: "concluído",
  EM_ELABORACAO: "em elaboração",
};

// --- Styled Components (mantidos) ---
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
  min-height: 350px;
  display: flex;
  justify-content: center;
  align-items: center;
`;
const TableResponsiveContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  padding: 1px;
`;

const MessageContainer = styled.div`
  color: ${({ type }) => (type === "error" ? "#dc3545" : "#457b9d")};
  background-color: ${({ type }) => (type === "error" ? "#ffe6e6" : "#e0f2f7")};
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  font-weight: ${({ type }) => (type === "error" ? "bold" : "normal")};
  margin: 20px auto;
  max-width: 800px;
  border: 1px solid ${({ type }) => (type === "error" ? "#e63946" : "#a8dadc")};
`;

// --- Novo Componente: TabelaAcompanhamento ---
// Encapsula a lógica de ordenação e renderização da tabela
function TabelaAcompanhamento({
  data,
  onSelectSchool,
  sortConfig,
  onRequestSort,
  getSortIndicator,
  loading,
  filtroNomeEscola,
}) {
  // <--- ADICIONE ESTE BLOCO LOGO ABAIXO DA DEFINIÇÃO DO COMPONENTE
  TabelaAcompanhamento.propTypes = {
    data: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        nomeEscola: PropTypes.string.isRequired,
        totalAlunosMonitorados: PropTypes.number.isRequired,
        pendenteCriacao: PropTypes.number.isRequired,
        emElaboracao: PropTypes.number.isRequired,
        atrasados: PropTypes.number.isRequired,
        concluidos: PropTypes.number.isRequired,
        percentualConcluidosNum: PropTypes.number.isRequired,
      })
    ).isRequired,
    onSelectSchool: PropTypes.func.isRequired,
    sortConfig: PropTypes.shape({
      key: PropTypes.string,
      direction: PropTypes.oneOf(["ascending", "descending"]),
    }).isRequired,
    onRequestSort: PropTypes.func.isRequired,
    getSortIndicator: PropTypes.func.isRequired,
    loading: PropTypes.bool.isRequired,
    filtroNomeEscola: PropTypes.string.isRequired,
  };

  if (loading) {
    return (
      <TableResponsiveContainer>
        <table className="acompanhamento-table">
          <thead>
            <tr>
              <th>Escola</th>
              <th className="text-center">Total Alunos Monitorados</th>
              <th className="text-center">PEIs Pendentes</th>
              <th className="text-center">Em Elaboração (no prazo)</th>
              <th className="text-center">Atrasados</th>
              <th className="text-center">Concluídos</th>
              <th className="text-center">% Concluídos</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="7" className="text-center">
                <Loader message="Carregando dados das escolas..." />
              </td>
            </tr>
          </tbody>
        </table>
      </TableResponsiveContainer>
    );
  }

  // Mensagem quando não há dados após filtros/carregamento
  if (data.length === 0) {
    return (
      <MessageContainer type="info">
        {filtroNomeEscola
          ? "Nenhuma escola encontrada com o filtro aplicado."
          : "Nenhuma escola encontrada ou nenhum dado de PEI disponível para o ano letivo selecionado."}
      </MessageContainer>
    );
  }

  return (
    <TableResponsiveContainer>
      <table className="acompanhamento-table">
        <thead>
          <tr>
            <th onClick={() => onRequestSort("nomeEscola")}>
              Escola {getSortIndicator("nomeEscola")}
            </th>
            <th
              className="text-center"
              onClick={() => onRequestSort("totalAlunosMonitorados")}
            >
              Total Alunos Monitorados{" "}
              {getSortIndicator("totalAlunosMonitorados")}
            </th>
            <th
              className="text-center"
              onClick={() => onRequestSort("pendenteCriacao")}
            >
              PEIs Pendentes {getSortIndicator("pendenteCriacao")}
            </th>
            <th
              className="text-center"
              onClick={() => onRequestSort("emElaboracao")}
            >
              Em Elaboração (no prazo) {getSortIndicator("emElaboracao")}
            </th>
            <th
              className="text-center"
              onClick={() => onRequestSort("atrasados")}
            >
              Atrasados {getSortIndicator("atrasados")}
            </th>
            <th
              className="text-center"
              onClick={() => onRequestSort("concluidos")}
            >
              Concluídos {getSortIndicator("concluidos")}
            </th>
            <th
              className="text-center"
              onClick={() => onRequestSort("percentualConcluidosNum")}
            >
              % Concluídos {getSortIndicator("percentualConcluidosNum")}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((escola) => {
            const emElaboracaoNoPrazo = escola.emElaboracao - escola.atrasados;
            const percentualConcluidosFormatado =
              escola.totalAlunosMonitorados > 0
                ? `${escola.percentualConcluidosNum.toFixed(1)}%`
                : "N/A";

            return (
              <tr key={escola.id}>
                <td>
                  <button
                    type="button"
                    className="escola-link-button"
                    onClick={() => onSelectSchool(escola)}
                  >
                    {escola.nomeEscola}
                  </button>
                </td>
                <td className="text-center">{escola.totalAlunosMonitorados}</td>
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
                <td className="text-center">{percentualConcluidosFormatado}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableResponsiveContainer>
  );
}

// --- Componente Principal AcompanhamentoSEME ---
function AcompanhamentoSEME() {
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState(
    new Date().getFullYear()
  );
  const [dadosAcompanhamento, setDadosAcompanhamento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);

  const [filtroNomeEscola, setFiltroNomeEscola] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "nomeEscola",
    direction: "ascending",
  });

  // Carrega os anos disponíveis para o select
  useEffect(() => {
    const anoAtual = new Date().getFullYear();
    const rangeAnos = [
      anoAtual + 2,
      anoAtual + 1,
      anoAtual,
      anoAtual - 1,
      anoAtual - 2,
      anoAtual - 3,
    ].sort((a, b) => b - a);
    setAnosDisponiveis(rangeAnos);
  }, []);

  // Lógica centralizada para buscar dados da Cloud Function
  const fetchAcompanhamentoData = useCallback(async (ano) => {
    setLoading(true);
    setError(null);
    setDadosAcompanhamento([]);

    try {
      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anoLetivo: ano }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      setDadosAcompanhamento(data);
    } catch (err) {
      console.error(
        "[AcompanhamentoSEME] Erro ao buscar dados da Cloud Function:",
        err
      );
      setError(
        "Falha ao carregar os dados. Verifique sua conexão ou tente mais tarde."
      );
    } finally {
      setLoading(false);
    }
  }, []); // Sem dependências para não recriar a cada renderização

  // Efeito para buscar os dados quando o ano letivo muda ou quando a escola selecionada é desmarcada
  useEffect(() => {
    if (escolaSelecionada) {
      setLoading(false); // Já estamos na tela de detalhes
      return;
    }
    if (!anoLetivoSelecionado) {
      setLoading(false);
      return;
    }
    fetchAcompanhamentoData(anoLetivoSelecionado);
  }, [anoLetivoSelecionado, escolaSelecionada, fetchAcompanhamentoData]);

  // Lógica para filtrar e ordenar os dados da tabela
  const dadosExibidosNaTabela = useMemo(() => {
    let dadosProcessados = [...dadosAcompanhamento];

    if (filtroNomeEscola) {
      dadosProcessados = dadosProcessados.filter((escola) =>
        escola.nomeEscola.toLowerCase().includes(filtroNomeEscola.toLowerCase())
      );
    }

    if (sortConfig.key) {
      dadosProcessados.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (typeof valA === "number" && isNaN(valA)) valA = -Infinity;
        if (typeof valB === "number" && isNaN(valB)) valB = -Infinity;

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
  const requestSort = useCallback(
    (key) => {
      let direction = "ascending";
      if (sortConfig.key === key && sortConfig.direction === "ascending") {
        direction = "descending";
      }
      setSortConfig({ key, direction });
    },
    [sortConfig]
  ); // Depende de sortConfig

  // Retorna o ícone de ordenação para os cabeçalhos da tabela
  const getSortIndicator = useCallback(
    (key) => {
      if (sortConfig.key === key) {
        return sortConfig.direction === "ascending" ? " ▲" : " ▼";
      }
      return "";
    },
    [sortConfig]
  ); // Depende de sortConfig

  // Dados para o gráfico de barras (otimizado com useMemo)
  const chartData = useMemo(() => {
    const totalPendenteCriacao = dadosExibidosNaTabela.reduce(
      (sum, data) => sum + data.pendenteCriacao,
      0
    );
    const totalEmElaboracaoBruto = dadosExibidosNaTabela.reduce(
      (sum, data) => sum + data.emElaboracao,
      0
    );
    const totalAtrasados = dadosExibidosNaTabela.reduce(
      (sum, data) => sum + data.atrasados,
      0
    );
    const totalConcluidos = dadosExibidosNaTabela.reduce(
      (sum, data) => sum + data.concluidos,
      0
    );

    const emElaboracaoNoPrazo = totalEmElaboracaoBruto - totalAtrasados;

    return {
      labels: [
        "Status Geral dos PEIs" +
          (filtroNomeEscola ? ` (Escolas Filtradas)` : ""),
      ],
      datasets: [
        {
          label: "Pendente de Criação",
          data: [totalPendenteCriacao],
          backgroundColor: "rgba(220, 53, 69, 0.7)",
        },
        {
          label: "Em Elaboração (no prazo)",
          data: [emElaboracaoNoPrazo < 0 ? 0 : emElaboracaoNoPrazo],
          backgroundColor: "rgba(54, 162, 235, 0.7)",
        },
        {
          label: "Atrasados",
          data: [totalAtrasados],
          backgroundColor: "rgba(255, 140, 0, 0.7)",
        },
        {
          label: "Concluídos",
          data: [totalConcluidos],
          backgroundColor: "rgba(40, 167, 69, 0.7)",
        },
      ],
    };
  }, [dadosExibidosNaTabela, filtroNomeEscola]);

  // Opções de configuração do gráfico de barras (mantidas)
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
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  // Funções para navegação entre o resumo e os detalhes da escola
  const handleSelecionarEscola = useCallback(
    (escola) => setEscolaSelecionada(escola),
    []
  );
  const handleVoltarParaResumo = useCallback(
    () => setEscolaSelecionada(null),
    []
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

  // --- Renderização Principal ---
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
            disabled={loading}
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
            disabled={loading}
          />
        </div>
        {loading && <Loader message="Carregando dados..." />}
      </HeaderControls>

      {error ? (
        <MessageContainer type="error">{error}</MessageContainer>
      ) : (
        <>
          <ChartContainer style={{ height: "350px", position: "relative" }}>
            {dadosExibidosNaTabela.length > 0 ? (
              <Bar options={chartOptions} data={chartData} />
            ) : (
              !loading && <p>Nenhum dado para exibir no gráfico.</p>
            )}
          </ChartContainer>

          <TabelaAcompanhamento
            data={dadosExibidosNaTabela}
            onSelectSchool={handleSelecionarEscola}
            sortConfig={sortConfig}
            onRequestSort={requestSort}
            getSortIndicator={getSortIndicator}
            loading={loading}
            filtroNomeEscola={filtroNomeEscola}
          />
        </>
      )}
    </PageContainer>
  );
}

export default AcompanhamentoSEME;
