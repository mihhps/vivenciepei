import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import BotaoVoltar from "../components/BotaoVoltar";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const estilos = {
  container: {
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    minHeight: "100vh",
    width: "100vw",
    fontFamily: "'Segoe UI', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    padding: "20px"
  },
  voltarContainer: {
    position: "absolute",
    top: "20px",
    left: "20px"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "40px",
    width: "100%",
    maxWidth: "900px",
    boxShadow: "0 0 20px rgba(0,0,0,0.2)",
    textAlign: "center"
  },
  logo: {
    width: "140px",
    marginBottom: "10px"
  },
  titulo: {
    color: "#1d3557",
    marginBottom: "30px"
  },
  msg: {
    color: "#666",
    marginTop: "20px"
  }
};

const getLocalStorageSafe = (key, defaultValue = {}) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || defaultValue;
  } catch {
    return defaultValue;
  }
};
export default function Acompanhamento() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const usuario = getLocalStorageSafe("usuarioLogado");
  const escolaAtiva = localStorage.getItem("escolaAtiva") || "";
    useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        setError(null);

        const escolasSnap = await getDocs(collection(db, "escolas"));
        const todasEscolas = escolasSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const escolasFiltradas = usuario?.perfil === "seme"
          ? todasEscolas
          : todasEscolas.filter(e => e.id === escolaAtiva);

        if (escolasFiltradas.length === 0) {
          setDados([]);
          setLoading(false);
          return;
        }

        const alunosPromises = escolasFiltradas.map(async (escola) => {
          const alunosQuery = query(
            collection(db, "alunos"),
            where("escolaId", "==", escola.id)
          );
          const alunosSnap = await getDocs(alunosQuery);
          return alunosSnap.docs.map(doc => doc.id);
        });

        const alunosPorEscola = await Promise.all(alunosPromises);

        const resultados = await Promise.all(
          escolasFiltradas.map(async (escola, index) => {
            const alunos = alunosPorEscola[index];
            if (!alunos || alunos.length === 0) {
              return {
                escola: escola.nome,
                peis: 0,
                avaliacoes: 0
              };
            }

            const [peisSnap, avalSnap] = await Promise.all([
              getDocs(
                query(
                  collection(db, "peis"),
                  where("alunoId", "in", alunos.slice(0, 30))
                )
              ),
              getDocs(
                query(
                  collection(db, "avaliacoesIniciais"),
                  where("alunoId", "in", alunos.slice(0, 30))
                )
              )
            ]);

            return {
              escola: escola.nome,
              peis: peisSnap.size,
              avaliacoes: avalSnap.size
            };
          })
        );

        setDados(resultados);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [usuario?.perfil, escolaAtiva]);
    const chartData = {
    labels: dados.map(d => d.escola),
    datasets: [
      {
        label: "PEIs Criados",
        data: dados.map(d => d.peis),
        backgroundColor: "#1d3557"
      },
      {
        label: "Avaliações Iniciais",
        data: dados.map(d => d.avaliacoes),
        backgroundColor: "#a8dadc"
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom"
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
    return (
    <div style={estilos.container}>
      <div style={estilos.voltarContainer}>
        <BotaoVoltar />
      </div>

      <div style={estilos.card}>
        <img 
          src="/logo-vivencie.png" 
          alt="Logo Vivencie PEI" 
          style={estilos.logo} 
        />
        <h2 style={estilos.titulo}>Acompanhamento por Escola</h2>

        {error ? (
          <p style={{ ...estilos.msg, color: "#e63946" }}>{error}</p>
        ) : loading ? (
          <p style={estilos.msg}>Carregando dados...</p>
        ) : dados.length === 0 ? (
          <p style={estilos.msg}>Nenhum dado disponível para exibição.</p>
        ) : (
          <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        )}
      </div>
    </div>
  );
}