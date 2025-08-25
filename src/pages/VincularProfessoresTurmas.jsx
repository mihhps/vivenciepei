import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Loader from "../components/Loader";

import { useUserSchool } from "../hooks/useUserSchool";
import { useNavigate } from "react-router-dom";

import "./VincularProfessoresTurmas.css";

// FUNÇÃO DE PADRONIZAÇÃO FINAL E CORRIGIDA
// Garante que a string seja padronizada para o formato desejado (Ex: "Pré II A")
const normalizarTurma = (turma) => {
  if (typeof turma !== "string" || turma.trim() === "") {
    return null;
  }

  // Lista de exceções e padronizações
  const palavrasPadrao = {
    pré: "Pré",
    pe: "Pré",
    i: "I",
    ii: "II",
    a: "A",
    b: "B",
    ano: "Ano",
    // Adicione outras palavras-chave que você quer padronizar aqui, se necessário.
  };

  const partes = turma.trim().toLowerCase().split(" ");

  const partesCorrigidas = partes.map((palavra) => {
    // Se a palavra está na nossa lista de padronizações
    if (palavrasPadrao[palavra]) {
      return palavrasPadrao[palavra];
    }
    // Caso contrário, capitaliza a primeira letra, a menos que seja uma preposição
    if (
      palavra.length > 0 &&
      palavra !== "de" &&
      palavra !== "do" &&
      palavra !== "da"
    ) {
      return palavra[0].toUpperCase() + palavra.substr(1);
    }
    return palavra; // Retorna a palavra como está (ex: "de", "do", "da")
  });

  return partesCorrigidas.join(" ");
};

