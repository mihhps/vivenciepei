import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { signOut, getAuth } from "firebase/auth";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";

// Componentes
import TrocarEscola from "../components/TrocarEscola";
import HeaderSistema from "../components/HeaderSistema";

import "react-toastify/dist/ReactToastify.css";
import "../styles/PainelAee.css";

const BotaoPainel = ({ texto, destino }) => {
  const navigate = useNavigate();
  return (
    <button className="btn-acao" onClick={() => navigate(destino)}>
      {texto}
    </button>
  );
};

export default function PainelAee() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("alunos");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem("usuarioLogado");
    if (userData) {
      setUsuarioLogado(JSON.parse(userData));
    }
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !usuarioLogado) return;
    setUploading(true);
    const uid = usuarioLogado.uid || usuarioLogado.id;
    const storageRef = ref(storage, `fotos-perfil/${uid}`);
    try {
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      const userDocRef = doc(db, "usuarios", uid);
      await updateDoc(userDocRef, { photoURL });
      const usuarioAtualizado = { ...usuarioLogado, photoURL };
      setUsuarioLogado(usuarioAtualizado);
      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioAtualizado));
      toast.success("Foto atualizada!");
    } catch (error) {
      toast.error("Erro no upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleSair = async () => {
    await signOut(getAuth());
    localStorage.removeItem("usuarioLogado");
    navigate("/login");
  };

  const ID_DE_ALUNO_PARA_TESTE = "Avaliacaointeresses";

  return (
    <div className="painel-page-container">
      <ToastContainer position="bottom-right" autoClose={3000} />

      <div className="painel-card">
        {/* LADO ESQUERDO: MARCA */}
        <div className="brand-section">
          <img
            src="/logo-vivencie.png"
            className="painel-logo"
            alt="Vivencie PEI"
          />
          <h1 className="painel-titulo">
            Vivencie
            <br />
            PEI
          </h1>
        </div>

        {/* LADO DIREITO: OPERACIONAL */}
        <div
          className="actions-section"
          style={{ position: "relative", paddingTop: "80px" }}
        >
          {/* HEADER DE EXERCÍCIO (Mantém a Identidade e o Ano no Topo) */}
          <HeaderSistema usuario={usuarioLogado} />

          {/* REMOVIDO: O bloco "header-wrapper" que continha a foto grande e o nome centralizado,
              pois essa informação já está no HeaderSistema superior.
          */}

          {/* NAVEGAÇÃO DE ABAS - Sobe um pouco agora que o centro está livre */}
          <div className="tabs-container" style={{ marginTop: "20px" }}>
            {["alunos", "avaliacoes", "pei", "planejamento", "gestao"].map(
              (tab) => (
                <button
                  key={tab}
                  className={`tab-item ${abaAtiva === tab ? "active" : ""}`}
                  onClick={() => setAbaAtiva(tab)}
                >
                  {tab.toUpperCase()}
                </button>
              )
            )}
          </div>

          {/* CONTEÚDO EM GRID */}
          <div className="grid-acoes">
            {abaAtiva === "alunos" && (
              <>
                <BotaoPainel
                  texto="Cadastrar Aluno"
                  destino="/cadastrar-aluno"
                />
                <BotaoPainel texto="Ver Alunos" destino="/ver-alunos" />
                <BotaoPainel
                  texto="Importar Alunos"
                  destino="/importar-alunos"
                />
              </>
            )}

            {abaAtiva === "avaliacoes" && (
              <>
                <BotaoPainel
                  texto="Avaliação Inicial"
                  destino="/avaliacao-inicial"
                />
                <BotaoPainel
                  texto="Anamnese Completa"
                  destino="/anamnese-completa"
                />
                <BotaoPainel texto="Ver Anamneses" destino="/anamnese" />
                <BotaoPainel
                  texto="Avaliação Interesses"
                  destino={`/nova-avaliacao/${ID_DE_ALUNO_PARA_TESTE}`}
                />
                <BotaoPainel texto="Relatórios" destino="/relatorios-aluno" />
              </>
            )}

            {abaAtiva === "pei" && (
              <>
                <BotaoPainel texto="Criar PEI" destino="/criar-pei" />
                <BotaoPainel texto="Ver PEIs" destino="/ver-peis" />
              </>
            )}

            {abaAtiva === "planejamento" && (
              <>
                <BotaoPainel
                  texto="Adaptação IA"
                  destino="/selecionar-aluno-adaptacao"
                />
                <BotaoPainel
                  texto="Criar Plano DUA"
                  destino="/criar-plano-dua"
                />
                <BotaoPainel
                  texto="Ver Planos DUA"
                  destino="/ver-planos-aula"
                />
                <BotaoPainel
                  texto="Acompanhamento"
                  destino="/acompanhamento-aee-selecao"
                />
              </>
            )}

            {abaAtiva === "gestao" && (
              <>
                <BotaoPainel
                  texto="Vincular Professores"
                  destino="/vincular-professores"
                />
                <BotaoPainel
                  texto="Gerenciar Prazos"
                  destino="/gestao-prazos-pei"
                />
                <BotaoPainel
                  texto="Acompanhamento Prazos"
                  destino="/acompanhamento-prazos-pei"
                />
              </>
            )}
          </div>

          {/* RODAPÉ */}
          <div className="painel-footer">
            <TrocarEscola />
            <button onClick={handleSair} className="btn-sair">
              Sair do Sistema
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
