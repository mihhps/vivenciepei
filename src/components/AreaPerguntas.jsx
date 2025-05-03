import React from "react";

function AreaPerguntas({ area, faixaEtaria, dados, respostas, observacoes, onResponder, onObservar }) {
  if (!area || !faixaEtaria) return null;

  return (
    <div>
      <h3 style={{ color: "#1d3557", marginBottom: "20px" }}>{area.replaceAll("_", " ")}</h3>

      <h4 style={{ color: "#457b9d" }}>Perguntas:</h4>
      <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
        {dados?.perguntas?.map((pergunta, i) => (
          <li key={i} style={{
            background: "#f9f9f9",
            padding: "12px",
            marginBottom: "10px",
            borderRadius: "10px",
            border: "1px solid #ddd"
          }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                checked={respostas?.[area]?.[pergunta] || false}
                onChange={(e) => onResponder(area, pergunta, e.target.checked)}
              />
              {pergunta}
            </label>
          </li>
        ))}
      </ul>

      
      <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
        {dados?.checklist?.map((item, i) => (
          <li key={i} style={{
            background: "#f1f1f1",
            padding: "12px",
            marginBottom: "10px",
            borderRadius: "10px",
            border: "1px solid #ccc"
          }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                checked={respostas?.[area]?.[item] || false}
                onChange={(e) => onResponder(area, item, e.target.checked)}
              />
              {item}
            </label>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "25px" }}>
        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>
          Observações:
        </label>
        <textarea
          rows="4"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            background: "#fffceb"
          }}
          value={observacoes?.[area] || ""}
          onChange={(e) => onObservar(area, e.target.value)}
          placeholder="Anotações importantes para esta área..."
        />
      </div>
    </div>
  );
}

export default AreaPerguntas;