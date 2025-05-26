import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import sugestoesIA from "../utils/sugestoesIA";
import BotaoVoltar from "../components/BotaoVoltar";

const niveis = ["NR", "AF", "AL", "AG", "AV", "I"];
const legenda = {
  NR: "Não Realiza",
  AF: "Ajuda Física",
  AL: "Ajuda Leve",
  AG: "Ajuda Gestual",
  AV: "Ajuda Verbal",
  I: "Independente",
};

const estrutura = {
    Psicomotor: [
      "Postura", "Locomoção", "Manipulação de objetos", "Combinação de movimentos",
      "Lateralidade", "Equilíbrio", "Motricidade ampla", "Motricidade fina",
      "Motricidade orofacial", "Percepção espacial", "Percepção temporal"
    ],
    Cognitivo: [
      "Memória", "Percepção de mundo", "Atenção", "Permanência",
      "Compreensão e seguimento de regras", "Funcionalidade dos objetos",
      "Raciocínio lógico", "Resolução de problemas", "Teoria da mente"
    ],
    "Independência Pessoal": [
      "Segurança e saúde", "Higiene", "Organização de materiais",
      "Alimentação", "Seguir instruções", "Vestuário"
    ],
    Comportamento: [
      "Tolerância à frustração", "Interação social", "Cooperação e afetividade",
      "Demonstrar desejos e anseios", "Fazer escolhas", "Fazer pedidos",
      "Nomear coisas", "Atender comandos"
    ],
    Comunicação: [
      "Imitação", "Contato visual", "Intenção comunicativa",
      "Expressão oral", "CAA - Comunicação alternativa"
    ]
  };
export default function ContinuarPei() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [peiAntigo, setPeiAntigo] = useState(null);
  const [peiNovo, setPeiNovo] = useState([]);
  const [inicio, setInicio] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [proximaAvaliacao, setProximaAvaliacao] = useState("");
  const [areaAtiva, setAreaAtiva] = useState("Psicomotor");

  useEffect(() => {
    const peis = JSON.parse(localStorage.getItem("peis")) || [];
    const peiOriginal = peis[parseInt(id)];
    if (!peiOriginal) {
      alert("PEI não encontrado.");
      navigate("/ver-peis");
      return;
    }

    setPeiAntigo(peiOriginal);
    setInicio(peiOriginal.dataInicio);
    setPeriodo(peiOriginal.periodo);
    setProximaAvaliacao(peiOriginal.dataProximaAvaliacao);
    setPeiNovo(peiOriginal.areas || []);
  }, [id, navigate]);

  const atualizarCampo = (index, campo, valor) => {
    const copia = [...peiNovo];
    copia[index][campo] = valor;
    setPeiNovo(copia);
  };

  const salvarNovoPEI = () => {
    if (!inicio || !periodo || !proximaAvaliacao) {
      alert("Preencha todos os campos!");
      return;
    }

    const novoPEI = {
      aluno: peiAntigo.aluno,
      turma: peiAntigo.turma,
      dataInicio: inicio,
      periodo,
      dataProximaAvaliacao: proximaAvaliacao,
      areas: peiNovo,
      criadoEm: new Date().toLocaleDateString("pt-BR"),
    };

    const antigos = JSON.parse(localStorage.getItem("peis")) || [];
    localStorage.setItem("peis", JSON.stringify([...antigos, novoPEI]));
    alert("Continuação do PEI salva com sucesso!");
    navigate("/ver-peis");
  };

  if (!peiAntigo) return null;

  return (
    <div style={{ padding: "40px", backgroundColor: "#f7f7f7", minHeight: "100vh" }}>
      <BotaoVoltar />
      <h2>Continuar PEI de {peiAntigo.aluno}</h2>

      <p><strong>Turma:</strong> {peiAntigo.turma}</p>

      <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} placeholder="Início" />
      <input type="text" value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="Período de intervenção" />
      <input type="date" value={proximaAvaliacao} onChange={(e) => setProximaAvaliacao(e.target.value)} placeholder="Próxima avaliação" />

      <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
        {Object.keys(estrutura).map((area) => (
          <button key={area} onClick={() => setAreaAtiva(area)} style={{ padding: 10, backgroundColor: areaAtiva === area ? "#0288d1" : "#ccc", color: "#fff", border: "none", borderRadius: 6 }}>
            {area}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {peiNovo.filter((p) => p.area === areaAtiva).map((item, idx) => (
          <div key={idx} style={{ marginBottom: 20, background: "#fff", padding: 15, borderRadius: 8 }}>
            <strong>{item.subarea}</strong>
            <div>
              <label>Objetivos:</label>
              <textarea
                value={item.objetivos.join("\n")}
                onChange={(e) => atualizarCampo(idx, "objetivos", e.target.value.split("\n"))}
                style={{ width: "100%", height: 60 }}
              />
            </div>
            <div>
              <label>Estratégias:</label>
              <textarea
                value={item.estrategias.join("\n")}
                onChange={(e) => atualizarCampo(idx, "estrategias", e.target.value.split("\n"))}
                style={{ width: "100%", height: 60 }}
              />
            </div>
            <div>
              <label>Nível:</label>
              {niveis.map((n) => (
                <label key={n} style={{ marginRight: 10 }}>
                  <input
                    type="radio"
                    name={`nivel-${idx}`}
                    value={n}
                    checked={item.nivel === n}
                    onChange={() => atualizarCampo(idx, "nivel", n)}
                  />
                  {n} ({legenda[n]})
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={salvarNovoPEI} style={{ marginTop: 30, backgroundColor: "#00695c", color: "#fff", padding: 12, fontSize: 16, border: "none", borderRadius: 8 }}>
        Salvar continuação do PEI
      </button>
    </div>
  );
}