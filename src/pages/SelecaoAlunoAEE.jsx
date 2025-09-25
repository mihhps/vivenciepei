import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db, auth } from "../firebase"; // Importe o 'auth'
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  where,
  limit,
} from "firebase/firestore"; // Imports adicionais
import Loader from "../components/Loader";
import "../styles/SelecaoAlunoAEE.css";

// Mapeamento dos painéis de destino
const painelDestinoMapeado = {
  desenvolvedor: "/painel-dev",
  desenvolvedora: "/painel-dev",
  gestao: "/painel-gestao",
  aee: "/painel-aee",
  seme: "/painel-seme", // Ou a rota correta para o painel da SEME
  professor: "/painel-professor",
  diretor: "/painel-gestao",
  diretor_adjunto: "/painel-gestao",
  orientador_pedagogico: "/painel-gestao",
};

function SelecaoAlunoAEE() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [statusPlano, setStatusPlano] = useState({
    verificado: false,
    temPlano: false,
    carregando: false,
  });

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );
  const perfilNormalizado = (usuarioLogado.perfil || "").toLowerCase().trim();
  const painelDestino = painelDestinoMapeado[perfilNormalizado] || "/";

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

  const handleAlunoChange = async (e) => {
    const id = e.target.value;
    setAlunoSelecionadoId(id);
    setError(""); // Limpa erros anteriores ao trocar de aluno
    if (!id) {
      setStatusPlano({ verificado: false, temPlano: false, carregando: false });
      return;
    }
    setStatusPlano({ verificado: false, temPlano: false, carregando: true });
    try {
      const planoRef = doc(db, "alunos", id, "planoAEE", "planoAtivo");
      const planoSnap = await getDoc(planoRef);
      setStatusPlano({
        verificado: true,
        temPlano: planoSnap.exists(),
        carregando: false,
      });
    } catch (error) {
      console.error("Erro ao verificar plano:", error);
      setError("Erro ao verificar o plano do aluno.");
      setStatusPlano({ verificado: true, temPlano: false, carregando: false });
    }
  };

  // --- LÓGICA DE CRIAÇÃO MOVIDA PARA CÁ ---
  const handleCriarPlano = async () => {
    if (!alunoSelecionadoId) return;
    setStatusPlano((s) => ({ ...s, carregando: true }));
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado.");

      const novoPlano = {
        habilidades: [],
        criadoEm: Timestamp.now(),
        dataPlano: new Date().toISOString().split("T")[0],
        alunoId: alunoSelecionadoId,
        horariosAtendimento: [],
        criadorId: user.uid,
      };

      const planoRef = doc(
        db,
        "alunos",
        alunoSelecionadoId,
        "planoAEE",
        "planoAtivo"
      );
      await setDoc(planoRef, novoPlano);

      // Sucesso! Navega direto para a página de acompanhamento
      navigate(`/acompanhamento-aee/${alunoSelecionadoId}`);
    } catch (e) {
      console.error("Erro ao criar plano:", e);
      setError("Falha ao criar o plano em branco.");
      setStatusPlano((s) => ({ ...s, carregando: false }));
    }
  };

  const handleImportarPlano = async () => {
    if (!alunoSelecionadoId) return;
    setStatusPlano((s) => ({ ...s, carregando: true }));
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado.");

      // --- LÓGICA DE BUSCA CORRIGIDA ---
      // 1. Tenta buscar usando o campo 'alunoId'
      let q = query(
        collection(db, "avaliacoesIniciais"),
        where("alunoId", "==", alunoSelecionadoId),
        orderBy("dataCriacao", "desc"),
        limit(1)
      );
      let avaliacaoSnap = await getDocs(q);

      // 2. Se não encontrar, tenta buscar usando o campo aninhado 'aluno.id'
      if (avaliacaoSnap.empty) {
        q = query(
          collection(db, "avaliacoesIniciais"),
          where("aluno.id", "==", alunoSelecionadoId),
          orderBy("dataCriacao", "desc"),
          limit(1)
        );
        avaliacaoSnap = await getDocs(q);
      }

      // 3. Agora, se ainda estiver vazio, então realmente não há avaliação
      if (avaliacaoSnap.empty) {
        throw new Error(
          "Nenhuma avaliação inicial encontrada para este aluno."
        );
      }
      // --- FIM DA CORREÇÃO ---

      const avaliacaoData = avaliacaoSnap.docs[0].data();
      const respostas = avaliacaoData.respostas || {};
      const habilidadesParaPlanejar = [];
      Object.entries(respostas).forEach(([area, habilidades]) => {
        Object.entries(habilidades).forEach(([habilidadeId, nivel]) => {
          if (nivel !== "I" && nivel !== "NA") {
            habilidadesParaPlanejar.push({
              id: `${area}-${habilidadeId.replace(/\s+/g, "_")}`,
              area,
              habilidade: habilidadeId,
              status: "A iniciar",
            });
          }
        });
      });

      if (habilidadesParaPlanejar.length === 0) {
        throw new Error(
          "A avaliação não contém habilidades a serem trabalhadas."
        );
      }

      const novoPlano = {
        habilidades: habilidadesParaPlanejar,
        criadoEm: Timestamp.now(),
        dataPlano: new Date().toISOString().split("T")[0],
        baseadoEm: avaliacaoSnap.docs[0].id,
        alunoId: alunoSelecionadoId,
        horariosAtendimento: [],
        criadorId: user.uid,
      };

      const planoRef = doc(
        db,
        "alunos",
        alunoSelecionadoId,
        "planoAEE",
        "planoAtivo"
      );
      await setDoc(planoRef, novoPlano);

      navigate(`/acompanhamento-aee/${alunoSelecionadoId}`);
    } catch (e) {
      console.error("Erro ao importar:", e);
      setError(e.message);
      setStatusPlano((s) => ({ ...s, carregando: false }));
    }
  };

  if (loading) {
    return (
      <div className="selecao-aluno-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="selecao-aluno-page">
      <div className="selecao-aluno-card">
        <header className="selecao-aluno-header">
          <Link to={painelDestino} className="botao-voltar">
            Voltar
          </Link>
          <h1 className="selecao-aluno-titulo">Acompanhamento AEE</h1>
        </header>

        <div className="selecao-aluno-body">
          <p className="instrucao-texto">
            Selecione um aluno para iniciar ou continuar o plano de
            acompanhamento.
          </p>

          <div className="form-group-selecao">
            <label htmlFor="aluno-select">Aluno</label>
            <select
              id="aluno-select"
              value={alunoSelecionadoId}
              onChange={handleAlunoChange}
            >
              <option value="">Selecione um aluno</option>
              {alunos.map((aluno) => (
                <option key={aluno.id} value={aluno.id}>
                  {aluno.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="acoes-container">
            {statusPlano.carregando && <p>Carregando...</p>}
            {error && <p className="mensagem-erro">{error}</p>}

            {statusPlano.verificado && statusPlano.temPlano && (
              <button
                className="botao-acessar"
                onClick={() =>
                  navigate(`/acompanhamento-aee/${alunoSelecionadoId}`)
                }
              >
                Acessar Plano AEE
              </button>
            )}

            {statusPlano.verificado &&
              !statusPlano.temPlano &&
              !statusPlano.carregando && (
                <div className="opcoes-novo-plano">
                  <p>Este aluno ainda não possui um plano de acompanhamento.</p>
                  <button className="botao-acessar" onClick={handleCriarPlano}>
                    Criar Plano em Branco
                  </button>
                  <button
                    className="botao-importar"
                    onClick={handleImportarPlano}
                  >
                    Importar da Avaliação
                  </button>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SelecaoAlunoAEE;
