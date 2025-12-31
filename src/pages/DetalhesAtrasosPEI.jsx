// src/pages/DetalhesAtrasosPEI.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom"; // 1. IMPORTE useLocation
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";

// Função auxiliar para formatar datas (mantida)
const formatDate = (date) => {
  if (!date) return "N/A";
  if (date.toDate && typeof date.toDate === "function") {
    date = date.toDate();
  }
  return new Date(date).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export default function DetalhesAtrasosPEI() {
  const { professorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // 2. USE o hook useLocation

  // Os estados agora são preenchidos com os dados da página anterior
  const [professorNome, setProfessorNome] = useState("");
  const [alunosDetalhesPrazos, setAlunosDetalhesPrazos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    // 3. OBTENHA os dados do location.state
    const stateData = location.state;

    // Verifica se os dados foram passados corretamente
    if (!stateData || !stateData.detalhesAtraso) {
      setErrorMessage(
        "Não foi possível carregar os detalhes. Tente voltar e acessar novamente."
      );
      setLoading(false);
      return;
    }

    setProfessorNome(stateData.professorNome);

    // FILTRO IMPORTANTE:
    // A página anterior já envia os professores filtrados por escola para o usuário SEME.
    // No entanto, o 'detalhesAtraso' dentro do professor pode conter alunos de TODAS as escolas.
    // Precisamos filtrar aqui os alunos que pertencem às escolas do usuário SEME.
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (
      usuario &&
      usuario.perfil !== "desenvolvedor" &&
      usuario.escolasVinculadas
    ) {
      const escolasPermitidas = usuario.escolasVinculadas;
      const alunosFiltrados = stateData.detalhesAtraso.filter((aluno) =>
        escolasPermitidas.includes(aluno.escolaId)
      );
      setAlunosDetalhesPrazos(alunosFiltrados);
    } else {
      // Se for dev ou não tiver filtro, mostra tudo
      setAlunosDetalhesPrazos(stateData.detalhesAtraso);
    }

    setLoading(false);
  }, [location.state]); // A dependência agora é o state da navegação

  if (loading) return <Loader />;

  return (
    <div className="detalhes-container" style={estilos.container}>
      <div className="detalhes-card" style={estilos.card}>
        <BotaoVoltar />
        <h1 className="detalhes-title" style={estilos.title}>
          Detalhes dos PEIs - {professorNome}
        </h1>
        <p style={{ marginBottom: "20px" }}>
          Esta tabela mostra o status detalhado dos PEIs de cada aluno sob
          responsabilidade deste professor.
        </p>

        {errorMessage ? (
          <div className="detalhes-mensagem-aviso" style={estilos.errorMessage}>
            {errorMessage}
          </div>
        ) : alunosDetalhesPrazos.length === 0 ? (
          <div
            className="detalhes-mensagem-aviso"
            style={estilos.mensagemAviso}
          >
            Nenhum aluno com atraso encontrado para as escolas vinculadas ao seu
            perfil.
          </div>
        ) : (
          <table className="detalhes-table" style={estilos.table}>
            {/* O restante da sua tabela continua igual */}
            <thead>
              <tr>
                <th style={estilos.th}>Aluno</th>
                <th style={estilos.th}>Status Geral PEI</th>
                <th style={estilos.th}>1ª Revisão</th>
                <th style={estilos.th}>2ª Revisão</th>
                <th style={estilos.th}>Última Atualização PEI</th>
              </tr>
            </thead>
            <tbody>
              {alunosDetalhesPrazos.map((aluno) => (
                <tr key={aluno.id}>
                  <td style={estilos.td}>{aluno.nome}</td>
                  {/* ... resto das células da tabela ... */}
                  <td style={estilos.td}>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: aluno.statusPeiGeral.includes("Atrasado")
                          ? "#dc3545" // Vermelho
                          : aluno.statusPeiGeral.includes("Em dia") ||
                            aluno.statusPeiGeral.includes("Criado") ||
                            aluno.statusPeiGeral.includes("antes do prazo")
                          ? "#28a745" // Verde
                          : "#ffc107", // Amarelo
                      }}
                    >
                      {aluno.statusPeiGeral}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: aluno.statusRevisao1.includes("Atrasado")
                          ? "#dc3545"
                          : aluno.statusRevisao1.includes("Em dia") ||
                            aluno.statusRevisao1.includes("Feita")
                          ? "#28a745"
                          : "#ffc107",
                      }}
                    >
                      {aluno.statusRevisao1}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: aluno.statusRevisao2.includes("Atrasado")
                          ? "#dc3545"
                          : aluno.statusRevisao2.includes("Em dia") ||
                            aluno.statusRevisao2.includes("Feita")
                          ? "#28a745"
                          : "#ffc107",
                      }}
                    >
                      {aluno.statusRevisao2}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    {formatDate(aluno.dataUltimaAtualizacaoPei)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Seus estilos
const estilos = {
  container: {
    background: "#f4f7f6",
    minHeight: "100vh",
    padding: "25px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: "#fff",
    maxWidth: "800px",
    margin: "0 auto",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    color: "#1d3557",
    marginBottom: "30px",
    fontSize: "2em",
  },
  errorMessage: {
    color: "#e63946",
    backgroundColor: "#ffe6e6",
    padding: "15px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "bold",
    margin: "20px auto",
    maxWidth: "800px",
    border: "1px solid #e63946",
  },
  mensagemAviso: {
    color: "#457b9d",
    backgroundColor: "#e0f2f7",
    padding: "15px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "normal",
    margin: "20px auto",
    maxWidth: "800px",
    border: "1px solid #a8dadc",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  },
  th: {
    backgroundColor: "#457b9d",
    color: "white",
    padding: "12px 15px",
    textAlign: "left",
    borderBottom: "2px solid #a8dadc",
  },
  td: {
    padding: "10px 15px",
    borderBottom: "1px solid #f0f0f0",
    backgroundColor: "#ffffff",
  },
};
