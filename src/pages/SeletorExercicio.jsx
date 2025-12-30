import React, { useState, useEffect } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import "./SeletorExercicio.css";

export default function SeletorExercicio() {
  // Pega o ano salvo ou define o atual como padrão
  const [anoAtivo, setAnoAtivo] = useState(
    localStorage.getItem("anoExercicio") || "2025"
  );

  const mudarAno = (novoAno) => {
    setAnoAtivo(novoAno);
    localStorage.setItem("anoExercicio", novoAno);
    // Recarrega a página para o sistema buscar os dados do novo ano
    window.location.reload();
  };

  return (
    <div className="seletor-exercicio-container">
      <div className="label-exercicio">
        <FaCalendarAlt />
        <span>Exercício:</span>
      </div>
      <select
        value={anoAtivo}
        onChange={(e) => mudarAno(e.target.value)}
        className="select-exercicio"
      >
        <option value="2024">2024</option>
        <option value="2025">2025</option>
        <option value="2026">2026</option>
      </select>
    </div>
  );
}
