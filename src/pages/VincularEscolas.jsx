import React, { useEffect, useState } from "react";
import { getDocs, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

export default function VincularEscolas() {
  const [professores, setProfessores] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [edicoesPendentes, setEdicoesPendentes] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!usuario || usuario.perfil !== "gestao") {
      alert("Apenas a SEME pode acessar esta página.");
      navigate("/");
    }
  }, [navigate]);

  const carregarDados = async () => {
    try {
      const usuariosSnap = await getDocs(collection(db, "usuarios"));
      const escolasSnap = await getDocs(collection(db, "escolas"));

      const professoresFiltrados = usuariosSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.perfil?.toLowerCase() === "professor");

      const escolasListadas = escolasSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProfessores(professoresFiltrados);
      setEscolas(escolasListadas);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const toggleEscola = (profId, escolaId) => {
    setEdicoesPendentes(prev => {
      const atual = { ...(prev[profId] || {}) };
      atual[escolaId] = !atual[escolaId];
      if (!atual[escolaId]) delete atual[escolaId];
      return { ...prev, [profId]: atual };
    });
  };

  const salvarEscolas = async (profId, escolasSelecionadas) => {
    try {
      const escolasFiltradas = Object.fromEntries(
        Object.entries(escolasSelecionadas).filter(([_, valor]) => valor === true)
      );

      await updateDoc(doc(db, "usuarios", profId), {
        escolas: escolasFiltradas
      });

      setEdicoesPendentes(prev => {
        const novo = { ...prev };
        delete novo[profId];
        return novo;
      });

      await carregarDados();
      alert("Vínculos atualizados com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const professoresVinculados =
    escolaSelecionada === "semVinculo"
      ? professores.filter(prof => !prof.escolas || Object.keys(prof.escolas).length === 0)
      : professores.filter(prof =>
          Object.keys(prof.escolas || {}).includes(escolaSelecionada?.id)
        );

  return (
    <div style={estilos.fundo}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h2 style={estilos.titulo}>Vincular Escolas a Professores</h2>

        <div style={estilos.abasContainer}>
          {escolas.map((escola) => (
            <button
              key={escola.id}
              style={{
                ...estilos.aba,
                backgroundColor: escolaSelecionada?.id === escola.id ? "#1d3557" : "#ccc",
                color: escolaSelecionada?.id === escola.id ? "#fff" : "#333",
              }}
              onClick={() => {
                setEscolaSelecionada(escola);
                setModoEdicao(false);
              }}
            >
              {escola.nome}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: "20px" }}>
          <button
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              backgroundColor: escolaSelecionada === "semVinculo" ? "#1d3557" : "#ccc",
              color: escolaSelecionada === "semVinculo" ? "#fff" : "#333"
            }}
            onClick={() => {
              setEscolaSelecionada("semVinculo");
              setModoEdicao(false);
            }}
          >
            Professores sem vínculo
          </button>
        </div>

        {escolaSelecionada && (
          <>
            <h3 style={estilos.subtitulo}>
              {escolaSelecionada === "semVinculo"
                ? "Professores sem vínculo"
                : `Professores vinculados à ${escolaSelecionada.nome}`}
            </h3>

            <ul style={estilos.lista}>
              {professoresVinculados.map((prof) => (
                <div key={prof.id} style={estilos.professorCard}>
                  <h4>{prof.nome} ({prof.email})</h4>
                  {escolaSelecionada === "semVinculo" ? (
                    <>
                      <div style={estilos.checkboxContainer}>
                        {escolas.map((escola) => (
                          <label key={escola.id} style={estilos.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={
                                edicoesPendentes[prof.id]?.[escola.id] ??
                                !!prof.escolas?.[escola.id]
                              }
                              onChange={() => toggleEscola(prof.id, escola.id)}
                            />
                            {escola.nome}
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          salvarEscolas(prof.id, edicoesPendentes[prof.id] || prof.escolas || {})
                        }
                        style={estilos.botaoSalvar}
                      >
                        Salvar alterações
                      </button>
                    </>
                  ) : (
                    <p>{prof.nome} ({prof.email})</p>
                  )}
                </div>
              ))}
            </ul>

            {escolaSelecionada !== "semVinculo" && (
              <button style={estilos.botao} onClick={() => setModoEdicao(true)}>
                Editar vínculos
              </button>
            )}

            {modoEdicao && escolaSelecionada !== "semVinculo" && (
              <>
                {professores.map((prof) => (
                  <div key={prof.id} style={estilos.professorCard}>
                    <h4>{prof.nome} ({prof.email})</h4>
                    <div style={estilos.checkboxContainer}>
                      {escolas.map((escola) => (
                        <label key={escola.id} style={estilos.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={
                              edicoesPendentes[prof.id]?.[escola.id] ??
                              !!prof.escolas?.[escola.id]
                            }
                            onChange={() => toggleEscola(prof.id, escola.id)}
                          />
                          {escola.nome}
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        salvarEscolas(prof.id, edicoesPendentes[prof.id] || prof.escolas || {})
                      }
                      style={estilos.botaoSalvar}
                    >
                      Salvar alterações
                    </button>
                  </div>
                ))}
                <button style={estilos.botaoCancelar} onClick={() => setModoEdicao(false)}>
                  Cancelar edição
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const estilos = {
  fundo: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    display: "flex",
    justifyContent: "center",
    alignItems: "start",
    paddingTop: "40px",
    fontFamily: "'Segoe UI', sans-serif"
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 0 20px rgba(0,0,0,0.2)",
    width: "90%",
    maxWidth: "900px",
    textAlign: "center"
  },
  titulo: {
    fontSize: "24px",
    marginBottom: "20px",
    color: "#1d3557"
  },
  abasContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
    justifyContent: "center"
  },
  aba: {
    padding: "8px 16px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold"
  },
  subtitulo: {
    fontSize: "18px",
    marginBottom: "10px",
    color: "#1d3557"
  },
  lista: {
    listStyle: "none",
    padding: 0,
    marginBottom: "20px"
  },
  professorCard: {
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "20px",
    backgroundColor: "#f9f9f9",
    textAlign: "left"
  },
  checkboxContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "10px"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  botao: {
    padding: "10px 20px",
    backgroundColor: "#457b9d",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "15px"
  },
  botaoSalvar: {
    marginTop: "10px",
    padding: "10px 20px",
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },
  botaoCancelar: {
    marginTop: "30px",
    padding: "10px 20px",
    backgroundColor: "#aaa",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  }
};