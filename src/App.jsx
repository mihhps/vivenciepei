import React, { Suspense, lazy, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
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

// --- PÁGINAS COM LAZY-LOADING (COMPLETO) ---
const AcompanhamentoAEE = lazy(() => import("./pages/AcompanhamentoAEE.jsx"));
const AcompanhamentoGestao = lazy(() =>
  import("./pages/AcompanhamentoGestao.jsx")
);
const AcompanhamentoPrazosPei = lazy(() =>
  import("./pages/AcompanhamentoPrazosPei.jsx")
);
const AcompanhamentoSEME = lazy(() => import("./pages/AcompanhamentoSEME.jsx"));
const AcompanharMetas = lazy(() => import("./pages/AcompanharMetas.jsx"));
const AnamneseCompleta = lazy(() => import("./pages/AnamneseCompleta.jsx"));
const AvaliacaoInicial = lazy(() => import("./pages/AvaliacaoInicial.jsx"));
const AvaliacaoInicial0a3Page = lazy(() =>
  import("./pages/AvaliacaoInicial0a3Page.jsx")
);
const AvaliacaoInteressesPage = lazy(() =>
  import("./pages/AvaliacaoInteressesPage.jsx")
);
const CadastroAluno = lazy(() => import("./pages/CadastroAluno.jsx"));
const CadastroTurma = lazy(() => import("./pages/CadastroTurma.jsx"));
const CadastrarUsuario = lazy(() => import("./pages/CadastrarUsuario.jsx"));
const ContinuarPei = lazy(() => import("./pages/ContinuarPei.jsx"));
const CriarPei = lazy(() => import("./pages/CriarPEI.jsx"));
const CriarPEI0a3 = lazy(() => import("./pages/CriarPEI0A3.jsx"));
const DetalhesAcompanhamentoPei = lazy(() =>
  import("./pages/DetalhesAcompanhamentoPei.jsx")
);
const EditarAluno = lazy(() => import("./pages/EditarAluno.jsx"));
const EditarAvaliacao = lazy(() => import("./pages/EditarAvaliacao.jsx"));
const EditarPei = lazy(() => import("./pages/EditarPei.jsx"));
const GestaoPrazosPEI = lazy(() => import("./pages/GestaoPrazosPEI.jsx"));
const ImportarAlunos = lazy(() => import("./pages/ImportarAlunos.jsx"));
const MeuAcompanhamentoProfessor = lazy(() =>
  import("./pages/MeuAcompanhamentoProfessor.jsx")
);
const ObservacoesAluno = lazy(() => import("./pages/ObservacoesAluno.jsx"));
const PainelAee = lazy(() => import("./pages/PainelAEE.jsx"));
const PainelDev = lazy(() => import("./pages/PainelDev.jsx"));
const PainelGestao = lazy(() => import("./pages/PainelGestao.jsx"));
const PainelProfessor = lazy(() => import("./pages/PainelProfessor.jsx"));
const PainelSeme = lazy(() => import("./pages/PainelSEME.jsx"));
const Reavaliacao = lazy(() => import("./pages/Reavaliacao.jsx"));
const RelatoriosPage = lazy(() => import("./pages/RelatoriosPage.jsx"));
const SelecaoAlunoAEE = lazy(() => import("./pages/SelecaoAlunoAEE.jsx"));
const SelecaoAlunoGestao = lazy(() => import("./pages/SelecaoAlunoGestao.jsx"));
const SelecionarAlunoParaInteresses = lazy(() =>
  import("./pages/SelecionarAlunoParaInteresses.jsx")
);
const SelecionarEscola = lazy(() =>
  import("./components/SelecionarEscola.jsx")
);
const VerAlunos = lazy(() => import("./pages/VerAlunos.jsx"));
const VerAnamneses = lazy(() => import("./pages/VerAnamneses.jsx"));
const VerAvaliacao = lazy(() => import("./pages/VerAvaliacao.jsx"));
const VerAvaliacoes = lazy(() => import("./pages/VerAvaliacoes.jsx"));
const VerPeis = lazy(() => import("./pages/VerPEIs.jsx"));
const VincularEscolas = lazy(() => import("./pages/VincularEscolas.jsx"));
const VincularProfessoresTurmas = lazy(() =>
  import("./pages/VincularProfessoresTurmas.jsx")
);
const VisualizacaoPrazosPEIProfessor = lazy(() =>
  import("./pages/VisualizacaoPrazosPEIProfessor.jsx")
);
const VisualizarAnamnese = lazy(() => import("./pages/VisualizarAnamnese.jsx"));
const VisualizarAvaliacaoInteressesPage = lazy(() =>
  import("./pages/VisualizarAvaliacaoInteressesPage.jsx")
);
const VisualizarPei = lazy(() => import("./pages/VisualizarPei.jsx"));
const GerenciadorConvites = lazy(() =>
  import("./pages/GerenciadorConvites.jsx")
);

// 💡 NOVAS ROTAS DUA (Lazy Loading)
const CriarPlanoAulaDUA = lazy(() => import("./pages/CriarPlanoAulaDUA.jsx"));
const VerPlanosAulaDUA = lazy(() => import("./pages/VerPlanosAulaDUA.jsx"));
const VisualizarPlanoDUA = lazy(() => import("./pages/VisualizarPlanoDUA.jsx"));
const EditarPlanoDUA = lazy(() => import("./pages/EditarPlanoDUA.jsx"));

// 🚀 NOVAS ROTAS DE ADAPTAÇÃO (Lazy Loading)
const EstudioAdaptacaoConteudo = lazy(() =>
  import("./pages/EstudioAdaptacaoConteudo.jsx")
);
const SelecionarAlunoAdaptacao = lazy(() =>
  import("./pages/SelecionarAlunoAdaptacao.jsx")
);

// Configuração do PDF.js Worker
import * as pdfjsLib from "pdfjs-dist/build/pdf";
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {deveMostrarEscola && <EscolaAtual />}
      <div style={{ flexGrow: 1, overflowY: "auto" }}>
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
              <Route path="/painel-gestao" element={<PainelGestao />} />
              <Route path="/painel-seme" element={<PainelSeme />} />
              <Route path="/painel-aee" element={<PainelAee />} />
              <Route path="/painel-professor" element={<PainelProfessor />} />
              <Route path="/painel-dev" element={<PainelDev />} />
              {/* Rota para o Gerenciador de Convites */}
              <Route path="/admin/convites" element={<GerenciadorConvites />} />

              {/* 💡 ROTAS DUA - COMPLETAS (CRUD) */}
              <Route path="/criar-plano-dua" element={<CriarPlanoAulaDUA />} />
              <Route path="/ver-planos-aula" element={<VerPlanosAulaDUA />} />
              <Route
                path="/visualizar-plano-dua/:id"
                element={<VisualizarPlanoDUA />}
              />
              <Route
                path="/editar-plano-dua/:id"
                element={<EditarPlanoDUA />}
              />

              {/* 🚀 NOVAS ROTAS DO ESTÚDIO DE ADAPTAÇÃO INTELIGENTE (EAI) (CORRETO) */}
              <Route
                path="/selecionar-aluno-adaptacao"
                element={<SelecionarAlunoAdaptacao />}
              />
              <Route
                path="/adaptar/:alunoId"
                element={<EstudioAdaptacaoConteudo />}
              />

              {/* --- ROTAS DE CADASTRO E GESTÃO --- */}
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
              <Route path="/ver-alunos" element={<VerAlunos />} />

              {/* --- ROTAS DE AVALIAÇÃO --- */}
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
              <Route
                path="/nova-avaliacao-0a3/:alunoId"
                element={<AvaliacaoInicial0a3Page />}
              />
              <Route
                path="/nova-avaliacao-0a3"
                element={<AvaliacaoInicial0a3Page />}
              />
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

              {/* --- ROTAS DE PEI E ACOMPANHAMENTO --- */}
              <Route path="/criar-pei-0a3" element={<CriarPEI0a3 />} />
              <Route path="/criar-pei-0a3/:alunoId" element={<CriarPEI0a3 />} />
              <Route path="/criar-pei" element={<CriarPei />} />
              <Route path="/ver-peis" element={<VerPeis />} />

              {/* Rota de Edição original (mantida) */}
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
              <Route path="/acompanhamento" element={<AcompanhamentoSEME />} />
              <Route
                path="/acompanhamento-aee-selecao"
                element={<SelecaoAlunoAEE />}
              />
              <Route
                path="/acompanhamento-aee/:alunoId"
                element={<AcompanhamentoAEE />}
              />
              <Route
                path="/acompanhamento-gestao-selecao"
                element={<SelecaoAlunoGestao />}
              />
              <Route
                path="/acompanhamento-gestao/:alunoId"
                element={<AcompanhamentoGestao />}
              />
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

            <Route path="*" element={<div>Página não encontrada</div>} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
