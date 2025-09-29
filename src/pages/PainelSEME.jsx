import React, { useEffect, useState, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";

// Importe o novo arquivo de estilo
import "react-toastify/dist/ReactToastify.css";
import "../styles/PainelSEME.css";

const CameraIcon = () => (
  <svg height="12" width="12" viewBox="0 0 24 24" fill="white">
    <path d="M4 4h3l2-2h6l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 14a5 5 0 100-10 5 5 0 000 10z" />
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
  </svg>
);

export default function PainelSEME() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("avaliacoes"); // Aba inicial
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

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
    const storageRef = ref(storage, `fotos-perfil/${usuarioLogado.uid}`);
    try {
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      const userDocRef = doc(db, "usuarios", usuarioLogado.uid);
      await updateDoc(userDocRef, { photoURL });
      const usuarioAtualizado = { ...usuarioLogado, photoURL };
      setUsuarioLogado(usuarioAtualizado);
      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioAtualizado));
    } catch (error) {
      console.error("Erro no upload da foto:", error);
      toast.error("Falha ao enviar a foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleSair = async () => {
    try {
      await signOut(getAuth());
      localStorage.removeItem("usuarioLogado");
      toast.success("Você saiu com sucesso!");
      navigate("/login");
    } catch (error) {
      toast.error("Erro ao sair.");
    }
  };

  const BotaoPainel = ({ texto, destino }) => (
    <button className="painel-botao" onClick={() => navigate(destino)}>
      {texto}
    </button>
  );

  if (!usuarioLogado) {
    return <div className="app-loading">Carregando...</div>;
  }

  return (
    <div className="painel-page-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="painel-card">
        <div className="user-profile-top-corner">
          <div className="avatar-container">
            <img
              src={usuarioLogado?.photoURL || "/avatar-padrao.png"}
              alt="Foto do perfil"
              className="avatar-imagem"
            />
            <button
              className="avatar-botao-editar"
              onClick={handleAvatarClick}
              disabled={uploading}
            >
              {uploading ? "..." : <CameraIcon />}
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>
          <div className="user-text">
            <span>Bem-vindo, </span>
            <strong>{usuarioLogado?.nome || "Usuário"}</strong>
          </div>
        </div>

        <img
          src="/logo-vivencie.png"
          alt="Logo Vivencie PEI"
          className="painel-logo"
        />
        <h1 className="painel-titulo">Painel da SEME</h1>

        <div className="painel-tabs-nav">
          <button
            className={`tab-button ${
              abaAtiva === "avaliacoes" ? "active" : ""
            }`}
            onClick={() => setAbaAtiva("avaliacoes")}
          >
            Avaliações e PEI
          </button>
          <button
            className={`tab-button ${abaAtiva === "alunos" ? "active" : ""}`}
            onClick={() => setAbaAtiva("alunos")}
          >
            Alunos e Vínculos
          </button>
          <button
            className={`tab-button ${abaAtiva === "gestao" ? "active" : ""}`}
            onClick={() => setAbaAtiva("gestao")}
          >
            Gestão
          </button>
        </div>

        <div className="painel-tabs-content">
          {abaAtiva === "avaliacoes" && (
            <>
              <BotaoPainel
                texto="Avaliação Inicial"
                destino="/avaliacao-inicial"
              />
              <BotaoPainel
                texto="Avaliação de Interesses"
                destino="/nova-avaliacao/Avaliacaointeresses"
              />
              <BotaoPainel texto="Criar PEI" destino="/criar-pei" />
              <BotaoPainel
                texto="Anamnese Completa"
                destino="/anamnese-completa"
              />
              <BotaoPainel texto="Ver Anamneses" destino="/anamnese" />
              <BotaoPainel
                texto="Relatórios do Aluno"
                destino="/relatorios-aluno"
              />
              <BotaoPainel
                texto="Acompanhamento AEE"
                destino="/acompanhamento-aee-selecao"
              />

              <BotaoPainel
                texto="Acompanhamento AEE Gestão"
                destino="/acompanhamento-gestao-selecao"
              />
            </>
          )}

          {abaAtiva === "alunos" && (
            <>
              <BotaoPainel texto="Ver Alunos" destino="/ver-alunos" />
              <BotaoPainel texto="Importar Alunos" destino="/importar-alunos" />
              <BotaoPainel texto="Cadastrar Turma" destino="/cadastro-turmas" />
              <BotaoPainel
                texto="Vincular Turmas a Professores"
                destino="/vincular-professores"
              />
              <BotaoPainel
                texto="Vincular Escolas a Professores"
                destino="/vincular-escolas"
              />
            </>
          )}

          {abaAtiva === "gestao" && (
            <>
              {/* 💡 NOVO: Botão para Gerenciador de Convites */}
              <BotaoPainel
                texto="Gerenciar Convites"
                destino="/admin/convites"
              />
              <BotaoPainel
                texto="Cadastrar Usuário"
                destino="/cadastro-usuario"
              />
              <BotaoPainel
                texto="Gerenciar Prazos PEI"
                destino="/gestao-prazos-pei"
              />
              <BotaoPainel
                texto="Acompanhar Prazos PEI"
                destino="/acompanhamento-prazos-pei"
              />
              <BotaoPainel
                texto="Acompanhamento Escolar"
                destino="/acompanhamento"
              />
            </>
          )}
        </div>

        <button onClick={handleSair} className="painel-botao-sair">
          Sair
        </button>
      </div>
    </div>
  );
}
