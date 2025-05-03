import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Páginas principais
import Home from "./pages/Home";
import Login from "./pages/Login";
import PainelProfessor from "./pages/PainelProfessor";

// Funcionalidades
import CadastroAluno from "./pages/CadastroAluno";
import CriarPei from "./pages/CriarPEI";
import VerAlunos from "./pages/VerAlunos";
import VerPeis from "./pages/VerPEIs";
import AvaliacaoInicial from "./pages/AvaliacaoInicial";
import ImportarAlunos from "./pages/ImportarAlunos";
import AnamneseCompleta from "./pages/AnamneseCompleta";
import EditarPei from "./pages/EditarPei";
import EditarAluno from "./pages/EditarAluno";
import ContinuarPei from "./pages/ContinuarPei";
import CadastrarUsuario from "./pages/CadastrarUsuario";
import VerAvaliacoes from "./pages/VerAvaliacoes";
import VerAvaliacao from "./pages/VerAvaliacao";
import VisualizarPei from "./pages/VisualizarPei";
import CadastrarProfessor from "./pages/CadastrarProfessor";
import EditarAvaliacao from "./pages/EditarAvaliacao";
import TelaInicial from "./pages/TelaInicial";

export default function App() {
  // Proteção contra localStorage mal formatado
  let usuarioLogado = null;
  try {
    const dados = localStorage.getItem("usuarioLogado");
    usuarioLogado = dados ? JSON.parse(dados) : null;
  } catch (e) {
    usuarioLogado = null;
  }

  // Proteção de rota com verificação de perfil
  const RotaPrivada = ({ children, permitido }) => {
    if (!usuarioLogado) return <Navigate to="/login" />;
    if (permitido && !permitido.includes(usuarioLogado.perfil)) {
      return <Navigate to="/" />;
    }
    return children;
  };

  return (
    <Router>
      <Routes>

        {/* Tela institucional de entrada */}
        <Route path="/" element={<TelaInicial />} />

        {/* Tela de login */}
        <Route path="/login" element={<Login />} />

        {/* Painéis por perfil */}
        <Route path="/painel-gestao" element={
          <RotaPrivada permitido={["gestao"]}>
            <Home />
          </RotaPrivada>} 
        />
        <Route path="/painel-aee" element={
          <RotaPrivada permitido={["aee"]}>
            <Home />
          </RotaPrivada>} 
        />
        <Route path="/painel-professor" element={
          <RotaPrivada permitido={["professor"]}>
            <PainelProfessor />
          </RotaPrivada>} 
        />

        {/* Funcionalidades protegidas */}
        <Route path="/cadastrar-aluno" element={<RotaPrivada><CadastroAluno /></RotaPrivada>} />
        <Route path="/criar-pei" element={<RotaPrivada><CriarPei /></RotaPrivada>} />
        <Route path="/ver-alunos" element={<RotaPrivada><VerAlunos /></RotaPrivada>} />
        <Route path="/ver-peis" element={<RotaPrivada><VerPeis /></RotaPrivada>} />
        <Route path="/avaliacao-inicial" element={<RotaPrivada><AvaliacaoInicial /></RotaPrivada>} />
        <Route path="/importar-alunos" element={<RotaPrivada><ImportarAlunos /></RotaPrivada>} />
        <Route path="/anamnese-completa" element={<RotaPrivada><AnamneseCompleta /></RotaPrivada>} />
        <Route path="/editar-pei/:id" element={<RotaPrivada><EditarPei /></RotaPrivada>} />
        <Route path="/editar-aluno/:id" element={<RotaPrivada><EditarAluno /></RotaPrivada>} />
        <Route path="/continuar-pei/:id" element={<RotaPrivada><ContinuarPei /></RotaPrivada>} />
        <Route path="/ver-avaliacoes" element={<RotaPrivada><VerAvaliacoes /></RotaPrivada>} />
        <Route path="/avaliacao/:aluno" element={<RotaPrivada><VerAvaliacao /></RotaPrivada>} />
        <Route path="/visualizar-pei" element={<VisualizarPei />} />
        <Route path="/cadastro-professor" element={<CadastrarProfessor />} />
        <Route path="/editar-avaliacao/:aluno" element={<EditarAvaliacao />} />

        {/* Apenas para gestão */}
        <Route path="/cadastro-usuario" element={
          <RotaPrivada permitido={["gestao"]}>
            <CadastrarUsuario />
          </RotaPrivada>} 
        />

        {/* Rota fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}