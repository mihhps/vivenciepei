// src/pages/VincularEscolas.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getDocs, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import BotaoVoltar from "../components/BotaoVoltar";
import PropTypes from "prop-types";
import { toast, ToastContainer } from "react-toastify";
import "./VincularEscolas.css";

// --- Componente Auxiliar para renderizar os checkboxes de escolas ---
const EscolaCheckboxes = React.memo(
  ({ prof, escolas, edicoesPendentes, toggleEscola, salvarEscolas }) => {
    const hasPendingEdits = useMemo(() => {
      return (
        edicoesPendentes[prof.id] &&
        Object.keys(edicoesPendentes[prof.id]).length > 0
      );
    }, [edicoesPendentes, prof.id]);

    return (
      <div className="vinculacao-checkboxes">
        <h5 className="vinculacao-checkbox-titulo">Vincular escolas:</h5>
        <div className="vinculacao-checkbox-list">
          {escolas.map((escola) => {
            const isCurrentlyLinked = prof.escolas?.[escola.id] || false;
            const isPendingChange = edicoesPendentes[prof.id]?.[escola.id];

            const isChecked =
              isPendingChange !== undefined
                ? isPendingChange
                : isCurrentlyLinked;

            return (
              <label key={escola.id} className="vinculacao-checkbox-label">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() =>
                    toggleEscola(prof.id, escola.id, isCurrentlyLinked)
                  }
                />
                <span className="checkmark"></span>
                <span className="checkbox-text">{escola.nome}</span>
              </label>
            );
          })}
        </div>
        {hasPendingEdits && (
          <button
            onClick={() =>
              salvarEscolas(prof.id, edicoesPendentes[prof.id] || {})
            }
            className="vinculacao-botao-salvar"
          >
            Salvar alterações
          </button>
        )}
      </div>
    );
  }
);

EscolaCheckboxes.propTypes = {
  prof: PropTypes.object.isRequired,
  escolas: PropTypes.array.isRequired,
  edicoesPendentes: PropTypes.object.isRequired,
  toggleEscola: PropTypes.func.isRequired,
  salvarEscolas: PropTypes.func.isRequired,
};

