import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { usePlanoAEE } from "../hooks/usePlanoAEE";
import { db } from "../firebase";
import {
  doc,
  updateDoc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";
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
  const [feedbackInput, setFeedbackInput] = useState("");

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );

  const perfilNormalizado = (usuarioLogado.perfil || "").toLowerCase().trim();
  const painelDestino = painelDestinoMapeado[perfilNormalizado] || "/";

  const handleOpenModal = (reg) => {
    setModalData(reg);
    setFeedbackInput(reg.feedbackGestao?.texto || "");
  };

  const handleSalvarFeedback = async () => {
    if (!feedbackInput || !alunoId || !modalData?.id) {
      toast.warn("Por favor, escreva um feedback.");
      return;
    }

    if (!plano?.id) {
      toast.warn("Aguardando os dados do plano serem carregados.");
      return;
    }

    try {
      const atividadeRef = doc(
        db,
        "alunos",
        alunoId,
        "atividadesAEE",
        modalData.id
      );

      const feedbackData = {
        texto: feedbackInput,
        autorNome: usuarioLogado.nome,
        autorId: usuarioLogado.uid,
        data: serverTimestamp(),
      };

      await updateDoc(atividadeRef, { feedbackGestao: feedbackData });

      toast.success("Feedback salvo com sucesso!");

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

  const handleExcluirFeedback = async () => {
    if (!alunoId || !modalData?.id) {
      toast.warn("Não foi possível excluir. Dados ausentes.");
      return;
    }

    try {
      const atividadeRef = doc(
        db,
        "alunos",
        alunoId,
        "atividadesAEE",
        modalData.id
      );

      await updateDoc(atividadeRef, {
        feedbackGestao: deleteField(),
      });

      toast.success("Feedback excluído com sucesso!");

      setModalData((prev) => ({
        ...prev,
        feedbackGestao: null,
      }));

      setFeedbackInput("");
    } catch (error) {
      console.error("Erro ao excluir feedback:", error);
      toast.error("Não foi possível excluir o feedback.");
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
                    onClick={() => handleOpenModal(reg)}
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
                  // Se houver feedback salvo, exibe-o com o botão de excluir
                  <div className="feedback-salvo-container">
                    <div className="feedback-salvo">
                      <p>"{modalData.feedbackGestao.texto}"</p>
                      <span>
                        - {modalData.feedbackGestao.autorNome} em{" "}
                        {modalData.feedbackGestao.data
                          ?.toDate()
                          .toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={handleExcluirFeedback}
                      className="btn-excluir-feedback"
                    >
                      Excluir
                    </button>
                  </div>
                ) : (
                  // Se não houver feedback, exibe o formulário para salvar
                  <div className="feedback-form">
                    <textarea
                      placeholder="Deixe seu feedback para a professora..."
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                    ></textarea>
                    <button
                      onClick={handleSalvarFeedback}
                      disabled={!plano?.id}
                      title={
                        !plano?.id
                          ? "Aguardando o carregamento dos dados do plano..."
                          : ""
                      }
                    >
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
