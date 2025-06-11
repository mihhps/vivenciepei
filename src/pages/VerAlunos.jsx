// src/pages/VerAlunos.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Modal from "react-modal";
import { db } from "../firebase"; // Certifique-se que o caminho para o firebase config está correto
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  getDoc,
  orderBy,
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar"; // Certifique-se que o caminho para o BotaoVoltar está correto
import { FaPencilAlt, FaTrashAlt, FaPlus } from "react-icons/fa";
import Loader from "../components/Loader"; // Certifique-se que o caminho para o Loader está correto

// Define o elemento raiz do seu aplicativo para acessibilidade do modal
Modal.setAppElement("#root");

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

// Estilos JSX (pode ser movido para um arquivo CSS dedicado se preferir)
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
  modalContent: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    transform: "translate(-50%, -50%)",
    padding: "30px",
    borderRadius: "10px",
    width: "450px",
    maxWidth: "95%",
    boxShadow: "0 5px 25px rgba(0,0,0,0.15)",
    backgroundColor: "white",
  },
  inputField: {
    margin: "0 0 15px 0",
    padding: "12px 10px",
    width: "100%",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxSizing: "border-box",
  },
  modalActions: {
    marginTop: 25,
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
  saveButton: {
    background: "#4CAF50",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  },
  cancelButton: {
    background: "#ccc",
    color: "#333",
    border: "none",
    padding: "10px 20px",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  },
  formFieldContainer: {
    marginBottom: "15px",
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "500",
    color: "#333",
  },
  requiredAsterisk: {
    color: "red",
    marginLeft: "3px",
  },
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
  // Estados do componente
  const [alunos, setAlunos] = useState([]);
  const [escolas, setEscolas] = useState([]); // Todas as escolas disponíveis no sistema
  const [escolaSelecionada, setEscolaSelecionada] = useState(null); // ID da escola atualmente selecionada/visualizada
  const [modalAberto, setModalAberto] = useState(false);
  const [formulario, setFormulario] = useState(null); // Dados do aluno para o formulário (edição/criação)
  const [loading, setLoading] = useState(true); // Estado de carregamento principal da tela
  const [loadingSalvar, setLoadingSalvar] = useState(false); // Estado de carregamento para operações de salvar/excluir
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
      setEscolas(escolasListadas); // Atualiza o estado com todas as escolas

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
          `VerAlunos: Usuário ${usuario.perfil?.toUpperCase()} (UID: ${
            usuario.uid
          })`
        );
        console.log("VerAlunos: Escolas Permitidas:", tempEscolasPermitidas);
        console.log(
          "VerAlunos: Turmas Permitidas (AEE):",
          tempTurmasPermitidas
        );

        // Se a escola selecionada ainda não foi definida, usa a primeira escola permitida como padrão
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
        ].includes(usuario.perfil)
      ) {
        // Para perfis de gestão/desenvolvedor/diretores, eles podem ver todas as escolas inicialmente
        tempEscolasPermitidas = escolasListadas.map((e) => e.id); // Todos os IDs de escolas

        // Se a escola selecionada ainda não foi definida, usa a primeira escola do sistema como padrão
        if (escolasListadas.length > 0 && escolaSelecionada === null) {
          setEscolaSelecionada(escolasListadas[0]?.id || null);
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

      // 3. Construção da Query de Alunos com base na escola selecionada e permissões
      let alunosParaExibir = [];
      let escolaAtualmenteSelecionada = escolaSelecionada; // Pega o valor atual do estado de escola selecionada

      // Se não há escola selecionada ainda (ex: primeiro load para AEE/Professor)
      // e ele tem escolas permitidas, define a primeira como a "selecionada atual"
      if (!escolaAtualmenteSelecionada && tempEscolasPermitidas.length > 0) {
        escolaAtualmenteSelecionada = tempEscolasPermitidas[0];
        setEscolaSelecionada(escolaAtualmenteSelecionada); // Atualiza o estado da UI
      }

      if (escolaAtualmenteSelecionada) {
        let qAlunos = query(
          collection(db, "alunos"),
          where("escolaId", "==", escolaAtualmenteSelecionada),
          orderBy("nome")
        );

        // Para AEE, aplicar filtro de turma se houver e o número de turmas for <= 10
        if (usuario.perfil === "aee" && tempTurmasPermitidas.length > 0) {
          if (tempTurmasPermitidas.length <= 10) {
            qAlunos = query(
              qAlunos,
              where("turma", "in", tempTurmasPermitidas)
            );
          } else {
            console.warn(
              "Atenção: AEE tem mais de 10 turmas vinculadas. O filtro 'in' do Firestore só suporta até 10 valores. Alunos serão filtrados no cliente após a busca pela escola."
            );
          }
        }

        const alunosSnap = await getDocs(qAlunos);
        let fetchedAlunos = alunosSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Filtragem adicional no cliente para AEE com mais de 10 turmas
        if (usuario.perfil === "aee" && tempTurmasPermitidas.length > 10) {
          fetchedAlunos = fetchedAlunos.filter((aluno) =>
            turmasPermitidasParaUsuario.includes(aluno.turma)
          );
        }

        alunosParaExibir = fetchedAlunos;
      } else {
        // Se nenhuma escola foi selecionada/permitida, não há alunos para exibir
        alunosParaExibir = [];
      }

      setAlunos(alunosParaExibir); // Atualiza o estado dos alunos para exibição
    } catch (e) {
      console.error("Erro ao carregar todos os dados:", e);
      setError(
        e.message || "Falha ao carregar dados. Por favor, tente novamente."
      );
      setAlunos([]);
      setEscolas([]);
      // Garante que os estados de permissão sejam limpos em caso de erro no carregamento
      setEscolasPermitidasParaUsuario([]);
      setTurmasPermitidasParaUsuario([]);
    } finally {
      setLoading(false); // Desativa o loading
    }
  }, [usuario, escolaSelecionada]); // Dependências: A função re-executa se o usuário ou a escola selecionada mudar

  // Efeito para Carregamento Inicial do componente
  useEffect(() => {
    carregarTodosOsDados();
  }, [carregarTodosOsDados]); // Dispara a função carregarTodosOsDados na montagem e quando ela muda

  // --- Funções de Manipulação de Dados (Salvar/Excluir Aluno) ---

  const handleSalvar = useCallback(async () => {
    if (!formulario?.nome?.trim() || !formulario?.nascimento) {
      alert("Nome e Data de Nascimento são obrigatórios.");
      return;
    }

    let escolaIdParaSalvar = formulario.escolaId;
    // Se a escolaId não está no formulário, tenta pegar da escola selecionada
    if (!escolaIdParaSalvar && escolaSelecionada) {
      escolaIdParaSalvar = escolaSelecionada;
    }

    if (!escolaIdParaSalvar) {
      alert("Não foi possível determinar a escola para salvar o aluno.");
      return;
    }

    setLoadingSalvar(true); // Ativa o loading para a operação de salvar
    try {
      const dadosAlunoParaSalvar = {
        nome: formulario.nome.trim(),
        nascimento: formulario.nascimento,
        turma: formulario.turma?.trim() || "",
        turno: formulario.turno?.trim() || "",
        diagnostico: formulario.diagnostico?.trim() || "",
        escolaId: escolaIdParaSalvar,
      };

      if (formulario.id) {
        // Se o formulário tem um ID, é uma atualização
        await updateDoc(doc(db, "alunos", formulario.id), dadosAlunoParaSalvar);
      } else {
        // Caso contrário, é um novo aluno
        await addDoc(collection(db, "alunos"), dadosAlunoParaSalvar);
      }

      await carregarTodosOsDados(); // Recarrega a lista de alunos para refletir as mudanças
      setModalAberto(false); // Fecha o modal
      setFormulario(null); // Limpa o formulário
    } catch (error) {
      console.error("Erro ao salvar aluno:", error);
      setError(`Erro ao salvar: ${error.message || "Ocorreu um problema."}`); // Exibe erro na UI
    } finally {
      setLoadingSalvar(false); // Desativa o loading de salvar
    }
  }, [formulario, escolaSelecionada, carregarTodosOsDados]); // Dependências da função

  const handleExcluir = useCallback(
    async (idAluno) => {
      if (loadingSalvar) return; // Impede múltiplas exclusões
      if (
        !window.confirm(
          "Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita."
        )
      ) {
        return;
      }

      setLoadingSalvar(true); // Ativa o loading para a operação de excluir
      try {
        await deleteDoc(doc(db, "alunos", idAluno));
        await carregarTodosOsDados(); // Recarrega a lista de alunos após excluir
      } catch (error) {
        console.error("Erro ao excluir aluno:", error);
        setError("Erro ao excluir aluno. Por favor, tente novamente."); // Exibe erro na UI
      } finally {
        setLoadingSalvar(false); // Desativa o loading de excluir
      }
    },
    [loadingSalvar, carregarTodosOsDados] // Dependências da função
  );

  // Memoiza a lista de alunos para exibição na UI
  // Esta lista já é filtrada em `carregarTodosOsDados`, então aqui apenas retorna o estado 'alunos'
  const alunosDaEscola = useMemo(() => {
    return alunos;
  }, [alunos]); // Depende apenas do estado 'alunos'

  // --- Renderização Condicional da UI ---

  // Exibe um loader global enquanto a tela principal está carregando
  if (loading && !error) return <Loader />;

  // Exibe uma mensagem de erro principal se houver um erro e não estiver carregando
  if (error && !loading) {
    return (
      <div style={styles.container}>
        <BotaoVoltar />
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

  // Exibe uma mensagem se não há escolas disponíveis para o perfil (exceto AEE, que tem tratamento de erro específico)
  if (!loading && escolas.length === 0 && usuario?.perfil !== "aee") {
    return (
      <div style={styles.container}>
        <BotaoVoltar />
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

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <BotaoVoltar
          estiloPersonalizado={{
            alignSelf: "flex-start",
            marginBottom: "20px",
          }}
        />
        <div style={styles.header}>
          <h2 style={styles.title}>Alunos Cadastrados</h2>
          {podeEditar && (
            <button
              onClick={() => {
                let targetEscolaId = escolaSelecionada;

                // Valida se há uma escola selecionada para adicionar um novo aluno
                if (
                  !targetEscolaId &&
                  !["desenvolvedor", "gestao"].includes(usuario.perfil) // AEE/Professor já deveria ter targetEscolaId preenchido
                ) {
                  alert(
                    "Por favor, selecione uma escola primeiro para adicionar um novo aluno."
                  );
                  return;
                }

                setFormulario({
                  nome: "",
                  nascimento: "",
                  turma: "",
                  turno: "",
                  diagnostico: "",
                  escolaId: targetEscolaId, // Define a escolaId para o novo formulário
                });
                setModalAberto(true);
              }}
              style={styles.buttonPrimary}
              disabled={loadingSalvar || loading} // Desabilita o botão se estiver salvando ou carregando
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
                  // Renderiza o botão da escola APENAS se ela estiver na lista de escolas permitidas
                  escolasPermitidasParaUsuario.includes(escola.id) && (
                    <button
                      key={escola.id}
                      onClick={() => setEscolaSelecionada(escola.id)}
                      style={styles.schoolButton(
                        escolaSelecionada === escola.id
                      )}
                      disabled={loading} // Desabilita o botão enquanto carrega
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
                      onClick={() => {
                        setFormulario(aluno);
                        setModalAberto(true);
                      }}
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

        {/* Modal de Adição/Edição de Aluno */}
        <Modal
          isOpen={modalAberto}
          onRequestClose={() => {
            if (!loadingSalvar) {
              setModalAberto(false);
              setFormulario(null);
            }
          }}
          style={{
            content: styles.modalContent,
            overlay: { backgroundColor: "rgba(0, 0, 0, 0.75)", zIndex: 1000 },
          }}
          contentLabel={
            formulario?.id ? "Modal de Edição de Aluno" : "Modal de Novo Aluno"
          }
          ariaHideApp={false}
        >
          <h3 style={{ color: "#1d3557", marginBottom: "20px" }}>
            {formulario?.id ? "Editar Aluno" : "Novo Aluno"}
          </h3>
          {[
            {
              label: "Nome Completo",
              field: "nome",
              type: "text",
              required: true,
            },
            {
              label: "Data de Nascimento",
              field: "nascimento",
              type: "date",
              required: true,
            },
            { label: "Turma", field: "turma", type: "text" },
            { label: "Turno", field: "turno", type: "text" },
            { label: "Diagnóstico (CID)", field: "diagnostico", type: "text" },
          ].map(({ label, field, type, required }) => (
            <div key={field} style={styles.formFieldContainer}>
              <label htmlFor={field} style={styles.label}>
                {label}
                {required && <span style={styles.requiredAsterisk}>*</span>}
              </label>
              <input
                id={field}
                type={type}
                value={formulario?.[field] || ""}
                onChange={(e) =>
                  setFormulario((prev) => ({
                    ...prev,
                    [field]: e.target.value,
                  }))
                }
                style={styles.inputField}
                required={required}
                disabled={loadingSalvar}
              />
            </div>
          ))}
          <div style={styles.modalActions}>
            <button
              onClick={() => {
                if (!loadingSalvar) {
                  setModalAberto(false);
                  setFormulario(null);
                }
              }}
              style={styles.cancelButton}
              disabled={loadingSalvar}
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              style={styles.saveButton}
              disabled={loadingSalvar}
            >
              {loadingSalvar
                ? formulario?.id
                  ? "Salvando..."
                  : "Criando..."
                : "Salvar"}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
