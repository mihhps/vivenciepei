import React, { useState, useEffect, useCallback } from "react";
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

export default function VincularProfessoresTurmas() {
  const [professores, setProfessores] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]);
  const [vinculoAtual, setVinculoAtual] = useState(null);
  const [carregando, setCarregando] = useState(true); // Estado de carregamento geral
  const [erro, setErro] = useState(null);

  // Usar o hook useUserSchool. Observe os nomes das variáveis.
  const {
    userSchoolData, // Objeto completo do usuário do Firestore (contém perfil, escolaId, etc.)
    isLoading: isLoadingUserSchoolHook, // Estado de carregamento DO HOOK (renomeado para evitar conflito)
    error: userSchoolErrorHook, // Erro DO HOOK (renomeado)
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

  // carregarProfessores agora usa os valores JÁ ESTÁVEIS do hook
  const carregarProfessores = useCallback(async () => {
    console.log(
      "VincularProfessoresTurmas - carregarProfessores: Iniciando função."
    );
    // Use os parâmetros da função, não os estados diretamente para valores que são passados.
    // Ou, se usa estados, garanta que o useEffect tem as dependências corretas.

    // A permissão já foi verificada pelo hook ou no useEffect que o dispara.
    // Aqui, apenas busca os professores com base nos dados do hook.
    setCarregando(true);
    setErro(null);

    try {
      const perfilUsuario = userSchoolData?.perfil; // Use os dados do hook
      const userSchoolIdParaQuery = userSchoolData?.escolaId; // Use os dados do hook

      let professoresQuery;

      const perfisComFiltroPorEscola = [
        "aee",
        "gestao",
        "orientador pedagógico",
        "diretor",
        "diretor adjunto",
      ];

      if (perfisComFiltroPorEscola.includes(perfilUsuario)) {
        if (!userSchoolIdParaQuery) {
          console.warn(
            "VincularProfessoresTurmas - carregarProfessores: Perfil autorizado, mas userSchoolId é nulo. Não carrega professores."
          );
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
        console.log(
          `VincularProfessoresTurmas - carregarProfessores: Query de professores filtrando por escola ID: ${userSchoolIdParaQuery}`
        );
      } else if (
        perfilUsuario === "seme" ||
        perfilUsuario === "desenvolvedor"
      ) {
        professoresQuery = query(
          collection(db, "usuarios"),
          where("perfil", "==", "professor")
        );
        console.log(
          "VincularProfessoresTurmas - carregarProfessores: Buscando TODOS os professores (SEME/Desenvolvedor)."
        );
      } else {
        console.log(
          "VincularProfessoresTurmas - carregarProfessores: Perfil não autorizado ou sem filtro específico. Nenhum professor carregado."
        );
        setProfessores([]);
        setCarregando(false);
        return;
      }

      const professoresSnap = await getDocs(professoresQuery);
      const fetchedProfessores = professoresSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProfessores(fetchedProfessores);
      console.log(
        "VincularProfessoresTurmas - carregarProfessores: Professores carregados (após filtro do Firebase):",
        fetchedProfessores.length,
        fetchedProfessores
      );
    } catch (err) {
      console.error("VincularProfessoresTurmas - Erro ao carregar dados:", err);
      exibirMensagem(
        "erro",
        "Erro ao carregar dados. Por favor, tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }, [
    userSchoolData, // Adicionado como dependência: garante que esses dados estão estáveis
    exibirMensagem,
  ]);

  // useEffect PRINCIPAL para carregar professores APÓS o useUserSchool estar pronto
  useEffect(() => {
    console.log(
      "VincularProfessoresTurmas - useEffect principal: isLoadingUserSchoolHook:",
      isLoadingUserSchoolHook,
      "userSchoolData:",
      userSchoolData
    );
    if (!isLoadingUserSchoolHook && userSchoolData) {
      // Dispara o carregamento de professores somente após o hook resolver e ter dados
      carregarProfessores();
    } else if (
      !isLoadingUserSchoolHook &&
      !userSchoolData &&
      userSchoolErrorHook
    ) {
      // Se o hook terminou de carregar, mas não tem dados e tem erro (ex: não logado)
      setCarregando(false);
      setErro(userSchoolErrorHook);
    }
  }, [
    carregarProfessores,
    isLoadingUserSchoolHook,
    userSchoolData,
    userSchoolErrorHook,
  ]);

  // Carregar turmas (separado para ser chamado em handleSelecionarProfessor)
  const carregarTurmas = useCallback(
    async (escolaId) => {
      console.log(
        "VincularProfessoresTurmas - carregarTurmas: Escola usada para buscar turmas:",
        escolaId
      );
      if (!escolaId) {
        setTurmas([]);
        return;
      }

      try {
        const alunosQuery = query(
          collection(db, "alunos"),
          where("escolaId", "==", escolaId) // 'escola_id' foi corrigido para 'escolaId'
        );
        const snap = await getDocs(alunosQuery);
        const turmasUnicas = new Set();

        snap.docs.forEach((doc) => {
          const aluno = doc.data();
          if (aluno.turma) {
            turmasUnicas.add(aluno.turma);
          }
        });
        setTurmas(Array.from(turmasUnicas).sort());
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
    async (id) => {
      const prof = professores.find((p) => p.id === id);
      if (!prof) {
        setSelecionado(null);
        setTurmas([]);
        setTurmasSelecionadas([]);
        setVinculoAtual(null);
        return;
      }

      let escolaNome = "Não informada";
      const escolasIds = Object.keys(prof.escolas || {});
      const primeiraEscolaId = escolasIds[0];

      if (primeiraEscolaId) {
        try {
          const escolaSnap = await getDoc(doc(db, "escolas", primeiraEscolaId));
          if (escolaSnap.exists()) {
            escolaNome = escolaSnap.data().nome;
          }
        } catch (err) {
          console.error(
            "VincularProfessoresTurmas - Erro ao buscar nome da escola:",
            err
          );
        }
      }

      setSelecionado({ ...prof, escolaNome });
      await carregarTurmas(primeiraEscolaId);
      const turmasObj = prof.turmas || {};
      const turmasMarcadas = Object.keys(turmasObj).filter((t) => turmasObj[t]);
      setTurmasSelecionadas(turmasMarcadas);

      const vinculoDocRef = doc(db, "vinculosProfessores", prof.id);
      const vinculoSnap = await getDoc(vinculoDocRef);
      if (vinculoSnap.exists()) {
        setVinculoAtual(vinculoSnap.data());
      } else {
        setVinculoAtual(null);
      }
    },
    [professores, carregarTurmas]
  );

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

  const gerarRelatorio = async () => {
    let vinculosQuery;
    const perfilUsuario = userSchoolData?.perfil; // Use dados do hook
    const userSchoolIdParaRelatorio = userSchoolData?.escolaId; // Use dados do hook

    const perfisComFiltroPorEscola = [
      "aee",
      "gestao",
      "orientador pedagógico",
      "diretor",
      "diretor adjunto",
    ];

    if (
      perfisComFiltroPorEscola.includes(perfilUsuario) &&
      userSchoolIdParaRelatorio
    ) {
      vinculosQuery = query(
        collection(db, "vinculosProfessores"),
        where("escolaId", "==", userSchoolIdParaRelatorio)
      );
      console.log(
        `VincularProfessoresTurmas - Gerar Relatório: Filtrando vínculos pela escola: ${userSchoolIdParaRelatorio}`
      );
    } else {
      vinculosQuery = collection(db, "vinculosProfessores");
      console.log(
        "VincularProfessoresTurmas - Gerar Relatório: Gerando relatório COMPLETO (sem filtro por escola)."
      );
    }

    try {
      const snap = await getDocs(vinculosQuery);
      const escolasSnap = await getDocs(collection(db, "escolas"));

      const escolasMap = {};
      escolasSnap.docs.forEach((doc) => {
        escolasMap[doc.id] = doc.data().nome;
      });

      const linhasCSV = [["Professor", "Escola", "Turmas vinculadas"]];

      snap.forEach((doc) => {
        const d = doc.data();
        linhasCSV.push([
          d.nome || "N/A",
          escolasMap[d.escolaId] || "Desconhecida",
          (d.turmas || []).join(" / "),
        ]);
      });

      const csv = linhasCSV.map((l) => l.join(";")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "relatorio_vinculos.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(
        "VincularProfessoresTurmas - Erro ao gerar relatório:",
        err
      );
      exibirMensagem("erro", "Erro ao gerar relatório CSV.");
    }
  };

  if (isLoadingUserSchoolHook) {
    return <Loader />;
  }

  if (erro || userSchoolErrorHook) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          background: "linear-gradient(to bottom, #00264d, #005b96)",
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#fff",
            maxWidth: "800px",
            margin: "0 auto",
            padding: "30px",
            borderRadius: "16px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <BotaoVoltar />
          <p style={{ color: "#dc3545", fontWeight: "bold" }}>
            {erro || userSchoolErrorHook}
          </p>
        </div>
        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(to bottom, #00264d, #005b96)",
        padding: "40px",
      }}
    >
      <div
        style={{
          background: "#fff",
          maxWidth: "800px",
          margin: "0 auto",
          padding: "30px",
          borderRadius: "16px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        }}
      >
        <BotaoVoltar />
        <h2
          style={{
            color: "#1d3557",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          Vincular Professores às Turmas
        </h2>

        <label
          style={{ fontWeight: "bold", display: "block", marginBottom: "10px" }}
        >
          Selecione um professor:
        </label>
        <select
          onChange={(e) => handleSelecionarProfessor(e.target.value)}
          value={selecionado?.id || ""}
          style={{
            padding: 10,
            marginBottom: 20,
            width: "100%",
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontSize: "16px",
          }}
        >
          <option value="">Selecione...</option>
          {professores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>

        {selecionado && (
          <>
            <p>
              <strong>Escola:</strong>{" "}
              {selecionado.escolaNome || "Não informada"}
            </p>

            <p style={{ marginTop: "20px" }}>
              <strong>Turmas disponíveis na escola:</strong>
            </p>
            {turmas.map((turma) => (
              <div
                key={turma}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={turmasSelecionadas.includes(turma)}
                    onChange={(e) => {
                      const atualizadas = e.target.checked
                        ? [...turmasSelecionadas, turma]
                        : turmasSelecionadas.filter((t) => t !== turma);
                      setTurmasSelecionadas(atualizadas);
                    }}
                    style={{
                      marginRight: "10px",
                      height: "16px",
                      width: "16px",
                    }}
                  />
                  {turma}
                </label>
              </div>
            ))}

            <button
              onClick={handleSalvar}
              style={{
                marginTop: 20,
                padding: "10px 20px",
                backgroundColor: "#2a9d8f",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Salvar Vínculo
            </button>

            {vinculoAtual && (
              <div style={{ marginTop: 20 }}>
                <p>
                  <strong>Turmas atualmente vinculadas:</strong>
                </p>
                <ul>
                  {vinculoAtual.turmas.map((turma, index) => (
                    <li key={index}>{turma}</li>
                  ))}
                </ul>
              </div>
            )}

            <hr style={{ margin: "30px 0" }} />

            <button
              onClick={gerarRelatorio}
              style={{
                padding: "10px 20px",
                backgroundColor: "#1d3557",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Exportar Relatório de Vínculos (CSV)
            </button>
          </>
        )}
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}
