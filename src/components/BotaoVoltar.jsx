import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

function BotaoVoltar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("usuarioLogado"));
    setUsuarioLogado(dados);
  }, [location.pathname]); // Atualiza ao mudar de rota

  if (location.pathname === "/" || location.pathname === "/painel-professor") return null;

  const voltarParaPainel = () => {
    if (!usuarioLogado) {
      navigate("/login");
    } else if (usuarioLogado.tipo === "professor") {
      navigate("/painel-professor");
    } else {
      navigate("/"); // gestão e AEE usam a rota principal
    }
  };

  return (
    <div style={{ marginBottom: "20px", textAlign: "left" }}>
      <button onClick={voltarParaPainel} style={botaoStyle}>
        ← Voltar ao Painel
      </button>
    </div>
  );
}

const botaoStyle = {
  padding: "8px 16px",
  fontSize: "14px",
  backgroundColor: "#1d3557",
  color: "#ffffff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

export default BotaoVoltar;