// --- Componente Principal: VincularEscolas ---
export default function VincularEscolas() {
  const [profissionais, setProfissionais] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [modoEdicaoGeral, setModoEdicaoGeral] = useState(false);
  const [edicoesPendentes, setEdicoesPendentes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProfId, setExpandedProfId] = useState(null);
  const navigate = useNavigate();

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usuariosSnap = await getDocs(collection(db, "usuarios"));
      const escolasSnap = await getDocs(collection(db, "escolas"));

      const perfisParaVincular = [
        "professor",
        "diretor",
        "diretor adjunto",
        "orientador pedagogico",
        "orientador_pedagogico",
        "aee",
        "gestao",
      ];

      const usuariosFiltrados = usuariosSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((u) => perfisParaVincular.includes(u.perfil?.toLowerCase()));

      const escolasListadas = escolasSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProfissionais(usuariosFiltrados);
      setEscolas(escolasListadas);

      if (!escolaSelecionada && escolasListadas.length > 0) {
        setEscolaSelecionada(escolasListadas[0]);
      } else if (!escolaSelecionada && escolasListadas.length === 0) {
        setEscolaSelecionada("semVinculo");
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados. Por favor, tente novamente.");
      toast.error("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [escolaSelecionada]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const toggleEscola = useCallback((profId, escolaId, isOriginallyLinked) => {
    setEdicoesPendentes((prev) => {
      const professorEdicoes = { ...(prev[profId] || {}) };
      const newState =
        professorEdicoes[escolaId] !== undefined
          ? professorEdicoes[escolaId] === isOriginallyLinked
            ? undefined
            : !professorEdicoes[escolaId]
          : !isOriginallyLinked;

      if (newState === undefined) {
        delete professorEdicoes[escolaId];
      } else {
        professorEdicoes[escolaId] = newState;
      }

      if (Object.keys(professorEdicoes).length === 0) {
        const novo = { ...prev };
        delete novo[profId];
        return novo;
      }

      return { ...prev, [profId]: professorEdicoes };
    });
  }, []);

  const salvarEscolas = useCallback(
    async (profId, edicoesDoProfessor) => {
      setIsLoading(true);
      setError(null);
      try {
        const profissionalAtual = profissionais.find((p) => p.id === profId);
        if (!profissionalAtual) {
          throw new Error("Profissional não encontrado para salvar.");
        }

        const escolasFinais = { ...(profissionalAtual.escolas || {}) };
        for (const escolaId in edicoesDoProfessor) {
          if (edicoesDoProfessor[escolaId] === true) {
            escolasFinais[escolaId] = true;
          } else if (edicoesDoProfessor[escolaId] === false) {
            delete escolasFinais[escolaId];
          }
        }

        await updateDoc(doc(db, "usuarios", profId), {
          escolas: escolasFinais,
        });

        setEdicoesPendentes((prev) => {
          const novo = { ...prev };
          delete novo[profId];
          return novo;
        });

        await carregarDados();
        toast.success("Vínculos atualizados com sucesso!");
      } catch (err) {
        console.error("Erro ao salvar:", err);
        setError("Erro ao salvar vínculos. Por favor, tente novamente.");
        toast.error("Erro ao salvar vínculos. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    },
    [carregarDados, profissionais]
  );

  const profissionaisFiltradosParaExibicao = useMemo(() => {
    if (escolaSelecionada === "semVinculo") {
      return profissionais.filter(
        (prof) => !prof.escolas || Object.keys(prof.escolas).length === 0
      );
    } else if (escolaSelecionada && typeof escolaSelecionada === "object") {
      return profissionais.filter((prof) =>
        Object.keys(prof.escolas || {}).includes(escolaSelecionada.id)
      );
    }
    return [];
  }, [profissionais, escolaSelecionada]);

  if (isLoading && !error) {
    return <Loader />;
  }

  if (error && !isLoading) {
    return (
      <div className="vinculacao-container">
        <BotaoVoltar />
        <p className="error-message">{error}</p>
        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    );
  }

  return (
    <div className="vinculacao-container">
      <div className="vinculacao-card">
        <BotaoVoltar className="vinculacao-botao-voltar" />
        <h2 className="vinculacao-titulo">Vincular Escolas a Profissionais</h2>

        <div className="vinculacao-abas-container">
          {escolas.map((escola) => (
            <button
              key={escola.id}
              className={`vinculacao-aba ${escolaSelecionada?.id === escola.id ? "active" : ""}`}
              onClick={() => {
                setEscolaSelecionada(escola);
                setModoEdicaoGeral(false);
                setEdicoesPendentes({});
                setExpandedProfId(null);
              }}
            >
              {escola.nome}
            </button>
          ))}
          <button
            className={`vinculacao-aba ${escolaSelecionada === "semVinculo" ? "active" : ""}`}
            onClick={() => {
              setEscolaSelecionada("semVinculo");
              setModoEdicaoGeral(true);
              setEdicoesPendentes({});
              setExpandedProfId(null);
            }}
          >
            Sem vínculo
          </button>
        </div>

        {escolaSelecionada && (
          <div className="vinculacao-conteudo">
            <h3 className="vinculacao-subtitulo">
              {escolaSelecionada === "semVinculo"
                ? "Profissionais sem vínculo"
                : `Profissionais em ${escolaSelecionada.nome}`}
            </h3>

            {escolaSelecionada !== "semVinculo" && (
              <div className="vinculacao-acoes">
                {!modoEdicaoGeral ? (
                  <button
                    className="vinculacao-botao-edicao"
                    onClick={() => setModoEdicaoGeral(true)}
                  >
                    Editar vínculos
                  </button>
                ) : (
                  <button
                    className="vinculacao-botao-cancelar"
                    onClick={() => {
                      setModoEdicaoGeral(false);
                      setEdicoesPendentes({});
                      carregarDados();
                    }}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
            )}

            <div className="vinculacao-lista">
              {profissionaisFiltradosParaExibicao.length === 0 ? (
                <p className="info-message">
                  Nenhum profissional encontrado{" "}
                  {escolaSelecionada === "semVinculo"
                    ? "sem vínculo."
                    : `vinculado a ${escolaSelecionada?.nome}`}
                  .
                </p>
              ) : (
                profissionaisFiltradosParaExibicao.map((prof) => (
                  <div key={prof.id} className="vinculacao-profissional-card">
                    <div
                      className="vinculacao-profissional-header"
                      onClick={() =>
                        setExpandedProfId(
                          prof.id === expandedProfId ? null : prof.id
                        )
                      }
                    >
                      <h4>{prof.nome}</h4>
                      <span
                        className={`expand-icon ${prof.id === expandedProfId ? "expanded" : ""}`}
                      ></span>
                    </div>

                    <div
                      className={`vinculacao-profissional-detalhes ${prof.id === expandedProfId ? "expanded" : ""}`}
                    >
                      <p>
                        Perfil: <strong>{prof.perfil?.toUpperCase()}</strong>
                      </p>
                      <p className="vinculacao-profissional-cargo">
                        Cargo:{" "}
                        <strong>
                          {prof.cargo ||
                            prof.disciplina ||
                            prof.perfil ||
                            "Não informado"}
                        </strong>
                      </p>
                      <p className="vinculacao-profissional-email">
                        E-mail: <strong>{prof.email}</strong>
                      </p>

                      {escolaSelecionada === "semVinculo" || modoEdicaoGeral ? (
                        <EscolaCheckboxes
                          prof={prof}
                          escolas={escolas}
                          edicoesPendentes={edicoesPendentes}
                          toggleEscola={toggleEscola}
                          salvarEscolas={salvarEscolas}
                        />
                      ) : (
                        <div className="vinculacao-escolas-visualizacao">
                          <h5 className="vinculacao-checkbox-titulo">
                            Escolas vinculadas:
                          </h5>
                          <p>
                            {Object.keys(prof.escolas || {})
                              .map(
                                (id) => escolas.find((e) => e.id === id)?.nome
                              )
                              .filter(Boolean)
                              .join(", ") || "Nenhuma"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}
