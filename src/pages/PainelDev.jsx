import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";

// Importações do Firebase para chamar a Cloud Function
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth"; // Para verificar a autenticação e obter o token do usuário

export default function PainelDev() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loadingRecalculo, setLoadingRecalculo] = useState(false); // Novo estado para controlar o loading do backfill

  useEffect(() => {
    const userData = localStorage.getItem("usuarioLogado");
    if (userData) {
      const user = JSON.parse(userData);
      setUsuarioLogado(user);
      console.log("UID do usuário logado:", user.uid);
    }
  }, []);

  // Inicializa o serviço de funções do Firebase
  const functions = getFunctions();
  const auth = getAuth(); // Inicializa o serviço de autenticação

  // Função para chamar a Cloud Function de recalculo
  const handleRecalcularTodosPrazos = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("Você precisa estar logado para realizar esta operação.");
      return;
    }

    setLoadingRecalculo(true); // Ativa o estado de loading
    try {
      // Força a atualização do token de ID do usuário para garantir que os custom claims (como 'admin') sejam enviados
      await user.getIdTokenResult(true);

      // Cria a função callable
      const recalcularPrazosCallable = httpsCallable(
        functions,
        "recalcularTodosPrazos"
      );

      console.log("Iniciando recalculo de prazos PEI...");
      const result = await recalcularPrazosCallable();
      console.log("Recalculo concluído:", result.data.message);
      alert(
        `Recalculo de prazos PEI iniciado/concluído! Mensagem: ${result.data.message}. Verifique os logs do Firebase Functions para detalhes.`
      );
    } catch (error) {
      console.error(
        "Erro ao recalcular prazos PEI:",
        error.code,
        error.message
      );
      let errorMessage = "Erro desconhecido ao recalcular.";
      if (error.code === "permission-denied") {
        errorMessage =
          "Permissão negada: Você não tem autorização para realizar esta operação. Verifique se seu usuário tem privilégios de administrador.";
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      alert(errorMessage);
    } finally {
      setLoadingRecalculo(false); // Desativa o estado de loading
    }
  };

  const botoes = [
    { label: "Cadastrar Aluno", rota: "/cadastrar-aluno" },
    { label: "Cadastrar Usuário", rota: "/cadastro-usuario" },
    { label: "Importar Alunos", rota: "/importar-alunos" },
    { label: "Ver Alunos", rota: "/ver-alunos" },
    { label: "Ver PEIs", rota: "/ver-peis" },
    { label: "Criar PEI", rota: "/criar-pei" },
    { label: "Avaliação Inicial", rota: "/avaliacao-inicial" },
    { label: "Anamnese", rota: "/anamnese-completa" },
    { label: "Acompanhamento Escolar", rota: "/acompanhamento" },
    { label: "Acompanhar Prazos PEI", rota: "/acompanhamento-prazos-pei" },
    { label: "Gerenciar Prazos PEI", rota: "/gestao-prazos-pei" },
    { label: "Vincular Turmas a Professores", rota: "/vincular-professores" },
    { label: "Vincular Escolas a Professores", rota: "/vincular-escolas" },
  ];

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

  const estiloBotaoAdmin = {
    ...estiloBotao,
    backgroundColor: loadingRecalculo ? "#a8dadc" : "#e63946", // Cor diferente para admin, e cinza quando carregando
    color: "white",
    marginTop: "20px", // Um pouco de espaço acima
    opacity: loadingRecalculo ? 0.7 : 1,
    cursor: loadingRecalculo ? "not-allowed" : "pointer",
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
          Painel da Desenvolvedora
        </h1>
        <p style={{ marginBottom: "20px" }}>
          Bem-vindo, <strong>{usuarioLogado?.nome || "Usuário"}</strong>
          <br />
          Perfil: <strong>Desenvolvedora</strong>
        </p>

        {botoes.map((botao, i) => (
          <button
            key={i}
            onClick={() => navigate(botao.rota)}
            style={estiloBotao}
          >
            {botao.label}
          </button>
        ))}

        {/* NOVO BOTÃO PARA RECALCULO DE PRAZOS PEI (BACKFILL) */}
        <button
          onClick={handleRecalcularTodosPrazos}
          style={estiloBotaoAdmin}
          disabled={loadingRecalculo} // Desabilita o botão enquanto o recalculo está em andamento
        >
          {loadingRecalculo
            ? "Recalculando Prazos..."
            : "Recalcular Todos os Prazos PEI (Admin)"}
        </button>

        <BotaoSair />
      </div>
    </div>
  );
}
