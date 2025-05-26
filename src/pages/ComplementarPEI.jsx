import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

export default function ComplementarPEI() {
  const [peis, setPeis] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
  const navigate = useNavigate();

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [peisSnap, alunosSnap] = await Promise.all([
          getDocs(collection(db, "peis")),
          getDocs(collection(db, "alunos"))
        ]);

        const todosPeis = peisSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const todosAlunos = alunosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const turmasPermitidas = usuario?.turmas ? Object.keys(usuario.turmas) : [];

        const peisFiltrados = todosPeis.filter(pei => {
          const aluno = todosAlunos.find(a => a.nome === pei.aluno);
          if (!aluno) return false;
          return turmasPermitidas.includes(aluno.turma);
        });

        setPeis(peisFiltrados);
        setAlunos(todosAlunos);
      } catch (err) {
        console.error("Erro ao carregar PEIs:", err);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, []);

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h1 style={estilos.titulo}>Complementar PEIs</h1>

        {carregando ? (
          <p style={estilos.loading}>Carregando PEIs...</p>
        ) : peis.length === 0 ? (
          <p style={estilos.vazio}>Nenhum PEI disponível para complementar.</p>
        ) : (
          <ul style={estilos.lista}>
            {peis.map((pei, index) => (
              <li key={index} style={estilos.item}>
                <div>
                  <strong>{pei.aluno}</strong> — {pei.turma}
                </div>
                <button
                  onClick={() => navigate(`/complementar/${pei.id}`)}
                  style={estilos.botao}
                >
                  Complementar PEI
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const estilos = {
  container: {
    backgroundColor: "#1d3557",
    minHeight: "100vh",
    padding: "30px",
    fontFamily: "'Segoe UI', sans-serif"
  },
  card: {
    background: "#fff",
    maxWidth: "800px",
    margin: "0 auto",
    padding: "30px",
    borderRadius: "16px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
  },
  titulo: {
    color: "#1d3557",
    textAlign: "center",
    marginBottom: "20px"
  },
  lista: {
    listStyle: "none",
    padding: 0
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #ccc",
    padding: "10px 0"
  },
  botao: {
    backgroundColor: "#e76f51",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer"
  },
  loading: {
    textAlign: "center",
    color: "#1d3557"
  },
  vazio: {
    textAlign: "center",
    color: "#999"
  }
};