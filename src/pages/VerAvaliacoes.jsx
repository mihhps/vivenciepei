import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import BotaoVoltar from "../components/BotaoVoltar";
import { FaSearch, FaTrashAlt, FaEye, FaHistory } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";

import "../styles/VerAvaliacoes.css";

const painelDestinoMapeado = {
  desenvolvedor: "/painel-dev",
  gestao: "/painel-gestao",
  aee: "/painel-aee",
  seme: "/acompanhamento",
  professor: "/painel-professor",
  diretor: "/painel-gestao",
  diretor_adjunto: "/painel-gestao",
  orientador_pedagogico: "/painel-gestao",
};

export default function VerAvaliacoes() {
  const [avaliacoesPorAluno, setAvaliacoesPorAluno] = useState([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [mensagemConfirmacao, setMensagemConfirmacao] = useState(null);
  const navigate = useNavigate();

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado") || "{}"),
    []
  );

  const perfil = usuarioLogado.perfil?.toLowerCase()?.trim();
  const anoAtivo = Number(localStorage.getItem("anoExercicio")) || 2025;
  const escolaAtivaId = localStorage.getItem("escolaId");

  const destinoVoltar = useMemo(() => {
    return painelDestinoMapeado[perfil] || "/";
  }, [perfil]);

  const carregarDados = useCallback(async () => {
    if (!escolaAtivaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const qIniciais = query(
        collection(db, "avaliacoesIniciais"),
        where("ano", "==", anoAtivo),
        where("escolaId", "==", escolaAtivaId)
      );

      const qNovas = query(
        collection(db, "avaliacoes"),
        where("ano", "==", anoAtivo),
        where("escolaId", "==", escolaAtivaId)
      );

      const [snapIniciais, snapNovas] = await Promise.all([
        getDocs(qIniciais),
        getDocs(qNovas),
      ]);

      const listaIniciais = snapIniciais.docs.map((d) => ({
        id: d.id,
        tipo: "inicial",
        colecao: "avaliacoesIniciais",
        ...d.data(),
      }));
      const listaNovas = snapNovas.docs.map((d) => ({
        id: d.id,
        tipo: "nova",
        colecao: "avaliacoes",
        ...d.data(),
      }));

      let todasAsAvaliacoes = [...listaIniciais, ...listaNovas];

      if (perfil === "professor") {
        const turmasDoProf = usuarioLogado.turmas
          ? Object.keys(usuarioLogado.turmas).map((t) => t.trim().toLowerCase())
          : [];

        todasAsAvaliacoes = todasAsAvaliacoes.filter((av) => {
          const turmaAluno = av.aluno?.turma || av.turma || "";
          return turmasDoProf.includes(turmaAluno.trim().toLowerCase());
        });
      }

      const maisRecentes = {};
      todasAsAvaliacoes.forEach((a) => {
        const alunoId = a.alunoId || a.aluno?.id || "id-desconhecido";
        const getDataRef = (item) => {
          if (item.dataCriacao?.toDate) return item.dataCriacao.toDate();
          if (item.inicio) return new Date(item.inicio);
          return new Date(0);
        };
        const dataAtual = getDataRef(a);
        if (
          !maisRecentes[alunoId] ||
          dataAtual > getDataRef(maisRecentes[alunoId])
        ) {
          maisRecentes[alunoId] = { ...a, alunoId };
        }
      });

      const listaFinal = Object.values(maisRecentes).sort((a, b) => {
        const nomeA = (a.aluno?.nome || a.aluno || "").toUpperCase();
        const nomeB = (b.aluno?.nome || b.aluno || "").toUpperCase();
        return nomeA.localeCompare(nomeB);
      });

      setAvaliacoesPorAluno(listaFinal);
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [anoAtivo, escolaAtivaId, perfil, usuarioLogado.turmas]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const filtradas = useMemo(() => {
    return avaliacoesPorAluno.filter((a) => {
      const nome = (a.aluno?.nome || a.aluno || "").toLowerCase();
      return nome.includes(busca.toLowerCase());
    });
  }, [avaliacoesPorAluno, busca]);

  const confirmarExclusao = async () => {
    if (!mensagemConfirmacao) return;
    try {
      await deleteDoc(
        doc(db, mensagemConfirmacao.colecao, mensagemConfirmacao.id)
      );
      toast.success("Excluído!");
      setMensagemConfirmacao(null);
      await carregarDados();
    } catch (error) {
      toast.error("Erro ao excluir.");
    }
  };

  if (loading)
    return (
      <div className="ver-avaliacoes-container">
        <p>Carregando...</p>
      </div>
    );

  return (
    <div className="ver-avaliacoes-container">
      <ToastContainer position="bottom-right" />

      {/* HEADER CORRIGIDO: Centralização do Título e Ano */}
      <header
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "40px",
          minHeight: "80px",
        }}
      >
        {/* Botão posicionado de forma absoluta à esquerda */}
        <div style={{ position: "absolute", left: 0 }}>
          <BotaoVoltar destino={destinoVoltar} />
        </div>

        {/* Grupo do Título Centralizado */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "2.2rem",
              fontWeight: "800",
              color: "#1e293b",
            }}
          >
            Avaliações
          </h1>
          <p
            style={{
              margin: "5px 0 0 0",
              opacity: 0.6,
              fontSize: "1rem",
              fontWeight: "600",
            }}
          >
            Exercício {anoAtivo}
          </p>
        </div>
      </header>

      {mensagemConfirmacao && (
        <div className="confirm-box-alert">
          <p>
            Confirmar exclusão de{" "}
            <strong>
              {mensagemConfirmacao.aluno?.nome || mensagemConfirmacao.aluno}
            </strong>
            ?
          </p>
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "center" }}
          >
            <button className="btn-card btn-excl" onClick={confirmarExclusao}>
              Excluir
            </button>
            <button
              className="btn-card"
              onClick={() => setMensagemConfirmacao(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="busca-wrapper">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Pesquisar aluno..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="avaliacoes-grid">
        {filtradas.map((a) => (
          <div key={a.alunoId} className="avaliacao-card-moderno">
            <div className="aluno-info-top">
              <div className="avatar-mini">
                {(a.aluno?.nome?.[0] || a.aluno?.[0] || "?").toUpperCase()}
              </div>
              <div className="aluno-nome-txt">
                {a.aluno?.nome || a.aluno || "Aluno"}
                <small
                  style={{ display: "block", fontSize: "0.7rem", opacity: 0.6 }}
                >
                  {a.tipo === "inicial" ? "Inicial" : "Reavaliação"}
                </small>
              </div>
            </div>

            <div className="card-footer-acoes">
              <button
                className="btn-card btn-visu"
                onClick={() => navigate(`/avaliacao/${a.alunoId}`)}
              >
                <FaEye /> Ver
              </button>

              <button
                className="btn-card btn-reav"
                onClick={() => navigate(`/reavaliacao/${a.alunoId}`)}
              >
                <FaHistory /> Reavaliar
              </button>

              {(perfil === "gestao" || perfil === "aee") && (
                <button
                  className="btn-card btn-excl"
                  onClick={() => setMensagemConfirmacao(a)}
                >
                  <FaTrashAlt />
                </button>
              )}
            </div>
          </div>
        ))}

        {filtradas.length === 0 && (
          <div className="empty-state">
            Nenhuma avaliação encontrada para {anoAtivo}.
          </div>
        )}
      </div>
    </div>
  );
}
