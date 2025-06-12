// src/config/routesConfig.js

import { PERFIS } from "./constants";

// ========== E-MAIL DESENVOLVEDORA ==========
export const desenvolvedoraEmail = "mihhps@gmail.com";

// ========== ROTAS PÓS-LOGIN POR PERFIL ==========
export const perfilRedirectMap = {
  [PERFIS.DESENVOLVEDOR]: "/painel-dev",
  [PERFIS.GESTAO]: "/painel-gestao",
  [PERFIS.AEE]: "/painel-aee",
  [PERFIS.PROFESSOR]: "/painel-professor",
  [PERFIS.SEME]: "/acompanhamento",
  [PERFIS.DIRETOR]: "/painel-gestao",
  [PERFIS.DIRETOR_ADJUNTO]: "/painel-gestao",
  [PERFIS.ORIENTADOR_PEDAGOGICO]: "/painel-gestao",
};

// ========== GRUPOS DE PERMISSÃO ==========

const ADMINISTRADORES = [PERFIS.GESTAO, PERFIS.AEE, PERFIS.DESENVOLVEDOR];

const GESTORES_PEDAGOGICOS = [
  PERFIS.GESTAO,
  PERFIS.AEE,
  PERFIS.SEME,
  PERFIS.DESENVOLVEDOR,
];

const TODOS = [
  PERFIS.GESTAO,
  PERFIS.AEE,
  PERFIS.PROFESSOR,
  PERFIS.SEME,
  PERFIS.DESENVOLVEDOR,
  PERFIS.DIRETOR,
  PERFIS.DIRETOR_ADJUNTO,
  PERFIS.ORIENTADOR_PEDAGOGICO,
];

// ========== PERMISSÕES POR ROTA ==========

export const AUTORIZACAO_ROTAS = {
  // --- Painéis ---
  "/painel-dev": [PERFIS.DESENVOLVEDOR],
  "/painel-aee": [PERFIS.AEE, PERFIS.GESTAO, PERFIS.DESENVOLVEDOR],

  // --- Admin: Cadastros e Vinculações ---
  "/cadastrar-aluno": ADMINISTRADORES,
  "/cadastro-usuario": ADMINISTRADORES,
  "/editar-aluno/:id": ADMINISTRADORES,
  "/vincular-turmas": ADMINISTRADORES,
  "/vincular-professores": ADMINISTRADORES,
  "/vincular-escolas": ADMINISTRADORES,
  "/importar-alunos": ADMINISTRADORES,

  // --- Gestão e Prazos ---
  "/gestao-prazos-pei": GESTORES_PEDAGOGICOS,
  "/acompanhamento-pei/:professorId": GESTORES_PEDAGOGICOS,
  "/acompanhamento": [PERFIS.SEME, PERFIS.DESENVOLVEDOR],

  // --- Visualizações gerais ---
  "/ver-alunos": TODOS,
  "/ver-peis": TODOS,
  "/ver-avaliacoes": TODOS,
  "/acompanhamento-prazos-pei": TODOS,
  "/selecionar-escola": TODOS,
  "/prazos-professor": TODOS,
  "/visualizar-pei/:id": TODOS,
  "/avaliacao/:id": TODOS,

  // --- Avaliação Inicial & Anamnese ---
  "/avaliacao-inicial": TODOS,
  "/editar-avaliacao/:id": TODOS,
  "/anamnese-completa": TODOS,

  // --- PEI: Criação, edição, acompanhamento ---
  "/criar-pei": [
    PERFIS.GESTAO,
    PERFIS.AEE,
    PERFIS.PROFESSOR,
    PERFIS.DESENVOLVEDOR,
  ],
  "/editar-pei/:id": [
    PERFIS.GESTAO,
    PERFIS.AEE,
    PERFIS.PROFESSOR,
    PERFIS.DESENVOLVEDOR,
  ],
  "/continuar-pei/:id": [
    PERFIS.GESTAO,
    PERFIS.AEE,
    PERFIS.PROFESSOR,
    PERFIS.DESENVOLVEDOR,
  ],
  "/acompanhar-metas/:id": [
    PERFIS.GESTAO,
    PERFIS.AEE,
    PERFIS.PROFESSOR,
    PERFIS.DESENVOLVEDOR,
  ],
  "/meu-acompanhamento-pei": [PERFIS.PROFESSOR, PERFIS.DESENVOLVEDOR],
};
