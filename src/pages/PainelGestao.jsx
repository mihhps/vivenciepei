import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import { useDebugNavigate } from "../hooks/useDebugNavigate"; // Removido: hook de debug não utilizado
import BotaoSair from "../components/BotaoSair";

export default function PainelGestao() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("usuarioLogado");
    if (userData) {
      try {
        // Adicionado try-catch para parse do JSON
        const user = JSON.parse(userData);
        setUsuarioLogado(user);
      } catch (e) {
        console.error("Erro ao parsear dados do usuário logado:", e);
        setUsuarioLogado(null); // Define como nulo se o JSON for inválido
      }
    }
  }, []);

  // Define os perfis que podem ver o botão de acompanhamento
  // Gestão, Seme e AEE têm acesso ao acompanhamento
  const perfisComAcessoAcompanhamento = ["gestao", "seme", "aee"];

  const estiloBotao = {
    padding: "12px 24px",
    margin: "6px 0",
    backgroundColor: "#1d3557",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    width: "100%",
    cursor: "pointer",
    // Adicionado transição para um efeito hover suave
    transition: "background-color 0.3s ease",
  };

  // Estilo para hover, pode ser usado com onMouseEnter/onMouseLeave
  const estiloBotaoHover = {
    backgroundColor: "#2a9d8f", // Uma cor diferente para hover
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: "#1d3557",
        display: "flex",
        justifyContent: "center",
        paddingTop: "60px",
        paddingBottom: "60px",
        overflowY: "auto",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 0 30px rgba(0,0,0,0.2)",
          width: "100%",
          maxWidth: "420px",
          textAlign: "center",
        }}
      >
        <img
          src="/logo-vivencie.png"
          alt="Logo Vivencie PEI"
          style={{
            width: "150px",
            height: "auto",
            objectFit: "contain",
            display: "block",
            margin: "0 auto 10px",
          }}
        />
        <h1 style={{ marginBottom: "10px", color: "#1d3557" }}>
          Painel da Gestão
        </h1>
        <p style={{ marginBottom: "20px" }}>
          Bem-vindo, <strong>{usuarioLogado?.nome || "Usuário"}</strong>
          <br />
          Perfil: <strong>{usuarioLogado?.perfil || "Desconhecido"}</strong>
        </p>

        {/* Botões existentes do Painel da Gestão */}
        <button
          style={estiloBotao}
          onClick={() => navigate("/cadastrar-aluno")}
        >
          Cadastrar Alunos
        </button>
        <button
          style={estiloBotao}
          onClick={() => navigate("/cadastrar-usuario")}
        >
          Cadastrar Usuários
        </button>
        <button
          style={estiloBotao}
          onClick={() => navigate("/vincular-turmas")}
        >
          Vincular Turmas a Professores
        </button>
        <button style={estiloBotao} onClick={() => navigate("/acompanhamento")}>
          Acompanhamento Escolar
        </button>
        <button
          style={estiloBotao}
          onClick={() => navigate("/gestao-prazos-pei")}
        >
          Gerenciar Prazos PEI
        </button>

        {/* --- NOVO BOTÃO: Acompanhamento de Prazos PEI --- */}
        {/* Renderiza o botão apenas se o perfil do usuário estiver na lista de perfis permitidos */}
        {usuarioLogado &&
          perfisComAcessoAcompanhamento.includes(usuarioLogado.perfil) && (
            <button
              style={estiloBotao}
              onClick={() => navigate("/acompanhamento-prazos-pei")}
              // Opcional: Adicionar um efeito hover mais visível se quiser
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  estiloBotaoHover.backgroundColor)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  estiloBotao.backgroundColor)
              }
            >
              Acompanhamento de Prazos PEI
            </button>
          )}
        {/* --- FIM DO NOVO BOTÃO --- */}

        <BotaoSair />
      </div>
    </div>
  );
}
