// Primeiro: declare o objeto normalmente
export const avaliacaoInicialEstruturada = {
  "Desenvolvimento Global": [
    {
      subarea: "Motricidade Grossa",
      habilidade: "Anda com segurança em linha reta",
      nivelSugerido: null,
      observacoes: ""
    },
    {
      subarea: "Motricidade Grossa",
      habilidade: "Corre com coordenação e controle de direção",
      nivelSugerido: null,
      observacoes: ""
    }
    // ... o restante dos dados
  ]
  // ... outras áreas
};

// Depois: declare a função separadamente
const validarDuplicadas = (estrutura) => {
  const vistas = new Set();
  const duplicadas = [];

  for (const [area, perguntas] of Object.entries(estrutura)) {
    perguntas.forEach(({ subarea, habilidade }) => {
      const id = `${area}||${subarea}||${habilidade}`;
      if (vistas.has(id)) {
        duplicadas.push({ area, subarea, habilidade });
      } else {
        vistas.add(id);
      }
    });
  }

  return duplicadas;
};

// Por fim: execute o validador com o objeto
console.log(validarDuplicadas(avaliacaoInicialEstruturada));