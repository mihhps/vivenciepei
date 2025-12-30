import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "../styles/CadastroTurma.css";

const turnosDisponiveis = ["Matutino", "Vespertino", "Noturno", "Integral"];

export default function CadastroTurma() {
  const navigate = useNavigate();
  const [nomeTurma, setNomeTurma] = useState("");
  const [turnoTurma, setTurnoTurma] = useState("");
  const [escolaIdSelecionada, setEscolaIdSelecionada] = useState("");
  const [listaEscolas, setListaEscolas] = useState([]);
  const [turmasCadastradas, setTurmasCadastradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const anoAtivo = Number(localStorage.getItem("anoExercicio")) || 2025;
  const anoAnterior = anoAtivo - 1;

  // Estados para Edição
  const [editandoId, setEditandoId] = useState(null);
  const [nomeEdit, setNomeEdit] = useState("");
  const [turnoEdit, setTurnoEdit] = useState(""); // ✅ Estado para o turno na edição

  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const snap = await getDocs(collection(db, "escolas"));
        setListaEscolas(
          snap.docs.map((d) => ({ id: d.id, nome: d.data().nome }))
        );
      } catch (e) {
        toast.error("Erro ao carregar escolas.");
      } finally {
        setLoading(false);
      }
    };
    fetchEscolas();
  }, []);

  const fetchTurmas = useCallback(async () => {
    if (!escolaIdSelecionada) return;
    setLoading(true);
    try {
      const q = collection(db, "escolas", escolaIdSelecionada, "turmas");
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtradas = data.filter((t) => !t.ano || t.ano === anoAtivo);

      setTurmasCadastradas(
        filtradas.sort((a, b) => a.nome.localeCompare(b.nome))
      );
    } catch (e) {
      toast.error("Erro ao carregar turmas.");
    } finally {
      setLoading(false);
    }
  }, [escolaIdSelecionada, anoAtivo]);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  const handleSalvarTurma = async (e) => {
    e.preventDefault();
    if (!nomeTurma.trim() || !turnoTurma || !escolaIdSelecionada) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "escolas", escolaIdSelecionada, "turmas"), {
        nome: nomeTurma.trim(),
        turno: turnoTurma,
        ano: anoAtivo,
        criadoEm: serverTimestamp(),
      });
      toast.success("Turma cadastrada!");
      setNomeTurma("");
      setTurnoTurma("");
      fetchTurmas();
    } catch (e) {
      toast.error("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Função de edição corrigida para incluir o TURNO
  const salvarEdicao = async (id) => {
    if (!nomeEdit.trim() || !turnoEdit) {
      toast.warning("Preencha todos os campos da edição.");
      return;
    }
    try {
      await updateDoc(doc(db, "escolas", escolaIdSelecionada, "turmas", id), {
        nome: nomeEdit,
        turno: turnoEdit, // ✅ Agora salva o novo turno selecionado
        ano: anoAtivo,
      });
      toast.success("Turma e turno atualizados!");
      setEditandoId(null);
      fetchTurmas();
    } catch (e) {
      toast.error("Erro ao atualizar.");
    }
  };

  const copiarTurmasAnoAnterior = async () => {
    if (!escolaIdSelecionada) return;
    const confirmacao = window.confirm(
      `Copiar turmas de ${anoAnterior} para ${anoAtivo}?`
    );
    if (!confirmacao) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "escolas", escolaIdSelecionada, "turmas"),
        where("ano", "==", anoAnterior)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.info("Nenhuma turma oficial em " + anoAnterior);
        return;
      }
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        const novaRef = doc(
          collection(db, "escolas", escolaIdSelecionada, "turmas")
        );
        batch.set(novaRef, {
          ...d.data(),
          ano: anoAtivo,
          criadoEm: serverTimestamp(),
        });
      });
      await batch.commit();
      toast.success("Turmas migradas!");
      fetchTurmas();
    } catch (e) {
      toast.error("Erro na migração.");
    } finally {
      setLoading(false);
    }
  };

  const gerarTurmasApartirDosAlunos = async () => {
    if (!escolaIdSelecionada) return;
    setLoading(true);
    try {
      const qAlunos = query(
        collection(db, "alunos"),
        where("escolaId", "==", escolaIdSelecionada),
        where("ano", "==", 2025)
      );
      const snapAlunos = await getDocs(qAlunos);
      const turmasDetectadas = new Set();
      snapAlunos.docs.forEach((d) => {
        if (d.data().turma)
          turmasDetectadas.add(d.data().turma.trim().toUpperCase());
      });
      const batch = writeBatch(db);
      turmasDetectadas.forEach((nome) => {
        const novaRef = doc(
          collection(db, "escolas", escolaIdSelecionada, "turmas")
        );
        batch.set(novaRef, {
          nome,
          turno: "Matutino",
          ano: 2025,
          criadoEm: serverTimestamp(),
        });
      });
      await batch.commit();
      toast.success("Turmas extraídas!");
      fetchTurmas();
    } catch (e) {
      toast.error("Erro na extração.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletar = async (id, nome) => {
    if (!window.confirm(`Excluir a turma "${nome}"?`)) return;
    try {
      await deleteDoc(doc(db, "escolas", escolaIdSelecionada, "turmas", id));
      toast.success("Turma removida!");
      fetchTurmas();
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  return (
    <div className="turma-page-container">
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="turma-main-card">
        <div className="turma-form-side">
          <button
            className="btn-voltar-minimal"
            onClick={() => navigate("/painel-gestao")}
          >
            ← Início
          </button>
          <div className="form-header">
            <h2>Gestão de Turmas {anoAtivo}</h2>
            <p>Gerencie turmas do exercício atual.</p>
          </div>

          <form onSubmit={handleSalvarTurma} className="turma-styled-form">
            <div className="input-group">
              <label>Unidade Escolar</label>
              <select
                value={escolaIdSelecionada}
                onChange={(e) => setEscolaIdSelecionada(e.target.value)}
                required
              >
                <option value="">Selecione a Escola</option>
                {listaEscolas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Nome da Turma</label>
              <input
                type="text"
                value={nomeTurma}
                onChange={(e) => setNomeTurma(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Turno</label>
              <select
                value={turnoTurma}
                onChange={(e) => setTurnoTurma(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {turnosDisponiveis.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-salvar-turma"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Cadastrar Turma"}
            </button>

            {escolaIdSelecionada && (
              <div
                className="migracao-actions"
                style={{
                  marginTop: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  className="btn-migrar-turmas"
                  onClick={copiarTurmasAnoAnterior}
                  style={{
                    background: "#f0f9ff",
                    color: "#0369a1",
                    border: "1px dashed #0369a1",
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  ✨ Copiar turmas de {anoAnterior}
                </button>
                <button
                  type="button"
                  onClick={gerarTurmasApartirDosAlunos}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "10px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    color: "#64748b",
                  }}
                >
                  🔍 Extrair turmas de 2025
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="turma-list-side">
          <div className="list-header">
            <h3>Turmas em {anoAtivo}</h3>
            <span className="count-badge">{turmasCadastradas.length}</span>
          </div>
          <div className="turmas-scroll-area">
            <div className="turmas-visual-grid">
              {turmasCadastradas.map((t) => (
                <div key={t.id} className="turma-item-card">
                  {editandoId === t.id ? (
                    <div className="edit-mode">
                      <input
                        value={nomeEdit}
                        onChange={(e) => setNomeEdit(e.target.value)}
                      />
                      {/* ✅ Select de turno adicionado na edição */}
                      <select
                        value={turnoEdit}
                        onChange={(e) => setTurnoEdit(e.target.value)}
                      >
                        {turnosDisponiveis.map((turno) => (
                          <option key={turno} value={turno}>
                            {turno}
                          </option>
                        ))}
                      </select>
                      <div className="edit-actions">
                        <button
                          onClick={() => salvarEdicao(t.id)}
                          className="btn-confirm"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditandoId(null)}
                          className="btn-cancel"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="turma-info-row">
                      <div className="turma-details">
                        <strong>{t.nome}</strong>
                        <span>
                          {t.turno}{" "}
                          {!t.ano && (
                            <i style={{ color: "orange" }}>(Legado)</i>
                          )}
                        </span>
                      </div>
                      <div className="turma-actions">
                        <button
                          onClick={() => {
                            setEditandoId(t.id);
                            setNomeEdit(t.nome);
                            setTurnoEdit(t.turno);
                          }}
                        >
                          ✏️
                        </button>
                        <button onClick={() => handleDeletar(t.id, t.nome)}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
