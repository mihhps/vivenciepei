import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getDocs,
  collection,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import { toast, ToastContainer } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaBuilding,
  FaSearch,
  FaUserTie,
  FaCheckCircle,
  FaExclamationCircle,
  FaSave,
} from "react-icons/fa";

import "react-toastify/dist/ReactToastify.css";
import "./VincularEscolas.css";

export default function VincularEscolas() {
  const navigate = useNavigate();
  const [profissionais, setProfissionais] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [escolaIdAtiva, setEscolaIdAtiva] = useState(null);
  const [profEditando, setProfEditando] = useState(null);
  const [edicoes, setEdicoes] = useState({});
  const [busca, setBusca] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // ✅ CAPTURA O ANO DO SISTEMA E O USUÁRIO LOGADO
  const anoAtivo = useMemo(
    () => Number(localStorage.getItem("anoExercicio")) || 2025,
    []
  );
  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado") || "{}"),
    []
  );

  // ✅ NAVEGAÇÃO ANTI-LOOPING (MAPA DE PERFIS)
  const handleVoltar = useCallback(() => {
    const perfil = (usuarioLogado.perfil || "").toLowerCase().trim();
    const painelMap = {
      desenvolvedor: "/painel-dev",
      seme: "/painel-seme",
      gestao: "/painel-gestao",
      diretor: "/painel-gestao",
      professor: "/painel-professor",
      aee: "/painel-aee",
    };
    navigate(painelMap[perfil] || "/login");
  }, [navigate, usuarioLogado]);

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      // ✅ FILTRO REAL NO BANCO: Traz apenas quem já está no ano ativo
      // Para migrar alguém de 2025 para 2026, você deve usar a Central de Dados.
      const qUsuarios = query(
        collection(db, "usuarios"),
        where("anoAtivo", "==", anoAtivo)
      );

      const qEscolas = query(collection(db, "escolas"));

      const [uSnap, eSnap] = await Promise.all([
        getDocs(qUsuarios),
        getDocs(qEscolas),
      ]);

      const escolasListadas = eSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

      const usuariosFiltrados = uSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) =>
          [
            "professor",
            "aee",
            "gestao",
            "diretor",
            "diretor adjunto",
            "orientador pedagógico",
          ].includes(u.perfil?.toLowerCase())
        );

      setProfissionais(usuariosFiltrados);
      setEscolas(escolasListadas);
      if (escolasListadas.length > 0) setEscolaIdAtiva(escolasListadas[0].id);
    } catch (e) {
      toast.error("Erro ao carregar dados do exercício " + anoAtivo);
    } finally {
      setIsLoading(false);
    }
  }, [anoAtivo]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleToggle = (escId, originalmenteVinculado) => {
    setEdicoes((prev) => ({
      ...prev,
      [escId]:
        prev[escId] !== undefined ? !prev[escId] : !originalmenteVinculado,
    }));
  };

  const salvar = async (profId) => {
    const prof = profissionais.find((p) => p.id === profId);
    const novasEscolas = { ...(prof.escolas || {}) };

    Object.keys(edicoes).forEach((id) => {
      if (edicoes[id]) novasEscolas[id] = true;
      else delete novasEscolas[id];
    });

    try {
      await updateDoc(doc(db, "usuarios", profId), {
        escolas: novasEscolas,
        anoAtivo: anoAtivo, // Reafirma o vínculo no ano correto
      });

      toast.success(`Vínculos de unidades atualizados para ${anoAtivo}`);
      setProfEditando(null);
      setEdicoes({});
      carregarDados();
    } catch (e) {
      toast.error("Erro ao salvar vínculos.");
    }
  };

  const listaFiltrada = useMemo(() => {
    let lista =
      escolaIdAtiva === "sem"
        ? profissionais.filter(
            (p) => !p.escolas || Object.keys(p.escolas).length === 0
          )
        : profissionais.filter((p) => p.escolas?.[escolaIdAtiva]);

    if (busca)
      lista = lista.filter((p) =>
        p.nome?.toLowerCase().includes(busca.toLowerCase())
      );
    return lista;
  }, [profissionais, escolaIdAtiva, busca]);

  if (isLoading) return <Loader />;

  return (
    <div className="vinc-page-wrapper">
      <ToastContainer theme="dark" position="bottom-right" />

      {/* Background Decorativo */}
      <div className="vinc-bg-glow" />

      <header className="vinc-header">
        <div className="vinc-header-left">
          <motion.button
            whileHover={{ x: -5 }}
            onClick={handleVoltar}
            className="vinc-btn-back"
          >
            <FaArrowLeft />
          </motion.button>
          <div className="vinc-title-group">
            <h1>
              Vínculo de <span className="blue-highlight">Unidades</span>
            </h1>
            <p>Gerenciamento de Lotação Profissional — {anoAtivo}</p>
          </div>
        </div>
      </header>

      <main className="vinc-main-container">
        {/* SIDEBAR: LISTA DE ESCOLAS */}
        <aside className="vinc-sidebar">
          <div className="vinc-sidebar-header">
            <h3>Unidades Escolares</h3>
            <span className="badge-ano">Exercício {anoAtivo}</span>
          </div>
          <div className="vinc-sidebar-scroll custom-scrollbar">
            {escolas.map((e) => (
              <button
                key={e.id}
                className={`vinc-nav-item ${
                  escolaIdAtiva === e.id ? "active" : ""
                }`}
                onClick={() => {
                  setEscolaIdAtiva(e.id);
                  setProfEditando(null);
                }}
              >
                <FaBuilding size={12} style={{ opacity: 0.5 }} />
                {e.nome}
              </button>
            ))}
            <button
              className={`vinc-nav-item danger ${
                escolaIdAtiva === "sem" ? "active" : ""
              }`}
              onClick={() => {
                setEscolaIdAtiva("sem");
                setProfEditando(null);
              }}
            >
              <FaExclamationCircle size={12} /> Sem Vínculo Ativo
            </button>
          </div>
        </aside>

        {/* CONTEÚDO: LISTA DE PROFISSIONAIS */}
        <section className="vinc-content-area">
          <div className="vinc-content-top">
            <div className="vinc-search-container">
              <FaSearch className="vinc-search-icon" />
              <input
                placeholder="Pesquisar por nome do profissional..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="vinc-count-badge">
              {listaFiltrada.length} PROFISSIONAIS
            </div>
          </div>

          <div className="vinc-prof-grid custom-scrollbar">
            <AnimatePresence>
              {listaFiltrada.map((prof) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={prof.id}
                  className={`vinc-prof-wrapper ${
                    profEditando === prof.id ? "expanded" : ""
                  }`}
                >
                  <div className="vinc-prof-card">
                    <div className="prof-main-info">
                      <div className="prof-avatar-circle">
                        {prof.fotoUrl ? (
                          <img src={prof.fotoUrl} alt="" />
                        ) : (
                          <FaUserTie />
                        )}
                      </div>
                      <div className="prof-text">
                        <strong>{prof.nome}</strong>
                        <span className="prof-tag">
                          {prof.perfil} •{" "}
                          {prof.anoAtivo === anoAtivo
                            ? "Sincronizado"
                            : "Pendente"}
                        </span>
                      </div>
                    </div>
                    <button
                      className={`vinc-btn-manage ${
                        profEditando === prof.id ? "active" : ""
                      }`}
                      onClick={() => {
                        setEdicoes({});
                        setProfEditando(
                          prof.id === profEditando ? null : prof.id
                        );
                      }}
                    >
                      {profEditando === prof.id
                        ? "Recolher"
                        : "Ajustar Vínculo"}
                    </button>
                  </div>

                  {profEditando === prof.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="edit-area-expanded"
                    >
                      <p className="edit-instruction">
                        Selecione as unidades para o exercício {anoAtivo}:
                      </p>
                      <div className="chip-container">
                        {escolas.map((esc) => {
                          const original = prof.escolas?.[esc.id] || false;
                          const ativo =
                            edicoes[esc.id] !== undefined
                              ? edicoes[esc.id]
                              : original;
                          return (
                            <button
                              key={esc.id}
                              className={`chip-item ${ativo ? "active" : ""}`}
                              onClick={() => handleToggle(esc.id, original)}
                            >
                              {ativo && <FaCheckCircle className="chip-icon" />}
                              {esc.nome}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        className="btn-confirm-vinc"
                        onClick={() => salvar(prof.id)}
                      >
                        <FaSave /> Confirmar Lotação em {anoAtivo}
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {listaFiltrada.length === 0 && (
              <div className="vinc-empty-state">
                <FaUserTie
                  size={40}
                  style={{ opacity: 0.1, marginBottom: "20px" }}
                />
                <p>
                  Nenhum profissional encontrado nesta unidade para {anoAtivo}.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
