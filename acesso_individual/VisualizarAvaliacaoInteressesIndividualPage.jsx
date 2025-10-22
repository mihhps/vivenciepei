import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAlunos } from "../hooks/useAlunos";
import SelecaoAluno from "../components/SelecaoAluno";
import "../styles/AvaliacaoInteressesPage.css";
import { useAuth } from "../context/AuthContext";
import { gerarPDFCompleto } from "../utils/gerarPDFCompleto";
import styled from "styled-components";
import { FaFilePdf } from "react-icons/fa";

// --- ROTAS ADAPTADAS PARA O MÓDULO INDIVIDUAL ---
const ROTA_PAINEL_INDIVIDUAL = "/painel-individual";
const ROTA_VISUALIZAR_AVALIACOES = "/ver-avaliacoes-individual";

// --- NOVOS COMPONENTES ESTILIZADOS (MANTIDOS) ---
const FormActions = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
`;

const PdfButtonContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background-color: #457b9d;
  color: #fff;
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.3s ease;

  &:hover {
    background-color: #3b6883;
    transform: scale(1.05);
  }
`;

const TooltipText = styled.span`
  visibility: hidden;
  width: 200px;
  background-color: #555;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px;
  position: absolute;
  z-index: 1;
  bottom: 120%;
  left: 50%;
  margin-left: -100px;
  opacity: 0;
  transition: opacity 0.3s;
  font-size: 0.9em;

  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #555 transparent transparent transparent;
  }

  ${PdfButtonContainer}:hover & {
    visibility: visible;
    opacity: 1;
  }
`;

const HeaderButtonsGroup = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const BackButton = styled.button`
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  background-color: #f0f0f0;
  color: #333;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #e0e0e0;
  }
`;

const PageTitle = styled.h1`
  font-size: 1.5em;
  margin: 0;
`;

const AvaliacaoHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
`;

const AvaliacaoContainer = styled.div`
  max-width: 900px;
  margin: 40px auto;
  padding: 30px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-family: "Segoe UI", sans-serif;
