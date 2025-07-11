import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Importar o hook useAlunos
import { useAlunos } from "../hooks/useAlunos";
// Importar o componente SelecaoAluno
import SelecaoAluno from "../components/SelecaoAluno";

// Estilos (se houver um arquivo CSS específico para esta página)
// import "../styles/SelecionarAlunoParaInteresses.css"; // Você pode criar este arquivo se precisar de estilos específicos

export default function SelecionarAlunoParaInteresses() {
  const navigate = useNavigate();
  const [alunoSelecionado, setAlunoSelecionado] = useState(null); // Estado para o aluno selecionado

  // Usar o hook useAlunos para buscar os alunos
  const {
    alunos,
    carregando: carregandoAlunos,
    erro: erroAlunos,
  } = useAlunos();

  // Handler para quando um aluno é selecionado no componente SelecaoAluno
  const handleAlunoSelecionado = useCallback(
    (event) => {
      const alunoNome = event.target.value;
      const alunoEncontrado = alunos.find((aluno) => aluno.nome === alunoNome);
      setAlunoSelecionado(alunoEncontrado);
    },
    [alunos]
  );

  // Handler para o botão "Realizar Avaliação de Interesses"
  const handleRealizarAvaliacao = useCallback(() => {
    if (alunoSelecionado && alunoSelecionado.id) {
      console.log(
        "Navegando para Avaliação de Interesses com Aluno ID:",
        alunoSelecionado.id
      );
      navigate(`/nova-avaliacao/${alunoSelecionado.id}`);
    } else {
      // Isso não deve acontecer se o botão estiver desabilitado corretamente
      console.warn("Nenhum aluno selecionado para realizar a avaliação.");
    }
  }, [navigate, alunoSelecionado]);

  // Flag consolidada para desabilitar elementos durante carregamentos
  const carregandoGeral = carregandoAlunos;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8 font-inter">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Selecionar Aluno para Avaliação de Interesses
        </h1>

        {/* Área de Mensagens de Erro/Sucesso */}
        {erroAlunos && (
          <div className="text-red-600 text-center mb-4">{erroAlunos}</div>
        )}

        {/* Seção de Seleção de Aluno */}
        {carregandoAlunos ? (
          <div className="text-center text-gray-700">Carregando alunos...</div>
        ) : (
          <SelecaoAluno
            alunos={alunos}
            alunoSelecionado={alunoSelecionado?.nome || ""}
            onSelecionar={handleAlunoSelecionado}
            disabled={carregandoGeral}
          />
        )}

        {/* Botão para realizar a avaliação, habilitado apenas se um aluno for selecionado */}
        <button
          onClick={handleRealizarAvaliacao}
          disabled={!alunoSelecionado || carregandoGeral}
          className={`mt-8 w-full py-3 px-4 rounded-lg shadow-md font-bold text-lg transition-colors duration-200
            ${
              !alunoSelecionado || carregandoGeral
                ? "bg-blue-300 text-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
        >
          Realizar Avaliação de Interesses
        </button>

        <button
          onClick={() => navigate("/painel-dev")}
          className="mt-4 w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
        >
          Voltar ao Painel
        </button>
      </div>
    </div>
  );
}
