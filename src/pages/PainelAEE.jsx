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

  const estiloBotaoHover = {
    backgroundColor: "#457b9d",
  };

  const ID_DE_ALUNO_PARA_TESTE = "Avaliacaointeresses";

  const aplicarEfeitoHover = (e) => {
    e.currentTarget.style.backgroundColor = estiloBotaoHover.backgroundColor;
  };

  const removerEfeitoHover = (e) => {
    e.currentTarget.style.backgroundColor = estiloBotao.backgroundColor;
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
        <h1 style={{ marginBottom: "10px", color: "#1d3557" }}>Painel AEE</h1>
        <p style={{ marginBottom: "20px" }}>
          Bem-vindo, <strong>{usuarioLogado?.nome || "Usuário"}</strong>
          <br />
          Perfil: <strong>{usuarioLogado?.perfil || "Desconhecido"}</strong>
        </p>

        {/* --- Grupo de Botões: Alunos --- */}
        <button
          style={estiloBotao}
          onClick={() => navigate("/cadastrar-aluno")}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Cadastrar Aluno
        </button>

        <button
          style={estiloBotao}
          onClick={() => navigate("/ver-alunos")}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Ver Alunos
        </button>

        <button
          style={estiloBotao}
          onClick={() => navigate("/importar-alunos")}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Importar Alunos
        </button>

        <hr style={{ margin: "20px 0", border: "1px solid #eee" }} />

        {/* --- Grupo de Botões: Avaliações --- */}
        <button
          style={estiloBotao}
          onClick={() => navigate("/avaliacao-inicial")}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Avaliação Inicial
        </button>

        <button
          style={estiloBotao}
          onClick={() => navigate("/anamnese-completa")}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Anamnese Completa
        </button>

        <button
          style={estiloBotao}
          onClick={() => navigate("/anamnese")}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Ver Anamneses
        </button>

        <button
          style={estiloBotao}
          onClick={() => navigate(`/nova-avaliacao/${ID_DE_ALUNO_PARA_TESTE}`)}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Avaliação de Interesses
        </button>

        <button
          style={estiloBotao}
          onClick={() => navigate("/relatorios-aluno")}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Relatórios do Aluno
        </button>

        <hr style={{ margin: "20px 0", border: "1px solid #eee" }} />

        {/* --- Grupo de Botões: Acompanhamento --- */}
        <button
          style={{ ...estiloBotao, backgroundColor: "#1d3557" }} // Cor de destaque
          onClick={() => navigate("/acompanhamento-aee-selecao")}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#1d3557")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#1d3557")
          }
        >
          Acompanhamento AEE
        </button>

        <hr style={{ margin: "20px 0", border: "1px solid #eee" }} />

        {/* --- Grupo de Botões: PEI --- */}
        <button
          style={estiloBotao}
          onClick={() => navigate("/criar-pei")}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Criar PEI
        </button>
        <button
          style={estiloBotao}
          onClick={() => navigate("/ver-peis")}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Ver PEIs
        </button>

        <hr style={{ margin: "20px 0", border: "1px solid #eee" }} />

        {/* --- Grupo de Botões: Gestão --- */}
        <button
          style={estiloBotao}
          onClick={() => navigate("/vincular-professores")}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Vincular Professores a Turmas
        </button>
        <button
          style={estiloBotao}
          onClick={() => navigate("/gestao-prazos-pei")}
          onMouseEnter={aplicarEfeitoHover}
          onMouseLeave={removerEfeitoHover}
        >
          Gerenciar Prazos PEI
        </button>

        {usuarioLogado &&
          perfisComAcessoAcompanhamento.includes(perfilUsuarioFormatado) && (
            <button
              style={estiloBotao}
              onClick={() => navigate("/acompanhamento-prazos-pei")}
              onMouseEnter={aplicarEfeitoHover}
              onMouseLeave={removerEfeitoHover}
            >
              Acompanhamento de Prazos PEI
            </button>
          )}

        <BotaoSair />
      </div>
    </div>
  );
}
