import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";

import "../styles/RelatorioConferencia.css";

export default function RelatorioConferencia() {
  const navigate = useNavigate();
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recupera o ano e a escola do armazenamento local
  const anoAtivoSistema = Number(localStorage.getItem("anoExercicio")) || 2025;
  const escolaIdManual = localStorage.getItem("escolaId");

  useEffect(() => {
    const buscarDadosParaConferencia = async () => {
      try {
        setLoading(true);
        let q;

        // Lógica de busca: Prioriza a escola selecionada ou busca geral por ano
        if (
          escolaIdManual &&
          escolaIdManual !== "undefined" &&
          escolaIdManual !== "null"
        ) {
          q = query(
            collection(db, "usuarios"),
            where(`escolas.${escolaIdManual}`, "==", true)
          );
        } else {
          q = query(
            collection(db, "usuarios"),
            where("anoAtivo", "==", anoAtivoSistema)
          );
        }

        const snap = await getDocs(q);

        const lista = snap.docs.map((docSnap) => {
          const user = docSnap.data();
          const campoTurmas = `turmas_${anoAtivoSistema}`;
          const turmasData = user[campoTurmas] || {};

          // Filtra as turmas que possuem valor 'true'
          const turmasVinculadas = Object.keys(turmasData).filter(
            (t) => turmasData[t] === true
          );

          return {
            nome: user.nome || "Usuário sem nome",
            // Prioriza o campo 'cargo' conforme visto no seu banco de dados
            cargo: user.cargo || user.perfil || "Não definido",
            turmas:
              turmasVinculadas.length > 0
                ? turmasVinculadas.join(", ")
                : "Nenhuma turma vinculada",
            migrado: user.anoAtivo === anoAtivoSistema ? "✅" : "❌",
            escolaNome: user.escolaNome || "Unidade não informada",
          };
        });

        // Ordenação alfabética por nome
        setDados(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
      } catch (e) {
        console.error("Erro ao carregar relatório:", e);
      } finally {
        setLoading(false);
      }
    };

    buscarDadosParaConferencia();
  }, [anoAtivoSistema, escolaIdManual]);

  if (loading) return <Loader />;

  return (
    <div className="relatorio-container">
      <div className="relatorio-card">
        <header className="relatorio-header">
          <div>
            <h2>Conferência Geral {anoAtivoSistema}</h2>
            <p>Validação de cargos e enturmação para o novo exercício</p>
          </div>
          <button className="btn-voltar-relatorio" onClick={() => navigate(-1)}>
            ← Voltar
          </button>
        </header>

        <div className="tabela-wrapper">
          <table className="tabela-conferencia">
            <thead>
              <tr>
                <th style={{ textAlign: "center" }}>Status</th>
                <th>Profissional</th>
                <th>Cargo / Disciplina</th>
                <th>Escola Origem</th>
                <th>Turmas em {anoAtivoSistema}</th>
              </tr>
            </thead>
            <tbody>
              {dados.length > 0 ? (
                dados.map((item, index) => (
                  <tr
                    key={index}
                    className={
                      item.turmas === "Nenhuma turma vinculada"
                        ? "row-alerta"
                        : ""
                    }
                  >
                    <td
                      className="status-migrado"
                      style={{ textAlign: "center" }}
                    >
                      {item.migrado}
                    </td>
                    <td style={{ fontWeight: "800" }}>{item.nome}</td>
                    <td>
                      <span className="badge-cargo">{item.cargo}</span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      {item.escolaNome}
                    </td>
                    <td
                      className={
                        item.turmas === "Nenhuma turma vinculada"
                          ? "no-turmas"
                          : "turmas-list"
                      }
                    >
                      {item.turmas}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      padding: "50px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Nenhum registro encontrado para {anoAtivoSistema}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
