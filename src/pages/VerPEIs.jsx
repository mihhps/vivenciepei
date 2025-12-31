import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import { gerarPDFCompleto } from "../utils/gerarPDFCompleto";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { fetchAvaliacaoInteresses } from "../utils/firebaseUtils";
import { useUserSchool } from "../hooks/useUserSchool";
import {
  FaUserCircle,
  FaPuzzlePiece,
  FaChevronDown,
  FaSearch,
} from "react-icons/fa";

import styled from "styled-components";
import SelecaoAluno from "../components/SelecaoAluno";

// IMPORTAÇÃO DO CSS MODULAR
import styles from "../styles/VerPEIs.module.css";

// --- Funções Auxiliares ---
const formatarDataSegura = (data) => {
  if (!data) return "-";
  try {
    const dataStr =
      typeof data === "string" ? data : data.toDate?.().toISOString();
    if (!dataStr) return "-";
    const [ano, mes, dia] = dataStr.split("T")[0].split("-");
    return `${dia}/${mes}/${ano}`;
  } catch {
    return "-";
  }
};

const verificaTea = (diagnostico) => {
  if (!diagnostico) return false;
  const diagnosticoLowerCase = diagnostico.toLowerCase();
  const palavrasChave = ["tea", "autismo", "espectro autista"];
  return palavrasChave.some((palavra) =>
    diagnosticoLowerCase.includes(palavra)
  );
};

const calcularIdadeCompleta = (dataNascimentoString) => {
  if (!dataNascimentoString) return "N/A";
  const dataNasc =
    typeof dataNascimentoString.toDate === "function"
      ? dataNascimentoString.toDate()
      : new Date(dataNascimentoString);
  const hoje = new Date();
  if (isNaN(dataNasc)) return "N/A";
  let anos = hoje.getFullYear() - dataNasc.getFullYear();
  let meses = hoje.getMonth() - dataNasc.getMonth();
  if (meses < 0 || (meses === 0 && hoje.getDate() < dataNasc.getDate())) {
    anos--;
    meses = 12 + meses;
  }
  const idadeAnos = Math.floor(anos);
  const idadeMeses = meses;
  let resultado = `${idadeAnos} ano${idadeAnos !== 1 ? "s" : ""}`;
  if (idadeMeses > 0)
    resultado += ` e ${idadeMeses} mes${idadeMeses !== 1 ? "es" : ""}`;
  return resultado;
};

// --- COMPONENTES ESTILIZADOS ---
const StyledFilterWrapper = styled.div`
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #f1f5f9;
  background-color: white;
  transition: all 0.2s ease;
  &:hover {
    border-color: #3b82f6;
  }
`;

const StyledFilterSelect = styled.select`
  width: 100%;
  padding: 14px 40px 14px 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  appearance: none;
  font-weight: 600;
  color: #1e293b;
  outline: none;
`;

const FilterIcon = styled(FaChevronDown)`
  position: absolute;
  top: 50%;
  right: 15px;
  transform: translateY(-50%);
  pointer-events: none;
  color: #3b82f6;
`;

const PlaceholderAvisoModificado = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  border: 2px dashed #cbd5e0;
  border-radius: 24px;
  color: #94a3b8;
  margin-top: 20px;
  text-align: center;
  background: rgba(248, 250, 252, 0.5);
