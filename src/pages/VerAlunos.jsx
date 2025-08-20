// src/pages/VerAlunos.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  getDoc,
  orderBy,
} from "firebase/firestore";
// Importação do novo ícone de quebra-cabeça
import { FaPencilAlt, FaTrashAlt, FaPlus, FaPuzzlePiece } from "react-icons/fa";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom";

// --- Funções Auxiliares ---

// Função utilitária para obter dados do localStorage de forma segura
const getLocalStorageSafe = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined || item === "undefined") {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error(`Erro ao parsear ${key} do localStorage:`, error);
    return defaultValue;
  }
};

// Função auxiliar para calcular idade com base na data de nascimento
const calcularIdade = (dataNascimento) => {
  if (!dataNascimento) return "N/A";
  try {
    const parts = dataNascimento.split("-");
    if (parts.length !== 3) return "Data inválida";
    const [ano, mes, dia] = parts.map(Number);
    const nascimento = new Date(ano, mes - 1, dia);
    if (isNaN(nascimento.getTime())) return "Data inválida";
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return idade >= 0 ? idade : "N/A";
  } catch (e) {
    console.error("Erro ao calcular idade para:", dataNascimento, e);
    return "N/A";
  }
};

// --- FUNÇÃO PARA IDENTIFICAR ALUNOS COM TEA ---
const verificaTea = (diagnostico) => {
  if (!diagnostico) return false;
  const diagnosticoLowerCase = diagnostico.toLowerCase();
  const palavrasChave = ["tea", "autismo", "espectro autista"];

  // Verifica se o texto do diagnóstico inclui alguma das palavras-chave
  return palavrasChave.some((palavra) =>
    diagnosticoLowerCase.includes(palavra)
  );
};

// --- Estilos JSX ---
const styles = {
  container: {
    minHeight: "100vh",
    background: "#f1f8fc",
    padding: "40px 20px",
    boxSizing: "border-box",
  },
  content: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "#1d3557",
  },
  buttonPrimary: {
    background: "#1d3557",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  },
  schoolFilter: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: 30,
  },
  schoolButton: (active) => ({
    padding: "10px 16px",
    borderRadius: "20px",
    border: active ? "2px solid #1d3557" : "1px solid #ccc",
    background: active ? "#1d3557" : "#fff",
    color: active ? "#fff" : "#1d3557",
    fontWeight: active ? "bold" : "normal",
    cursor: "pointer",
    transition: "all 0.3s ease",
  }),
  studentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
    justifyContent: "flex-start",
  },
  studentCard: {
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    padding: "20px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  actionButtons: {
    marginTop: "auto",
    paddingTop: "10px",
    display: "flex",
    gap: 10,
  },
  editButton: {
    background: "#457b9d",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "5px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.3s ease",
  },
  deleteButton: {
    background: "#e63946",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "5px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.3s ease",
  },
};
// --- Fim dos Estilos JSX ---

