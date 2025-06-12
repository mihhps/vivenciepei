// src/components/BotaoLogout.jsx (Versão FINAL E CORRETA)
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase"; // Importar auth

function BotaoLogout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [usuario, setUsuario] = useState(null);
  const [isHandlingLogout, setIsHandlingLogout] = useState(false);

  useEffect(() => {
    console.log(
      "BOTAO_LOGOUT: useEffect disparado para rota:",
      location.pathname
    );
    const dados = localStorage.getItem("usuarioLogado");
    console.log("BOTAO_LOGOUT: Dados do localStorage no useEffect:", dados);
    if (dados) {
      setUsuario(JSON.parse(dados));
    } else {
      setUsuario(null);
    }
  }, [location.pathname]); // Dependência na rota atual

  const handleLogout = async () => {
    if (isHandlingLogout) return;

    // Adiciona uma confirmação antes de sair
    const confirmar = window.confirm("Tem certeza que deseja sair?");
    if (!confirmar) {
      console.log("BOTAO_LOGOUT: Logout cancelado pelo usuário.");
      return;
    }

    setIsHandlingLogout(true);

    console.log(
      "!!! BOTAO_LOGOUT: handleLogout() disparado por CLIQUE NO BOTÃO 'SAIR'!"
    ); // ESTE É O LOG QUE PRECISA APARECER

    try {
      if (auth && auth.currentUser) {
        await auth.signOut();
        console.log("!!! BOTAO_LOGOUT: Logout do Firebase Auth realizado.");
      } else {
        console.log(
          "!!! BOTAO_LOGOUT: Nenhum usuário autenticado no Firebase, prosseguindo com limpeza local."
        );
      }

      localStorage.removeItem("usuarioLogado");
      console.log(
        "!!! BOTAO_LOGOUT: 'usuarioLogado' removido do localStorage."
      );

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("!!! BOTAO_LOGOUT: Erro no processo de logout:", error);
      alert("Não foi possível sair. Tente novamente.");
    } finally {
      setIsHandlingLogout(false);
    }
  };

  if (!usuario) {
    console.log(
      "BOTAO_LOGOUT: Não há usuário no estado, componente não renderiza."
    );
    return null;
  }

  console.log(
    "BOTAO_LOGOUT: Renderizando botão 'Sair'. Usuário:",
    usuario.nome
  );
  return (
    <div style={estilos.container}>
      <div style={estilos.info}>
        <div>
          <strong>{usuario.nome?.split(" ")[0]}</strong>
        </div>
        <div style={estilos.cargo}>{usuario.cargo}</div>
      </div>
      <button
        onClick={handleLogout}
        style={estilos.botao}
        disabled={isHandlingLogout}
      >
        {isHandlingLogout ? "Saindo..." : "Sair"}
      </button>
    </div>
  );
}

const estilos = {
  container: {
    /* ... */
  },
  info: {
    /* ... */
  },
  cargo: {
    /* ... */
  },
  botao: {
    /* ... */
  },
};

export default BotaoLogout;
