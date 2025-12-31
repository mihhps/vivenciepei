import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  FaTrash,
  FaEye,
  FaPlus,
  FaSearch,
  FaLayerGroup,
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaRegFrownOpen,
  FaArrowLeft,
  FaSpinner,
} from "react-icons/fa";
import "../styles/DuaPlanos.css";

// --- SISTEMA DE FEEDBACK (TOAST) ---
const useMessageSystem = () => {
  const [feedback, setFeedback] = useState({ type: null, msg: null });
  const exibirMensagem = (tipo, msg) => {
    setFeedback({ type: tipo, msg });
    setTimeout(() => setFeedback({ type: null, msg: null }), 4000);
  };
  return { exibirMensagem, feedback };
};

export default function VerPlanosAulaDUA() {
  const [planos, setPlanos] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();
  const { exibirMensagem, feedback } = useMessageSystem();

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );

  // --- NAVEGAÇÃO INTELIGENTE (RESOLVE O LOOP) ---
  const handleVoltar = () => {
    const perfil = (usuarioLogado.perfil || "").toLowerCase().trim();
    const painelMap = {
      professor: "/painel-professor",
      aee: "/painel-aee",
      gestao: "/painel-gestao",
      diretor: "/painel-gestao",
      seme: "/painel-seme",
      desenvolvedor: "/painel-dev",
    };
    navigate(painelMap[perfil] || "/login");
  };

  // --- CARREGAMENTO DOS PLANOS ---
  const fetchPlanos = async () => {
    if (!usuarioLogado.uid) return;
    setCarregando(true);
    try {
      const planosRef = collection(db, "planosAulaDUA");

      // Busca apenas os planos que o professor logado criou
      const q = query(
        planosRef,
        where("criadorId", "==", usuarioLogado.uid),
        orderBy("data", "desc")
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Formata a data garantindo que não retroceda um dia (ISO para PT-BR)
        dataAulaFormatada: doc.data().data
          ? new Date(doc.data().data + "T12:00:00").toLocaleDateString("pt-BR")
          : "Data n/d",
      }));
      setPlanos(data);
    } catch (err) {
      console.error("Erro no Firestore: ", err);
      exibirMensagem("erro", "Erro ao carregar planos. Verifique a conexão.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    fetchPlanos();
  }, [usuarioLogado.uid]);

  // --- EXCLUSÃO DE PLANO ---
  const handleDelete = async (id, titulo) => {
    if (!window.confirm(`Deseja realmente excluir: "${titulo}"?`)) return;

    const backup = [...planos];
    setPlanos(planos.filter((p) => p.id !== id));

    try {
      await deleteDoc(doc(db, "planosAulaDUA", id));
      exibirMensagem("sucesso", "Plano removido com sucesso.");
    } catch (err) {
      setPlanos(backup);
      exibirMensagem("erro", "Falha ao excluir o documento.");
    }
  };

  // --- FILTRO DE PESQUISA EM TEMPO REAL ---
  const planosFiltrados = planos.filter(
    (p) =>
      p.tituloAula?.toLowerCase().includes(busca.toLowerCase()) ||
      p.turmaNome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.conteudoTema?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="lista-dua-container">
      {/* MENSAGENS DE TOAST */}
      {feedback.msg && (
        <div className={`toast-msg ${feedback.type}`}>{feedback.msg}</div>
      )}

      {/* HEADER PREMIUM */}
      <header className="lista-header">
        <div className="header-top">
          <div className="title-group">
            <button
              className="btn-back-ghost"
              onClick={handleVoltar}
              title="Voltar para o Início"
            >
              <FaArrowLeft />
            </button>
            <h1 className="page-title">Meus Planejamentos DUA</h1>
          </div>

          <button
            className="btn-new-plan"
            onClick={() => navigate("/criar-plano-dua")}
          >
            <FaPlus /> Novo Plano
          </button>
        </div>

        <div className="header-filter">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por título, turma ou tema..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="stats-badge">
            <strong>{planos.length}</strong> <span>Total de Planos</span>
          </div>
        </div>
      </header>

      {/* ÁREA DE CARDS */}
      <main className="lista-content">
        {carregando ? (
          <div className="loading-state">
            <FaSpinner className="icon-spin" />
            <p>Sincronizando com a nuvem...</p>
          </div>
        ) : planosFiltrados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FaRegFrownOpen />
            </div>
            <h3>Nada por aqui...</h3>
            <p>
              {busca
                ? `Nenhum resultado para "${busca}"`
                : "Comece criando o seu primeiro plano de aula inclusivo."}
            </p>
            {!busca && (
              <button
                className="btn-secondary"
                onClick={() => navigate("/criar-plano-dua")}
              >
                Criar Agora
              </button>
            )}
          </div>
        ) : (
          <div className="plans-grid">
            {planosFiltrados.map((plano) => (
              <article key={plano.id} className="plan-card">
                <div className="card-top">
                  <span className="badge-turma">
                    <FaChalkboardTeacher /> {plano.turmaNome || "S/ Turma"}
                  </span>
                  <span className="badge-date">
                    <FaCalendarAlt /> {plano.dataAulaFormatada}
                  </span>
                </div>

                <div className="card-body">
                  <h3 className="card-title">{plano.tituloAula}</h3>
                  <div className="card-theme">
                    <FaLayerGroup className="theme-icon" />
                    <p>
                      {plano.conteudoTema
                        ? plano.conteudoTema.length > 80
                          ? plano.conteudoTema.substring(0, 80) + "..."
                          : plano.conteudoTema
                        : "Sem descrição definida"}
                    </p>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="btn-action view"
                    onClick={() =>
                      navigate(`/visualizar-plano-dua/${plano.id}`)
                    }
                  >
                    <FaEye /> Abrir
                  </button>
                  <button
                    className="btn-action delete"
                    onClick={() => handleDelete(plano.id, plano.tituloAula)}
                  >
                    <FaTrash />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
