import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { getAuth, signOut } from "firebase/auth";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import TrocarEscola from "../components/TrocarEscola";
import HeaderSistema from "../components/HeaderSistema"; // Importado
import { verificarPrazosPEI } from "../src/services/peiStatusChecker";

import "react-toastify/dist/ReactToastify.css";
import "../styles/PainelProfessor.css";

const BotaoPainel = ({ texto, destino }) => {
  const navigate = useNavigate();
  return (
    <button className="btn-acao" onClick={() => navigate(destino)}>
      {texto}
    </button>
  );
};

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
      navigate("/login");
      return;
    }
    const currentUser = JSON.parse(userData);
    setUsuarioLogado(currentUser);

    try {
      // Pega o exercício do localStorage para os prazos baterem com o ano selecionado
      const anoExercicio =
        localStorage.getItem("anoExercicio") || new Date().getFullYear();
      const status = await verificarPrazosPEI(
        Number(anoExercicio),
        currentUser.id
      );
      setAvisosPEI(status);
    } catch (error) {
      setAvisosPEI({ erro: "Erro ao verificar prazos." });
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
      window.location.reload(); // Recarrega para atualizar a foto no Header também
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

  return (
    <div className="painel-page-container">
      <ToastContainer position="bottom-right" autoClose={3000} />

      <div className="painel-card">
        {/* LADO ESQUERDO: MARCA IMPONENTE */}
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
          style={{ position: "relative", paddingTop: "70px" }}
        >
          {/* SELETOR DE EXERCÍCIO (IPM) */}
          <HeaderSistema usuario={usuarioLogado} />

          {/* ÁREA DE IDENTIDADE SIMPLIFICADA (Apenas funcionalidade de troca) */}

          {/* Notificação de Pendência */}
          {!carregandoAvisos && avisosPEI?.statusGeral === "Atrasado" && (
            <div
              className="alerta-pendencia-container"
              style={{ margin: "0 40px 20px" }}
            >
              <div
                className="alerta-pendencia"
                style={{
                  background: "#fffbeb",
                  padding: "12px 20px",
                  borderRadius: "15px",
                  border: "1px solid #fef3c7",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "700",
                    color: "#92400e",
                    margin: 0,
                  }}
                >
                  ⚠️ Pendências no PEI (
                  {localStorage.getItem("anoExercicio") || "Atual"})
                </p>
                <button
                  style={{
                    background: "#d97706",
                    color: "white",
                    border: "none",
                    padding: "6px 15px",
                    borderRadius: "10px",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                  onClick={() => navigate("/meu-acompanhamento-pei")}
                >
                  Detalhes
                </button>
              </div>
            </div>
          )}

          {/* NAVEGAÇÃO DE ABAS */}
          <div className="tabs-container">
            <button
              className={`tab-item ${abaAtiva === "pei" ? "active" : ""}`}
              onClick={() => setAbaAtiva("pei")}
            >
              PEI
            </button>
            <button
              className={`tab-item ${
                abaAtiva === "avaliacoes" ? "active" : ""
              }`}
              onClick={() => setAbaAtiva("avaliacoes")}
            >
              AVALIAÇÕES
            </button>
            <button
              className={`tab-item ${
                abaAtiva === "planejamento" ? "active" : ""
              }`}
              onClick={() => setAbaAtiva("planejamento")}
            >
              PLANEJAMENTO
            </button>
          </div>

          {/* CONTEÚDO DINÂMICO */}
          <div className="grid-acoes">
            {abaAtiva === "pei" && (
              <>
                <button
                  className="btn-acao"
                  onClick={() => navigate("/criar-pei")}
                >
                  Criar Novo PEI
                </button>
                <button
                  className="btn-acao"
                  onClick={() => navigate("/prazos-professor")}
                >
                  Prazos Anuais
                </button>
              </>
            )}
            {abaAtiva === "avaliacoes" && (
              <>
                <button
                  className="btn-acao"
                  onClick={() => navigate("/ver-avaliacoes")}
                >
                  Iniciais
                </button>
                <button
                  className="btn-acao"
                  onClick={() => navigate("/visualizar-interesses")}
                >
                  Interesses
                </button>
              </>
            )}
            {abaAtiva === "planejamento" && (
              <>
                <button
                  className="btn-acao"
                  onClick={() => navigate("/selecionar-aluno-adaptacao")}
                >
                  IA Adaptação
                </button>
                <button
                  className="btn-acao"
                  onClick={() => navigate("/criar-plano-dua")}
                >
                  Plano DUA
                </button>
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