`;
// --- FIM DOS COMPONENTES ESTILIZADOS ---

// --- Listas de Itens para Rádios (MANTIDAS) ---
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

function VisualizarAvaliacaoInteressesIndividualPage() {
  const { alunoId: alunoIdFromParams } = useParams();
  const navigate = useNavigate();
  const { userId, isAuthReady, currentUser } = useAuth();

  const [aluno, setAluno] = useState(null);
  const [alunoSelecionadoDropdown, setAlunoSelecionadoDropdown] =
    useState(null);
  const [avaliacaoData, setAvaliacaoData] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const {
    alunos: alunosListFromHook,
    carregando: carregandoAlunosFromHook,
    erro: erroAlunosFromHook,
  } = useAlunos();

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

  useEffect(() => {
    const fetchData = async () => {
      const currentAlunoIdToFetch =
        alunoSelecionadoDropdown?.id || alunoIdFromParams;

      if (!isAuthReady || !currentAlunoIdToFetch) {
        setCarregando(false);
        return;
      }

      setCarregando(true);
      setErro(null);
      setAvaliacaoData(null);
      setAluno(null);

      try {
        // Busca os dados do aluno
        const alunoDocRef = doc(db, "alunos", currentAlunoIdToFetch);
        const alunoDocSnap = await getDoc(alunoDocRef);

        if (!alunoDocSnap.exists()) {
          setErro("Aluno não encontrado.");
          setCarregando(false);
          return;
        }
        const fetchedAluno = { id: alunoDocSnap.id, ...alunoDocSnap.data() };
        setAluno(fetchedAluno);

        // Busca a avaliação de interesses
        const appId =
          typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const avaliacaoDocPath = `artifacts/${appId}/public/data/avaliacoesInteresses/${fetchedAluno.id}`;
        const avaliacaoDocRef = doc(db, avaliacaoDocPath);
        const avaliacaoDocSnap = await getDoc(avaliacaoDocRef);

        if (avaliacaoDocSnap.exists()) {
          // Acessa o campo 'data' dentro do documento da avaliação.
          setAvaliacaoData(avaliacaoDocSnap.data().data);
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

    if (isAuthReady) {
      fetchData();
    } else {
      setCarregando(false);
    }
  }, [isAuthReady, alunoIdFromParams, alunoSelecionadoDropdown]);

  const handleSelecionarAlunoInterno = useCallback(
    (event) => {
      const selectedAlunoNome = event.target.value;
      const foundAluno = alunosListFromHook.find(
        (aluno) => aluno.nome === selectedAlunoNome
      );
      if (foundAluno) {
        // ROTA ADAPTADA para o novo módulo
        navigate(`/individual/visualizar-interesses/${foundAluno.id}`);
        setAlunoSelecionadoDropdown(foundAluno);
      }
      setErro(null);
    },
    [alunosListFromHook, navigate]
  );

  const renderRadioResponses = (list, dataObject) => {
    if (!dataObject) return null;
    const responsesToDisplay = [];
    list.forEach((item) => {
      const response = dataObject[item];
      if (response === "Sim" || response === "Não") {
        responsesToDisplay.push({ item, response });
      }
    });

    if (responsesToDisplay.length === 0) {
      return (
        <p className="text-gray-500 italic text-sm mt-2">
          Nenhuma resposta 'Sim' ou 'Não' para esta seção.
        </p>
      );
    }

    return responsesToDisplay.map(({ item, response }) => (
      <div key={item} className="habilidade-item-radio view-mode">
        <span className="texto-habilidade">{item}:</span>
        <div className="niveis-habilidade">
          <span
            className={`circulo-nivel ${response.replace(/\s/g, "")} ativo`}
          >
            {response}
          </span>
        </div>
      </div>
    ));
  };

  const handleGerarPdfAvaliacaoInteresses = useCallback(async () => {
    if (!aluno || !avaliacaoData || !currentUser) {
      setErro(
        "Dados do aluno ou da avaliação estão faltando para gerar o PDF."
      );
      return;
    }
    setGerandoPdf(true);
    try {
      await gerarPDFCompleto({
        aluno,
        avaliacaoInteresses: avaliacaoData,
        // Passa o nome do criador, que é o nome do professor individual
        responsavel: currentUser.nome || "Professor Individual",
      });
    } catch (pdfError) {
      console.error("Erro ao gerar PDF:", pdfError);
      setErro("Ocorreu um erro ao gerar o PDF.");
    } finally {
      setGerandoPdf(false);
    }
  }, [aluno, avaliacaoData, currentUser]);

  const carregandoGeral = carregando || carregandoAlunosFromHook;

  if (!isAuthReady) {
    return (
      <div className="view-container loading">Carregando autenticação...</div>
    );
  }

  return (
    <div className="avaliacao-container">
      <AvaliacaoHeader>
        {/* ROTA ADAPTADA: Volta para o painel principal do módulo individual */}
        <BackButton onClick={() => navigate(ROTA_PAINEL_INDIVIDUAL)}>
          &larr; Voltar ao Painel
        </BackButton>
        <PageTitle>
          Visualização da Avaliação de Interesses e Gatilhos
        </PageTitle>
        <HeaderButtonsGroup>
          {alunoSelecionadoDropdown && avaliacaoData && (
            <PdfButtonContainer
              onClick={handleGerarPdfAvaliacaoInteresses}
              role="button"
              aria-label="Gerar PDF Completo da Avaliação"
              disabled={gerandoPdf}
            >
              <FaFilePdf size={20} color="#f4f4f4" />
              <TooltipText>Gerar PDF Completo</TooltipText>
            </PdfButtonContainer>
          )}
        </HeaderButtonsGroup>
      </AvaliacaoHeader>

      {erroAlunosFromHook && (
        <div className="mensagem-erro">{erroAlunosFromHook}</div>
      )}
      {erro && <div className="mensagem-erro">{erro}</div>}

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

      {carregando && !carregandoAlunosFromHook && (
        <div className="loading-message">Carregando avaliação do aluno...</div>
      )}

      {alunoSelecionadoDropdown && avaliacaoData && aluno ? (
        <div className="avaliacao-form">
          <h2 className="aluno-nome-header">
            Aluno: <strong>{aluno.nome || "Nome Indisponível"}</strong>
          </h2>

          <FormActions>{/* O botão foi movido para o cabeçalho */}</FormActions>

          <section className="form-section">
            <h2>Seção 1: Interesses e Pontos Fortes</h2>

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
                atenção da criança?
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
                Em que a criança demonstra ter habilidades ou facilidade?
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
                Se sim, de que forma?
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
                busca?
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

          <section className="form-section">
            <h2>Seção 2: Gatilhos de Desregulação e Desconforto</h2>

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
                chateada?
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

          <section className="form-section">
            <h2>Seção 3: Estratégias e Apoio</h2>

            <div className="form-group">
              <label className="input-label">
                Quais são as melhores formas de se comunicar com a criança?
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
                mudança na rotina?
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
                "porto seguro" para a criança?
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
                regular?
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
                A criança tem alguma preferência em relação a toque ou espaço
                pessoal?
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
                Há algo mais que você gostaria de adicionar?
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
        !carregando && (
          <div className="info-message text-center text-gray-600 mt-8">
            {carregandoAlunosFromHook
              ? "Carregando alunos..."
              : "Selecione um aluno para visualizar a avaliação de interesses."}
          </div>
        )
      )}
    </div>
  );
}

export default VisualizarAvaliacaoInteressesIndividualPage;
