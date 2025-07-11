import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase"; // Importa as instâncias já inicializadas
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

// Importar o hook useAlunos e o componente SelecaoAluno
import { useAlunos } from "../hooks/useAlunos";
import SelecaoAluno from "../components/SelecaoAluno";
import "../styles/AvaliacaoInteressesPage.css";

// Importar o hook useAuth do seu contexto de autenticação
import { useAuth } from "../context/AuthContext";

// Importar a função de geração de PDF com o caminho e nome de arquivo CORRETOS
import { gerarPDFCompleto } from "../utils/gerarPDFCompleto"; // CAMINHO E NOME DO ARQUIVO CORRIGIDOS AQUI

// --- Listas de Itens para Rádios (Copiadas de AvaliacaoInteressesPage.jsx) ---
const ATIVIDADES_FAVORITAS_LIST = [
  "Brincadeiras ao ar livre (parque, bicicleta, bola)",
  "Brincadeiras dentro de casa (quebra-cabeças, jogos de tabuleiro, blocos)",
  "Assistir TV/Filmes/Desenhos",
  "Jogar videogames/aplicativos no tablet",
  "Desenhar/Pintar/Esculpir (atividades artísticas)",
  "Ouvir música/Cantar/Dançar",
  "Ler livros/Folhear revistas",
  "Brincar com água/Areia",
  "Brincadeiras de faz de conta (bonecas, carrinhos, super-heróis)",
  "Interagir com animais",
  "Explorar a natureza",
  "Atividades sensoriais (massinha, geleca, objetos com texturas diferentes)",
];

const SINAIS_DESREGULACAO_LIST = [
  "Irritabilidade/Frustração",
  "Choro excessivo",
  "Gritos/Resmungos",
  "Bater/Morder/Chutar (em si mesma ou em outros)",
  "Se jogar no chão",
  "Correr/Andar de um lado para o outro",
  "Tentar se esconder ou fugir",
  "Ficar paralisada/Congelada",
  "Repetir falas ou movimentos (ecolalia, estereotipias)",
  "Recusar-se a obedecer",
  "Dificuldade para se comunicar/Expressar",
  "Dificuldade para transicionar entre atividades",
];

const SITUACOES_DESREGULACAO_LIST = [
  "Mudanças inesperadas na rotina",
  "Ambientes muito barulhentos (festas, shoppings, shows)",
  "Ambientes com muita gente/muito movimento",
  "Luzes muito fortes ou piscantes",
  "Cheiros fortes ou incomuns",
  "Texturas específicas (roupas, alimentos, objetos)",
  "Sede ou fome",
  "Cansaço",
  "Doença/Dor",
  "Frustração ao não conseguir algo",
  "Excesso de estímulos (visuais, auditivos, táteis)",
  "Ser tocada inesperadamente",
  "Pressão para fazer algo que não quer",
  "Transições entre atividades ou locais",
  "Separação de pessoas familiares",
  "Ser contrariada",
];

// Níveis de avaliação para as bolinhas (Sim, Não, NA) - Usados para estilização
const NIVEIS_AVALIACAO = ["Sim", "Não", "NA"];

