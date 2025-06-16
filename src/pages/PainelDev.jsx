// src/pages/PainelDev.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";
// import { httpsCallable } from "firebase/functions"; // REMOVER: não é mais necessário para onRequest
import { auth, functions } from "../firebase"; // Manter 'auth' e 'functions' (para 'auth.currentUser' e o URL base da função)

export default function PainelDev() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loadingRecalculo, setLoadingRecalculo] = useState(false);

  useEffect(() => {
    const verificarClaims = async () => {
      const user = auth.currentUser;
      if (user) {
        const idTokenResult = await user.getIdTokenResult(true); // força atualização
        console.log("Claims ativas (useEffect):", idTokenResult.claims);
      } else {
        console.log("Nenhum usuário logado (useEffect).");
      }
    };

    const userData = localStorage.getItem("usuarioLogado");
    if (userData) {
      const user = JSON.parse(userData);
      setUsuarioLogado(user);
      console.log("UID do usuário logado (localStorage):", user.uid);
    }

    verificarClaims();
  }, []);

  // ✅ FUNÇÃO handleRecalcularTodosPrazos AGORA PARA onRequest
  const handleRecalcularTodosPrazos = async () => {
    setLoadingRecalculo(true);
    try {
      const user = await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
          unsubscribe(); // Desinscreve após a primeira notificação
          resolve(firebaseUser);
        });
      });

      if (!user) {
        alert("Você precisa estar logado para realizar esta operação.");
        return;
      }

      // ✅ Obter o token de ID mais recente (MANDATÓRIO PARA onRequest)
      const idToken = await user.getIdToken(true);

      console.log(
        "DEBUG FINAL: UID do usuário para a chamada da função:",
        user.uid
      );
      console.log(
        "DEBUG FINAL: Token de ID para a chamada da função:",
        idToken.substring(0, 30) + "..."
      ); // Logar só o começo do token

      // Construir o URL da função onRequest
      // IMPORTANTE: O nome da função no URL é 'recalcularTodosPrazos'
      const functionUrl = `https://southamerica-east1-${auth.app.options.projectId}.cloudfunctions.net/recalcularTodosPrazos`;

      // ✅ Payload da requisição (mesmo formato que httpsCallable enviava)
      const payloadData = { userId: user.uid };

      console.log(
        "Iniciando recalculo de prazos PEI (enviando UID: " + user.uid + ")..."
      );

      // ✅ Usar fetch API para a requisição HTTP POST
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`, // ✅ ENVIANDO O TOKEN AQUI
        },
        body: JSON.stringify({ data: payloadData }), // ✅ ENVIANDO O PAYLOAD AQUI
      });

      // ✅ Tratar a resposta da requisição
      const responseData = await response.json();

      if (!response.ok) {
        // Se o status não for 2xx (ex: 401, 403, 500)
        // A função onRequest retornará JSON com 'error' em caso de falha
        throw new Error(
          responseData.error || "Erro desconhecido na resposta da função."
        );
      }

      console.log("Recalculo concluído:", responseData.message);
      alert(`Recalculo de prazos concluído! Mensagem: ${responseData.message}`);
    } catch (error) {
      console.error(
        "Erro ao recalcular prazos PEI (frontend fetch):",
        error.message,
        error // Log o objeto erro completo
      );
      let errorMessage = "Ocorreu um erro ao recalcular. Verifique o console.";
      if (error.message.includes("Não autorizado: Token Bearer ausente.")) {
        errorMessage =
          "Não autenticado: Seu token não foi enviado corretamente. Tente sair e entrar novamente.";
      } else if (
        error.message.includes("Permissão negada: Requer token de admin.")
      ) {
        errorMessage =
          "Permissão negada: Seu usuário não tem privilégios de administrador.";
      } else if (
        error.message.includes(
          "Requisição inválida: userId é obrigatório no payload."
        )
      ) {
        errorMessage =
          "Erro de comunicação: O ID do usuário não foi enviado corretamente para a função.";
      } else {
        errorMessage = `Erro: ${error.message}`; // Mostra a mensagem do erro capturado
      }
      alert(errorMessage);
    } finally {
      setLoadingRecalculo(false);
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
    backgroundColor: loadingRecalculo ? "#a8dadc" : "#e63946",
    color: "white",
    marginTop: "20px",
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

        <button
          onClick={handleRecalcularTodosPrazos}
          style={estiloBotaoAdmin}
          disabled={loadingRecalculo}
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
