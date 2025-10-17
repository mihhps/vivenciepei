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
import { FaUserCircle, FaPuzzlePiece, FaChevronDown } from "react-icons/fa"; // FaChevronDown para o filtro

// NOVO: Importa o styled-components
import styled from "styled-components";

// IMPORTAÇÃO DO COMPONENTE SELECAOALUNO MODERNIZADO
import SelecaoAluno from "../components/SelecaoAluno";

// IMPORTS DOS DADOS PARA OBJETIVOS DE PRAZO (Mantidos)
import estruturaPEI from "../data/estruturaPEI2";
import objetivosCurtoPrazoData from "../data/objetivosCurtoPrazo";
import objetivosMedioPrazoData from "../data/objetivosMedioPrazo";

// --- Funções Auxiliares (Mantidas) ---
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

const calcularIdadeCompleta = (dataNascimentoString) => {
  if (!dataNascimentoString) return "N/A";

  const dataNasc =
    typeof dataNascimentoString.toDate === "function"
      ? dataNascimentoString.toDate()
      : new Date(dataNascimentoString);

  const hoje = new Date();

  if (isNaN(dataNasc)) return "N/A";

  let anos = hoje.getFullYear() - dataNasc.getFullYear();
  let meses = hoje.getMonth() - dataNasc.getMonth();

  if (meses < 0 || (meses === 0 && hoje.getDate() < dataNasc.getDate())) {
    anos--;
    meses = 12 + meses;
  }

  const idadeAnos = Math.floor(anos);
  const idadeMeses = meses;

  let resultado = `${idadeAnos} ano${idadeAnos !== 1 ? "s" : ""}`;
  if (idadeMeses > 0) {
    resultado += ` e ${idadeMeses} mes${idadeMeses !== 1 ? "es" : ""}`;
  }
  return resultado;
};

// --- COMPONENTES ESTILIZADOS PARA O FILTRO DO PROFESSOR (NOVO BLOCO) ---

const StyledFilterWrapper = styled.div`
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ddd;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  background-color: white; /* Fundo branco garantido */

  &:hover {
    border-color: #457b9d;
    box-shadow: 0 0 0 3px rgba(69, 123, 157, 0.2);
  }
`;

const StyledFilterSelect = styled.select`
  width: 100%;
  padding: 10px 40px 10px 15px;
  border: none;
  background-color: transparent;
  color: #333;
  font-size: 1em;
  cursor: pointer;
  outline: none;

  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  option[value=""] {
    color: #999;
  }
`;

const FilterIcon = styled(FaChevronDown)`
  position: absolute;
  top: 50%;
  right: 15px;
  transform: translateY(-50%);
  pointer-events: none;
  color: #457b9d;
  font-size: 0.8em;
  transition: color 0.3s ease;
`;

