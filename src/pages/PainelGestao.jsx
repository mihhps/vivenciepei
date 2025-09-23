import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";

// Importe o novo arquivo de estilo
import "../styles/PainelGestao.css";
import { toast, ToastContainer } from "react-toastify";

const CameraIcon = () => (
  <svg height="12" width="12" viewBox="0 0 24 24" fill="white">
    <path d="M4 4h3l2-2h6l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 14a5 5 0 100-10 5 5 0 000 10z" />
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
  </svg>
);

export default function PainelGestao() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("alunos"); // Aba inicial
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem("usuarioLogado");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUsuarioLogado(user);
      } catch (e) {
        console.error("Erro ao parsear dados do usuário:", e);
      }
    }
  }, []);

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

  const perfisComAcessoAcompanhamento = [
    "gestao",
    "seme",
    "aee",
    "diretor",
    "diretor adjunto",
    "orientador pedagógico",
  ];
  const perfilUsuarioFormatado = usuarioLogado?.perfil?.toLowerCase();
  const ID_DE_ALUNO_PARA_TESTE = "Avaliacaointeresses";

  const BotaoPainel = ({ texto, destino }) => (
    <button className="painel-botao" onClick={() => navigate(destino)}>
      {texto}
    </button>
  );

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
        <h1 className="painel-titulo">Painel da Gestão</h1>

        <div className="painel-tabs-nav">
          <button
            className={`tab-button ${abaAtiva === "alunos" ? "active" : ""}`}
            onClick={() => setAbaAtiva("alunos")}
          >
            Alunos
          </button>
          <button
            className={`tab-button ${
              abaAtiva === "avaliacoes" ? "active" : ""
            }`}
            onClick={() => setAbaAtiva("avaliacoes")}
          >
            Avaliações
          </button>
          <button
            className={`tab-button ${abaAtiva === "pei" ? "active" : ""}`}
            onClick={() => setAbaAtiva("pei")}
          >
            PEI
          </button>
          <button
            className={`tab-button ${abaAtiva === "gestao" ? "active" : ""}`}
            onClick={() => setAbaAtiva("gestao")}
          >
            Gestão
          </button>
        </div>

        <div className="painel-tabs-content">
          {abaAtiva === "alunos" && (
            <>
              <BotaoPainel texto="Cadastrar Aluno" destino="/cadastrar-aluno" />
              <BotaoPainel texto="Ver Alunos" destino="/ver-alunos" />
              <BotaoPainel texto="Importar Alunos" destino="/importar-alunos" />
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
                texto="Avaliação de Interesses"
                destino={`/nova-avaliacao/${ID_DE_ALUNO_PARA_TESTE}`}
              />
              <BotaoPainel
                texto="Relatórios do Aluno"
                destino="/relatorios-aluno"
              />
            </>
          )}

          {abaAtiva === "pei" && (
            <>
              <BotaoPainel texto="Criar PEI" destino="/criar-pei" />
              <BotaoPainel texto="Ver PEIs" destino="/ver-peis" />
            </>
          )}

          {abaAtiva === "gestao" && (
            <>
              {/* ===== BOTÃO ADICIONADO AQUI ===== */}
              <BotaoPainel
                texto="Acompanhar Planos AEE"
                destino="/acompanhamento-gestao-selecao"
              />
              <BotaoPainel
                texto="Cadastrar Usuários"
                destino="/cadastro-usuario"
              />
              <BotaoPainel
                texto="Vincular Turmas a Professores"
                destino="/vincular-professores"
              />
              <BotaoPainel
                texto="Gerenciar Prazos PEI"
                destino="/gestao-prazos-pei"
              />
              {usuarioLogado &&
                perfisComAcessoAcompanhamento.includes(
                  perfilUsuarioFormatado
                ) && (
                  <BotaoPainel
                    texto="Acompanhamento de Prazos PEI"
                    destino="/acompanhamento-prazos-pei"
                  />
                )}
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
