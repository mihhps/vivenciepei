import React, { useState, useEffect, useCallback } from "react";
import PropTypes from 'prop-types';
import { db } from "../firebase";
import { getDocs, collection } from "firebase/firestore"; // garanta que isso esteja no topo
import estruturaPEI from "../data/estruturaPEI";
import BotaoVoltar from "../components/BotaoVoltar";
import { useNavigate } from "react-router-dom";

const NIVEIS = ["NR", "AF", "AV", "AVi", "I"];
const LEGENDA_NIVEIS = {
  NR: "Necessita de recursos e apoio total",
  AF: "Apoio frequente",
  AV: "Apoio eventual",
  AVi: "Apoio visual ou lembrete",
  I: "Independente"
};

export default function CriarPEI() {
  const [alunos, setAlunos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [areaAtiva, setAreaAtiva] = useState("");
  const [pei, setPei] = useState({});
  const [entradaManual, setEntradaManual] = useState({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [atividadeAplicada, setAtividadeAplicada] = useState("");
  

const carregarDados = useCallback(async () => {
  try {
    setCarregando(true);
    setErro(null);

    const [alunosSnap, avaliacoesSnap, peisSnap] = await Promise.all([
      getDocs(collection(db, "alunos")),
      getDocs(collection(db, "avaliacoesIniciais")),
      getDocs(collection(db, "peis"))
    ]);

    const todosAlunos = alunosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const todasAvaliacoes = avaliacoesSnap.docs.map(doc => doc.data());
    const peisCriados = peisSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const usuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
    const cargo = usuario.cargo;
    const perfil = usuario.perfil;
    const turmasVinculadas = usuario?.turmas ? Object.keys(usuario.turmas) : [];

    const podeVerTodos =
      cargo === "PROFESSOR REGENTE" ||
      cargo === "PROFESSOR DE SUPORTE" ||
      perfil === "gestao" ||
      perfil === "aee" ||
      perfil === "seme";

    let alunosFiltrados = [];

    if (podeVerTodos) {
      alunosFiltrados = todosAlunos;
    } else {
      alunosFiltrados = todosAlunos.filter(aluno => {
        const temPEI = peisCriados.some(pei => pei.aluno === aluno.nome);
        const pertenceATurma = turmasVinculadas.includes(aluno.turma);
        return temPEI && pertenceATurma;
      });
    }

    setAlunos(alunosFiltrados);
    setAvaliacoes(todasAvaliacoes);
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
    setErro("Falha ao carregar dados. Tente recarregar a página.");
  } finally {
    setCarregando(false);
  }
}, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);


const handleSelecionarAluno = async (nome) => {
  if (!nome) {
    setErro("Selecione um aluno válido.");
    return;
  }

  const aluno = alunos.find(
    (a) => a.nome.trim().toLowerCase() === nome.trim().toLowerCase()
  );

  if (!aluno) {
    setErro("Aluno não encontrado.");
    return;
  }

  setAlunoSelecionado(aluno);
  setErro(null);

  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
  const etapa = aluno.etapa;
  const cargo = usuarioLogado.cargo;
  const perfil = usuarioLogado.perfil;

  try {
    const peisSnap = await getDocs(collection(db, "peis"));
    const peiExistente = peisSnap.docs.find(
      (doc) => doc.data().aluno.toLowerCase() === aluno.nome.toLowerCase()
    );

    if (peiExistente) {
      const resumoPEI = peiExistente.data().resumoPEI || [];

      const peiMontado = {};
      resumoPEI.forEach((meta) => {
        if (!peiMontado[meta.area]) peiMontado[meta.area] = [];
        // 1. Tentar encontrar a estratégia do nível almejado
let estrategiasOriginais = [];

outerLoop:
for (const [_, subareas] of Object.entries(estruturaPEI)) {
  for (const [_, habilidadesMap] of Object.entries(subareas)) {
    const niveis = habilidadesMap[meta.habilidade];
    if (niveis) {
      const bloco = niveis[meta.nivelAlmejado];
      if (Array.isArray(bloco?.estrategias)) {
        estrategiasOriginais = [...bloco.estrategias];
      } else if (typeof bloco?.estrategias === "string") {
        estrategiasOriginais = [bloco.estrategias];
      }
      break outerLoop;
    }
  }
}

// 2. Remover todas as estratégias já utilizadas por qualquer professor para essa habilidade
const todasUsadas = resumoPEI
  .filter((m) => m.habilidade === meta.habilidade)
  .flatMap((m) => m.estrategias || []);

const restantes = estrategiasOriginais.filter(e => !todasUsadas.includes(e));

// 3. Montar a meta com as estratégias restantes
peiMontado[meta.area].push({
  habilidade: meta.habilidade,
  nivel: meta.nivel,
  nivelAlmejado: meta.nivelAlmejado || meta.nivel,
  objetivo: meta.objetivo,
  estrategias: restantes,
  estrategiasSelecionadas: []
});
        });

      setPei(peiMontado);
      setAreaAtiva(Object.keys(peiMontado)[0] || "");
      return;
    }
  } catch (erroBusca) {
    console.error("Erro ao buscar PEI existente:", erroBusca);
  }

  // Se não existe PEI, verificar permissão para criar
  let permitido = false;

  if (etapa === "educacaoInfantil" || etapa === "anosIniciais") {
    permitido = (cargo === "PROFESSOR REGENTE" || cargo === "PROFESSOR DE SUPORTE");
  } else if (etapa === "anosFinais") {
    permitido = (cargo === "PROFESSOR DE SUPORTE" || perfil === "aee");
  }

  if (perfil === "gestao" || perfil === "aee" || perfil === "seme") permitido = true;

  if (!permitido) {
    alert("Você não tem permissão para iniciar o PEI deste aluno.");
    setAlunoSelecionado(null);
    return;
  }

  // Criar novo PEI com base na avaliação inicial
  const avaliacao = avaliacoes.find(
    (a) => a.aluno.trim().toLowerCase() === nome.trim().toLowerCase()
  );

  if (!avaliacao) {
    setErro("Este aluno não possui avaliação inicial.");
    return;
  }

  const novoPei = {};
  Object.entries(avaliacao.respostas || {}).forEach(([area, habilidades]) => {
    Object.entries(habilidades).forEach(([habilidade, nivelAtual]) => {
      if (nivelAtual === "NA" || nivelAtual === "I") return;

      let sugestao = null;
      outerLoop:
      for (const [grandeArea, subareas] of Object.entries(estruturaPEI)) {
        for (const [subarea, habilidadesMap] of Object.entries(subareas)) {
          if (habilidadesMap[habilidade] && habilidadesMap[habilidade][nivelAtual]) {
            sugestao = habilidadesMap[habilidade][nivelAtual];
            break outerLoop;
          }
        }
      }

      if (!sugestao) {
        console.warn("Habilidade não encontrada em estruturaPEI:", habilidade);
        return;
      }

      if (!novoPei[area]) novoPei[area] = [];

      const proximoNivelIndex = NIVEIS.indexOf(nivelAtual) + 1;
      const nivelAlmejado = NIVEIS[proximoNivelIndex] || nivelAtual;

      novoPei[area].push({
        habilidade,
        nivel: nivelAtual,
        nivelAlmejado,
        objetivo: sugestao.objetivo,
        estrategias: sugestao.estrategias,
        estrategiasSelecionadas: []
      });
    });
  });

  setPei(novoPei);
  setAreaAtiva(Object.keys(novoPei)[0] || "");
};

  const handleSalvarPEI = async () => {
    if (!alunoSelecionado) {
      setErro("Selecione um aluno antes de salvar.");
      return;
    }

    if (Object.keys(pei).length === 0) {
      setErro("Nenhum dado do PEI para salvar.");
      return;
    }

    try {
      setCarregando(true);
      const usuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
      
      const peiFinal = Object.entries(pei).flatMap(([area, metas]) =>
  metas
    .map(meta => {
      const chave = `${area}-${meta.habilidade}`;
      const manual = entradaManual[chave] || {};
      const estrategiasManuais = manual.estrategiasManuais 
        ? manual.estrategiasManuais.split('\n').filter(e => e.trim())
        : [];

      const estrategiasSelecionadas = Array.isArray(manual.estrategias)
        ? manual.estrategias
        : manual.estrategias !== undefined
          ? [manual.estrategias]
          : Array.isArray(meta.estrategiasSelecionadas)
            ? meta.estrategiasSelecionadas
            : [];

      const todasEstrategias = [...estrategiasSelecionadas, ...estrategiasManuais]
        .filter(e => typeof e === "string" && e.trim() !== "");

      // Aqui está o filtro importante:
      if (todasEstrategias.length === 0) return null;

      return {
  area,
  habilidade: meta.habilidade,
  nivel: meta.nivel,
  nivelAlmejado: meta.nivelAlmejado, // Adiciona aqui explicitamente
  objetivo: meta.objetivo,
  estrategias: todasEstrategias
};
    })
    .filter(Boolean) // remove metas sem estratégias
);

      await addDoc(collection(db, "peis"), {
        aluno: alunoSelecionado.nome,
        turma: alunoSelecionado.turma,
        resumoPEI: peiFinal,
         atividadeAplicada: atividadeAplicada,
        criadoEm: new Date().toISOString(),
        nomeCriador: usuario.nome || "Desconhecido",
        cargoCriador: usuario.cargo || "Desconhecido",
        criadorId: usuario.email || ""
      });
      
      alert("PEI salvo com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar PEI:", err);
      setErro(`Erro ao salvar PEI: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  };

const estilos = {
  container: {
    background: "#1d3557",
    minHeight: "100vh",
    width: "100vw",
    padding: "30px"
  },
  card: {
    background: "#fff",
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "30px",
    borderRadius: "16px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
  },
  titulo: {
    textAlign: "center",
    color: "#1d3557",
    marginBottom: "25px"
  },
  areaButton: {
    padding: "10px 18px",
    borderRadius: "20px",
    border: "none",
    margin: "4px",
    backgroundColor: "#f0f0f0",
    cursor: "pointer",
    transition: "all 0.3s ease"
  },
  areaButtonAtiva: {
    backgroundColor: "#1d3557",
    color: "#fff",
    fontWeight: "bold"
  },
  metaCard: {
    background: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "15px",
    marginBottom: "15px"
  },
  textarea: {
    width: "95%",
    minHeight: "80px",
    margin: "8px 0",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px"
  },
  botaoSalvar: {
    backgroundColor: "#2a9d8f",
    color: "#fff",
    padding: "14px 24px",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    display: "block",
    margin: "30px auto 0",
    cursor: "pointer",
    transition: "background-color 0.3s"
  },
  mensagemErro: {
    color: "#e63946",
    margin: "15px 0",
    textAlign: "center",
    fontWeight: "bold"
  },
  loading: {
    textAlign: "center",
    margin: "20px 0",
    color: "#1d3557"
  }
};

  return (
    <div style={estilos.container} aria-busy={carregando}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h1 style={estilos.titulo}>Criar PEI</h1>

        {erro && <div style={estilos.mensagemErro} role="alert">{erro}</div>}

        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="selecionar-aluno" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Selecione um aluno:
          </label>
          <select
            id="selecionar-aluno"
            value={alunoSelecionado?.nome || ""}
            onChange={(e) => handleSelecionarAluno(e.target.value)}
            disabled={carregando}
            style={{
              padding: "10px",
              width: "100%",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "16px"
            }}
            aria-label="Selecione um aluno para criar o PEI"
          >
            <option value="">{carregando ? "Carregando..." : "Selecione um aluno"}</option>
            {alunos.map(aluno => (
              <option key={aluno.id} value={aluno.nome}>
                {aluno.nome} - {aluno.turma}
              </option>
            ))}
          </select>
        </div>

        {carregando && !alunoSelecionado && (
          <div style={estilos.loading}>Carregando dados...</div>
        )}

        {alunoSelecionado && (
          <>
            <div style={{ margin: "20px 0" }}>
  {Object.keys(pei).map((area) => (
    <button
      key={area}
      onClick={() => setAreaAtiva(area)}
      style={{
        ...estilos.areaButton,
        ...(areaAtiva === area && estilos.areaButtonAtiva)
      }}
      aria-current={areaAtiva === area ? "true" : "false"}
    >
      {area}
    </button>
  ))}

  {/* Botão extra para a nova aba */}
  <button
    onClick={() => setAreaAtiva("atividadeAplicada")}
    style={{
      ...estilos.areaButton,
      ...(areaAtiva === "atividadeAplicada" && estilos.areaButtonAtiva)
    }}
  >
    Atividade Aplicada
  </button>
</div>
          {areaAtiva === "atividadeAplicada" && (
  <div style={{ marginTop: "20px" }}>
    <label htmlFor="atividade-aplicada" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
      Descreva a atividade aplicada com o aluno:
    </label>
    <textarea
      id="atividade-aplicada"
      value={atividadeAplicada}
      onChange={(e) => setAtividadeAplicada(e.target.value)}
      placeholder="Ex: Brincadeira simbólica usando fantoches para desenvolver comunicação e imaginação..."
      style={estilos.textarea}
    />
  </div>
)}

            {areaAtiva && pei[areaAtiva]?.map((meta, idx) => {
              if (!meta || typeof meta !== "object" || !meta.habilidade) return null;

              const chave = `${areaAtiva}-${meta.habilidade}`;
              const dadosManuais = entradaManual[chave] || {};

              return (
                <article key={idx} style={estilos.metaCard} aria-labelledby={`meta-${idx}`}>
                  <h3 id={`meta-${idx}`}>{meta.habilidade}</h3>
                  <p><strong>Nível sugerido:</strong> {meta.nivel} — {LEGENDA_NIVEIS[meta.nivel]}</p>
                  
                  <div>
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Objetivo sugerido:</p>
<p style={{ marginBottom: '10px', fontStyle: 'italic', background: '#f1f1f1', padding: '10px', borderRadius: '6px' }}>
  {meta.objetivo}
</p>

                  </div>

                 <fieldset>
  <legend style={{ fontWeight: 'bold' }}>Estratégias:</legend>

  {(() => {
    const estrategiasOriginais = Array.isArray(meta.estrategias)
      ? meta.estrategias
      : [meta.estrategias];

    const selecionadas = dadosManuais.estrategias || meta.estrategiasSelecionadas || [];

    return estrategiasOriginais.map((estrategia, i) => (
      <div key={i}>
        <input
          type="checkbox"
          id={`estrategia-${idx}-${i}`}
          checked={selecionadas.includes(estrategia)}
          onChange={(e) => {
            const atual = [...selecionadas];
            const atualizadas = e.target.checked
              ? [...atual, estrategia]
              : atual.filter(e => e !== estrategia);

            setEntradaManual(prev => ({
              ...prev,
              [chave]: {
                ...prev[chave],
                estrategias: atualizadas
              }
            }));
          }}
        />
        <label htmlFor={`estrategia-${idx}-${i}`} style={{ marginLeft: '8px' }}>
          {estrategia}
        </label>
      </div>
    ));
  })()}

  <label htmlFor={`estrategias-manuais-${idx}`} style={{ display: 'block', marginTop: '10px' }}>
    Estratégias personalizadas (uma por linha):
  </label>
  <textarea
    id={`estrategias-manuais-${idx}`}
    value={dadosManuais.estrategiasManuais || ""}
    onChange={(e) =>
      setEntradaManual(prev => ({
        ...prev,
        [chave]: {
          ...prev[chave],
          estrategiasManuais: e.target.value
        }
      }))
    }
    style={estilos.textarea}
  />
</fieldset>
                </article>
              );
            })}

            <button 
              onClick={handleSalvarPEI} 
              style={estilos.botaoSalvar}
              disabled={carregando}
              aria-busy={carregando}
            >
              {carregando ? "Salvando..." : "Salvar PEI"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

CriarPEI.propTypes = {
  // Adicione props se necessário
};