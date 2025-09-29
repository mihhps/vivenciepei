import React, { useState } from "react";
// O import do 'db' e 'collection/addDoc' depende da sua configuração real de Firebase.
// Por padrão, estou removendo para que o componente seja executável no ambiente de visualização,
// mas você deve reverter isso se for integrar de verdade.
// import { db } from "../firebase";
// import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom"; // Importado para navegação

// Função de utilidade para gerar código de convite (substitui o import que falhou)
// Gera uma string alfanumérica curta e aleatória.
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Função dummy para simular as funções do Firebase (REMOVER EM PRODUÇÃO)
const db = {};
const collection = (db, name) => ({ name });
const addDoc = async (collectionRef, data) => {
  console.log("Simulating Firestore addDoc:", data);
  return { id: "dummy-id" };
};

// OBS: Você deve ter uma forma de verificar se o usuário logado é Administrador.
// Se você tiver um Hook de contexto (ex: useAuth), use-o aqui.
// const { isAdmin } = useAuth();

export default function GerenciadorConvites() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [codigoGerado, setCodigoGerado] = useState("");

  // Supondo que você use uma variável para controlar o acesso
  // Substitua 'true' pela sua função de verificação de admin, ex: const usuarioEhAdmin = isAdmin();
  const usuarioEhAdmin = true;

  const handleGerarConvite = async () => {
    if (!usuarioEhAdmin) {
      setErro("Acesso negado. Apenas administradores podem gerar convites.");
      return;
    }

    setErro("");
    setLoading(true);

    try {
      // 1. Gera o novo código
      const novoCodigo = generateInviteCode();

      // 2. Cria o documento no Firestore (Simulado)
      await addDoc(collection(db, "convites"), {
        codigo: novoCodigo,
        expirado: false, // Ativo por padrão
        dataCriacao: new Date().toISOString(),
        // Opcional: Adicionar quem criou o convite (útil para auditoria)
        // criadoPorUid: seuUsuarioLogado.uid,
      });

      setCodigoGerado(novoCodigo); // Exibe o código para o admin
      setErro("");
    } catch (error) {
      console.error("Erro ao gerar convite:", error);
      setErro(
        "Falha ao salvar o convite no banco de dados. Verifique a conexão e as regras."
      );
    } finally {
      setLoading(false);
    }
  };

  // Botão Voltar (Visual IDÊNTICO às outras páginas: seta branca, fundo transparente)
  const BotaoVoltar = () => (
    <button
      onClick={() => navigate(-1)}
      // Classes Tailwind para um botão de voltar que parece o das suas outras páginas
      className="flex items-center px-3 py-1.5 text-sm font-semibold rounded-lg bg-white shadow-md text-gray-700 hover:bg-gray-100 transition duration-150 mb-6 focus:outline-none"
      aria-label="Voltar à página anterior"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 mr-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      Voltar
    </button>
  );

  if (!usuarioEhAdmin) {
    return (
      <div className="min-h-screen bg-[#2a5585] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md text-center relative">
          <div className="flex justify-start w-full">
            <BotaoVoltar />
          </div>
          <h1 className="text-3xl font-bold text-red-600 mb-4 mt-4">
            Acesso Negado
          </h1>
          <p className="text-gray-600">
            Você não tem permissão para acessar esta área administrativa.
          </p>
        </div>
      </div>
    );
  }

  return (
    // Fundo da página com o azul escuro sólido da sua aplicação
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#2a5585]">
      {/* Cartão principal, responsivo e elegante */}
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg relative text-left">
        {/* Usando flex para posicionar o botão à esquerda e o texto centralizado */}
        <div className="flex justify-between items-start mb-6">
          <BotaoVoltar />
          {/* Espaçador para empurrar o Botão Voltar para a esquerda */}
          <div className="w-1/3"></div>
        </div>

        <div className="text-center -mt-10">
          {" "}
          {/* Subir o conteúdo para compensar o BotãoVoltar */}
          {/* Título mais suave e menos chamativo */}
          <h2 className="text-3xl font-semibold text-gray-700 mb-2">
            Gerenciamento de Convites
          </h2>
          <p className="text-gray-600 mb-8">
            Crie códigos de convite únicos para novos usuários da plataforma.
          </p>
        </div>

        {/* Botão principal de ação (Cor verde esmeralda para ser profissional e menos chamativo que o roxo) */}
        <button
          onClick={handleGerarConvite}
          disabled={loading}
          className={`
            w-full py-3 px-6 text-lg font-semibold rounded-lg transition duration-300 transform hover:scale-[1.02] 
            ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-emerald-600 text-white shadow-lg shadow-emerald-500/50 hover:bg-emerald-700"
            }
          `}
        >
          {loading ? "Gerando Código..." : "Gerar Novo Convite"}
        </button>

        {/* Área de Resultado */}
        {codigoGerado && (
          <div className="mt-8 p-6 bg-green-50 border-l-4 border-green-400 rounded-lg">
            <p className="text-green-800 font-semibold mb-2">
              Código Gerado com Sucesso!
            </p>
            <div className="bg-white p-3 rounded-md border border-dashed border-gray-300 flex justify-between items-center">
              <span className="text-2xl font-mono text-green-600 break-all">
                {codigoGerado}
              </span>
              {/* Botão para copiar (funcionalidade opcional) */}
              <button
                onClick={() => {
                  // Usa o método antigo para máxima compatibilidade em iframes
                  const tempInput = document.createElement("textarea");
                  tempInput.value = codigoGerado;
                  document.body.appendChild(tempInput);
                  tempInput.select();
                  document.execCommand("copy");
                  document.body.removeChild(tempInput);
                  // Opcional: Adicionar feedback visual aqui (ex: "Copiado!")
                }}
                className="ml-4 text-emerald-500 hover:text-emerald-700 font-medium text-sm transition"
              >
                Copiar
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Compartilhe este código para permitir um novo cadastro.
            </p>
          </div>
        )}

        {/* Área de Erro */}
        {erro && (
          <p className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-300">
            {erro}
          </p>
        )}
      </div>
    </div>
  );
}
