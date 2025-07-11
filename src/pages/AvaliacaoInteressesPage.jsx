import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/AvaliacaoInteressesPage.css";

// Firebase imports (db e auth são instâncias globais já inicializadas)
import { db, auth } from "../firebase";

// Firestore imports
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

// Importar o hook useAlunos e o componente SelecaoAluno
import { useAlunos } from "../hooks/useAlunos";
import SelecaoAluno from "../components/SelecaoAluno";
import "../styles/AvaliacaoInteressesPage.css";

// Importar o hook useAuth do seu contexto de autenticação
import { useAuth } from "../context/AuthContext"; // ASSUMA QUE ESTE HOOK EXISTE E FORNECE userId e isAuthReady

// --- Listas de Itens para Rádios ---
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

// Níveis de avaliação para as bolinhas (Sim, Não, NA)
const NIVEIS_AVALIACAO = ["Sim", "Não", "NA"];

// Função auxiliar para inicializar o estado de rádio com 'NA' para cada item
const initialRadioState = (items) => {
  const state = {};
  items.forEach((item) => {
    state[item] = "NA"; // Valor padrão para cada item: 'NA' (Não Avaliado)
  });
  return state;
};

function AvaliacaoInteressesPage() {
  const { alunoId: alunoIdFromParams } = useParams(); // Pega o ID do aluno da URL
  const navigate = useNavigate();

  // Obter userId e isAuthReady do AuthContext
  const { userId, isAuthReady } = useAuth();

  const [aluno, setAluno] = useState(null); // Aluno cujos dados estão sendo exibidos/editados
  const [alunoSelecionadoDropdown, setAlunoSelecionadoDropdown] =
    useState(null); // Aluno selecionado no dropdown
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [showViewButton, setShowViewButton] = useState(false);

  // Usar o hook useAlunos para buscar a lista de todos os alunos
  const {
    alunos: alunosListFromHook, // Renomeado para evitar conflito com 'aluno'
    carregando: carregandoAlunosFromHook,
    erro: erroAlunosFromHook,
  } = useAlunos();

  // --- Estado do Formulário ---
  const [formData, setFormData] = useState({
    atividadesFavoritas: initialRadioState(ATIVIDADES_FAVORITAS_LIST),
    outrasAtividades: "",
    brinquedosPreferidos: "",
    personagensTemasAssuntos: "",
    habilidadesFacilidades: "",
    interacaoComPessoas: "",
    rotinaRitualEspecifico: "",

    sinaisDesregulacao: initialRadioState(SINAIS_DESREGULACAO_LIST),
    outrosSinais: "",
    situacoesDesregulacao: initialRadioState(SITUACOES_DESREGULACAO_LIST),
    outrasSituacoes: "",
    comidaBebidaMaterialRejeitado: "",
    oQueAcalma: "",
    reacaoMudancasRotina: "",
    somImagemSensacaoAversao: "",
    situacaoRecenteDesregulacao: "",

    melhoresFormasComunicacao: "",
    ajudaPrepararTransicao: "",
    objetoBrinquedoPortoSeguro: "",
    estrategiasRegulacao: "",
    preferenciaToqueEspaco: "",
    algoMaisParaAdicionar: "",
  });

  // --- Efeito para pré-selecionar o aluno do URL param no dropdown ---
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

  // --- Fetch Aluno Data from Firebase (agora reage a alunoSelecionadoDropdown) ---
  useEffect(() => {
    const fetchAlunoFromFirebase = async () => {
      // Prioriza o aluno selecionado no dropdown, depois o da URL
      const currentAlunoIdToFetch =
        alunoSelecionadoDropdown?.id || alunoIdFromParams;

      if (!db || !userId || !isAuthReady || !currentAlunoIdToFetch) {
        setCarregando(false);
        return;
      }

      setCarregando(true);
      setErro(null);
      setSucesso(null); // Limpa as mensagens ao iniciar nova busca
      setShowViewButton(false);

      try {
        const appId =
          typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        let fetchedAluno = null;

        // 1. Tentar buscar o aluno no NOVO CAMINHO (user-specific)
        const newAlunoDocRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/alunos`,
          currentAlunoIdToFetch
        );
        const newAlunoDocSnap = await getDoc(newAlunoDocRef);

        if (newAlunoDocSnap.exists()) {
          fetchedAluno = { id: newAlunoDocSnap.id, ...newAlunoDocSnap.data() };
          console.log("Aluno encontrado no novo caminho:", fetchedAluno);
        } else {
          // 2. Se não encontrado no novo caminho, tentar buscar no CAMINHO ANTIGO (raiz)
          const oldAlunoDocRef = doc(db, "alunos", currentAlunoIdToFetch);
          const oldAlunoDocSnap = await getDoc(oldAlunoDocRef);

          if (oldAlunoDocSnap.exists()) {
            fetchedAluno = {
              id: oldAlunoDocSnap.id,
              ...oldAlunoDocSnap.data(),
            };
            console.log(
              "Aluno encontrado no caminho antigo (raiz):",
              fetchedAluno
            );
          }
        }

        if (fetchedAluno) {
          setAluno(fetchedAluno); // Define o aluno cujos dados estão sendo exibidos
          // Não setar alunoSelecionadoDropdown aqui para evitar loop, ele já é a origem da trigger

          const avaliacaoInteressesDocRef = doc(
            db,
            `artifacts/${appId}/users/${userId}/avaliacoesInteresses`,
            fetchedAluno.id // Usa o ID do aluno encontrado
          );
          const avaliacsesInteressesDocSnap = await getDoc(
            avaliacaoInteressesDocRef
          );

          if (avaliacsesInteressesDocSnap.exists()) {
            const loadedData = avaliacsesInteressesDocSnap.data().data;
            setFormData((prev) => ({
              ...initialRadioState(ATIVIDADES_FAVORITAS_LIST),
              ...initialRadioState(SINAIS_DESREGULACAO_LIST),
              ...initialRadioState(SITUACOES_DESREGULACAO_LIST),
              ...loadedData,
            }));
            setSucesso("Avaliação de interesses anterior carregada.");
            setShowViewButton(true);
          } else {
            // Reseta o formulário para uma nova avaliação
            setFormData({
              atividadesFavoritas: initialRadioState(ATIVIDADES_FAVORITAS_LIST),
              outrasAtividades: "",
              brinquedosPreferidos: "",
              personagensTemasAssuntos: "",
              habilidadesFacilidades: "",
              interacaoComPessoas: "",
              rotinaRitualEspecifico: "",

              sinaisDesregulacao: initialRadioState(SINAIS_DESREGULACAO_LIST),
              outrosSinais: "",
              situacoesDesregulacao: initialRadioState(
                SITUACOES_DESREGULACAO_LIST
              ),
              outrasSituacoes: "",
              comidaBebidaMaterialRejeitado: "",
              oQueAcalma: "",
              reacaoMudancasRotina: "",
              somImagemSensacaoAversao: "",
              situacaoRecenteDesregulacao: "",

              melhoresFormasComunicacao: "",
              ajudaPrepararTransicao: "",
              objetoBrinquedoPortoSeguro: "",
              estrategiasRegulacao: "",
              preferenciaToqueEspaco: "",
              algoMaisParaAdicionar: "",
            });
            setSucesso(
              "Inicie uma nova avaliação de interesses para este aluno."
            );
            setShowViewButton(false);
          }
        } else {
          setErro("");
          setAluno(null);
          // Não resetar alunoSelecionadoDropdown aqui, ele deve manter a seleção do dropdown
        }
      } catch (error) {
        console.error(
          "Erro ao carregar aluno ou avaliação de interesses do Firebase:",
          error
        );
        setErro(
          "Erro ao carregar dados do aluno ou avaliação. Tente novamente."
        );
        setAluno(null);
        // Não resetar alunoSelecionadoDropdown aqui
      } finally {
        setCarregando(false);
      }
    };

    // Só busca se a autenticação estiver pronta E (um aluno foi selecionado OU um ID veio da URL)
    if (
      db &&
      userId &&
      isAuthReady &&
      (alunoSelecionadoDropdown || alunoIdFromParams)
    ) {
      fetchAlunoFromFirebase();
    } else if (isAuthReady && !alunoSelecionadoDropdown && !alunoIdFromParams) {
      // Se a autenticação estiver pronta mas nenhum aluno foi selecionado/passado, pare de carregar
      setCarregando(false);
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
      setAluno(null); // Limpa o aluno atual para forçar o useEffect a carregar o novo

      // Resetar o formulário para uma nova avaliação ao mudar de aluno
      setFormData({
        atividadesFavoritas: initialRadioState(ATIVIDADES_FAVORITAS_LIST),
        outrasAtividades: "",
        brinquedosPreferidos: "",
        personagensTemasAssuntos: "",
        habilidadesFacilidades: "",
        interacaoComPessoas: "",
        rotinaRitualEspecifico: "",

        sinaisDesregulacao: initialRadioState(SINAIS_DESREGULACAO_LIST),
        outrosSinais: "",
        situacoesDesregulacao: initialRadioState(SITUACOES_DESREGULACAO_LIST),
        outrasSituacoes: "",
        comidaBebidaMaterialRejeitado: "",
        oQueAcalma: "",
        reacaoMudancasRotina: "",
        somImagemSensacaoAversao: "",
        situacaoRecenteDesregulacao: "",

        melhoresFormasComunicacao: "",
        ajudaPrepararTransicao: "",
        objetoBrinquedoPortoSeguro: "",
        estrategiasRegulacao: "",
        preferenciaToqueEspaco: "",
        algoMaisParaAdicionar: "",
      });
      setShowViewButton(false);
    },
    [alunosListFromHook]
  );

  // Handler genérico para inputs de texto e textareas
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Handler para botões de rádio (bolinhas)
  const handleRadioChange = useCallback((e) => {
    const { name, value, dataset } = e.target;
    const itemKey = dataset.itemKey;
    const listName = dataset.listName;

    setFormData((prev) => ({
      ...prev,
      [listName]: {
        ...prev[listName],
        [itemKey]: value,
      },
    }));
  }, []);

  // --- Função para Salvar o Formulário no Firebase ---
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      // Usa alunoSelecionadoDropdown para garantir que um aluno está de fato selecionado para salvar
      if (!alunoSelecionadoDropdown || !db || !userId) {
        setErro("Sistema não pronto ou aluno não selecionado para salvar.");
        return;
      }

      setSalvando(true);
      setErro(null);
      setSucesso(null);
      setShowViewButton(false);

      try {
        const appId =
          typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const avaliacaoInteressesDocRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/avaliacoesInteresses`,
          alunoSelecionadoDropdown.id // Usa o ID do aluno do dropdown
        );

        await setDoc(avaliacaoInteressesDocRef, {
          alunoId: alunoSelecionadoDropdown.id,
          data: formData,
          dataAvaliacao: new Date().toISOString(),
          salvoPor: userId,
        });

        setSucesso("Avaliação de Interesses salva com sucesso no Firebase!");
        setShowViewButton(true);
        setTimeout(() => setSucesso(null), 3000);
      } catch (error) {
        console.error(
          "Erro ao salvar avaliação de interesses no Firebase:",
          error
        );
        setErro("Erro ao salvar avaliação. Tente novamente.");
      } finally {
        setSalvando(false);
      }
    },
    [alunoSelecionadoDropdown, db, userId, formData]
  );

  // Função para navegar para a página de visualização
  const handleVisualizarAvaliacao = useCallback(() => {
    if (alunoSelecionadoDropdown && alunoSelecionadoDropdown.id) {
      navigate(`/visualizar-interesses/${alunoSelecionadoDropdown.id}`);
    } else {
      setErro(
        "Não foi possível visualizar a avaliação: Aluno não identificado."
      );
    }
  }, [alunoSelecionadoDropdown, navigate]);

  // NOVO: Função para navegar para a página de Ver Avaliações de Interesses
  const handleVerAvaliacoesInteresses = useCallback(() => {
    // Navega para a página de visualização de interesses sem um ID específico.
    // Lá, o usuário poderá selecionar um aluno no dropdown.
    navigate("/visualizar-interesses");
  }, [navigate]);

  // Flag consolidada para desabilitar elementos durante carregamentos e salvamentos
  const carregandoGeral = carregando || salvando || carregandoAlunosFromHook;

  if (!isAuthReady) {
    return (
      <div className="avaliacao-container loading">
        Carregando autenticação...
      </div>
    );
  }

  return (
    <div className="avaliacao-container">
      <header className="avaliacao-header">
        <button
          onClick={() => navigate(-1)}
          className="back-button"
          disabled={salvando}
        >
          &larr; Voltar
        </button>
        <h1>Avaliação de Interesses e Gatilhos</h1> {/* Título centralizado */}
        {/* Agrupar os botões do lado direito para melhor controle de layout */}
        <div className="header-buttons-group right-aligned-buttons">
          {/* Botão Ver Avaliações de Interesses */}
          <button
            onClick={handleVerAvaliacoesInteresses}
            className="view-all-button"
            disabled={salvando}
          >
            Ver Avaliações de Interesses
          </button>
          {/* Botão de Visualizar Avaliação (aparece após salvar) */}
          {showViewButton && alunoSelecionadoDropdown && (
            <button
              type="button"
              onClick={handleVisualizarAvaliacao}
              className="view-evaluation-button"
              disabled={salvando}
            >
              Visualizar Avaliação Salva
            </button>
          )}
        </div>
      </header>

      {/* Área de Mensagens de Erro/Sucesso */}
      {erroAlunosFromHook && (
        <div className="mensagem-erro">{erroAlunosFromHook}</div>
      )}
      {erro && <div className="mensagem-erro">{erro}</div>}
      {sucesso && (
        <div className="mensagem-sucesso success-message">{sucesso}</div>
      )}

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

      {/* Conteúdo Principal da Avaliação (visível apenas após selecionar um aluno) */}
      {alunoSelecionadoDropdown && (
        <form onSubmit={handleSubmit} className="avaliacao-form">
          {/* Informações do Aluno Selecionado */}
          <h2 className="aluno-nome-header">
            Aluno: {alunoSelecionadoDropdown.nome || "Nome Indisponível"}
          </h2>
          {/* Você pode adicionar a idade aqui se o objeto alunoSelecionadoDropdown tiver essa informação */}
          {/* <p className="aluno-idade">Idade: {alunoSelecionadoDropdown.idade} anos</p> */}

          {/* Seção 1: Interesses e Pontos Fortes */}
          <section className="form-section">
            <h2>Seção 1: Interesses e Pontos Fortes</h2>
            <p className="section-description"></p>

            <div className="form-group">
              <label className="input-label">
                Quais são as atividades favoritas da criança?
              </label>
              {ATIVIDADES_FAVORITAS_LIST.map((activity) => (
                <div key={activity} className="habilidade-item-radio">
                  <span className="texto-habilidade">{activity}</span>
                  <div className="niveis-habilidade">
                    {NIVEIS_AVALIACAO.map((nivel) => (
                      <label
                        key={nivel}
                        className={`circulo-nivel ${nivel.replace(/\s/g, "")} ${formData.atividadesFavoritas[activity] === nivel ? "ativo" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`atividadesFavoritas-${activity}`}
                          data-item-key={activity}
                          data-list-name="atividadesFavoritas"
                          value={nivel}
                          checked={
                            formData.atividadesFavoritas[activity] === nivel
                          }
                          onChange={handleRadioChange}
                          disabled={salvando}
                          className="hidden-radio-input"
                        />
                        {nivel}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <label className="text-input-label">
                Outras atividades (texto livre):
              </label>
              <input
                type="text"
                name="outrasAtividades"
                value={formData.outrasAtividades}
                onChange={handleChange}
                disabled={salvando}
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                Quais brinquedos ou objetos a criança prefere mais?
              </label>
              <textarea
                name="brinquedosPreferidos"
                value={formData.brinquedosPreferidos}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                Quais são os personagens, temas ou assuntos que mais chamam a
                atenção da criança? (Ex: dinossauros, carros, princesas,
                super-heróis, espaço)
              </label>
              <textarea
                name="personagensTemasAssuntos"
                value={formData.personagensTemasAssuntos}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                Em que a criança demonstra ter habilidades ou facilidade? (Ex:
                montar coisas, memorizar, identificar padrões, resolver
                problemas, habilidades motoras finas/grossas)
              </label>
              <textarea
                name="habilidadesFacilidades"
                value={formData.habilidadesFacilidades}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                A criança demonstra interesse em interagir com outras pessoas?
                Se sim, de que forma? (Ex: brincadeiras em grupo,
                individualmente com um amigo, observar outros brincando)
              </label>
              <textarea
                name="interacaoComPessoas"
                value={formData.interacaoComPessoas}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                Há alguma rotina ou ritual específico que a criança gosta ou
                busca? (Ex: sempre fazer a mesma coisa ao acordar, sentar no
                mesmo lugar para comer)
              </label>
              <textarea
                name="rotinaRitualEspecifico"
                value={formData.rotinaRitualEspecifico}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>
          </section>

          {/* Seção 2: Gatilhos de Desregulação e Desconforto */}
          <section className="form-section">
            <h2>Seção 2: Gatilhos de Desregulação e Desconforto</h2>
            <p className="section-description"></p>

            <div className="form-group">
              <label className="input-label">
                Quais são os sinais de que a criança está começando a ficar
                desregulada ou desconfortável?
              </label>
              {SINAIS_DESREGULACAO_LIST.map((sign) => (
                <div key={sign} className="habilidade-item-radio">
                  <span className="texto-habilidade">{sign}</span>
                  <div className="niveis-habilidade">
                    {NIVEIS_AVALIACAO.map((nivel) => (
                      <label
                        key={nivel}
                        className={`circulo-nivel ${nivel.replace(/\s/g, "")} ${formData.sinaisDesregulacao[sign] === nivel ? "ativo" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`sinaisDesregulacao-${sign}`}
                          data-item-key={sign}
                          data-list-name="sinaisDesregulacao"
                          value={nivel}
                          checked={formData.sinaisDesregulacao[sign] === nivel}
                          onChange={handleRadioChange}
                          disabled={salvando}
                          className="hidden-radio-input"
                        />
                        {nivel}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <label className="text-input-label">
                Outros sinais (texto livre):
              </label>
              <input
                type="text"
                name="outrosSinais"
                value={formData.outrosSinais}
                onChange={handleChange}
                disabled={salvando}
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                Quais são as situações que mais frequentemente causam
                desregulação na criança?
              </label>
              {SITUACOES_DESREGULACAO_LIST.map((situation) => (
                <div key={situation} className="habilidade-item-radio">
                  <span className="texto-habilidade">{situation}</span>
                  <div className="niveis-habilidade">
                    {NIVEIS_AVALIACAO.map((nivel) => (
                      <label
                        key={nivel}
                        className={`circulo-nivel ${nivel.replace(/\s/g, "")} ${formData.situacoesDesregulacao[situation] === nivel ? "ativo" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`situacoesDesregulacao-${situation}`}
                          data-item-key={situation}
                          data-list-name="situacoesDesregulacao"
                          value={nivel}
                          checked={
                            formData.situacoesDesregulacao[situation] === nivel
                          }
                          onChange={handleRadioChange}
                          disabled={salvando}
                          className="hidden-radio-input"
                        />
                        {nivel}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <label className="text-input-label">
                Outras situações (texto livre):
              </label>
              <input
                type="text"
                name="outrasSituacoes"
                value={formData.outrasSituacoes}
                onChange={handleChange}
                disabled={salvando}
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label className="input-label">
                Existe alguma comida, bebida ou material específico que a
                criança rejeita fortemente?
              </label>
              <textarea
                name="comidaBebidaMaterialRejeitado"
                value={formData.comidaBebidaMaterialRejeitado}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                O que costuma acalmar a criança quando ela está desregulada ou
                chateada? (Ex: abraço, música, brinquedo favorito, ir para um
                local calmo, atividade específica)
              </label>
              <textarea
                name="oQueAcalma"
                value={formData.oQueAcalma}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                Como a criança reage a mudanças na rotina ou a imprevistos?
              </label>
              <textarea
                name="reacaoMudancasRotina"
                value={formData.reacaoMudancasRotina}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                Há algum som, imagem ou sensação que a criança evita ou tem
                aversão?
              </label>
              <textarea
                name="somImagemSensacaoAversao"
                value={formData.somImagemSensacaoAversao}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                Descreva uma situação recente em que a criança se desregulou. O
                que aconteceu antes, durante e depois?
              </label>
              <textarea
                name="situacaoRecenteDesregulacao"
                value={formData.situacaoRecenteDesregulacao}
                onChange={handleChange}
                rows="3"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>
          </section>

          {/* Seção 3: Estratégias e Apoio */}
          <section className="form-section">
            <h2>Seção 3: Estratégias e Apoio</h2>
            <p className="section-description"></p>

            <div className="form-group">
              <label className="input-label">
                Quais são as melhores formas de se comunicar com a criança? (Ex:
                instruções curtas, apoios visuais, comunicação aumentativa e
                alternativa, mostrar em vez de falar)
              </label>
              <textarea
                name="melhoresFormasComunicacao"
                value={formData.melhoresFormasComunicacao}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                O que ajuda a criança a se preparar para uma transição ou
                mudança na rotina? (Ex: aviso prévio, contagem regressiva,
                rotina visual)
              </label>
              <textarea
                name="ajudaPrepararTransicao"
                value={formData.ajudaPrepararTransicao}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                Existe algum objeto, brinquedo ou atividade que funciona como
                "porto seguro" para a criança em momentos de estresse ou
                ansiedade?
              </label>
              <textarea
                name="objetoBrinquedoPortoSeguro"
                value={formData.objetoBrinquedoPortoSeguro}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                Quais estratégias você utiliza para ajudar a criança a se
                regular? Quais funcionam melhor?
              </label>
              <textarea
                name="estrategiasRegulacao"
                value={formData.estrategiasRegulacao}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                A criança tem alguma preferência em relação a toque (abraços,
                carinhos) ou espaço personal?
              </label>
              <textarea
                name="preferenciaToqueEspaco"
                value={formData.preferenciaToqueEspaco}
                onChange={handleChange}
                rows="2"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="input-label">
                Há algo mais que você gostaria de adicionar sobre os interesses
                ou o comportamento da criança que não foi abordado?
              </label>
              <textarea
                name="algoMaisParaAdicionar"
                value={formData.algoMaisParaAdicionar}
                onChange={handleChange}
                rows="3"
                disabled={salvando}
                className="text-input"
              ></textarea>
            </div>
          </section>

          <button
            type="submit"
            disabled={salvando || !alunoSelecionadoDropdown}
            className="submit-button"
          >
            {salvando ? "Salvando..." : "Salvar Avaliação de Interesses"}
          </button>

          {/* Botão de Visualizar Avaliação */}
          {showViewButton && alunoSelecionadoDropdown && (
            <button
              type="button"
              onClick={handleVisualizarAvaliacao}
              className="view-evaluation-button"
              disabled={salvando}
            >
              Visualizar Avaliação Salva
            </button>
          )}
        </form>
      )}
    </div>
  );
}

export default AvaliacaoInteressesPage;
