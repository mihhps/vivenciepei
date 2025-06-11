const STORAGE_KEY = "alunos";

export function listarAlunos() {
  const alunos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  return alunos;
}

export function adicionarAluno(aluno) {
  const alunos = listarAlunos();
  alunos.push(aluno);
}
