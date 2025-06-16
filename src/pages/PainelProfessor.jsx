import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";
import TrocarEscola from "../components/TrocarEscola"; // Assumindo que este componente existe e está correto
import { verificarPrazosPEI } from "../src/services/peiStatusChecker"; // Importa o serviço criado no Passo 1

export default function PainelProfessor() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [avisosPEI, setAvisosPEI] = useState(null); // Estado para armazenar os resultados do serviço
  const [carregandoAvisos, setCarregandoAvisos] = useState(true); // Estado para controle de carregamento dos avisos

  // Lógica para navegar para uma rota específica
  const irPara = (rota) => navigate(rota);

  /**
   * Função useCallback para carregar os avisos de PEI do professor logado.
   * Utiliza o serviço `verificarPrazosPEI`.
   */
  const carregarAvisos = useCallback(async () => {
    setCarregandoAvisos(true);
    let currentUser = null;
    try {
      const userData = localStorage.getItem("usuarioLogado");
      if (userData) {
        currentUser = JSON.parse(userData);
        setUsuarioLogado(currentUser); // Define o usuário logado no estado
      }
    } catch (e) {
      console.error("Erro ao parsear dados do usuário logado:", e);
      setCarregandoAvisos(false);
      setAvisosPEI({
        erro: "Não foi possível carregar o perfil do usuário logado.",
      });
      return;
    }

    // Se o usuário não está logado ou não é um professor, exibe erro
    if (!currentUser || currentUser.perfil !== "professor") {
      setCarregandoAvisos(false);
      setAvisosPEI({
        erro: "Acesso restrito a professores ou perfil inválido.",
      });
      return;
    }

    // *** CORREÇÃO AQUI: Usando currentUser.id (ID do documento Firestore) ***
    const idProfessor = currentUser.id || null;
    const anoLetivoAtual = new Date().getFullYear();

    if (idProfessor) {
      const status = await verificarPrazosPEI(anoLetivoAtual, idProfessor);
      setAvisosPEI(status);
    } else {
      setAvisosPEI({
        erro: "ID do professor não encontrado no perfil de usuário logado. Verifique os dados do seu perfil.",
      });
    }
    setCarregandoAvisos(false);
  }, []);

  useEffect(() => {
    carregarAvisos();
  }, [carregarAvisos]);

  const exibirResumoAvisos = () => {
    if (carregandoAvisos) {
      return (
        <p style={estilos.mensagemAviso}>Verificando prazos dos PEIs...</p>
      );
    }
    if (!avisosPEI) return null;

    const { statusGeral, totalAlunosAtrasados, mensagem, erro } = avisosPEI;

    if (erro) {
      return (
        <p style={estilos.mensagemErro}>Erro ao carregar avisos: {erro}</p>
      );
    }

    if (mensagem) {
      return <p style={estilos.nenhumPeiEncontrado}>{mensagem}</p>;
    }

    // DEPOIS (com a mensagem alterada)
    if (statusGeral === "Atrasado" && totalAlunosAtrasados > 0) {
      return (
        <div style={estilos.alertaAtraso}>
          <h3>Atenção: PEIs com Pendências!</h3>
          <p>Existem PEIs com pendências de prazo.</p>
          <button
            style={estilos.botaoVerDetalhes}
            onClick={() => navigate(`/meu-acompanhamento-pei`)}
          >
            Ver Detalhes
          </button>
        </div>
      );
    }

    return (
      <p style={estilos.mensagemSucesso}>
        Parabéns! Todos os PEIs de seus alunos estão em dia.
      </p>
    );
  };

  return (
    <div style={estilos.fundo}>
      <div style={estilos.card}>
        <img
          src="/logo-vivencie.png"
          alt="Logo Vivencie PEI"
          style={estilos.logo}
        />
        <h2 style={estilos.titulo}>Painel do Professor</h2>

        {exibirResumoAvisos()}

        <div style={estilos.botoes}>
          <button
            style={estilos.botaoPrimario}
            onClick={() => irPara("/criar-pei")}
          >
            Criar PEI
          </button>
          <button
            style={estilos.botaoPrimario}
            onClick={() => irPara("/ver-peis")}
          >
            Ver PEIs
          </button>
          <button
            style={estilos.botaoPrimario}
            onClick={() => irPara("/ver-avaliacoes")}
          >
            Ver Avaliações Iniciais
          </button>
          <button
            style={estilos.botaoPrimario}
            onClick={() => irPara("/prazos-professor")}
          >
            Ver Prazos Anuais do PEI
          </button>
        </div>

        <div style={estilos.botoesSecundarios}>
          <TrocarEscola style={estilos.botaoSecundario} />
          <BotaoSair style={estilos.botaoSair} />
        </div>
      </div>
    </div>
  );
}

// --- ESTILOS ---
const estilos = {
  fundo: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "20px",
    padding: "40px",
    boxShadow: "0 0 20px rgba(0,0,0,0.2)",
    textAlign: "center",
    width: "100%",
    maxWidth: "500px",
  },
  logo: {
    width: "120px",
    marginBottom: "20px",
  },
  titulo: {
    color: "#003366",
    marginBottom: "30px",
    fontSize: "24px",
    fontWeight: "bold",
  },
  botoes: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    marginBottom: "30px",
  },
  botaoPrimario: {
    backgroundColor: "#00264d",
    color: "#fff",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  },
  botoesSecundarios: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    gap: "15px",
    marginTop: "30px",
    width: "100%",
  },
  botaoSecundario: {
    backgroundColor: "#e0e0e0",
    color: "#555",
    padding: "10px 15px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
    flexGrow: 1,
    maxWidth: "150px",
  },
  botaoSair: {
    backgroundColor: "#e63946",
    color: "#fff",
    padding: "10px 15px",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
    flexGrow: 1,
    maxWidth: "150px",
  },
  alertaAtraso: {
    backgroundColor: "#fff6e6",
    border: "1px solid #ff9900",
    color: "#cc6600",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    textAlign: "left",
    fontWeight: "bold",
  },
  mensagemAviso: {
    backgroundColor: "#e6f2ff",
    border: "1px solid #6699cc",
    color: "#004085",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    textAlign: "center",
    fontWeight: "bold",
  },
  mensagemSucesso: {
    backgroundColor: "#e0f2f7",
    border: "1px solid #2a9d8f",
    color: "#1d7168",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    textAlign: "center",
    fontWeight: "bold",
  },
  mensagemErro: {
    backgroundColor: "#ffe6e6",
    border: "1px solid #cc0000",
    color: "#990000",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    textAlign: "center",
    fontWeight: "bold",
  },
  botaoVerDetalhes: {
    backgroundColor: "#005b96", // Cor azul
    color: "#fff",
    padding: "8px 15px",
    border: "none",
    borderRadius: "5px",
    fontSize: "0.9em",
    cursor: "pointer",
    marginTop: "10px",
    transition: "background-color 0.3s ease",
  },
  nenhumPeiEncontrado: {
    backgroundColor: "#e6f2ff",
    border: "1px solid #00264d",
    color: "#00264d",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    textAlign: "center",
    fontWeight: "bold",
    fontStyle: "italic",
  },
};
