import React, { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaSave,
  FaPlus,
  FaCheckCircle,
  FaBrain,
  FaHeart,
  FaFolderOpen,
  FaTools,
  FaCommentDots,
  FaEdit,
} from "react-icons/fa";
import "../styles/CriarPlanoDUA.css";

export default function EditarPlanoAulaDUA() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [turmas, setTurmas] = useState([]);
  const [plano, setPlano] = useState({
    tituloAula: "",
    turmaId: "",
    turmaNome: "",
    conteudoTema: "",
    objetivoCurricularBNCC: "",
    representacao: [],
    acaoExpressao: [],
    engajamento: [],
    materiais: "",
    observacoes: "",
    anoLetivo: "",
  });

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado")) || {},
    []
  );
  const escolaIdContexto = localStorage.getItem("escolaId");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, "planosAulaDUA", id));
      if (docSnap.exists()) {
        const dados = docSnap.data();
        setPlano({ id: docSnap.id, ...dados });

        if (escolaIdContexto) {
          const snap = await getDocs(
            query(
              collection(db, "escolas", escolaIdContexto, "turmas"),
              orderBy("nome")
            )
          );
          const dataTurmas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Filtra pelo ano do plano para evitar misturar turmas de anos diferentes
          setTurmas(
            dataTurmas.filter((t) => String(t.ano) === String(dados.anoLetivo))
          );
        }
      } else {
        navigate("/ver-planos-aula");
      }
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, escolaIdContexto]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = async () => {
    if (!plano.tituloAula) return alert("O título é obrigatório!");
    setSalvando(true);
    try {
      await updateDoc(doc(db, "planosAulaDUA", id), {
        ...plano,
        atualizadoEm: serverTimestamp(),
      });
      navigate(`/visualizar-plano-dua/${id}`);
    } catch (e) {
      alert("Erro ao salvar alterações.");
    } finally {
      setSalvando(false);
    }
  };

  const toggleItem = (campo, valor) => {
    setPlano((prev) => {
      const lista = prev[campo] || [];
      return lista.includes(valor)
        ? { ...prev, [campo]: lista.filter((i) => i !== valor) }
        : { ...prev, [campo]: [...lista, valor] };
    });
  };

  if (loading)
    return <div className="loading-screen-view">Sincronizando ambiente...</div>;

  return (
    <div className="dua-premium-container">
      <header className="premium-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <div className="header-title-center">
          <span className="step-label">
            MODO DE EDIÇÃO • {plano.tituloAula}
          </span>
        </div>
        <div className="header-actions">
          <button
            onClick={() => navigate("/ver-planos-aula")}
            className="btn-ghost-plans"
          >
            <FaFolderOpen /> <span>Meus Planos</span>
          </button>
          <button
            className="btn-save-final"
            onClick={handleUpdate}
            disabled={salvando}
          >
            {salvando ? (
              "..."
            ) : (
              <>
                <FaSave /> Salvar Alterações
              </>
            )}
          </button>
        </div>
      </header>

      <main className="premium-grid">
        <section className="interaction-column">
          <div className="form-inicio animate-slide-up">
            <div className="input-group">
              <label>Título da Aula</label>
              <input
                type="text"
                value={plano.tituloAula}
                onChange={(e) =>
                  setPlano({ ...plano, tituloAula: e.target.value })
                }
              />
            </div>
            <div className="input-group">
              <label>Turma</label>
              <select
                value={plano.turmaId}
                onChange={(e) => {
                  const t = turmas.find((x) => x.id === e.target.value);
                  setPlano({
                    ...plano,
                    turmaId: e.target.value,
                    turmaNome: t?.nome || "",
                  });
                }}
              >
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Tema / Conteúdo</label>
              <textarea
                rows={3}
                value={plano.conteudoTema}
                onChange={(e) =>
                  setPlano({ ...plano, conteudoTema: e.target.value })
                }
              />
            </div>
            <div className="input-group">
              <label>Habilidade BNCC</label>
              <textarea
                rows={2}
                value={plano.objetivoCurricularBNCC}
                onChange={(e) =>
                  setPlano({ ...plano, objetivoCurricularBNCC: e.target.value })
                }
              />
            </div>
          </div>

          <div
            className="dua-edit-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            <EditPillar
              titulo="Representação"
              icon={<FaBrain />}
              cor="#8b5cf6"
              campo="representacao"
              plano={plano}
              toggle={toggleItem}
            />
            <EditPillar
              titulo="Ação e Expressão"
              icon={<FaCheckCircle />}
              cor="#3b82f6"
              campo="acaoExpressao"
              plano={plano}
              toggle={toggleItem}
            />
            <EditPillar
              titulo="Engajamento"
              icon={<FaHeart />}
              cor="#ec4899"
              campo="engajamento"
              plano={plano}
              toggle={toggleItem}
            />
          </div>

          <div
            className="form-inicio animate-slide-up"
            style={{ marginTop: "20px" }}
          >
            <div className="input-group">
              <label>
                <FaTools /> Recursos e Materiais
              </label>
              <textarea
                rows={3}
                value={plano.materiais}
                onChange={(e) =>
                  setPlano({ ...plano, materiais: e.target.value })
                }
              />
            </div>
            <div className="input-group">
              <label>
                <FaCommentDots /> Observações
              </label>
              <textarea
                rows={3}
                value={plano.observacoes}
                onChange={(e) =>
                  setPlano({ ...plano, observacoes: e.target.value })
                }
              />
            </div>
          </div>
        </section>

        <aside className="educational-column">
          <div className="edu-card" style={{ borderColor: "#3b82f6" }}>
            <FaEdit size={40} color="#3b82f6" />
            <h2>Modo de Edição</h2>
            <p className="edu-text">
              As alterações feitas aqui serão atualizadas no banco de dados e
              refletidas no PDF oficial.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

function EditPillar({ titulo, icon, cor, campo, plano, toggle }) {
  const [novo, setNovo] = useState("");
  const itens = plano[campo] || [];
  return (
    <div
      className="saas-card"
      style={{
        borderLeft: `4px solid ${cor}`,
        background: "rgba(255,255,255,0.02)",
        padding: "20px",
        borderRadius: "15px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: cor,
          fontWeight: "800",
          marginBottom: "15px",
        }}
      >
        {icon} <span>{titulo}</span>
      </div>
      <div
        className="dua-selection-grid"
        style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
      >
        {itens.map((it, idx) => (
          <div
            key={idx}
            className="dua-chip active"
            style={{
              background: cor,
              padding: "6px 14px",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
            onClick={() => toggle(campo, it)}
          >
            {it} <span style={{ marginLeft: "5px", opacity: 0.7 }}>×</span>
          </div>
        ))}
      </div>
      <div
        className="add-manual-row"
        style={{ marginTop: "15px", display: "flex", gap: "10px" }}
      >
        <input
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            padding: "10px",
            borderRadius: "8px",
          }}
          placeholder="Nova estratégia..."
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && novo && (toggle(campo, novo), setNovo(""))
          }
        />
        <button
          onClick={() => {
            if (novo) toggle(campo, novo);
            setNovo("");
          }}
          style={{
            background: cor,
            border: "none",
            color: "#fff",
            padding: "0 15px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <FaPlus />
        </button>
      </div>
    </div>
  );
}
