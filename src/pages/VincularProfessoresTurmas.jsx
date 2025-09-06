import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  setDoc,
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loader from "../components/Loader";
import { useUserSchool } from "../hooks/useUserSchool";
import { useNavigate } from "react-router-dom";
import { PERFIS } from "../config/constants";

import "./VincularProfessoresTurmas.css";

// FUNÇÃO DE PADRONIZAÇÃO (permanece igual)
const normalizarTurma = (turma) => {
  if (typeof turma !== "string" || turma.trim() === "") return null;
  const palavrasPadrao = {
    pré: "Pré",
    pe: "Pré",
    i: "I",
    ii: "II",
    a: "A",
    b: "B",
    ano: "Ano",
  };
  const partes = turma.trim().toLowerCase().split(" ");
  const partesCorrigidas = partes.map((palavra) => {
    if (palavrasPadrao[palavra]) return palavrasPadrao[palavra];
    if (palavra.length > 0 && !["de", "do", "da"].includes(palavra)) {
      return palavra[0].toUpperCase() + palavra.substr(1);
    }
    return palavra;
  });
  return partesCorrigidas.join(" ");
};

export default function VincularProfessoresTurmas() {
  const [profissionais, setProfissionais] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState(null);
  const [expandedProfId, setExpandedProfId] = useState(null);

  const { userSchoolData, isLoadingUserSchool, userSchoolId, userSchoolError } =
    useUserSchool();

  const exibirMensagem = useCallback((tipo, texto) => {
    if (tipo === "erro") toast.error(texto);
    else if (tipo === "sucesso") toast.success(texto);
  }, []);

  const carregarProfissionais = useCallback(async () => {
    setCarregandoDados(true);
    setErro(null);
    const perfilUsuario = userSchoolData?.perfil?.toLowerCase();
    const userSchoolIdParaQuery = userSchoolId;
    if (
      !userSchoolIdParaQuery &&
      !["seme", "desenvolvedor"].includes(perfilUsuario)
    ) {
      exibirMensagem(
        "erro",
        "Sua conta não está vinculada a uma escola para carregar profissionais."
      );
      setProfissionais([]);
      setCarregandoDados(false);
      return;
    }
    try {
      const perfisParaVincular = [
        PERFIS.PROFESSOR,
        PERFIS.AEE,
        PERFIS.ORIENTADOR_PEDAGOGICO,
        PERFIS.DIRETOR,
        PERFIS.DIRETOR_ADJUNTO,
        PERFIS.GESTAO,
      ].map((p) => p.toLowerCase());
      let profissionaisQuery;
      if (["seme", "desenvolvedor"].includes(perfilUsuario)) {
        profissionaisQuery = query(
          collection(db, "usuarios"),
          where("perfil", "in", perfisParaVincular)
        );
      } else {
        profissionaisQuery = query(
          collection(db, "usuarios"),
          where("perfil", "in", perfisParaVincular),
          where(`escolas.${userSchoolIdParaQuery}`, "==", true)
        );
      }
      const profissionaisSnap = await getDocs(profissionaisQuery);
      const fetchedProfissionais = profissionaisSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProfissionais(fetchedProfissionais);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      exibirMensagem("erro", "Erro ao carregar dados. Tente novamente.");
    } finally {
      setCarregandoDados(false);
    }
  }, [userSchoolData, userSchoolId, exibirMensagem]);

  useEffect(() => {
    if (!isLoadingUserSchool && userSchoolData) {
      carregarProfissionais();
    }
  }, [isLoadingUserSchool, userSchoolData, carregarProfissionais]);

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
            const nomeTurmaPadronizado = normalizarTurma(aluno.turma);
            if (nomeTurmaPadronizado) turmasSet.add(nomeTurmaPadronizado);
          }
        });
        setTurmas(Array.from(turmasSet).sort((a, b) => a.localeCompare(b)));
      } catch (err) {
        console.error("Erro ao carregar turmas:", err);
        exibirMensagem("erro", "Erro ao carregar turmas. Tente novamente.");
        setTurmas([]);
      }
    },
    [exibirMensagem]
  );

  const handleSelecionarProfissional = useCallback(
    async (prof) => {
      setSelecionado(prof);
      const escolasIds = Object.keys(prof.escolas || {});
      const primeiraEscolaId = escolasIds[0];

      if (!primeiraEscolaId) {
        exibirMensagem(
          "erro",
          `O profissional ${prof.nome} não está vinculado a nenhuma escola.`
        );
        setTurmas([]);
      } else {
        await carregarTurmas(primeiraEscolaId);
      }

      const turmasObj = prof.turmas || {};
      const turmasMarcadas = Object.keys(turmasObj)
        .filter((t) => turmasObj[t])
        .map((t) => normalizarTurma(t));
      setTurmasSelecionadas(turmasMarcadas);
    },
    [carregarTurmas, exibirMensagem]
  );

  const handleToggleTurma = useCallback((turma) => {
    setTurmasSelecionadas((prev) => {
      const turmaNormalizada = normalizarTurma(turma);
      if (prev.includes(turmaNormalizada)) {
        return prev.filter((t) => t !== turmaNormalizada);
      }
      return [...prev, turmaNormalizada];
    });
  }, []);

  const handleSalvar = async () => {
    if (!selecionado) {
      exibirMensagem("erro", "Selecione um profissional antes de salvar.");
      return;
    }

    // --- ALTERAÇÃO AQUI: ADICIONANDO ORIENTADOR_PEDAGOGICO NA LÓGICA DE GESTÃO ---
    const perfisSemTurmas = [
      PERFIS.DIRETOR,
      PERFIS.DIRETOR_ADJUNTO,
      PERFIS.GESTAO,
      PERFIS.ORIENTADOR_PEDAGOGICO, // Adicionado aqui
    ].map((p) => p.toLowerCase());
    const perfilAtual = selecionado.perfil?.toLowerCase();

    if (perfisSemTurmas.includes(perfilAtual)) {
      exibirMensagem(
        "erro",
        `O perfil de ${selecionado.perfil} já tem acesso a todas as turmas da escola. Não é necessário vincular.`
      );
      setSelecionado(null);
      setTurmasSelecionadas([]);
      setExpandedProfId(null);
      return;
    }

    try {
      setCarregandoDados(true);
      const turmasObj = {};
      turmasSelecionadas.forEach((turma) => {
        turmasObj[turma] = true;
      });

      await setDoc(
        doc(db, "usuarios", selecionado.id),
        { turmas: turmasObj },
        { merge: true }
      );

      const profissionaisAtualizados = profissionais.map((p) =>
        p.id === selecionado.id ? { ...p, turmas: turmasObj } : p
      );
      setProfissionais(profissionaisAtualizados);

      exibirMensagem("sucesso", "Vínculo de turmas atualizado com sucesso!");

      setSelecionado(null);
      setTurmasSelecionadas([]);
      setExpandedProfId(null);
    } catch (error) {
      console.error("Erro ao salvar turmas:", error);
      if (error.code === "permission-denied") {
        exibirMensagem(
          "erro",
          "Permissão negada. Verifique as regras de segurança do Firestore."
        );
      } else {
        exibirMensagem("erro", "Erro ao salvar turmas. Tente novamente.");
      }
    } finally {
      setCarregandoDados(false);
    }
  };

  if (isLoadingUserSchool || carregandoDados) return <Loader />;
  if (userSchoolError) {
    return (
      <div className="vinculacao-container erro">
        <div className="vinculacao-card">
          <BotaoVoltar />
          <p className="error-message">{userSchoolError}</p>
        </div>
        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    );
  }

  return (
    <div className="vinculacao-container">
      <div className="vinculacao-card">
        <BotaoVoltar />
        <h2 className="vinculacao-titulo">Vincular Profissionais às Turmas</h2>
        <div className="vinculacao-lista">
          {profissionais.length === 0 ? (
            <p className="info-message">Nenhum profissional encontrado.</p>
          ) : (
            profissionais.map((prof) => {
              const perfilLower = prof.perfil?.toLowerCase();
              // --- ALTERAÇÃO AQUI: ADICIONANDO ORIENTADOR_PEDAGOGICO NA LÓGICA DE GESTÃO ---
              const isGestao = [
                "diretor",
                "diretor_adjunto",
                "gestao",
                "orientador_pedagogico", // Adicionado aqui
              ].includes(perfilLower);
              return (
                <div key={prof.id} className="vinculacao-profissional-card">
                  <div
                    className="vinculacao-profissional-header"
                    onClick={() => {
                      const nextId =
                        prof.id === expandedProfId ? null : prof.id;
                      setExpandedProfId(nextId);
                      if (nextId) {
                        handleSelecionarProfissional(prof);
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
                    {!isGestao ? (
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
                                    checked={turmasSelecionadas.includes(turma)}
                                    onChange={() => handleToggleTurma(turma)}
                                  />
                                  <span className="checkmark"></span>
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
                    ) : (
                      <p className="info-message">
                        Este profissional já tem acesso a todas as turmas da
                        escola.
                      </p>
                    )}
                    <button
                      onClick={handleSalvar}
                      className="vinculacao-botao-salvar"
                      disabled={carregandoDados}
                    >
                      Salvar Vínculo
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    </div>
  );
}
