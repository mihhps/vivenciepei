import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import { gerarPDFCompleto } from "../utils/gerarPDFCompleto";

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

function VerPEIs() {
  const navigate = useNavigate();
  const location = useLocation();
  const alunoDoState = location.state?.alunoAberto;

  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
  const tipo = usuarioLogado?.tipo;

  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [peisPorAluno, setPeisPorAluno] = useState({});
  const [abaAtiva, setAbaAtiva] = useState("");

  useEffect(() => {
    const todosPeis = JSON.parse(localStorage.getItem("peis")) || [];
    const usuariosSalvos = JSON.parse(localStorage.getItem("usuarios")) || [];
    const alunosSalvos = JSON.parse(localStorage.getItem("alunos")) || [];

    setUsuarios(usuariosSalvos);
    setAlunos(alunosSalvos);

    if (alunoDoState) {
      setAbaAtiva(alunoDoState);
    } else if (alunosSalvos.length > 0) {
      setAbaAtiva(alunosSalvos[0].nome);
    }

    const peisFiltrados = tipo === "professor"
      ? todosPeis.filter(p => p.criador === usuarioLogado.login)
      : filtroUsuario
        ? todosPeis.filter(p => p.criador === filtroUsuario)
        : todosPeis;

    const agrupados = {};
    alunosSalvos.forEach(aluno => {
      agrupados[aluno.nome] = peisFiltrados.filter(p => p.aluno === aluno.nome);
    });

    setPeisPorAluno(agrupados);
  }, [filtroUsuario, alunoDoState]);

  const editarPei = (pei) => navigate(`/editar-pei/${pei.aluno}`);

  const excluirPei = (peiParaExcluir) => {
    if (!window.confirm("Tem certeza que deseja excluir este PEI?")) return;
    const todos = JSON.parse(localStorage.getItem("peis")) || [];
    const atualizados = todos.filter(
      p => !(p.aluno === peiParaExcluir.aluno && p.nomeCriador === peiParaExcluir.nomeCriador && p.inicio === peiParaExcluir.inicio)
    );
    localStorage.setItem("peis", JSON.stringify(atualizados));
    window.location.reload();
  };

  return (
    <div style={estilos.fundo}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h2 style={estilos.titulo}>PEIs por Aluno</h2>

        {(tipo === "gestao" || tipo === "aee") && (
          <select
            onChange={(e) => setFiltroUsuario(e.target.value)}
            value={filtroUsuario}
            style={{ marginBottom: 20, padding: 10, borderRadius: 6 }}
          >
            <option value="">Todos os usuários</option>
            {usuarios.map((u, i) => (
              <option key={i} value={u.usuario}>{u.usuario}</option>
            ))}
          </select>
        )}

        <div style={estilos.abas}>
          {alunos.map((aluno, i) => (
            <button
              key={i}
              style={{ ...estilos.botaoAba, ...(abaAtiva === aluno.nome ? estilos.abaAtiva : {}) }}
              onClick={() => setAbaAtiva(aluno.nome)}
            >
              {aluno.nome}
            </button>
          ))}
        </div>

        <div style={estilos.conteudoAba}>
          {abaAtiva && alunos.length > 0 && (
            (() => {
              const aluno = alunos.find(a => a.nome === abaAtiva);
              const [idade, faixa] = aluno ? calcularIdadeEFaixa(aluno.nascimento) : ["-", "-"];
              const peis = peisPorAluno[abaAtiva] || [];

              return (
                <>
                  <p><strong>Idade:</strong> {idade} anos ({faixa})</p>
                  {peis.length === 0 ? (
                    <p>Nenhum PEI registrado.</p>
                  ) : (
                    peis.map((pei, idx) => (
                      <div key={idx} style={estilos.cardInterno}>
                        <p><strong>Turma:</strong> {pei.turma}</p>
                        <p><strong>Início:</strong> {formatarData(pei.inicio)}</p>
                        <p><strong>Próxima Avaliação:</strong> {formatarData(pei.proximaAvaliacao)}</p>
                        <p><strong>Criado por:</strong> {pei.nomeCriador || "-"}</p>

                        <div style={estilos.botoes}>
                          {(tipo === "gestao" || tipo === "aee" || usuarioLogado.login === pei.criador) && (
                            <button style={estilos.editar} onClick={() => editarPei(pei)}>Editar</button>
                          )}

                          <button
                            style={estilos.gerar}
                            onClick={() =>
                              navigate("/visualizar-pei", {
                                state: { pei, voltarPara: pei.aluno }
                              })
                            }
                          >
                            Visualizar
                          </button>

                          <button
                            style={estilos.gerar}
                            onClick={() => {
                              const avaliacoes = JSON.parse(localStorage.getItem("avaliacoesIniciais")) || [];
                              const avaliacao = avaliacoes.find(a =>
                                a.aluno?.trim().toLowerCase() === pei.aluno?.trim().toLowerCase()
                              );
                              if (!avaliacao) {
                                alert(`Avaliação Inicial não encontrada para ${pei.aluno}`);
                                return;
                              }
                              gerarPDFCompleto(pei, avaliacao, usuarioLogado);
                            }}
                          >
                            Gerar PDF
                          </button>

                          {(usuarioLogado.login === pei.criador || tipo === "gestao") && (
<button style={estilos.excluir} onClick={() => excluirPei(pei)}>Excluir</button>
)}
                        </div>
                      </div>
                    ))
                  )}
                </>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

const estilos = {
  fundo: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "150px",
    fontFamily: "'Segoe UI', sans-serif",

    
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "26px",
    padding: "50px",
    width: "100%",
    maxWidth: "1000px",
    boxShadow: "0 0 25px rgba(22, 1, 114, 0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  titulo: {
    textAlign: "center",
    fontSize: "26px",
    color: "#1d3557",
    marginBottom: "30px",
  },
  abas: {
    display: "flex",
    overflowX: "auto",
    gap: "10px",
    marginBottom: "20px",
    width: "100%",
    paddingBottom: "5px",
    borderBottom: "2px solid #ccc"
  },
  botaoAba: {
    backgroundColor: "#f1f1f1",
    border: "1px solid #ccc",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  abaAtiva: {
    backgroundColor: "#1d3557",
    color: "#fff",
    fontWeight: "bold",
  },
  conteudoAba: {
    width: "100%",
  },
  cardInterno: {
    backgroundColor: "#ffffff",
    padding: "20px",
    marginBottom: "20px",
    border: "1px solid #ccc",
    borderRadius: "12px",
  },
  botoes: {
    display: "flex",
    gap: "15px",
    marginTop: "15px",
    flexWrap: "wrap",
  },
  editar: {
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  gerar: {
    backgroundColor: "#457b9d",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  excluir: {
    backgroundColor: "#e63946",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

export default VerPEIs;