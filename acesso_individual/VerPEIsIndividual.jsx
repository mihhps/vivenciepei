import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import { gerarPDFCompleto } from "../utils/gerarPDFCompleto";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { fetchAvaliacaoInteresses } from "../utils/firebaseUtils";
// REMOVIDO: import { useUserSchool } from "../hooks/useUserSchool"; // Não é necessário

// --- IMPORTAÇÕES DE DADOS E FUNÇÕES AUXILIARES MANTIDAS (Reaproveitadas) ---
import estruturaPEI from "../data/estruturaPEI2";
import objetivosCurtoPrazoData from "../data/objetivosCurtoPrazo";
import objetivosMedioPrazoData from "../data/objetivosMedioPrazo";

// Funções de Mapeamento (MANTIDAS)
const getEstruturaPEIMap = (estrutura) => {
  const map = {};
  if (!estrutura) return map;
  Object.entries(estrutura).forEach(([areaName, subareasByArea]) => {
    if (typeof subareasByArea === "object" && subareasByArea !== null) {
      Object.entries(subareasByArea).forEach(
        ([subareaName, habilidadesBySubarea]) => {
          if (
            typeof habilidadesBySubarea === "object" &&
            habilidadesBySubarea !== null
          ) {
            Object.entries(habilidadesBySubarea).forEach(
              ([habilidadeName, niveisData]) => {
                if (!map[habilidadeName]) {
                  map[habilidadeName] = {};
                }
                if (typeof niveisData === "object" && niveisData !== null) {
                  Object.entries(niveisData).forEach(([nivel, data]) => {
                    map[habilidadeName][nivel] = data;
                  });
                }
              }
            );
          }
        }
      );
    }
  });
  return map;
};

const getObjetivosPrazoMap = (prazoData) => {
  const map = {};
  if (!prazoData) return map;
  Object.entries(prazoData).forEach(([areaName, subareasByArea]) => {
    if (typeof subareasByArea === "object" && subareasByArea !== null) {
      Object.entries(subareasByArea).forEach(
        ([subareaName, habilidadesBySubarea]) => {
          if (
            typeof habilidadesBySubarea === "object" &&
            habilidadesBySubarea !== null
          ) {
            Object.entries(habilidadesBySubarea).forEach(
              ([habilidadeName, niveisData]) => {
                if (!map[habilidadeName]) {
                  map[habilidadeName] = {};
                }
                if (typeof niveisData === "object" && niveisData !== null) {
                  Object.entries(niveisData).forEach(([nivel, objData]) => {
                    map[habilidadeName][nivel] = objData.objetivo;
                  });
                }
              }
            );
          }
        }
      );
    }
  });
  return map;
};

// Funções Auxiliares (MANTIDAS)
const calcularIdadeEFaixa = (nascimento) => {
  if (!nascimento) return ["-", "-"];
  const hoje = new Date();
  const nasc =
    typeof nascimento.toDate === "function"
      ? nascimento.toDate()
      : new Date(nascimento);

  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  let faixa =
    idade <= 3
      ? "0-3 anos"
      : idade <= 5
      ? "4-5 anos"
      : idade <= 8
      ? "6-8 anos"
      : idade <= 11
      ? "9-11 anos"
      : "12+ anos";
  return [idade, faixa];
};

function formatarDataSegura(data) {
  if (!data) return "-";
  try {
    const dataStr =
      typeof data === "string" ? data : data.toDate?.().toISOString();
    if (!dataStr) return "-";

    const [ano, mes, dia] = dataStr.split("T")[0].split("-");
    return `${dia}/${mes}/${ano}`;
  } catch {
    return "-";
  }
}

const verificaTea = (diagnostico) => {
  if (!diagnostico) return false;
  const diagnosticoLowerCase = diagnostico.toLowerCase();
  const palavrasChave = ["tea", "autismo", "espectro autista"];
  return palavrasChave.some((palavra) =>
    diagnosticoLowerCase.includes(palavra)
  );
};

// --- ROTA PADRÃO DE RETORNO ADAPTADA ---
const ROTA_PAINEL_INDIVIDUAL = "/painel-individual";

