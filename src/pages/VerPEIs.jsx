import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import { gerarPDFCompleto } from "../utils/gerarPDFCompleto";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const calcularIdadeEFaixa = (nascimento) => {
  if (!nascimento) return ["-", "-"];
  const hoje = new Date();
  const nasc = new Date(nascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  let faixa = idade <= 3 ? "0-3 anos" : idade <= 5 ? "4-5 anos" : idade <= 8 ? "6-8 anos" : idade <= 11 ? "9-11 anos" : "12+ anos";
  return [idade, faixa];
};

export default function VerPEIs() {
  const navigate = useNavigate();
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
  const tipo = usuarioLogado?.perfil;

  const [peisPorAluno, setPeisPorAluno] = useState({});
  const [alunos, setAlunos] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const [peisSnapshot, alunosSnapshot, usuariosSnapshot] = await Promise.all([
        getDocs(collection(db, "peis")),
        getDocs(collection(db, "alunos")),
        getDocs(collection(db, "usuarios"))
      ]);
      
      const alunosSalvos = alunosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const usuariosSalvos = usuariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const todosPeis = peisSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setUsuarios(usuariosSalvos);
      setAlunos(alunosSalvos);

      if (alunosSalvos.length > 0 && !abaAtiva) {
        setAbaAtiva(alunosSalvos[0]?.nome || "");
      }

      const peisFiltrados = tipo === "professor"
        ? todosPeis.filter(p => p.criadorId === usuarioLogado.email)
        : filtroUsuario
          ? todosPeis.filter(p => p.criadorId === filtroUsuario)
          : todosPeis;

      const agrupados = {};
      alunosSalvos.forEach(aluno => {
        agrupados[aluno.nome] = peisFiltrados
          .filter(p => p.aluno === aluno.nome)
          .sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
      });

      setPeisPorAluno(agrupados);
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
      setErro("Erro ao carregar dados. Tente recarregar a página.");
    } finally {
      setCarregando(false);
    }
  }, [filtroUsuario, tipo, usuarioLogado.email, abaAtiva]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const excluirPei = async (pei) => {
    if (!window.confirm(`Tem certeza que deseja excluir o PEI de ${pei.aluno}?`)) return;

    try {
      await deleteDoc(doc(db, "peis", pei.id));
      const atualizados = { ...peisPorAluno };
      atualizados[pei.aluno] = atualizados[pei.aluno].filter(p => p.id !== pei.id);
      setPeisPorAluno(atualizados);
    } catch (error) {
      console.error("Erro ao excluir PEI:", error);
      alert("Erro ao excluir PEI. Por favor, tente novamente.");
    }
  };

  const handleGerarPDF = async (pei) => {
    try {
      const snapshot = await getDocs(collection(db, "avaliacoesIniciais"));
      const avaliacoes = snapshot.docs.map(doc => doc.data());

      const removerAcentos = (str) =>
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

      const nomePEI = removerAcentos(pei.aluno);

      const avaliacao = avaliacoes.find(a =>
        removerAcentos(a.aluno) === nomePEI
      );

      if (!avaliacao) {
        alert(`Avaliação Inicial não encontrada para ${pei.aluno}`);
        return;
      }

      gerarPDFCompleto(pei, avaliacao, usuarioLogado);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Por favor, tente novamente.");
    }
  };

  if (carregando) {
    return (
      <div style={estilos.fundo}>
        <div style={estilos.card}>
          <BotaoVoltar />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={estilos.fundo}>
        <div style={estilos.card}>
          <BotaoVoltar />
          <p style={{ color: "#e63946" }}>{erro}</p>
          <button style={estilos.recarregar} onClick={carregarDados}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div style={estilos.fundo}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h2 style={estilos.titulo}>PEIs por Aluno</h2>

        {(tipo === "gestao" || tipo === "aee") && (
          <div style={estilos.filtroContainer}>
            <label htmlFor="filtroUsuario" style={estilos.filtroLabel}>Filtrar por professor:</label>
            <select
              id="filtroUsuario"
              onChange={(e) => setFiltroUsuario(e.target.value)}
              value={filtroUsuario}
              style={estilos.filtroSelect}
            >
              <option value="">Todos os professores</option>
              {usuarios.filter(u => u.perfil === "professor").map((u, i) => (
                <option key={i} value={u.email}>{u.nome}</option>
              ))}
            </select>
          </div>
        )}

        {alunos.length === 0 ? (
          <p style={estilos.semDados}>Nenhum aluno cadastrado.</p>
        ) : (
          <>
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
              {abaAtiva && (() => {
                const aluno = alunos.find(a => a.nome === abaAtiva);
                const [idade, faixa] = aluno ? calcularIdadeEFaixa(aluno.nascimento) : ["-", "-"];
                const peis = peisPorAluno[abaAtiva] || [];

                return (
                  <>
                    <div style={estilos.infoAluno}>
                      <p><strong>Idade:</strong> {idade} anos ({faixa})</p>
                      {aluno?.turma && <p><strong>Turma:</strong> {aluno.turma}</p>}
                    </div>

                    {peis.length === 0 ? (
                      <p style={estilos.semDados}>Nenhum PEI registrado para este aluno.</p>
                    ) : (
                      peis.map((pei, idx) => (
                        <div key={idx} style={estilos.cardInterno}>
                          <div style={estilos.infoPei}>
                            <p><strong>Turma no PEI:</strong> {pei.turma}</p>
                            <p><strong>Início:</strong> {new Date(pei.inicio).toLocaleDateString("pt-BR")}</p>
                            <p><strong>Próxima Avaliação:</strong> {new Date(pei.proximaAvaliacao).toLocaleDateString("pt-BR")}</p>
                            <p><strong>Criado por:</strong> {pei.nomeCriador || "-"}</p>
                          </div>

                          <div style={estilos.botoes}>
                            {(tipo === "gestao" || tipo === "aee" || usuarioLogado.email === pei.criadorId) && (
                              <button
                                style={estilos.editar}
                                onClick={() => navigate("/editar-pei/" + pei.id, { state: { voltarPara: abaAtiva } })}
                              >
                                Editar
                              </button>
                            )}

                            <button
                              style={estilos.visualizar}
                              onClick={() => navigate("/visualizar-pei/" + pei.id, { state: { pei, voltarPara: abaAtiva } })}
                            >
                              Visualizar
                            </button>

                            <button
                              style={estilos.gerar}
                              onClick={() => handleGerarPDF(pei)}
                            >
                              Gerar PDF
                            </button>

                            {(usuarioLogado.email === pei.criadorId || tipo === "gestao") && (
                              <button style={estilos.excluir} onClick={() => excluirPei(pei)}>Excluir</button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const estilos = {
  fundo: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    fontFamily: "'Segoe UI', sans-serif",
    background: "linear-gradient(135deg, #457b9d, #1d3557)",
    width: "100vw",
    minHeight: "100vh",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "30px",
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
    marginBottom: "20px",
  },
  filtroContainer: {
    width: "100%",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  filtroLabel: {
    fontWeight: "500",
    color: "#1d3557",
  },
  filtroSelect: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    backgroundColor: "#f8f9fa",
    width: "100%",
  },
  abas: {
    display: "flex",
    overflowX: "auto",
    gap: "10px",
    marginBottom: "20px",
    width: "100%",
    paddingBottom: "5px",
    borderBottom: "2px solid #f1f1f1",
    scrollbarWidth: "thin",
  },
  botaoAba: {
    backgroundColor: "#f1f1f1",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
    minWidth: "200px",
    textAlign: "center",
    fontSize: "10px",
    boxShadow: "0 0 6px rgba(23, 11, 190, 0.2)",
  },
  abaAtiva: {
    backgroundColor: "#1d3557",
    color: "#fff",
    fontWeight: "bold",
  },
  conteudoAba: {
    width: "100%",
  },
  infoAluno: {
    marginBottom: "20px",
    padding: "10px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
  },
  cardInterno: {
    backgroundColor: "#ffffff",
    padding: "20px",
    marginBottom: "20px",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  infoPei: {
    marginBottom: "15px",
  },
  botoes: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
    flexWrap: "wrap",
  },
  editar: {
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  visualizar: {
    backgroundColor: "#457b9d",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  gerar: {
    backgroundColor: "#2a9d8f",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  excluir: {
    backgroundColor: "#e63946",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  semDados: {
    textAlign: "center",
    color: "#666",
    padding: "20px",
  },
  recarregar: {
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
};