import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { getAuth, signOut } from "firebase/auth";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import TrocarEscola from "../components/TrocarEscola";
import { verificarPrazosPEI } from "../src/services/peiStatusChecker";

// Importe o novo arquivo de estilo
import "react-toastify/dist/ReactToastify.css";
import "../styles/PainelProfessor.css";

const CameraIcon = () => (
  <svg height="12" width="12" viewBox="0 0 24 24" fill="white">
    <path d="M4 4h3l2-2h6l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 14a5 5 0 100-10 5 5 0 000 10z" />
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
  </svg>
);

export default function PainelProfessor() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [avisosPEI, setAvisosPEI] = useState(null);
  const [carregandoAvisos, setCarregandoAvisos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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
            <strong>{usuarioLogado?.nome || "Professor"}</strong>
          </div>
        </div>

        <img
          src="/logo-vivencie.png"
          alt="Logo Vivencie PEI"
          className="painel-logo"
        />
        <h1 className="painel-titulo">Painel do Professor</h1>

        {exibirResumoAvisos()}

        <div className="botoes-primarios">
          <button
            className="painel-botao"
            onClick={() => navigate("/criar-pei")}
          >
            Criar PEI
          </button>
          <button
            className="painel-botao"
            onClick={() => navigate("/ver-avaliacoes")}
          >
            Ver Avaliações Iniciais
          </button>
          <button
            className="painel-botao"
            onClick={() => navigate("/visualizar-interesses")}
          >
            Ver Avaliações de Interesses
          </button>
          <button
            className="painel-botao"
            onClick={() => navigate("/prazos-professor")}
          >
            Ver Prazos Anuais do PEI
          </button>
        </div>

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
