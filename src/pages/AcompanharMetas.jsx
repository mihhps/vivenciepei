import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import BotaoVoltar from "../components/BotaoVoltar";
import "../styles/AcompanharMetas.css";

export default function AcompanharMetas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [pei, setPei] = useState(null);
  const [statusMetas, setStatusMetas] = useState({});
  const [observacoes, setObservacoes] = useState([]);
  const [novaObservacao, setNovaObservacao] = useState({});
  const [carregando, setCarregando] = useState(true);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const peiRef = doc(db, "peis", id);
      const peiSnap = await getDoc(peiRef);

      if (!peiSnap.exists()) {
        alert("PEI não encontrado.");
        return navigate("/ver-peis");
      }

      const dadosPEI = peiSnap.data();
      setPei(dadosPEI);
      setStatusMetas(dadosPEI.acompanhamento || {});

      const obsQuery = query(
        collection(db, "peis", id, "observacoes"),
        orderBy("data", "desc")
      );
      const obsSnap = await getDocs(obsQuery);
      const listaObs = obsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setObservacoes(listaObs);
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
      alert("Erro ao carregar dados.");
    } finally {
      setCarregando(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleStatusChange = async (habilidade, status) => {
    const statusAtual = statusMetas[habilidade]?.status;
    const novoStatus = statusAtual === status ? "" : status;

    const novosStatus = {
      ...statusMetas,
      [habilidade]: { status: novoStatus },
    };
    setStatusMetas(novosStatus);

    try {
      await updateDoc(doc(db, "peis", id), {
        acompanhamento: novosStatus,
        ultimaAtualizacao: Timestamp.now(),
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleSalvarObservacao = async (habilidade) => {
    const registroAtual = novaObservacao[habilidade] || {
      texto: "",
      estrategias: {},
    };
    const texto = registroAtual.texto;
    if (!texto || texto.trim() === "") {
      alert("A observação não pode estar vazia.");
      return;
    }

    const estrategiasAplicadas = Object.keys(
      registroAtual.estrategias || {}
    ).filter((key) => registroAtual.estrategias[key]);

    try {
      const novaObs = {
        habilidade,
        texto,
        estrategiasAplicadas,
        autor: userProfile?.nome || "Usuário Desconhecido",
        data: Timestamp.now(),
      };

      const obsRef = await addDoc(
        collection(db, "peis", id, "observacoes"),
        novaObs
      );
      setObservacoes((prev) => [{ id: obsRef.id, ...novaObs }, ...prev]);
      setNovaObservacao((prev) => ({
        ...prev,
        [habilidade]: { texto: "", estrategias: {} },
      }));
    } catch (erro) {
      console.error("Erro ao salvar observação:", erro);
      alert("Erro ao salvar observação.");
    }
  };

  const handleExcluirObservacao = async (obsId, habilidade) => {
    if (window.confirm("Tem certeza de que deseja excluir esta observação?")) {
      try {
        await deleteDoc(doc(db, "peis", id, "observacoes", obsId));

        setObservacoes((prev) => prev.filter((obs) => obs.id !== obsId));

        console.log(
          `Observação ${obsId} de ${habilidade} excluída com sucesso.`
        );
      } catch (error) {
        console.error("Erro ao excluir observação:", error);
        alert("Erro ao excluir observação. Tente novamente.");
      }
    }
  };

  const handleTextoObservacaoChange = (habilidade, texto) => {
    setNovaObservacao((prev) => ({
      ...prev,
      [habilidade]: {
        ...(prev[habilidade] || { estrategias: {} }),
        texto: texto,
      },
    }));
  };

  const handleEstrategiaChange = (habilidade, estrategia) => {
    setNovaObservacao((prev) => ({
      ...prev,
      [habilidade]: {
        ...(prev[habilidade] || { texto: "" }),
        estrategias: {
          ...(prev[habilidade]?.estrategias || {}),
          [estrategia]: !prev[habilidade]?.estrategias?.[estrategia],
        },
      },
    }));
  };

  const formatarData = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (carregando) return <p className="carregando">Carregando PEI...</p>;

  return (
    <div className="acompanhamento-wrapper">
      <div className="acompanhamento-card">
        <BotaoVoltar destino="/ver-peis" />
        <h2 className="titulo-pagina">Acompanhamento de Metas</h2>
        <h3 className="subtitulo-pagina">{pei.nomeAluno}</h3>

        {pei.resumoPEI?.map((meta) => {
          const observacoesDaMeta = observacoes.filter(
            (obs) => obs.habilidade === meta.habilidade
          );

          return (
            <div key={meta.habilidade} className="meta-bloco">
              <h4>{meta.habilidade}</h4>
              <p className="meta-info-subtitulo">
                <strong>Área:</strong> {meta.area} |{" "}
                <strong>Nível Almejado:</strong> {meta.nivelAlmejado}
              </p>

              {meta.objetivos && (
                <div className="objetivos-bloco">
                  <h5>Objetivos Traçados</h5>
                  <p>
                    <strong>Curto Prazo:</strong> {meta.objetivos.curtoPrazo}
                  </p>
                  <p>
                    <strong>Médio Prazo:</strong> {meta.objetivos.medioPrazo}
                  </p>
                  <p>
                    <strong>Longo Prazo:</strong> {meta.objetivos.longoPrazo}
                  </p>
                </div>
              )}

              {meta.estrategias && meta.estrategias.length > 0 && (
                <div className="estrategias-planejadas-bloco">
                  <h5>Estratégias Planejadas</h5>
                  <ul>
                    {meta.estrategias.map((est, i) => (
                      <li key={i}>{est}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="botoes-status">
                {["Não Iniciado", "Em Andamento", "Concluído"].map((opcao) => {
                  const statusAtual = statusMetas[meta.habilidade]?.status;
                  return (
                    <button
                      key={opcao}
                      type="button"
                      className={`botao-status ${statusAtual === opcao ? "ativo" : ""} ${opcao.toLowerCase().replace(" ", "-")}`}
                      onClick={() => handleStatusChange(meta.habilidade, opcao)}
                    >
                      {opcao}
                    </button>
                  );
                })}
              </div>

              <div className="diario-de-bordo">
                <h5>Diário de Bordo da Meta</h5>
                <div className="nova-observacao">
                  <textarea
                    placeholder="Adicionar novo registro sobre o progresso desta meta..."
                    value={novaObservacao[meta.habilidade]?.texto || ""}
                    onChange={(e) =>
                      handleTextoObservacaoChange(
                        meta.habilidade,
                        e.target.value
                      )
                    }
                  />

                  {meta.estrategias && meta.estrategias.length > 0 && (
                    <div className="estrategias-checkbox-wrapper">
                      <label>
                        Quais estratégias você utilizou neste registro?
                      </label>
                      <div className="checkbox-group">
                        {meta.estrategias.map((est, i) => (
                          <div key={i} className="checkbox-item">
                            <input
                              type="checkbox"
                              id={`${meta.habilidade}-${i}`}
                              checked={
                                novaObservacao[meta.habilidade]?.estrategias?.[
                                  est
                                ] || false
                              }
                              onChange={() =>
                                handleEstrategiaChange(meta.habilidade, est)
                              }
                            />
                            <label htmlFor={`${meta.habilidade}-${i}`}>
                              {est}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleSalvarObservacao(meta.habilidade)}
                  >
                    Adicionar Registro
                  </button>
                </div>

                <div className="lista-observacoes">
                  {observacoesDaMeta.length > 0 ? (
                    observacoesDaMeta.map((obs) => (
                      <div key={obs.id} className="observacao-item">
                        <p className="texto">{obs.texto}</p>

                        {/* Botão de Excluir com ícone de lixeira */}
                        <button
                          className="botao-excluir-obs"
                          onClick={() =>
                            handleExcluirObservacao(obs.id, meta.habilidade)
                          }
                        >
                          Excluir
                        </button>
                        {obs.estrategiasAplicadas &&
                          obs.estrategiasAplicadas.length > 0 && (
                            <div className="estrategias-aplicadas">
                              {obs.estrategiasAplicadas.map((est) => (
                                <span key={est} className="tag-estrategia">
                                  {est}
                                </span>
                              ))}
                            </div>
                          )}

                        <p className="meta-info">
                          <strong>{obs.autor}</strong> em{" "}
                          {formatarData(obs.data)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="sem-observacoes">
                      Nenhum registro encontrado para esta meta.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
