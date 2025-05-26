import React from "react";
import Modal from "react-modal";

Modal.setAppElement("#root");

function ModalVisualizacao({ isOpen, onClose, aluno, idade, faixa, respostas, observacoes }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Visualização da Avaliação"
      style={{
        content: {
          maxWidth: "700px",
          margin: "auto",
          borderRadius: "12px",
          padding: "30px",
          backgroundColor: "#fdfdfd",
        },
        overlay: {
          backgroundColor: "rgba(0,0,0,0.4)"
        }
      }}
    >
      <h2 style={{ color: "#1d3557", marginBottom: "20px" }}>Visualização da Avaliação</h2>
      <p><strong>Aluno:</strong> {aluno}</p>
      <p><strong>Idade:</strong> {idade} anos</p>
      <p><strong>Faixa Etária:</strong> {faixa}</p>

      {respostas && Object.keys(respostas).map((area) => (
        <div key={area} style={{ marginTop: "20px" }}>
          <h3 style={{ color: "#457b9d" }}>{area.replaceAll("_", " ")}</h3>
          <ul>
            {Object.entries(respostas[area]).map(([pergunta, valor], i) => (
              valor && <li key={i}>✔ {pergunta}</li>
            ))}
          </ul>
          {observacoes[area] && (
            <p style={{ background: "#fffceb", padding: "10px", borderRadius: "8px" }}>
              <strong>Observações:</strong> {observacoes[area]}
            </p>
          )}
        </div>
      ))}

      <div style={{ textAlign: "right", marginTop: "30px" }}>
        <button onClick={onClose} style={{
          padding: "10px 20px",
          backgroundColor: "#1d3557",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold",
          cursor: "pointer"
        }}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}

export default ModalVisualizacao;