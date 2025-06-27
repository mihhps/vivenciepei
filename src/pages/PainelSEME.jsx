import React from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair"; // Presumindo que este componente existe
import BotaoVoltar from "../components/BotaoVoltar"; // Presumindo que este componente existe

export default function PainelSEME() {
  const navigate = useNavigate();

  // Configuração para os botões de navegação
  const botoesNavegacao = [
    { label: "Ver Alunos", path: "/ver-alunos" },
    { label: "Ver Avaliações Iniciais", path: "/ver-avaliacoes" },
    { label: "Vincular Escolas a Professores", path: "/vincular-escolas" },
    { label: "Gerar PDF Consolidado", path: "/gerar-relatorios" },
    { label: "Acompanhamento Escolar", path: "/acompanhamento" },
    // --- NOVO BOTÃO AQUI ---
    {
      label: "Acompanhamento de Prazos PEI",
      path: "/acompanhamento-prazos-pei",
    },
    // --- FIM DO NOVO BOTÃO ---
  ];

  return (
    <div style={estilos.fundo}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <img
          src="/logo-vivencie.png" // Certifique-se que este caminho está correto na sua pasta public
          alt="Logo Vivencie PEI"
          style={estilos.logo}
        />
        <h2 style={estilos.titulo}>Painel da SEME</h2>

        <div style={estilos.botoesContainer}>
          {botoesNavegacao.map((itemBotao) => (
            <button
              key={itemBotao.path} // key é importante para listas em React
              style={estilos.botao}
              onClick={() => navigate(itemBotao.path)}
              // Opcional: Adicionar um efeito hover mais visível (como feito em outros painéis)
              // Você precisaria de um estilo de hover separado no objeto estilos,
              // ou gerenciar com onMouseEnter/onMouseLeave se quiser inline.
              // Exemplo de como usar com onMouseEnter/onMouseLeave (se quiser):
              // onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2a9d8f'}
              // onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1d3557'}
            >
              {itemBotao.label}
            </button>
          ))}
        </div>

        <BotaoSair />
      </div>
    </div>
  );
}

const estilos = {
  fundo: {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "40px 20px",
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "20px",
    padding: "30px 40px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    textAlign: "center",
    width: "100%",
    maxWidth: "500px",
  },
  logo: {
    width: "120px",
    marginBottom: "20px",
  },
  titulo: {
    color: "#1d3557",
    marginBottom: "30px",
    fontSize: "24px",
  },
  botoesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    marginBottom: "30px",
  },
  botao: {
    backgroundColor: "#1d3557",
    color: "#fff",
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.2s ease-in-out, transform 0.1s ease-in-out",
    width: "100%",
    boxSizing: "border-box",
  },
  // Opcional: Para um hover consistente com os outros painéis,
  // você pode adicionar um efeito com onMouseEnter/onMouseLeave no botão (como comentado acima).
  // Se quiser um estilo de hover mais elaborado, seria melhor usar um arquivo CSS externo.
};
