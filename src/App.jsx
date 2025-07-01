import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// Componentes principais
import Login from "./pages/Login";
import TelaInicial from "./pages/TelaInicial";
import CadastrarProfessor from "./pages/CadastrarProfessor";
import RecuperarSenha from "./pages/RecuperarSenha";
import EscolaAtual from "./components/EscolaAtual";
import PrivateRoute from "./components/PrivateRoute";

// Lazy-loaded Pages
const PainelGestao = lazy(() => import("./pages/PainelGestao"));
const PainelAee = lazy(() => import("./pages/PainelAEE"));
const PainelProfessor = lazy(() => import("./pages/PainelProfessor"));
const PainelDev = lazy(() => import("./pages/PainelDev"));
const CadastroAluno = lazy(() => import("./pages/CadastroAluno"));
const CriarPei = lazy(() => import("./pages/CriarPEI"));
const VerAlunos = lazy(() => import("./pages/VerAlunos"));
const VerPeis = lazy(() => import("./pages/VerPEIs"));
const AvaliacaoInicial = lazy(() => import("./pages/AvaliacaoInicial"));
const ImportarAlunos = lazy(() => import("./pages/ImportarAlunos"));
const AnamneseCompleta = lazy(() => import("./pages/AnamneseCompleta"));
const EditarPei = lazy(() => import("./pages/EditarPei"));
// CORRIGIDO AQUI: Aponta para o arquivo .jsx com a capitalização correta
const EditarAluno = lazy(() => import("./pages/editaraluno.jsx"));
const ContinuarPei = lazy(() => import("./pages/ContinuarPei"));
const CadastrarUsuario = lazy(() => import("./pages/CadastrarUsuario"));
const VerAvaliacoes = lazy(() => import("./pages/VerAvaliacoes"));
const VerAvaliacao = lazy(() => import("./pages/VerAvaliacao"));
const VisualizarPei = lazy(() => import("./pages/VisualizarPei"));
const EditarAvaliacao = lazy(() => import("./pages/EditarAvaliacao"));
const SelecionarEscola = lazy(() => import("./components/SelecionarEscola"));
const VincularEscolas = lazy(() => import("./pages/VincularEscolas"));
const AcompanharMetas = lazy(() => import("./pages/AcompanharMetas"));
const AcompanhamentoSEME = lazy(() => import("./pages/AcompanhamentoSEME"));
const VincularProfessoresTurmas = lazy(
  () => import("./pages/VincularProfessoresTurmas")
);
const AcompanhamentoPrazosPei = lazy(
  () => import("./pages/AcompanhamentoPrazosPei")
);
const DetalhesAcompanhamentoPei = lazy(
  () => import("./pages/DetalhesAcompanhamentoPei")
);
const GestaoPrazosPEI = lazy(() => import("./pages/GestaoPrazosPEI"));
const VisualizacaoPrazosPEIProfessor = lazy(
  () => import("./pages/VisualizacaoPrazosPEIProfessor")
);
const MeuAcompanhamentoProfessor = lazy(
  () => import("./pages/MeuAcompanhamentoProfessor")
);

// NOVO: Importe o componente CadastroTurma
const CadastroTurma = lazy(() => import("./pages/CadastroTurma")); // Certifique-se de que o caminho está correto!

// PDF.js Worker para importação de PDFs
import * as pdfjsLib from "pdfjs-dist/build/pdf";
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Exibe o nome da escola atual, se o usuário estiver logado */}
        {localStorage.getItem("usuarioLogado") && <EscolaAtual />}

        <Suspense fallback={<div className="app-loading">Carregando...</div>}>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/" element={<TelaInicial />} />
            <Route path="/login" element={<Login />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route
              path="/cadastro-professor"
              element={<CadastrarProfessor />}
            />

            {/* Rotas Protegidas */}
            <Route element={<PrivateRoute />}>
              {/* Painéis */}
              <Route path="/painel-gestao" element={<PainelGestao />} />
              <Route path="/painel-aee" element={<PainelAee />} />
              <Route path="/painel-professor" element={<PainelProfessor />} />
              <Route path="/painel-dev" element={<PainelDev />} />

              {/* Cadastros e Gestão */}
              <Route path="/cadastrar-aluno" element={<CadastroAluno />} />
              <Route path="/editar-aluno/:id" element={<EditarAluno />} />
              <Route path="/cadastro-usuario" element={<CadastrarUsuario />} />
              <Route path="/importar-alunos" element={<ImportarAlunos />} />
              <Route path="/selecionar-escola" element={<SelecionarEscola />} />
              <Route path="/vincular-escolas" element={<VincularEscolas />} />
              <Route
                path="/vincular-professores"
                element={<VincularProfessoresTurmas />}
              />
              {/* NOVO: Rota para Cadastro de Turma */}
              <Route path="/cadastro-turmas" element={<CadastroTurma />} />

              {/* Avaliações */}
              <Route path="/ver-alunos" element={<VerAlunos />} />
              <Route path="/avaliacao-inicial" element={<AvaliacaoInicial />} />
              <Route path="/anamnese-completa" element={<AnamneseCompleta />} />
              <Route path="/ver-avaliacoes" element={<VerAvaliacoes />} />
              <Route path="/avaliacao/:id" element={<VerAvaliacao />} />
              <Route
                path="/editar-avaliacao/:id"
                element={<EditarAvaliacao />}
              />

              {/* PEI */}
              <Route path="/criar-pei" element={<CriarPei />} />
              <Route path="/ver-peis" element={<VerPeis />} />
              <Route path="/editar-pei/:id" element={<EditarPei />} />
              <Route path="/continuar-pei/:id" element={<ContinuarPei />} />
              <Route path="/visualizar-pei/:id" element={<VisualizarPei />} />
              <Route
                path="/acompanhar-metas/:id"
                element={<AcompanharMetas />}
              />

              {/* Acompanhamento e Prazos */}
              <Route path="/acompanhamento" element={<AcompanhamentoSEME />} />
              <Route
                path="/acompanhamento-pei/:professorId"
                element={<DetalhesAcompanhamentoPei />}
              />
              <Route path="/gestao-prazos-pei" element={<GestaoPrazosPEI />} />
              <Route
                path="/prazos-professor"
                element={<VisualizacaoPrazosPEIProfessor />}
              />
              <Route
                path="/acompanhamento-prazos-pei"
                element={<AcompanhamentoPrazosPei />}
              />
              <Route
                path="/meu-acompanhamento-pei"
                element={<MeuAcompanhamentoProfessor />}
              />
            </Route>

            {/* Rota Coringa */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
