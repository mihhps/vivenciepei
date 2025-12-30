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
import "react-toastify/dist/ReactToastify.css";
import Loader from "../components/Loader";
import { useUserSchool } from "../hooks/useUserSchool";
import { useNavigate } from "react-router-dom";

import "./VincularProfessoresTurmas.css";

// Lista exata de cargos e disciplinas
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

const normalizarTurma = (turma) =>
  typeof turma === "string" ? turma.trim().toUpperCase() : "";

export default function VincularProfessoresTurmas() {
  const navigate = useNavigate();
  const [profissionais, setProfissionais] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [vincTurmas, setVincTurmas] = useState({});
  const [cargosSelecionados, setCargosSelecionados] = useState([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [busca, setBusca] = useState("");

  const { userSchoolData, isLoadingUserSchool, userSchoolId } = useUserSchool();
  const anoAtivo = Number(localStorage.getItem("anoExercicio")) || 2025;

  // ✅ FUNÇÃO PARA VOLTAR SEM LOOPING
  const handleVoltar = useCallback(() => {
    const perfil = userSchoolData?.perfil?.toLowerCase() || "";
    if (perfil.includes("professor")) {
      navigate("/painel-professor");
    } else {
      navigate("/painel-gestao");
    }
  }, [navigate, userSchoolData]);

  const carregarProfissionais = useCallback(async () => {
    setCarregandoDados(true);
    try {
      const q = query(
        collection(db, "usuarios"),
        where("anoAtivo", "==", anoAtivo)
      );
      const snap = await getDocs(q);
      setProfissionais(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error("Erro ao carregar profissionais.");
    } finally {
      setCarregandoDados(false);
    }
  }, [anoAtivo]);

  useEffect(() => {
    if (!isLoadingUserSchool && userSchoolData) carregarProfissionais();
  }, [isLoadingUserSchool, userSchoolData, carregarProfissionais]);

  const selecionarProf = async (prof) => {
    setSelecionado(prof);

    const cargoBanco = (prof.cargo || "").toLowerCase();
    const perfilBanco = (prof.perfil || "").toLowerCase();
    const infoCombinada = `${cargoBanco} ${perfilBanco}`;

    const encontrados = LISTA_CARGOS.filter((itemLista) => {
      const itemMin = itemLista.toLowerCase();
      return infoCombinada.includes(itemMin) || itemMin.includes(infoCombinada);
    });

    if (encontrados.length === 0 && perfilBanco === "professor") {
      encontrados.push("Professor Regente");
    }

    setCargosSelecionados(encontrados);

    const escolaId = Object.keys(prof.escolas || {})[0] || userSchoolId;
    if (escolaId) {
      const qT = query(
        collection(db, "escolas", escolaId, "turmas"),
        where("ano", "==", anoAtivo)
      );
      const snapT = await getDocs(qT);
      setTurmas(snapT.docs.map((d) => normalizarTurma(d.data().nome)).sort());
    }

    const campoTurmasAno = `turmas_${anoAtivo}`;
    setVincTurmas(prof[campoTurmasAno] || {});
  };

  const toggleCargo = (cargo) => {
    setCargosSelecionados((prev) =>
      prev.includes(cargo) ? prev.filter((c) => c !== cargo) : [...prev, cargo]
    );
  };

  const toggleTurma = (turma) => {
    setVincTurmas((prev) => {
      const novo = { ...prev };
      novo[turma] ? delete novo[turma] : (novo[turma] = true);
      return novo;
    });
  };

  const salvar = async () => {
    if (cargosSelecionados.length === 0) {
      return toast.warning("Selecione ao menos um cargo/disciplina.");
    }

    try {
      setCarregandoDados(true);
      const campoTurmasAno = `turmas_${anoAtivo}`;
      const perfilFinal = cargosSelecionados.join(", ");

      await updateDoc(doc(db, "usuarios", selecionado.id), {
        [campoTurmasAno]: vincTurmas,
        perfil: perfilFinal,
        cargo: perfilFinal,
      });

      toast.success(`Dados de ${selecionado.nome} atualizados com sucesso!`);
      carregarProfissionais();
      setSelecionado(null);
    } catch (e) {
      toast.error("Erro ao salvar alterações.");
    } finally {
      setCarregandoDados(false);
    }
  };

  if (isLoadingUserSchool || carregandoDados) return <Loader />;

  return (
    <div className="vinculacao-page-container">
      <ToastContainer position="bottom-right" />
      <div className="vinculacao-main-card">
        <div className="prof-sidebar">
          <div className="sidebar-header">
            <button className="btn-voltar-minimal" onClick={handleVoltar}>
              ← Início
            </button>
            <h3 style={{ marginTop: "10px" }}>Profissionais {anoAtivo}</h3>
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="prof-list-scroll">
            {profissionais
              .filter((p) =>
                p.nome?.toLowerCase().includes(busca.toLowerCase())
              )
              .map((prof) => (
                <div
                  key={prof.id}
                  className={`prof-item-card ${
                    selecionado?.id === prof.id ? "active" : ""
                  }`}
                  onClick={() => selecionarProf(prof)}
                >
                  <span className="prof-name">{prof.nome}</span>
                  <span className="prof-perfil-badge">
                    {prof.perfil || prof.cargo}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="vinculo-content">
          {selecionado ? (
            <div className="editor-container">
              <div className="header-edicao">
                <h2>Configuração de Atuação</h2>
                <p>
                  Profissional: <strong>{selecionado.nome}</strong>
                </p>
              </div>

              <div
                className="cargo-selection-area"
                style={{
                  background: "#f0f9ff",
                  padding: "20px",
                  borderRadius: "20px",
                  border: "1px solid #bae6fd",
                  marginBottom: "25px",
                }}
              >
                <label
                  style={{
                    fontWeight: "800",
                    fontSize: "0.8rem",
                    color: "#0369a1",
                    display: "block",
                    marginBottom: "15px",
                  }}
                >
                  DISCIPLINAS E CARGOS (Múltipla Seleção):
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {LISTA_CARGOS.map((cargo) => (
                    <label
                      key={cargo}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        padding: "12px",
                        background: cargosSelecionados.includes(cargo)
                          ? "#3b82f6"
                          : "#fff",
                        color: cargosSelecionados.includes(cargo)
                          ? "#fff"
                          : "#475569",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        transition: "0.2s",
                        boxShadow: cargosSelecionados.includes(cargo)
                          ? "0 4px 6px -1px rgba(59, 130, 246, 0.3)"
                          : "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={cargosSelecionados.includes(cargo)}
                        onChange={() => toggleCargo(cargo)}
                        style={{ cursor: "pointer" }}
                      />
                      {cargo}
                    </label>
                  ))}
                </div>
              </div>

              <label
                style={{
                  fontWeight: "800",
                  fontSize: "0.8rem",
                  color: "#475569",
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                VINCULAR ÀS TURMAS DE {anoAtivo}:
              </label>
              <div className="turmas-selection-grid">
                {turmas.length > 0 ? (
                  turmas.map((turma) => (
                    <label
                      key={turma}
                      className={`turma-checkbox-card ${
                        vincTurmas[turma] ? "checked" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!vincTurmas[turma]}
                        onChange={() => toggleTurma(turma)}
                      />
                      <span>{turma}</span>
                    </label>
                  ))
                ) : (
                  <p style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                    Nenhuma turma oficial encontrada para {anoAtivo}.
                  </p>
                )}
              </div>

              <button className="btn-salvar-vinculo" onClick={salvar}>
                Confirmar Atuação em {anoAtivo}
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <img
                src="/logo-vivencie.png"
                alt="Logo"
                className="bg-logo-fade"
              />
              <p>Selecione um profissional para gerenciar cargos e turmas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
