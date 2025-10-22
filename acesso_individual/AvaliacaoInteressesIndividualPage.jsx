import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/AvaliacaoInteressesPage.css";

import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FaFilePdf } from "react-icons/fa";

import { useAlunos } from "../hooks/useAlunos";
import SelecaoAluno from "../components/SelecaoAluno";
import { useAuth } from "../context/AuthContext"; // Mantido, pois a autenticação é global
import styled from "styled-components";

import {
  ATIVIDADES_FAVORITAS_LIST,
  SINAIS_DESREGULACAO_LIST,
  SITUACOES_DESREGULACAO_LIST,
  NIVEIS_AVALIACAO,
} from "../constants/avaliacaoConstants";

import { gerarPDFAvaliacaoInteressesParaPreencher } from "../utils/pdfGeneratorInteresses";

// --- NOVOS COMPONENTES ESTILIZADOS (MANTIDOS) ---
// (Todos os componentes estilizados como BotaoGerarPdf, FormActions, etc. permanecem inalterados aqui)
// ... [Mantenha a definição de todos os componentes estilizados (styled.div, styled.button, etc.) AQUI] ...

const BotaoGerarPdf = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #457b9d;
  color: #fff;
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  &:hover:enabled {
    background-color: #3b6883;
  }
`;

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

const HeaderButton = styled.button`
  background-color: #457b9d;
  color: #fff;
  padding: 8px 15px;
  border: none;
  border-radius: 8px;
  font-size: 0.9em;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  &:hover:enabled {
    background-color: #3b6883;
  }
`;

const AvaliacaoHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
`;

const HeaderTitle = styled.h1`
  color: #1d3557;
  font-size: 1.8em;
  font-weight: 600;
  margin: 0;
  flex-grow: 1;
  text-align: center;
`;

const BackButton = styled.button`
  background: none;
  border: 1px solid #ccc;
  color: #1d3557;
  padding: 8px 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f0f0f0;
  }
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

const SubmitButton = styled.button`
  width: 100%;
  padding: 15px;
  background-color: #00264d;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 30px;

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  &:hover:enabled {
    background-color: #001a36;
  }
`;

const ErrorMessage = styled.div`
  background-color: #f8d7da;
  color: #721c24;
  padding: 15px;
  margin: 20px 0;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
`;

const SuccessMessage = styled.div`
  background-color: #d4edda;
  color: #155724;
  padding: 15px;
  margin: 20px 0;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
`;

const InfoMessage = styled.div`
  background-color: #e7f3ff;
  color: #0c5460;
  padding: 15px;
  margin: 20px 0;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
