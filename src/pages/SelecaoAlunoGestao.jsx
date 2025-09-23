import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import Loader from "../components/Loader";
import "../styles/SelecaoAlunoGestao.css"; // Novo arquivo de estilo

const painelDestinoMapeado = {
  gestao: "/painel-gestao",
  seme: "/painel-seme",
  desenvolvedor: "/painel-dev",
};

function SelecaoAlunoGestao() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );
  const perfilNormalizado = (usuarioLogado.perfil || "").toLowerCase().trim();
  const painelDestino =
    painelDestinoMapeado[perfilNormalizado] || "/painel-gestao";

  useEffect(() => {
    const fetchAlunos = async () => {
      try {
        const q = query(collection(db, "alunos"), orderBy("nome"));
        const querySnapshot = await getDocs(q);
        const listaAlunos = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAlunos(listaAlunos);
      } catch (err) {
        setError("Não foi possível carregar a lista de alunos.");
      } finally {
        setLoading(false);
      }
    };
    fetchAlunos();
  }, []);

  const handleAcessarPlano = () => {
    if (alunoSelecionadoId) {
      navigate(`/acompanhamento-gestao/${alunoSelecionadoId}`);
    }
  };

  if (loading)
    return (
      <div className="selecao-aluno-page">
        <Loader />
      </div>
    );

  return (
    <div className="selecao-aluno-page">
      <div className="selecao-aluno-card">
        <header className="selecao-aluno-header">
          <Link to={painelDestino} className="botao-voltar">
            Voltar
          </Link>
          <h1 className="selecao-aluno-titulo">Acompanhamento Gestão</h1>
        </header>
        <div className="selecao-aluno-body">
          <p className="instrucao-texto">
            Selecione um aluno para visualizar o plano de acompanhamento e
            fornecer feedbacks.
          </p>
          {error && <p className="mensagem-erro">{error}</p>}
          <div className="form-group-selecao">
            <label htmlFor="aluno-select">Aluno</label>
            <select
              id="aluno-select"
              value={alunoSelecionadoId}
              onChange={(e) => setAlunoSelecionadoId(e.target.value)}
            >
              <option value="">Selecione um aluno</option>
              {alunos.map((aluno) => (
                <option key={aluno.id} value={aluno.id}>
                  {aluno.nome}
                </option>
              ))}
            </select>
          </div>
          <button
            className="botao-acessar"
            onClick={handleAcessarPlano}
            disabled={!alunoSelecionadoId}
          >
            Acessar Acompanhamento
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelecaoAlunoGestao;
