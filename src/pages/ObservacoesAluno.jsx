import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";

// Estilos básicos para o componente (você pode ajustar e mover para um arquivo CSS se preferir)
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "20px",
    fontFamily: "'Segoe UI', sans-serif",
    background: "linear-gradient(135deg, #457b9d, #1d3557)",
    minHeight: "100vh",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "30px",
    width: "100%",
    maxWidth: "800px",
    boxShadow: "0 0 25px rgba(22, 1, 114, 0.2)",
    display: "flex",
    flexDirection: "column",
  },
  titulo: {
    textAlign: "center",
    fontSize: "26px",
    color: "#1d3557",
    marginBottom: "20px",
  },
  formGroup: {
    marginBottom: "15px",
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    color: "#1d3557",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    minHeight: "120px",
    fontSize: "16px",
    resize: "vertical",
  },
  button: {
    backgroundColor: "#2a9d8f",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    marginTop: "10px",
    marginRight: "10px",
  },
  observacaoCard: {
    backgroundColor: "#f8f9fa",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "15px",
    marginBottom: "15px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  observacaoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  observacaoMeta: {
    fontWeight: "bold",
    color: "#457b9d",
  },
  observacaoData: {
    fontSize: "0.9em",
    color: "#666",
  },
  observacaoTexto: {
    fontSize: "1em",
    lineHeight: "1.5",
    color: "#333",
  },
  actions: {
    marginTop: "10px",
    display: "flex",
    gap: "10px",
  },
  editButton: {
    backgroundColor: "#457b9d",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  deleteButton: {
    backgroundColor: "#e63946",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  noObservations: {
    textAlign: "center",
    color: "#666",
    padding: "20px",
  },
};

export default function ObservacoesAluno() {
  const { peiId } = useParams(); // Pega o ID do PEI da URL
  const navigate = useNavigate();
  const location = useLocation(); // Para acessar o state passado pelo navigate
  const alunoNome = location.state?.alunoNome || "Aluno Desconhecido"; // Nome do aluno, se passado
  const [observacao, setObservacao] = useState("");
  const [observacoesExistentes, setObservacoesExistentes] = useState([]);
  const [editingId, setEditingId] = useState(null); // ID da observação sendo editada
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado")) || {};

  const carregarObservacoes = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const q = query(
        collection(db, "observacoesAluno"),
        where("peiId", "==", peiId)
      );
      const querySnapshot = await getDocs(q);
      const obs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dataCriacao: doc.data().dataCriacao?.toDate(), // Converte Timestamp para Date
      }));
      // Ordena por data de criação, mais recente primeiro
      obs.sort((a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime());
      setObservacoesExistentes(obs);
    } catch (err) {
      console.error("Erro ao carregar observações:", err);
      setErro("Erro ao carregar observações.");
    } finally {
      setCarregando(false);
    }
  }, [peiId]);

  useEffect(() => {
    carregarObservacoes();
  }, [carregarObservacoes]);

  const handleSalvarObservacao = async () => {
    if (!observacao.trim()) {
      alert("A observação não pode estar vazia.");
      return;
    }

    try {
      if (editingId) {
        // Editando observação existente
        const observacaoRef = doc(db, "observacoesAluno", editingId);
        await updateDoc(observacaoRef, {
          texto: observacao,
          dataAtualizacao: Timestamp.now(), // Adiciona data de atualização
          // Não atualiza peiId, alunoNome, criadorId
        });
        alert("Observação atualizada com sucesso!");
        setEditingId(null); // Sai do modo de edição
      } else {
        // Adicionando nova observação
        await addDoc(collection(db, "observacoesAluno"), {
          peiId: peiId,
          alunoNome: alunoNome, // Salva o nome do aluno junto
          texto: observacao,
          dataCriacao: Timestamp.now(),
          criadorId: usuarioLogado.email,
          nomeCriador: usuarioLogado.nome,
        });
        alert("Observação salva com sucesso!");
      }
      setObservacao(""); // Limpa o textarea
      carregarObservacoes(); // Recarrega as observações
    } catch (err) {
      console.error("Erro ao salvar observação:", err);
      alert("Erro ao salvar observação. Tente novamente.");
    }
  };

  const handleEditar = (obs) => {
    setObservacao(obs.texto);
    setEditingId(obs.id);
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta observação?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "observacoesAluno", id));
      alert("Observação excluída com sucesso!");
      carregarObservacoes();
    } catch (err) {
      console.error("Erro ao excluir observação:", err);
      alert("Erro ao excluir observação. Tente novamente.");
    }
  };

  const formatarData = (data) => {
    if (!data) return "-";
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (carregando) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <BotaoVoltar />
          <p>Carregando observações...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <BotaoVoltar />
          <p style={{ color: "#e63946" }}>{erro}</p>
          <button style={styles.button} onClick={carregarObservacoes}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <BotaoVoltar />
        <h2 style={styles.titulo}>Observações para {alunoNome}</h2>

        <div style={styles.formGroup}>
          <label htmlFor="observacaoTextarea" style={styles.label}>
            {editingId ? "Editar Observação:" : "Nova Observação:"}
          </label>
          <textarea
            id="observacaoTextarea"
            style={styles.textarea}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Descreva suas observações sobre o aluno..."
          ></textarea>
        </div>
        <button style={styles.button} onClick={handleSalvarObservacao}>
          {editingId ? "Atualizar Observação" : "Salvar Nova Observação"}
        </button>
        {editingId && (
          <button
            style={{ ...styles.button, backgroundColor: "#6c757d" }}
            onClick={() => {
              setObservacao("");
              setEditingId(null);
            }}
          >
            Cancelar Edição
          </button>
        )}

        <hr style={{ margin: "30px 0", borderTop: "1px solid #eee" }} />

        <h3 style={styles.titulo}>Observações Anteriores</h3>
        {observacoesExistentes.length === 0 ? (
          <p style={styles.noObservations}>
            Nenhuma observação registrada para este PEI.
          </p>
        ) : (
          observacoesExistentes.map((obs) => (
            <div key={obs.id} style={styles.observacaoCard}>
              <div style={styles.observacaoHeader}>
                <span style={styles.observacaoData}>
                  {formatarData(obs.dataCriacao)} - Por:{" "}
                  {obs.nomeCriador || "Desconhecido"}
                  {obs.dataAtualizacao &&
                    ` (Atualizado: ${formatarData(obs.dataAtualizacao.toDate ? obs.dataAtualizacao.toDate() : obs.dataAtualizacao)})`}
                </span>
              </div>
              <p style={styles.observacaoTexto}>{obs.texto}</p>
              <div style={styles.actions}>
                {(usuarioLogado.email === obs.criadorId ||
                  usuarioLogado.perfil === "gestao" ||
                  usuarioLogado.perfil === "aee") && (
                  <>
                    <button
                      style={styles.editButton}
                      onClick={() => handleEditar(obs)}
                    >
                      Editar
                    </button>
                    <button
                      style={styles.deleteButton}
                      onClick={() => handleExcluir(obs.id)}
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
