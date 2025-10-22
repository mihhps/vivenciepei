import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import BotaoVoltar from "../components/BotaoVoltar";
import "../styles/EditarAvaliacao.css";
import "../styles/NiveisDeAvaliacao.css"; // Essencial para as bolinhas

const niveis = ["NR", "AF", "AG", "AV", "AVi", "I", "NA"];

const formatarDataParaInput = (data) => {
  if (!data) return "";
  try {
    const dateObj = data instanceof Timestamp ? data.toDate() : new Date(data);
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

// --- ROTAS ADAPTADAS PARA O MÓDULO INDIVIDUAL ---
const ROTA_VER_AVALIACOES_INDIVIDUAL = "/ver-avaliacoes-individual";

export default function EditarAvaliacaoIndividual() {
  // RENOMEADO
  const { id } = useParams();
  const navigate = useNavigate();
  const [avaliacao, setAvaliacao] = useState(null);
  const [observacoes, setObservacoes] = useState({});
  const [respostas, setRespostas] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [areaSelecionada, setAreaSelecionada] = useState("");

  useEffect(() => {
    const carregarAvaliacao = async () => {
      try {
        // A coleção "avaliacoesIniciais" é a mesma, o que é ótimo para o reaproveitamento!
        const docRef = doc(db, "avaliacoesIniciais", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const dados = docSnap.data();
          setAvaliacao({
            id: docSnap.id,
            // Acessa o nome se 'dados.aluno' for um objeto, senão usa o próprio 'dados.aluno'
            aluno:
              typeof dados.aluno === "object" && dados.aluno !== null
                ? dados.aluno.nome
                : dados.aluno,
            ...dados,
            inicio: formatarDataParaInput(dados.inicio),
            proximaAvaliacao: formatarDataParaInput(dados.proximaAvaliacao),
          });
          setObservacoes(dados.observacoes || {});
          setRespostas(dados.respostas || {});
          setAreaSelecionada(Object.keys(avaliacaoInicial)[0] || "");
        } else {
          alert("Avaliação não encontrada.");
          // ROTA DE NAVEGAÇÃO ADAPTADA
          navigate(ROTA_VER_AVALIACOES_INDIVIDUAL);
        }
      } catch (erro) {
        console.error("Erro ao carregar avaliação:", erro);
      } finally {
        setCarregando(false);
      }
    };
    carregarAvaliacao();
  }, [id, navigate]);

  const handleResposta = (area, habilidade, nivel) => {
    setRespostas((prev) => ({
      ...prev,
      [area]: { ...prev[area], [habilidade]: nivel },
    }));
  };

  const handleObservacao = (area, texto) => {
    setObservacoes((prev) => ({ ...prev, [area]: texto }));
  };

  const handleSalvar = async () => {
    try {
      const docRef = doc(db, "avaliacoesIniciais", id);
      await updateDoc(docRef, {
        respostas,
        observacoes,
        inicio: avaliacao.inicio
          ? Timestamp.fromDate(new Date(avaliacao.inicio + "T00:00:00"))
          : null,
        proximaAvaliacao: avaliacao.proximaAvaliacao
          ? Timestamp.fromDate(
              new Date(avaliacao.proximaAvaliacao + "T00:00:00")
            )
          : null,
        ultimaEdicao: Timestamp.now(),
      });
      alert("Avaliação atualizada com sucesso!");
      // ROTA DE NAVEGAÇÃO ADAPTADA
      navigate(ROTA_VER_AVALIACOES_INDIVIDUAL);
    } catch (erro) {
      console.error("Erro ao salvar:", erro);
      alert("Erro ao salvar avaliação.");
    }
  };

  if (carregando)
    return (
      <p style={{ textAlign: "center", marginTop: "50px" }}>Carregando...</p>
    );

  return (
    <div className="fundo-pagina">
      <div className="card-principal">
        {/* ROTA DE NAVEGAÇÃO ADAPTADA */}
        <BotaoVoltar destino={ROTA_VER_AVALIACOES_INDIVIDUAL} />

        <h2 className="editar-titulo">
          Editar Avaliação -{" "}
          {typeof avaliacao?.aluno === "object" && avaliacao.aluno !== null
            ? avaliacao.aluno.nome
            : avaliacao?.aluno || "Aluno Não Informado"}
        </h2>

        {/* O restante da lógica de datas, abas, perguntas e salvamento de estado permanece
        EXATAMENTE IGUAL, pois é a lógica de dados que está sendo reaproveitada. */}

        <div className="datas-container">
          <div className="data-input-grupo">
            <label className="data-label">Data de Início:</label>
            <input
              type="date"
              className="data-input"
              value={avaliacao?.inicio || ""}
              onChange={(e) =>
                setAvaliacao((prev) => ({ ...prev, inicio: e.target.value }))
              }
            />
          </div>
          <div className="data-input-grupo">
            <label className="data-label">Próxima Avaliação:</label>
            <input
              type="date"
              className="data-input"
              value={avaliacao?.proximaAvaliacao || ""}
              onChange={(e) =>
                setAvaliacao((prev) => ({
                  ...prev,
                  proximaAvaliacao: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="abas-areas-container">
          {Object.keys(avaliacaoInicial).map((area) => (
            <button
              key={area}
              onClick={() => setAreaSelecionada(area)}
              className={`area-botao ${
                areaSelecionada === area ? "ativo" : ""
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {areaSelecionada && (
          <div className="area-conteudo">
            <h3>{areaSelecionada}</h3>
            {avaliacaoInicial[areaSelecionada].map((item, index) => (
              <div key={index} className="linha-habilidade">
                <div className="texto-habilidade">
                  <strong>{item.subarea}:</strong> {item.habilidade}
                </div>
                <div className="niveis-habilidade">
                  {niveis.map((nivel) => (
                    <div
                      key={nivel}
                      className={`circulo-nivel ${nivel} ${
                        respostas?.[areaSelecionada]?.[item.habilidade] ===
                        nivel
                          ? "ativo"
                          : ""
                      }`}
                      onClick={() =>
                        handleResposta(areaSelecionada, item.habilidade, nivel)
                      }
                    >
                      {nivel}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="observacoes-container">
              <label>Observações ({areaSelecionada}):</label>
              <textarea
                className="observacoes-textarea"
                value={observacoes?.[areaSelecionada] || ""}
                onChange={(e) =>
                  handleObservacao(areaSelecionada, e.target.value)
                }
              />
            </div>
          </div>
        )}

        <button onClick={handleSalvar} className="botao-salvar">
          Salvar Alterações
        </button>
      </div>
    </div>
  );
}
