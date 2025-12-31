import React, { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaSearch,
  FaSave,
  FaUserCircle,
  FaBook,
  FaTimes,
} from "react-icons/fa";
import Loader from "../components/Loader";
import { useUserSchool } from "../hooks/useUserSchool";
import { useNavigate } from "react-router-dom";

import "react-toastify/dist/ReactToastify.css";
import "./VincularProfessoresTurmas.css";

const LISTA_CARGOS = [
  "Professor Regente",
  "Professor de Suporte",
  "Aee",
  "Língua Portuguesa",
  "Matemática",
  "História",
  "Arte",
  "Geografia",
  "Educação Física",
  "Ciências",
  "Inglês",
  "Ensino Religioso",
  "Contação de Histórias",
  "Comunicação e Linguagem",
];

export default function VincularProfessoresTurmas() {
  const navigate = useNavigate();
  const [profissionais, setProfissionais] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [vincTurmas, setVincTurmas] = useState({});
  const [cargosSelecionados, setCargosSelecionados] = useState([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostrarModalCargos, setMostrarModalCargos] = useState(false);

  const { isLoadingUserSchool, userSchoolId } = useUserSchool();
  const anoAtivo = Number(localStorage.getItem("anoExercicio")) || 2025;
  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado") || "{}"),
    []
  );

  // ✅ NAVEGAÇÃO ANTI-LOOPING
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

  // ✅ FILTRO CRÍTICO: Só traz quem tem anoAtivo === anoAtivo do sistema
  const carregarProfissionais = useCallback(async () => {
    setCarregandoDados(true);
    try {
      const q = query(
        collection(db, "usuarios"),
        where("anoAtivo", "==", anoAtivo) // Se for 2026, só traz quem foi migrado para 2026
      );

      const snap = await getDocs(q);
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Filtra apenas perfis docentes/apoio
      const filtrados = lista.filter(
        (p) =>
          p.perfil?.toLowerCase().includes("prof") ||
          p.perfil?.toLowerCase().includes("aee") ||
          p.cargo?.toLowerCase().includes("prof")
      );
      setProfissionais(
        filtrados.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
      );
    } catch (err) {
      toast.error("Erro ao carregar profissionais de " + anoAtivo);
    } finally {
      setCarregandoDados(false);
    }
  }, [anoAtivo]);

  useEffect(() => {
    if (!isLoadingUserSchool) carregarProfissionais();
  }, [isLoadingUserSchool, carregarProfissionais]);

  const selecionarProf = async (prof) => {
    setSelecionado(prof);
    const infoCombinada = `${prof.cargo || ""} ${
      prof.perfil || ""
    }`.toLowerCase();
    const encontrados = LISTA_CARGOS.filter((c) =>
      infoCombinada.includes(c.toLowerCase())
    );
    setCargosSelecionados(encontrados);

    // Carrega turmas da escola ativa no ano ativo
    const escolaId = Object.keys(prof.escolas || {})[0] || userSchoolId;
    if (escolaId) {
      const qT = query(
        collection(db, "escolas", escolaId, "turmas"),
        where("ano", "==", anoAtivo)
      );
      const snapT = await getDocs(qT);
      setTurmas(snapT.docs.map((d) => d.data().nome).sort());
    }
    setVincTurmas(prof[`turmas_${anoAtivo}`] || {});
  };

  const salvar = async () => {
    try {
      setCarregandoDados(true);
      const perfilFinal = cargosSelecionados.join(", ");
      await updateDoc(doc(db, "usuarios", selecionado.id), {
        [`turmas_${anoAtivo}`]: vincTurmas,
        perfil: perfilFinal || selecionado.perfil,
        cargo: perfilFinal || selecionado.cargo,
        anoAtivo: anoAtivo, // Garante a permanência no ano correto
      });
      toast.success("Vínculos atualizados para " + anoAtivo);
      carregarProfissionais();
      setSelecionado(null);
    } catch (e) {
      toast.error("Erro ao salvar.");
    } finally {
      setCarregandoDados(false);
    }
  };

  if (isLoadingUserSchool || carregandoDados) return <Loader />;

  return (
    <div className="vinc-page-wrapper">
      <ToastContainer theme="dark" position="bottom-right" />

      {/* MODAL DE DISCIPLINAS */}
      <AnimatePresence>
        {mostrarModalCargos && (
          <div className="vinc-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="vinc-modal-card"
            >
              <div className="vinc-modal-header">
                <h3>Selecionar Disciplinas</h3>
                <button onClick={() => setMostrarModalCargos(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="vinc-modal-grid">
                {LISTA_CARGOS.map((cargo) => (
                  <button
                    key={cargo}
                    onClick={() =>
                      setCargosSelecionados((prev) =>
                        prev.includes(cargo)
                          ? prev.filter((c) => c !== cargo)
                          : [...prev, cargo]
                      )
                    }
                    className={`vinc-modal-chip ${
                      cargosSelecionados.includes(cargo) ? "active" : ""
                    }`}
                  >
                    {cargo}{" "}
                    {cargosSelecionados.includes(cargo) && <FaCheckCircle />}
                  </button>
                ))}
              </div>
              <button
                className="vinc-modal-save"
                onClick={() => setMostrarModalCargos(false)}
              >
                Concluir Seleção
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="vinc-header">
        <div className="vinc-header-left">
          <button onClick={handleVoltar} className="vinc-btn-back">
            <FaArrowLeft />
          </button>
          <div className="vinc-title-group">
            <h1>
              Vínculo <span className="blue-highlight">Docente</span>
            </h1>
            <p>Exercício — {anoAtivo}</p>
          </div>
        </div>
      </header>

      <main className="vinc-main-container">
        <aside className="vinc-sidebar">
          <div className="vinc-search-area">
            <FaSearch className="vinc-search-icon" />
            <input
              type="text"
              placeholder="Buscar profissional..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="vinc-prof-list">
            {profissionais
              .filter((p) =>
                p.nome?.toLowerCase().includes(busca.toLowerCase())
              )
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => selecionarProf(p)}
                  className={`vinc-prof-card ${
                    selecionado?.id === p.id ? "active" : ""
                  }`}
                >
                  <p className="vinc-prof-name">{p.nome}</p>
                  <p className="vinc-prof-role">{p.perfil || "Sem Cargo"}</p>
                </button>
              ))}
          </div>
        </aside>

        <section className="vinc-editor-area">
          <AnimatePresence mode="wait">
            {selecionado ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                key={selecionado.id}
              >
                <div className="vinc-editor-header">
                  <div className="vinc-user-icon">
                    <FaUserCircle />
                  </div>
                  <div>
                    <span>Perfil Profissional</span>
                    <h2>{selecionado.nome}</h2>
                  </div>
                </div>

                <div className="vinc-section">
                  <label>Disciplinas e Atuação</label>
                  <div
                    className="vinc-discipline-trigger"
                    onClick={() => setMostrarModalCargos(true)}
                  >
                    <div className="vinc-trigger-info">
                      <FaBook className="text-blue-500" />
                      <div>
                        <strong>
                          {cargosSelecionados.length > 0
                            ? cargosSelecionados.join(", ")
                            : "Nenhuma disciplina selecionada"}
                        </strong>
                        <p>Clique para editar as áreas de atuação</p>
                      </div>
                    </div>
                    <span className="vinc-trigger-badge">
                      {cargosSelecionados.length}
                    </span>
                  </div>
                </div>

                <div className="vinc-section">
                  <label>Turmas de {anoAtivo}</label>
                  <div className="vinc-turma-grid">
                    {turmas.length > 0 ? (
                      turmas.map((t) => (
                        <button
                          key={t}
                          onClick={() =>
                            setVincTurmas((prev) => {
                              const n = { ...prev };
                              n[t] ? delete n[t] : (n[t] = true);
                              return n;
                            })
                          }
                          className={`vinc-turma-btn ${
                            vincTurmas[t] ? "active" : ""
                          }`}
                        >
                          {t} {vincTurmas[t] && <FaCheckCircle />}
                        </button>
                      ))
                    ) : (
                      <p className="vinc-empty-txt">
                        Nenhuma turma encontrada para {anoAtivo}.
                      </p>
                    )}
                  </div>
                </div>

                <button onClick={salvar} className="vinc-save-btn">
                  <FaSave /> Confirmar Vínculos
                </button>
              </motion.div>
            ) : (
              <div className="vinc-placeholder">
                <FaChalkboardTeacher size={100} />
                <p>Selecione um profissional habilitado para {anoAtivo}</p>
              </div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
