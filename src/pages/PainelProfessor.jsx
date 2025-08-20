import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";
import TrocarEscola from "../components/TrocarEscola";
import { verificarPrazosPEI } from "../src/services/peiStatusChecker";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styled from "styled-components";

// --- NOVOS COMPONENTES ESTILIZADOS PARA OS AVISOS ---

const AvisoCard = styled.div`
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 25px;
  text-align: left;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  font-family: "Segoe UI", sans-serif;

  h3 {
    margin: 0 0 10px 0;
    font-size: 1.2em;
  }
  p {
    margin: 0;
    font-size: 1em;
  }
`;

const AvisoAlerta = styled(AvisoCard)`
  background-color: #fff4e5;
  border: 1px solid #ffd1a8;
  color: #a0522d;
`;

const AvisoSucesso = styled(AvisoCard)`
  background-color: #e6f2f0;
  border: 1px solid #b2d8d1;
  color: #1d7168;
`;

const AvisoErro = styled(AvisoCard)`
  background-color: #ffeaea;
  border: 1px solid #ffb2b2;
  color: #b71c1c;
`;

const AvisoInfo = styled(AvisoCard)`
  background-color: #e8f4fa;
  border: 1px solid #b8e0f2;
  color: #004085;
`;

const BotaoDetalhes = styled.button`
  background-color: #005b96;
  color: #fff;
  padding: 8px 15px;
  border: none;
  border-radius: 6px;
  font-size: 0.9em;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #004a7a;
  }
`;

// --- FIM DOS NOVOS COMPONENTES ESTILIZADOS ---

export default function PainelProfessor() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [avisosPEI, setAvisosPEI] = useState(null);
  const [carregandoAvisos, setCarregandoAvisos] = useState(true);

  const irPara = (rota) => navigate(rota);

  const carregarAvisos = useCallback(async () => {
    setCarregandoAvisos(true);
    let currentUser = null;
    try {
      const userData = localStorage.getItem("usuarioLogado");
      if (userData) {
        currentUser = JSON.parse(userData);
        setUsuarioLogado(currentUser);
      }
    } catch (e) {
      console.error("Erro ao parsear dados do usuário logado:", e);
      setCarregandoAvisos(false);
      setAvisosPEI({
        erro: "Não foi possível carregar o perfil do usuário logado.",
      });
      toast.error("Erro ao carregar perfil do usuário.");
      return;
    }

    if (!currentUser || currentUser.perfil !== "professor") {
      setCarregandoAvisos(false);
      setAvisosPEI({
        erro: "Acesso restrito a professores ou perfil inválido.",
      });
      toast.warn("Acesso restrito. Faça login como professor.");
      return;
    }

    const idProfessor = currentUser.id || null;
    const anoLetivoAtual = new Date().getFullYear();

    if (idProfessor) {
      try {
        const status = await verificarPrazosPEI(anoLetivoAtual, idProfessor);
        setAvisosPEI(status);
      } catch (error) {
        console.error("Erro ao verificar prazos PEI:", error);
        setAvisosPEI({ erro: "Falha ao verificar prazos dos PEIs." });
        toast.error("Erro ao verificar prazos dos PEIs.");
      }
    } else {
      setAvisosPEI({
        erro: "ID do professor não encontrado no perfil de usuário logado. Verifique os dados do seu perfil.",
      });
      toast.error("ID do professor não encontrada.");
    }
    setCarregandoAvisos(false);
  }, []);

  useEffect(() => {
    carregarAvisos();
  }, [carregarAvisos]);

  const exibirResumoAvisos = () => {
    if (carregandoAvisos) {
      return (
        <AvisoInfo>
          <p>Verificando prazos dos PEIs...</p>
        </AvisoInfo>
      );
    }
    if (!avisosPEI) return null;

    const { statusGeral, totalAlunosAtrasados, mensagem, erro } = avisosPEI;

    if (erro) {
      return (
        <AvisoErro>
          <p>Erro ao carregar avisos: {erro}</p>
        </AvisoErro>
      );
    }

    if (mensagem) {
      return (
        <AvisoInfo>
          <p>{mensagem}</p>
        </AvisoInfo>
      );
    }

    if (statusGeral === "Atrasado" && totalAlunosAtrasados > 0) {
      return (
        <AvisoAlerta>
          <h3>Atenção: PEIs com Pendências!</h3>
          <BotaoDetalhes onClick={() => navigate(`/meu-acompanhamento-pei`)}>
            Ver Detalhes
          </BotaoDetalhes>
        </AvisoAlerta>
      );
    }

    return (
      <AvisoSucesso>
        <p>Parabéns! Todos os PEIs de seus alunos estão em dia.</p>
      </AvisoSucesso>
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

        {usuarioLogado && (
          <h3 style={estilos.nomeProfessor}>{usuarioLogado.nome}</h3>
        )}

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
            onClick={() => irPara("/ver-avaliacoes")}
          >
            Ver Avaliações Iniciais
          </button>
          <button
            style={estilos.botaoPrimario}
            onClick={() => irPara("/visualizar-interesses")}
          >
            Ver Avaliações de Interesses
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
      <ToastContainer position="bottom-right" autoClose={3000} />
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
    marginBottom: "10px",
    fontSize: "24px",
    fontWeight: "bold",
  },
  nomeProfessor: {
    color: "#457b9d",
    fontSize: "18px",
    marginBottom: "30px",
    fontWeight: "600",
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
};
