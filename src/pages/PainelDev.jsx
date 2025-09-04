import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom"; // Importe o useNavigate

export default function PainelDev() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loadingRecalculo, setLoadingRecalculo] = useState(false);

  // Use o hook useNavigate para a navegação real
  const navigate = useNavigate();

  // Simulação de useEffect para ambiente de arquivo único
  useEffect(() => {
    const userData = {
      nome: "Desenvolvedor(a)",
      uid: "dev123",
      perfil: "Desenvolvedora",
    };
    setUsuarioLogado(userData);
    console.log("UID do usuário logado:", userData.uid);
  }, []);

  const handleRecalcularTodosPrazos = () => {
    setLoadingRecalculo(true);
    toast.info("Simulação: Recalculando todos os prazos PEI...", {
      autoClose: 2000,
    });
    setTimeout(() => {
      setLoadingRecalculo(false);
      toast.success("Simulação: Recalculo de prazos concluído!", {
        autoClose: 2000,
      });
    }, 2000);
  };

  // Agora a função de navegação usa o useNavigate
  const handleNavigate = (rota) => {
    console.log(`Navegando de verdade para a rota ${rota}`);
    toast.info(`Navegando para ${rota}`, { autoClose: 2000 });
    navigate(rota); // <--- A MUDANÇA ESTÁ AQUI
  };

  const botoes = [
    { label: "Avaliação Inicial", rota: "/avaliacao-inicial" },
    {
      label: "Avaliação de Interesses",
      rota: "/nova-avaliacao/Avaliacaointeresses",
    },
    { label: "Criar PEI", rota: "/criar-pei" },
    { label: "Anamnese", rota: "/anamnese-completa" },
    { label: "Ver Anamnese", rota: "/anamnese" }, // Este é o botão que você quer que funcione
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
    const handleSair = () => {
      toast.info("Simulação: Você saiu da sua conta.", { autoClose: 2000 });
      // Lógica de logout real aqui
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

  // Componentes simulados que não serão mais usados
  const BackupDados = () => (
    <div
      style={{
        padding: "10px",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        backgroundColor: "#f0f0f0",
      }}
    >
      Simulação: Componente de Backup de Dados
    </div>
  );
  const CorrigirTurmasEmMassa = () => (
    <div
      style={{
        padding: "10px",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        backgroundColor: "#f0f0f0",
      }}
    >
      Simulação: Componente de Correção de Turmas
    </div>
  );

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
        <>
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

          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
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
            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <BackupDados />
              <CorrigirTurmasEmMassa />
            </div>
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
        </>
      </div>
    </div>
  );
}
