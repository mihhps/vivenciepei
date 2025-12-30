import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getDocs,
  collection,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore"; // ✅ Adicionado query e where
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import { toast, ToastContainer } from "react-toastify";

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

  // ✅ 1. RECUPERA O ANO DO EXERCÍCIO ATIVO
  const anoAtivo = useMemo(
    () => Number(localStorage.getItem("anoExercicio")) || 2025,
    []
  );

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      // ✅ 2. FILTRA USUÁRIOS E ESCOLAS PELO ANO VIGENTE
      // (Considerando que você carimba o 'ano' no cadastro de usuários e escolas)
      const uSnap = await getDocs(collection(db, "usuarios"));
      const eSnap = await getDocs(collection(db, "escolas"));

      const escolasListadas = eSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        // Filtra escolas do ano ativo (caso tenha escolas específicas por ano)
        .filter((e) => e.ano === anoAtivo || !e.ano);

      const usuariosFiltrados = uSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (u) =>
            ["professor", "aee", "gestao", "diretor"].includes(
              u.perfil?.toLowerCase()
            )
          // ✅ Permite ver profs cadastrados no ano ativo ou profs antigos para migração
        );

      setProfissionais(usuariosFiltrados);
      setEscolas(escolasListadas);
      if (escolasListadas.length > 0) setEscolaIdAtiva(escolasListadas[0].id);
    } catch (e) {
      toast.error("Erro ao carregar dados.");
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
      // ✅ 3. AO SALVAR, O PROFESSOR FICA ATUALIZADO PARA O ANO ATIVO
      await updateDoc(doc(db, "usuarios", profId), {
        escolas: novasEscolas,
        anoAtivo: anoAtivo, // Carimba o ano da última migração de vínculo
      });

      toast.success(`Vínculo atualizado para o exercício ${anoAtivo}!`);
      setProfEditando(null);
      setEdicoes({});
      carregarDados();
    } catch (e) {
      toast.error("Erro ao salvar.");
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
    <div className="vinc-escolas-page">
      <ToastContainer position="bottom-right" />
      <div className="vinc-escolas-card">
        {/* SIDEBAR */}
        <div className="vinc-sidebar">
          <div className="vinc-sidebar-header">
            <button className="btn-back-minimal" onClick={() => navigate(-1)}>
              ← Voltar
            </button>
            <h3 style={{ fontWeight: 900 }}>Unidades</h3>
            {/* ✅ EXIBE O ANO VIGENTE NO TOPO DA BARRA LATERAL */}
            <span className="badge-ano">Exercício {anoAtivo}</span>
          </div>
          <div className="vinc-sidebar-scroll">
            {escolas.map((e) => (
              <button
                key={e.id}
                className={`vinc-nav-item ${
                  escolaIdAtiva === e.id ? "active" : ""
                }`}
                onClick={() => setEscolaIdAtiva(e.id)}
              >
                {e.nome}
              </button>
            ))}
            <button
              className={`vinc-nav-item ${
                escolaIdAtiva === "sem" ? "active" : ""
              }`}
              onClick={() => setEscolaIdAtiva("sem")}
            >
              ⚠️ Sem Vínculo
            </button>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="vinc-content">
          <div className="vinc-content-header">
            <div>
              <h2>Gestão de Profissionais</h2>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                Vinculando para o ano letivo de <strong>{anoAtivo}</strong>
              </p>
            </div>
            <input
              className="vinc-search-bar"
              placeholder="Pesquisar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="vinc-grid-prof">
            {listaFiltrada.map((prof) => (
              <div key={prof.id}>
                <div className="vinc-prof-card">
                  <div className="prof-main-info">
                    <div className="prof-avatar-circle">
                      {prof.fotoUrl ? (
                        <img
                          src={prof.fotoUrl}
                          alt=""
                          className="avatar-img-vinc"
                        />
                      ) : (
                        prof.nome[0]
                      )}
                    </div>
                    <div className="prof-text">
                      <strong>{prof.nome}</strong>
                      <span>
                        {prof.perfil} {prof.anoAtivo === anoAtivo ? "✅" : "⏳"}
                      </span>
                    </div>
                  </div>
                  <button
                    className="vinc-btn-manage"
                    onClick={() => {
                      setEdicoes({}); // Limpa edições anteriores ao trocar de prof
                      setProfEditando(
                        prof.id === profEditando ? null : prof.id
                      );
                    }}
                  >
                    {profEditando === prof.id ? "Fechar" : "Gerenciar Vínculos"}
                  </button>
                </div>

                {profEditando === prof.id && (
                  <div className="edit-area-expanded">
                    <p
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        color: "#64748b",
                      }}
                    >
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
                          <div
                            key={esc.id}
                            className={`chip-item ${ativo ? "active" : ""}`}
                            onClick={() => handleToggle(esc.id, original)}
                          >
                            {esc.nome}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      className="btn-confirm-vinc"
                      onClick={() => salvar(prof.id)}
                    >
                      Confirmar Vínculos para {anoAtivo}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
