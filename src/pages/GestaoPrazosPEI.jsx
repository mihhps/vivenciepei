// src/pages/GestaoPrazosPEI.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  updateDoc,
  Timestamp, // Importar Timestamp
  serverTimestamp, // Importar serverTimestamp
} from "firebase/firestore";
import BotaoVoltar from "../components/BotaoVoltar";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader"; // Adicionado Loader para consistência

function GestaoPrazosPEI() {
  // Use um objeto Date para obter o ano atual com precisão do fuso horário local
  const anoAtual = new Date().getFullYear();

  const [anoLetivoSelecionado, setAnoLetivoSelecionado] = useState(anoAtual);
  // As datas ainda são strings para o input[type="date"]
  const [dataLimiteCriacao, setDataLimiteCriacao] = useState("");
  const [dataLimiteRevisao1, setDataLimiteRevisao1] = useState("");
  const [dataLimiteRevisao2, setDataLimiteRevisao2] = useState("");
  const [feedbackMensagem, setFeedbackMensagem] = useState(null);
  const [feedbackTipo, setFeedbackTipo] = useState("ocioso");
  const [operacaoEmAndamento, setOperacaoEmAndamento] = useState(false); // Substitui loading interno para consistência

  const navigate = useNavigate();
  const feedbackTimerRef = useRef(null);

  // Função auxiliar para converter Timestamp do Firestore para string YYYY-MM-DD
  const formatTimestampToDateString = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate(); // Converte Timestamp para objeto Date
    return date.toISOString().split("T")[0]; // Formata para YYYY-MM-DD
  };

  const exibirFeedback = useCallback((tipo, mensagem) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedbackMensagem(mensagem);
    setFeedbackTipo(tipo);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackMensagem(null);
      setFeedbackTipo("ocioso");
    }, 5000);
  }, []);

  const buscarPrazosDoFirebase = useCallback(
    async (ano) => {
      setOperacaoEmAndamento(true); // Indica que uma operação está em andamento
      setFeedbackMensagem(null); // Limpa feedback anterior
      setFeedbackTipo("carregando"); // Define tipo para carregamento

      try {
        const q = query(
          collection(db, "prazosPEIAnuais"),
          where("anoLetivo", "==", ano)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const dados = snapshot.docs[0].data();
          // Converte Timestamps para string YYYY-MM-DD para os inputs
          setDataLimiteCriacao(
            formatTimestampToDateString(dados.dataLimiteCriacaoPEI)
          );
          setDataLimiteRevisao1(
            formatTimestampToDateString(dados.dataLimiteRevisao1Sem)
          );
          setDataLimiteRevisao2(
            formatTimestampToDateString(dados.dataLimiteRevisao2Sem)
          );
          exibirFeedback("sucesso", `Prazos para ${ano} carregados.`);
        } else {
          // Limpa os campos se nenhum prazo for encontrado
          setDataLimiteCriacao("");
          setDataLimiteRevisao1("");
          setDataLimiteRevisao2("");
          exibirFeedback(
            "aviso",
            `Nenhum prazo definido para ${ano}. Você pode criar um.`
          );
        }
      } catch (e) {
        console.error("Erro ao buscar prazos:", e);
        exibirFeedback(
          "erro",
          "Erro ao carregar prazos. Verifique sua conexão ou permissões."
        );
      } finally {
        setOperacaoEmAndamento(false); // Finaliza a operação
      }
    },
    [exibirFeedback] // Dependência para useCallback
  );

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
    console.log("Objeto usuário do localStorage:", usuario);
    console.log("Perfil do usuário:", usuario.perfil); // Verifique o valor exato aqui
    console.log(
      "Perfil do usuário em minúsculas (para teste):",
      usuario.perfil?.toLowerCase()
    ); // Verifique como ficaria

    // ANOTAÇÃO: A condição foi corrigida para incluir o perfil 'desenvolvedor'
    // A linha abaixo padroniza o perfil para minúsculas antes da verificação
    const usuarioPerfil = usuario.perfil ? usuario.perfil.toLowerCase() : "";

    if (
      usuarioPerfil !== "gestao" &&
      usuarioPerfil !== "aee" &&
      usuarioPerfil !== "desenvolvedor"
    ) {
      exibirFeedback(
        "erro",
        "Você não tem permissão para acessar esta página."
      );
      navigate("/");
      return;
    }

    // Carrega os prazos para o ano atual na montagem inicial
    buscarPrazosDoFirebase(anoAtual);

    return () => {
      // Limpa o timer de feedback ao desmontar o componente
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [exibirFeedback, navigate, buscarPrazosDoFirebase, anoAtual]); // Adicionado anoAtual como dependência

  useEffect(() => {
    // Recarrega prazos quando o ano letivo selecionado muda,
    // apenas se for diferente do ano que já foi carregado na montagem
    if (anoLetivoSelecionado !== anoAtual) {
      buscarPrazosDoFirebase(anoLetivoSelecionado);
    } else {
      // Se voltar para o ano atual, re-carrega para garantir consistência
      buscarPrazosDoFirebase(anoAtual);
    }
  }, [anoLetivoSelecionado, buscarPrazosDoFirebase, anoAtual]);

  const handleSalvarPrazos = useCallback(async () => {
    setOperacaoEmAndamento(true);
    setFeedbackMensagem(null);
    setFeedbackTipo("carregando");

    try {
      const usuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};

      // Helper para converter string YYYY-MM-DD para Timestamp
      const convertToTimestamp = (dateString) => {
        if (!dateString) return null;
        // Adiciona T00:00:00 para garantir que seja interpretado como início do dia UTC
        // ou adapte para fuso horário local se necessário (ex: 'T00:00:00-03:00')
        // Para simplicidade e compatibilidade com Timestamp.toDate(), T00:00:00 é comum.
        return Timestamp.fromDate(new Date(`${dateString}T00:00:00`));
      };

      const prazosData = {
        anoLetivo: anoLetivoSelecionado,
        dataLimiteCriacaoPEI: convertToTimestamp(dataLimiteCriacao),
        dataLimiteRevisao1Sem: convertToTimestamp(dataLimiteRevisao1),
        dataLimiteRevisao2Sem: convertToTimestamp(dataLimiteRevisao2),
        criadoPor: usuario.email || "desconhecido",
        // Usar serverTimestamp() para a data de atualização
        ultimaAtualizacao: serverTimestamp(),
      };

      const q = query(
        collection(db, "prazosPEIAnuais"),
        where("anoLetivo", "==", anoLetivoSelecionado)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Atualiza o documento existente
        await updateDoc(snapshot.docs[0].ref, prazosData);
        exibirFeedback(
          "sucesso",
          `Prazos para ${anoLetivoSelecionado} atualizados com sucesso!`
        );
      } else {
        // Cria um novo documento
        await addDoc(collection(db, "prazosPEIAnuais"), prazosData);
        exibirFeedback(
          "sucesso",
          `Prazos para ${anoLetivoSelecionado} salvos com sucesso!`
        );
      }
    } catch (e) {
      console.error("Erro ao salvar prazos:", e);
      exibirFeedback(
        "erro",
        "Erro ao salvar prazos. Por favor, tente novamente."
      );
    } finally {
      setOperacaoEmAndamento(false);
    }
  }, [
    anoLetivoSelecionado,
    dataLimiteCriacao,
    dataLimiteRevisao1,
    dataLimiteRevisao2,
    exibirFeedback,
  ]);

  // Se a operação estiver em andamento, mostra o Loader
  if (operacaoEmAndamento && feedbackTipo === "carregando") {
    return <Loader />;
  }

  return (
    <div style={estilos.container} aria-busy={operacaoEmAndamento}>
      <div style={estilos.card}>
        {/* Posiciona o BotaoVoltar absolutamente dentro do container, não do card */}
        <BotaoVoltar estiloPersonalizado={estilos.botaoVoltar} />
        <h1 style={estilos.titulo}>Gestão de Prazos do PEI</h1>

        {feedbackMensagem && (
          <div
            style={
              feedbackTipo === "erro"
                ? estilos.mensagemErro
                : feedbackTipo === "sucesso"
                ? estilos.mensagemSucesso
                : estilos.mensagemAviso
            }
            role={feedbackTipo === "erro" ? "alert" : "status"}
          >
            {feedbackMensagem}
          </div>
        )}

        <div style={estilos.inputGroup}>
          <label style={estilos.label}>Ano Letivo:</label>
          <select
            value={anoLetivoSelecionado}
            onChange={(e) => setAnoLetivoSelecionado(Number(e.target.value))}
            style={estilos.input}
            disabled={operacaoEmAndamento}
          >
            {/* Gera opções para ano atual, ano anterior e próximo ano */}
            {[anoAtual + 1, anoAtual, anoAtual - 1].map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </div>

        {/* Mapeia os inputs de data para renderização simplificada */}
        {[
          {
            id: "dataLimiteCriacao",
            label: "Data Limite Criação PEI:",
            value: dataLimiteCriacao,
            setter: setDataLimiteCriacao,
          },
          {
            id: "dataLimiteRevisao1",
            label: "Data Limite 1ª Revisão:",
            value: dataLimiteRevisao1,
            setter: setDataLimiteRevisao1,
          },
          {
            id: "dataLimiteRevisao2",
            label: "Data Limite 2ª Revisão:",
            value: dataLimiteRevisao2,
            setter: setDataLimiteRevisao2,
          },
        ].map(({ id, label, value, setter }) => (
          <div style={estilos.inputGroup} key={id}>
            <label style={estilos.label} htmlFor={id}>
              {label}
            </label>
            <input
              type="date"
              id={id}
              value={value}
              onChange={(e) => setter(e.target.value)}
              style={estilos.input}
              disabled={operacaoEmAndamento}
            />
          </div>
        ))}

        <button
          onClick={handleSalvarPrazos}
          style={estilos.botaoSalvar}
          disabled={operacaoEmAndamento}
          aria-label={
            operacaoEmAndamento ? "Salvando Prazos..." : "Salvar Prazos Anuais"
          }
        >
          {operacaoEmAndamento ? "Salvando Prazos..." : "Salvar Prazos Anuais"}
        </button>
      </div>
    </div>
  );
}

