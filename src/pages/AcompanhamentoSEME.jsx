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
import DetalhesEscolaPEIs from "../components/DetalhesEscolaPEIs";
import "../styles/Acompanhamento.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CLOUD_FUNCTION_URL =
  "https://getpeiacompanhamentobyschool-hc7r4cnuvq-rj.a.run.app";

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
  color: #457b9d;
  background-color: #e0f2f7;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  margin: 20px auto;
  max-width: 800px;
  border: 1px solid #a8dadc;
`;

// --- Componente TabelaAcompanhamento (Reformulado) ---
function TabelaAcompanhamento({
  data,
  onSelectSchool,
  sortConfig,
  onRequestSort,
  getSortIndicator,
  loading,
  filtroNomeEscola,
}) {
  TabelaAcompanhamento.propTypes = {
    data: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        nomeEscola: PropTypes.string.isRequired,
        totalAlunosMonitorados: PropTypes.number.isRequired,
        pendenteCriacao: PropTypes.number.isRequired,
        atrasados: PropTypes.number.isRequired,
        emDia: PropTypes.number.isRequired,
        percentualEmDiaNum: PropTypes.number.isRequired,
      })
    ).isRequired,
    onSelectSchool: PropTypes.func.isRequired,
    sortConfig: PropTypes.object.isRequired,
    onRequestSort: PropTypes.func.isRequired,
    getSortIndicator: PropTypes.func.isRequired,
    loading: PropTypes.bool.isRequired,
    filtroNomeEscola: PropTypes.string.isRequired,
  };

  if (loading) {
    return <Loader message="Carregando dados das escolas..." />;
  }

  if (data.length === 0) {
    return (
      <MessageContainer>
        {filtroNomeEscola
          ? "Nenhuma escola encontrada com o filtro aplicado."
          : "Nenhum dado de PEI disponível para o ano letivo selecionado."}
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
              Total Alunos {getSortIndicator("totalAlunosMonitorados")}
            </th>
            <th
              className="text-center"
              onClick={() => onRequestSort("pendenteCriacao")}
            >
              Pendentes {getSortIndicator("pendenteCriacao")}
            </th>
            <th
              className="text-center"
              onClick={() => onRequestSort("atrasados")}
            >
              Atrasados {getSortIndicator("atrasados")}
            </th>
            <th className="text-center" onClick={() => onRequestSort("emDia")}>
              Em Dia {getSortIndicator("emDia")}
            </th>
            <th
              className="text-center"
              onClick={() => onRequestSort("percentualEmDiaNum")}
            >
              % Em Dia {getSortIndicator("percentualEmDiaNum")}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((escola) => (
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
                className={`text-center ${escola.pendenteCriacao > 0 ? "status-pendente" : ""}`}
              >
                {escola.pendenteCriacao}
              </td>
              <td
                className={`text-center ${escola.atrasados > 0 ? "status-atrasado" : ""}`}
              >
                {escola.atrasados}
              </td>
              <td className="text-center status-feito">{escola.emDia}</td>
              <td className="text-center">{`${escola.percentualEmDiaNum.toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableResponsiveContainer>
  );
}

// --- Componente Principal AcompanhamentoSEME (Reformulado) ---
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

  useEffect(() => {
    const anoAtual = new Date().getFullYear();
    setAnosDisponiveis([anoAtual + 1, anoAtual, anoAtual - 1, anoAtual - 2]);
  }, []);

  const fetchAcompanhamentoData = useCallback(async (ano) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anoLetivo: ano }),
      });
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      const data = await response.json();
      setDadosAcompanhamento(data);
    } catch (err) {
      setError("Falha ao carregar os dados. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!escolaSelecionada && anoLetivoSelecionado) {
      fetchAcompanhamentoData(anoLetivoSelecionado);
    }
  }, [anoLetivoSelecionado, escolaSelecionada, fetchAcompanhamentoData]);

  const dadosExibidos = useMemo(() => {
    let dadosProcessados = dadosAcompanhamento.filter((escola) =>
      escola.nomeEscola.toLowerCase().includes(filtroNomeEscola.toLowerCase())
    );
    if (sortConfig.key) {
      dadosProcessados.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return dadosProcessados;
  }, [dadosAcompanhamento, filtroNomeEscola, sortConfig]);

  const requestSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  }, []);

  const getSortIndicator = useCallback(
    (key) =>
      sortConfig.key === key
        ? sortConfig.direction === "ascending"
          ? " ▲"
          : " ▼"
        : "",
    [sortConfig]
  );

  const chartData = useMemo(() => {
    const totais = dadosExibidos.reduce(
      (acc, data) => {
        acc.pendente += data.pendenteCriacao;
        acc.atrasado += data.atrasados;
        acc.emDia += data.emDia;
        return acc;
      },
      { pendente: 0, atrasado: 0, emDia: 0 }
    );

    return {
      labels: ["Pendente de Criação", "Atrasado", "Em Dia"],
      datasets: [
        {
          label: `Status Geral dos PEIs (${anoLetivoSelecionado})`,
          data: [totais.pendente, totais.atrasado, totais.emDia],
          backgroundColor: [
            "rgba(255, 193, 7, 0.8)", // Amarelo para Pendente
            "rgba(220, 53, 69, 0.8)", // Vermelho para Atrasado
            "rgba(40, 167, 69, 0.8)", // Verde para Em Dia
          ],
          borderColor: [
            "rgba(255, 193, 7, 1)",
            "rgba(220, 53, 69, 1)",
            "rgba(40, 167, 69, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [dadosExibidos, anoLetivoSelecionado]);

  const chartOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
    tooltips: {
      callbacks: {
        label: function (tooltipItem, data) {
          let label = data.datasets[tooltipItem.datasetIndex].label || "";
          if (label) {
            label += ": ";
          }
          label += tooltipItem.xLabel;
          return label;
        },
      },
    },
  };

  const handleSelecionarEscola = (escola) => setEscolaSelecionada(escola);
  const handleVoltarParaResumo = () => setEscolaSelecionada(null);

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

  return (
    <PageContainer>
      <TopNavigation>
        <BotaoVoltar />
      </TopNavigation>
      <HeaderControls>
        <select
          value={anoLetivoSelecionado}
          onChange={(e) => setAnoLetivoSelecionado(Number(e.target.value))}
        >
          {anosDisponiveis.map((ano) => (
            <option key={ano} value={ano}>
              {ano}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filtrar por nome da escola..."
          value={filtroNomeEscola}
          onChange={(e) => setFiltroNomeEscola(e.target.value)}
        />
      </HeaderControls>

      {error && <MessageContainer type="error">{error}</MessageContainer>}

      {!error && !loading && dadosExibidos.length === 0 && (
        <MessageContainer>Nenhum dado para exibir.</MessageContainer>
      )}

      {!error && !loading && dadosExibidos.length > 0 && (
        <ChartContainer>
          <Bar options={chartOptions} data={chartData} />
        </ChartContainer>
      )}

      <TabelaAcompanhamento
        data={dadosExibidos}
        onSelectSchool={handleSelecionarEscola}
        sortConfig={sortConfig}
        onRequestSort={requestSort}
        getSortIndicator={getSortIndicator}
        loading={loading}
        filtroNomeEscola={filtroNomeEscola}
      />
    </PageContainer>
  );
}

export default AcompanhamentoSEME;
