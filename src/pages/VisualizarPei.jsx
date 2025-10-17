import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar";
import { FaUserCircle } from "react-icons/fa"; // NOVO: Ícone para placeholder

// Importações dos dados
import estruturaPEI from "../data/estruturaPEI2";
import objetivosCurtoPrazoData from "../data/objetivosCurtoPrazo";
import objetivosMedioPrazoData from "../data/objetivosMedioPrazo";

// --- Funções de Mapeamento de Dados (Mantidas) ---
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

const coresPorNivel = {
  // Ajuste se precisar de mais cores para os níveis ou se as siglas mudaram
  NR: "#ffcccc",
  AF: "#fff2cc",
  AG: "#d0f0c0",
  AV: "#eeeeee",
  AVi: "#cce5ff",
  I: "#f0ccff",
};

function calcularIdadeEFaixa(nascimento) {
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
}

function formatarData(data) {
  if (!data) return "-";
  const dateObj =
    typeof data.toDate === "function" ? data.toDate() : new Date(data);
  if (isNaN(dateObj.getTime())) return "-";
  const dia = String(dateObj.getDate()).padStart(2, "0");
  const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
  const ano = dateObj.getFullYear();
  return `${dia}-${mes}-${ano}`;
}

// NOVO: Função para calcular a idade exata em anos e meses
const calcularIdadeCompleta = (dataNascimentoString) => {
  if (!dataNascimentoString) return "N/A";

  const dataNascimento = new Date(dataNascimentoString);
  const hoje = new Date();

  if (isNaN(dataNascimento)) return "N/A";

  let anos = hoje.getFullYear() - dataNascimento.getFullYear();
  let meses = hoje.getMonth() - dataNascimento.getMonth();

  if (meses < 0 || (meses === 0 && hoje.getDate() < dataNascimento.getDate())) {
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

export default function VisualizarPei() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [pei, setPei] = useState(null);
  const [alunoInfo, setAlunoInfo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const estruturaPEIMap = useMemo(() => getEstruturaPEIMap(estruturaPEI), []);
  const objetivosCurtoPrazoMap = useMemo(
    () => getObjetivosPrazoMap(objetivosCurtoPrazoData),
    []
  );
  const objetivosMedioPrazoMap = useMemo(
    () => getObjetivosPrazoMap(objetivosMedioPrazoData),
    []
  );

  const carregarPei = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      let loadedPei = null;
      let loadedAluno = null;

      // 1. Tentar carregar o PEI do location.state
      if (location.state && location.state.pei) {
        loadedPei = location.state.pei;
        if (location.state.aluno) {
          loadedAluno = location.state.aluno;
        }
      } else {
        // 2. Se não estiver no location.state, buscar no Firebase
        const peiRef = doc(db, "peis", id);
        const peiSnap = await getDoc(peiRef);

        if (!peiSnap.exists()) {
          setErro("PEI não encontrado.");
          setCarregando(false);
          return;
        }
        loadedPei = { id: peiSnap.id, ...peiSnap.data() };
      }

      // 3. Buscar informações completas do aluno, se ainda não tiver
      if (!loadedAluno && loadedPei.alunoId) {
        const alunoRef = doc(db, "alunos", loadedPei.alunoId);
        const alunoSnap = await getDoc(alunoRef);
        if (alunoSnap.exists()) {
          loadedAluno = { id: alunoSnap.id, ...alunoSnap.data() };
        }
      }

      if (!loadedAluno) {
        setErro("Dados do aluno não encontrados para este PEI.");
        setCarregando(false);
        return;
      }

      // Processar resumoPEI para garantir o objeto 'objetivos' com os 3 prazos
      const resumoProcessado = (loadedPei.resumoPEI || []).map((meta) => {
        let objetivosCompletos = {
          curtoPrazo: "",
          medioPrazo: "",
          longoPrazo: "",
        };

        if (meta.objetivos && typeof meta.objetivos === "object") {
          // Caso 1: PEI salvo na nova estrutura (objetivos é um objeto)
          objetivosCompletos.curtoPrazo =
            meta.objetivos.curtoPrazo ||
            objetivosCurtoPrazoMap[meta.habilidade]?.[meta.nivelAlmejado] ||
            "";
          objetivosCompletos.medioPrazo =
            meta.objetivos.medioPrazo ||
            objetivosMedioPrazoMap[meta.habilidade]?.[meta.nivelAlmejado] ||
            "";
          objetivosCompletos.longoPrazo =
            meta.objetivos.longoPrazo ||
            estruturaPEIMap[meta.habilidade]?.[meta.nivelAlmejado]?.objetivo ||
            "";
        } else if (typeof meta.objetivo === "string") {
          // Caso 2: PEI salvo na estrutura antiga (objetivo era uma string, que assumimos ser o Longo Prazo)
          objetivosCompletos.longoPrazo = meta.objetivo; // O objetivo antigo é o Longo Prazo
          objetivosCompletos.curtoPrazo =
            objetivosCurtoPrazoMap[meta.habilidade]?.[meta.nivelAlmejado] || "";
          objetivosCompletos.medioPrazo =
            objetivosMedioPrazoMap[meta.habilidade]?.[meta.nivelAlmejado] || "";
        } else {
          // Caso 3: Nenhuma informação de objetivo, tenta preencher tudo pelos mapas
          objetivosCompletos.curtoPrazo =
            objetivosCurtoPrazoMap[meta.habilidade]?.[meta.nivelAlmejado] || "";
          objetivosCompletos.medioPrazo =
            objetivosMedioPrazoMap[meta.habilidade]?.[meta.nivelAlmejado] || "";
          objetivosCompletos.longoPrazo =
            estruturaPEIMap[meta.habilidade]?.[meta.nivelAlmejado]?.objetivo ||
            "";
        }

        // Garante que 'estrategias' ou 'estrategiasSelecionadas' seja um array
        const estrategiasPadrao = Array.isArray(meta.estrategias)
          ? meta.estrategias
          : Array.isArray(meta.estrategiasSelecionadas)
          ? meta.estrategiasSelecionadas
          : [];

        return {
          ...meta,
          objetivos: objetivosCompletos,
          estrategias: estrategiasPadrao, // Use 'estrategias' para o que será mapeado
        };
      });

      setPei({ ...loadedPei, resumoPEI: resumoProcessado });
      setAlunoInfo(loadedAluno);
    } catch (error) {
      console.error("Erro ao carregar PEI:", error);
      setErro("Erro ao carregar dados do PEI. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [
    id,
    location.state,
    estruturaPEIMap,
    objetivosCurtoPrazoMap,
    objetivosMedioPrazoMap,
  ]);

  useEffect(() => {
    carregarPei();
  }, [carregarPei]);

  if (carregando) {
    return <div style={{ padding: "40px" }}>Carregando PEI...</div>;
  }

  if (erro) {
    return (
      <div style={estilos.container}>
        <div style={estilos.card}>
          <BotaoVoltar />
          <p style={{ color: "red" }}>{erro}</p>
        </div>
      </div>
    );
  }

  if (!pei || !alunoInfo) {
    return (
      <div style={estilos.container}>
        <div style={estilos.card}>
          <BotaoVoltar />
          <p>Nenhum PEI ou dados do aluno carregados.</p>
        </div>
      </div>
    );
  }

  const [idade, faixa] = calcularIdadeEFaixa(alunoInfo.nascimento);
  const idadeCompletaExibicao = calcularIdadeCompleta(alunoInfo.nascimento); // Idade formatada
  const alunoTea =
    alunoInfo.diagnostico &&
    alunoInfo.diagnostico.toLowerCase().includes("tea");

  const metasAgrupadas = {};
  pei.resumoPEI?.forEach((meta) => {
    const areaName = meta.area || "Sem Área";
    if (!metasAgrupadas[areaName]) metasAgrupadas[areaName] = {};
    const subareaName = meta.subarea || "Sem Subárea";
    if (!metasAgrupadas[areaName][subareaName])
      metasAgrupadas[areaName][subareaName] = [];
    metasAgrupadas[areaName][subareaName].push(meta);
  });

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <BotaoVoltar to={location.state?.voltarPara || "/ver-peis"} />
        <h2 style={estilos.titulo}>Plano Educacional Individualizado (PEI)</h2>

        {/* --- NOVO BLOCO: INFORMAÇÕES DO ALUNO (FOTO/DETALHES) --- */}
        <div style={estilos.infoGeralContainer}>
          {/* FOTO / PLACEHOLDER */}
          <div style={estilos.fotoContainer}>
            {alunoInfo.fotoUrl ? (
              <img
                src={alunoInfo.fotoUrl}
                alt={`Foto de ${alunoInfo.nome}`}
                style={estilos.foto}
              />
            ) : (
              <FaUserCircle style={estilos.fotoPlaceholder} />
            )}
          </div>

          {/* DETALHES */}
          <div style={estilos.detalhesWrapper}>
            <h3 style={estilos.nomeText}>
              {alunoInfo.nome}
              {alunoTea && (
                <FaPuzzlePiece style={estilos.teaBadge} title="Aluno com TEA" />
              )}
            </h3>
            <p style={estilos.detalhe}>
              <strong>Idade:</strong> {idadeCompletaExibicao}
            </p>
            <p style={estilos.detalhe}>
              <strong>Turma:</strong> {alunoInfo.turma || pei.turma}
            </p>
            <p style={estilos.detalhe}>
              <strong>Diagnóstico:</strong> {alunoInfo.diagnostico || "-"}
            </p>
          </div>
        </div>
        {/* --- FIM DO BLOCO FOTO/DETALHES --- */}

        <div style={estilos.infoPei}>
          <p>
            <strong>Início do PEI:</strong> {formatarData(pei.dataCriacao)}
          </p>
          <p>
            <strong>Última Revisão:</strong>{" "}
            {formatarData(pei.dataUltimaRevisao) ||
              formatarData(pei.dataCriacao)}
          </p>
          <p>
            <strong>Elaborado por:</strong> {pei.nomeCriador || "-"}
          </p>
        </div>

        <h3 style={estilos.subtitulo}>Metas por Área</h3>

        {Object.entries(metasAgrupadas).map(([area, subareas], i) => (
          <div key={i} style={{ marginBottom: "40px" }}>
            <h4 style={estilos.tituloArea}>{area}</h4>
            {Object.entries(subareas).map(([subarea, metas], j) => (
              <div key={j} style={estilos.blocoSubarea}>
                {subarea !== "Sem Subárea" && (
                  <h5 style={estilos.tituloSubarea}>{subarea}</h5>
                )}
                <table style={estilos.tabela}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef2f5" }}>
                      <th style={estilos.cell}>Habilidade</th>
                      <th style={estilos.cellNivel}>Nível Atual</th>
                      <th style={estilos.cellNivel}>Nível Almejado</th>
                      <th style={estilos.cell}>Objetivos (CP/MP/LP)</th>
                      <th style={estilos.cell}>Estratégias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metas.map((meta, k) => (
                      <tr
                        key={k}
                        style={{
                          backgroundColor:
                            coresPorNivel[meta.nivel] || "#ffffff",
                        }}
                      >
                        <td style={estilos.cell}>{meta.habilidade}</td>
                        <td style={estilos.cellNivel}>{meta.nivel}</td>
                        <td style={estilos.cellNivel}>{meta.nivelAlmejado}</td>
                        <td style={estilos.cell}>
                          <p>
                            <strong>Curto Prazo:</strong>{" "}
                            {meta.objetivos?.curtoPrazo || "N/D"}
                          </p>
                          <p>
                            <strong>Médio Prazo:</strong>{" "}
                            {meta.objetivos?.medioPrazo || "N/D"}
                          </p>
                          <p>
                            <strong>Longo Prazo:</strong>{" "}
                            {meta.objetivos?.longoPrazo || "N/D"}
                          </p>
                        </td>
                        <td style={estilos.cell}>
                          <ul>
                            {meta.estrategias && meta.estrategias.length > 0 ? (
                              meta.estrategias.map((estrat, i) => (
                                <li key={i}>{estrat}</li>
                              ))
                            ) : (
                              <li>Nenhuma estratégia definida.</li>
                            )}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}

        {pei.atividadeAplicada && (
          <div style={estilos.blocoSubarea}>
            <h3 style={estilos.subtitulo}>Atividade Aplicada</h3>
            <table style={estilos.tabela}>
              <thead>
                <tr style={{ backgroundColor: "#eef2f5" }}>
                  <th style={estilos.cell}>Descrição da Atividade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={estilos.cell}>{pei.atividadeAplicada}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: "50px", textAlign: "right" }}>
          <p>
            <strong>Criado por:</strong> {pei.nomeCriador || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

const estilos = {
  container: {
    display: "flex",
    justifyContent: "center",
    padding: "40px",
    fontFamily: "'Segoe UI', sans-serif",
    backgroundColor: "#f8f9fa",
  },
  card: {
    width: "100%",
    maxWidth: "1000px",
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 0 20px rgba(0,0,0,0.1)",
    position: "relative",
  },
  titulo: {
    textAlign: "center",
    fontSize: "24px",
    color: "#1d3557",
    marginBottom: "30px",
    marginTop: "20px",
    borderBottom: "1px solid #e0e0e0",
    paddingBottom: "10px",
  },
  subtitulo: {
    fontSize: "20px",
    marginBottom: "15px",
    color: "#333",
  },
  // Novo estilo para o título da área para diferenciá-lo do subtítulo da subárea
  tituloArea: {
    fontSize: "1.5em",
    color: "#1d3557",
    marginBottom: "15px",
    borderBottom: "2px solid #1d3557",
    paddingBottom: "5px",
  },
  tituloSubarea: {
    fontSize: "1.1em",
    color: "#457b9d",
    marginBottom: "10px",
    fontWeight: "bold",
  },
  // --- ESTILOS DE INFORMAÇÃO GERAL (FOTO/DETALHES) ---
  infoGeralContainer: {
    display: "flex",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "30px",
    padding: "15px",
    backgroundColor: "#f7f9fc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  fotoContainer: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    border: "3px solid #4c51bf",
    backgroundColor: "#edf2f7",
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
  infoPei: {
    fontSize: "1em",
    lineHeight: "1.8",
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#eef5f9",
    borderRadius: "10px",
    border: "1px solid #d0e0ea",
  },
  // --- FIM DOS ESTILOS DE INFORMAÇÃO GERAL ---

  blocoSubarea: {
    marginBottom: "30px",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    backgroundColor: "#fafafa",
  },
  tabela: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9em",
  },
  cell: {
    border: "1px solid #ccc",
    padding: "8px",
    verticalAlign: "top",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  cellNivel: {
    border: "1px solid #ccc",
    padding: "8px",
    verticalAlign: "middle",
    textAlign: "center",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
};
