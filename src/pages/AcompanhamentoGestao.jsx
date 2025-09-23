import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { usePlanoAEE } from "../hooks/usePlanoAEE";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import "../styles/AcompanhamentoGestao.css";

// Mapeamento dos painéis de destino para o botão "Voltar"
const painelDestinoMapeado = {
  gestao: "/painel-gestao",
  seme: "/painel-seme",
  desenvolvedor: "/painel-dev",
  // Adicione outros perfis que possam acessar esta página
};

function AcompanhamentoGestao() {
  const { alunoId } = useParams();
  const { aluno, plano, atividades, estado } = usePlanoAEE(alunoId);
  const [modalData, setModalData] = useState(null);
  const [feedbacks, setFeedbacks] = useState({});

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );

  // ===== LÓGICA CORRIGIDA PARA O BOTÃO VOLTAR =====
  const perfilNormalizado = (usuarioLogado.perfil || "").toLowerCase().trim();
  const painelDestino = painelDestinoMapeado[perfilNormalizado] || "/"; // Volta para a raiz se não encontrar

  const handleFeedbackChange = (atividadeId, texto) => {
    setFeedbacks((prev) => ({ ...prev, [atividadeId]: texto }));
  };

  const handleSalvarFeedback = async (atividadeId) => {
    const textoFeedback = feedbacks[atividadeId];
    if (!textoFeedback || !plano?.id) {
      toast.warn("Por favor, escreva um feedback antes de salvar.");
      return;
    }

    try {
      const atividadeRef = doc(
        db,
        `planosAEE/${plano.id}/atividades`,
        atividadeId
      );

      const feedbackData = {
        texto: textoFeedback,
        autorNome: usuarioLogado.nome,
        autorId: usuarioLogado.uid,
        data: serverTimestamp(),
      };

      await updateDoc(atividadeRef, { feedbackGestao: feedbackData });

      toast.success("Feedback salvo com sucesso!");
      setFeedbacks((prev) => ({ ...prev, [atividadeId]: "" }));

      setModalData((prev) => ({
        ...prev,
        feedbackGestao: {
          ...feedbackData,
          data: { toDate: () => new Date() },
        },
      }));
    } catch (error) {
      console.error("Erro ao salvar feedback:", error);
      toast.error("Não foi possível salvar o feedback.");
    }
  };

  if (estado.carregando || !plano || !aluno) {
    return (
      <div className="acompanhamento-gestao-page">
        <div className="card-principal-gestao">
          <div className="loading-message">Carregando Plano de AEE...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="acompanhamento-gestao-page">
      <div className="card-principal-gestao">
        <header className="avaliacao-header">
          {/* ===== LINK DO BOTÃO VOLTAR CORRIGIDO ===== */}
          <Link to={painelDestino} className="botao-voltar">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Voltar
          </Link>
          <h1 className="avaliacao-titulo">Acompanhamento da Gestão</h1>
        </header>

        <div className="aluno-info-header">
          <span className="info-item">
            <strong>Aluno(a):</strong> {aluno.nome}
          </span>
          <span className="info-item">
            <strong>Turma:</strong> {aluno.turma}
          </span>
        </div>

        <main className="timeline-container">
          {atividades.length > 0 ? (
            atividades.map((reg) => (
              <div key={reg.id} className="timeline-item">
                <div
                  className={`timeline-icon ${
                    reg.feedbackGestao ? "feedback-dado" : ""
                  }`}
                >
                  {reg.feedbackGestao && "✓"}
                </div>
                <div className="timeline-content">
                  <div className="timeline-info">
                    <span className="timeline-data">
                      {reg.data.toDate().toLocaleDateString()}
                    </span>
                    <p className="timeline-title">
                      {reg.atividadePrincipal.descricao}
                    </p>
                  </div>
                  <button
                    className="timeline-details-btn"
                    onClick={() => setModalData(reg)}
                  >
                    Ver Detalhes
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="aviso-sem-registros">
              Nenhum atendimento registrado para este aluno ainda.
            </p>
          )}
        </main>
      </div>

      {modalData && (
        <div className="modal-overlay" onClick={() => setModalData(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 className="modal-title">Detalhes do Atendimento</h2>
              <span className="modal-data">
                {modalData.data.toDate().toLocaleDateString()}
              </span>
              <button
                className="modal-close-btn"
                onClick={() => setModalData(null)}
              >
                &times;
              </button>
            </header>

            <div className="modal-body">
              <div className="modal-section">
                <h3>Descrição da Atividade</h3>
                <div className="modal-main-content">
                  {modalData.atividadePrincipal.descricao}
                </div>
              </div>

              <div className="modal-section">
                <h3>Habilidades Trabalhadas</h3>
                {(modalData.atividadePrincipal.habilidadesAvaliadas || [])
                  .length > 0 ? (
                  modalData.atividadePrincipal.habilidadesAvaliadas.map(
                    (atv, i) => (
                      <div key={i} className="habilidade-detalhe-historico">
                        <p>
                          <strong>Habilidade:</strong> {atv.habilidadeTexto}
                        </p>
                        <p>
                          <strong>Resultado:</strong>{" "}
                          <span
                            className={`resultado-badge resultado-${atv.resultado.replace(
                              /\s+/g,
                              "-"
                            )}`}
                          >
                            {atv.resultado}
                          </span>
                        </p>
                        {atv.observacoes && (
                          <p className="obs-historico">
                            <strong>Obs:</strong> {atv.observacoes}
                          </p>
                        )}
                      </div>
                    )
                  )
                ) : (
                  <p>Nenhuma habilidade específica registrada.</p>
                )}
              </div>

              <div className="feedback-section">
                <h4>Feedback da Gestão</h4>
                {modalData.feedbackGestao ? (
                  <div className="feedback-salvo">
                    <p>"{modalData.feedbackGestao.texto}"</p>
                    <span>
                      - {modalData.feedbackGestao.autorNome} em{" "}
                      {modalData.feedbackGestao.data
                        ?.toDate()
                        .toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  <div className="feedback-form">
                    <textarea
                      placeholder="Deixe seu feedback para a professora..."
                      value={feedbacks[modalData.id] || ""}
                      onChange={(e) =>
                        handleFeedbackChange(modalData.id, e.target.value)
                      }
                    ></textarea>
                    <button onClick={() => handleSalvarFeedback(modalData.id)}>
                      Salvar Feedback
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AcompanhamentoGestao;
