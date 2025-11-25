import React from "react";
import {
  FaThermometerHalf,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";

const TermometroInclusao = ({ texto }) => {
  // Lógica simples de análise (pode ser aprimorada com IA depois)
  const palavras = texto
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  const frases = texto.split(/[.!?]+/).filter((f) => f.length > 0);

  const mediaPalavrasPorFrase =
    frases.length > 0 ? palavras.length / frases.length : 0;
  const temPalavrasLongas = palavras.some((p) => p.length > 12); // Ex: "Paralelepípedo"

  // Cálculo do "Score" (0 a 100)
  let score = 100;
  let dicas = [];

  if (mediaPalavrasPorFrase > 15) {
    score -= 20;
    dicas.push(
      "Frases muito longas. Tente usar pontos finais com mais frequência."
    );
  }

  if (temPalavrasLongas) {
    score -= 10;
    dicas.push(
      "Detectamos palavras complexas (+12 letras). Tente sinônimos mais simples."
    );
  }

  if (texto.length > 0 && frases.length < 2 && palavras.length > 20) {
    score -= 15;
    dicas.push("O texto parece um bloco único. Quebre em parágrafos.");
  }

  // Definição de Cores
  const getCor = () => {
    if (score > 80) return "#2a9d8f"; // Verde
    if (score > 50) return "#f4a261"; // Laranja
    return "#e76f51"; // Vermelho
  };

  if (!texto) return null;

  return (
    <div
      style={{
        background: "white",
        padding: "15px",
        borderRadius: "8px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
        marginTop: "15px",
        borderLeft: `5px solid ${getCor()}`,
      }}
    >
      <h4
        style={{
          margin: "0 0 10px 0",
          color: "#1d3557",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <FaThermometerHalf color={getCor()} /> Termômetro de Acessibilidade
        <span
          style={{
            fontSize: "0.8em",
            background: getCor(),
            color: "white",
            padding: "2px 8px",
            borderRadius: "10px",
          }}
        >
          {score}/100
        </span>
      </h4>

      {dicas.length === 0 ? (
        <p style={{ color: "#2a9d8f", fontSize: "0.9rem", margin: 0 }}>
          <FaCheck /> O texto está excelente e fácil de ler!
        </p>
      ) : (
        <ul
          style={{
            margin: 0,
            paddingLeft: "20px",
            fontSize: "0.85rem",
            color: "#666",
          }}
        >
          {dicas.map((dica, idx) => (
            <li key={idx} style={{ marginBottom: "5px" }}>
              {dica}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TermometroInclusao;
