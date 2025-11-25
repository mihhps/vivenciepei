import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BotaoSair from "../components/BotaoSair";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import "../styles/PainelAee.css";

const CameraIcon = () => (
  <svg height="12" width="12" viewBox="0 0 24 24" fill="white">
    <path d="M4 4h3l2-2h6l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 14a5 5 0 100-10 5 5 0 000 10z" />
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
  </svg>
);

export default function PainelAee() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  // Defino 'pei' como aba inicial, mas altere para 'alunos' ou 'planejamento' se preferir.
  const [abaAtiva, setAbaAtiva] = useState("alunos");
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
      await updateDoc(userDocRef, { photoURL: photoURL });
      const usuarioAtualizado = { ...usuarioLogado, photoURL };
      setUsuarioLogado(usuarioAtualizado);
      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioAtualizado));
    } catch (error) {
      console.error("Erro no upload da foto:", error);
      alert("Falha ao enviar a foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const perfisComAcessoAcompanhamento = ["gestao", "seme", "aee"];
  const perfilUsuarioFormatado = usuarioLogado?.perfil?.toLowerCase();
  const ID_DE_ALUNO_PARA_TESTE = "Avaliacaointeresses";

  const BotaoPainel = ({ texto, destino }) => (
    <button className="painel-botao" onClick={() => navigate(destino)}>
      {texto}
    </button>
  );

  return (
    <div className="painel-page-container">
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
              accept="image/png, image/jpeg"
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
        <h1 className="painel-titulo">Painel AEE</h1>

        {/* --- NAVEGAÇÃO DE ABAS ATUALIZADA --- */}
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
            className={`tab-button ${
              abaAtiva === "planejamento" ? "active" : ""
            }`}
            onClick={() => setAbaAtiva("planejamento")}
          >
            Planejamento
          </button>
          <button
            className={`tab-button ${abaAtiva === "gestao" ? "active" : ""}`}
            onClick={() => setAbaAtiva("gestao")}
          >
            Gestão
          </button>
        </div>
        {/* --- FIM DA NAVEGAÇÃO DE ABAS ATUALIZADA --- */}

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
                texto="Acompanhamento AEE"
                destino="/acompanhamento-aee-selecao"
              />
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

          {/* --- CONTEÚDO DA ABA PEI (Limpo) --- */}
          {abaAtiva === "pei" && (
            <>
              <BotaoPainel texto="Criar PEI" destino="/criar-pei" />
              <BotaoPainel texto="Ver PEIs" destino="/ver-peis" />
            </>
          )}
          {/* --- FIM DO CONTEÚDO DA ABA PEI --- */}

          {/* --- CONTEÚDO DA NOVA ABA PLANEJAMENTO - BOTÃO ADICIONADO AQUI --- */}
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
              <BotaoPainel
                texto="Ver Planos de Aula DUA"
                destino="/ver-planos-aula"
              />
              {/* Se houver outros planejamentos (como planos de curso, etc.) adicione aqui */}
              <BotaoPainel
                texto="Acompanhamento AEE"
                destino="/acompanhamento-aee-selecao"
              />
            </>
          )}
          {/* --- FIM DO CONTEÚDO DA NOVA ABA PLANEJAMENTO --- */}

          {abaAtiva === "gestao" && (
            <>
              <BotaoPainel
                texto="Vincular Professores a Turmas"
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

        <BotaoSair />
      </div>
    </div>
  );
}
