import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Páginas principais
import Home from "./pages/Home";
import Login from "./pages/Login";
import PainelProfessor from "./pages/PainelProfessor"; // Se você tiver um painel exclusivo para professor

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

export default function App() {
  return (
    <Router>
      <Routes>

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Painéis por perfil */}
        <Route path="/" element={<Home />} /> {/* Gestão e AEE */}
        <Route path="/painel-gestao" element={<Home />} />
        <Route path="/painel-aee" element={<Home />} />
        <Route path="/painel-professor" element={<PainelProfessor />} />

        {/* Funcionalidades */}
        <Route path="/cadastrar-aluno" element={<CadastroAluno />} />
        <Route path="/criar-pei" element={<CriarPei />} />
        <Route path="/ver-alunos" element={<VerAlunos />} />
        <Route path="/ver-peis" element={<VerPeis />} />
        <Route path="/avaliacao-inicial" element={<AvaliacaoInicial />} />
        <Route path="/importar-alunos" element={<ImportarAlunos />} />
        <Route path="/anamnese-completa" element={<AnamneseCompleta />} />
        <Route path="/editar-pei/:id" element={<EditarPei />} />
        <Route path="/editar-aluno/:id" element={<EditarAluno />} />
        <Route path="/continuar-pei/:id" element={<ContinuarPei />} />
        <Route path="/cadastro-usuario" element={<CadastrarUsuario />} />
        <Route path="/ver-avaliacoes" element={<VerAvaliacoes />} />
        <Route path="/avaliacao/:aluno" element={<VerAvaliacao />} />

      </Routes>
    </Router>
  );
}