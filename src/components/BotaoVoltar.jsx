import React from "react";
import { useNavigate } from "react-router-dom";
import * as PropTypesImport from "prop-types";
import { FaArrowLeft } from "react-icons/fa";

// Importe o arquivo CSS onde a classe .botao-voltar está definida
import "../styles/CriarPEIComponent.css"; // Certifique-se de que este import está correto

function BotaoVoltar({ destino, texto = "Voltar" }) {
  const navigate = useNavigate();

  const usuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
  const perfil = (usuario.perfil || "").toLowerCase().trim();

  const painelMap = {
    desenvolvedor: "/painel-dev",
    desenvolvedora: "/painel-dev",
    gestao: "/painel-gestao",
    aee: "/painel-aee",
    seme: "/painel-seme",
    professor: "/painel-professor",
    diretor: "/painel-gestao",
    diretor_adjunto: "/painel-gestao",
    orientador_pedagogico: "/painel-gestao",
  };

  // Se um destino for explicitamente passado (prop destino), ele será usado diretamente.
  // Caso contrário, calculamos o painel padrão com base no perfil.
  const painelPadrao = painelMap[perfil] || "/";

  const handleVoltar = () => {
    try {
      // ----------------------------------------------------------------------
      // LÓGICA CORRIGIDA: Prioriza o destino fixo se ele foi definido.
      // ----------------------------------------------------------------------
      if (destino) {
        // Se um destino fixo foi passado (ex: "/avaliacao-inicial"), navega diretamente para ele.
        navigate(destino);
        return;
      }

      // Se não há destino fixo, tenta voltar no histórico.
      // Uma heurística comum é window.history.length > 2 para garantir que há uma página "anterior" real.
      if (window.history.length > 2) {
        navigate(-1); // Volta para a página anterior no histórico
      } else {
        // Se não há histórico para voltar, navega para o painel padrão.
        navigate(painelPadrao);
      }
    } catch (error) {
      console.error("Falha na navegação:", error);
      // Em caso de erro, força a navegação para a rota raiz como último recurso
      navigate("/", { replace: true });
    }
  };

  return (
    <button
      onClick={handleVoltar}
      className="botao-voltar"
      aria-label={texto}
      data-testid="botao-voltar"
    >
      <FaArrowLeft className="botao-voltar-icone" />
      <span>{texto}</span>
    </button>
  );
}

BotaoVoltar.propTypes = {
  destino: PropTypesImport.default.string,
  texto: PropTypesImport.default.string,
};

export default BotaoVoltar;