`;

const PERFIS_ACESSO_AMPLO = [
  "desenvolvedor",
  "seme",
  "diretor",
  "diretor_adjunto",
  "gestao",
  "aee",
  "orientador_pedagogico",
];

export default function VerPEIs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userSchoolData, isLoadingUserSchool } = useUserSchool();

  const [peisPorAluno, setPeisPorAluno] = useState({});
  const [alunos, setAlunos] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [avaliacoesIniciais, setAvaliacoesIniciais] = useState({});

  const usuarioLogado = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
      return { ...user, perfil: user.perfil?.toLowerCase()?.trim() };
    } catch (e) {
      return {};
    }
  }, []);

  const tipo = usuarioLogado?.perfil;

  const destinoPainel = useMemo(() => {
    const painelMap = {
      professor: "/painel-professor",
      desenvolvedor: "/painel-dev",
      gestao: "/painel-gestao",
      seme: "/painel-seme",
      aee: "/painel-aee",
      diretor: "/painel-gestao",
      diretor_adjunto: "/painel-gestao",
      orientador_pedagogico: "/painel-gestao",
    };
    return painelMap[tipo] || "/";
  }, [tipo]);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    if (isLoadingUserSchool) return;

    try {
      const anoAtivo = Number(localStorage.getItem("anoExercicio")) || 2025;
      const escolaAtivaId = localStorage.getItem("escolaId");

      if (!escolaAtivaId && tipo !== "desenvolvedor") {
        setErro("Nenhuma unidade escolar selecionada.");
        setCarregando(false);
        return;
      }

      let alunosParaExibir = [];
      let peisAgrupados = {};
      let avaliacoesParaExibir = {};
      let usuariosParaFiltro = [];

      if (PERFIS_ACESSO_AMPLO.includes(tipo)) {
        const [
          peisSnapshot,
          alunosSnapshot,
          usuariosSnapshot,
          avaliacoesSnapshot,
        ] = await Promise.all([
          getDocs(
            query(
              collection(db, "peis"),
              where("anoLetivo", "==", anoAtivo),
              where("escolaId", "==", escolaAtivaId)
            )
          ),
          getDocs(
            query(
              collection(db, "alunos"),
              where("ano", "==", anoAtivo),
              where("escolaId", "==", escolaAtivaId)
            )
          ),
          getDocs(collection(db, "usuarios")),
          getDocs(
            query(
              collection(db, "avaliacoesIniciais"),
              where("ano", "==", anoAtivo),
              where("escolaId", "==", escolaAtivaId)
            )
          ),
        ]);

        avaliacoesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.alunoId)
            avaliacoesParaExibir[data.alunoId] = { id: doc.id, ...data };
        });

        alunosParaExibir = alunosSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isTea: verificaTea(doc.data().diagnostico),
        }));

        usuariosParaFiltro = usuariosSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((u) => u.perfil === "professor");

        const todosPeis = peisSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        let peisVisiveis = filtroUsuario
          ? todosPeis.filter((p) => p.criadorId === filtroUsuario)
          : todosPeis;

        alunosParaExibir.forEach((aluno) => {
          peisAgrupados[aluno.id] = peisVisiveis
            .filter((p) => p.alunoId === aluno.id)
            .sort(
              (a, b) =>
                (b.dataCriacao?.toDate?.() || 0) -
                (a.dataCriacao?.toDate?.() || 0)
            );
        });
      } else if (tipo === "professor") {
        const turmasDoProfessor = userSchoolData?.turmas
          ? Object.keys(userSchoolData.turmas)
          : [];

        if (turmasDoProfessor.length > 0) {
          const alunosSnapshot = await getDocs(
            query(
              collection(db, "alunos"),
              where("escolaId", "==", escolaAtivaId),
              where("turma", "in", turmasDoProfessor),
              where("ano", "==", anoAtivo)
            )
          );

          alunosParaExibir = alunosSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            isTea: verificaTea(doc.data().diagnostico),
          }));

          const alunoIds = alunosParaExibir.map((aluno) => aluno.id);
          if (alunoIds.length > 0) {
            const snapshots = await Promise.all(
              Array.from({ length: Math.ceil(alunoIds.length / 30) }, (_, i) =>
                getDocs(
                  query(
                    collection(db, "avaliacoesIniciais"),
                    where("escolaId", "==", escolaAtivaId),
                    where(
                      "alunoId",
                      "in",
                      alunoIds.slice(i * 30, (i + 1) * 30)
                    ),
                    where("ano", "==", anoAtivo)
                  )
                )
              )
            );
            snapshots.forEach((s) =>
              s.docs.forEach(
                (d) =>
                  (avaliacoesParaExibir[d.data().alunoId] = {
                    id: d.id,
                    ...d.data(),
                  })
              )
            );
          }

          const peisSnapshot = await getDocs(
            query(
              collection(db, "peis"),
              where("escolaId", "==", escolaAtivaId),
              where("criadorId", "==", usuarioLogado.email),
              where("anoLetivo", "==", anoAtivo)
            )
          );

          const todosPeisDoProfessor = peisSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          alunosParaExibir.forEach((aluno) => {
            peisAgrupados[aluno.id] = todosPeisDoProfessor
              .filter((p) => p.alunoId === aluno.id)
              .sort(
                (a, b) =>
                  (b.dataCriacao?.toDate?.() || 0) -
                  (a.dataCriacao?.toDate?.() || 0)
              );
          });
        }
      }

      setAlunos(alunosParaExibir);
      setAvaliacoesIniciais(avaliacoesParaExibir);
      setUsuarios(usuariosParaFiltro);
      setPeisPorAluno(peisAgrupados);

      const alunoRetorno = location.state?.voltarPara;
      if (alunoRetorno) {
        setAbaAtiva(alunoRetorno);
        window.history.replaceState({}, document.title);
      }
    } catch (erro) {
      console.error("Erro no carregamento:", erro);
      setErro(`Erro ao carregar dados.`);
    } finally {
      setCarregando(false);
    }
  }, [
    filtroUsuario,
    usuarioLogado.email,
    isLoadingUserSchool,
    userSchoolData,
    tipo,
    location.state,
  ]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const excluirPei = async (pei) => {
    if (
      !window.confirm(`Tem certeza que deseja excluir o PEI de ${pei.aluno}?`)
    )
      return;
    try {
      await deleteDoc(doc(db, "peis", pei.id));
      carregarDados();
    } catch (error) {
      alert("Erro ao excluir PEI.");
    }
  };

  const handleGerarPDF = async () => {
    const aluno = alunos.find((a) => a.id === abaAtiva);
    if (!aluno) return;
    const avaliacao = avaliacoesIniciais[aluno.id];
    if (!avaliacao) {
      alert("Avaliação Inicial não encontrada para gerar o PDF.");
      return;
    }
    let interesses = null;
    try {
      interesses = await fetchAvaliacaoInteresses(aluno.id, usuarioLogado.id);
    } catch (e) {}
    await gerarPDFCompleto(aluno, avaliacao, usuarioLogado, [], interesses);
  };

  const handleSelecionarAluno = (e) => {
    const nomeSel = e.target.value;
    const found = alunosParaSelecao.find((a) => a.nome === nomeSel);
    setAbaAtiva(found ? found.id : "");
  };

  const alunosParaSelecao = alunos.map((a) => ({
    id: a.id,
    nome: `${a.nome} - ${a.turma} ${a.isTea ? "🧩" : ""}`,
  }));

  const nomeAlunoAtivo =
    alunosParaSelecao.find((a) => a.id === abaAtiva)?.nome || "";

  if (carregando)
    return (
      <div className={styles.fundo}>
        <div
          className={styles.card}
          style={{ textAlign: "center", padding: "50px" }}
        ></div>
      </div>
    );

  if (erro)
    return (
      <div className={styles.fundo}>
        <div className={styles.card}>
          <BotaoVoltar destino={destinoPainel} />
          <p
            style={{
              color: "#ef4444",
              marginTop: "20px",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {erro}
          </p>
        </div>
      </div>
    );

  return (
    <div className={styles.fundo}>
      <div className={styles.card}>
        <div style={{ position: "absolute", top: "25px", left: "25px" }}>
          <BotaoVoltar destino={destinoPainel} />
        </div>

        <h2 className={styles.titulo}>PEIs por Aluno</h2>
        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#64748b",
            marginBottom: "20px",
          }}
        ></p>

        {PERFIS_ACESSO_AMPLO.includes(tipo) && (
          <div className={styles.filtroContainer}>
            <label className={styles.filtroLabel}>Filtrar por professor</label>
            <StyledFilterWrapper>
              <StyledFilterSelect
                onChange={(e) => setFiltroUsuario(e.target.value)}
                value={filtroUsuario}
              >
                <option value="">Todos os professores</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.nome}
                  </option>
                ))}
              </StyledFilterSelect>
              <FilterIcon />
            </StyledFilterWrapper>
          </div>
        )}

        <div
          style={{
            width: "100%",
            maxWidth: "450px",
            marginBottom: "40px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <SelecaoAluno
            alunos={alunosParaSelecao}
            alunoSelecionado={nomeAlunoAtivo}
            onSelecionar={handleSelecionarAluno}
          />
        </div>

        {!abaAtiva ? (
          <PlaceholderAvisoModificado>
            <FaSearch
              style={{
                fontSize: "4em",
                color: "#cbd5e0",
                marginBottom: "20px",
              }}
            />
            <p style={{ fontSize: "1.1rem", fontWeight: "600" }}>
              Selecione um aluno para gerenciar os PEIs desta unidade.
            </p>
          </PlaceholderAvisoModificado>
        ) : (
          <div className={styles.conteudoAba}>
            {(() => {
              const alunoDaAba = alunos.find((a) => a.id === abaAtiva);
              if (!alunoDaAba) return null;
              const peis = peisPorAluno[alunoDaAba.id] || [];
              const idadeCompleta = calcularIdadeCompleta(
                alunoDaAba.nascimento
              );

              return (
                <>
                  <div className={styles.infoAluno}>
                    <div className={styles.fotoContainer}>
                      {alunoDaAba.fotoUrl ? (
                        <img
                          src={alunoDaAba.fotoUrl}
                          alt="aluno"
                          className={styles.foto}
                        />
                      ) : (
                        <FaUserCircle className={styles.fotoPlaceholder} />
                      )}
                    </div>
                    <div className={styles.detalhesWrapper}>
                      <h3 className={styles.nomeText}>
                        {alunoDaAba.nome}
                        {alunoDaAba.isTea && (
                          <FaPuzzlePiece
                            style={{ marginLeft: "10px", color: "#3b82f6" }}
                          />
                        )}
                      </h3>
                      <div className={styles.gridDetalhes}>
                        <p>
                          <strong>Idade:</strong> {idadeCompleta}
                        </p>
                        <p>
                          <strong>Turma:</strong> {alunoDaAba.turma || "N/A"}
                        </p>
                        <p>
                          <strong>Diagnóstico:</strong>{" "}
                          {alunoDaAba.diagnostico || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {peis.length === 0 ? (
                    <div className={styles.semDados}>
                      Nenhum PEI registrado para este aluno nesta unidade.
                    </div>
                  ) : (
                    peis.map((pei, idx) => (
                      <div key={idx} className={styles.cardInterno}>
                        <div className={styles.infoPei}>
                          <p>
                            <strong>Turma no PEI:</strong> {pei.turma}
                          </p>
                          <p>
                            <strong>Criado por:</strong>{" "}
                            {pei.nomeCriador || "Desconhecido"}
                          </p>
                          <p>
                            <strong>Data da Avaliação:</strong>{" "}
                            {formatarDataSegura(
                              avaliacoesIniciais[alunoDaAba.id]?.dataCriacao
                            )}
                          </p>
                        </div>
                        <div className={styles.botoes}>
                          <button
                            className={styles.editar}
                            onClick={() =>
                              navigate("/editar-pei/" + pei.id, {
                                state: { voltarPara: abaAtiva },
                              })
                            }
                          >
                            Atualizar
                          </button>
                          <button
                            className={styles.visualizar}
                            onClick={() =>
                              navigate("/visualizar-pei/" + pei.id, {
                                state: { pei, voltarPara: abaAtiva },
                              })
                            }
                          >
                            Visualizar
                          </button>
                          <button
                            className={styles.acompanhar}
                            onClick={() =>
                              navigate(`/acompanhar-metas/${pei.id}`, {
                                state: { voltarPara: abaAtiva },
                              })
                            }
                          >
                            Metas
                          </button>
                          <button
                            className={styles.observacoes}
                            onClick={() =>
                              navigate(`/observacoes-aluno/${pei.id}`, {
                                state: {
                                  alunoNome: pei.aluno,
                                  peiId: pei.id,
                                  voltarPara: abaAtiva,
                                },
                              })
                            }
                          >
                            Obs
                          </button>
                          <button
                            className={styles.excluir}
                            onClick={() => excluirPei(pei)}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  <button className={styles.gerar} onClick={handleGerarPDF}>
                    Gerar PDF Completo
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
