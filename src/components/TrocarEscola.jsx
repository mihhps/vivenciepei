import React from "react";
import { useNavigate } from "react-router-dom";
import { FaExchangeAlt } from "react-icons/fa"; // Usando react-icons para padronizar

export default function TrocarEscola() {
  const navigate = useNavigate();

  const handleTrocarEscola = () => {
    // 1. Limpa as seleções manuais
    localStorage.removeItem("escolaAtiva");
    localStorage.removeItem("escolaId");

    // 2. Feedback visual opcional
    // toast.info("Redirecionando para seleção de unidade...");

    // 3. Navega para a tela de seleção
    navigate("/selecionar-escola");

    // 4. Força o recarregamento para garantir que o sistema
    // "esqueça" o vínculo fixo do professor temporariamente
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <button
      onClick={handleTrocarEscola}
      className="group flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md transition-all hover:bg-blue-600/10 hover:border-blue-500/40 hover:text-blue-400 active:scale-95 shadow-2xl"
    >
      <FaExchangeAlt className="transition-transform duration-500 group-hover:rotate-180 text-blue-500/70" />
      <span>Mudar Unidade</span>
    </button>
  );
}
