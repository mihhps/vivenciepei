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
  orderBy,
  limit,
} from "firebase/firestore";
import {
  fetchAvaliacaoInteresses,
  // fetchAlunoById, // Não mais necessário importar aqui se já busca `alunos` em carregarDados
  // fetchPeisByAluno, // Não mais necessário importar aqui se já busca `peis` em carregarDados
} from "../utils/firebaseUtils"; // Confirme que este caminho está correto

// IMPORTS DOS DADOS PARA OBJETIVOS DE PRAZO
// Certifique-se de que os caminhos estão corretos para o seu projeto!
import estruturaPEI from "../data/estruturaPEI2"; // Seu arquivo principal (para objetivo de LONGO PRAZO e estratégias)
import objetivosCurtoPrazoData from "../data/objetivosCurtoPrazo";
import objetivosMedioPrazoData from "../data/objetivosMedioPrazo";

// --- Funções de Mapeamento de Dados (Replicadas do gerarPDFCompleto.js / CriarPEI.jsx) ---
/**
 * Mapeia a estrutura principal de habilidades para facilitar o acesso a objetivos de Longo Prazo e estratégias.
 */
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
                    map[habilidadeName][nivel] = data; // Contém objetivo (Longo Prazo) e estratégias
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

/**
 * Mapeia as estruturas de objetivos por prazo (Curto, Médio) para facilitar o acesso.
 */
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
                    map[habilidadeName][nivel] = objData.objetivo; // Salva diretamente o texto do objetivo
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