function VisualizarAvaliacaoInteressesPage() {
  const { alunoId: alunoIdFromParams } = useParams(); // Pega o ID do aluno da URL
  const navigate = useNavigate();

  // Obter userId e isAuthReady do AuthContext
  const { userId, isAuthReady, currentUser } = useAuth(); // Adicionado currentUser para passar ao PDF

  const [aluno, setAluno] = useState(null); // Aluno cujos dados estão sendo exibidos
  const [alunoSelecionadoDropdown, setAlunoSelecionadoDropdown] =
    useState(null); // Aluno selecionado no dropdown
  const [avaliacaoData, setAvaliacaoData] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [gerandoPdf, setGerandoPdf] = useState(false); // Novo estado para o carregamento do PDF

  // Usar o hook useAlunos para buscar a lista de todos os alunos
  const {
    alunos: alunosListFromHook, // Renomeado para evitar conflito com 'aluno'
    carregando: carregandoAlunosFromHook,
    erro: erroAlunosFromHook,
  } = useAlunos();

  // Efeito para pré-selecionar o aluno do URL param no dropdown
  useEffect(() => {
    if (
      alunoIdFromParams &&
      alunosListFromHook.length > 0 &&
      !alunoSelecionadoDropdown
    ) {
      const foundAluno = alunosListFromHook.find(
        (a) => a.id === alunoIdFromParams
      );
      if (foundAluno) {
        setAlunoSelecionadoDropdown(foundAluno);
      }
    }
  }, [alunoIdFromParams, alunosListFromHook, alunoSelecionadoDropdown]);

  // Fetch data (agora reage a alunoSelecionadoDropdown)
  useEffect(() => {
    const fetchData = async () => {
      // Prioriza o aluno selecionado no dropdown, depois o da URL
      const currentAlunoIdToFetch =
        alunoSelecionadoDropdown?.id || alunoIdFromParams;

      if (!db || !userId || !isAuthReady || !currentAlunoIdToFetch) {
        setCarregando(false);
        return;
      }

      setCarregando(true);
      setErro(null);
      setAvaliacaoData(null); // Limpa dados da avaliação ao iniciar nova busca
      setAluno(null); // Limpa dados do aluno ao iniciar nova busca

      try {
        const appId =
          typeof __app_id !== "undefined" ? __app_id : "default-app-id";

        // 1. Buscar dados do aluno (do novo ou antigo caminho)
        let fetchedAluno = null;
        const newAlunoDocRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/alunos`,
          currentAlunoIdToFetch
        );
        const newAlunoDocSnap = await getDoc(newAlunoDocRef);

        if (newAlunoDocSnap.exists()) {
          fetchedAluno = { id: newAlunoDocSnap.id, ...newAlunoDocSnap.data() };
        } else {
          const oldAlunoDocRef = doc(db, "alunos", currentAlunoIdToFetch);
          const oldAlunoDocSnap = await getDoc(oldAlunoDocRef);
          if (oldAlunoDocSnap.exists()) {
            fetchedAluno = {
              id: oldAlunoDocSnap.id,
              ...oldAlunoDocSnap.data(),
            };
          }
        }

        if (!fetchedAluno) {
          setErro("Aluno não encontrado.");
          setCarregando(false);
          return;
        }
        setAluno(fetchedAluno); // Define o aluno cujos dados estão sendo exibidos

        // 2. Buscar dados da avaliação de interesses
        let fetchedAvaliacao = null;

        // Tentar buscar no NOVO CAMINHO (user-specific)
        const newAvaliacaoDocRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/avaliacoesInteresses`,
          fetchedAluno.id
        );
        const newAvaliacaoDocSnap = await getDoc(newAvaliacaoDocRef);

        if (newAvaliacaoDocSnap.exists()) {
          fetchedAvaliacao = newAvaliacaoDocSnap.data().data;
        } else {
          // Tentar buscar no CAMINHO ANTIGO (raiz)
          const oldAvaliacaoDocRef = doc(
            db,
            "avaliacoesInteresses",
            fetchedAluno.id
          );
          const oldAvaliacaoDocSnap = await getDoc(oldAvaliacaoDocRef);
          if (oldAvaliacaoDocSnap.exists()) {
            fetchedAvaliacao = oldAvaliacaoDocSnap.data().data;
          }
        }

        if (fetchedAvaliacao) {
          setAvaliacaoData(fetchedAvaliacao); // Acessa o objeto 'data'
        } else {
          setErro("Avaliação de interesses não encontrada para este aluno.");
        }
      } catch (error) {
        console.error("Erro ao carregar dados da avaliação:", error);
        setErro("Erro ao carregar dados da avaliação. Tente novamente.");
      } finally {
        setCarregando(false);
      }
    };

    if (userId && isAuthReady) {
      fetchData();
    } else if (isAuthReady && !userId) {
      setCarregando(false);
      setErro("Usuário não autenticado para visualizar avaliações.");
    }
  }, [db, userId, isAuthReady, alunoIdFromParams, alunoSelecionadoDropdown]);

  // Handler para quando um aluno é selecionado no componente SelecaoAluno
  const handleSelecionarAlunoInterno = useCallback(
    (event) => {
      const selectedAlunoNome = event.target.value;
      const foundAluno = alunosListFromHook.find(
        (aluno) => aluno.nome === selectedAlunoNome
      );
      setAlunoSelecionadoDropdown(foundAluno); // Define o aluno selecionado no dropdown
      setErro(null); // Limpa erro ao mudar seleção
    },
    [alunosListFromHook]
  );

  // Helper para renderizar itens de rádio (apenas a bolinha selecionada "Sim" ou "Não")
  const renderRadioResponses = (list, dataObject) => {
    const responsesToDisplay = [];
    list.forEach((item) => {
      const response = dataObject[item];
      if (response === "Sim" || response === "Não") {
        // Apenas incluir respostas "Sim" ou "Não"
        responsesToDisplay.push({ item, response });
      }
    });

    if (responsesToDisplay.length === 0) {
      return (
        <p className="text-gray-500 italic text-sm mt-2">
          Nenhuma atividade/sinal/situação marcada como "Sim" ou "Não".
        </p>
      );
    }

    return responsesToDisplay.map(({ item, response }) => (
      <div key={item} className="habilidade-item-radio view-mode">
        <span className="texto-habilidade">{item}:</span>
        <div className="niveis-habilidade">
          {/* Renderizar apenas a bolinha correspondente à resposta */}
          <span
            className={`circulo-nivel ${response.replace(/\s/g, "")} ativo`} // A bolinha selecionada é sempre 'ativo'
          >
            {response}
          </span>
        </div>
      </div>
    ));
  };

  // Função para gerar o PDF da avaliação de interesses
  const handleGerarPdfAvaliacaoInteresses = useCallback(async () => {
    if (!aluno || !avaliacaoData || !currentUser) {
      setErro("Dados insuficientes para gerar o PDF.");
      return;
    }

    setGerandoPdf(true);
    setErro(null);
    try {
      // Passando avaliacaoData como um argumento separado para gerarPDFCompleto
      await gerarPDFCompleto(aluno, null, currentUser, null, avaliacaoData); // O segundo argumento 'avaliacao' é para avaliação inicial, aqui passamos null
      alert("PDF da Avaliação de Interesses gerado com sucesso!");
    } catch (pdfError) {
      console.error("Erro ao gerar PDF da Avaliação de Interesses:", pdfError);
      setErro("Erro ao gerar PDF. Verifique o console para mais detalhes.");
    } finally {
      setGerandoPdf(false);
    }
  }, [aluno, avaliacaoData, currentUser]);

  // Flag consolidada para desabilitar elementos durante carregamentos
  const carregandoGeral = carregando || carregandoAlunosFromHook || gerandoPdf;

  if (!isAuthReady) {
    return (
      <div className="view-container loading">Carregando autenticação...</div>
    );
  }

  return (
    <div className="avaliacao-container">
      <header className="avaliacao-header">
        <button onClick={() => navigate(-1)} className="back-button">
          &larr; Voltar
        </button>
        <h1>Visualização da Avaliação de Interesses e Gatilhos</h1>
        {/* Botão Gerar PDF */}
        {/* REMOVIDO: Botão Gerar PDF da Avaliação */}
        {/*
        <button
          onClick={handleGerarPdfAvaliacaoInteresses}
          className="generate-pdf-button"
          disabled={carregandoGeral || !aluno || !avaliacaoData}
        >
          {gerandoPdf ? "Gerando PDF..." : "Gerar PDF da Avaliação"}
        </button>
        */}
      </header>

      {/* Área de Mensagens de Erro */}
      {erroAlunosFromHook && (
        <div className="mensagem-erro">{erroAlunosFromHook}</div>
      )}
      {erro && <div className="mensagem-erro">{erro}</div>}

      {/* Seção de Seleção de Aluno */}
      {carregandoAlunosFromHook ? (
        <div className="loading-message">Carregando lista de alunos...</div>
      ) : (
        <SelecaoAluno
          alunos={alunosListFromHook}
          alunoSelecionado={alunoSelecionadoDropdown?.nome || ""}
          onSelecionar={handleSelecionarAlunoInterno}
          disabled={carregandoGeral}
        />
      )}

      {/* Mensagens de Carregamento de Avaliação */}
      {carregando && !carregandoAlunosFromHook && (
        <div className="loading-message">Carregando avaliação do aluno...</div>
      )}

      {/* Conteúdo Principal da Visualização (visível apenas após selecionar um aluno e carregar dados) */}
      {alunoSelecionadoDropdown && avaliacaoData && aluno ? (
        <div className="avaliacao-form">
          <h2 className="aluno-nome-header">
            Aluno: <strong>{aluno.nome || "Nome Indisponível"}</strong>
          </h2>

          {/* Seção 1: Interesses e Pontos Fortes */}
          <section className="form-section">
            <h2>Seção 1: Interesses e Pontos Fortes</h2>
            <p className="section-description">
              Esta seção visa descobrir o que a criança gosta de fazer e no que
              ela se destaca.
            </p>

            <div className="form-group">
              <label className="input-label">
                Quais são as atividades favoritas da criança?
              </label>
              {renderRadioResponses(
                ATIVIDADES_FAVORITAS_LIST,
                avaliacaoData.atividadesFavoritas
              )}
              <label className="text-input-label">
                Outras atividades (texto livre):
              </label>
              {avaliacaoData.outrasAtividades ? (
                <p className="view-text-response-box">
                  {avaliacaoData.outrasAtividades}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Quais brinquedos ou objetos a criança prefere mais?
              </label>
              {avaliacaoData.brinquedosPreferidos ? (
                <p className="view-text-response-box">
                  {avaliacaoData.brinquedosPreferidos}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Quais são os personagens, temas ou assuntos que mais chamam a
                atenção da criança? (Ex: dinossauros, carros, princesas,
                super-heróis, espaço)
              </label>
              {avaliacaoData.personagensTemasAssuntos ? (
                <p className="view-text-response-box">
                  {avaliacaoData.personagensTemasAssuntos}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Em que a criança demonstra ter habilidades ou facilidade? (Ex:
                montar coisas, memorizar, identificar padrões, resolver
                problemas, habilidades motoras finas/grossas)
              </label>
              {avaliacaoData.habilidadesFacilidades ? (
                <p className="view-text-response-box">
                  {avaliacaoData.habilidadesFacilidades}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                A criança demonstra interesse em interagir com outras pessoas?
                Se sim, de que forma? (Ex: brincadeiras em grupo,
                individualmente com um amigo, observar outros brincando)
              </label>
              {avaliacaoData.interacaoComPessoas ? (
                <p className="view-text-response-box">
                  {avaliacaoData.interacaoComPessoas}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Há alguma rotina ou ritual específico que a criança gosta ou
                busca? (Ex: sempre fazer a mesma coisa ao acordar, sentar no
                mesmo lugar para comer)
              </label>
              {avaliacaoData.rotinaRitualEspecifico ? (
                <p className="view-text-response-box">
                  {avaliacaoData.rotinaRitualEspecifico}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>
          </section>

          {/* Seção 2: Gatilhos de Desregulação e Desconforto */}
          <section className="form-section">
            <h2>Seção 2: Gatilhos de Desregulação e Desconforto</h2>
            <p className="section-description">
              Esta seção busca identificar o que pode levar a criança a se
              sentir sobrecarregada, irritada ou a ter comportamentos de
              desregulação.
            </p>

            <div className="form-group">
              <label className="input-label">
                Quais são os sinais de que a criança está começando a ficar
                desregulada ou desconfortável?
              </label>
              {renderRadioResponses(
                SINAIS_DESREGULACAO_LIST,
                avaliacaoData.sinaisDesregulacao
              )}
              <label className="text-input-label">
                Outros sinais (texto livre):
              </label>
              {avaliacaoData.outrosSinais ? (
                <p className="view-text-response-box">
                  {avaliacaoData.outrosSinais}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Quais são as situações que mais frequentemente causam
                desregulação na criança?
              </label>
              {renderRadioResponses(
                SITUACOES_DESREGULACAO_LIST,
                avaliacaoData.situacoesDesregulacao
              )}
              <label className="text-input-label">
                Outras situações (texto livre):
              </label>
              {avaliacaoData.outrasSituacoes ? (
                <p className="view-text-response-box">
                  {avaliacaoData.outrasSituacoes}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Existe alguma comida, bebida ou material específico que a
                criança rejeita fortemente?
              </label>
              {avaliacaoData.comidaBebidaMaterialRejeitado ? (
                <p className="view-text-response-box">
                  {avaliacaoData.comidaBebidaMaterialRejeitado}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                O que costuma acalmar a criança quando ela está desregulada ou
                chateada? (Ex: abraço, música, brinquedo favorito, ir para um
                local calmo, atividade específica)
              </label>
              {avaliacaoData.oQueAcalma ? (
                <p className="view-text-response-box">
                  {avaliacaoData.oQueAcalma}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Como a criança reage a mudanças na rotina ou a imprevistos?
              </label>
              {avaliacaoData.reacaoMudancasRotina ? (
                <p className="view-text-response-box">
                  {avaliacaoData.reacaoMudancasRotina}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Há algum som, imagem ou sensação que a criança evita ou tem
                aversão?
              </label>
              {avaliacaoData.somImagemSensacaoAversao ? (
                <p className="view-text-response-box">
                  {avaliacaoData.somImagemSensacaoAversao}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Descreva uma situação recente em que a criança se desregulou. O
                que aconteceu antes, durante e depois?
              </label>
              {avaliacaoData.situacaoRecenteDesregulacao ? (
                <p className="view-text-response-box">
                  {avaliacaoData.situacaoRecenteDesregulacao}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>
          </section>

          {/* Seção 3: Estratégias e Apoio */}
          <section className="form-section">
            <h2>Seção 3: Estratégias e Apoio</h2>
            <p className="section-description">
              Esta seção busca entender quais estratégias funcionam melhor para
              a criança.
            </p>

            <div className="form-group">
              <label className="input-label">
                Quais são as melhores formas de se comunicar com a criança? (Ex:
                instruções curtas, apoios visuais, comunicação aumentativa e
                alternativa, mostrar em vez de falar)
              </label>
              {avaliacaoData.melhoresFormasComunicacao ? (
                <p className="view-text-response-box">
                  {avaliacaoData.melhoresFormasComunicacao}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                O que ajuda a criança a se preparar para uma transição ou
                mudança na rotina? (Ex: aviso prévio, contagem regressiva,
                rotina visual)
              </label>
              {avaliacaoData.ajudaPrepararTransicao ? (
                <p className="view-text-response-box">
                  {avaliacaoData.ajudaPrepararTransicao}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Existe algum objeto, brinquedo ou atividade que funciona como
                "porto seguro" para a criança em momentos de estresse ou
                ansiedade?
              </label>
              {avaliacaoData.objetoBrinquedoPortoSeguro ? (
                <p className="view-text-response-box">
                  {avaliacaoData.objetoBrinquedoPortoSeguro}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Quais estratégias você utiliza para ajudar a criança a se
                regular? Quais funcionam melhor?
              </label>
              {avaliacaoData.estrategiasRegulacao ? (
                <p className="view-text-response-box">
                  {avaliacaoData.estrategiasRegulacao}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                A criança tem alguma preferência em relação a toque (abraços,
                carinhos) ou espaço personal?
              </label>
              {avaliacaoData.preferenciaToqueEspaco ? (
                <p className="view-text-response-box">
                  {avaliacaoData.preferenciaToqueEspaco}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">
                Há algo mais que você gostaria de adicionar sobre os interesses
                ou o comportamento da criança que não foi abordado?
              </label>
              {avaliacaoData.algoMaisParaAdicionar ? (
                <p className="view-text-response-box">
                  {avaliacaoData.algoMaisParaAdicionar}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">Não informado.</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="info-message text-center text-gray-600 mt-8">
          {carregandoAlunosFromHook
            ? "Carregando alunos..."
            : "Selecione um aluno para visualizar a avaliação de interesses."}
        </div>
      )}
    </div>
  );
}

export default VisualizarAvaliacaoInteressesPage;
