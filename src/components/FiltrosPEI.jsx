import React from "react";
import styles from "../styles/VerPEIs.module.css";

const PEI_STATUS = {
  TODOS: "todos",
  COMPLETO: "completo",
  INCOMPLETO: "incompleto",
  ATUALIZADO: "atualizado",
  VENCIDO: "vencido",
};

const FiltrosPEI = ({
  filtros,
  turmasDisponiveis,
  usuariosParaFiltro,
  perfilUsuario,
  onChange,
}) => {
  const perfisComFiltroProfessor = [
    "gestao",
    "aee",
    "diretor",
    "diretor adjunto",
    "orientador pedagógico",
    "seme",
    "desenvolvedor",
  ];

  return (
    <div className={styles.filtrosContainer}>
      {/* Filtro por Turma */}
      <div className={styles.filtroGrupo}>
        <label htmlFor="filtroTurma">Turma:</label>
        <select
          id="filtroTurma"
          value={filtros.turma}
          onChange={(e) => onChange({ turma: e.target.value })}
        >
          <option value="">Todas</option>
          {turmasDisponiveis.map((turma) => (
            <option key={turma} value={turma}>
              {turma}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro por Status */}
      <div className={styles.filtroGrupo}>
        <label htmlFor="filtroStatus">Status PEI:</label>
        <select
          id="filtroStatus"
          value={filtros.status}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          <option value={PEI_STATUS.TODOS}>Todos</option>
          <option value={PEI_STATUS.COMPLETO}>Completo</option>
          <option value={PEI_STATUS.INCOMPLETO}>Incompleto</option>
          <option value={PEI_STATUS.ATUALIZADO}>Atualizado</option>
          <option value={PEI_STATUS.VENCIDO}>Vencido</option>
        </select>
      </div>

      {/* Filtro por Professor (apenas para perfis específicos) */}
      {perfisComFiltroProfessor.includes(perfilUsuario) && (
        <div className={styles.filtroGrupo}>
          <label htmlFor="filtroUsuario">Professor:</label>
          <select
            id="filtroUsuario"
            value={filtros.usuario}
            onChange={(e) => onChange({ usuario: e.target.value })}
          >
            <option value="">Todos</option>
            {usuariosParaFiltro.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Campo de Busca */}
      <div className={styles.filtroGrupo}>
        <label htmlFor="filtroBusca">Buscar:</label>
        <input
          id="filtroBusca"
          type="text"
          value={filtros.busca}
          onChange={(e) => onChange({ busca: e.target.value })}
          placeholder="Nome ou turma..."
        />
      </div>
    </div>
  );
};

export default FiltrosPEI;
