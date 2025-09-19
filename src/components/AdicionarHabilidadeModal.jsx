import React, { useState } from "react";

// Estilos inline para simplicidade
const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "25px",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "500px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
  },
  formGroup: {
    marginBottom: "15px",
  },
  label: {
    display: "block",
    fontWeight: "600",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    boxSizing: "border-box", // Garante que o padding não aumente a largura
  },
  botoesContainer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },
  botaoSalvar: {
    padding: "10px 18px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#2a9d8f",
    color: "white",
    cursor: "pointer",
  },
  botaoCancelar: {
    padding: "10px 18px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "#f1f1f1",
    cursor: "pointer",
  },
};

function AdicionarHabilidadeModal({ areasExistentes, onSalvar, onClose }) {
  const [area, setArea] = useState(areasExistentes[0] || "NOVA_AREA");
  const [novaArea, setNovaArea] = useState("");
  const [habilidade, setHabilidade] = useState("");

  const handleSalvarClick = () => {
    if (!habilidade.trim()) {
      alert("Por favor, descreva a habilidade.");
      return;
    }
    const areaFinal = area === "NOVA_AREA" ? novaArea.trim() : area;
    if (!areaFinal) {
      alert("Por favor, selecione ou crie uma área.");
      return;
    }

    const novaHabilidadeObj = {
      id: `${areaFinal.replaceAll(" ", "_")}-${habilidade
        .trim()
        .replaceAll(" ", "_")}-${Date.now()}`,
      area: areaFinal,
      habilidade: habilidade.trim(),
      status: "A iniciar",
    };

    onSalvar(novaHabilidadeObj);
    onClose();
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3>Adicionar Nova Habilidade</h3>

        <div style={styles.formGroup}>
          <label htmlFor="area" style={styles.label}>
            Área
          </label>
          <select
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            style={styles.input}
          >
            {areasExistentes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value="NOVA_AREA">--- Criar Nova Área ---</option>
          </select>
        </div>

        {area === "NOVA_AREA" && (
          <div style={styles.formGroup}>
            <label htmlFor="novaArea" style={styles.label}>
              Nome da Nova Área
            </label>
            <input
              type="text"
              id="novaArea"
              value={novaArea}
              onChange={(e) => setNovaArea(e.target.value)}
              style={styles.input}
              placeholder="Ex: Coordenação Motora Fina"
            />
          </div>
        )}

        <div style={styles.formGroup}>
          <label htmlFor="habilidade" style={styles.label}>
            Descrição da Habilidade
          </label>
          <textarea
            id="habilidade"
            rows="3"
            value={habilidade}
            onChange={(e) => setHabilidade(e.target.value)}
            style={styles.input}
            placeholder="Ex: Recortar formas geométricas simples"
          ></textarea>
        </div>

        <div style={styles.botoesContainer}>
          <button onClick={onClose} style={styles.botaoCancelar}>
            Cancelar
          </button>
          <button onClick={handleSalvarClick} style={styles.botaoSalvar}>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdicionarHabilidadeModal;
