import React, { Suspense, lazy, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthContext, AuthProvider } from "./context/AuthContext";

// --- COMPONENTES PRINCIPAIS ---
import MarketingPage from "./pages/MarketingPage";
import Login from "./pages/Login";
import TelaInicial from "./pages/TelaInicial";
import CadastrarProfessor from "./pages/CadastrarProfessor";
import RecuperarSenha from "./pages/RecuperarSenha";
import EscolaAtual from "./components/EscolaAtual";
import PrivateRoute from "./components/PrivateRoute";
import CorrigirTurmas from "./pages/CorrigirTurmas";

// --- PÁGINAS COM LAZY-LOADING ---
const PainelSeme = lazy(() => import("./pages/PainelSEME"));
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
const EditarAluno = lazy(() => import("./pages/EditarAluno.jsx"));
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
const CadastroTurma = lazy(() => import("./pages/CadastroTurma.jsx"));
const AvaliacaoInteressesPage = lazy(
  () => import("./pages/AvaliacaoInteressesPage")
);
const SelecionarAlunoParaInteresses = lazy(
  () => import("./pages/SelecionarAlunoParaInteresses")
);
const VisualizarAvaliacaoInteressesPage = lazy(
  () => import("./pages/VisualizarAvaliacaoInteressesPage")
);
const ObservacoesAluno = lazy(() => import("./pages/ObservacoesAluno"));
const Reavaliacao = lazy(() => import("./pages/Reavaliacao"));
const AvaliacaoInicial0a3Page = lazy(
  () => import("./pages/AvaliacaoInicial0a3Page")
);
const CriarPEI0a3 = lazy(() => import("./pages/CriarPEI0A3.jsx"));
const VerAnamneses = lazy(() => import("./pages/VerAnamneses.jsx"));
const VisualizarAnamnese = lazy(() => import("./pages/VisualizarAnamnese"));
const RelatoriosPage = lazy(() => import("./pages/RelatoriosPage.jsx"));

// Configuração do PDF.js Worker
import * as pdfjsLib from "pdfjs-dist/build/pdf";
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Componente interno que gerencia a exibição do conteúdo principal e das rotas.
 * Utiliza o hook useLocation para saber a página atual.
 */
function AppContent() {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const paginasPublicas = [
    "/",
    "/inicio",
    "/login",
    "/recuperar-senha",
    "/cadastro-professor",
  ];

  const deveMostrarEscola =
    user && !paginasPublicas.includes(location.pathname);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {deveMostrarEscola && <EscolaAtual />}

      <div
        style={{
          flexGrow: 1,
          overflowY: "auto",
        }}
      >
        <Suspense fallback={<div className="app-loading">Carregando...</div>}>
          <Routes>
            {/* --- ROTAS PÚBLICAS --- */}
            <Route path="/" element={<MarketingPage />} />
            <Route path="/inicio" element={<TelaInicial />} />
            <Route path="/login" element={<Login />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route
              path="/cadastro-professor"
              element={<CadastrarProfessor />}
            />

            {/* --- ROTAS PROTEGIDAS --- */}
            <Route element={<PrivateRoute />}>
              {/* Painéis */}
              <Route path="/painel-gestao" element={<PainelGestao />} />
              <Route path="/painel-seme" element={<PainelSeme />} />
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
              <Route path="/cadastro-turmas" element={<CadastroTurma />} />
              <Route path="/corrigir-turmas" element={<CorrigirTurmas />} />
              <Route path="/relatorios-aluno" element={<RelatoriosPage />} />

              {/* Alunos, Avaliações e Anamnese */}
              <Route path="/ver-alunos" element={<VerAlunos />} />
              <Route path="/avaliacao-inicial" element={<AvaliacaoInicial />} />
              <Route path="/ver-avaliacoes" element={<VerAvaliacoes />} />
              <Route path="/avaliacao/:id" element={<VerAvaliacao />} />
              <Route
                path="/editar-avaliacao/:id"
                element={<EditarAvaliacao />}
              />
              <Route path="/anamnese-completa" element={<AnamneseCompleta />} />
              <Route path="/anamnese" element={<VerAnamneses />} />
              <Route
                path="/visualizar-anamnese/:alunoId"
                element={<VisualizarAnamnese />}
              />

              {/* Avaliação 0-3 Anos */}
              <Route
                path="/nova-avaliacao-0a3/:alunoId"
                element={<AvaliacaoInicial0a3Page />}
              />
              <Route
                path="/nova-avaliacao-0a3"
                element={<AvaliacaoInicial0a3Page />}
              />
              <Route path="/criar-pei-0a3" element={<CriarPEI0a3 />} />
              <Route path="/criar-pei-0a3/:alunoId" element={<CriarPEI0a3 />} />

              {/* Avaliação de Interesses */}
              <Route
                path="/selecionar-aluno-para-interesses"
                element={<SelecionarAlunoParaInteresses />}
              />
              <Route
                path="/nova-avaliacao/:alunoId"
                element={<AvaliacaoInteressesPage />}
              />
              <Route
                path="/visualizar-interesses"
                element={<VisualizarAvaliacaoInteressesPage />}
              />
              <Route
                path="/visualizar-interesses/:alunoId"
                element={<VisualizarAvaliacaoInteressesPage />}
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
              <Route
                path="/observacoes-aluno/:peiId"
                element={<ObservacoesAluno />}
              />
              <Route path="/reavaliacao/:alunoId" element={<Reavaliacao />} />

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

            {/* 🛑 AQUI ESTAVA O PROBLEMA: ESTA LINHA FOI REMOVIDA PARA EVITAR O LOOP */}
            {/* <Route path="*" element={<Navigate to="/" replace />} /> */}

            {/* ✅ MELHOR PRÁTICA: ADICIONE UMA ROTA PARA PÁGINAS NÃO ENCONTRADAS */}
            <Route path="*" element={<div>Página não encontrada</div>} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Componente principal da aplicação.
 * Envolve tudo com o provedor de autenticação e o roteador.
 */
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
