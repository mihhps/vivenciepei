import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import Loader from "../components/Loader";
// ##### IMPORTANTE: Esta linha garante que os novos estilos sejam aplicados #####
import "../styles/SelecaoAlunoAEE.css";

function SelecaoAlunoAEE() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
        console.error("Erro ao buscar alunos:", err);
        setError("Não foi possível carregar a lista de alunos.");
      } finally {
        setLoading(false);
      }
    };
    fetchAlunos();
  }, []);

  const handleAcessarPlano = () => {
    if (alunoSelecionadoId) {
      navigate(`/acompanhamento-aee/${alunoSelecionadoId}`);
    } else {
      alert("Por favor, selecione um aluno.");
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="selecao-aluno-page">
      <div className="selecao-aluno-card">
        <div className="selecao-header">
          <h2>Acompanhamento AEE</h2>
          <p>
            Selecione um aluno para iniciar ou continuar o plano de
            acompanhamento.
          </p>
        </div>

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
          Acessar Plano AEE
        </button>

        <button className="botao-voltar" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </div>
    </div>
  );
}

export default SelecaoAlunoAEE;