export default function VerPEIsIndividual() {
  // RENOMEADO
  const navigate = useNavigate();
  // const { userSchoolId, userSchoolData, isLoadingUserSchool } = useUserSchool(); // REMOVIDO

  const usuarioLogado = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
      return {
        ...user,
        perfil: user.perfil?.toLowerCase()?.trim(),
      };
    } catch (e) {
      console.error("Erro ao fazer parse do usuário logado:", e);
      return {};
    }
  }, []);

  const [peisPorAluno, setPeisPorAluno] = useState({});
  const [alunos, setAlunos] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("");
  // REMOVIDO: filtroUsuario e setFiltroUsuario (Não faz sentido filtrar entre si mesmo)
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [avaliacoesIniciais, setAvaliacoesIniciais] = useState({});

  // REMOVIDO: perfisComAcessoAmplo (Lógica desnecessária)

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    // REMOVIDO: if (isLoadingUserSchool) { return; }

    try {
      // Variáveis para armazenar os dados finais
      let alunosParaExibir = [];
      let peisAgrupados = {};
      let avaliacoesParaExibir = {};

      // LÓGICA SIMPLIFICADA PARA PROFESSOR INDIVIDUAL:
      // Busca APENAS alunos e PEIs criados por ESTE professor.

      // 1. Buscar Alunos: Filtro por criadorId (email do professor logado)
      const alunosQuery = query(
        collection(db, "alunos"),
        where("criadorId", "==", usuarioLogado.email) // Filtro crucial
      );
      const alunosSnapshot = await getDocs(alunosQuery);
      alunosParaExibir = alunosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isTea: verificaTea(doc.data().diagnostico),
      }));

      const alunoIds = alunosParaExibir.map((aluno) => aluno.id);

      // 2. Buscar Avaliações Iniciais (do lote de alunos)
      if (alunoIds.length > 0) {
        // Quebra em lotes para queries 'in'
        const lotesDeIds = [];
        for (let i = 0; i < alunoIds.length; i += 30) {
          lotesDeIds.push(alunoIds.slice(i, i + 30));
        }

        const promessasAvaliacoes = lotesDeIds.map((lote) =>
          getDocs(
            query(
              collection(db, "avaliacoesIniciais"),
              where("alunoId", "in", lote)
            )
          )
        );

        const snapshotsAvaliacoes = await Promise.all(promessasAvaliacoes);

        snapshotsAvaliacoes.flat().forEach((snapshot) => {
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data.alunoId) {
              avaliacoesParaExibir[data.alunoId] = { id: doc.id, ...data };
            }
          });
        });
      }

      // 3. Buscar PEIs (Filtro por criadorId - email do professor logado)
      const peisQuery = query(
        collection(db, "peis"),
        where("criadorId", "==", usuarioLogado.email)
      );
      const peisSnapshot = await getDocs(peisQuery);
      const todosPeisDoProfessor = peisSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 4. Agrupar os PEIs para os alunos (apenas os do professor)
      alunosParaExibir.forEach((aluno) => {
        peisAgrupados[aluno.id] = todosPeisDoProfessor
          .filter((p) => p.alunoId === aluno.id)
          .sort(
            (a, b) =>
              (b.dataCriacao?.toDate?.() || 0) -
              (a.dataCriacao?.toDate?.() || 0)
          );
      });

      // Atualiza o estado
      setAlunos(alunosParaExibir);
      setAvaliacoesIniciais(avaliacoesParaExibir);
      setPeisPorAluno(peisAgrupados);
      // REMOVIDO: setUsuarios (e o filtro de usuários)
    } catch (erro) {
      console.error("Erro detalhado ao carregar dados:", erro);
      setErro(
        `Erro ao carregar dados: ${erro.message}. Tente recarregar a página.`
      );
    } finally {
      setCarregando(false);
    }
  }, [usuarioLogado.email]); // Dependência apenas do email do usuário logado

  useEffect(() => {
    // REMOVIDO: if (!isLoadingUserSchool)
    carregarDados();
  }, [carregarDados]);

  const excluirPei = async (pei) => {
    if (
      !window.confirm(`Tem certeza que deseja excluir o PEI de ${pei.aluno}?`)
    )
      return;

    try {
      await deleteDoc(doc(db, "peis", pei.id));
      carregarDados();
    } catch (error) {
      console.error("Erro ao excluir PEI:", error);
      alert("Erro ao excluir PEI. Por favor, tente novamente.");
    }
  };

  const handleGerarPDF = async () => {
    try {
      const alunoCompletoParaPDF = alunos.find((a) => a.id === abaAtiva);

      if (!alunoCompletoParaPDF) {
        alert(`Dados completos do aluno não encontrados.`);
        return;
      }

      const avaliacao = avaliacoesIniciais[alunoCompletoParaPDF.id];
      if (!avaliacao) {
        alert(
          `Avaliação Inicial não encontrada para ${alunoCompletoParaPDF.nome}.`
        );
        return;
      }
      let avaliacaoInteressesData = null;
      try {
        // fetchAvaliacaoInteresses deve ser adaptado ou usado em sua forma segura
        const interessesDoc = await fetchAvaliacaoInteresses(
          alunoCompletoParaPDF.id,
          usuarioLogado.id
        );
        if (interessesDoc) {
          avaliacaoInteressesData = interessesDoc;
        }
      } catch (err) {
        console.error("Erro ao buscar avaliação de interesses:", err);
      }

      // O gerador de PDF (gerarPDFCompleto) é reaproveitado
      await gerarPDFCompleto(
        alunoCompletoParaPDF,
        avaliacao,
        usuarioLogado,
        [],
        avaliacaoInteressesData
      );
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Por favor, tente novamente.");
    }
  };

  if (carregando) {
    return (
      <div style={estilos.fundo}>
        <div style={estilos.card}>
          {/* ROTA DE RETORNO ADAPTADA */}
          <BotaoVoltar destino={ROTA_PAINEL_INDIVIDUAL} />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={estilos.fundo}>
        <div style={estilos.card}>
          {/* ROTA DE RETORNO ADAPTADA */}
          <BotaoVoltar destino={ROTA_PAINEL_INDIVIDUAL} />
          <p style={{ color: "#e63946" }}>{erro}</p>
          <button style={estilos.recarregar} onClick={carregarDados}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={estilos.fundo}>
      <div style={estilos.card}>
        {/* ROTA DE RETORNO ADAPTADA */}
        <BotaoVoltar destino={ROTA_PAINEL_INDIVIDUAL} />
        <h2 style={estilos.titulo}>Meus PEIs por Aluno</h2>

        {/* REMOVIDO: Bloco de Filtro de Usuário (pois não se aplica ao acesso individual) */}

        {alunos.length === 0 ? (
          <p style={estilos.semDados}>
            Nenhum aluno cadastrado sob sua conta individual.
          </p>
        ) : (
          <>
            <div
              style={{ width: "100%", maxWidth: "400px", marginBottom: "30px" }}
            >
              <label
                htmlFor="alunoSelect"
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Selecione o Aluno:
              </label>
              <select
                id="alunoSelect"
                value={abaAtiva}
                onChange={(e) => setAbaAtiva(e.target.value)}
                style={{
                  padding: "12px",
                  width: "100%",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  backgroundColor: "#f8f9fa",
                  fontSize: "16px",
                }}
              >
                <option value="">Selecione o Aluno</option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome} - {aluno.turma || "Individual"}{" "}
                    {aluno.isTea ? " 🧩" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={estilos.conteudoAba}>
              {abaAtiva &&
                (() => {
                  const alunoDaAba = alunos.find((a) => a.id === abaAtiva);
                  const [idade, faixa] = alunoDaAba
                    ? calcularIdadeEFaixa(alunoDaAba.nascimento)
                    : ["-", "-"];
                  const peis = alunoDaAba
                    ? peisPorAluno[alunoDaAba.id] || []
                    : [];

                  return (
                    <>
                      <div style={estilos.infoAluno}>
                        <p>
                          <strong>Idade:</strong> {idade} anos ({faixa})
                        </p>
                        <p>
                          <strong>Turma:</strong>{" "}
                          {alunoDaAba?.turma || "Individual"}
                        </p>
                        {alunoDaAba?.isTea && (
                          <p style={{ fontWeight: "bold", color: "#1d3557" }}>
                            Transtorno do Espectro Autista (TEA) 🧩
                          </p>
                        )}
                      </div>

                      {peis.length === 0 ? (
                        <p style={estilos.semDados}>
                          Nenhum PEI registrado para este aluno.
                        </p>
                      ) : (
                        peis.map((pei, idx) => (
                          <div key={idx} style={estilos.cardInterno}>
                            <div style={estilos.infoPei}>
                              <p>
                                <strong>Criado em:</strong>{" "}
                                {formatarDataSegura(pei.dataCriacao)}
                              </p>
                              {(() => {
                                const avaliacao =
                                  avaliacoesIniciais[alunoDaAba.id];

                                const dataInicial = formatarDataSegura(
                                  avaliacao?.inicio
                                );
                                const proxima = formatarDataSegura(
                                  avaliacao?.proximaAvaliacao
                                );

                                return (
                                  <>
                                    <p>
                                      <strong>
                                        Data da Avaliação Inicial:
                                      </strong>{" "}
                                      {dataInicial}
                                    </p>
                                    <p>
                                      <strong>Próxima Avaliação:</strong>{" "}
                                      {proxima}
                                    </p>
                                  </>
                                );
                              })()}
                            </div>

                            <div style={estilos.botoes}>
                              <button
                                style={estilos.editar}
                                onClick={() =>
                                  // ROTA ADAPTADA PARA O NOVO COMPONENTE
                                  navigate("/individual/editar-pei/" + pei.id, {
                                    state: { voltarPara: abaAtiva },
                                  })
                                }
                              >
                                Editar
                              </button>
                              <button
                                style={estilos.excluir}
                                onClick={() => excluirPei(pei)}
                              >
                                Excluir
                              </button>
                              <button
                                style={estilos.visualizar}
                                onClick={() =>
                                  // ROTA ADAPTADA PARA O NOVO COMPONENTE
                                  navigate(
                                    "/individual/visualizar-pei/" + pei.id,
                                    {
                                      state: { pei, voltarPara: abaAtiva },
                                    }
                                  )
                                }
                              >
                                Visualizar
                              </button>

                              <button
                                style={estilos.acompanhar}
                                onClick={() =>
                                  // ROTA ADAPTADA (Se o componente de acompanhamento não foi adaptado, crie a rota /individual)
                                  navigate(
                                    `/individual/acompanhar-metas/${pei.id}`
                                  )
                                }
                              >
                                Acompanhar Metas
                              </button>
                              <button
                                style={estilos.observacoes}
                                onClick={() =>
                                  // ROTA ADAPTADA
                                  navigate(
                                    `/individual/observacoes-aluno/${pei.id}`,
                                    {
                                      state: {
                                        alunoNome: pei.aluno,
                                        peiId: pei.id,
                                      },
                                    }
                                  )
                                }
                              >
                                Observações
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                      {alunoDaAba && (
                        <button style={estilos.gerar} onClick={handleGerarPDF}>
                          Gerar PDF Completo
                        </button>
                      )}
                    </>
                  );
                })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const estilos = {
  fundo: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    fontFamily: "'Segoe UI', sans-serif",
    background: "linear-gradient(135deg, #457b9d, #1d3557)",
    width: "100vw",
    minHeight: "100vh",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "30px",
    width: "100%",
    maxWidth: "1000px",
    boxShadow: "0 0 25px rgba(22, 1, 114, 0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  titulo: {
    textAlign: "center",
    fontSize: "26px",
    color: "#1d3557",
    marginBottom: "20px",
  },
  filtroContainer: {
    width: "100%",
    maxWidth: "400px",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  filtroLabel: {
    fontWeight: "500",
    color: "#1d3557",
  },
  filtroSelect: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    backgroundColor: "#f8f9fa",
    width: "100%",
  },
  conteudoAba: {
    width: "100%",
  },
  infoAluno: {
    marginBottom: "20px",
    padding: "10px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
  },
  cardInterno: {
    backgroundColor: "#ffffff",
    padding: "20px",
    marginBottom: "20px",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  infoPei: {
    marginBottom: "15px",
  },
  botoes: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
    flexWrap: "wrap",
  },
  editar: {
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  visualizar: {
    backgroundColor: "#457b9d",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  gerar: {
    backgroundColor: "#2a9d8f",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "20px",
  },
  excluir: {
    backgroundColor: "#e63946",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  acompanhar: {
    backgroundColor: "#52b788",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  observacoes: {
    backgroundColor: "#ffc107",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  semDados: {
    textAlign: "center",
    color: "#666",
    padding: "20px",
  },
  recarregar: {
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
};
