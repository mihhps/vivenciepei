import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, matchPath } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import TelaInicial from "./pages/TelaInicial";
import PainelGestao from "./pages/PainelGestao";
import PainelProfessor from "./pages/PainelProfessor";
import CadastroAluno from "./pages/CadastroAluno";
import CriarPei from "./pages/CriarPEI";
import VerAlunos from "./pages/VerAlunos";
import VerPeis from "./pages/VerPEIs";
import AvaliacaoInicial from "./pages/AvaliacaoInicial";
import ImportarAlunos from './pages/ImportarAlunos';
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
import SelecionarEscola from "./components/SelecionarEscola";
import RecuperarSenha from "./pages/RecuperarSenha";
import VincularEscolas from "./pages/VincularEscolas";
import Acompanhamento from "./pages/Acompanhamento";
import AcompanharMetas from "./pages/AcompanharMetas";
import VincularProfessoresTurmas from "./pages/VincularProfessoresTurmas";

import * as pdfjsLib from "pdfjs-dist/build/pdf";
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const desenvolvedoraEmail = "mihhps@gmail.com";

const PERFIS = {
  GESTAO: "gestao",
  AEE: "aee",
  PROFESSOR: "professor",
  SEME: "seme"
};

const AUTORIZACAO_ROTAS = {
  "/painel-gestao": [PERFIS.GESTAO],
  "/painel-aee": [PERFIS.AEE],
  "/painel-professor": [PERFIS.PROFESSOR],
  "/cadastrar-aluno": [PERFIS.GESTAO, PERFIS.AEE],
  "/criar-pei": Object.values(PERFIS),
  "/ver-alunos": Object.values(PERFIS),
  "/ver-peis": Object.values(PERFIS),
  "/avaliacao-inicial": [PERFIS.GESTAO, PERFIS.AEE],
  "/importar-alunos": [PERFIS.GESTAO],
  "/anamnese-completa": [PERFIS.GESTAO, PERFIS.AEE],
  "/editar-pei/:id": Object.values(PERFIS),
  "/editar-aluno/:id": [PERFIS.GESTAO, PERFIS.AEE],
  "/continuar-pei/:id": Object.values(PERFIS),
  "/cadastro-usuario": [PERFIS.GESTAO],
  "/ver-avaliacoes": Object.values(PERFIS),
  "/avaliacao/:id": Object.values(PERFIS),
  "/visualizar-pei/:id": Object.values(PERFIS),
  "/editar-avaliacao/:id": [PERFIS.GESTAO, PERFIS.AEE],
  "/cadastro-professor": [PERFIS.GESTAO, PERFIS.AEE],
  "/vincular-escolas": [PERFIS.GESTAO],
};

function PrivateRoute({ children }) {
  const location = useLocation();
  const path = location.pathname;
  const userData = localStorage.getItem("usuarioLogado");
  const usuario = userData ? JSON.parse(userData) : null;

  const rotaBase = Object.keys(AUTORIZACAO_ROTAS).find((base) =>
    matchPath({ path: base, end: true }, path)
  );

  const allowedRoles = rotaBase ? AUTORIZACAO_ROTAS[rotaBase] : [];
  const isDesenvolvedora = usuario?.email === desenvolvedoraEmail;

  if (!usuario) return <Navigate to="/login" replace state={{ from: path }} />;
  if (allowedRoles.length && !allowedRoles.includes(usuario.perfil) && !isDesenvolvedora) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setAuthChecked(true);
  }, []);

  if (!authChecked) return <div className="app-loading">Verificando autenticação...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<TelaInicial />} />
        <Route path="/login" element={<Login />} />
        <Route path="/painel-gestao" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/painel-aee" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/painel-professor" element={<PrivateRoute><PainelProfessor /></PrivateRoute>} />
        <Route path="/cadastrar-aluno" element={<PrivateRoute><CadastroAluno /></PrivateRoute>} />
        <Route path="/criar-pei" element={<PrivateRoute><CriarPei /></PrivateRoute>} />
        <Route path="/ver-alunos" element={<PrivateRoute><VerAlunos /></PrivateRoute>} />
        <Route path="/ver-peis" element={<PrivateRoute><VerPeis /></PrivateRoute>} />
        <Route path="/avaliacao-inicial" element={<PrivateRoute><AvaliacaoInicial /></PrivateRoute>} />
        <Route path="/importar-alunos" element={<ImportarAlunos />} />
        <Route path="/anamnese-completa" element={<PrivateRoute><AnamneseCompleta /></PrivateRoute>} />
        <Route path="/editar-pei/:id" element={<PrivateRoute><EditarPei /></PrivateRoute>} />
        <Route path="/editar-aluno/:id" element={<PrivateRoute><EditarAluno /></PrivateRoute>} />
        <Route path="/continuar-pei/:id" element={<PrivateRoute><ContinuarPei /></PrivateRoute>} />
        <Route path="/ver-avaliacoes" element={<PrivateRoute><VerAvaliacoes /></PrivateRoute>} />
        <Route path="/avaliacao/:id" element={<PrivateRoute><VerAvaliacao /></PrivateRoute>} />
        <Route path="/visualizar-pei/:id" element={<PrivateRoute><VisualizarPei /></PrivateRoute>} />
        <Route path="/editar-avaliacao/:id" element={<EditarAvaliacao />} />
        <Route path="/cadastro-professor" element={<CadastrarProfessor />} />
        <Route path="/selecionar-escola" element={<PrivateRoute><SelecionarEscola /></PrivateRoute>} />
        <Route path="/cadastro-usuario" element={<PrivateRoute><CadastrarUsuario /></PrivateRoute>} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/vincular-escolas" element={<PrivateRoute><VincularEscolas /></PrivateRoute>} />
        <Route path="/acompanhamento" element={<PrivateRoute><Acompanhamento /></PrivateRoute>} />
        <Route path="/vincular-professores" element={<VincularProfessoresTurmas />} />
        <Route path="/acompanhamento/:id" element={<AcompanharMetas />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}