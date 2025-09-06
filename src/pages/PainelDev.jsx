import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

export default function PainelDev() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loadingRecalculo, setLoadingRecalculo] = useState(false);
  const navigate = useNavigate();

  // Carrega o CSS do Toastify programaticamente para resolver o erro de compilação
  useEffect(() => {
    if (!document.querySelector('link[href*="react-toastify"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/react-toastify@9.1.1/dist/ReactToastify.min.css";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    // Simulação do usuário logado para o ambiente de desenvolvimento
    const userData = {
      nome: "Desenvolvedor(a)",
      uid: "dev123",
      perfil: "Desenvolvedora",
    };
    setUsuarioLogado(userData);
    console.log("UID do usuário logado:", userData.uid);
  }, []);

  // Agora a função de recalcular é assíncrona
  const handleRecalcularTodosPrazos = async () => {
    setLoadingRecalculo(true);
    toast.info("Iniciando recalculo de prazos...", {
      autoClose: 2000,
    });

    try {
      // Simulação de uma chamada de API real.
      // Substitua esta lógica pela chamada de API real do seu backend
      await new Promise((resolve) => setTimeout(resolve, 3000));

      toast.success("Recalculo de prazos concluído com sucesso!", {
        autoClose: 2000,
      });
    } catch (error) {
      toast.error("Ocorreu um erro no recalculo. Tente novamente.");
      console.error("Erro no recalculo de prazos:", error);
    } finally {
      setLoadingRecalculo(false);
    }
  };

  const handleNavigate = (rota) => {
    console.log(`Navegando de verdade para a rota ${rota}`);
    toast.info(`Navegando para ${rota}`, { autoClose: 2000 });
    navigate(rota);
  };

  const botoes = [
    { label: "Avaliação Inicial", rota: "/avaliacao-inicial" },
    {
      label: "Avaliação de Interesses",
      rota: "/nova-avaliacao/Avaliacaointeresses",
    },
    { label: "Criar PEI", rota: "/criar-pei" },
    { label: "Anamnese", rota: "/anamnese-completa" },
    { label: "Ver Anamnese", rota: "/anamnese" },
    { label: "Gerenciar Prazos PEI", rota: "/gestao-prazos-pei" },
    { label: "Acompanhar Prazos PEI", rota: "/acompanhamento-prazos-pei" },
    { label: "Acompanhamento Escolar", rota: "/acompanhamento" },
    { label: "Ver Alunos", rota: "/ver-alunos" },
    { label: "Importar Alunos", rota: "/importar-alunos" },
    { label: "Cadastrar Usuário", rota: "/cadastro-usuario" },
    { label: "Vincular Turmas a Professores", rota: "/vincular-professores" },
    { label: "Vincular Escolas a Professores", rota: "/vincular-escolas" },
    { label: "Cadastrar Turma", rota: "/cadastro-turmas" },
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

  const BotaoSair = () => {
    const handleSair = async () => {
      try {
        const auth = getAuth();
        await signOut(auth);
        toast.success("Você saiu da sua conta com sucesso!");
        navigate("/login"); // Redireciona para a página de login
      } catch (error) {
        toast.error("Erro ao sair. Tente novamente.");
        console.error("Erro ao fazer logout:", error);
      }
    };
    return (
      <button
        onClick={handleSair}
        style={{
          ...estiloBotao,
          backgroundColor: "#a8dadc",
          color: "#1d3557",
          marginTop: "20px",
        }}
      >
        Sair
      </button>
    );
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
      <ToastContainer />
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
          Perfil: <strong>{usuarioLogado?.perfil || "Desconhecido"}</strong>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {botoes.map((botao, i) => (
            <button
              key={i}
              onClick={() => handleNavigate(botao.rota)}
              style={estiloBotao}
            >
              {botao.label}
            </button>
          ))}
        </div>

        <hr style={{ margin: "20px 0", border: "1px solid #e0e0e0" }} />

        <div style={{ textAlign: "left" }}>
          <h3 style={{ color: "#1d3557", marginBottom: "10px" }}>
            Ferramentas de Manutenção
          </h3>
        </div>

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
