import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { getAuth, signOut } from "firebase/auth";
import { db } from "../firebase";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";

// Componentes
import HeaderSistema from "../components/HeaderSistema";

import "react-toastify/dist/ReactToastify.css";
import "../styles/PainelDev.css";

const BotaoPainel = ({ texto, destino }) => {
  const navigate = useNavigate();
  return (
    <button className="btn-acao" onClick={() => navigate(destino)}>
      {texto}
    </button>
  );
};

export default function PainelDev() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loadingRecalculo, setLoadingRecalculo] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("avaliacoes");
  const [migrando, setMigrando] = useState(false);

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem("usuarioLogado");
    if (usuarioSalvo) {
      let user = JSON.parse(usuarioSalvo);

      // 🛡️ BLINDAGEM DE PERFIL: Garante que você sempre seja desenvolvedor
      if (user.email === "seu-email@exemplo.com") {
        user.perfil = "desenvolvedor";
      }

      setUsuarioLogado(user);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // --- CORREÇÃO DE TURMAS SEM ANO (LEGADO) ---
  const corrigirTurmasLegado = async () => {
    const confirmacao = window.confirm(
      "Isso irá percorrer todas as escolas e adicionar 'ano: 2025' nas turmas que não possuem data. Confirmar?"
    );
    if (!confirmacao) return;

    setMigrando(true);
    try {
      const escolasSnap = await getDocs(collection(db, "escolas"));
      let totalCorrigido = 0;

      for (const escolaDoc of escolasSnap.docs) {
        const turmasRef = collection(db, "escolas", escolaDoc.id, "turmas");
        const turmasSnap = await getDocs(turmasRef);

        const batch = writeBatch(db);
        let houveMudanca = false;

        turmasSnap.docs.forEach((tDoc) => {
          if (!tDoc.data().ano) {
            batch.update(doc(db, "escolas", escolaDoc.id, "turmas", tDoc.id), {
              ano: 2025,
            });
            totalCorrigido++;
            houveMudanca = true;
          }
        });

        if (houveMudanca) await batch.commit();
      }
      toast.success(`${totalCorrigido} turmas vinculadas ao ano 2025!`);
    } catch (e) {
      toast.error("Erro na correção: " + e.message);
    } finally {
      setMigrando(false);
    }
  };

  const rodarMigracaoGlobal2025 = async () => {
    const confirmacao = window.confirm(
      "Aplicar ano 2025 em TODAS as coleções?"
    );
    if (!confirmacao) return;
    setMigrando(true);
    try {
      const colecoes = [
        "usuarios",
        "artifacts",
        "alunos",
        "peis",
        "avaliacoesIniciais",
        "vinculosProfessores",
      ];
      for (const nomeColecao of colecoes) {
        const querySnapshot = await getDocs(collection(db, nomeColecao));
        const promessas = querySnapshot.docs.map((docSnap) =>
          updateDoc(doc(db, nomeColecao, docSnap.id), { ano: 2025 })
        );
        await Promise.all(promessas);
      }
      toast.success("Migração global concluída!");
    } catch (error) {
      toast.error("Erro: " + error.message);
    } finally {
      setMigrando(false);
    }
  };

  const handleRecalcularTodosPrazos = async () => {
    setLoadingRecalculo(true);
    try {
      const user = getAuth().currentUser;
      const token = await user.getIdToken(true);
      await fetch("https://recalculartodosprazos-hc7r4cnuvq-rj.a.run.app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: { userId: user.uid } }),
      });
      toast.success("Recálculo concluído!");
    } catch (error) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoadingRecalculo(false);
    }
  };

  const handleSair = async () => {
    await signOut(getAuth());
    localStorage.removeItem("usuarioLogado");
    navigate("/login");
  };

  return (
    <div className="painel-page-container painel-admin-white-theme">
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="painel-card">
        <div className="brand-section">
          <img src="/logo-vivencie.png" className="painel-logo" alt="Logo" />
          <h1 className="painel-titulo">
            Vivencie
            <br />
            PEI
          </h1>
        </div>

        <div className="actions-section">
          <HeaderSistema usuario={usuarioLogado} />
          <div className="tabs-container">
            {["avaliacoes", "gestao", "acompanhamento", "admin"].map((tab) => (
              <button
                key={tab}
                className={`tab-item ${abaAtiva === tab ? "active" : ""}`}
                onClick={() => setAbaAtiva(tab)}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid-acoes">
            {abaAtiva === "avaliacoes" && (
              <>
                <BotaoPainel
                  texto="Avaliação Inicial"
                  destino="/avaliacao-inicial"
                />
                <BotaoPainel
                  texto="Interesses"
                  destino="/nova-avaliacao/Avaliacaointeresses"
                />
                <BotaoPainel
                  texto="Avaliação 0-3"
                  destino="/nova-avaliacao-0a3"
                />
                <BotaoPainel texto="Criar PEI" destino="/criar-pei" />
                <BotaoPainel texto="PEI 0-3 Anos" destino="/criar-pei-0a3" />
                <BotaoPainel
                  texto="Anamnese Completa"
                  destino="/anamnese-completa"
                />
              </>
            )}

            {abaAtiva === "gestao" && (
              <>
                <BotaoPainel texto="Ver Alunos" destino="/ver-alunos" />
                <BotaoPainel
                  texto="Importar Alunos"
                  destino="/importar-alunos"
                />
                <BotaoPainel texto="Ver Anamneses" destino="/anamnese" />
                <BotaoPainel
                  texto="Cadastrar Turma"
                  destino="/cadastro-turmas"
                />
                <BotaoPainel
                  texto="Vincular Turmas"
                  destino="/vincular-professores"
                />
                <BotaoPainel
                  texto="Vincular Escolas"
                  destino="/vincular-escolas"
                />
              </>
            )}

            {abaAtiva === "acompanhamento" && (
              <>
                <BotaoPainel texto="Escolar" destino="/acompanhamento" />
                <BotaoPainel
                  texto="AEE Seleção"
                  destino="/acompanhamento-aee-selecao"
                />
                <BotaoPainel
                  texto="AEE Gestão"
                  destino="/acompanhamento-gestao-selecao"
                />
              </>
            )}

            {abaAtiva === "admin" && (
              <>
                <BotaoPainel
                  texto="Relatório de Conferência 2026"
                  destino="/admin/relatorio-conferencia"
                />
                <BotaoPainel
                  texto="Gerenciar Convites"
                  destino="/admin/convites"
                />
                <BotaoPainel
                  texto="Cadastrar Usuário"
                  destino="/cadastro-usuario"
                />
                <BotaoPainel texto="Prazos PEI" destino="/gestao-prazos-pei" />

                <button
                  onClick={handleRecalcularTodosPrazos}
                  className="btn-manutencao"
                  disabled={loadingRecalculo}
                >
                  {loadingRecalculo ? "Processando..." : "Recalcular Prazos"}
                </button>

                <button
                  onClick={corrigirTurmasLegado}
                  className="btn-migrar-global"
                  style={{ background: "#f59e0b" }}
                >
                  {migrando ? "Processando..." : "CORRIGIR TURMAS SEM ANO"}
                </button>

                <button
                  onClick={rodarMigracaoGlobal2025}
                  className="btn-migrar-global"
                  disabled={migrando}
                >
                  {migrando ? "Migrando..." : "MIGRAR TUDO PARA 2025"}
                </button>
              </>
            )}
          </div>

          <div className="painel-footer">
            <span className="version-label">v2.5.0-stable</span>
            <button onClick={handleSair} className="btn-sair">
              Sair do Painel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
