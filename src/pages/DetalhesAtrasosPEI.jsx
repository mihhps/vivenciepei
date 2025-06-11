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
import { isAuthorized } from "../utils/authUtils";
// import styles from './DetalhesAtrasosPEI.module.css'; // <--- Importar seu arquivo de módulo CSS aqui

// --- Funções Auxiliares ---

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
 * Determina o status do PEI e revisões de um aluno.
 * @param {object} peiData - Dados do PEI do aluno (se existir).
 * @param {object} prazos - Objeto com as datas limite anuais.
 * @param {Date} hoje - Data atual para comparação.
 * @returns {object} Um objeto com os status detalhados e data da última atualização.
 */
const getPeiStatusDetails = (peiData, prazos, hoje) => {
  let statusPeiGeral = "Não iniciado";
  let statusRevisao1 = "N/A";
  let statusRevisao2 = "N/A";
  let dataUltimaAtualizacaoPei = null;

  const { dataLimiteCriacaoPEI, dataLimiteRevisao1Sem, dataLimiteRevisao2Sem } =
    prazos;

  if (!peiData) {
    // PEI não encontrado
    if (dataLimiteCriacaoPEI && hoje >= dataLimiteCriacaoPEI) {
      statusPeiGeral = "Atrasado - Sem PEI";
    } else {
      statusPeiGeral = "Aguardando Criação";
    }
    if (dataLimiteRevisao1Sem && hoje >= dataLimiteRevisao1Sem)
      statusRevisao1 = "Atrasado";
    if (dataLimiteRevisao2Sem && hoje >= dataLimiteRevisao2Sem)
      statusRevisao2 = "Atrasado";
  } else {
    // PEI encontrado
    const dataCriacaoPei = peiData.criadoEm?.toDate() || null;
    dataUltimaAtualizacaoPei =
      peiData.dataUltimaRevisao?.toDate() || dataCriacaoPei;

    // Status Geral do PEI
    if (dataLimiteCriacaoPEI) {
      if (hoje >= dataLimiteCriacaoPEI) {
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
    } else {
      // Se não há data limite de criação configurada
      statusPeiGeral = dataCriacaoPei
        ? "Criado (Prazo não definido)"
        : "Não iniciado (Prazo não definido)";
    }

    // Status 1ª Revisão
    if (dataLimiteRevisao1Sem) {
      if (hoje >= dataLimiteRevisao1Sem) {
        if (
          dataUltimaAtualizacaoPei &&
          dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem
        ) {
          statusRevisao1 = "Em dia (Feita)";
        } else {
          statusRevisao1 = "Atrasado";
        }
      } else {
        statusRevisao1 = "Aguardando";
        if (
          dataUltimaAtualizacaoPei &&
          dataUltimaAtualizacaoPei >= dataLimiteCriacaoPEI
        ) {
          statusRevisao1 = "Feita (Aguardando prazo)";
        }
      }
    }

    // Status 2ª Revisão
    if (dataLimiteRevisao2Sem) {
      if (hoje >= dataLimiteRevisao2Sem) {
        if (
          dataUltimaAtualizacaoPei &&
          dataUltimaAtualizacaoPei >= dataLimiteRevisao2Sem
        ) {
          statusRevisao2 = "Em dia (Feita)";
        } else {
          statusRevisao2 = "Atrasado";
        }
      } else {
        statusRevisao2 = "Aguardando";
        if (
          dataUltimaAtualizacaoPei &&
          dataUltimaAtualizacaoPei >= dataLimiteRevisao1Sem
        ) {
          statusRevisao2 = "Feita (Aguardando prazo)";
        }
      }
    }
  }

  return {
    statusPeiGeral,
    statusRevisao1,
    statusRevisao2,
    dataUltimaAtualizacaoPei,
  };
};

// --- Componente Principal ---

export default function DetalhesAtrasosPEI() {
  const { professorId } = useParams();
  const navigate = useNavigate();
  const [professor, setProfessor] = useState(null);
  const [alunosAtrasadosDetalhes, setAlunosAtrasadosDetalhes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null); // Unificado para erros e mensagens de "sem dados"

  // Simula a obtenção do usuário de um AuthContext ou similar
  const getUsuarioLogado = useCallback(() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuarioLogado"));
      // Garante que escolasVinculadas seja um array de strings
      const escolasVinculadas =
        user?.escolas && typeof user.escolas === "object"
          ? Object.keys(user.escolas).filter(
              (key) =>
                typeof user.escolas[key] === "string" ||
                typeof user.escolas[key] === "boolean"
            )
          : [];
      return { ...user, escolasVinculadas };
    } catch (e) {
      console.error("Erro ao parsear dados do usuário logado:", e);
      return null;
    }
  }, []);

  const usuario = useMemo(() => getUsuarioLogado(), [getUsuarioLogado]);

  useEffect(() => {
    // 1. Verificação de Permissão e Dados do Usuário
    if (!usuario || !isAuthorized(usuario.perfil)) {
      setErrorMessage("Você não tem permissão para acessar esta página.");
      setLoading(false);
      // Opcional: navegar após um pequeno delay ou exibir um modal
      setTimeout(() => navigate("/"), 3000);
      return;
    }

    // Para perfis que NÃO SÃO desenvolvedor, se não têm escolas, mostra erro e sai.
    if (
      usuario.perfil !== "desenvolvedor" &&
      (!usuario.escolasVinculadas || usuario.escolasVinculadas.length === 0)
    ) {
      setErrorMessage(
        "Seu perfil não está vinculado a nenhuma escola. Por favor, entre em contato com o administrador para vincular escolas ao seu perfil."
      );
      setLoading(false);
      return;
    }

    // 2. Valida se o professorId foi fornecido na URL
    if (!professorId) {
      setErrorMessage("ID do professor não fornecido na URL.");
      setLoading(false);
      return;
    }

    const carregarDetalhesAtrasos = async () => {
      setLoading(true);
      setErrorMessage(null); // Limpa mensagens anteriores

      try {
        const anoAtual = new Date().getFullYear();
        const hoje = new Date();

        // Determina o filtro de escola para as queries (escolas vinculadas ao usuário logado)
        const escolaIdsParaQuery =
          usuario.perfil === "desenvolvedor" ||
          !usuario.escolasVinculadas ||
          usuario.escolasVinculadas.length === 0
            ? [] // Desenvolvedor ou sem escolas vinculadas, não aplica filtro de escola na query
            : usuario.escolasVinculadas;

        // 3. Buscar dados do professor (para pegar nome e turmas vinculadas a ele)
        const profDocRef = doc(db, "usuarios", professorId);
        const profDocSnap = await getDoc(profDocRef);

        if (!profDocSnap.exists()) {
          setErrorMessage("Professor não encontrado na base de dados.");
          setLoading(false);
          return;
        }
        const profData = { id: profDocSnap.id, ...profDocSnap.data() };
        setProfessor(profData);

        let turmasDoProfessor =
          profData.turmas && typeof profData.turmas === "object"
            ? Object.keys(profData.turmas)
            : [];

        if (turmasDoProfessor.length === 0) {
          setAlunosAtrasadosDetalhes([]);
          setErrorMessage(
            "Nenhuma turma vinculada a este professor. Não é possível verificar o status dos alunos."
          );
          setLoading(false);
          return;
        }

        // 4. Buscar prazos anuais do PEI
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
          setErrorMessage(
            `Não foi encontrada uma configuração de prazos anual para o PEI do ano de ${anoAtual}. Por favor, verifique a Gestão de Prazos.`
          );
          setLoading(false);
          return;
        }

        // Converte Timestamps para objetos Date JavaScript
        const prazosConvertidos = {
          dataLimiteCriacaoPEI:
            prazoAnualDoc.dataLimiteCriacaoPEI?.toDate() || null,
          dataLimiteRevisao1Sem:
            prazoAnualDoc.dataLimiteRevisao1Sem?.toDate() || null,
          dataLimiteRevisao2Sem:
            prazoAnualDoc.dataLimiteRevisao2Sem?.toDate() || null,
        };

        // 5. Buscar alunos em lotes, respeitando o limite do operador 'in'
        const alunosList = [];
        const BATCH_SIZE = 10;
        for (let i = 0; i < turmasDoProfessor.length; i += BATCH_SIZE) {
          const turmasBatch = turmasDoProfessor.slice(i, i + BATCH_SIZE);

          let qAlunos = query(collection(db, "alunos"));
          qAlunos = query(qAlunos, where("turma", "in", turmasBatch));
          if (escolaIdsParaQuery.length > 0) {
            // Se houver mais de 10 escolas, também precisaria de lotes aqui, mas o cenário é menos comum.
            // Para simplificar, assumimos que escolaIdsParaQuery é <= 10 ou tratamos como um erro de configuração.
            // No código original, já limitava a 10 no useMemo, o que já endereça isso, mas é bom ser explícito.
            if (escolaIdsParaQuery.length > BATCH_SIZE) {
              console.warn(
                `[DetalhesAtrasosPEI] O usuário está vinculado a mais de ${BATCH_SIZE} escolas. A filtragem por escola pode não ser completa devido à limitação do operador 'in' do Firestore.`
              );
              // Uma estratégia real seria dividir as escolas também. Por enquanto, assumimos o limite ou que a lista é pequena.
            }
            qAlunos = query(
              qAlunos,
              where("escolaId", "in", escolaIdsParaQuery.slice(0, BATCH_SIZE))
            );
          }

          const alunosSnap = await getDocs(qAlunos);
          alunosSnap.docs.forEach((doc) => {
            alunosList.push({ id: doc.id, ...doc.data() });
          });
        }

        if (alunosList.length === 0) {
          setErrorMessage(
            `Nenhum aluno encontrado para as turmas deste professor ou para sua(s) escola(s) vinculada(s).`
          );
          setAlunosAtrasadosDetalhes([]);
          setLoading(false);
          return;
        }

        // 6. Para cada aluno, verificar o status detalhado do PEI
        const alunosComStatus = await Promise.all(
          alunosList.map(async (aluno) => {
            // Prepara a query para o PEI do aluno
            let qPei = query(collection(db, "peis"));
            qPei = query(qPei, where("alunoId", "==", aluno.id));
            qPei = query(qPei, where("anoLetivo", "==", anoAtual));
            if (escolaIdsParaQuery.length > 0) {
              qPei = query(
                qPei,
                where("escolaId", "in", escolaIdsParaQuery.slice(0, BATCH_SIZE))
              );
            }
            qPei = query(qPei, orderBy("criadoEm", "desc"), limit(1));

            const peiSnap = await getDocs(qPei);
            const peiData = peiSnap.empty ? null : peiSnap.docs[0].data();

            const statusDetails = getPeiStatusDetails(
              peiData,
              prazosConvertidos,
              hoje
            );

            return {
              ...aluno,
              ...statusDetails,
            };
          })
        );
        setAlunosAtrasadosDetalhes(alunosComStatus);
      } catch (err) {
        console.error("Erro no carregamento dos detalhes do PEI:", err);
        setErrorMessage(
          "Ocorreu um erro ao carregar os detalhes: " + err.message
        );
      } finally {
        setLoading(false);
      }
    };

    carregarDetalhesAtrasos();
  }, [professorId, usuario, navigate]); // professorId, usuario, e navigate como dependências

  if (loading) return <Loader />;

  return (
    <div
      className="detalhes-container"
      /* className={styles.container} */ style={estilos.container}
    >
      <div
        className="detalhes-card"
        /* className={styles.card} */ style={estilos.card}
      >
        <BotaoVoltar />
        <h1
          className="detalhes-title"
          /* className={styles.title} */ style={estilos.title}
        >
          Detalhes dos PEIs com Pendências -{" "}
          {professor ? professor.nome : "Carregando..."}
        </h1>

        <p style={{ marginBottom: "20px" }}>
          Esta tabela mostra o status detalhado dos PEIs de cada aluno sob
          responsabilidade deste professor, com base nos prazos de criação e
          revisões.
        </p>

        {errorMessage ? (
          <div
            className="detalhes-mensagem-aviso"
            /* className={styles.errorMessage} */ style={estilos.errorMessage}
          >
            {errorMessage}
          </div>
        ) : alunosAtrasadosDetalhes.length === 0 ? (
          <div
            className="detalhes-mensagem-aviso"
            /* className={styles.mensagemAviso} */ style={estilos.mensagemAviso}
          >
            Nenhum aluno com PEI encontrado para este professor, suas turmas ou
            escolas vinculadas, no ano letivo atual. Verifique as atribuições,
            status dos PEIs ou as configurações de prazos anuais.
          </div>
        ) : (
          <table
            className="detalhes-table"
            /* className={styles.table} */ style={estilos.table}
          >
            <thead>
              <tr>
                <th /* className={styles.th} */ style={estilos.th}>Aluno</th>
                <th /* className={styles.th} */ style={estilos.th}>
                  Status Geral PEI
                </th>
                <th /* className={styles.th} */ style={estilos.th}>
                  1ª Revisão
                </th>
                <th /* className={styles.th} */ style={estilos.th}>
                  2ª Revisão
                </th>
                <th /* className={styles.th} */ style={estilos.th}>
                  Última Atualização PEI
                </th>
              </tr>
            </thead>
            <tbody>
              {alunosAtrasadosDetalhes.map((aluno) => (
                <tr key={aluno.id}>
                  <td /* className={styles.td} */ style={estilos.td}>
                    {aluno.nome}
                  </td>
                  <td /* className={styles.td} */ style={estilos.td}>
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
                  <td /* className={styles.td} */ style={estilos.td}>
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
                  <td /* className={styles.td} */ style={estilos.td}>
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
                  <td /* className={styles.td} */ style={estilos.td}>
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

// Manutenção dos estilos inline para referência e para manter a funcionalidade sem CSS Modules.
// Em um projeto real, você criaria um arquivo CSS Modules (ex: DetalhesAtrasosPEI.module.css)
// e moveria essas regras para lá, aplicando-as via `className={styles.nomeDaClasse}`.
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
    // Novo estilo para mensagens informativas / sem dados
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
