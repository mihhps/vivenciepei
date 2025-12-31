import { PERFIS } from "./constants";

// ========== E-MAIL DESENVOLVEDORA ==========
export const desenvolvedoraEmail = "mihhps@gmail.com";

// ========== ROTAS PÓS-LOGIN POR PERFIL ==========
export const perfilRedirectMap = {
  [PERFIS.DESENVOLVEDOR]: "/painel-dev",
  [PERFIS.GESTAO]: "/painel-gestao",
  [PERFIS.AEE]: "/painel-aee",
  [PERFIS.PROFESSOR]: "/painel-professor",
  [PERFIS.SEME]: "/painel-seme",
  [PERFIS.DIRETOR]: "/painel-gestao",
  [PERFIS.DIRETOR_ADJUNTO]: "/painel-gestao",
  [PERFIS.ORIENTADOR_PEDAGOGICO]: "/painel-gestao",
};

// ========== GRUPOS DE PERMISSÃO ==========

const ADMINISTRADORES = [
  PERFIS.GESTAO,
  PERFIS.AEE,
  PERFIS.DESENVOLVEDOR,
  PERFIS.DIRETOR,
  PERFIS.DIRETOR_ADJUNTO,
  PERFIS.ORIENTADOR_PEDAGOGICO,
  PERFIS.SEME,
];

const GESTORES_PEDAGOGICOS = [
  PERFIS.GESTAO,
  PERFIS.AEE,
  PERFIS.SEME,
  PERFIS.DESENVOLVEDOR,
  PERFIS.DIRETOR,
  PERFIS.DIRETOR_ADJUNTO,
  PERFIS.ORIENTADOR_PEDAGOGICO,
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

  // 🔥🔥🔥 ADICIONE ESTA LINHA AQUI ABAIXO 🔥🔥🔥
  "/painel-professor": [PERFIS.PROFESSOR, PERFIS.DESENVOLVEDOR],

  "/painel-gestao": [
    PERFIS.GESTAO,
    PERFIS.DIRETOR,
    PERFIS.DIRETOR_ADJUNTO,
    PERFIS.ORIENTADOR_PEDAGOGICO,
    PERFIS.SEME,
  ],
  "/painel-aee": [PERFIS.AEE, PERFIS.GESTAO, PERFIS.DESENVOLVEDOR],
  "/painel-seme": GESTORES_PEDAGOGICOS,

  // --- Rotas de Planos de Aula DUA ---
  "/criar-plano-dua": TODOS,
  "/visualizar-plano-dua/:id": TODOS,

  // --- Admin: Cadastros e Vinculações ---
  "/cadastrar-aluno": ADMINISTRADORES,
  "/cadastro-usuario": ADMINISTRADORES,
  "/editar-aluno/:id": ADMINISTRADORES,
  "/vincular-turmas": ADMINISTRADORES,
  "/vincular-professores": ADMINISTRADORES,
  "/vincular-escolas": ADMINISTRADORES,
  "/importar-alunos": ADMINISTRADORES,

  // --- Gestão e Prazos ---
  "/gestao-prazos-pei": ADMINISTRADORES,
  "/acompanhamento-pei/:professorId": ADMINISTRADORES,
  "/acompanhamento": ADMINISTRADORES,

  // --- Visualizações gerais ---
  "/ver-alunos": TODOS,
  "/ver-peis": TODOS,
  "/ver-avaliacoes": TODOS,
  "/acompanhamento-prazos-pei": TODOS,
  "/selecionar-escola": TODOS,
  "/prazos-professor": TODOS,
  "/visualizar-pei/:id": TODOS,
  "/avaliacao/:id": TODOS,
  "/anamnese": TODOS,
  "/visualizar-anamnese/:alunoId": TODOS,

  // --- Avaliação Inicial & Anamnese ---
  "/avaliacao-inicial": TODOS,
  "/editar-avaliacao/:id": TODOS,
  "/anamnese-completa": TODOS,

  // --- PEI: Criação, edição, acompanhamento ---
  "/criar-pei": TODOS,
  "/editar-pei/:id": TODOS,
  "/continuar-pei/:id": TODOS,
  "/acompanhar-metas/:id": TODOS,
  "/meu-acompanhamento-pei": [PERFIS.PROFESSOR, PERFIS.DESENVOLVEDOR],

  // --- Rotas de Avaliação de Interesses ---
  "/selecionar-aluno-para-interesses": TODOS,
  "/nova-avaliacao/:alunoId": TODOS,
  "/visualizar-interesses": TODOS,
  "/visualizar-interesses/:alunoId": TODOS,
  "/observacoes-aluno/:peiId": TODOS,
  "/reavaliacao/:alunoId": TODOS,

  // --- ROTAS DE ADAPTAÇÃO DE CONTEÚDO ---
  "/selecionar-aluno-adaptacao": [
    PERFIS.AEE,
    PERFIS.PROFESSOR,
    PERFIS.DESENVOLVEDOR,
  ],
  "/adaptar/:alunoId": [PERFIS.AEE, PERFIS.PROFESSOR, PERFIS.DESENVOLVEDOR],

  // --- Outras rotas comuns ---
  "/perfil": TODOS,
};
