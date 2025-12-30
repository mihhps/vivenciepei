import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";

// Componentes
import TrocarEscola from "../components/TrocarEscola";
import HeaderSistema from "../components/HeaderSistema";

// Estilos
import "react-toastify/dist/ReactToastify.css";
import "../styles/PainelGestao.css";

const BotaoPainel = ({ texto, destino }) => {
  const navigate = useNavigate();
  return (
    <button className="btn-acao" onClick={() => navigate(destino)}>
      {texto}
    </button>
  );
};

export default function PainelGestao() {
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
      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload da foto.");
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
      toast.error("Erro ao sair do sistema.");
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

  return (
    <div className="painel-page-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="painel-card">
        {/* LADO ESQUERDO: BRANDING */}
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
        <div className="actions-section">
          {/* SELETOR DE EXERCÍCIO (PADRÃO IPM) */}
          <HeaderSistema usuario={usuarioLogado} />

          {/* PERFIL DO USUÁRIO */}
          <div
            className="header-wrapper"
            onClick={() => fileInputRef.current.click()}
          >
            <div className="avatar-container">
              <img
                src={
                  usuarioLogado?.photoURL ||
                  "https://placehold.co/100x100/3b82f6/ffffff?text=User"
                }
                className={`avatar ${uploading ? "uploading" : ""}`}
                alt="Avatar"
              />
              <div className="avatar-overlay">Trocar Foto</div>
            </div>

            <div className="user-text-group">
              <h3 className="user-name">{usuarioLogado?.nome || "Gestor"}</h3>
              <p className="escola-tag">
                {usuarioLogado?.escolaNome || "Painel Administrativo"}
              </p>
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
            {["alunos", "avaliacoes", "pei", "gestao"].map((tab) => (
              <button
                key={tab}
                className={`tab-item ${abaAtiva === tab ? "active" : ""}`}
                onClick={() => setAbaAtiva(tab)}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* GRADE DE AÇÕES */}
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
                  texto="Interesses"
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

            {abaAtiva === "gestao" && (
              <>
                <BotaoPainel
                  texto="Gerenciar Convites"
                  destino="/admin/convites"
                />
                <BotaoPainel
                  texto="Planos AEE"
                  destino="/acompanhamento-gestao-selecao"
                />
                <BotaoPainel
                  texto="Cadastrar Usuários"
                  destino="/cadastro-usuario"
                />
                <BotaoPainel
                  texto="Vincular Professores"
                  destino="/vincular-professores"
                />
                <BotaoPainel texto="Prazos PEI" destino="/gestao-prazos-pei" />
                {usuarioLogado &&
                  perfisComAcessoAcompanhamento.includes(
                    perfilUsuarioFormatado
                  ) && (
                    <BotaoPainel
                      texto="Acompanhar Prazos"
                      destino="/acompanhamento-prazos-pei"
                    />
                  )}
              </>
            )}
          </div>

          {/* RODAPÉ DO PAINEL */}
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
