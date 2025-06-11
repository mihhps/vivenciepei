import { PERFIS } from "./constants";

// --- GRUPOS DE PERMISSÃO ---
const PERMISSOES_ADMIN = [PERFIS.GESTAO, PERFIS.AEE, PERFIS.DESENVOLVEDOR];

const PERMISSOES_GESTAO_PEI = [
  PERFIS.GESTAO,
  PERFIS.SEME,
  PERFIS.AEE,
  PERFIS.DESENVOLVEDOR,
];

const PERMISSOES_PEDAGOGICAS = [
  PERFIS.GESTAO,
  PERFIS.SEME,
  PERFIS.AEE,
  PERFIS.DESENVOLVEDOR,
];

const TODOS_OS_PERFIS = [
  PERFIS.GESTAO,
  PERFIS.AEE,
  PERFIS.PROFESSOR,
  PERFIS.SEME,
  PERFIS.DESENVOLVEDOR,
  PERFIS.DIRETOR,
  PERFIS.DIRETOR_ADJUNTO,
  PERFIS.ORIENTADOR_PEDAGOGICO,
];

// --- CONFIGURAÇÕES INDIVIDUAIS ---
export const desenvolvedoraEmail = "mihhps@gmail.com";

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

// --- AUTORIZAÇÃO DE ROTAS ---
export const AUTORIZACAO_ROTAS = {
  // Rotas Administrativas
  "/cadastrar-aluno": PERMISSOES_ADMIN,
  "/cadastro-usuario": PERMISSOES_ADMIN,
  "/vincular-turmas": PERMISSOES_ADMIN,
  "/vincular-professores": PERMISSOES_ADMIN,
  "/importar-alunos": PERMISSOES_ADMIN,
  "/vincular-escolas": PERMISSOES_ADMIN,
  "/editar-aluno/:id": PERMISSOES_ADMIN,
  "/painel-aee": [PERFIS.AEE, PERFIS.GESTAO, PERFIS.DESENVOLVEDOR],

  // Gestão e acompanhamento PEI
  "/gestao-prazos-pei": PERMISSOES_GESTAO_PEI,
  "/acompanhamento-pei/:professorId": PERMISSOES_PEDAGOGICAS,
  "/acompanhamento": [PERFIS.SEME, PERFIS.DESENVOLVEDOR],

  // Acesso geral (visualização, consulta)
  "/ver-alunos": TODOS_OS_PERFIS,
  "/ver-peis": TODOS_OS_PERFIS,
  "/ver-avaliacoes": TODOS_OS_PERFIS,
  "/acompanhamento-prazos-pei": TODOS_OS_PERFIS,
  "/selecionar-escola": TODOS_OS_PERFIS,
  "/prazos-professor": TODOS_OS_PERFIS,
  "/visualizar-pei/:id": TODOS_OS_PERFIS,
  "/avaliacao/:id": TODOS_OS_PERFIS,

  // Avaliação e anamnese
  "/avaliacao-inicial": TODOS_OS_PERFIS,
  "/editar-avaliacao/:id": TODOS_OS_PERFIS,
  "/anamnese-completa": TODOS_OS_PERFIS,

  // PEI - criação, edição e acompanhamento
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
