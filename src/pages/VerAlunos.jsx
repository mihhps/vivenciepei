import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  writeBatch,
} from "firebase/firestore";
import {
  FaPencilAlt,
  FaTrashAlt,
  FaPlus,
  FaPuzzlePiece,
  FaSearch,
  FaRocket,
} from "react-icons/fa";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";

import "../styles/VerAlunos.css";

const calcularIdade = (data) => {
  if (!data) return "N/A";
  const hoje = new Date();
  const nasc = new Date(data);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  if (
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())
  )
    idade--;
  return idade;
};

const sugerirProximaTurma = (turmaAtual) => {
  if (!turmaAtual) return "";
  const turmas = {
    "Pré I": "Pré II",
    "Pré II": "1º Ano",
    "1º Ano": "2º Ano",
    "2º Ano": "3º Ano",
    "3º Ano": "4º Ano",
    "4º Ano": "5º Ano",
  };
  for (const [chave, valor] of Object.entries(turmas)) {
    if (turmaAtual.includes(chave)) return turmaAtual.replace(chave, valor);
  }
  return turmaAtual;
};

export default function VerAlunos() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState(
    localStorage.getItem("ultimaEscolaSelecionada")
  );
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  const [mostrarModalMigracao, setMostrarModalMigracao] = useState(false);
  const [alunosAnterior, setAlunosAnterior] = useState([]);
  const [selecionados, setSelecionados] = useState([]);

  const ANO_ATUAL = 2025;
  const PROXIMO_ANO = 2026;

  const usuario = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado") || "{}"),
    []
  );

  // ✅ FUNÇÃO PARA VOLTAR AO PAINEL CORRETO (Quebra o looping)
  const voltarHome = () => {
    const perfil = usuario.perfil?.toLowerCase();
    if (perfil === "professor") {
      navigate("/painel-professor");
    } else {
      navigate("/painel-gestao");
    }
  };

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const anoVisualizacao =
        Number(localStorage.getItem("anoExercicio")) || ANO_ATUAL;

      const eSnap = await getDocs(collection(db, "escolas"));
      const eList = eSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEscolas(eList);

      let idParaCarregar = escolaSelecionada;

      if (!idParaCarregar) {
        const perfil = usuario.perfil?.toLowerCase();
        if (["desenvolvedor", "seme"].includes(perfil)) {
          idParaCarregar = eList[0]?.id;
        } else {
          const uDoc = await getDoc(doc(db, "usuarios", usuario.uid));
          idParaCarregar = Object.keys(uDoc.data()?.escolas || {})[0];
        }
        setEscolaSelecionada(idParaCarregar);
        localStorage.setItem("ultimaEscolaSelecionada", idParaCarregar);
      }

      if (idParaCarregar) {
        const q = query(
          collection(db, "alunos"),
          where("escolaId", "==", idParaCarregar),
          where("ano", "==", anoVisualizacao),
          orderBy("nome")
        );
        const aSnap = await getDocs(q);
        setAlunos(aSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const qMigrar = query(
          collection(db, "alunos"),
          where("escolaId", "==", idParaCarregar),
          where("ano", "==", ANO_ATUAL)
        );
        const mSnap = await getDocs(qMigrar);
        setAlunosAnterior(mSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    } catch (e) {
      console.error("Erro:", e);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [usuario.uid, usuario.perfil, escolaSelecionada]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const trocarEscola = (id) => {
    setEscolaSelecionada(id);
    localStorage.setItem("ultimaEscolaSelecionada", id);
  };

  const toggleSelecionar = (id) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const executarMigracao = async () => {
    setLoading(true);
    const batch = writeBatch(db);
    selecionados.forEach((id) => {
      const alunoOriginal = alunosAnterior.find((a) => a.id === id);
      const novaTurma = sugerirProximaTurma(alunoOriginal?.turma);
      const docRef = doc(db, "alunos", id);
      batch.update(docRef, {
        ano: PROXIMO_ANO,
        turma: novaTurma,
      });
    });

    try {
      await batch.commit();
      toast.success(`${selecionados.length} alunos migrados e avançados!`);
      setMostrarModalMigracao(false);
      setSelecionados([]);
      carregarDados();
    } catch (e) {
      toast.error("Erro na migração.");
    } finally {
      setLoading(false);
    }
  };

  const alunosFiltrados = useMemo(() => {
    return alunos.filter((a) =>
      a.nome?.toLowerCase().includes(busca.toLowerCase())
    );
  }, [alunos, busca]);

  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`Excluir o aluno ${nome}?`)) return;
    try {
      await deleteDoc(doc(db, "alunos", id));
      toast.success("Aluno removido.");
      carregarDados();
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="ver-alunos-container">
      <ToastContainer position="bottom-right" />

      {/* MODAL DE MIGRAÇÃO */}
      {mostrarModalMigracao && (
        <div className="modal-migracao-overlay">
          <div className="modal-migracao-card">
            <div className="modal-header">
              <h3 style={{ margin: 0, color: "#0f172a" }}>
                Migrar e Avançar de Série
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                Selecione quem continuará na rede em {PROXIMO_ANO}
              </p>
            </div>
            <div className="lista-selecao-migracao">
              {alunosAnterior.length === 0 ? (
                <p style={{ padding: "20px", textAlign: "center" }}>
                  Nenhum aluno de {ANO_ATUAL} encontrado.
                </p>
              ) : (
                alunosAnterior.map((a) => (
                  <label key={a.id} className="item-selecao">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(a.id)}
                      onChange={() => toggleSelecionar(a.id)}
                    />
                    <div className="aluno-info-mini">
                      <strong style={{ color: "#1e293b" }}>{a.nome}</strong>
                      <span>
                        {a.turma} →{" "}
                        <b style={{ color: "#3b82f6" }}>
                          {sugerirProximaTurma(a.turma)}
                        </b>
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                className="btn-edit"
                onClick={() => setMostrarModalMigracao(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-novo-aluno"
                style={{ flex: 1, margin: 0 }}
                onClick={executarMigracao}
                disabled={selecionados.length === 0}
              >
                Confirmar Avanço ({selecionados.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ver-alunos-header-actions">
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* ✅ BOTÃO CORRIGIDO: Agora chama voltarHome() */}
          <button
            className="tab-escola"
            onClick={voltarHome}
            style={{ padding: "8px 16px" }}
          >
            ← Início
          </button>
          <div className="header-title-group">
            <h1>Alunos Cadastrados</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <p>
                Exercício{" "}
                <strong>
                  {localStorage.getItem("anoExercicio") || "2025"}
                </strong>
              </p>
              <button
                className="btn-abrir-migracao"
                onClick={() => setMostrarModalMigracao(true)}
              >
                <FaRocket size={12} /> Migrar e Avançar
              </button>
            </div>
          </div>
        </div>

        <button
          className="btn-novo-aluno"
          onClick={() => navigate("/cadastrar-aluno")}
        >
          <FaPlus /> Novo Aluno
        </button>
      </div>

      <div className="escolas-tabs-scroll">
        {escolas.map((e) => (
          <button
            key={e.id}
            className={`tab-escola ${
              escolaSelecionada === e.id ? "active" : ""
            }`}
            onClick={() => trocarEscola(e.id)}
          >
            {e.nome}
          </button>
        ))}
      </div>

      <div className="busca-aluno-wrapper">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Pesquisar aluno por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="alunos-grid">
        {alunosFiltrados.map((aluno) => (
          <div key={aluno.id} className="aluno-card-moderno">
            <div className="aluno-card-top">
              <div className="aluno-avatar-wrapper">
                {aluno.fotoUrl ? (
                  <img src={aluno.fotoUrl} alt={aluno.nome} />
                ) : (
                  <div className="avatar-placeholder">
                    {aluno.nome ? aluno.nome[0] : "?"}
                  </div>
                )}
                {aluno.diagnostico?.toLowerCase().includes("tea") && (
                  <div className="tea-badge" title="Aluno com TEA">
                    <FaPuzzlePiece />
                  </div>
                )}
              </div>
              <div className="aluno-main-info">
                <h3>{aluno.nome}</h3>
                <span className="aluno-turma-tag">
                  {aluno.turma || "Sem Turma"}
                </span>
              </div>
            </div>

            <div className="aluno-card-details">
              <div className="detail-item">
                <label>Idade</label>
                <span>{calcularIdade(aluno.nascimento)} anos</span>
              </div>
              <div className="detail-item">
                <label>Turno</label>
                <span>{aluno.turno || "N/A"}</span>
              </div>
              <div className="detail-item full">
                <label>Diagnóstico</label>
                <p>{aluno.diagnostico || "Não informado"}</p>
              </div>
            </div>

            <div className="aluno-card-footer">
              <button
                className="btn-edit"
                onClick={() => navigate(`/editar-aluno/${aluno.id}`)}
              >
                <FaPencilAlt /> Editar
              </button>
              <button
                className="btn-del"
                onClick={() => handleExcluir(aluno.id, aluno.nome)}
              >
                <FaTrashAlt />
              </button>
            </div>
          </div>
        ))}
      </div>

      {alunosFiltrados.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>
          <p>Nenhum aluno encontrado para os critérios selecionados.</p>
        </div>
      )}
    </div>
  );
}