// --- Funções Auxiliares Comuns (existentes) ---
const calcularIdadeEFaixa = (nascimento) => {
  if (!nascimento) return ["-", "-"];
  const hoje = new Date();
  // Garante que nascimento é tratado como Date ou Firestore Timestamp
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

export default function VerPEIs() {
  const navigate = useNavigate();
  const usuarioLogado = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
      const escolasVinculadasIds =
        user?.escolas && typeof user.escolas === "object"
          ? Object.keys(user.escolas)
          : [];
      return {
        ...user,
        perfil: user.perfil?.toLowerCase()?.trim(),
        escolasVinculadasIds,
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
    () => ["desenvolvedor", "seme", "gestao", "aee"],
    []
  );

  // Mapeamentos para buscar os objetivos de prazos específicos
  const estruturaPEIMap = useMemo(() => getEstruturaPEIMap(estruturaPEI), []);
  const objetivosCurtoPrazoMap = useMemo(
    () => getObjetivosPrazoMap(objetivosCurtoPrazoData),
    []
  );
  const objetivosMedioPrazoMap = useMemo(
    () => getObjetivosPrazoMap(objetivosMedioPrazoData),
    []
  );

  const carregarDados = useCallback(async () => {
    console.log("--- DEBUG carregarDados START ---");
    console.log(
      "usuarioLogado (início):",
      JSON.stringify(usuarioLogado, null, 2)
    );
    console.log("Tipo de perfil (usuarioLogado.perfil):", tipo);
    console.log(
      "Escolas vinculadas ao usuário logado (IDs):",
      usuarioLogado.escolasVinculadasIds
    );

    setCarregando(true);
    setErro(null);

    try {
      const [
        peisSnapshot,
        alunosSnapshot,
        usuariosSnapshot,
        avaliacoesSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "peis")),
        getDocs(collection(db, "alunos")),
        getDocs(collection(db, "usuarios")),
        getDocs(collection(db, "avaliacoesIniciais")),
      ]);

      const todasAvaliacoes = {};

      avaliacoesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        let nomeAlunoAvaliacao = "";
        if (
          typeof data.aluno === "object" &&
          data.aluno !== null &&
          typeof data.aluno.nome === "string"
        ) {
          nomeAlunoAvaliacao = data.aluno.nome;
        } else if (typeof data.aluno === "string") {
          nomeAlunoAvaliacao = data.aluno;
        }
        todasAvaliacoes[removerAcentosLocal(nomeAlunoAvaliacao)] = data;
      });
      setAvaliacoesIniciais(todasAvaliacoes);

      const alunosSalvos = alunosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAlunos(alunosSalvos);

      const usuariosSalvos = usuariosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log(
        "Total de usuários salvos (Firestore):",
        usuariosSalvos.length
      );
      console.log(
        "Amostra do 1º usuário salvo:",
        usuariosSalvos.length > 0
          ? JSON.stringify(usuariosSalvos[0], null, 2)
          : "Nenhum"
      );

      let professoresDaEscola = [];
      const todosPeis = peisSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (perfisComAcessoAmplo.includes(tipo)) {
        console.log(`Caminho principal: Perfil com acesso amplo (${tipo}).`);
        if (usuarioLogado.escolasVinculadasIds.length > 0) {
          console.log(
            "  -> Com escolas vinculadas. Filtrando professores por:",
            usuarioLogado.escolasVinculadasIds
          );
          professoresDaEscola = usuariosSalvos.filter(
            (u) =>
              u.perfil === "professor" &&
              u.escolas &&
              Object.keys(u.escolas).some((escolaId) =>
                usuarioLogado.escolasVinculadasIds.includes(escolaId)
              )
          );
          console.log(
            "  Professores filtrados por escola vinculada:",
            professoresDaEscola.length
          );
        } else {
          console.log(
            "  -> Sem escolas vinculadas. Mostrando TODOS os professores do sistema."
          );
          professoresDaEscola = usuariosSalvos.filter(
            (u) => u.perfil === "professor"
          );
          console.log(
            "  Total de professores para exibir (perfil amplo sem escolas):",
            professoresDaEscola.length
          );
        }
      } else if (tipo === "professor") {
        console.log("Caminho principal: Perfil Professor.");
        professoresDaEscola = usuariosSalvos.filter(
          (u) => u.id === usuarioLogado.id
        );
        console.log(
          "  Professores filtrados (apenas o logado):",
          professoresDaEscola.length,
          professoresDaEscola.length > 0
            ? JSON.stringify(professoresDaEscola[0], null, 2)
            : "Nenhum"
        );
      } else {
        console.warn(
          `[VerPEIs] Perfil '${tipo}' não tem regra de filtragem definida. Nenhum professor visível.`
        );
        professoresDaEscola = [];
      }

      setUsuarios(professoresDaEscola);
      console.log(
        "Final: Total de professores para o dropdown (setUsuarios):",
        professoresDaEscola.length
      );

      const peisFiltradosPorDropdown = filtroUsuario
        ? todosPeis.filter((p) => p.criadorId === filtroUsuario)
        : todosPeis;

      const peisFiltradosFinal =
        tipo === "professor"
          ? peisFiltradosPorDropdown.filter(
              (p) => p.criadorId === usuarioLogado.email
            )
          : peisFiltradosPorDropdown;

      const agrupados = {};
      alunosSalvos.forEach((aluno) => {
        agrupados[aluno.nome] = peisFiltradosFinal
          .filter((p) => p.aluno === aluno.nome)
          .sort((a, b) => {
            const dataA =
              a.dataCriacao instanceof Date
                ? a.dataCriacao
                : a.dataCriacao?.toDate
                  ? a.dataCriacao.toDate()
                  : new Date(0); // Correção para dataCriacao ser um Timestamp
            const dataB =
              b.dataCriacao instanceof Date
                ? b.dataCriacao
                : b.dataCriacao?.toDate
                  ? b.dataCriacao.toDate()
                  : new Date(0); // Correção para dataCriacao ser um Timestamp
            return dataB.getTime() - dataA.getTime();
          });
      });

      setPeisPorAluno(agrupados);
      console.log("--- DEBUG carregarDados END ---");
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
      setErro("Erro ao carregar dados. Tente recarregar a página.");
    } finally {
      setCarregando(false);
    }
  }, [abaAtiva, filtroUsuario, tipo, usuarioLogado, perfisComAcessoAmplo]); // Removi estruturaPEIMap, objetivosCurtoPrazoMap, objetivosMedioPrazoMap das dependências do useCallback, pois são memoizados e globais ao escopo do módulo.

  useEffect(() => {
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

  // --- FUNÇÃO handleGerarPDF CORRIGIDA ---
  const handleGerarPDF = async () => {
    // Não precisa mais receber 'peiOriginal'
    console.log("--- DEBUG handleGerarPDF START ---");

    try {
      const alunoCompletoParaPDF = alunos.find((a) => a.nome === abaAtiva);

      if (!alunoCompletoParaPDF) {
        alert(
          `Dados completos do aluno (${abaAtiva}) não encontrados. Não é possível gerar o PDF.`
        );
        console.error("DEBUG: alunoCompletoParaPDF é nulo ou undefined.");
        return;
      }

      // Verifica se o alunoCompletoParaPDF tem as informações essenciais
      if (!alunoCompletoParaPDF.nome || !alunoCompletoParaPDF.id) {
        alert(
          `Dados essenciais (nome ou ID) do aluno completo estão faltando para o PEI de ${alunoCompletoParaPDF.nome || "aluno selecionado"}. Não é possível gerar o PDF.`
        );
        console.error(
          "DEBUG: alunoCompletoParaPDF.nome ou alunoCompletoParaPDF.id está faltando.",
          {
            alunoCompletoNome: alunoCompletoParaPDF.nome,
            alunoCompletoId: alunoCompletoParaPDF.id,
          }
        );
        return;
      }

      const avaliacao =
        avaliacoesIniciais[removerAcentosLocal(alunoCompletoParaPDF.nome)];
      if (!avaliacao) {
        alert(
          `Avaliação Inicial não encontrada para ${alunoCompletoParaPDF.nome}.`
        );
        console.error("DEBUG: Avaliação está faltando.");
        return;
      }

      let avaliacaoInteressesData = null;
      try {
        console.log(
          `[PDF_DEBUG] Buscando avaliação de interesses para alunoId: ${alunoCompletoParaPDF.id} e userId: ${usuarioLogado.id}`
        );
        const interessesDoc = await fetchAvaliacaoInteresses(
          alunoCompletoParaPDF.id,
          usuarioLogado.id
        );
        if (interessesDoc) {
          avaliacaoInteressesData = interessesDoc;
          console.log(
            "[PDF_DEBUG] Avaliação de Interesses encontrada:",
            JSON.stringify(avaliacaoInteressesData, null, 2)
          );
        } else {
          console.warn(
            "[PDF_DEBUG] Nenhuma avaliação de interesses encontrada para este aluno."
          );
        }
      } catch (err) {
        console.error("Erro ao buscar avaliação de interesses:", err);
      }

      console.log(
        "Chamando gerarPDFCompleto sem passar PEIs individualmente. Ele buscará todos."
      );

      // A mudança chave: OMITIMOS o array 'peisParaGeral' completamente,
      // ou passamos um array vazio para forçar o gerarPDFCompleto a buscar.
      await gerarPDFCompleto(
        alunoCompletoParaPDF,
        avaliacao,
        usuarioLogado,
        // Remover o '[peiParaPDF]' daqui. A função `gerarPDFCompleto` irá chamar `fetchPeis` internamente.
        // Se você precisa passar um array vazio explicitamente para acionar a lógica de `fetchPeis` interna, use `[]`.
        [], // Garante que a lógica de fallback do gerarPDFCompleto é acionada
        avaliacaoInteressesData
      );
      console.log("--- DEBUG handleGerarPDF END ---");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Por favor, tente novamente.");
    }
  };

  // --- FIM DA FUNÇÃO handleGerarPDF CORRIGIDA ---

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
            Nenhum aluno cadastrado ou PEI encontrado.
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
                    {aluno.nome}
                  </option>
                ))}
              </select>
            </div>
            {/* Conteúdo da aba ativa */}

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
                                // Remover essa função interna se já existe removerAcentosLocal globalmente.
                                // Já está usando removerAcentosLocal abaixo, então essa pode ser removida.
                                /*
                                const removerAcentosInner = (str) =>
                                  String(str) // Garante que é string
                                    .normalize("NFD")
                                    .replace(/[\u0300-\u036f]/g, "")
                                    .toLowerCase()
                                    .trim();
                                */

                                let nomeAlunoPeiParaAvaliacao = "";
                                if (
                                  typeof pei.aluno === "object" &&
                                  pei.aluno !== null &&
                                  typeof pei.aluno.nome === "string"
                                ) {
                                  nomeAlunoPeiParaAvaliacao = pei.aluno.nome;
                                } else if (typeof pei.aluno === "string") {
                                  nomeAlunoPeiParaAvaliacao = pei.aluno;
                                }

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
                                usuarioLogado.perfil === "gestao" ||
                                usuarioLogado.perfil === "aee") && (
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
                            </div>
                          </div>
                        ))
                      )}
                      {alunoDaAba && (
                        <button
                          style={estilos.gerar}
                          onClick={handleGerarPDF} // Chamada sem passar argumentos, handleGerarPDF obtém do estado
                        >
                          Gerar PDF
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

  listaAlunos: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: "400px",
    marginBottom: "20px",
    borderRight: "2px solid #ccc",
    paddingRight: "10px",
  },

  itemAluno: {
    padding: "12px",
    cursor: "pointer",
    fontWeight: "500",
    borderRadius: "6px",
    marginBottom: "5px",
    boxShadow: "0 0 4px rgba(0,0,0,0.1)",
    transition: "background-color 0.2s",
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
  gerarIndividual: {
    backgroundColor: "#17a2b8",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  excluir: {
    backgroundColor: "#e63946",
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