export default function VerAlunos() {
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [error, setError] = useState(null);

  const [escolasPermitidasParaUsuario, setEscolasPermitidasParaUsuario] =
    useState([]);
  const [turmasPermitidasParaUsuario, setTurmasPermitidasParaUsuario] =
    useState([]);

  const usuario = useMemo(() => getLocalStorageSafe("usuarioLogado", {}), []);

  const podeEditar = useMemo(
    () =>
      ["gestao", "aee", "desenvolvedor"].includes(
        usuario?.perfil?.toLowerCase()
      ),
    [usuario?.perfil]
  );

  const carregarTodosOsDados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!usuario?.perfil) {
        setError("Você não está logado ou não tem um perfil válido.");
        setLoading(false);
        return;
      }

      const escolasSnap = await getDocs(collection(db, "escolas"));
      const escolasListadas = escolasSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEscolas(escolasListadas);

      let tempEscolasPermitidas = [];
      let tempTurmasPermitidas = [];

      if (usuario.perfil === "aee" || usuario.perfil === "professor") {
        const userDocRef = doc(db, "usuarios", usuario.uid);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.data();

        if (
          !userData ||
          !userData.escolas ||
          Object.keys(userData.escolas).length === 0
        ) {
          throw new Error(
            `Você (${usuario.perfil?.toUpperCase()}) não está vinculado a nenhuma escola. Por favor, verifique seus vínculos.`
          );
        }
        tempEscolasPermitidas = Object.keys(userData.escolas);
        if (usuario.perfil === "aee" && userData.turmas) {
          tempTurmasPermitidas = Object.keys(userData.turmas);
        }

        if (escolaSelecionada === null && tempEscolasPermitidas.length > 0) {
          setEscolaSelecionada(tempEscolasPermitidas[0]);
        }
      } else if (
        [
          "gestao",
          "desenvolvedor",
          "diretor",
          "diretor adjunto",
          "orientador pedagógico",
          "seme",
        ].includes(usuario.perfil)
      ) {
        tempEscolasPermitidas = escolasListadas.map((e) => e.id);
        if (escolasListadas.length > 0 && escolaSelecionada === null) {
          setEscolaSelecionada(escolasListadas[0]?.id || null);
        }
      } else {
        setError("Seu perfil não tem permissão para visualizar alunos.");
        setLoading(false);
        return;
      }

      setEscolasPermitidasParaUsuario(tempEscolasPermitidas);
      setTurmasPermitidasParaUsuario(tempTurmasPermitidas);

      let alunosParaExibir = [];
      let escolaAtualmenteSelecionada = escolaSelecionada;

      if (!escolaAtualmenteSelecionada && tempEscolasPermitidas.length > 0) {
        escolaAtualmenteSelecionada = tempEscolasPermitidas[0];
        setEscolaSelecionada(escolaAtualmenteSelecionada);
      }

      if (escolaAtualmenteSelecionada) {
        localStorage.setItem(
          "escolaAtiva",
          JSON.stringify(escolaAtualmenteSelecionada)
        );
      } else {
        localStorage.removeItem("escolaAtiva");
      }

      if (escolaAtualmenteSelecionada) {
        let qAlunos = query(
          collection(db, "alunos"),
          where("escolaId", "==", escolaAtualmenteSelecionada),
          orderBy("nome")
        );

        if (usuario.perfil === "aee" && tempTurmasPermitidas.length > 0) {
          if (tempTurmasPermitidas.length <= 10) {
            qAlunos = query(
              qAlunos,
              where("turma", "in", tempTurmasPermitidas)
            );
          } else {
            console.warn(
              "Atenção: AEE tem mais de 10 turmas vinculadas. Alunos serão filtrados no cliente."
            );
          }
        }

        const alunosSnap = await getDocs(qAlunos);
        let fetchedAlunos = alunosSnap.docs.map((docSnap) => {
          const dadosAluno = docSnap.data();
          return {
            id: docSnap.id,
            ...dadosAluno,
            isTea: verificaTea(dadosAluno.diagnostico), // Adiciona a propriedade 'isTea'
          };
        });

        if (usuario.perfil === "aee" && tempTurmasPermitidas.length > 10) {
          fetchedAlunos = fetchedAlunos.filter((aluno) =>
            tempTurmasPermitidas.includes(aluno.turma)
          );
        }
        alunosParaExibir = fetchedAlunos;
      } else {
        alunosParaExibir = [];
      }

      setAlunos(alunosParaExibir);
    } catch (e) {
      console.error("Erro fatal ao carregar todos os dados:", e);
      setError(
        e.message || "Falha ao carregar dados. Por favor, tente novamente."
      );
      setAlunos([]);
      setEscolas([]);
      setEscolasPermitidasParaUsuario([]);
      setTurmasPermitidasParaUsuario([]);
    } finally {
      setLoading(false);
    }
  }, [usuario, escolaSelecionada]);

  useEffect(() => {
    carregarTodosOsDados();
  }, [carregarTodosOsDados]);

  const handleExcluir = useCallback(
    async (idAluno) => {
      if (loadingSalvar) return;
      if (
        !window.confirm(
          "Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita."
        )
      ) {
        return;
      }

      setLoadingSalvar(true);
      try {
        await deleteDoc(doc(db, "alunos", idAluno));
        await carregarTodosOsDados();
      } catch (error) {
        console.error("Erro ao excluir aluno:", error);
        setError("Erro ao excluir aluno. Por favor, tente novamente.");
      } finally {
        setLoadingSalvar(false);
      }
    },
    [loadingSalvar, carregarTodosOsDados]
  );

  const alunosDaEscola = useMemo(() => {
    return alunos;
  }, [alunos]);

  if (loading && !error) {
    return <Loader />;
  }

  if (error && !loading) {
    return (
      <div style={styles.container}>
        <button
          onClick={() => {
            const perfilUsuario = usuario?.perfil?.toLowerCase();
            if (perfilUsuario === "desenvolvedor") {
              navigate("/painel-dev");
            } else if (
              [
                "gestao",
                "diretor",
                "diretor adjunto",
                "orientador pedagógico",
                "seme",
              ].includes(perfilUsuario)
            ) {
              navigate("/painel-gestao");
            } else if (perfilUsuario === "aee") {
              navigate("/painel-aee");
            } else if (perfilUsuario === "professor") {
              navigate("/painel-professor");
            } else {
              navigate("/");
            }
          }}
          style={{
            background: "none",
            border: "1px solid #ccc",
            padding: "8px 15px",
            borderRadius: "5px",
            cursor: "pointer",
            marginBottom: "20px",
            alignSelf: "flex-start",
            color: "#1d3557",
            fontWeight: "bold",
          }}
        >
          Voltar
        </button>
        <p
          style={{
            color: "red",
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            textAlign: "center",
            marginTop: "50px",
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  if (!loading && escolas.length === 0 && usuario?.perfil !== "aee") {
    return (
      <div style={styles.container}>
        <button
          onClick={() => {
            const perfilUsuario = usuario?.perfil?.toLowerCase();
            if (perfilUsuario === "desenvolvedor") {
              navigate("/painel-dev");
            } else if (
              [
                "gestao",
                "diretor",
                "diretor adjunto",
                "orientador pedagógico",
                "seme",
              ].includes(perfilUsuario)
            ) {
              navigate("/painel-gestao");
            } else if (perfilUsuario === "aee") {
              navigate("/painel-aee");
            } else if (perfilUsuario === "professor") {
              navigate("/painel-professor");
            } else {
              navigate("/");
            }
          }}
          style={{
            background: "none",
            border: "1px solid #ccc",
            padding: "8px 15px",
            borderRadius: "5px",
            cursor: "pointer",
            marginBottom: "20px",
            alignSelf: "flex-start",
            color: "#1d3557",
            fontWeight: "bold",
          }}
        >
          Voltar
        </button>
        <p
          style={{
            color: "orange",
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            textAlign: "center",
            marginTop: "50px",
          }}
        >
          Nenhuma escola cadastrada ou disponível para sua visualização.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <button
          onClick={() => {
            const perfilUsuario = usuario?.perfil?.toLowerCase();
            if (perfilUsuario === "desenvolvedor") {
              navigate("/painel-dev");
            } else if (
              [
                "gestao",
                "diretor",
                "diretor adjunto",
                "orientador pedagógico",
                "seme",
              ].includes(perfilUsuario)
            ) {
              navigate("/painel-gestao");
            } else if (perfilUsuario === "aee") {
              navigate("/painel-aee");
            } else if (perfilUsuario === "professor") {
              navigate("/painel-professor");
            } else {
              navigate("/");
            }
          }}
          style={{
            background: "none",
            border: "1px solid #ccc",
            padding: "8px 15px",
            borderRadius: "5px",
            cursor: "pointer",
            marginBottom: "20px",
            alignSelf: "flex-start",
            color: "#1d3557",
            fontWeight: "bold",
          }}
        >
          Voltar
        </button>

        <div style={styles.header}>
          <h2 style={styles.title}>Alunos Cadastrados</h2>
          {podeEditar && (
            <button
              onClick={() => {
                let targetEscolaId = escolaSelecionada;

                if (
                  !targetEscolaId &&
                  !["desenvolvedor", "gestao", "seme"].includes(usuario.perfil)
                ) {
                  alert(
                    "Por favor, selecione uma escola primeiro para adicionar um novo aluno."
                  );
                  return;
                }

                navigate("/cadastrar-aluno");
              }}
              style={styles.buttonPrimary}
              disabled={loadingSalvar || loading}
            >
              <FaPlus /> Novo Aluno
            </button>
          )}
        </div>

        {escolas.length > 0 &&
          escolaSelecionada &&
          escolasPermitidasParaUsuario.length > 0 && (
            <div style={styles.schoolFilter}>
              {escolas.map(
                (escola) =>
                  escolasPermitidasParaUsuario.includes(escola.id) && (
                    <button
                      key={escola.id}
                      onClick={() => setEscolaSelecionada(escola.id)}
                      style={styles.schoolButton(
                        escolaSelecionada === escola.id
                      )}
                      disabled={loading}
                    >
                      {escola.nome}
                    </button>
                  )
              )}
            </div>
          )}

        {escolas.length > 0 && escolaSelecionada && (
          <div
            style={{
              marginBottom: "20px",
              padding: "10px",
              backgroundColor: "#e0e0e0",
              borderRadius: "8px",
              textAlign: "left",
            }}
          >
            <strong>Escola Visualizada:</strong>{" "}
            {escolas.find((e) => e.id === escolaSelecionada)?.nome || "N/A"}
          </div>
        )}

        {!loading && !error && alunosDaEscola.length === 0 && (
          <p
            style={{
              fontStyle: "italic",
              color: "#555",
              marginTop: "20px",
              textAlign: "center",
            }}
          >
            Nenhum aluno cadastrado
            {escolaSelecionada
              ? " para a escola selecionada ou seus vínculos."
              : " (selecione uma escola ou verifique seus vínculos)"}
            .
          </p>
        )}

        {!loading && !error && alunosDaEscola.length > 0 && (
          <div style={styles.studentGrid}>
            {alunosDaEscola.map((aluno) => (
              <div key={aluno.id} style={styles.studentCard}>
                <h4 style={{ marginBottom: 10, color: "#1d3557" }}>
                  {aluno.nome}
                </h4>
                <p>
                  <strong>Turma:</strong> {aluno.turma || "N/A"}
                </p>
                <p>
                  <strong>Turno:</strong> {aluno.turno || "N/A"}
                </p>
                <p>
                  <strong>Idade:</strong> {calcularIdade(aluno.nascimento)}
                </p>
                <p>
                  <strong>Diagnóstico:</strong> {aluno.diagnostico || "N/A"}
                </p>
                {/* Exibe o ícone de quebra-cabeça se o aluno for TEA */}
                {aluno.isTea && (
                  <FaPuzzlePiece
                    style={{
                      fontSize: "1.2em",
                      color: "#29ABE2", // Um tom de azul mais moderno
                      marginTop: "5px",
                    }}
                    title="Aluno com TEA"
                  />
                )}

                {podeEditar && (
                  <div style={styles.actionButtons}>
                    <button
                      onClick={() => navigate(`/editar-aluno/${aluno.id}`)}
                      style={styles.editButton}
                      aria-label={`Editar ${aluno.nome}`}
                      disabled={loadingSalvar}
                    >
                      <FaPencilAlt />
                    </button>
                    <button
                      onClick={() => handleExcluir(aluno.id)}
                      style={styles.deleteButton}
                      aria-label={`Excluir ${aluno.nome}`}
                      disabled={loadingSalvar}
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
