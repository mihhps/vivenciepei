import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase"; // Presume que você tem este import
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEye, FaPlus, FaUsers, FaSync } from "react-icons/fa";
import "../styles/DuaPlanos.css";

// =========================================================================
// ATENÇÃO: SIMULAÇÃO DE HOOKS E COMPONENTES PARA ESTE ARQUIVO
// Substitua estes por seus componentes e hooks reais, como BotaoVoltar
// =========================================================================
const BotaoVoltar = () => {
  const navigate = useNavigate();
  return (
    <button
      className="botao-voltar"
      onClick={() => navigate(-1)}
      aria-label="Voltar"
    >
      <FaUsers /> Meus Painéis
    </button>
  );
};

const useMessageSystem = () => {
  const [erro, setErro] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState(null);

  const exibirMensagem = (tipo, msg) => {
    if (tipo === "erro") {
      setErro(msg);
      setMensagemSucesso(null);
    } else if (tipo === "sucesso") {
      setMensagemSucesso(msg);
      setErro(null);
    }
    setTimeout(() => {
      setErro(null);
      setMensagemSucesso(null);
    }, 6000);
  };

  return { exibirMensagem, erro, mensagemSucesso };
};
// =========================================================================

// ----------------------------------------------------------------------
// COMPONENTE PRINCIPAL: VerPlanosAulaDUA
// ----------------------------------------------------------------------

export default function VerPlanosAulaDUA() {
  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();
  const { exibirMensagem, erro, mensagemSucesso } = useMessageSystem();

  // Obtém o UID do usuário logado (usado para filtrar os planos)
  const usuarioLogado = useMemo(
    () =>
      JSON.parse(localStorage.getItem("usuarioLogado")) || { uid: "abc12345" }, // UID de teste
    []
  );

  /**
   * Função para buscar os planos de aula DUA do usuário logado.
   */
  const fetchPlanos = async () => {
    if (!usuarioLogado.uid) return;

    setCarregando(true);
    try {
      const planosRef = collection(db, "planosAulaDUA");

      // Cria uma query para buscar apenas os planos criados pelo usuário logado (criadorId é o UID)
      const q = query(
        planosRef,
        where("criadorId", "==", usuarioLogado.uid),
        orderBy("data", "desc") // Ordena por data da aula mais recente
      );

      const querySnapshot = await getDocs(q);

      const planosData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Formatação simples da data para exibição
        dataAulaFormatada: doc.data().data
          ? new Date(doc.data().data).toLocaleDateString("pt-BR")
          : "N/A",
      }));

      setPlanos(planosData);
    } catch (err) {
      console.error("Erro ao buscar planos de aula DUA:", err);
      exibirMensagem("erro", "Erro ao carregar seus planos de aula.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    fetchPlanos();
  }, [usuarioLogado.uid]);

  /**
   * Função para deletar um plano de aula.
   */
  const handleDeletePlano = async (planoId, titulo) => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir o plano "${titulo}"? Esta ação é irreversível.`
      )
    ) {
      setCarregando(true);
      try {
        await deleteDoc(doc(db, "planosAulaDUA", planoId));
        exibirMensagem("sucesso", `Plano "${titulo}" excluído com sucesso.`);
        // Remove da lista localmente
        setPlanos(planos.filter((p) => p.id !== planoId));
      } catch (err) {
        console.error("Erro ao excluir plano:", err);
        exibirMensagem("erro", `Erro ao excluir o plano: ${err.message}`);
      } finally {
        setCarregando(false);
      }
    }
  };

  /**
   * Função para navegar para o detalhe (Visualizar ou Editar, a depender da sua necessidade)
   */
  const handleViewPlano = (planoId) => {
    // A rota /visualizar-plano-dua/:id deve ser criada no seu router (App.jsx)
    navigate(`/visualizar-plano-dua/${planoId}`);
  };

  // --- ESTRUTURA JSX DA PÁGINA ---
  return (
    <div className="container-ver-planos-dua" aria-busy={carregando}>
      <div className="card-header">
        <BotaoVoltar />
        <button
          className="botao-principal"
          onClick={() => navigate("/criar-plano-dua")}
          disabled={carregando}
        >
          <FaPlus /> Novo Plano DUA
        </button>
      </div>

      <h1 className="titulo-principal">Meus Planos de Aula DUA</h1>

      {erro && <div className="mensagem-erro">{erro}</div>}
      {mensagemSucesso && (
        <div className="mensagem-sucesso">{mensagemSucesso}</div>
      )}

      {carregando && (
        <div className="loading-state">
          <FaSync className="icon-spin" /> Carregando planos...
        </div>
      )}

      {!carregando && planos.length === 0 && (
        <div className="empty-state">
          <p>Você ainda não criou nenhum Plano de Aula DUA. </p>
          <p>Clique no botão **Novo Plano DUA** para começar!</p>
        </div>
      )}

      {!carregando && planos.length > 0 && (
        <div className="tabela-container-dua">
          <table>
            <thead>
              <tr>
                <th>Data da Aula</th>
                <th>Título da Aula</th>
                <th>Turma</th>
                <th>Tema/Conteúdo</th>
                <th>Duração</th>
                <th className="acoes-coluna">Ações</th>
              </tr>
            </thead>
            <tbody>
              {planos.map((plano) => (
                <tr key={plano.id}>
                  <td data-label="Data">{plano.dataAulaFormatada}</td>
                  <td data-label="Título" className="titulo-coluna">
                    {plano.tituloAula}
                  </td>
                  <td data-label="Turma">{plano.turmaNome}</td>
                  <td data-label="Conteúdo" className="conteudo-coluna">
                    {plano.conteudoTema}
                  </td>
                  <td data-label="Duração">{plano.duracao || "N/I"}</td>
                  <td data-label="Ações" className="acoes-coluna">
                    <button
                      className="acao-view"
                      onClick={() => handleViewPlano(plano.id)}
                      title="Visualizar Detalhes"
                      disabled={carregando}
                    >
                      <FaEye />
                    </button>
                    <button
                      className="acao-delete"
                      onClick={() =>
                        handleDeletePlano(plano.id, plano.tituloAula)
                      }
                      title="Excluir Plano"
                      disabled={carregando}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
