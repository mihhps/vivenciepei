import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import { useAlunos } from "../hooks/useAlunos";
import { gerarPDFRelatorioIndividual } from "../utils/gerarPDFRelatorios";
import { FaFilePdf, FaEdit, FaTrash, FaEye, FaTimes } from "react-icons/fa";

import "../styles/RelatoriosPage.css";

const RelatoriosPage = () => {
  const { user } = useAuth();
  const {
    alunos,
    carregando: carregandoAlunos,
    erro: erroAlunos,
  } = useAlunos();

  const [selectedAlunoId, setSelectedAlunoId] = useState("");
  const [alunoInfo, setAlunoInfo] = useState(null);
  const [relatorioText, setRelatorioText] = useState("");
  const [relatoriosExistentes, setRelatoriosExistentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [editingRelatorio, setEditingRelatorio] = useState(null);
  const [modalContent, setModalContent] = useState(null);

  useEffect(() => {
    if (!selectedAlunoId) {
      setAlunoInfo(null);
      setRelatoriosExistentes([]);
      return;
    }

    const fetchDados = async () => {
      setLoading(true);
      setError(null);
      try {
        const alunoDocRef = doc(db, "alunos", selectedAlunoId);
        const alunoDocSnap = await getDoc(alunoDocRef);
        if (alunoDocSnap.exists()) {
          setAlunoInfo(alunoDocSnap.data());
        } else {
          setAlunoInfo(null);
          setError("Dados do aluno não encontrados.");
          return;
        }

        const q = query(
          collection(db, `alunos/${selectedAlunoId}/relatorios`),
          orderBy("dataCriacao", "desc")
        );
        const snapshot = await getDocs(q);
        const relatorios = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRelatoriosExistentes(relatorios);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar os dados. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [selectedAlunoId]);

  const handleSaveRelatorio = async (e) => {
    e.preventDefault();
    if (!selectedAlunoId || !relatorioText.trim()) {
      setError("Selecione um aluno e escreva o relatório antes de salvar.");
      return;
    }
    setLoading(true);
    setError(null);
    setSucesso(null);

    const criadorNome = user.nome || user.email.split("@")[0] || "Professor(a)";

    try {
      if (editingRelatorio) {
        const relatorioRef = doc(
          db,
          `alunos/${selectedAlunoId}/relatorios`,
          editingRelatorio.id
        );
        await updateDoc(relatorioRef, {
          texto: relatorioText,
          dataAtualizacao: serverTimestamp(),
        });
        setSucesso("Relatório atualizado com sucesso!");
        setEditingRelatorio(null);
      } else {
        const relatoriosCollectionRef = collection(
          db,
          `alunos/${selectedAlunoId}/relatorios`
        );
        await addDoc(relatoriosCollectionRef, {
          alunoId: selectedAlunoId,
          texto: relatorioText,
          criadorId: user.uid,
          criadorNome: criadorNome,
          dataCriacao: serverTimestamp(),
        });
        setSucesso("Relatório salvo com sucesso!");
      }

      setRelatorioText("");

      const q = query(
        collection(db, `alunos/${selectedAlunoId}/relatorios`),
        orderBy("dataCriacao", "desc")
      );
      const snapshot = await getDocs(q);
      const relatorios = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRelatoriosExistentes(relatorios);
    } catch (err) {
      console.error("Erro ao salvar o relatório:", err);
      setError("Erro ao salvar o relatório. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (relatorio) => {
    setEditingRelatorio(relatorio);
    setRelatorioText(relatorio.texto);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (relatorioId) => {
    if (window.confirm("Tem certeza que deseja excluir este relatório?")) {
      setLoading(true);
      setError(null);
      setSucesso(null);
      try {
        const relatorioRef = doc(
          db,
          `alunos/${selectedAlunoId}/relatorios`,
          relatorioId
        );
        await deleteDoc(relatorioRef);
        setRelatoriosExistentes(
          relatoriosExistentes.filter((r) => r.id !== relatorioId)
        );
        setSucesso("Relatório excluído com sucesso!");
      } catch (err) {
        console.error("Erro ao excluir o relatório:", err);
        setError("Erro ao excluir o relatório. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleView = (relatorio) => {
    if (relatorio && relatorio.texto) {
      setModalContent(relatorio.texto);
    } else {
      setError("Não há conteúdo para este relatório.");
    }
  };

  const closeModal = () => {
    setModalContent(null);
  };

  const formatarData = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== "function")
      return "Data inválida";
    return new Date(timestamp.toDate()).toLocaleDateString("pt-BR");
  };

  const formatarDataNascimento = (dataString) => {
    if (!dataString) return "Não informado";
    try {
      const [ano, mes, dia] = dataString.split("-");
      return `${dia}/${mes}/${ano}`;
    } catch (e) {
      return dataString;
    }
  };

  return (
    <div className="relatorios-container">
      <div className="relatorios-card">
        <div className="relatorios-header">
          <BotaoVoltar />
          <h2 className="relatorios-title">Relatórios do Aluno</h2>
        </div>

        {error && <div className="relatorios-mensagem-erro">{error}</div>}
        {sucesso && (
          <div className="relatorios-mensagem-sucesso">{sucesso}</div>
        )}
        {erroAlunos && (
          <div className="relatorios-mensagem-erro">{erroAlunos}</div>
        )}

        <div className="relatorios-seletor-aluno">
          <label className="relatorios-label">Selecione o Aluno:</label>
          <select
            value={selectedAlunoId}
            onChange={(e) => setSelectedAlunoId(e.target.value)}
            className="relatorios-select"
            disabled={carregandoAlunos}
          >
            <option value="">
              {carregandoAlunos ? "Carregando alunos..." : "Selecione um aluno"}
            </option>
            {alunos.map((aluno) => (
              <option key={aluno.id} value={aluno.id}>
                {aluno.nome}
              </option>
            ))}
          </select>
        </div>

        {loading && <Loader />}

        {alunoInfo && (
          <div className="relatorios-aluno-info">
            <h4>Informações do Aluno:</h4>
            <p>
              <strong>Nome:</strong> {alunoInfo.nome}
            </p>
            <p>
              <strong>Turma:</strong> {alunoInfo.turma}
            </p>
            <p>
              <strong>Data de Nascimento:</strong>{" "}
              {formatarDataNascimento(alunoInfo.nascimento)}
            </p>
            <p>
              <strong>Diagnóstico:</strong>{" "}
              {alunoInfo.diagnostico || "Não informado"}
            </p>
          </div>
        )}

        {selectedAlunoId && (
          <form onSubmit={handleSaveRelatorio} className="relatorios-form">
            <div className="relatorios-form-group">
              <label htmlFor="relatorio-text" className="relatorios-label">
                {editingRelatorio ? "Editar Relatório" : "Novo Relatório"}
              </label>
              <textarea
                id="relatorio-text"
                value={relatorioText}
                onChange={(e) => setRelatorioText(e.target.value)}
                placeholder="Escreva aqui o seu relatório de observação, atividades e progresso..."
                rows="8"
                className="relatorios-textarea"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              className="relatorios-botao-salvar"
              disabled={loading}
            >
              {loading
                ? "Salvando..."
                : editingRelatorio
                  ? "Salvar Edição"
                  : "Salvar Relatório"}
            </button>
          </form>
        )}

        {selectedAlunoId && (
          <div className="relatorios-lista-container">
            <h3>Relatórios Anteriores</h3>
            {relatoriosExistentes.length > 0
              ? relatoriosExistentes.map((relatorio) => (
                  <div key={relatorio.id} className="relatorio-item">
                    <div className="relatorio-meta">
                      <div className="relatorio-meta-info">
                        <span className="relatorio-data">
                          {formatarData(relatorio.dataCriacao)}
                        </span>
                        <span className="relatorio-criador">
                          por {relatorio.criadorNome}
                        </span>
                      </div>
                      <div className="relatorio-botoes-acao">
                        <button
                          type="button"
                          onClick={() => handleView(relatorio)}
                          className="botao-icone relatorio-botao-ver"
                          title="Ver Relatório"
                        >
                          <FaEye size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(relatorio)}
                          className="botao-icone relatorio-botao-editar"
                          title="Editar Relatório"
                        >
                          <FaEdit size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(relatorio.id)}
                          className="botao-icone relatorio-botao-excluir"
                          title="Excluir Relatório"
                        >
                          <FaTrash size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            gerarPDFRelatorioIndividual(alunoInfo, relatorio)
                          }
                          className="botao-icone relatorio-botao-pdf"
                          title="Gerar PDF"
                        >
                          <FaFilePdf size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              : !loading && (
                  <p className="relatorios-info-message">
                    Nenhum relatório encontrado para este aluno.
                  </p>
                )}
          </div>
        )}
      </div>

      {modalContent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Conteúdo do Relatório</h3>
              <button onClick={closeModal} className="modal-close-btn">
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <p className="relatorio-texto-modal">{modalContent}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatoriosPage;
