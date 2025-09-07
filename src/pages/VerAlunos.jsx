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
import { FaPencilAlt, FaTrashAlt, FaPlus, FaPuzzlePiece } from "react-icons/fa";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom";

// --- Funções Auxiliares (sem alterações) ---
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

const verificaTea = (diagnostico) => {
  if (!diagnostico) return false;
  const diagnosticoLowerCase = diagnostico.toLowerCase();
  const palavrasChave = ["tea", "autismo", "espectro autista"];
  return palavrasChave.some((palavra) =>
    diagnosticoLowerCase.includes(palavra)
  );
};

// --- Estilos JSX (sem alterações) ---
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

  const usuario = useMemo(() => getLocalStorageSafe("usuarioLogado", {}), []);

  // ##### ALTERAÇÃO 1: Adicionado "seme" à lista de perfis que podem editar/excluir #####
  const podeEditar = useMemo(
    () =>
      ["gestao", "aee", "desenvolvedor", "diretor", "seme"].includes(
        usuario?.perfil?.toLowerCase()
      ),
    [usuario?.perfil]
  );

  // ##### ALTERAÇÃO 2: Corrigido o destino do botão "Voltar" para o perfil SEME #####
  const handleVoltar = useCallback(() => {
    const perfil = usuario?.perfil?.toLowerCase();
    switch (perfil) {
      case "desenvolvedor":
        navigate("/painel-dev");
        break;
      case "gestao":
      case "diretor":
      case "diretor adjunto":
      case "orientador pedagógico":
        navigate("/painel-gestao");
        break;
      case "seme": // Caso do SEME foi separado
        navigate("/painel-seme");
        break;
      case "aee":
        navigate("/painel-aee");
        break;
      case "professor":
        navigate("/painel-professor");
        break;
      default:
        navigate("/");
    }
  }, [navigate, usuario]);

  const carregarTodosOsDados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!usuario?.uid) {
        setError(
          "Você não está logado ou seus dados de login estão incompletos."
        );
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
      const perfilUsuario = usuario.perfil?.toLowerCase();

      // Bloco 1: Usuários que veem APENAS escolas vinculadas
      if (
        [
          "gestao",
          "diretor",
          "diretor adjunto",
          "orientador pedagógico",
          "aee",
          "professor",
        ].includes(perfilUsuario)
      ) {
        const userDocRef = doc(db, "usuarios", usuario.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          throw new Error(
            "Documento do usuário não encontrado no banco de dados."
          );
        }
        const userData = userDocSnap.data();

        if (!userData.escolas || Object.keys(userData.escolas).length === 0) {
          throw new Error(
            `Você não está vinculado a nenhuma escola. Por favor, verifique seus vínculos.`
          );
        }
        tempEscolasPermitidas = Object.keys(userData.escolas);

        if (
          (perfilUsuario === "aee" || perfilUsuario === "professor") &&
          userData.turmas
        ) {
          tempTurmasPermitidas = Object.keys(userData.turmas);
        }
      }
      // Bloco 2: Usuários que veem TODAS as escolas
      else if (["desenvolvedor", "seme"].includes(perfilUsuario)) {
        tempEscolasPermitidas = escolasListadas.map((e) => e.id);
      }
      // Bloco 3: Acesso negado para os demais
      else {
        setError("Seu perfil não tem permissão para visualizar alunos.");
        setLoading(false);
        return;
      }

      let escolaAtualmenteSelecionada = escolaSelecionada;
      if (!escolaAtualmenteSelecionada && tempEscolasPermitidas.length > 0) {
        escolaAtualmenteSelecionada = tempEscolasPermitidas[0];
        setEscolaSelecionada(escolaAtualmenteSelecionada);
      }

      setEscolasPermitidasParaUsuario(tempEscolasPermitidas);

      let alunosParaExibir = [];
      if (escolaAtualmenteSelecionada) {
        localStorage.setItem(
          "escolaAtiva",
          JSON.stringify(escolaAtualmenteSelecionada)
        );

        if (perfilUsuario === "aee" && tempTurmasPermitidas.length > 0) {
          const turmaChunks = [];
          for (let i = 0; i < tempTurmasPermitidas.length; i += 10) {
            turmaChunks.push(tempTurmasPermitidas.slice(i, i + 10));
          }

          const promises = turmaChunks.map((chunk) => {
            const qAlunosChunk = query(
              collection(db, "alunos"),
              where("escolaId", "==", escolaAtualmenteSelecionada),
              where("turma", "in", chunk)
            );
            return getDocs(qAlunosChunk);
          });

          const snapshots = await Promise.all(promises);
          const fetchedAlunosMap = new Map();
          snapshots.forEach((snapshot) => {
            snapshot.docs.forEach((docSnap) => {
              if (!fetchedAlunosMap.has(docSnap.id)) {
                fetchedAlunosMap.set(docSnap.id, {
                  id: docSnap.id,
                  ...docSnap.data(),
                  isTea: verificaTea(docSnap.data().diagnostico),
                });
              }
            });
          });

          alunosParaExibir = Array.from(fetchedAlunosMap.values()).sort(
            (a, b) => a.nome.localeCompare(b.nome)
          );
        } else {
          const qAlunos = query(
            collection(db, "alunos"),
            where("escolaId", "==", escolaAtualmenteSelecionada),
            orderBy("nome")
          );
          const alunosSnap = await getDocs(qAlunos);
          alunosParaExibir = alunosSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
            isTea: verificaTea(docSnap.data().diagnostico),
          }));
        }
      }

      setAlunos(alunosParaExibir);
    } catch (e) {
      console.error("Fatal error loading all data:", e);
      setError(
        e.message || "Falha ao carregar dados. Por favor, tente novamente."
      );
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

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <button
          onClick={handleVoltar}
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

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <button
          onClick={handleVoltar}
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
              onClick={() => navigate("/cadastrar-aluno")}
              style={styles.buttonPrimary}
              disabled={loadingSalvar}
            >
              <FaPlus /> Novo Aluno
            </button>
          )}
        </div>

        {escolasPermitidasParaUsuario.length > 1 && (
          <div style={styles.schoolFilter}>
            {escolas
              .filter((escola) =>
                escolasPermitidasParaUsuario.includes(escola.id)
              )
              .map((escola) => (
                <button
                  key={escola.id}
                  onClick={() => setEscolaSelecionada(escola.id)}
                  style={styles.schoolButton(escolaSelecionada === escola.id)}
                >
                  {escola.nome}
                </button>
              ))}
          </div>
        )}

        {escolaSelecionada && (
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

        {alunos.length === 0 ? (
          <p
            style={{
              fontStyle: "italic",
              color: "#555",
              marginTop: "20px",
              textAlign: "center",
            }}
          >
            Nenhum aluno cadastrado para a escola selecionada ou seus vínculos.
          </p>
        ) : (
          <div style={styles.studentGrid}>
            {alunos.map((aluno) => (
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
                {aluno.isTea && (
                  <FaPuzzlePiece
                    style={{
                      fontSize: "1.2em",
                      color: "#29ABE2",
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
                      disabled={loadingSalvar}
                    >
                      <FaPencilAlt />
                    </button>
                    <button
                      onClick={() => handleExcluir(aluno.id)}
                      style={styles.deleteButton}
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
