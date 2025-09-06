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
import { useUserSchool } from "../hooks/useUserSchool";

// IMPORTS DOS DADOS PARA OBJETIVOS DE PRAZO
import estruturaPEI from "../data/estruturaPEI2";
import objetivosCurtoPrazoData from "../data/objetivosCurtoPrazo";
import objetivosMedioPrazoData from "../data/objetivosMedioPrazo";

// --- Funções de Mapeamento de Dados ---
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

// --- Funções Auxiliares Comuns ---
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

const removerAcentosLocal = (str) => {
  const safeStr = typeof str === "string" ? str : "";
  return safeStr
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const verificaTea = (diagnostico) => {
  if (!diagnostico) return false;
  const diagnosticoLowerCase = diagnostico.toLowerCase();
  const palavrasChave = ["tea", "autismo", "espectro autista"];
  return palavrasChave.some((palavra) =>
    diagnosticoLowerCase.includes(palavra)
  );
};

export default function VerPEIs() {
  const navigate = useNavigate();
  const { userSchoolId, userSchoolData, isLoadingUserSchool } = useUserSchool();

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

  const tipo = usuarioLogado?.perfil;

  const [peisPorAluno, setPeisPorAluno] = useState({});
  const [alunos, setAlunos] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [avaliacoesIniciais, setAvaliacoesIniciais] = useState({});

  const perfisComAcessoAmplo = useMemo(
    () => [
      "desenvolvedor",
      "seme",
      "diretor",
      "diretor_adjunto",
      "gestao",
      "aee",
      "orientador_pedagogico",
    ],
    []
  );

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    if (isLoadingUserSchool) {
      return;
    }

    try {
      const tipo = usuarioLogado?.perfil;

      let alunosQuery, peisQuery, usuariosQuery, avaliacoesQuery;

      switch (tipo) {
        case "desenvolvedor":
        case "seme":
        // ##### INÍCIO DA LÓGICA ALTERADA #####
        // Perfil de Diretor e outros agora usam a mesma lógica do DEV
        case "diretor":
        case "diretor_adjunto":
        case "gestao":
        case "aee":
        case "orientador_pedagogico":
          console.log(
            `[DEBUG] Perfil '${tipo}' com acesso total. Buscando todas as coleções sem filtro de escola.`
          );
          alunosQuery = collection(db, "alunos");
          peisQuery = collection(db, "peis");
          usuariosQuery = collection(db, "usuarios");
          avaliacoesQuery = collection(db, "avaliacoesIniciais");
          break;
        // ##### FIM DA LÓGICA ALTERADA #####

        case "professor":
          console.log(
            "[DEBUG] Perfil de professor. Buscando por turmas e criador."
          );
          const turmasDoProfessor = userSchoolData?.turmas
            ? Object.keys(userSchoolData.turmas)
            : [];
          if (turmasDoProfessor.length === 0) {
            setCarregando(false);
            setAlunos([]);
            setPeisPorAluno({});
            return;
          }
          alunosQuery = query(
            collection(db, "alunos"),
            where("turma", "in", turmasDoProfessor)
          );
          peisQuery = query(
            collection(db, "peis"),
            where("criadorId", "==", usuarioLogado.email)
          );
          usuariosQuery = query(
            collection(db, "usuarios"),
            where("perfil", "==", "professor")
          );
          avaliacoesQuery = query(
            collection(db, "avaliacoesIniciais"),
            where("criadorId", "==", usuarioLogado.email)
          );
          break;

        default:
          console.warn(
            "[AVISO] Perfil de usuário desconhecido ou não definido:",
            tipo
          );
          setCarregando(false);
          setAlunos([]);
          setPeisPorAluno({});
          return;
      }

      const [
        peisSnapshot,
        alunosSnapshot,
        usuariosSnapshot,
        avaliacoesSnapshot,
      ] = await Promise.all([
        getDocs(peisQuery),
        getDocs(alunosQuery),
        getDocs(usuariosQuery),
        getDocs(avaliacoesQuery),
      ]);

      const todasAvaliacoes = {};
      avaliacoesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        let nomeAlunoAvaliacao = "";
        if (typeof data.aluno === "string") {
          nomeAlunoAvaliacao = data.aluno;
        } else if (
          typeof data.aluno === "object" &&
          data.aluno !== null &&
          typeof data.aluno.nome === "string"
        ) {
          nomeAlunoAvaliacao = data.aluno.nome;
        }
        todasAvaliacoes[removerAcentosLocal(nomeAlunoAvaliacao)] = data;
      });
      setAvaliacoesIniciais(todasAvaliacoes);

      const alunosSalvos = alunosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isTea: verificaTea(doc.data().diagnostico),
      }));
      setAlunos(alunosSalvos);

      const usuariosSalvos = usuariosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsuarios(usuariosSalvos.filter((u) => u.perfil === "professor"));

      const todosPeis = peisSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      let peisVisiveis = todosPeis;
      if (tipo !== "professor" && filtroUsuario) {
        peisVisiveis = todosPeis.filter((p) => p.criadorId === filtroUsuario);
      }

      const agrupados = {};
      alunosSalvos.forEach((aluno) => {
        agrupados[aluno.nome] = peisVisiveis
          .filter((p) => {
            if (!p.alunoId) {
              console.warn(
                `[AVISO] PEI com ID ${p.id} foi descartado por não ter o campo 'alunoId'. Verifique os dados no Firestore.`
              );
              return false;
            }
            return p.alunoId === aluno.id;
          })
          .sort((a, b) => {
            const dataA = a.dataCriacao?.toDate
              ? a.dataCriacao.toDate()
              : new Date(0);
            const dataB = b.dataCriacao?.toDate
              ? b.dataCriacao.toDate()
              : new Date(0);
            return dataB.getTime() - dataA.getTime();
          });
      });

      setPeisPorAluno(agrupados);
    } catch (erro) {
      console.error("Erro detalhado ao carregar dados:", erro);
      setErro(
        `Erro ao carregar dados: ${erro.message}. Tente recarregar a página.`
      );
    } finally {
      setCarregando(false);
    }
  }, [
    filtroUsuario,
    usuarioLogado,
    isLoadingUserSchool,
    userSchoolData, // userSchoolId não é mais usado para estes perfis
  ]);

  useEffect(() => {
    if (!isLoadingUserSchool) {
      carregarDados();
    }
  }, [isLoadingUserSchool, carregarDados]);

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
      const alunoCompletoParaPDF = alunos.find((a) => a.nome === abaAtiva);

      if (!alunoCompletoParaPDF) {
        alert(
          `Dados completos do aluno (${abaAtiva}) não encontrados. Não é possível gerar o PDF.`
        );
        return;
      }

      const avaliacao =
        avaliacoesIniciais[removerAcentosLocal(alunoCompletoParaPDF.nome)];
      if (!avaliacao) {
        alert(
          `Avaliação Inicial não encontrada para ${alunoCompletoParaPDF.nome}.`
        );
        return;
      }

      let avaliacaoInteressesData = null;
      try {
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
          <BotaoVoltar />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={estilos.fundo}>
        <div style={estilos.card}>
          <BotaoVoltar />
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
        <BotaoVoltar />
        <h2 style={estilos.titulo}>PEIs por Aluno</h2>

        {perfisComAcessoAmplo.includes(tipo) && (
          <div style={estilos.filtroContainer}>
            <label htmlFor="filtroUsuario" style={estilos.filtroLabel}>
              Filtrar por professor:
            </label>
            <select
              id="filtroUsuario"
              onChange={(e) => setFiltroUsuario(e.target.value)}
              value={filtroUsuario}
              style={estilos.filtroSelect}
            >
              <option value="">Todos os professores</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {alunos.length === 0 ? (
          <p style={estilos.semDados}>
            Nenhum aluno encontrado para o seu perfil.
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
                  <option key={aluno.id} value={aluno.nome}>
                    {aluno.nome} - {aluno.turma} {aluno.isTea ? " 🧩" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={estilos.conteudoAba}>
              {abaAtiva &&
                (() => {
                  const alunoDaAba = alunos.find((a) => a.nome === abaAtiva);
                  const [idade, faixa] = alunoDaAba
                    ? calcularIdadeEFaixa(alunoDaAba.nascimento)
                    : ["-", "-"];
                  const peis = peisPorAluno[abaAtiva] || [];

                  return (
                    <>
                      <div style={estilos.infoAluno}>
                        <p>
                          <strong>Idade:</strong> {idade} anos ({faixa})
                        </p>
                        {alunoDaAba?.turma && (
                          <p>
                            <strong>Turma:</strong> {alunoDaAba.turma}
                          </p>
                        )}
                        {alunoDaAba?.isTea && (
                          <p style={{ fontWeight: "bold", color: "#1d3557" }}>
                            Transtorno do Espectro Autista (TEA) 🧩
                          </p>
                        )}
                      </div>

                      {peis.length === 0 ? (
                        <p style={estilos.semDados}>
                          Nenhum PEI registrado para este aluno sob o filtro
                          atual.
                        </p>
                      ) : (
                        peis.map((pei, idx) => (
                          <div key={idx} style={estilos.cardInterno}>
                            <div style={estilos.infoPei}>
                              <p>
                                <strong>Turma no PEI:</strong> {pei.turma}
                              </p>
                              {(() => {
                                let nomeAlunoPeiParaAvaliacao =
                                  pei.aluno?.nome || pei.aluno || "";

                                const avaliacao =
                                  avaliacoesIniciais[
                                    removerAcentosLocal(
                                      nomeAlunoPeiParaAvaliacao
                                    )
                                  ];
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
                                    <p>
                                      <strong>Criado por:</strong>{" "}
                                      {pei.nomeCriador || "Desconhecido"}
                                    </p>
                                  </>
                                );
                              })()}
                            </div>

                            <div style={estilos.botoes}>
                              {(usuarioLogado.email === pei.criadorId ||
                                perfisComAcessoAmplo.includes(
                                  usuarioLogado.perfil
                                )) && (
                                <>
                                  <button
                                    style={estilos.editar}
                                    onClick={() =>
                                      navigate("/editar-pei/" + pei.id, {
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
                                </>
                              )}

                              <button
                                style={estilos.visualizar}
                                onClick={() =>
                                  navigate("/visualizar-pei/" + pei.id, {
                                    state: { pei, voltarPara: abaAtiva },
                                  })
                                }
                              >
                                Visualizar
                              </button>
                              <button
                                className="botao-secundario"
                                onClick={() =>
                                  navigate(`/acompanhar-metas/${pei.id}`)
                                }
                              >
                                Acompanhar Metas
                              </button>
                              <button
                                style={estilos.observacoes}
                                onClick={() =>
                                  navigate(`/observacoes-aluno/${pei.id}`, {
                                    state: {
                                      alunoNome: pei.aluno,
                                      peiId: pei.id,
                                    },
                                  })
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