// Estilos (sem alterações, mas o posicionamento do BotaoVoltar foi pensado para o container)
const estilos = {
  container: {
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    minHeight: "100vh",
    width: "100vw",
    padding: "25px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative", // Importante para posicionamento absoluto do botão voltar
    overflow: "auto",
  },
  card: {
    background: "#fff",
    maxWidth: "800px",
    width: "100%",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    boxSizing: "border-box",
    position: "relative", // Para o conteúdo interno não se misturar
  },
  botaoVoltar: {
    position: "absolute", // Posicionamento absoluto dentro do container
    top: "20px",
    left: "20px",
    backgroundColor: "#2a9d8f",
    color: "#fff",
    padding: "10px 15px",
    border: "none",
    borderRadius: "5px",
    fontSize: "14px",
    cursor: "pointer",
    zIndex: 10, // Garante que o botão fique acima de outros elementos
  },
  titulo: {
    textAlign: "center",
    color: "#1d3557",
    marginBottom: "30px",
    fontSize: "2em",
    marginTop: "0",
  },
  inputGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    fontSize: "1em",
  },
  botaoSalvar: {
    backgroundColor: "#2a9d8f",
    color: "#fff",
    padding: "12px 25px",
    border: "none",
    borderRadius: "5px",
    fontSize: "1.1em",
    fontWeight: "bold",
    cursor: "pointer",
    display: "block",
    width: "fit-content",
    margin: "30px auto 0",
    transition: "background-color 0.3s ease", // Adiciona transição para o hover/disabled
    "&:hover": {
      backgroundColor: "#21887e",
    },
    "&:disabled": {
      backgroundColor: "#ccc",
      cursor: "not-allowed",
    },
  },
  mensagemErro: {
    color: "#e63946",
    backgroundColor: "#ffe6e6",
    padding: "10px",
    borderRadius: "5px",
    marginBottom: "20px",
    textAlign: "center",
  },
  mensagemSucesso: {
    color: "#2a9d8f",
    backgroundColor: "#e6fff2",
    padding: "10px",
    borderRadius: "5px",
    marginBottom: "20px",
    textAlign: "center",
  },
  mensagemAviso: {
    color: "#ff9900",
    backgroundColor: "#fff3cd",
    padding: "10px",
    borderRadius: "5px",
    marginBottom: "20px",
    textAlign: "center",
  },
};

export default GestaoPrazosPEI;
