import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import "../styles/EditarPei.css";

// IMPORTAÇÕES DOS DADOS PARA OBJETIVOS DE PRAZO
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

// --- Constantes de Níveis (já existentes) ---
const LEGENDA_NIVEIS = {
  NR: "Não realizou",
  AF: "Apoio físico",
  AG: "Apoio gestual",
  AV: "Apoio verbal",
  AVi: "Apoio visual",
  I: "Independente",
};

// --- Funções Auxiliares ---
const normalizarEstrategias = (estrategias) => {
  if (Array.isArray(estrategias)) return estrategias;
  if (typeof estrategias === "string" && estrategias) return [estrategias];
  return [];
};

// Componente principal
function EditarPei() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pei, setPei] = useState(null);
  const [atividadeAplicada, setAtividadeAplicada] = useState("");
  const [entradaManual, setEntradaManual] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

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

  const carregarPei = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const ref = doc(db, "peis", id);
      const docSnap = await getDoc(ref);
      if (!docSnap.exists()) {
        setErro("PEI não encontrado.");
        return;
      }

      const dados = docSnap.data();
      const resumoPeiProcessado = (dados.resumoPEI || []).map((meta) => {
        const estrategiasSalvas = normalizarEstrategias(
          meta.estrategias || meta.estrategiasSelecionadas
        ); // Adapta para nome antigo/novo de estratégias

        let objetivosCompletos = {
          curtoPrazo: "",
          medioPrazo: "",
          longoPrazo: "",
        };

        // Lógica para preencher os objetivos de curto, médio e longo prazo
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
          // Caso 3: Nenhuma informação de objetivo, tenta preencher tudo pelos mapas (pode ser um PEI recém-criado sem ter sido salvo ainda com todos os dados)
          objetivosCompletos.curtoPrazo =
            objetivosCurtoPrazoMap[meta.habilidade]?.[meta.nivelAlmejado] || "";
          objetivosCompletos.medioPrazo =
            objetivosMedioPrazoMap[meta.habilidade]?.[meta.nivelAlmejado] || "";
          objetivosCompletos.longoPrazo =
            estruturaPEIMap[meta.habilidade]?.[meta.nivelAlmejado]?.objetivo ||
            "";
        }

        return {
          ...meta,
          objetivos: objetivosCompletos, // A meta agora sempre terá o objeto de objetivos
          estrategias: estrategiasSalvas, // Estratégias já existentes
        };
      });

      setPei({ id, ...dados, resumoPEI: resumoPeiProcessado });
      setAtividadeAplicada(dados.atividadeAplicada || "");

      const entradaInicial = {};
      resumoPeiProcessado.forEach((meta) => {
        entradaInicial[meta.habilidade] = {
          estrategias: meta.estrategias, // As estratégias que já vieram do Firebase
          estrategiasManuais: "", // Inicia vazio para novas entradas manuais
        };
      });
      setEntradaManual(entradaInicial);
    } catch (error) {
      console.error("Erro ao carregar PEI:", error);
      setErro("Erro ao carregar dados do PEI. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [id, estruturaPEIMap, objetivosCurtoPrazoMap, objetivosMedioPrazoMap]); // Adiciona os mapas como dependências

  useEffect(() => {
    if (id) {
      carregarPei();
    } else {
      setErro("ID do PEI não fornecido.");
      setCarregando(false);
    }
  }, [id, carregarPei]);

  const handleSalvar = async () => {
    if (!pei) return alert("Não há dados do PEI para salvar.");
    setCarregando(true);
    setErro(null);
    try {
      const resumoAtualizado = pei.resumoPEI.map((meta) => {
        const entrada = entradaManual[meta.habilidade] || {};
        const estrategiasSelecionadas = entrada.estrategias || [];
        const estrategiasManuaisNovas = (entrada.estrategiasManuais || "")
          .split("\n")
          .map((e) => e.trim())
          .filter(Boolean);

        const todasEstrategias = [
          ...new Set([...estrategiasSelecionadas, ...estrategiasManuaisNovas]),
        ];

        // Retorna a meta com o objeto de objetivos original (não foi editado)
        // e as estratégias atualizadas.
        return {
          ...meta,
          estrategiasSelecionadas: todasEstrategias, // Garante que o nome do campo é 'estrategiasSelecionadas' ao salvar
          // O campo 'objetivos' já está na meta com os 3 prazos, não precisa ser alterado aqui.
        };
      });

      await updateDoc(doc(db, "peis", id), {
        // Assumindo que a coleção é 'peis' para edição
        resumoPEI: resumoAtualizado,
        atividadeAplicada: atividadeAplicada,
      });
      alert("PEI atualizado com sucesso! 🎉");
      navigate("/ver-peis");
    } catch (error) {
      console.error("Erro ao salvar PEI:", error);
      setErro("Erro ao salvar o PEI. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const handleRemoverMeta = (habilidadeMetaRemover) => {
    if (
      window.confirm(
        `Tem certeza que deseja remover a meta "${habilidadeMetaRemover}"?`
      )
    ) {
      setPei((prevPei) => {
        if (!prevPei) return null;
        const novaListaMetas = prevPei.resumoPEI.filter(
          (meta) => meta.habilidade !== habilidadeMetaRemover
        );
        return { ...prevPei, resumoPEI: novaListaMetas };
      });
      setEntradaManual((prevEntrada) => {
        const { [habilidadeMetaRemover]: _, ...novaEntradaManual } =
          prevEntrada;
        return novaEntradaManual;
      });
    }
  };

  const handleCheckboxChange = (habilidade, estrategia, estaMarcado) => {
    setEntradaManual((prev) => {
      const estrategiasAtuais = prev[habilidade]?.estrategias || [];
      const novasEstrategias = estaMarcado
        ? [...estrategiasAtuais, estrategia]
        : estrategiasAtuais.filter((est) => est !== estrategia);
      return {
        ...prev,
        [habilidade]: { ...prev[habilidade], estrategias: novasEstrategias },
      };
    });
  };

  // --- Renderização Condicional ---
  if (carregando)
    return (
      <div className="estado-container">
        <p>Carregando PEI...</p>
      </div>
    );
  if (erro)
    return (
      <div className="estado-container">
        <p className="mensagem-erro">{erro}</p>
        <BotaoVoltar />
      </div>
    );
  if (!pei)
    return (
      <div className="estado-container">
        <p>Nenhum PEI carregado ou encontrado para edição.</p>
        <BotaoVoltar />
      </div>
    );

  return (
    <div className="editar-pei-fundo">
      <div className="editar-pei-card">
        <BotaoVoltar />
        <h2 className="editar-pei-titulo">
          Editar PEI: {pei.aluno || "Aluno não identificado"}
        </h2>

        {(pei.resumoPEI || []).map((meta) => {
          const entrada = entradaManual[meta.habilidade] || {
            estrategias: [],
            estrategiasManuais: "",
          };

          // Garante que meta.objetivos é um objeto, mesmo se vier null/undefined
          const objetivosExibir = meta.objetivos || {};

          return (
            <article key={meta.habilidade} className="meta-card">
              <div className="meta-header">
                <h3 className="meta-card-titulo">{meta.habilidade}</h3>
                <button
                  onClick={() => handleRemoverMeta(meta.habilidade)}
                  className="botao-remover"
                  disabled={carregando}
                >
                  Remover
                </button>
              </div>
              <p>
                <strong>Nível atual:</strong> {meta.nivel} —{" "}
                {LEGENDA_NIVEIS[meta.nivel] || meta.nivel}
              </p>
              <p>
                <strong>Nível almejado:</strong> {meta.nivelAlmejado} —{" "}
                {LEGENDA_NIVEIS[meta.nivelAlmejado] || meta.nivelAlmejado}
              </p>

              {/* OBJETIVOS DE PRAZO - Agora como campos de texto desabilitados */}
              <div className="objetivos-prazo-container">
                <label className="label-objetivo-prazo">
                  Objetivo de Curto Prazo:
                  <textarea
                    value={objetivosExibir.curtoPrazo || "Não definido."}
                    readOnly
                    disabled // Desabilitado para não permitir edição
                    rows={2}
                    className="textarea-objetivo-prazo"
                  />
                </label>
                <label className="label-objetivo-prazo">
                  Objetivo de Médio Prazo:
                  <textarea
                    value={objetivosExibir.medioPrazo || "Não definido."}
                    readOnly
                    disabled // Desabilitado para não permitir edição
                    rows={2}
                    className="textarea-objetivo-prazo"
                  />
                </label>
                <label className="label-objetivo-prazo">
                  Objetivo de Longo Prazo:
                  <textarea
                    value={objetivosExibir.longoPrazo || "Não definido."}
                    readOnly
                    disabled // Desabilitado para não permitir edição
                    rows={2}
                    className="textarea-objetivo-prazo"
                  />
                </label>
              </div>
              {/* FIM DOS OBJETIVOS DE PRAZO */}

              <fieldset className="meta-fieldset">
                <legend className="meta-legend">Estratégias:</legend>
                {/* As estratégias virão do 'meta.estrategias' (sugeridas) ou de 'entrada.estrategias' (selecionadas) */}
                {normalizarEstrategias(meta.estrategias).map(
                  // Renderiza as estratégias sugeridas para seleção
                  (estrategia, i) => (
                    <div
                      key={`${estrategia}-${i}`}
                      className="checkbox-container"
                    >
                      <input
                        type="checkbox"
                        id={`estrategia-${meta.habilidade}-${i}`}
                        // Verifica se esta estratégia já está nas que foram selecionadas anteriormente
                        checked={entrada.estrategias.includes(estrategia)}
                        disabled={carregando}
                        onChange={(e) =>
                          handleCheckboxChange(
                            meta.habilidade,
                            estrategia,
                            e.target.checked
                          )
                        }
                        className="checkbox-input"
                      />
                      <label
                        htmlFor={`estrategia-${meta.habilidade}-${i}`}
                        className="checkbox-label"
                      >
                        {estrategia}
                      </label>
                    </div>
                  )
                )}
                <label
                  htmlFor={`estrategias-manuais-${meta.habilidade}`}
                  className="label-estrategias-manuais"
                >
                  Adicionar estratégias personalizadas (uma por linha):
                </label>
                <textarea
                  id={`estrategias-manuais-${meta.habilidade}`}
                  value={entrada.estrategiasManuais || ""}
                  disabled={carregando}
                  onChange={(e) =>
                    setEntradaManual((prev) => ({
                      ...prev,
                      [meta.habilidade]: {
                        ...prev[meta.habilidade],
                        estrategiasManuais: e.target.value,
                      },
                    }))
                  }
                  className="textarea-pei"
                  rows={3}
                  placeholder="Ex: Utilizar reforçador visual a cada 5 segundos de atenção."
                />
              </fieldset>
            </article>
          );
        })}

        <article className="meta-card">
          <h3 className="meta-card-titulo">Atividade Aplicada</h3>
          <label
            htmlFor="atividade-aplicada"
            className="label-estrategias-manuais"
          >
            Descreva a atividade que foi aplicada com o aluno:
          </label>
          <textarea
            id="atividade-aplicada"
            value={atividadeAplicada}
            onChange={(e) => setAtividadeAplicada(e.target.value)}
            className="textarea-pei"
            rows={4}
            placeholder="Ex: Brincadeira simbólica usando fantoches para desenvolver comunicação e imaginação..."
          />
        </article>

        <button
          className="botao-salvar"
          onClick={handleSalvar}
          disabled={carregando || !pei}
        >
          {carregando ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}

export default EditarPei;
