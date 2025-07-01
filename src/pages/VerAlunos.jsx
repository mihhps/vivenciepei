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
// BotaoVoltar não é mais importado como componente React, pois faremos um botão customizado
// com navegação condicional. Se você o usa em outros lugares, mantenha o arquivo BotaoVoltar.jsx/js.
import { FaPencilAlt, FaTrashAlt, FaPlus } from "react-icons/fa";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom"; // Adicionado useNavigate

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

// Estilos JSX (mantidos para o layout principal)
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
  // REMOVIDOS estilos de modal: modalContent, inputField, modalActions, saveButton, cancelButton, formFieldContainer, label, requiredAsterisk
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

export default function VerAlunos() {
  const navigate = useNavigate(); // Hook de navegação

  // Estados do componente
  const [alunos, setAlunos] = useState([]);
  const [escolas, setEscolas] = useState([]); // Todas as escolas disponíveis no sistema
  const [escolaSelecionada, setEscolaSelecionada] = useState(null); // ID da escola atualmente selecionada/visualizada
  // REMOVIDOS estados de modal: modalAberto, formulario
  const [loading, setLoading] = useState(true); // Estado de carregamento principal da tela
  const [loadingSalvar, setLoadingSalvar] = useState(false); // Estado de carregamento para operações de exclusão
  const [error, setError] = useState(null); // Estado para exibir mensagens de erro

  // Novos estados para armazenar escolas e turmas permitidas para o usuário logado
  const [escolasPermitidasParaUsuario, setEscolasPermitidasParaUsuario] =
    useState([]);
  const [turmasPermitidasParaUsuario, setTurmasPermitidasParaUsuario] =
    useState([]);

  // Memoiza o usuário logado para evitar recargas desnecessárias
  const usuario = useMemo(() => getLocalStorageSafe("usuarioLogado", {}), []);

  // Determina se o usuário logado tem permissão para editar alunos
  const podeEditar = useMemo(
    () =>
      ["gestao", "aee", "desenvolvedor"].includes(
        usuario?.perfil?.toLowerCase()
      ),
    [usuario?.perfil]
  );

  // --- Função principal de carregamento de todos os dados (escolas e alunos) ---
  const carregarTodosOsDados = useCallback(async () => {
    console.log("VERALUNOS DEBUG: Iniciando carregarTodosOsDados...");
    setLoading(true); // Ativa o loading
    setError(null); // Limpa qualquer erro anterior
    try {
      if (!usuario?.perfil) {
        setError("Você não está logado ou não tem um perfil válido.");
        setLoading(false);
        return;
      }

      // 1. Carregar todas as escolas disponíveis no sistema
      const escolasSnap = await getDocs(collection(db, "escolas"));
      const escolasListadas = escolasSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEscolas(escolasListadas);
      console.log(
        "VERALUNOS DEBUG: Todas as escolas carregadas:",
        escolasListadas.length
      );

      let tempEscolasPermitidas = []; // Variável temporária para IDs de escolas permitidas
      let tempTurmasPermitidas = []; // Variável temporária para nomes de turmas permitidas (para AEE)

      // 2. Determinar as permissões de escola e turma do usuário logado
      if (usuario.perfil === "aee" || usuario.perfil === "professor") {
        // Para AEE e Professores, buscar os vínculos de escola e turma do próprio documento de usuário
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

        console.log(
          `VERALUNOS DEBUG: Usuário ${usuario.perfil?.toUpperCase()} (UID: ${
            usuario.uid
          })`
        );
        console.log(
          "VERALUNOS DEBUG: Escolas Permitidas:",
          tempEscolasPermitidas
        );
        console.log(
          "VERALUNOS DEBUG: Turmas Permitidas (AEE):",
          tempTurmasPermitidas
        );

        // Se a escola selecionada ainda não foi definida, usa a primeira escola permitida como padrão
        if (escolaSelecionada === null && tempEscolasPermitidas.length > 0) {
          setEscolaSelecionada(tempEscolasPermitidas[0]);
          console.log(
            "VERALUNOS DEBUG: Escola selecionada inicial (AEE/Prof):",
            tempEscolasPermitidas[0]
          );
        }
      } else if (
        [
          "gestao",
          "desenvolvedor",
          "diretor",
          "diretor adjunto",
          "orientador pedagógico",
          "seme", // Adicionado SEME aqui para ver todas as escolas por padrão
        ].includes(usuario.perfil)
      ) {
        // Para perfis de gestão/desenvolvedor/diretores, eles podem ver todas as escolas inicialmente
        tempEscolasPermitidas = escolasListadas.map((e) => e.id); // Todos os IDs de escolas

        // Se a escola selecionada ainda não foi definida, usa a primeira escola do sistema como padrão
        if (escolasListadas.length > 0 && escolaSelecionada === null) {
          setEscolaSelecionada(escolasListadas[0]?.id || null);
          console.log(
            "VERALUNOS DEBUG: Escola selecionada inicial (Gestão/Dev/Diretor/SEME):",
            escolasListadas[0]?.id
          );
        }
      } else {
        // Outros perfis não autorizados (se não foram pegos na verificação inicial)
        setError("Seu perfil não tem permissão para visualizar alunos.");
        setLoading(false);
        return;
      }

      // Atualiza os estados que serão usados no JSX para exibir filtros e dados
      setEscolasPermitidasParaUsuario(tempEscolasPermitidas);
      setTurmasPermitidasParaUsuario(tempTurmasPermitidas);
      console.log("VERALUNOS DEBUG: Estados de permissão atualizados.");

      // 3. Construção da Query de Alunos com base na escola selecionada e permissões
      let alunosParaExibir = [];
      let escolaAtualmenteSelecionada = escolaSelecionada; // Pega o valor atual do estado de escola selecionada

      // Se escolaAtualmenteSelecionada ainda não foi definida (ex: primeiro load para AEE/Prof)
      // e o usuário tem escolas permitidas, define a primeira como a "selecionada atual"
      if (!escolaAtualmenteSelecionada && tempEscolasPermitidas.length > 0) {
        escolaAtualmenteSelecionada = tempEscolasPermitidas[0];
        setEscolaSelecionada(escolaAtualmenteSelecionada); // Atualiza o estado da UI
        console.log(
          "VERALUNOS DEBUG: Escola ativa final definida para query (fallback):",
          escolaAtualmenteSelecionada
        );
      }

      // === AQUI ESTÁ A CHAVE: SALVAR NO LOCALSTORAGE ===
      // Salva a escola selecionada no localStorage para que o componente EscolaAtual possa exibi-la
      if (escolaAtualmenteSelecionada) {
        localStorage.setItem(
          "escolaAtiva",
          JSON.stringify(escolaAtualmenteSelecionada)
        );
        console.log(
          "VERALUNOS DEBUG: 'escolaAtiva' salva no localStorage:",
          JSON.parse(localStorage.getItem("escolaAtiva"))
        );
      } else {
        localStorage.removeItem("escolaAtiva");
        console.log(
          "VERALUNOS DEBUG: 'escolaAtiva' removida do localStorage (nenhuma escola determinada)."
        );
      }
      // === FIM DO SALVAMENTO NO LOCALSTORAGE ===

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
              "Atenção: AEE tem mais de 10 turmas vinculadas. Alunos serão filtrados no cliente (NÃO RECOMENDADO PARA GRANDES VOLUMES)."
            );
            // Neste caso, você pode considerar uma estrutura de dados diferente ou Cloud Functions
            // para lidar com filtros de muitas turmas.
          }
        }

        const alunosSnap = await getDocs(qAlunos);
        let fetchedAlunos = alunosSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        if (usuario.perfil === "aee" && tempTurmasPermitidas.length > 10) {
          fetchedAlunos = fetchedAlunos.filter((aluno) =>
            tempTurmasPermitidas.includes(aluno.turma)
          );
        }
        alunosParaExibir = fetchedAlunos;
        console.log(
          "VERALUNOS DEBUG: Alunos carregados para exibição:",
          alunosParaExibir.length
        );
      } else {
        alunosParaExibir = [];
        console.log(
          "VERALUNOS DEBUG: Nenhuma escola ativa, nenhum aluno carregado."
        );
      }

      setAlunos(alunosParaExibir); // Atualiza o estado dos alunos para exibição
    } catch (e) {
      console.error(
        "VERALUNOS DEBUG: Erro fatal ao carregar todos os dados:",
        e
      );
      setError(
        e.message || "Falha ao carregar dados. Por favor, tente novamente."
      );
      setAlunos([]);
      setEscolas([]);
      setEscolasPermitidasParaUsuario([]);
      setTurmasPermitidasParaUsuario([]);
    } finally {
      setLoading(false);
      console.log("VERALUNOS DEBUG: Finalizando carregarTodosOsDados.");
    }
  }, [usuario, escolaSelecionada]); // Dependências: A função re-executa se o usuário ou a escola selecionada mudar

  // Efeito para Carregamento Inicial do componente
  useEffect(() => {
    carregarTodosOsDados();
  }, [carregarTodosOsDados]); // Dispara a função carregarTodosOsDados na montagem e quando ela muda

  // --- Função de Exclusão de Aluno (Mantida) ---
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
        await carregarTodosOsDados(); // Recarrega a lista após exclusão
      } catch (error) {
        console.error("Erro ao excluir aluno:", error);
        setError("Erro ao excluir aluno. Por favor, tente novamente.");
      } finally {
        setLoadingSalvar(false);
      }
    },
    [loadingSalvar, carregarTodosOsDados]
  );

  // Memoiza a lista de alunos para exibição na UI
  const alunosDaEscola = useMemo(() => {
    return alunos;
  }, [alunos]);

  // --- Renderização Condicional da UI ---

  // Exibe um loader global enquanto a tela principal está carregando
  if (loading && !error) {
    return <Loader />;
  }

  // Exibe uma mensagem de erro principal se houver um erro e não estiver carregando
  if (error && !loading) {
    return (
      <div style={styles.container}>
        {/* Botão Voltar personalizado */}
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

  // Exibe uma mensagem se não há escolas disponíveis para o perfil
  if (!loading && escolas.length === 0 && usuario?.perfil !== "aee") {
    return (
      <div style={styles.container}>
        {/* Botão Voltar personalizado */}
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
          Nenhuma escola cadastrada ou disponível para sua visualização. Por
          favor, verifique se há escolas no sistema ou se seu perfil tem as
          permissões corretas.
        </p>
      </div>
    );
  }

  // === INÍCIO DO RETURN PRINCIPAL DO COMPONENTE ===
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Botão Voltar personalizado */}
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
                  !["desenvolvedor", "gestao", "seme"].includes(usuario.perfil) // Adicionado SEME aqui também
                ) {
                  alert(
                    "Por favor, selecione uma escola primeiro para adicionar um novo aluno."
                  );
                  return;
                }

                // Redireciona para a página de cadastro de aluno
                navigate("/cadastrar-aluno");
              }}
              style={styles.buttonPrimary}
              disabled={loadingSalvar || loading}
            >
              <FaPlus /> Novo Aluno
            </button>
          )}
        </div>

        {/* Filtro de Escola para Perfis com múltiplas escolas permitidas */}
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

        {/* Exibe a escola atualmente visualizada (para todos os perfis) */}
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

        {/* Mensagem se não há alunos para os critérios selecionados */}
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

        {/* Grid de Alunos */}
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
