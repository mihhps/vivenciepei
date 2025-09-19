import React, { useState } from "react";

const DIAS_SEMANA = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
];

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
  horarioRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  horarioLabel: {
    flex: "1 1 100px",
    fontWeight: "500",
  },
  horarioInput: {
    flex: "1 1 80px",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
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

function GerenciarHorarios({ horariosAtuais, onSalvar, onClose }) {
  const [horarios, setHorarios] = useState(() => {
    const estadoInicial = {};
    DIAS_SEMANA.forEach((dia) => {
      const horarioExistente = horariosAtuais.find((h) => h.dia === dia);
      estadoInicial[dia] = {
        selecionado: !!horarioExistente,
        inicio: horarioExistente?.inicio || "",
        fim: horarioExistente?.fim || "",
      };
    });
    return estadoInicial;
  });

  const handleCheckboxChange = (dia) => {
    setHorarios((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], selecionado: !prev[dia].selecionado },
    }));
  };

  const handleTimeChange = (dia, tipo, valor) => {
    setHorarios((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [tipo]: valor },
    }));
  };

  const handleSalvarClick = () => {
    const horariosParaSalvar = Object.entries(horarios)
      .filter(([, info]) => info.selecionado && info.inicio && info.fim)
      .map(([dia, info]) => ({
        dia,
        inicio: info.inicio,
        fim: info.fim,
      }));
    onSalvar(horariosParaSalvar);
    onClose();
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3>Gerenciar Horários de Atendimento</h3>
        <div>
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} style={styles.horarioRow}>
              <input
                type="checkbox"
                checked={horarios[dia].selecionado}
                onChange={() => handleCheckboxChange(dia)}
                id={`check-${dia}`}
              />
              <label htmlFor={`check-${dia}`} style={styles.horarioLabel}>
                {dia}
              </label>
              <input
                type="time"
                style={styles.horarioInput}
                value={horarios[dia].inicio}
                onChange={(e) =>
                  handleTimeChange(dia, "inicio", e.target.value)
                }
                disabled={!horarios[dia].selecionado}
              />
              <span>às</span>
              <input
                type="time"
                style={styles.horarioInput}
                value={horarios[dia].fim}
                onChange={(e) => handleTimeChange(dia, "fim", e.target.value)}
                disabled={!horarios[dia].selecionado}
              />
            </div>
          ))}
        </div>
        <div style={styles.botoesContainer}>
          <button onClick={onClose} style={styles.botaoCancelar}>
            Cancelar
          </button>
          <button onClick={handleSalvarClick} style={styles.botaoSalvar}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export default GerenciarHorarios;
