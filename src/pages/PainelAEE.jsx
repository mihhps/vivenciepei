import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";

export default function PainelAee() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("usuarioLogado");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log("PainelAEE: Perfil do usuário original:", user.perfil);
        setUsuarioLogado(user);
      } catch (e) {
        console.error("Erro ao parsear dados do usuário logado:", e);
        setUsuarioLogado(null);
      }
    }
  }, []);

  const perfisComAcessoAcompanhamento = ["gestao", "seme", "aee"];
  const perfilUsuarioFormatado = usuarioLogado?.perfil?.toLowerCase();

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
    transition: "background-color 0.3s ease",
  };

  // --- DEFINIÇÃO DE estiloBotaoHover AQUI ---
  const estiloBotaoHover = {
    backgroundColor: "#457b9d", // Uma cor diferente para o hover
  };
  // --- FIM DA DEFINIÇÃO ---

  const ID_DE_ALUNO_PARA_TESTE = "Avaliacaointeresses"; // Use um ID real de aluno

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
        <h1 style={{ marginBottom: "10px", color: "#1d3557" }}>Painel AEE</h1>
        <p style={{ marginBottom: "20px" }}>
          Bem-vindo, <strong>{usuarioLogado?.nome || "Usuário"}</strong>
          <br />
          Perfil: <strong>{usuarioLogado?.perfil || "Desconhecido"}</strong>
        </p>

        {/* Botões originais do Painel AEE */}
        <button
          style={estiloBotao}
          onClick={() => navigate("/avaliacao-inicial")}
        >
          Avaliação Inicial
        </button>

        {/* NOVO BOTÃO: Avaliação de Interesses */}
        <button
          style={estiloBotao}
          onClick={() => navigate(`/nova-avaliacao/${ID_DE_ALUNO_PARA_TESTE}`)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor =
              estiloBotaoHover.backgroundColor)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor =
              estiloBotao.backgroundColor)
          }
        >
          Avaliação de Interesses
        </button>
        {/* FIM DO NOVO BOTÃO */}

        {/* BOTÃO "VER PEIs" REINTRODUZIDO AQUI */}
        <button style={estiloBotao} onClick={() => navigate("/ver-peis")}>
          Ver PEIs
        </button>
        {/* FIM DO BOTÃO "VER PEIs" */}

        <button style={estiloBotao} onClick={() => navigate("/criar-pei")}>
          Criar PEI
        </button>
        <button style={estiloBotao} onClick={() => navigate("/ver-alunos")}>
          Ver Alunos
        </button>
        <button
          style={estiloBotao}
          onClick={() => navigate("/cadastrar-aluno")}
        >
          Cadastrar Alunos
        </button>
        <button
          style={estiloBotao}
          onClick={() => navigate("/importar-alunos")}
        >
          Importar Alunos
        </button>
        <button
          style={estiloBotao}
          onClick={() => navigate("/vincular-professores")}
        >
          Vincular Professores a Turmas
        </button>
        <button
          style={estiloBotao}
          onClick={() => navigate("/gestao-prazos-pei")}
        >
          Gerenciar Prazos PEI
        </button>

        {/* --- NOVO BOTÃO: Acompanhamento de Prazos PEI --- */}
        {usuarioLogado &&
          perfisComAcessoAcompanhamento.includes(perfilUsuarioFormatado) && (
            <button
              style={estiloBotao}
              onClick={() => navigate("/acompanhamento-prazos-pei")}
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
