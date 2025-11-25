import React from "react";

// Simulação de banco de imagens (Na vida real, isso viria de uma API)
const DICIONARIO_VISUAL = {
  casa: "https://img.icons8.com/color/48/house.png",
  escola: "https://img.icons8.com/color/48/school-building.png",
  aluno: "https://img.icons8.com/color/48/student-male.png",
  feliz: "https://img.icons8.com/color/48/happy.png",
  triste: "https://img.icons8.com/color/48/sad.png",
  comer: "https://img.icons8.com/color/48/eating.png",
  amigo: "https://img.icons8.com/color/48/friends.png",
  sol: "https://img.icons8.com/color/48/sun.png",
  lua: "https://img.icons8.com/color/48/moon.png",
  livro: "https://img.icons8.com/color/48/book.png",
  jogar: "https://img.icons8.com/color/48/controller.png",
  // Adicione mais mapeamentos ou use uma API real aqui
};

const VisualizadorPictogramas = ({ texto }) => {
  const palavras = texto.split(/\s+/);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        padding: "10px",
        background: "#f8f9fa",
        borderRadius: "8px",
      }}
    >
      {palavras.map((palavra, index) => {
        // Limpa pontuação para buscar no dicionário
        const termoLimpo = palavra.toLowerCase().replace(/[.,!?;:]/g, "");
        const imagem = DICIONARIO_VISUAL[termoLimpo];

        return (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: "40px",
            }}
          >
            {imagem ? (
              <img
                src={imagem}
                alt={termoLimpo}
                style={{ width: "30px", height: "30px", marginBottom: "2px" }}
              />
            ) : (
              <div style={{ height: "32px" }}></div> // Espaço vazio para alinhar o texto
            )}
            <span
              style={{ fontSize: "0.9rem", fontFamily: "Arial, sans-serif" }}
            >
              {palavra}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default VisualizadorPictogramas;
