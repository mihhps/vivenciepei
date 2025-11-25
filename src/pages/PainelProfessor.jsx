import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { getAuth, signOut } from "firebase/auth";
// Presumindo que 'db' e 'storage' são exportados de '../firebase'
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import TrocarEscola from "../components/TrocarEscola";
import { verificarPrazosPEI } from "../src/services/peiStatusChecker";

import "react-toastify/dist/ReactToastify.css";
import "../styles/PainelProfessor.css";

// ====================================================================
// Componentes Auxiliares
// ====================================================================
const BotaoPainel = ({ texto, destino }) => {
  const navigate = useNavigate();
  return (
    <button className="painel-botao" onClick={() => navigate(destino)}>
      {texto}
    </button>
  );
};

const CameraIcon = () => (
  <svg height="12" width="12" viewBox="0 0 24 24" fill="white">
    <path d="M4 4h3l2-2h6l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 14a5 5 0 100-10 5 5 0 000 10z" />
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
  </svg>
);

// ====================================================================
// Componente Principal
// ====================================================================
export default function PainelProfessor() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [avisosPEI, setAvisosPEI] = useState(null);
  const [carregandoAvisos, setCarregandoAvisos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [abaAtiva, setAbaAtiva] = useState("pei");

  const carregarAvisos = useCallback(async () => {
    setCarregandoAvisos(true);
    const userData = localStorage.getItem("usuarioLogado");
    if (!userData) {
      toast.error("Sessão não encontrada.");
      navigate("/login");
      return;
    }

    const currentUser = JSON.parse(userData);
    setUsuarioLogado(currentUser);

    if (currentUser.perfil !== "professor" || !currentUser.id) {
      setAvisosPEI({ erro: "Perfil inválido ou ID não encontrado." });
      setCarregandoAvisos(false);
      return;
    }

    try {
      const anoLetivoAtual = new Date().getFullYear();
      const status = await verificarPrazosPEI(anoLetivoAtual, currentUser.id);
      setAvisosPEI(status);
    } catch (error) {
      console.error("Erro ao verificar prazos PEI:", error);
      setAvisosPEI({ erro: "Falha ao verificar prazos dos PEIs." });
    } finally {
      setCarregandoAvisos(false);
    }
  }, [navigate]);

  useEffect(() => {
    carregarAvisos();
  }, [carregarAvisos]);

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
      toast.success("Foto de perfil atualizada com sucesso!");
    } catch (error) {
      console.error("Erro no upload da foto:", error);
      toast.error("Falha ao atualizar a foto de perfil.");
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

  const exibirResumoAvisos = () => {
    if (carregandoAvisos) {
      return (
        <div className="aviso-card aviso-info">
          <p>Verificando prazos dos PEIs...</p>
        </div>
      );
    }
    if (!avisosPEI) return null;

    const { statusGeral, mensagem, erro } = avisosPEI;

    if (erro) {
      return (
        <div className="aviso-card aviso-erro">
          <p>Erro: {erro}</p>
        </div>
      );
    }
    if (mensagem) {
      return (
        <div className="aviso-card aviso-info">
          <p>{mensagem}</p>
        </div>
      );
    }
    if (statusGeral === "Atrasado") {
      return (
        <div className="aviso-card aviso-alerta">
          <h3>Atenção: PEIs com Pendências!</h3>
          <button
            className="botao-detalhes"
            onClick={() => navigate(`/meu-acompanhamento-pei`)}
          >
            Ver Detalhes
          </button>
        </div>
      );
    }
    return (
      <div className="aviso-card aviso-sucesso">
        <p>Parabéns! Todos os PEIs de seus alunos estão em dia.</p>
      </div>
    );
  };

  return (
    <div className="painel-page-container">
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="painel-card">
        {/* === 1. PERFIL E FOTO === */}
        <div className="user-profile-top-corner">
          <div className="avatar-container">
            <img
              src={
                usuarioLogado?.photoURL ||
                "https://placehold.co/100x100/A0C3FF/ffffff?text=User"
              }
              alt="Foto do perfil"
              className="avatar-imagem"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://placehold.co/100x100/A0C3FF/ffffff?text=User";
              }}
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
            <strong>{usuarioLogado?.nome || "Professor"}</strong>
          </div>
        </div>

        <img
          src="/logo-vivencie.png"
          alt="Logo Vivencie PEI"
          className="painel-logo"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://placehold.co/150x50/3498db/ffffff?text=Logo+PEI";
          }}
        />
        <h1 className="painel-titulo">Painel do Professor</h1>

        {/* === 2. AVISOS/PENDÊNCIAS (Alto Destaque) === */}
        {exibirResumoAvisos()}

        {/* === 3. NAVEGAÇÃO DE ABAS === */}
        <div className="painel-tabs-nav">
          <button
            className={`tab-button ${abaAtiva === "pei" ? "active" : ""}`}
            onClick={() => setAbaAtiva("pei")}
          >
            PEI
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
            className={`tab-button ${
              abaAtiva === "planejamento" ? "active" : ""
            }`}
            onClick={() => setAbaAtiva("planejamento")}
          >
            Planejamento
          </button>
        </div>

        {/* === 4. CONTEÚDO DAS ABAS (Botões Empilhados) === */}
        <div className="painel-tabs-content">
          {abaAtiva === "pei" && (
            <>
              <BotaoPainel texto="Criar PEI" destino="/criar-pei" />
              <BotaoPainel
                texto="Ver Prazos Anuais do PEI"
                destino="/prazos-professor"
              />
            </>
          )}

          {abaAtiva === "avaliacoes" && (
            <>
              <BotaoPainel
                texto="Ver Avaliações Iniciais"
                destino="/ver-avaliacoes"
              />
              <BotaoPainel
                texto="Ver Avaliações de Interesses"
                destino="/visualizar-interesses"
              />
            </>
          )}

          {abaAtiva === "planejamento" && (
            <>
              <BotaoPainel
                texto="Estúdio de Adaptação de Conteúdo (IA)"
                destino="/selecionar-aluno-adaptacao"
              />
              <BotaoPainel
                texto="Criar Plano de Aula DUA"
                destino="/criar-plano-dua"
              />
            </>
          )}
        </div>

        {/* === 5. AÇÕES INFERIORES === */}
        <div className="botoes-secundarios">
          <TrocarEscola className="botao-trocar-escola" />
          <button onClick={handleSair} className="painel-botao-sair">
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
