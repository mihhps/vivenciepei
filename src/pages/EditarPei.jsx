// src/pages/EditarPei.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import sugestoesIA from "../utils/sugestoesIA";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function EditarPei() {
  const { id } = useParams();
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

  const [pei, setPei] = useState(null);
  const [areaAtual, setAreaAtual] = useState("");
  const [subareaAtual, setSubareaAtual] = useState("");
  const [novaMeta, setNovaMeta] = useState({});
  const [resumoPEI, setResumoPEI] = useState([]);

  useEffect(() => {
    const carregarPei = async () => {
      try {
        const ref = doc(db, "peis", id);
        const docSnap = await getDoc(ref);

        if (docSnap.exists()) {
          const dados = docSnap.data();

          // Proteção de acesso: apenas criador, gestão ou AEE podem editar
          if (
            usuario.perfil !== "gestao" &&
            usuario.perfil !== "aee" &&
            usuario.id !== dados.idCriador
          ) {
            alert("Você não tem permissão para editar este PEI.");
            return navigate("/ver-peis");
          }

          setPei({ id, ...dados });
          setResumoPEI(dados.resumoPEI || []);
        } else {
          alert("PEI não encontrado.");
          navigate("/ver-peis");
        }
      } catch (error) {
        console.error("Erro ao carregar PEI:", error);
      }
    };

    carregarPei();
  }, [id, navigate, usuario]);

  const handleAdicionar = async () => {
    if (!areaAtual || !subareaAtual) {
      alert("Selecione uma área e subárea.");
      return;
    }
    if (!novaMeta.objetivos || !novaMeta.estrategias) {
      alert("Preencha os campos de objetivos e estratégias.");
      return;
    }
    if (!novaMeta.nivel) {
      alert("Selecione o nível de desempenho.");
      return;
    }

    const nova = {
      area: areaAtual,
      subarea: subareaAtual,
      objetivos: novaMeta.objetivos.trim(),
      estrategias: novaMeta.estrategias.trim(),
      nivel: novaMeta.nivel,
    };

    const novoResumo = [...resumoPEI, nova];

    try {
      const ref = doc(db, "peis", id);
      await updateDoc(ref, { resumoPEI: novoResumo });
      setResumoPEI(novoResumo);
      setNovaMeta({});
      setAreaAtual("");
      setSubareaAtual("");
      alert("Meta salva com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar PEI:", error);
      alert("Erro ao salvar nova meta.");
    }
  };

  if (!pei) return null;

  return (
    <div style={estilos.fundo}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h2 style={estilos.titulo}>Editar PEI: {pei.aluno}</h2>

        <div style={estilos.areaContainer}>
          {Object.keys(sugestoesIA).map((area) => (
            <button
              key={area}
              style={area === areaAtual ? estilos.botaoAtivo : estilos.botao}
              onClick={() => {
                setAreaAtual(area);
                setSubareaAtual("");
              }}
            >
              {area}
            </button>
          ))}
        </div>

        {areaAtual && (
          <div style={estilos.subareaContainer}>
            {Object.keys(sugestoesIA[areaAtual]).map((subarea) => (
              <button
                key={subarea}
                style={subarea === subareaAtual ? estilos.subbotaoAtivo : estilos.subbotao}
                onClick={() => setSubareaAtual(subarea)}
              >
                {subarea}
              </button>
            ))}
          </div>
        )}

        {subareaAtual && (
          <div>
            <h3>{areaAtual} — {subareaAtual}</h3>

            {resumoPEI
              .filter(
                (m) =>
                  m.area?.toLowerCase() === areaAtual?.toLowerCase() &&
                  m.subarea?.toLowerCase() === subareaAtual?.toLowerCase()
              )
              .map((meta, i) => (
                <div key={i} style={estilos.metaAntiga}>
                  <p><strong>Objetivos:</strong> {meta.objetivos}</p>
                  <p><strong>Estratégias:</strong> {meta.estrategias}</p>
                  <p><strong>Nível:</strong> {meta.nivel}</p>
                </div>
              ))}

            <div>
              <p><strong>Objetivos sugeridos:</strong></p>
              {sugestoesIA[areaAtual][subareaAtual]?.objetivos?.map((obj, i) => (
                <label key={i} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        const atuais = new Set((novaMeta.objetivos || "").split("\n"));
                        atuais.add(obj);
                        setNovaMeta((prev) => ({
                          ...prev,
                          objetivos: Array.from(atuais).filter(Boolean).join("\n"),
                        }));
                      }
                    }}
                  />
                  {obj}
                </label>
              ))}

              <textarea
                style={estilos.textarea}
                placeholder="Escreva seus próprios objetivos (um por linha)"
                value={novaMeta.objetivos || ""}
                onChange={(e) =>
                  setNovaMeta({ ...novaMeta, objetivos: e.target.value })
                }
              />

              <p><strong>Estratégias sugeridas:</strong></p>
              {sugestoesIA[areaAtual][subareaAtual]?.estrategias?.map((est, i) => (
                <label key={i} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        const atuais = new Set((novaMeta.estrategias || "").split("\n"));
                        atuais.add(est);
                        setNovaMeta((prev) => ({
                          ...prev,
                          estrategias: Array.from(atuais).filter(Boolean).join("\n"),
                        }));
                      }
                    }}
                  />
                  {est}
                </label>
              ))}

              <textarea
                style={estilos.textarea}
                placeholder="Escreva suas próprias estratégias (uma por linha)"
                value={novaMeta.estrategias || ""}
                onChange={(e) =>
                  setNovaMeta({ ...novaMeta, estrategias: e.target.value })
                }
              />

              <div style={{ marginTop: 10 }}>
                <label><strong>Nível de desempenho:</strong></label>
                <div style={estilos.radios}>
                  {["NR", "AF", "AL", "AG", "AV", "I"].map((n) => (
                    <label key={n}>
                      <input
                        type="radio"
                        name="nivel"
                        value={n}
                        checked={novaMeta.nivel === n}
                        onChange={(e) =>
                          setNovaMeta({ ...novaMeta, nivel: e.target.value })
                        }
                      />{" "}
                      {n}
                    </label>
                  ))}
                </div>
              </div>

              <button style={estilos.botaoSalvar} onClick={handleAdicionar}>
                Salvar Nova Meta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const estilos = {
  fundo: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(to right, #1d3557, #457b9d)",
    padding: "40px",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "16px",
    maxWidth: "900px",
    width: "100%",
    fontFamily: "'Segoe UI', sans-serif",
  },
  titulo: {
    fontSize: "24px",
    color: "#1d3557",
    marginBottom: "20px",
  },
  areaContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "20px",
  },
  subareaContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "20px",
  },
  botao: {
    backgroundColor: "#a8dadc",
    border: "none",
    padding: "10px 15px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  botaoAtivo: {
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  subbotao: {
    backgroundColor: "#f1faee",
    border: "1px solid #ccc",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  subbotaoAtivo: {
    backgroundColor: "#457b9d",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
  },
  metaAntiga: {
    backgroundColor: "#eee",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "8px",
  },
  textarea: {
    width: "100%",
    minHeight: "60px",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    marginBottom: "10px",
    fontSize: "16px",
  },
  radios: {
    display: "flex",
    gap: "10px",
    marginTop: "5px",
    marginBottom: "20px",
  },
  botaoSalvar: {
    backgroundColor: "#2a9d8f",
    color: "#fff",
    padding: "10px 15px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

export default EditarPei;