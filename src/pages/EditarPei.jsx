import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import sugestoesIA from "../utils/sugestoesIA";

function EditarPei() {
  const { aluno } = useParams();
  const navigate = useNavigate();

  const [pei, setPei] = useState(null);
  const [areaAtual, setAreaAtual] = useState("");
  const [subareaAtual, setSubareaAtual] = useState("");
  const [novaMeta, setNovaMeta] = useState({});
  const [resumoPEI, setResumoPEI] = useState([]);

  useEffect(() => {
    const peisSalvos = JSON.parse(localStorage.getItem("peis")) || [];
    const existente = peisSalvos.find(p => p.aluno === aluno);
    if (!existente) {
      alert("PEI não encontrado.");
      navigate("/ver-peis");
    } else {
      setPei(existente);
      setResumoPEI(existente.resumoPEI || []);
    }
  }, [aluno, navigate]);

  const handleAdicionar = () => {
    if (!areaAtual || !subareaAtual || !novaMeta.objetivos || !novaMeta.estrategias || !novaMeta.nivel) {
      alert("Preencha todos os campos");
      return;
    }

    const nova = {
      area: areaAtual,
      subarea: subareaAtual,
      objetivos: novaMeta.objetivos,
      estrategias: novaMeta.estrategias,
      nivel: novaMeta.nivel,
    };

    const novoResumo = [...resumoPEI, nova];
    const peisSalvos = JSON.parse(localStorage.getItem("peis")) || [];
    const indice = peisSalvos.findIndex(p => p.aluno === aluno);
    if (indice !== -1) {
      peisSalvos[indice].resumoPEI = novoResumo;
      localStorage.setItem("peis", JSON.stringify(peisSalvos));
      setResumoPEI(novoResumo);
      setNovaMeta({});
    }
  };

  return (
    <div style={estilos.fundo}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h2 style={estilos.titulo}>Editar PEI: {aluno}</h2>

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

            {/* Metas anteriores */}
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

            {/* Sugestões e Formulário */}
            <div>
              <p><strong>Objetivos sugeridos:</strong></p>
              {sugestoesIA[areaAtual][subareaAtual]?.objetivos?.map((obj, i) => (
                <label key={i} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNovaMeta((prev) => ({
                          ...prev,
                          objetivos: (prev.objetivos || "") + obj + "\n",
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
                        setNovaMeta((prev) => ({
                          ...prev,
                          estrategias: (prev.estrategias || "") + est + "\n",
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
    fontSize: "16px"
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