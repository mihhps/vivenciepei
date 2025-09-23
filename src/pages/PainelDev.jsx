import React, { useEffect, useState, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";

// Importe o novo arquivo de estilo
import "../styles/PainelDev.css";

// Ícone para o botão de editar foto
const CameraIcon = () => (
  <svg height="12" width="12" viewBox="0 0 24 24" fill="white">
    <path d="M4 4h3l2-2h6l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 14a5 5 0 100-10 5 5 0 000 10z" />
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
  </svg>
);

export default function PainelDev() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loadingRecalculo, setLoadingRecalculo] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("avaliacoes"); // Aba inicial
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Efeito para carregar o CSS do Toastify se necessário
  useEffect(() => {
    if (!document.querySelector('link[href*="react-toastify"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/react-toastify@9.1.1/dist/ReactToastify.min.css";
      document.head.appendChild(link);
    }
  }, []);

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

  const handleRecalcularTodosPrazos = async () => {
    setLoadingRecalculo(true);
    toast.info("Iniciando recálculo...", { autoClose: 3000 });
    try {
      const user = getAuth().currentUser;
      if (!user) throw new Error("Usuário não autenticado.");
      const token = await user.getIdToken(true);
      const url = "https://recalculartodosprazos-hc7r4cnuvq-rj.a.run.app";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: { userId: user.uid } }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro na função.");
      toast.success(result.message || "Recálculo concluído!");
    } catch (error) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoadingRecalculo(false);
    }
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

  const BotaoPainel = ({ texto, destino, className = "painel-botao" }) => (
    <button className={className} onClick={() => navigate(destino)}>
      {texto}
    </button>
  );

  if (!usuarioLogado) {
    return <div className="app-loading">Carregando...</div>;
  }

  return (
    <div className="painel-page-container">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
      />
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
        <h1 className="painel-titulo">Painel do Desenvolvedor</h1>

        <div className="painel-tabs-nav">
          <button
            className={`tab-button ${
              abaAtiva === "avaliacoes" ? "active" : ""
            }`}
            onClick={() => setAbaAtiva("avaliacoes")}
          >
            Avaliações
          </button>
          <button
            className={`tab-button ${abaAtiva === "gestao" ? "active" : ""}`}
            onClick={() => setAbaAtiva("gestao")}
          >
            Gestão
          </button>
          <button
            className={`tab-button ${
              abaAtiva === "acompanhamento" ? "active" : ""
            }`}
            onClick={() => setAbaAtiva("acompanhamento")}
          >
            Acompanhamento
          </button>
          <button
            className={`tab-button ${abaAtiva === "admin" ? "active" : ""}`}
            onClick={() => setAbaAtiva("admin")}
          >
            Admin
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
              <BotaoPainel
                texto="Avaliação 0-3 Anos"
                destino="/nova-avaliacao-0a3"
              />
              <BotaoPainel texto="Criar PEI" destino="/criar-pei" />
              <BotaoPainel
                texto="Criar PEI 0-3 Anos"
                destino="/criar-pei-0a3"
              />
              <BotaoPainel
                texto="Anamnese Completa"
                destino="/anamnese-completa"
              />
            </>
          )}

          {abaAtiva === "gestao" && (
            <>
              <BotaoPainel texto="Ver Alunos" destino="/ver-alunos" />
              <BotaoPainel texto="Importar Alunos" destino="/importar-alunos" />
              <BotaoPainel texto="Ver Anamneses" destino="/anamnese" />
              <BotaoPainel
                texto="Relatórios de Aluno"
                destino="/relatorios-aluno"
              />
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

          {abaAtiva === "acompanhamento" && (
            <>
              <BotaoPainel
                texto="Acompanhamento Escolar"
                destino="/acompanhamento"
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

          {abaAtiva === "admin" && (
            <>
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
              <hr className="painel-divisor" />
              <h3 className="subtitulo-admin">Ferramentas de Manutenção</h3>
              <button
                onClick={handleRecalcularTodosPrazos}
                className="painel-botao-admin"
                disabled={loadingRecalculo}
              >
                {loadingRecalculo
                  ? "Recalculando..."
                  : "Recalcular Todos os Prazos PEI"}
              </button>
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
