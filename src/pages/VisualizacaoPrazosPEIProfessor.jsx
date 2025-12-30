import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHourglassHalf,
  FaArrowLeft,
} from "react-icons/fa";
import Loader from "../components/Loader";

import "../styles/AcompanhamentoPrazosPEI.css";

export default function VisualizacaoPrazosPEI() {
  const navigate = useNavigate();
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  const [prazos, setPrazos] = useState(null);
  const [loading, setLoading] = useState(false);

  const usuarioLogado = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado") || "{}"),
    []
  );

  const formatarData = (ts) => {
    if (!ts) return "Não definida";
    const d = ts.toDate();
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getStatus = (dataLimite) => {
    if (!dataLimite)
      return { label: "Pendente", color: "#94a3b8", icon: <FaHourglassHalf /> };
    const hoje = new Date();
    const limite = dataLimite.toDate();
    const diff = (limite - hoje) / (1000 * 60 * 60 * 24);

    if (diff < 0)
      return {
        label: "Encerrado",
        color: "#ef4444",
        icon: <FaExclamationTriangle />,
      };
    if (diff <= 15)
      return { label: "Urgente", color: "#f59e0b", icon: <FaClock /> };
    return { label: "No Prazo", color: "#10b981", icon: <FaCheckCircle /> };
  };

  const buscarPrazos = useCallback(async (ano) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "prazosPEIAnuais"),
        where("anoLetivo", "==", ano)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setPrazos(snap.docs[0].data());
      } else {
        setPrazos(null);
        toast.warn(`Nenhum cronograma publicado para ${ano}.`);
      }
    } catch (e) {
      toast.error("Erro ao carregar cronograma.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buscarPrazos(anoLetivo);
  }, [anoLetivo, buscarPrazos]);

  if (loading) return <Loader />;

  return (
    <div className="prazos-view-container">
      <ToastContainer position="top-right" />

      <div className="prazos-view-card">
        <div className="prazos-view-header">
          <button className="btn-back-circle" onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          <div className="title-text">
            <h1>Cronograma do PEI</h1>
            <p>Acompanhe as datas limites do ano letivo {anoLetivo}</p>
          </div>
        </div>

        <div className="ano-selector-strip">
          <label>Alterar Ano:</label>
          <select
            value={anoLetivo}
            onChange={(e) => setAnoLetivo(Number(e.target.value))}
          >
            {[2026, 2025, 2024].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="timeline-grid">
          {[
            {
              id: "Criação",
              key: "dataLimiteCriacaoPEI",
              desc: "Entrega do PEI Inicial",
            },
            {
              id: "1ª Revisão",
              key: "dataLimiteRevisao1Sem",
              desc: "Ajustes do 1º Semestre",
            },
            {
              id: "2ª Revisão",
              key: "dataLimiteRevisao2Sem",
              desc: "Consolidação Final",
            },
          ].map((item) => {
            const dataTs = prazos?.[item.key];
            const status = getStatus(dataTs);

            return (
              <div
                key={item.id}
                className="timeline-card"
                style={{ borderColor: status.color }}
              >
                <div
                  className="status-badge"
                  style={{ background: status.color }}
                >
                  {status.icon} {status.label}
                </div>
                <div className="card-body">
                  <span className="step-tag">{item.id}</span>
                  <h3>{item.desc}</h3>
                  <div className="date-display">
                    <FaCalendarAlt />
                    <span>{formatarData(dataTs)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!prazos && !loading && (
          <div className="empty-prazos">
            <p>
              O cronograma oficial ainda não foi divulgado pela gestão para este
              ano.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
