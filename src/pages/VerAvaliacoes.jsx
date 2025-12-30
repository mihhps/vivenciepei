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

// Mapeamento para garantir que o botão voltar leve ao painel correto
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

  // 1. MEMOIZAÇÃO DO USUÁRIO E DEFINIÇÃO DO DESTINO DO BOTÃO VOLTAR
  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado") || "{}"),
    []
  );
  const perfil = usuarioLogado.perfil?.toLowerCase()?.trim();
  const anoAtivo = Number(localStorage.getItem("anoExercicio")) || 2025;

  const destinoVoltar = useMemo(() => {
    return painelDestinoMapeado[perfil] || "/";
  }, [perfil]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [snapIniciais, snapNovas] = await Promise.all([
        getDocs(
          query(
            collection(db, "avaliacoesIniciais"),
            where("ano", "==", anoAtivo)
          )
        ),
        getDocs(
          query(collection(db, "avaliacoes"), where("ano", "==", anoAtivo))
        ),
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

      const todasAsAvaliacoes = [...listaIniciais, ...listaNovas];
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
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  }, [anoAtivo]);

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
    const { id, colecao } = mensagemConfirmacao;
    try {
      await deleteDoc(doc(db, colecao, id));
      toast.success("Avaliação excluída!");
      setMensagemConfirmacao(null);
      await carregarDados();
    } catch (error) {
      toast.error("Erro ao excluir.");
    }
  };

  if (loading) {
    return (
      <div
        className="ver-avaliacoes-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <p style={{ fontWeight: "800", color: "#64748b" }}>
          Carregando histórico {anoAtivo}...
        </p>
      </div>
    );
  }

  return (
    <div className="ver-avaliacoes-container">
      <ToastContainer position="bottom-right" />

      <div className="ver-avaliacoes-header-actions">
        {/* CORREÇÃO: O BotaoVoltar agora usa o destino dinâmico baseado no perfil */}
        <BotaoVoltar destino={destinoVoltar} />

        <div className="header-title-group">
          <h1>Avaliações</h1>
          <p>Exercício {anoAtivo}</p>
        </div>

        <div style={{ justifySelf: "end" }}></div>
      </div>

      {mensagemConfirmacao && (
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "20px",
            border: "2px solid #fee2e2",
            marginBottom: "25px",
            textAlign: "center",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <p
            style={{
              fontWeight: "700",
              color: "#1e293b",
              marginBottom: "15px",
            }}
          >
            Confirmar exclusão da ÚLTIMA avaliação de{" "}
            {mensagemConfirmacao.aluno?.nome || mensagemConfirmacao.aluno}?
          </p>
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "center" }}
          >
            <button
              className="btn-card btn-excl"
              onClick={confirmarExclusao}
              style={{ padding: "10px 25px" }}
            >
              Sim, Excluir
            </button>
            <button
              className="btn-card"
              onClick={() => setMensagemConfirmacao(null)}
              style={{
                background: "#e2e8f0",
                color: "#475569",
                padding: "10px 25px",
              }}
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
          placeholder="Pesquisar por nome do aluno..."
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
              </div>
            </div>

            <div className="card-footer-acoes">
              <button
                className="btn-card btn-visu"
                onClick={() => navigate(`/avaliacao/${a.alunoId}`)}
              >
                <FaEye /> Visualizar
              </button>

              {/* Somente Gestão e AEE podem reavaliar ou excluir aqui */}
              {(perfil === "gestao" || perfil === "aee") && (
                <>
                  <button
                    className="btn-card btn-reav"
                    onClick={() => navigate(`/reavaliacao/${a.alunoId}`)}
                  >
                    <FaHistory /> Reavaliar
                  </button>
                  <button
                    className="btn-card btn-excl"
                    onClick={() => setMensagemConfirmacao(a)}
                  >
                    <FaTrashAlt />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {filtradas.length === 0 && (
          <div className="empty-state">
            Nenhuma avaliação encontrada para o exercício {anoAtivo}.
          </div>
        )}
      </div>
    </div>
  );
}
