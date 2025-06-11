// src/pages/DetalhesAtrasosPEI.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";
// ... (outros imports)
import { isAuthorized } from "../utils/authUtils"; // <-- Verifique esta linha
// ...
// Função auxiliar para formatar datas para exibição
const formatDate = (date) => {
  if (!date) return "N/A";
  return date.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/**
 * Componente que exibe os detalhes do acompanhamento de PEI para um professor específico.
 * Carrega todos os alunos vinculados às turmas do professor e verifica o status de PEI de cada um.
 * Os dados exibidos são filtrados pela(s) escola(s) vinculada(s) ao usuário logado, exceto para desenvolvedores.
 */
export default function DetalhesAtrasosPEI() {
  const { professorId } = useParams(); // Pega o professorId da URL
  const navigate = useNavigate();
  const [professor, setProfessor] = useState(null); // Para armazenar os dados do professor
  const [alunosAtrasadosDetalhes, setAlunosAtrasadosDetalhes] = useState([]); // Detalhes dos alunos atrasados
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null); // Erros críticos na busca/processamento
  const [noDataMessage, setNoDataMessage] = useState(null); // Mensagem quando não há dados para exibir após filtros

  // Usa useMemo para parsear os dados do usuário logado e extrair os IDs das escolas vinculadas.
  const usuario = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuarioLogado"));
      const escolasVinculadas = (user?.escolas && typeof user.escolas === 'object') ? Object.keys(user.escolas) : [];
      return { ...user, escolasVinculadas };
    } catch (e) {
      console.error("Erro ao parsear dados do usuário logado:", e);
      return null;
    }
  }, []);

  // Efeito para carregar os detalhes quando o componente é montado ou professorId/usuario muda
  useEffect(() => {
    // 1. Verificação de Permissão do Usuário
    if (!usuario || !isAuthorized(usuario.perfil)) {
      alert("Você não tem permissão para acessar esta página.");
      navigate("/");
      return;
    }
    // Para perfis que NÃO SÃO desenvolvedor, se não têm escolas, mostra erro e sai.
    if (usuario.perfil !== "desenvolvedor" && (!usuario.escolasVinculadas || usuario.escolasVinculadas.length === 0)) {
        setFetchError("Seu perfil não está vinculado a nenhuma escola. Por favor, entre em contato com o administrador para vincular escolas ao seu perfil.");
        setLoading(false);
        return;
    }

    // 2. Valida se o professorId foi fornecido na URL
    if (!professorId) {
      setFetchError("ID do professor não fornecido na URL.");
      setLoading(false);
      return;
    }

    const carregarDetalhesAtrasos = async () => {
      setLoading(true);
      setFetchError(null); // Limpa erros anteriores
      setNoDataMessage(null); // Limpa mensagens de "sem dados"

      try {
        const anoAtual = new Date().getFullYear();
        const hoje = new Date();

        // Determina o filtro de escola para as queries (escolas vinculadas ao usuário logado)
        // Se o usuário é desenvolvedor, o filtro 'escolaId' não será adicionado às queries (array vazio).
        const escolaIdsParaQuery = (usuario.perfil === "desenvolvedor" || !usuario.escolasVinculadas || usuario.escolasVinculadas.length === 0) 
            ? [] 
            : usuario.escolasVinculadas.slice(0, 10); // Limita a 10 para o operador 'in'

        // 3. Buscar dados do professor (para pegar nome e turmas vinculadas a ele)
        const profDocRef = doc(db, "usuarios", professorId);
        const profDocSnap = await getDoc(profDocRef);

        if (!profDocSnap.exists()) {
          setFetchError("Professor não encontrado na base de dados.");
          setLoading(false);
          return;
        }
        const profData = { id: profDocSnap.id, ...profDocSnap.data() };
        setProfessor(profData); // Atualiza o estado com os dados do professor

        // Extrai as turmas do professor (garantindo que prof.turmas é um objeto)
        let turmasDoProfessor = (profData.turmas && typeof profData.turmas === 'object') ? Object.keys(profData.turmas) : [];

        // Se o professor não tiver turmas vinculadas, exibe mensagem de "sem dados"
        if (turmasDoProfessor.length === 0) {
          setAlunosAtrasadosDetalhes([]); 
          setLoading(false);
          setNoDataMessage("Nenhuma turma vinculada a este professor. Não é possível verificar o status dos alunos.");
          return;
        }

        // --- TRATAMENTO DO LIMITE DE 10 NO OPERADOR 'in' DO FIRESTORE PARA TURMAS ---
        let turmasParaQuery = [...turmasDoProfessor]; 
        if (turmasParaQuery.length > 10) {
          console.warn(`[DetalhesAtrasosPEI] Professor ${profData.nome} tem ${turmasParaQuery.length} turmas. A query 'in' de alunos será limitada às primeiras 10 turmas.`);
          turmasParaQuery = turmasParaQuery.slice(0, 10);
        }

        // 4. Checagem de arrays vazios ANTES de construir as queries com 'in'
        if (turmasParaQuery.length === 0 || escolaIdsParaQuery.length === 0) {
            setLoading(false);
            setNoDataMessage("Erro na consulta: Nenhuma turma ou escola válida definida para filtrar alunos. Verifique os dados do professor ou as vinculações de escola do seu perfil.");
            return;
        }

        // 5. Buscar alunos vinculados às turmas do professor E à(s) escola(s) do usuário logado
        let qAlunos = query(collection(db, "alunos"));
        qAlunos = query(qAlunos, where("turma", "in", turmasParaQuery)); // Busca alunos nas turmas do professor
        if (escolaIdsParaQuery.length > 0) { // Adiciona filtro por escola APENAS SE houver escolaIds para filtrar
            qAlunos = query(qAlunos, where("escolaId", "in", escolaIdsParaQuery));
        }
        
        const alunosSnap = await getDocs(qAlunos);
        const alunosList = alunosSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Se não encontrou alunos com os filtros aplicados, exibe mensagem de "sem dados"
        if (alunosList.length === 0) {
          setAlunosAtrasadosDetalhes([]);
          setLoading(false);
          setNoDataMessage(`Nenhum aluno encontrado para as turmas: ${turmasParaQuery.join(', ')} para sua(s) escola(s) vinculada(s).`);
          return;
        }

        // 6. Buscar prazos anuais do PEI (necessário para a lógica de status de cada aluno)
        const qPrazos = query(
          collection(db, "prazosPEIAnuais"),
          where("anoLetivo", "==", anoAtual),
          limit(1)
        );
        const prazosSnap = await getDocs(qPrazos);
        const prazoAnualDoc = prazosSnap.empty
          ? null
          : prazosSnap.docs[0].data();

        if (!prazoAnualDoc) {
          setFetchError(
            `Não foi encontrada uma configuração de prazos anual para o PEI do ano de ${anoAtual}. Por favor, verifique a Gestão de Prazos.`
          );
          setLoading(false);
          return;
        }
        // Converte Timestamps para objetos Date JavaScript
        const dataLimiteCriacaoPEI = prazoAnualDoc.dataLimiteCriacaoPEI?.toDate() || null;
        const dataLimiteRevisao1Sem = prazoAnualDoc.dataLimiteRevisao1Sem?.toDate() || null;
        const dataLimiteRevisao2Sem = prazoAnualDoc.dataLimiteRevisao2Sem?.toDate() || null;

        // 7. Para cada aluno encontrado, verificar o status detalhado do PEI e das revisões
        const alunosComStatus = await Promise.all(
          alunosList.map(async (aluno) => {
            let statusPeiGeral = "Não iniciado";
            let statusRevisao1 = "N/A";
            let statusRevisao2 = "N/A";
            let dataUltimaAtualizacaoPei = null;

            // Prepara a query para o PEI do aluno, condicionalmente incluindo filtro de escola
            let qPei = query(collection(db, "peis"));
            qPei = query(qPei, where("alunoId", "==", aluno.id));
            qPei = query(qPei, where("anoLetivo", "==", anoAtual));
            if (escolaIdsParaQuery.length > 0) { // Adiciona filtro por escola APENAS SE houver escolaIds para filtrar
                qPei = query(qPei, where("escolaId", "in", escolaIdsParaQuery));
            }
            qPei = query(qPei,
                orderBy("criadoEm", "desc"),
                limit(1)
            );
            const peiSnap = await getDocs(qPei);

            if (peiSnap.empty) {
              if (dataLimiteCriacaoPEI && hoje >= dataLimiteCriacaoPEI) {
                statusPeiGeral = "Atrasado - Sem PEI";
              } else {
                statusPeiGeral = "Aguardando Criação";
              }
              if (dataLimiteRevisao1Sem && hoje >= dataLimiteRevisao1Sem) statusRevisao1 = "Atrasado";
              if (dataLimiteRevisao2Sem && hoje >= dataLimiteRevisao2Sem) statusRevisao2 = "Atrasado";
            } else {
              const peiData = peiSnap.docs[0].data();
              const dataCriacaoPei = peiData.criadoEm?.toDate() || null;
              dataUltimaAtualizacaoPei = peiData.dataUltimaRevisao?.toDate() || dataCriacaoPei; 

              if (dataLimiteCriacaoPEI && hoje >= dataLimiteCriacaoPEI) {
                if (dataCriacaoPei && dataCriacaoPei <= dataLimiteCriacaoPEI) {
                  statusPeiGeral = "Criado no Prazo";
                } else if (dataCriacaoPei && dataCriacaoPei > dataLimiteCriacaoPEI) {
                  statusPeiGeral = "Criado (Atrasado)";
                } else {
                  statusPeiGeral = "Atrasado - Sem PEI"; 
                }
              } else {
                statusPeiGeral = "Aguardando Criação";
                if (dataCriacaoPei) statusPeiGeral = "Criado (antes do prazo final)";
              }

              if (dataLimiteRevisao1Sem) {
                if (hoje >= dataLimiteRevisao1Sem) {
                  if (dataUltimaAtualizacaoPei && dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem) {
                    statusRevisao1 = "Em dia (Feita)";
                  } else {
                    statusRevisao1 = "Atrasado";
                  }
                } else {
                  statusRevisao1 = "Aguardando";
                  if (dataUltimaAtualizacaoPei && dataUltimaAtualizacaoPei >= dataLimiteCriacaoPEI) { 
                      statusRevisao1 = "Feita (Aguardando prazo)";
                  }
                }
              }

              if (dataLimiteRevisao2Sem) {
                if (hoje >= dataLimiteRevisao2Sem) {
                  if (dataUltimaAtualizacaoPei && dataUltimaAtualizacaoPei >= dataLimiteRevisao2Sem) {
                    statusRevisao2 = "Em dia (Feita)";
                  } else {
                    statusRevisao2 = "Atrasado";
                  }
                } else {
                  statusRevisao2 = "Aguardando";
                   if (dataUltimaAtualizacaoPei && dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem) { 
                      statusRevisao2 = "Feita (Aguardando prazo)";
                  }
                }
              }
            }

            return {
              ...aluno,
              statusPeiGeral,
              statusRevisao1,
              statusRevisao2,
              dataUltimaAtualizacaoPei,
            };
          })
        );
        setAlunosAtrasadosDetalhes(alunosComStatus);

      } catch (err) {
        console.error("Erro no carregamento dos detalhes do PEI:", err);
        setFetchError("Ocorreu um erro ao carregar os detalhes do professor: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    carregarDetalhesAtrasos();
  }, [professorId, usuario, navigate]); // professorId e usuario como dependências


  if (loading) return <Loader />;
  if (fetchError) // Exibe erros de busca críticos
    return <div style={estilos.errorMessage}>{fetchError}</div>;

  // Verifica se há alunos para exibir na tabela, e se não é uma mensagem de texto (erro/aviso inicial)
  const temAlunosParaExibir = alunosAtrasadosDetalhes.length > 0 && typeof alunosAtrasadosDetalhes[0] === 'object';

  return (
    <div className="detalhes-container" style={estilos.container}>
      <div className="detalhes-card" style={estilos.card}>
        <BotaoVoltar />
        <h1 className="detalhes-title" style={estilos.title}>
          Detalhes dos PEIs com Pendências -{" "}
          {professor ? professor.nome : "Carregando..."}
        </h1>

        <p style={{ marginBottom: "20px" }}>
          Esta tabela mostra o status detalhado dos PEIs de cada aluno sob responsabilidade deste professor,
          com base nos prazos de criação e revisões.
        </p>

        {/* Condição para exibir a mensagem de "sem dados" ou a tabela */}
        {noDataMessage ? (
          <div className="detalhes-mensagem-aviso" style={estilos.mensagemAviso}>{noDataMessage}</div>
        ) : !temAlunosParaExibir && !loading ? (
          // Este é o caso em que não há erro crítico nem noDataMessage explícito, mas a lista de alunos está vazia
          <div className="detalhes-mensagem-aviso" style={estilos.mensagemAviso}>
            Nenhum aluno com PEI encontrado para este professor, suas turmas ou escolas vinculadas.
            Verifique as atribuições e status dos PEIs.
          </div>
        ) : (
          <table className="detalhes-table" style={estilos.table}>
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
              {alunosAtrasadosDetalhes.map((aluno) => (
                <tr key={aluno.id}>
                  <td style={estilos.td}>{aluno.nome}</td>
                  <td style={estilos.td}>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: aluno.statusPeiGeral.includes("Atrasado")
                          ? "#dc3545" // Vermelho
                          : aluno.statusPeiGeral.includes("Em dia") ||
                            aluno.statusPeiGeral.includes("Criado")
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
  mensagem: { // Este estilo não está mais sendo usado diretamente por uma <p> com mensagem fixa
    textAlign: "center",
    color: "#555",
    fontStyle: "italic",
    marginBottom: "20px",
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
  },
  detalhesList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  detalhesListItem: {
    color: "#dc3545",
    fontSize: "1em",
    marginBottom: "8px",
    backgroundColor: "#fff0f0",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ffcccc",
  },
  subtitulo: {
    color: "#1d3557",
    fontSize: "1.3em",
    marginBottom: "15px",
    fontWeight: "bold",
  },
};

export default DetalhesAtrasosPEI;