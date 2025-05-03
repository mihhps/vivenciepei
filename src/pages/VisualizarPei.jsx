import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

const coresPorNivel = {
  NR: "#ffcccc",
  AF: "#fff2cc",
  AL: "#cce5ff",
  AG: "#d0f0c0",
  AV: "#eeeeee",
  I:  "#f0ccff"
};

function calcularIdadeEFaixa(nascimento) {
  if (!nascimento) return ["-", "-"];
  const hoje = new Date();
  const nasc = new Date(nascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  let faixa = idade <= 3 ? "0-3 anos" : idade <= 5 ? "4-5 anos" : idade <= 8 ? "6-8 anos" : idade <= 11 ? "9-11 anos" : "12+ anos";
  return [idade, faixa];
}

function formatarData(dataISO) {
  if (!dataISO) return "-";
  const data = new Date(dataISO);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}-${mes}-${ano}`;
}

export default function VisualizarPei() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
  const alunos = JSON.parse(localStorage.getItem("alunos")) || [];
  const pei = state?.pei;
  const voltarPara = state?.voltarPara;

  if (!pei) {
    return <div style={{ padding: "40px" }}>PEI não encontrado.</div>;
  }

  const aluno = alunos.find(a => a.nome === pei.aluno);
  const [idade, faixa] = aluno ? calcularIdadeEFaixa(aluno.nascimento) : ["-", "-"];

  const metasAgrupadas = {};
  pei.resumoPEI?.forEach(meta => {
    if (!metasAgrupadas[meta.area]) metasAgrupadas[meta.area] = {};
    if (!metasAgrupadas[meta.area][meta.subarea]) metasAgrupadas[meta.area][meta.subarea] = [];
    metasAgrupadas[meta.area][meta.subarea].push(meta);
  });

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <BotaoVoltar onClick={() => navigate("/ver-peis", { state: { alunoAberto: voltarPara } })} />
        <h2 style={estilos.titulo}>Plano Educacional Individualizado (PEI)</h2>

        <div style={estilos.infoAluno}>
          <p><strong>Aluno:</strong> {pei.aluno}</p>
          <p><strong>Idade:</strong> {idade} anos ({faixa})</p>
          <p><strong>Turma:</strong> {pei.turma}</p>
          <p><strong>Diagnóstico:</strong> {aluno?.diagnostico || "-"}</p>
          <p><strong>Início:</strong> {formatarData(pei.inicio)}</p>
          <p><strong>Próxima Avaliação:</strong> {formatarData(pei.proximaAvaliacao)}</p>
          <p><strong>Criado por:</strong> {pei.nomeCriador || "-"}</p>
        </div>

        <hr style={{ margin: "30px 0" }} />

        <h3 style={estilos.subtitulo}>Metas por Área</h3>

        {Object.entries(metasAgrupadas).map(([area, subareas], i) => (
          <div key={i} style={{ marginBottom: "40px" }}>
            <h4 style={{ color: "#1d3557", marginBottom: "10px" }}>{area}</h4>
            {Object.entries(subareas).map(([subarea, metas], j) => (
              <div key={j} style={estilos.blocoSubarea}>
                <h5 style={estilos.tituloSubarea}>{subarea}</h5>
                <table style={estilos.tabela}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f1f1" }}>
                      <th style={estilos.cell}>Objetivos</th>
                      <th style={estilos.cell}>Estratégias</th>
                      <th style={estilos.cell}>Nível</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metas.map((meta, k) => (
                      <tr key={k} style={{ backgroundColor: coresPorNivel[meta.nivel] || "#ffffff" }}>
                        <td style={estilos.cell}>{(meta.objetivos || []).join("\n")}</td>
                        <td style={estilos.cell}>{(meta.estrategias || []).join("\n")}</td>
                        <td style={estilos.cell}>{meta.nivel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}

        <div style={{ marginTop: "50px", textAlign: "right" }}>
          <p><strong>Elaborado por:</strong> {usuario?.nome || "-"} ({usuario?.cargo || "-"})</p>
        </div>
      </div>
    </div>
  );
}

const estilos = {
  container: {
    display: "flex",
    justifyContent: "center",
    padding: "150px",
    fontFamily: "'Segoe UI', sans-serif",
    backgroundColor: "#f8f9fa"
  },
  card: {
    width: "100%",
    maxWidth: "1000px",
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 0 20px rgba(0,0,0,0.1)",
  },
  titulo: {
    textAlign: "center",
    fontSize: "24px",
    color: "#1d3557",
    marginBottom: "30px",
  },
  subtitulo: {
    fontSize: "20px",
    marginBottom: "15px",
    color: "#333"
  },
  tituloSubarea: {
    fontSize: "17px",
    color: "#457b9d",
    marginBottom: "10px"
  },
  infoAluno: {
    fontSize: "16px",
    lineHeight: "1.8",
  },
  blocoSubarea: {
    marginBottom: "30px",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    backgroundColor: "#fafafa"
  },
  tabela: {
    width: "100%",
    borderCollapse: "collapse",
  },
  cell: {
    border: "1px solid #ccc",
    padding: "10px",
    verticalAlign: "top",
    whiteSpace: "pre-wrap"
  }
};