`;

const FormSection = styled.section`
  margin-top: 30px;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;

  h2 {
    color: #1d3557;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 10px;
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 1.5em;
  }

  p.section-description {
    color: #555;
    margin-bottom: 20px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const InputLabel = styled.label`
  font-weight: 600;
  color: #1d3557;
  display: block;
  margin-bottom: 8px;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1em;
  box-sizing: border-box;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1em;
  box-sizing: border-box;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const RadioWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const RadioOptions = styled.div`
  display: flex;
  gap: 5px;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 45px;
  height: 35px;
  border-radius: 18px;
  font-size: 0.9em;
  font-weight: bold;
  cursor: pointer;
  border: 1px solid #ccc;
  transition: all 0.2s ease;

  background-color: ${(props) =>
    props.checked ? (props.value === "Sim" ? "#28a745" : "#dc3545") : "#fff"};
  color: ${(props) => (props.checked ? "#fff" : "#555")};

  &:hover {
    border-color: #007bff;
  }
`;

// --- FIM DOS COMPONENTES ESTILIZADOS ---

const getInitialFormData = () => {
  const initialRadioState = (items) =>
    items.reduce((acc, item) => {
      acc[item] = "NA";
      return acc;
    }, {});

  return {
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
  };
};

function AvaliacaoInteressesIndividualPage() {
  // RENOMEADO
  const { alunoId: alunoIdFromParams } = useParams();
  const navigate = useNavigate();
  const { userId, isAuthReady, isLoadingProfile } = useAuth();

  const [aluno, setAluno] = useState(null);
  const [alunoSelecionadoDropdown, setAlunoSelecionadoDropdown] =
    useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [showViewButton, setShowViewButton] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {
    alunos: alunosListFromHook,
    carregando: carregandoAlunosFromHook,
    erro: erroAlunosFromHook,
  } = useAlunos(); // NOTA: Este hook precisa ser adaptado (ver abaixo)

  const [formData, setFormData] = useState(getInitialFormData());
  const [originalData, setOriginalData] = useState(getInitialFormData());

  // --- ROTAS ADAPTADAS PARA O MÓDULO INDIVIDUAL ---
  const ROTA_VISUALIZAR = "/individual/visualizar-interesses";
  const ROTA_PAINEL = "/individual/painel";
  const ROTA_NOVA_AVALIACAO = "/individual/nova-avaliacao";

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
        setShowForm(true);
      }
    }
  }, [alunoIdFromParams, alunosListFromHook, alunoSelecionadoDropdown]);

  useEffect(() => {
    const fetchAlunoAndInteresses = async () => {
      const currentAlunoIdToFetch =
        alunoSelecionadoDropdown?.id || alunoIdFromParams;

      if (!currentAlunoIdToFetch) {
        setCarregando(false);
        setErro(null);
        setSucesso(null);
        return;
      }

      if (!isAuthReady || isLoadingProfile || !userId) {
        setCarregando(false);
        return;
      }

      setCarregando(true);
      setErro(null);
      setSucesso(null);

      try {
        const alunoDocRef = doc(db, "alunos", currentAlunoIdToFetch);
        const alunoDocSnap = await getDoc(alunoDocRef);

        if (alunoDocSnap.exists()) {
          const fetchedAluno = { id: alunoDocSnap.id, ...alunoDocSnap.data() };
          setAluno(fetchedAluno);

          // ATENÇÃO: Se você usa o __app_id, ele deve ser consistente no módulo individual.
          // Ou, se o novo módulo não usar 'artifacts/{appId}/public/data',
          // você deve simplificar o caminho. Assumiremos a estrutura antiga por enquanto.
          const appId =
            typeof __app_id !== "undefined" ? __app_id : "default-app-id";
          const avaliacaoDocPath = `artifacts/${appId}/public/data/avaliacoesInteresses/${fetchedAluno.id}`;
          const avaliacaoDocRef = doc(db, avaliacaoDocPath);
          const avaliacaoDocSnap = await getDoc(avaliacaoDocRef);

          const loadedInteressesData = avaliacaoDocSnap.exists()
            ? avaliacaoDocSnap.data()
            : null;

          if (loadedInteressesData) {
            const formDataFromDb = loadedInteressesData.data;
            const fullFormData = { ...getInitialFormData(), ...formDataFromDb };
            setFormData(fullFormData);
            setOriginalData(fullFormData);
            setSucesso("Avaliação de interesses anterior carregada.");
            setShowViewButton(true);
          } else {
            const initialData = getInitialFormData();
            setFormData(initialData);
            setOriginalData(initialData);
            setSucesso(
              "Inicie uma nova avaliação de interesses para este aluno."
            );
            setShowViewButton(false);
          }
        } else {
          setErro("Aluno não encontrado no Firebase.");
          setAluno(null);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setErro("Erro ao carregar dados. Tente novamente.");
        const initialData = getInitialFormData();
        setFormData(initialData);
        setOriginalData(initialData);
        setShowViewButton(false);
      } finally {
        setCarregando(false);
      }
    };

    fetchAlunoAndInteresses();
  }, [
    userId,
    isAuthReady,
    isLoadingProfile,
    alunoIdFromParams,
    alunoSelecionadoDropdown,
  ]);

  const handleSelecionarAlunoInterno = useCallback(
    (event) => {
      const hasUnsavedChanges =
        JSON.stringify(originalData) !== JSON.stringify(formData);

      if (
        hasUnsavedChanges &&
        !window.confirm(
          "Você tem alterações não salvas. Deseja continuar e descartá-las?"
        )
      ) {
        return;
      }

      const selectedAlunoNome = event.target.value;
      const foundAluno = alunosListFromHook.find(
        (aluno) => aluno.nome === selectedAlunoNome
      );

      if (foundAluno) {
        // Rota adaptada
        navigate(`${ROTA_NOVA_AVALIACAO}/${foundAluno.id}`);
        setAlunoSelecionadoDropdown(foundAluno);
        setShowForm(true);
      } else {
        setAlunoSelecionadoDropdown(null);
        setShowForm(false);
      }
    },
    [formData, originalData, alunosListFromHook, navigate]
  );

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRadioChange = useCallback((e) => {
    const { value, dataset } = e.target;
    const { itemKey, listName } = dataset;
    setFormData((prev) => ({
      ...prev,
      [listName]: { ...prev[listName], [itemKey]: value },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!alunoSelecionadoDropdown || !userId) {
        setErro("Aluno não selecionado ou usuário não autenticado.");
        return;
      }

      setSalvando(true);
      setErro(null);

      try {
        const appId =
          typeof __app_id !== "undefined" ? __app_id : "default-app-id";

        const collectionPath = `artifacts/${appId}/public/data/avaliacoesInteresses`;
        const avaliacaoDocRef = doc(
          db,
          collectionPath,
          alunoSelecionadoDropdown.id
        );

        await setDoc(avaliacaoDocRef, {
          alunoId: alunoSelecionadoDropdown.id,
          data: formData,
          dataAvaliacao: new Date().toISOString(),
          salvoPor: userId,
          // ADICIONADO: Campo para identificar o criador/contexto individual
          contexto: "Individual",
          criadorId: userId,
        });

        setOriginalData(formData);
        setSucesso("Avaliação salva com sucesso!");
        setShowViewButton(true);
      } catch (error) {
        console.error("Erro ao salvar avaliação:", error);
        setErro("Erro ao salvar. Tente novamente.");
      } finally {
        setSalvando(false);
      }
    },
    [alunoSelecionadoDropdown, userId, formData]
  );

  const handleVisualizarAvaliacao = useCallback(() => {
    if (alunoSelecionadoDropdown?.id) {
      // Rota adaptada
      navigate(`${ROTA_VISUALIZAR}/${alunoSelecionadoDropdown.id}`);
    }
  }, [alunoSelecionadoDropdown, navigate]);

  const handleGerarPDFManual = useCallback(() => {
    if (alunoSelecionadoDropdown) {
      gerarPDFAvaliacaoInteressesParaPreencher({
        aluno: alunoSelecionadoDropdown,
      });
    } else {
      setErro("Selecione um aluno para gerar a ficha de avaliação.");
    }
  }, [alunoSelecionadoDropdown]);

  if (!isAuthReady || isLoadingProfile) {
    return (
      <div className="avaliacao-container loading">
        Carregando autenticação e perfil...
      </div>
    );
  }

  return (
    <AvaliacaoContainer>
      <AvaliacaoHeader>
        <BackButton onClick={() => navigate(ROTA_PAINEL)} disabled={salvando}>
          &larr; Voltar ao Painel
        </BackButton>
        <HeaderTitle>Avaliação de Interesses e Gatilhos</HeaderTitle>
        <HeaderButtonsGroup>
          <HeaderButton
            onClick={() => navigate(ROTA_VISUALIZAR)}
            disabled={salvando}
          >
            Ver Avaliações
          </HeaderButton>
          {showViewButton && alunoSelecionadoDropdown && (
            <HeaderButton
              type="button"
              onClick={handleVisualizarAvaliacao}
              disabled={salvando}
            >
              Visualizar Salva
            </HeaderButton>
          )}
          {alunoSelecionadoDropdown && (
            <PdfButtonContainer
              onClick={handleGerarPDFManual}
              role="button"
              aria-label="Gerar PDF para Avaliação Manual"
              disabled={salvando}
            >
              <FaFilePdf size={20} color="#f4f4f4" />
              <TooltipText>Gerar PDF para Avaliação Manual</TooltipText>
            </PdfButtonContainer>
          )}
        </HeaderButtonsGroup>
      </AvaliacaoHeader>

      {erroAlunosFromHook && (
        <div className="mensagem-erro">{erroAlunosFromHook}</div>
      )}
      {/* Exibir a mensagem de erro APENAS se houver um erro REAL e um aluno tiver sido selecionado */}
      {erro && alunoSelecionadoDropdown && (
        <div className="mensagem-erro">{erro}</div>
      )}
      {carregandoAlunosFromHook ? (
        <div className="loading-message">Carregando lista de alunos...</div>
      ) : (
        <SelecaoAluno
          alunos={alunosListFromHook}
          alunoSelecionado={alunoSelecionadoDropdown?.nome || ""}
          onSelecionar={handleSelecionarAlunoInterno}
          disabled={salvando || carregando}
        />
      )}

      {/* Condição de renderização principal */}
      {showForm &&
        (carregando && alunoSelecionadoDropdown ? (
          <div className="loading-message">
            Carregando avaliação do aluno...
          </div>
        ) : (
          alunoSelecionadoDropdown && (
            <form onSubmit={handleSubmit} className="avaliacao-form">
              <h2 className="aluno-nome-header">
                Aluno: {alunoSelecionadoDropdown.nome || "Nome Indisponível"}
              </h2>

              {/* Seção 1: Interesses e Pontos Fortes (MANTIDO) */}
              <section className="form-section">
                <h2>Seção 1: Interesses e Pontos Fortes</h2>
                <p className="section-description">
                  Esta seção visa descobrir o que a criança gosta de fazer e no
                  que ela se destaca.
                </p>
                {/* ... Campos da Seção 1 mantidos ... */}
              </section>

              {/* Seção 2: Gatilhos de Desregulação e Desconforto (MANTIDO) */}
              <section className="form-section">
                <h2>Seção 2: Gatilhos de Desregulação e Desconforto</h2>
                <p className="section-description">
                  Esta seção busca identificar o que pode levar a criança a se
                  sentir sobrecarregada, irritada ou a ter comportamentos de
                  desregulação.
                </p>
                {/* ... Campos da Seção 2 mantidos ... */}
              </section>

              {/* Seção 3: Estratégias e Apoio (MANTIDO) */}
              <section className="form-section">
                <h2>Seção 3: Estratégias e Apoio</h2>
                <p className="section-description">
                  Esta seção busca entender quais estratégias funcionam melhor
                  para a criança.
                </p>
                {/* ... Campos da Seção 3 mantidos ... */}
              </section>
              {/* Mantido o restante do form com todos os campos... */}
              <SubmitButton
                type="submit"
                disabled={salvando || !alunoSelecionadoDropdown}
                // className="submit-button" <-- Removido para usar o SubmitButton estilizado
              >
                {salvando ? "Salvando..." : "Salvar Avaliação de Interesses"}
              </SubmitButton>
            </form>
          )
        ))}
    </AvaliacaoContainer>
  );
}

export default AvaliacaoInteressesIndividualPage;
