// src/pages/ListaProfessoresMinhaEscola.jsx

import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // Verifique se o caminho está correto
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import BotaoVoltar from "../components/BotaoVoltar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useUserSchool } from "../hooks/useUserSchool";

// Adapte o CSS ou use um global
import "./ListaProfessoresMinhaEscola.css";

export default function ListaProfessoresMinhaEscola() {
  const [professores, setProfessores] = useState([]);
  const [escolaUsuarioId, setEscolaUsuarioId] = useState(null); // ID da escola principal do usuário logado
  const [escolaUsuarioNome, setEscolaUsuarioNome] = useState(""); // Nome da escola do usuário para exibição
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Efeito para carregar a ID da escola principal do usuário logado
  useEffect(() => {
    console.log("useEffect: Iniciando verificação de usuário e escola.");
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    console.log("useEffect: Objeto usuarioLogado do localStorage:", usuario);

    if (!usuario) {
      toast.error("Você precisa estar logado para acessar esta página.");
      navigate("/");
      return;
    }

    const perfisAutorizados = [
      "aee",
      "gestao",
      "orientador pedagógico",
      "diretor",
      "diretor adjunto",
    ];

    if (!perfisAutorizados.includes(usuario.perfil?.toLowerCase())) {
      toast.error("Seu perfil não tem permissão para visualizar esta página.");
      navigate("/");
      return;
    }

    // --- LÓGICA DE EXTRAÇÃO DA ESCOLA DO USUÁRIO ---
    let userMainSchoolId = null;
    if (usuario.escolas && typeof usuario.escolas === "object") {
      const escolaIds = Object.keys(usuario.escolas);
      console.log(
        "useEffect: IDs de escolas encontradas no mapa 'escolas' do usuário:",
        escolaIds
      );
      if (escolaIds.length > 0) {
        userMainSchoolId = escolaIds[0]; // Pega o primeiro ID de escola do mapa
        console.log(
          "useEffect: ID da escola principal do usuário (extraída):",
          userMainSchoolId
        );
      } else {
        console.log("useEffect: O mapa 'escolas' do usuário está vazio.");
      }
    } else {
      console.log(
        "useEffect: 'usuario.escolas' não é um objeto ou não existe."
      );
    }

    if (!userMainSchoolId) {
      toast.warn(
        "Sua conta não está vinculada a uma escola principal para esta visualização. Entre em contato com o suporte."
      );
      setIsLoading(false);
      return;
    }

    setEscolaUsuarioId(userMainSchoolId);
    console.log("useEffect: escolaUsuarioId definida como:", userMainSchoolId);

    // Opcional: Carregar o nome da escola para exibição
    const fetchEscolaNome = async () => {
      try {
        const escolaSnap = await getDocs(collection(db, "escolas"));
        const escolasData = escolaSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const escolaEncontrada = escolasData.find(
          (e) => e.id === userMainSchoolId
        );
        if (escolaEncontrada) {
          setEscolaUsuarioNome(escolaEncontrada.nome);
          console.log(
            "useEffect: Nome da escola do usuário carregado:",
            escolaEncontrada.nome
          );
        } else {
          console.log(
            "useEffect: Nome da escola do usuário não encontrado para o ID:",
            userMainSchoolId
          );
        }
      } catch (err) {
        console.error("Erro ao carregar nome da escola do usuário:", err);
      }
    };
    fetchEscolaNome();
  }, [navigate]); // Dependências do useEffect

  // Função para carregar os professores da escola específica do usuário
  const carregarProfessoresDaMinhaEscola = useCallback(async () => {
    console.log(
      "carregarProfessoresDaMinhaEscola: Função chamada. escolaUsuarioId atual:",
      escolaUsuarioId
    );
    if (!escolaUsuarioId) {
      console.log(
        "carregarProfessoresDaMinhaEscola: escolaUsuarioId é nulo, não fará a consulta."
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Consulta para buscar professores
      const q = query(
        collection(db, "usuarios"),
        where("perfil", "==", "professor"), // Filtra por perfil de professor
        // A chave no mapa 'escolas' do professor deve corresponder ao ID da escola do usuário
        where(`escolas.${escolaUsuarioId}`, "==", true)
      );
      console.log(
        "carregarProfessoresDaMinhaEscola: Query Firebase montada com filtro:",
        `escolas.${escolaUsuarioId}`
      );

      const querySnapshot = await getDocs(q);
      const professoresFiltrados = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log(
        "carregarProfessoresDaMinhaEscola: Professores filtrados recebidos:",
        professoresFiltrados
      );

      setProfessores(professoresFiltrados);
    } catch (err) {
      console.error("Erro ao carregar professores da escola:", err);
      setError("Erro ao carregar professores. Por favor, tente novamente.");
      toast.error("Erro ao carregar professores. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [escolaUsuarioId]); // Recarrega se a ID da escola do usuário mudar

  // Efeito para disparar o carregamento quando escolaUsuarioId estiver disponível
  useEffect(() => {
    console.log(
      "Segundo useEffect: escolaUsuarioId mudou, chamando carregarProfessoresDaMinhaEscola."
    );
    carregarProfessoresDaMinhaEscola();
  }, [carregarProfessoresDaMinhaEscola]);

  if (isLoading && !error) {
    return <Loader />;
  }

  if (error && !isLoading) {
    return (
      <div className="lista-professores-container">
        <BotaoVoltar />
        <p className="error-message">{error}</p>
        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    );
  }

  // Se o usuário não tem uma escola_id principal e não está carregando/com erro
  if (!escolaUsuarioId && !isLoading && !error) {
    return (
      <div className="lista-professores-container">
        <BotaoVoltar />
        <p className="info-message">
          Não foi possível determinar a sua escola para carregar os professores.
        </p>
        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    );
  }

  return (
    <div className="lista-professores-container">
      <div className="lista-professores-card">
        <BotaoVoltar className="lista-professores-botao-voltar" />
        <h2 className="lista-professores-titulo">
          Professores da Minha Escola
          {escolaUsuarioNome && ` (${escolaUsuarioNome})`}
        </h2>

        {professores.length === 0 ? (
          <p className="info-message">
            Nenhum professor encontrado para sua escola.
          </p>
        ) : (
          <ul className="lista-professores-ul">
            {professores.map((prof) => (
              <li key={prof.id} className="lista-professores-item">
                <h3>{prof.nome}</h3>
                <p>Email: {prof.email}</p>
                <p>Perfil: {prof.perfil?.toUpperCase()}</p>
                {/* Você pode exibir outras informações do professor aqui */}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}
