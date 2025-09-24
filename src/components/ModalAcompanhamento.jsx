// src/components/ModalAcompanhamento.jsx

import React, { useState, useEffect } from "react";
import "../styles/ModalAcompanhamento.css";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

const ModalAcompanhamento = ({
  isOpen,
  onClose,
  dadosAtividade,
  alunoId,
  plano,
  onRegistroSalvo,
}) => {
  const [habilidadesComResultado, setHabilidadesComResultado] = useState([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (dadosAtividade) {
      // Pré-popula as habilidades com base na atividade planejada
      const habilidadesIniciais =
        dadosAtividade.atividadePrincipal?.habilidadesAvaliadas.map((hab) => ({
          ...hab,
          habilidadeTexto:
            plano.habilidades.find((p) => p.id === hab.habilidadeId)
              ?.habilidade || "Habilidade não encontrada",
        })) || [];
      setHabilidadesComResultado(habilidadesIniciais);
    }
  }, [dadosAtividade, plano]);

  if (!isOpen) {
    return null;
  }

  const handleResultadoChange = (index, resultado, observacoes) => {
    setHabilidadesComResultado((prev) => {
      const novasHabilidades = [...prev];
      novasHabilidades[index] = {
        ...novasHabilidades[index],
        resultado: resultado,
        observacoes: observacoes,
      };
      return novasHabilidades;
    });
  };

  const handleSalvarRegistro = async () => {
    setCarregando(true);
    try {
      const registroRef = doc(
        db,
        "alunos",
        alunoId,
        "atividadesAEE",
        dadosAtividade.id
      );

      // Filtra habilidades que possuem resultado para salvar
      const habilidadesValidas = habilidadesComResultado.filter(
        (hab) => hab.resultado
      );
      if (habilidadesValidas.length === 0) {
        alert(
          "Por favor, avalie pelo menos uma habilidade para salvar o registro."
        );
        setCarregando(false);
        return;
      }

      await updateDoc(registroRef, {
        "atividadePrincipal.habilidadesAvaliadas": habilidadesValidas,
      });

      // Chama a função de callback para o componente pai
      onRegistroSalvo();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar o registro:", error);
      alert("Falha ao salvar o registro. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Registro de Atendimento</h3>
          <button onClick={onClose} className="modal-close-btn">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <p>
            **Atividade Planejada:**{" "}
            {dadosAtividade.atividadePrincipal.descricao.substring(0, 100)}...
          </p>
          <hr />
          {habilidadesComResultado.map((hab, index) => (
            <div key={hab.habilidadeId} className="registro-habilidade-card">
              <h4>{hab.habilidadeTexto}</h4>
              <div className="form-group botoes-resultado">
                <label>Resultado*</label>
                <div className="botoes-resultado">
                  <button
                    type="button"
                    onClick={() =>
                      handleResultadoChange(index, "Deu Certo", hab.observacoes)
                    }
                    className={hab.resultado === "Deu Certo" ? "ativo" : ""}
                  >
                    Deu Certo
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleResultadoChange(index, "Parcial", hab.observacoes)
                    }
                    className={hab.resultado === "Parcial" ? "ativo" : ""}
                  >
                    Parcial
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleResultadoChange(
                        index,
                        "Com Dificuldade",
                        hab.observacoes
                      )
                    }
                    className={
                      hab.resultado === "Com Dificuldade" ? "ativo" : ""
                    }
                  >
                    Com Dificuldade
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Observações</label>
                <textarea
                  value={hab.observacoes}
                  onChange={(e) =>
                    handleResultadoChange(index, hab.resultado, e.target.value)
                  }
                  rows="2"
                  placeholder="Como o aluno respondeu?"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button onClick={handleSalvarRegistro} disabled={carregando}>
            {carregando ? "Salvando..." : "Salvar Registro"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAcompanhamento;
