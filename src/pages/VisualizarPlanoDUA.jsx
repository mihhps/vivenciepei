import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  FaArrowLeft,
  FaEdit,
  FaBrain,
  FaCheckCircle,
  FaHeart,
  FaCalendarAlt,
  FaLayerGroup,
  FaFilePdf,
  FaSpinner,
  FaTools,
  FaCommentDots,
  FaUserCircle,
  FaBullseye,
} from "react-icons/fa";
import "../styles/VisualizarPlanoDUA.css";
import { gerarPDFPlanoDUA } from "../utils/gerarPDFPlanoDUA";

export default function VisualizarPlanoDUA() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plano, setPlano] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );

  useEffect(() => {
    const fetch = async () => {
      try {
        const docSnap = await getDoc(doc(db, "planosAulaDUA", id));
        if (docSnap.exists()) setPlano({ id: docSnap.id, ...docSnap.data() });
        else navigate("/ver-planos-aula");
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, navigate]);

  if (loading)
    return <div className="loading-screen-view">Sincronizando...</div>;
  if (!plano) return null;

  const dataF = plano.data
    ? new Date(plano.data).toLocaleDateString("pt-BR")
    : "--/--/----";
  const nomeProfessor =
    plano.criadorNome ||
    plano.nomeCriador ||
    usuarioLogado.nome ||
    "Não informado";

  return (
    <div className="plano-view-root">
      <header className="plano-view-nav no-print">
        <button
          onClick={() => navigate("/ver-planos-aula")}
          className="btn-voltar-premium"
        >
          <FaArrowLeft /> Meus Planos
        </button>
        <div className="nav-actions-right">
          <button
            onClick={() => navigate(`/editar-plano-dua/${id}`)}
            className="btn-edit-premium"
          >
            <FaEdit /> Editar
          </button>
          <button
            onClick={() => gerarPDFPlanoDUA(plano, dataF)}
            className="btn-pdf-premium"
            disabled={gerandoPDF}
          >
            <FaFilePdf /> Exportar PDF
          </button>
        </div>
      </header>

      <main className="plano-view-content">
        <div className="plano-view-container">
          {/* LOGO E IDENTIDADE */}
          <section className="plano-header-identity">
            <img
              src="/logodua.png"
              alt="Logo DUA"
              className="plano-logo-img-new"
            />
            <div className="plano-titles-wrapper">
              <span className="ano-exercicio-badge">
                EXERCÍCIO {plano.anoLetivo || "2025"}
              </span>
              <h1 className="main-doc-title">Planejamento Pedagógico DUA</h1>
            </div>
          </section>

          {/* TÍTULO HERO */}
          <section className="aula-title-hero">
            <label>TÍTULO DA AULA</label>
            <h2>{plano.tituloAula}</h2>
          </section>

          {/* GRID METADADOS PROF/TURMA */}
          <div className="meta-info-grid">
            <div className="meta-info-card">
              <FaUserCircle className="meta-icon" />
              <div className="meta-data">
                <label>PROFESSOR(A) RESPONSÁVEL</label>
                <strong>{nomeProfessor}</strong>
              </div>
            </div>
            <div className="meta-info-card">
              <FaLayerGroup className="meta-icon" />
              <div className="meta-data">
                <label>TURMA</label>
                <strong>{plano.turmaNome || "Não informada"}</strong>
              </div>
            </div>
            <div className="meta-info-card">
              <FaCalendarAlt className="meta-icon" />
              <div className="meta-data">
                <label>DATA DA AULA</label>
                <strong>{dataF}</strong>
              </div>
            </div>
          </div>

          {/* SEÇÃO: CONTEXTO (Tema e BNCC) - CORRIGIDO */}
          <section className="context-visual-grid">
            <div className="glass-card context-box">
              <div className="card-header-icon">
                <FaLayerGroup /> TEMA E CONTEÚDO
              </div>
              <p>{plano.conteudoTema || "Não informado."}</p>
            </div>
            <div className="glass-card context-box bncc-style">
              <div className="card-header-icon">
                <FaBullseye /> HABILIDADE BNCC
              </div>
              <p>{plano.objetivoCurricularBNCC || "Não informada."}</p>
            </div>
          </section>

          {/* PILARES DUA */}
          <div className="dua-pillars-wrapper">
            <h3 className="dua-section-label">ESTRATÉGIAS DE INCLUSÃO</h3>
            <div className="dua-grid">
              <div className="dua-pillar-card purple">
                <div className="pillar-header">
                  <FaBrain /> Representação
                </div>
                <ul className="pillar-list">
                  {plano.representacao?.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
              <div className="dua-pillar-card blue">
                <div className="pillar-header">
                  <FaCheckCircle /> Ação e Expressão
                </div>
                <ul className="pillar-list">
                  {plano.acaoExpressao?.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
              <div className="dua-pillar-card green">
                <div className="pillar-header">
                  <FaHeart /> Engajamento
                </div>
                <ul className="pillar-list">
                  {plano.engajamento?.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* RECURSOS E NOTAS - CORRIGIDO */}
          <footer className="footer-visual-grid">
            <div className="glass-card footer-item">
              <div className="card-header-icon orange">
                <FaTools /> RECURSOS E MATERIAIS
              </div>
              <p>{plano.materiais || "Nenhum material listado."}</p>
            </div>
            <div className="glass-card footer-item">
              <div className="card-header-icon cyan">
                <FaCommentDots /> OBSERVAÇÕES
              </div>
              <p>{plano.observacoes || "Nenhuma observação registrada."}</p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