// --- FIM DOS NOVOS COMPONENTES ESTILIZADOS PARA O FILTRO DO PROFESSOR ---

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

      // Variáveis para armazenar os dados finais
      let alunosParaExibir = [];
      let peisAgrupados = {};
      let avaliacoesParaExibir = {};
      let usuariosParaFiltro = [];

      if (perfisComAcessoAmplo.includes(tipo)) {
        console.log(
          `[DEBUG] Perfil '${tipo}' com acesso amplo. Buscando todos os dados.`
        );

        const alunosQuery = collection(db, "alunos");
        const peisQuery = collection(db, "peis");
        const usuariosQuery = collection(db, "usuarios");
        const avaliacoesQuery = collection(db, "avaliacoesIniciais");

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

        avaliacoesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.alunoId) {
            avaliacoesParaExibir[data.alunoId] = { id: doc.id, ...data };
          }
        });

        alunosParaExibir = alunosSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isTea: verificaTea(doc.data().diagnostico),
        }));

        usuariosParaFiltro = usuariosSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((u) => u.perfil === "professor");

        const todosPeis = peisSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        let peisVisiveis = todosPeis;
        if (filtroUsuario) {
          peisVisiveis = todosPeis.filter((p) => p.criadorId === filtroUsuario);
        }

        alunosParaExibir.forEach((aluno) => {
          peisAgrupados[aluno.id] = peisVisiveis
            .filter((p) => p.alunoId === aluno.id)
            .sort(
              (a, b) =>
                (b.dataCriacao?.toDate?.() || 0) -
                (a.dataCriacao?.toDate?.() || 0)
            );
        });
      } else if (tipo === "professor") {
        console.log(
          "[DEBUG] Perfil Professor: Carregando alunos da turma, avaliações de todos, e APENAS PEIs próprios."
        );

        const turmasDoProfessor = userSchoolData?.turmas
          ? Object.keys(userSchoolData.turmas)
          : [];
        if (turmasDoProfessor.length === 0) {
          setCarregando(false);
          return;
        }

        // 1. Buscar TODOS os alunos das turmas do professor
        const alunosQuery = query(
          collection(db, "alunos"),
          where("turma", "in", turmasDoProfessor)
        );
        const alunosSnapshot = await getDocs(alunosQuery);
        alunosParaExibir = alunosSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isTea: verificaTea(doc.data().diagnostico),
        }));

        const alunoIds = alunosParaExibir.map((aluno) => aluno.id);

        // 2. REGRA AMPLA: Buscar TODAS as avaliações desses alunos
        if (alunoIds.length > 0) {
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

        // 3. REGRA RESTRITA: Buscar APENAS os PEIs criados por ESTE professor
        const peisQuery = query(
          collection(db, "peis"),
          where("criadorId", "==", usuarioLogado.email)
        );
        const peisSnapshot = await getDocs(peisQuery);
        const todosPeisDoProfessor = peisSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 4. Agrupar os PEIs (apenas os do professor) para os alunos
        alunosParaExibir.forEach((aluno) => {
          peisAgrupados[aluno.id] = todosPeisDoProfessor
            .filter((p) => p.alunoId === aluno.id)
            .sort(
              (a, b) =>
                (b.dataCriacao?.toDate?.() || 0) -
                (a.dataCriacao?.toDate?.() || 0)
            );
        });
      }

      // Atualiza o estado com os dados processados para qualquer perfil
      setAlunos(alunosParaExibir);
      setAvaliacoesIniciais(avaliacoesParaExibir);
      setUsuarios(usuariosParaFiltro);
      setPeisPorAluno(peisAgrupados);

      // Define a aba ativa para o primeiro aluno, se houver, ou a mantém vazia
      if (alunosParaExibir.length > 0 && !abaAtiva) {
        setAbaAtiva(alunosParaExibir[0].id);
      }
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
    userSchoolData,
    perfisComAcessoAmplo,
    abaAtiva,
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
      // --- CORREÇÃO: Busca o aluno e a avaliação pelo ID ---
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

  // --- Funções Auxiliares para o SelecaoAluno
  const handleSelecionarAluno = (e) => {
    const selectedAlunoNomeCompleto = e.target.value;
    const foundAluno = alunosParaSelecao.find(
      (a) => a.nome === selectedAlunoNomeCompleto
    );

    if (foundAluno) {
      setAbaAtiva(foundAluno.id);
    } else {
      setAbaAtiva("");
    }
  };

  // Cria a lista de alunos formatada para o SelecaoAluno (Nome, ID)
  const alunosParaSelecao = alunos.map((a) => ({
    id: a.id,
    nome: `${a.nome} - ${a.turma} ${a.isTea ? "🧩" : ""}`,
  }));

  // Encontra o nome completo para pré-selecionar no dropdown
  const nomeAlunoAtivo =
    alunosParaSelecao.find((a) => a.id === abaAtiva)?.nome || "";

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
        {/* NOVO POSICIONAMENTO DO BOTÃO VOLTAR (top-left) */}
        <div style={{ position: "absolute", top: "20px", left: "20px" }}>
          <BotaoVoltar />
        </div>

        <h2 style={estilos.titulo}>PEIs por Aluno</h2>

        {perfisComAcessoAmplo.includes(tipo) && (
          <div style={estilos.filtroContainer}>
            <label htmlFor="filtroUsuario" style={estilos.filtroLabel}>
              Filtrar por professor:
            </label>
            {/* CORRIGIDO: Agora usa Styled Components para o filtro do professor */}
            <StyledFilterWrapper>
              <StyledFilterSelect
                id="filtroUsuario"
                onChange={(e) => setFiltroUsuario(e.target.value)}
                value={filtroUsuario}
              >
                <option value="">Todos os professores</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.nome}
                  </option>
                ))}
              </StyledFilterSelect>
              <FilterIcon />
            </StyledFilterWrapper>
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
              {/* CORRIGIDO: Usa o componente SelecaoAluno modernizado */}
              <SelecaoAluno
                alunos={alunosParaSelecao}
                alunoSelecionado={nomeAlunoAtivo}
                onSelecionar={handleSelecionarAluno}
                disabled={carregando}
              />
            </div>

            <div style={estilos.conteudoAba}>
              {abaAtiva &&
                (() => {
                  const alunoDaAba = alunos.find((a) => a.id === abaAtiva);
                  const [idade, faixa] = alunoDaAba
                    ? calcularIdadeEFaixa(alunoDaAba.nascimento)
                    : ["-", "-"];
                  const idadeCompleta = alunoDaAba
                    ? calcularIdadeCompleta(alunoDaAba.nascimento)
                    : "N/A";

                  const peis = alunoDaAba
                    ? peisPorAluno[alunoDaAba.id] || []
                    : [];

                  return (
                    <>
                      {/* --- BLOCO: FOTO E DETALHES (Mantido) --- */}
                      {alunoDaAba && (
                        <div style={estilos.infoGeralContainer}>
                          {/* FOTO / PLACEHOLDER */}
                          <div style={estilos.fotoContainer}>
                            {alunoDaAba.fotoUrl ? (
                              <img
                                src={alunoDaAba.fotoUrl}
                                alt={`Foto de ${alunoDaAba.nome}`}
                                style={estilos.foto}
                              />
                            ) : (
                              <FaUserCircle style={estilos.fotoPlaceholder} />
                            )}
                          </div>

                          {/* DETALHES */}
                          <div style={estilos.detalhesWrapper}>
                            <h3 style={estilos.nomeText}>
                              {alunoDaAba.nome}
                              {alunoDaAba.isTea && (
                                <FaPuzzlePiece
                                  style={estilos.teaBadge}
                                  title="Aluno com TEA"
                                />
                              )}
                            </h3>
                            <p style={estilos.detalhe}>
                              <strong>Idade:</strong> {idadeCompleta}
                            </p>
                            <p style={estilos.detalhe}>
                              <strong>Turma:</strong>{" "}
                              {alunoDaAba.turma || "N/A"}
                            </p>
                            <p style={estilos.detalhe}>
                              <strong>Diagnóstico:</strong>{" "}
                              {alunoDaAba.diagnostico || "N/A"}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* --- FIM DO BLOCO FOTO/DETALHES --- */}

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
                                style={estilos.acompanhar}
                                onClick={() =>
                                  navigate(`/acompanhar-metas/${pei.id}`)
                                }
                              >
                                Acompanhar Metas
                              </button>
                              <button
                                style={estilos.observacoes}
                                onClick={() =>
                                  // ...
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
    position: "relative", // CRUCIAL para o botão Voltar (Passo 4)
  },
  titulo: {
    textAlign: "center",
    fontSize: "26px",
    color: "#1d3557",
    marginBottom: "20px",
    marginTop: "20px", // Margem para afastar do botão Voltar
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
  conteudoAba: {
    width: "100%",
  },
  infoGeralContainer: {
    display: "flex",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#eef2f5",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    width: "100%",
  },
  fotoContainer: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    border: "3px solid #4c51bf",
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  foto: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  fotoPlaceholder: {
    fontSize: "3em",
    color: "#4c51bf",
  },
  detalhesWrapper: {
    flexGrow: 1,
  },
  nomeText: {
    fontSize: "1.6em",
    color: "#1d3557",
    fontWeight: "700",
    margin: "0 0 5px 0",
  },
  teaBadge: {
    fontSize: "1em",
    color: "#29ABE2",
    marginLeft: "10px",
  },
  detalhe: {
    fontSize: "0.95em",
    color: "#4a5568",
    margin: "0 0 3px 0",
    lineHeight: "1.4",
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
