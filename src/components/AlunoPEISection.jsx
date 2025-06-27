// src/components/AlunoPEISection.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/VerPEIs.module.css";
import { calcularIdadeEFaixa, formatarDataSegura } from "../utils/dataUtils";

export default function AlunoPEISection({
  aluno,
  peis,
  avaliacoesIniciais,
  usuarioLogadoHook,
  handleGerarPDF,
  excluirPei,
}) {
  const navigate = useNavigate();
  console.log("--> Aluno recebido em AlunoPEISection:", aluno);
  console.log("--> aluno.nascimento recebido:", aluno?.nascimento);
  const [idade, faixa] = aluno
    ? calcularIdadeEFaixa(aluno.nascimento)
    : ["-", "-"];

  return (
    <div className={styles.conteudoAba}>
      <div className={styles.infoAluno}>
        <p>
          <strong>Idade:</strong> {idade} anos ({faixa})
        </p>
        {aluno?.turma && (
          <p>
            <strong>Turma:</strong> {aluno.turma}
          </p>
        )}
      </div>

      {peis.length === 0 ? (
        <p className={styles.semDados}>
          Nenhum PEI registrado para este aluno.
          {usuarioLogadoHook?.perfil === "professor" &&
            " (Você só pode ver PEIs de alunos de suas turmas ou que você criou.)"}
        </p>
      ) : (
        peis.map((pei) => (
          <div key={pei.id} className={styles.cardInterno}>
            <div className={styles.infoPei}>
              <p>
                <strong>Turma no PEI:</strong> {pei.turma}
              </p>
              <p>
                <strong>Data da Avaliação Inicial:</strong>{" "}
                {formatarDataSegura(avaliacoesIniciais[pei.alunoId]?.inicio)}
              </p>
              <p>
                <strong>Próxima Avaliação:</strong>{" "}
                {formatarDataSegura(
                  avaliacoesIniciais[pei.alunoId]?.proximaAvaliacao
                )}
              </p>

              {/* Exibir o nome do Último Editor como o principal responsável */}
              {pei.nomeUltimoEditor ? (
                <p>
                  <strong>Responsável:</strong> {pei.nomeUltimoEditor} (
                  {pei.cargoUltimoEditor || "N/A"})
                </p>
              ) : pei.nomeCriador ? (
                // Fallback para PEIs antigos que não têm nomeUltimoEditor, mas têm nomeCriador
                <p>
                  <strong>Responsável (original):</strong> {pei.nomeCriador}
                </p>
              ) : (
                <p>
                  <strong>Responsável:</strong> N/A
                </p>
              )}
              {/* As linhas sobre "Última atualização" e "Criado originalmente por" foram removidas aqui. */}
            </div>
            <div className={styles.botoes}>
              <button
                className={styles.editar}
                onClick={() => navigate(`/editar-pei/${pei.id}`)}
              >
                Editar
              </button>

              <button
                className={styles.visualizar}
                onClick={() => {
                  const avaliacaoDoAluno = avaliacoesIniciais[aluno.id];
                  navigate(`/visualizar-pei/${pei.id}`, {
                    state: {
                      pei: pei,
                      aluno: aluno,
                      avaliacao: avaliacaoDoAluno,
                      // ADICIONANDO A INFORMAÇÃO DO CRIADOR ESPECÍFICO
                      criadorIdDoPeiEspecifico: pei.criadorId,
                    },
                  });
                }}
              >
                Visualizar
              </button>
              <button
                className="botao-secundario"
                onClick={() => navigate(`/acompanhar-metas/${pei.id}`)}
              >
                Acompanhar Metas
              </button>
              {(usuarioLogadoHook?.uid === pei.criadorId ||
                usuarioLogadoHook?.perfil === "seme" ||
                usuarioLogadoHook?.perfil === "desenvolvedor" ||
                ([
                  "gestao",
                  "aee",
                  "diretor",
                  "diretor adjunto",
                  "orientador pedagógico",
                ].includes(usuarioLogadoHook?.perfil) &&
                  usuarioLogadoHook?.escolaId === pei.escolaId)) && (
                <button
                  className={styles.excluir}
                  onClick={() => excluirPei(pei)}
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        ))
      )}
      {aluno && peis.length > 0 && (
        <button
          className={styles.gerar}
          onClick={() => handleGerarPDF(aluno, peis)}
        >
          Gerar PDF Consolidado
        </button>
      )}
    </div>
  );
}
