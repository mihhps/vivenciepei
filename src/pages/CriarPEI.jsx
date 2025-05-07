import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import BotaoVoltar from "../components/BotaoVoltar";
import sugestoesIA from "../utils/sugestoesIA";
import { db } from "../firebase";
import { collection, addDoc, Timestamp, getDocs } from "firebase/firestore";

Modal.setAppElement("#root");

const niveis = ["NR", "AF", "AL", "AG", "AV", "I"];
const legenda = {
  NR: "Não Realiza", AF: "Ajuda Física", AL: "Ajuda Leve",
  AG: "Ajuda Gestual", AV: "Ajuda Verbal", I: "Independente"
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

export default function CriarPEI() {
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [inicio, setInicio] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [proximaAvaliacao, setProximaAvaliacao] = useState("");
  const [areaAtual, setAreaAtual] = useState("Psicomotor");
  const [pei, setPei] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [subareaSelecionada, setSubareaSelecionada] = useState("");
  const [entrada, setEntrada] = useState({
    objetivos: [], estrategias: [], nivel: "", objetivosManual: "", estrategiasManual: ""
  });
  useEffect(() => {
    async function carregarAlunosSemPEI() {
      try {
        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
        if (!usuarioLogado) return;
  
        const alunosSnap = await getDocs(collection(db, "alunos"));
        const peisSnap = await getDocs(collection(db, "peis"));
  
        const todosAlunos = alunosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const todosPeis = peisSnap.docs.map(doc => doc.data());
  
        let nomesComPei = [];
  
        if (usuarioLogado.perfil === "professor") {
          nomesComPei = todosPeis
            .filter(p => p.criadorId === usuarioLogado.email)
            .map(p => p.aluno);
        } else {
          nomesComPei = todosPeis.map(p => p.aluno);
        }
  
        const semPEI = todosAlunos.filter(aluno => !nomesComPei.includes(aluno.nome));
        setAlunos(semPEI);
      } catch (erro) {
        console.error("Erro ao buscar dados no Firestore:", erro);
        alert("Erro ao buscar dados no Firestore.");
      }
    }
  
    carregarAlunosSemPEI();
  }, []);

  const salvarPEI = async () => {
    if (!alunoSelecionado || !inicio || !periodo || !proximaAvaliacao) {
      alert("Preencha todos os campos!");
      return;
    }

    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
    const novoPei = {
      aluno: alunoSelecionado.nome,
      turma: alunoSelecionado.turma,
      inicio: new Date(inicio).toISOString(),
      proximaAvaliacao: new Date(proximaAvaliacao).toISOString(),
      resumoPEI: pei,
      criadoEm: new Date().toLocaleDateString("pt-BR"),
      nomeCriador: usuarioLogado?.nome || "Desconhecido",
      criadorId: usuarioLogado?.email || "",
      cargoCriador: usuarioLogado?.cargo || "Desconhecido",
      dataCriacao: Timestamp.now()
    };

    try {
      await addDoc(collection(db, "peis"), novoPei);
      alert("PEI salvo com sucesso no Firestore!");
      setPei([]);
      setAlunoSelecionado(null);
      setInicio("");
      setPeriodo("");
      setProximaAvaliacao("");
    } catch (erro) {
      console.error("Erro ao salvar PEI:", erro);
      alert("Erro ao salvar PEI.");
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h2 style={estilos.titulo}>Criar PEI</h2>

        <select value={alunoSelecionado?.nome || ""} onChange={(e) => {
          const aluno = alunos.find(a => a.nome === e.target.value);
          setAlunoSelecionado(aluno);
        }} style={estilos.input}>
          <option value="">Selecione o Aluno</option>
          {alunos.map((a, i) => (
            <option key={i} value={a.nome}>{a.nome}</option>
          ))}
        </select>

        {alunoSelecionado && (
          <>
            <p><strong>Turma:</strong> {alunoSelecionado.turma}</p>

            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} style={estilos.input} />
            <input type="text" value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="Período de intervenção" style={estilos.input} />
            <input type="date" value={proximaAvaliacao} onChange={(e) => setProximaAvaliacao(e.target.value)} style={estilos.input} />

            <div style={estilos.abas}>
              {Object.keys(estrutura).map((area) => (
                <button key={area} onClick={() => setAreaAtual(area)} style={estilos.botaoAba(area === areaAtual)}>
                  {area}
                </button>
              ))}
            </div>

            <div style={estilos.subareaBox}>
              {estrutura[areaAtual].map((sub, i) => (
                <button key={i} onClick={() => {
                  setSubareaSelecionada(sub);
                  setEntrada({ objetivos: [], estrategias: [], nivel: "", objetivosManual: "", estrategiasManual: "" });
                  setModalAberto(true);
                }} style={estilos.botaoSubarea}>
                  {sub}
                </button>
              ))}
            </div>

            <h3 style={estilos.subtitulo}>Resumo do PEI</h3>
            {pei.map((item, idx) => (
              <div key={idx} style={estilos.boxResumo}>
                <strong>{item.area} — {item.subarea}</strong>
                <p><strong>Nível:</strong> {item.nivel} ({legenda[item.nivel]})</p>

                <p><strong>Objetivos:</strong></p>
<ul>
  {(item.objetivos || [])
    .filter((o) => o && o.trim() !== "")
    .map((objetivo, i) => (
      <li key={i}>{objetivo}</li>
    ))}
</ul>

<p><strong>Estratégias:</strong></p>
<ul>
  {(item.estrategias || [])
    .filter((e) => e && e.trim() !== "")
    .map((estrategia, i) => (
      <li key={i}>{estrategia}</li>
    ))}
</ul>
              </div>
            ))}

            <button onClick={salvarPEI} style={estilos.salvar}>Salvar PEI</button>
          </>
        )}

        <Modal isOpen={modalAberto} onRequestClose={() => setModalAberto(false)} contentLabel="Subáreas" style={{
          content: { maxWidth: "600px", margin: "auto", padding: "30px" }
        }}>
          <h2>{areaAtual}</h2>
          <h4>{subareaSelecionada}</h4>

          <label>Objetivos sugeridos:</label>
          {(sugestoesIA?.[areaAtual]?.[subareaSelecionada]?.objetivos || []).map((obj, i) => (
            <label key={i} style={{ display: "block", marginLeft: 10 }}>
              <input
                type="checkbox"
                checked={entrada.objetivos.includes(obj)}
                onChange={(e) => {
                  setEntrada(prev => ({
                    ...prev,
                    objetivos: e.target.checked
                      ? [...prev.objetivos, obj]
                      : prev.objetivos.filter(o => o !== obj)
                  }));
                }}
              /> {obj}
            </label>
          ))}
          <textarea
            placeholder="Escreva seus próprios objetivos (um por linha)"
            value={entrada.objetivosManual}
            onChange={(e) => setEntrada({ ...entrada, objetivosManual: e.target.value })}
            style={{ width: "100%", marginTop: 10 }}
          />

          <label style={{ marginTop: 20 }}>Estratégias sugeridas:</label>
          {(sugestoesIA?.[areaAtual]?.[subareaSelecionada]?.estrategias || []).map((est, i) => (
            <label key={i} style={{ display: "block", marginLeft: 10 }}>
              <input
                type="checkbox"
                checked={entrada.estrategias.includes(est)}
                onChange={(e) => {
                  setEntrada(prev => ({
                    ...prev,
                    estrategias: e.target.checked
                      ? [...prev.estrategias, est]
                      : prev.estrategias.filter(s => s !== est)
                  }));
                }}
              /> {est}
            </label>
          ))}
          <textarea
            placeholder="Escreva suas próprias estratégias (uma por linha)"
            value={entrada.estrategiasManual}
            onChange={(e) => setEntrada({ ...entrada, estrategiasManual: e.target.value })}
            style={{ width: "100%", marginTop: 10 }}
          />

          <label style={{ marginTop: 20 }}>Nível de desempenho:</label><br />
          {niveis.map(n => (
            <label key={n} style={{ marginRight: 10 }}>
              <input
                type="radio"
                name="nivel"
                value={n}
                checked={entrada.nivel === n}
                onChange={() => setEntrada({ ...entrada, nivel: n })}
              />
              {n} ({legenda[n]})
            </label>
          ))}
          <br />
          <button
            onClick={() => {
              const nova = {
                area: areaAtual,
                subarea: subareaSelecionada,
                objetivos: [
                  ...entrada.objetivos,
                  ...((entrada.objetivosManual?.split("\n") || []).filter((o) => o.trim() !== ""))
                ],
                estrategias: [
                  ...entrada.estrategias,
                  ...((entrada.estrategiasManual?.split("\n") || []).filter((e) => e.trim() !== ""))
                ],
                nivel: entrada.nivel
              };
              setPei([...pei, nova]);
              setModalAberto(false);
              setSubareaSelecionada("");
              setEntrada({ objetivos: [], estrategias: [], nivel: "", objetivosManual: "", estrategiasManual: "" });
            }}
            style={{ marginTop: 20, backgroundColor: "#00695c", color: "#fff", padding: 10, border: "none", borderRadius: 5 }}
          >
            Adicionar ao PEI
          </button>
        </Modal>
      </div>
    </div>
  );
}

const estilos = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    padding: "40px",
    fontFamily: "'Segoe UI', sans-serif",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "30px",
    maxWidth: "500px",
    width: "100%",
    boxShadow: "0 0 20px rgba(0,0,0,0.2)"
  },
  titulo: {
    textAlign: "center",
    color: "#00264d",
    marginBottom: 20
  },
  subtitulo: {
    color: "#01579b",
    marginTop: 30
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    marginBottom: "15px"
  },
  abas: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    margin: "20px 0"
  },
  botaoAba: (ativo) => ({
    padding: "10px",
    borderRadius: "6px",
    backgroundColor: ativo ? "#0288d1" : "#b3e5fc",
    color: ativo ? "#fff" : "#000",
    border: "none",
    cursor: "pointer"
  }),
  subareaBox: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20
  },
  botaoSubarea: {
    padding: "8px 10px",
    backgroundColor: "#e1f5fe",
    border: "1px solid #4fc3f7",
    borderRadius: "6px",
    cursor: "pointer"
  },
  boxResumo: {
    backgroundColor: "#f1f8e9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  salvar: {
    backgroundColor: "#00695c",
    color: "white",
    padding: "14px",
    width: "100%",
    fontWeight: "bold",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    marginTop: 20,
    cursor: "pointer"
  }
};