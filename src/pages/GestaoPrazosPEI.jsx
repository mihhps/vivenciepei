import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  updateDoc,
  doc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { FaCalendarAlt, FaClock, FaSave, FaArrowLeft } from "react-icons/fa";
import Loader from "../components/Loader";

import "../styles/GestaoPrazosPEI.css";

export default function GestaoPrazosPEI() {
  const navigate = useNavigate();
  const anoAtual = new Date().getFullYear();

  const [anoLetivo, setAnoLetivo] = useState(anoAtual);
  const [prazos, setPrazos] = useState({ criacao: "", rev1: "", rev2: "" });
  const [loading, setLoading] = useState(false);

  const formatTimestamp = (ts) =>
    ts ? ts.toDate().toISOString().split("T")[0] : "";

  const buscarPrazos = useCallback(async (ano) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "prazosPEIAnuais"),
        where("anoLetivo", "==", ano)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const d = snap.docs[0].data();
        setPrazos({
          criacao: formatTimestamp(d.dataLimiteCriacaoPEI),
          rev1: formatTimestamp(d.dataLimiteRevisao1Sem),
          rev2: formatTimestamp(d.dataLimiteRevisao2Sem),
        });
        toast.info(`Prazos de ${ano} carregados.`);
      } else {
        setPrazos({ criacao: "", rev1: "", rev2: "" });
        toast.warn(`Nenhum prazo definido para ${ano}.`);
      }
    } catch (e) {
      toast.error("Erro ao carregar prazos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado") || "{}");
    const perfil = user.perfil?.toLowerCase();
    if (!["gestao", "aee", "desenvolvedor", "seme"].includes(perfil)) {
      navigate("/");
      return;
    }
    buscarPrazos(anoLetivo);
  }, [anoLetivo, buscarPrazos, navigate]);

  const handleSalvar = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("usuarioLogado") || "{}");
      const toTS = (s) =>
        s ? Timestamp.fromDate(new Date(`${s}T00:00:00`)) : null;

      const data = {
        anoLetivo,
        dataLimiteCriacaoPEI: toTS(prazos.criacao),
        dataLimiteRevisao1Sem: toTS(prazos.rev1),
        dataLimiteRevisao2Sem: toTS(prazos.rev2),
        criadoPor: user.email || "admin",
        ultimaAtualizacao: serverTimestamp(),
      };

      const q = query(
        collection(db, "prazosPEIAnuais"),
        where("anoLetivo", "==", anoLetivo)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        await updateDoc(doc(db, "prazosPEIAnuais", snap.docs[0].id), data);
        toast.success("Prazos atualizados!");
      } else {
        await addDoc(collection(db, "prazosPEIAnuais"), data);
        toast.success("Prazos criados!");
      }
    } catch (e) {
      toast.error("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="gestao-prazos-container">
      <ToastContainer position="top-right" />

      <div className="gestao-prazos-card">
        <div className="prazos-header">
          <button className="btn-voltar-circle" onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          <div className="title-group">
            <h1>Configuração de Cronograma</h1>
            <p>Defina as datas limites para o ciclo do PEI</p>
          </div>
        </div>

        <div className="prazos-content">
          {/* SELETOR DE ANO */}
          <div className="prazos-section-box">
            <div className="section-label">
              <FaCalendarAlt className="icon" />
              <span>Ano Letivo de Referência</span>
            </div>
            <select
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(Number(e.target.value))}
              className="prazos-select"
            >
              {[anoAtual + 1, anoAtual, anoAtual - 1].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="dates-grid">
            {/* INPUTS DE DATA */}
            {[
              { key: "criacao", label: "Criação do PEI", color: "#3b82f6" },
              {
                key: "rev1",
                label: "1ª Revisão (Semestral)",
                color: "#10b981",
              },
              { key: "rev2", label: "2ª Revisão (Final)", color: "#f59e0b" },
            ].map((item) => (
              <div
                className="date-input-card"
                key={item.key}
                style={{ borderTop: `4px solid ${item.color}` }}
              >
                <label>{item.label}</label>
                <div className="input-with-icon">
                  <FaClock className="inner-icon" />
                  <input
                    type="date"
                    value={prazos[item.key]}
                    onChange={(e) =>
                      setPrazos({ ...prazos, [item.key]: e.target.value })
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn-salvar-prazos"
            onClick={handleSalvar}
            disabled={loading}
          >
            <FaSave /> Salvar Cronograma {anoLetivo}
          </button>
        </div>
      </div>
    </div>
  );
}
