import React, { useState, useMemo } from "react";
import { db } from "../firebase"; // Reverter para o seu import real
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { FaTicketAlt, FaCopy, FaArrowLeft, FaShieldAlt } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";

import "../styles/GerenciadorConvites.css";

export default function GerenciadorConvites() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [codigoGerado, setCodigoGerado] = useState("");

  // Recupera usuário do localStorage para verificar admin
  const usuario = useMemo(
    () => JSON.parse(localStorage.getItem("usuarioLogado") || "{}"),
    []
  );
  const ehAdmin =
    usuario.perfil?.toLowerCase() === "desenvolvedor" ||
    usuario.perfil?.toLowerCase() === "seme";

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleGerarConvite = async () => {
    if (!ehAdmin) {
      toast.error("Acesso negado. Apenas administradores.");
      return;
    }

    setLoading(true);
    try {
      const novoCodigo = generateInviteCode();

      await addDoc(collection(db, "convites"), {
        codigo: novoCodigo,
        expirado: false,
        dataCriacao: serverTimestamp(),
        criadoPor: usuario.email || "Sistema",
      });

      setCodigoGerado(novoCodigo);
      toast.success("Convite gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar no banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoGerado);
    toast.info("Código copiado para a área de transferência!");
  };

  if (!ehAdmin) {
    return (
      <div className="convite-page-container">
        <div className="convite-card error-state">
          <FaShieldAlt size={50} color="#ef4444" />
          <h1>Acesso Restrito</h1>
          <p>
            Sua conta não possui privilégios de administrador para gerar novos
            convites.
          </p>
          <button className="btn-voltar-premium" onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="convite-page-container">
      <ToastContainer position="bottom-right" />

      <div className="convite-card">
        <div className="convite-header">
          <button className="btn-back-minimal" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Voltar
          </button>
          <div className="icon-circle">
            <FaTicketAlt />
          </div>
          <h1>Gerador de Convites</h1>
          <p>Crie chaves de acesso únicas para novos usuários da plataforma.</p>
        </div>

        <div className="convite-content">
          <button
            className="btn-gerar-main"
            onClick={handleGerarConvite}
            disabled={loading}
          >
            {loading ? "Processando..." : "Gerar Nova Chave de Acesso"}
          </button>

          {codigoGerado && (
            <div className="resultado-codigo-box">
              <label>Código Gerado:</label>
              <div className="codigo-display">
                <span className="font-mono">{codigoGerado}</span>
                <button
                  className="btn-copy"
                  onClick={copiarCodigo}
                  title="Copiar código"
                >
                  <FaCopy /> Copiar
                </button>
              </div>
              <p className="instrucao-p">
                Este código permite um único cadastro na tela de registro.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