export default function VincularProfessoresTurmas() {
  const [professores, setProfessores] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [expandedProfId, setExpandedProfId] = useState(null);

  const navigate = useNavigate();

  const {
    userSchoolData,
    isLoading: isLoadingUserSchoolHook,
    error: userSchoolErrorHook,
  } = useUserSchool();

  const exibirMensagem = useCallback((tipo, texto) => {
    if (tipo === "erro") {
      toast.error(texto);
      setErro(texto);
    } else if (tipo === "sucesso") {
      toast.success(texto);
      setErro(null);
    }
  }, []);

  const carregarProfessores = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const perfilUsuario = userSchoolData?.perfil;
      const userSchoolIdParaQuery = userSchoolData?.escolaId;

      let professoresQuery;
      const perfisComFiltroPorEscola = [
        "aee",
        "gestao",
        "orientador pedagógico",
        "diretor",
        "diretor adjunto",
      ];
      const perfisComAcessoAmplo = ["seme", "desenvolvedor"];

      if (perfisComFiltroPorEscola.includes(perfilUsuario)) {
        if (!userSchoolIdParaQuery) {
          exibirMensagem(
            "erro",
            "Sua conta não está vinculada a uma escola para carregar professores. Contate o suporte."
          );
          setProfessores([]);
          setCarregando(false);
          return;
        }
        professoresQuery = query(
          collection(db, "usuarios"),
          where("perfil", "==", "professor"),
          where(`escolas.${userSchoolIdParaQuery}`, "==", true)
        );
      } else if (perfisComAcessoAmplo.includes(perfilUsuario)) {
        professoresQuery = query(
          collection(db, "usuarios"),
          where("perfil", "==", "professor")
        );
      } else {
        setProfessores([]);
      }

      const professoresSnap = await getDocs(professoresQuery);
      const fetchedProfessores = professoresSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProfessores(fetchedProfessores);
    } catch (err) {
      console.error("VincularProfessoresTurmas - Erro ao carregar dados:", err);
      exibirMensagem(
        "erro",
        "Erro ao carregar dados. Por favor, tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }, [userSchoolData, exibirMensagem]);

  useEffect(() => {
    if (!isLoadingUserSchoolHook && userSchoolData) {
      carregarProfessores();
    } else if (
      !isLoadingUserSchoolHook &&
      !userSchoolData &&
      userSchoolErrorHook
    ) {
      setCarregando(false);
      setErro(userSchoolErrorHook);
    }
  }, [
    carregarProfessores,
    isLoadingUserSchoolHook,
    userSchoolData,
    userSchoolErrorHook,
  ]);

  const carregarTurmas = useCallback(
    async (escolaId) => {
      if (!escolaId) {
        setTurmas([]);
        return;
      }

      try {
        const alunosQuery = query(
          collection(db, "alunos"),
          where("escolaId", "==", escolaId)
        );
        const snap = await getDocs(alunosQuery);

        const turmasSet = new Set();
        snap.docs.forEach((doc) => {
          const aluno = doc.data();
          if (aluno.turma) {
            // PADRONIZA O NOME DA TURMA ANTES DE ADICIONAR AO SET
            const nomeTurmaPadronizado = normalizarTurma(aluno.turma);
            if (nomeTurmaPadronizado) {
              turmasSet.add(nomeTurmaPadronizado);
            }
          }
        });
        // CONVERTE O SET PARA ARRAY E ORDENA
        const turmasArray = Array.from(turmasSet).sort((a, b) =>
          a.localeCompare(b)
        );

        setTurmas(turmasArray);
      } catch (err) {
        console.error(
          "VincularProfessoresTurmas - Erro ao carregar turmas:",
          err
        );
        exibirMensagem("erro", "Erro ao carregar turmas. Tente novamente.");
        setTurmas([]);
      }
    },
    [exibirMensagem]
  );

  const handleSelecionarProfessor = useCallback(
    async (prof) => {
      setSelecionado(prof);
      const escolasIds = Object.keys(prof.escolas || {});
      const primeiraEscolaId = escolasIds[0];
      await carregarTurmas(primeiraEscolaId);
      const turmasObj = prof.turmas || {};
      const turmasMarcadas = Object.keys(turmasObj)
        .filter((t) => turmasObj[t])
        // Usa a nova função de normalização para carregar as turmas selecionadas
        .map((t) => normalizarTurma(t));
      setTurmasSelecionadas(turmasMarcadas);
    },
    [carregarTurmas]
  );

  const handleToggleTurma = useCallback((turma) => {
    setTurmasSelecionadas((prev) => {
      // Usa a nova função de normalização para a verificação
      const turmaNormalizada = normalizarTurma(turma);
      if (prev.includes(turmaNormalizada)) {
        return prev.filter((t) => t !== turmaNormalizada);
      }
      return [...prev, turmaNormalizada];
    });
  }, []);

  const handleSalvar = async () => {
    if (!selecionado) {
      exibirMensagem("erro", "Selecione um professor antes de salvar.");
      return;
    }

    try {
      setCarregando(true);
      const turmasObj = {};
      turmasSelecionadas.forEach((turma) => {
        turmasObj[turma] = true;
      });

      await updateDoc(doc(db, "usuarios", selecionado.id), {
        turmas: turmasObj,
      });

      exibirMensagem("sucesso", "Vínculo de turmas atualizado com sucesso!");
    } catch (error) {
      console.error(
        "VincularProfessoresTurmas - Erro ao salvar turmas:",
        error
      );
      exibirMensagem("erro", "Erro ao salvar turmas.");
    } finally {
      setCarregando(false);
    }
  };

  if (isLoadingUserSchoolHook || carregando) {
    return <Loader />;
  }

  if (erro || userSchoolErrorHook) {
    return (
      <div className="vinculacao-container erro">
        <div className="vinculacao-card">
          <BotaoVoltar />
          <p className="error-message">{erro || userSchoolErrorHook}</p>
        </div>
        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    );
  }

  return (
    <div className="vinculacao-container">
      <div className="vinculacao-card">
        <BotaoVoltar />
        <h2 className="vinculacao-titulo">Vincular Professores às Turmas</h2>

        <div className="vinculacao-lista">
          {professores.length === 0 ? (
            <p className="info-message">
              Nenhum professor encontrado com o seu perfil de acesso.
            </p>
          ) : (
            professores.map((prof) => (
              <div key={prof.id} className="vinculacao-profissional-card">
                <div
                  className="vinculacao-profissional-header"
                  onClick={() => {
                    setExpandedProfId(
                      prof.id === expandedProfId ? null : prof.id
                    );
                    if (prof.id !== expandedProfId) {
                      handleSelecionarProfessor(prof);
                    } else {
                      setSelecionado(null);
                    }
                  }}
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
                      {prof.cargo || prof.disciplina || "Não informado"}
                    </strong>
                  </p>
                  <p className="vinculacao-profissional-email">
                    E-mail: <strong>{prof.email}</strong>
                  </p>
                  <div className="vinculacao-turmas">
                    <h5 className="vinculacao-checkbox-titulo">
                      Turmas disponíveis:
                    </h5>
                    <div className="vinculacao-turmas-scroll">
                      <div className="vinculacao-checkbox-list-container">
                        {turmas.length > 0 ? (
                          turmas.map((turma) => (
                            <label
                              key={turma}
                              className="vinculacao-checkbox-label"
                            >
                              <input
                                type="checkbox"
                                // A verificação agora usa a string padronizada
                                checked={turmasSelecionadas.includes(turma)}
                                // O valor da turma passado para o handler é o nome padronizado
                                onChange={() => handleToggleTurma(turma)}
                              />
                              <span className="checkmark"></span>
                              {/* O nome já está padronizado para exibição */}
                              <span className="checkbox-text">{turma}</span>
                            </label>
                          ))
                        ) : (
                          <p className="info-message">
                            Nenhuma turma encontrada para esta escola.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSalvar}
                    className="vinculacao-botao-salvar"
                    disabled={carregando}
                  >
                    Salvar Vínculo
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    </div>
  );
}
