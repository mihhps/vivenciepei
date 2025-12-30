import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { getAuth, signOut } from "firebase/auth";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import TrocarEscola from "../components/TrocarEscola";

import "react-toastify/dist/ReactToastify.css";
import "../styles/PainelSEME.css";

const BotaoPainel = ({ texto, destino }) => {
  const navigate = useNavigate();
  return (
    <button className="btn-acao" onClick={() => navigate(destino)}>
      {texto}
    </button>
  );
};

export default function PainelSEME() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("avaliacoes");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem("usuarioLogado");
    if (usuarioSalvo) {
      setUsuarioLogado(JSON.parse(usuarioSalvo));
    } else {
      navigate("/login");
    }
  }, [navigate]);

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
      toast.error("Erro no upload da foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleSair = async () => {
    try {
      await signOut(getAuth());
      localStorage.removeItem("usuarioLogado");
      navigate("/login");
    } catch (error) {
      toast.error("Erro ao sair.");
    }
  };

  if (!usuarioLogado) return null;

  return (
    <div className="painel-page-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="painel-card">
        {/* LADO ESQUERDO: BRANDING SEME */}
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

        {/* LADO DIREITO: SISTEMA */}
        <div className="actions-section">
          {/* IDENTIDADE */}
          <div
            className="header-wrapper"
            onClick={() => fileInputRef.current.click()}
            style={{ cursor: "pointer" }}
          >
            <img
              src={
                usuarioLogado?.photoURL ||
                "https://placehold.co/100x100/3b82f6/ffffff?text=User"
              }
              className="avatar"
              alt="Avatar"
            />
            <div className="user-text-group">
              <h3 className="user-name">
                {usuarioLogado?.nome || "Equipe SEME"}
              </h3>
              <p className="escola-tag">Secretaria Municipal de Educação</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept="image/*"
            />
          </div>

          {/* NAVEGAÇÃO DE ABAS */}
          <div className="tabs-container">
            <button
              className={`tab-item ${
                abaAtiva === "avaliacoes" ? "active" : ""
              }`}
              onClick={() => setAbaAtiva("avaliacoes")}
            >
              PEI E AVALIAÇÕES
            </button>
            <button
              className={`tab-item ${abaAtiva === "alunos" ? "active" : ""}`}
              onClick={() => setAbaAtiva("alunos")}
            >
              ALUNOS E VÍNCULOS
            </button>
            <button
              className={`tab-item ${abaAtiva === "gestao" ? "active" : ""}`}
              onClick={() => setAbaAtiva("gestao")}
            >
              GESTÃO
            </button>
          </div>

          {/* CONTEÚDO EM GRID */}
          <div className="grid-acoes">
            {abaAtiva === "avaliacoes" && (
              <>
                <BotaoPainel
                  texto="Avaliação Inicial"
                  destino="/avaliacao-inicial"
                />
                <BotaoPainel
                  texto="Avaliação Interesses"
                  destino="/nova-avaliacao/Avaliacaointeresses"
                />
                <BotaoPainel texto="Criar PEI" destino="/criar-pei" />
                <BotaoPainel
                  texto="Anamnese Completa"
                  destino="/anamnese-completa"
                />
                <BotaoPainel texto="Ver Anamneses" destino="/anamnese" />
                <BotaoPainel
                  texto="Relatórios Aluno"
                  destino="/relatorios-aluno"
                />
                <BotaoPainel
                  texto="Acompanhamento AEE"
                  destino="/acompanhamento-aee-selecao"
                />
                <BotaoPainel
                  texto="AEE Gestão"
                  destino="/acompanhamento-gestao-selecao"
                />
              </>
            )}

            {abaAtiva === "alunos" && (
              <>
                <BotaoPainel texto="Ver Alunos" destino="/ver-alunos" />
                <BotaoPainel
                  texto="Importar Alunos"
                  destino="/importar-alunos"
                />
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

            {abaAtiva === "gestao" && (
              <>
                <BotaoPainel
                  texto="Gerenciar Convites"
                  destino="/admin/convites"
                />
                <BotaoPainel
                  texto="Cadastrar Usuário"
                  destino="/cadastro-usuario"
                />
                <BotaoPainel
                  texto="Gerenciar Prazos"
                  destino="/gestao-prazos-pei"
                />
                <BotaoPainel
                  texto="Acompanhar Prazos"
                  destino="/acompanhamento-prazos-pei"
                />
                <BotaoPainel
                  texto="Acompanhamento Escolar"
                  destino="/acompanhamento"
                />
              </>
            )}
          </div>

          {/* RODAPÉ */}
          <div className="painel-footer">
            <TrocarEscola />
            <button onClick={handleSair} className="btn-sair">
              Sair do Painel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
