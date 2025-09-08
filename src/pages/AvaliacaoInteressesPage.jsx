import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/AvaliacaoInteressesPage.css";

import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FaFilePdf } from "react-icons/fa";

import { useAlunos } from "../hooks/useAlunos";
import SelecaoAluno from "../components/SelecaoAluno";
import { useAuth } from "../context/AuthContext";
import styled from "styled-components";

import {
  ATIVIDADES_FAVORITAS_LIST,
  SINAIS_DESREGULACAO_LIST,
  SITUACOES_DESREGULACAO_LIST,
  NIVEIS_AVALIACAO,
} from "../constants/avaliacaoConstants";

import { gerarPDFAvaliacaoInteressesParaPreencher } from "../utils/pdfGeneratorInteresses";

// --- NOVOS COMPONENTES ESTILIZADOS ---

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
  transition:
    background-color 0.3s ease,
    transform 0.3s ease;

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

function AvaliacaoInteressesPage() {
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
  const [showForm, setShowForm] = useState(false); // <--- Nova variável de estado

  const {
    alunos: alunosListFromHook,
    carregando: carregandoAlunosFromHook,
    erro: erroAlunosFromHook,
  } = useAlunos();

  const [formData, setFormData] = useState(getInitialFormData());
  const [originalData, setOriginalData] = useState(getInitialFormData());

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
        setShowForm(true); // <--- Define como true ao carregar pela URL
      }
    }
  }, [alunoIdFromParams, alunosListFromHook, alunoSelecionadoDropdown]);

  useEffect(() => {
    const fetchAlunoAndInteresses = async () => {
      const currentAlunoIdToFetch =
        alunoSelecionadoDropdown?.id || alunoIdFromParams;

      // <--- Modificação na verificação inicial
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
        navigate(`/nova-avaliacao/${foundAluno.id}`);
        setAlunoSelecionadoDropdown(foundAluno);
        setShowForm(true); // <--- Define como true quando um aluno é selecionado
      } else {
        // Se o usuário deselecionar (voltar para "-- Escolher --")
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
      navigate(`/visualizar-interesses/${alunoSelecionadoDropdown.id}`);
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
        <BackButton onClick={() => navigate(-1)} disabled={salvando}>
          &larr; Voltar
        </BackButton>
        <HeaderTitle>Avaliação de Interesses e Gatilhos</HeaderTitle>
        <HeaderButtonsGroup>
          <HeaderButton
            onClick={() => navigate("/visualizar-interesses")}
            disabled={salvando}
          >
            Ver Avaliações de Interesses
          </HeaderButton>
          {showViewButton && alunoSelecionadoDropdown && (
            <HeaderButton
              type="button"
              onClick={handleVisualizarAvaliacao}
              disabled={salvando}
            >
              Visualizar Avaliação Salva
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

              {/* Seção 1: Interesses e Pontos Fortes */}
              <section className="form-section">
                <h2>Seção 1: Interesses e Pontos Fortes</h2>
                <p className="section-description">
                  Esta seção visa descobrir o que a criança gosta de fazer e no
                  que ela se destaca.
                </p>
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
                    Quais são os personagens, temas ou assuntos que mais chamam
                    a atenção da criança?
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
                    Em que a criança demonstra ter habilidades ou facilidade?
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
                    A criança demonstra interesse em interagir com outras
                    pessoas? Se sim, de que forma?
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
                    busca?
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
                              checked={
                                formData.sinaisDesregulacao[sign] === nivel
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
                                formData.situacoesDesregulacao[situation] ===
                                nivel
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
                    O que costuma acalmar a criança quando ela está desregulada
                    ou chateada?
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
                    Descreva uma situação recente em que a criança se
                    desregulou. O que aconteceu antes, durante e depois?
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
                <p className="section-description">
                  Esta seção busca entender quais estratégias funcionam melhor
                  para a criança.
                </p>
                <div className="form-group">
                  <label className="input-label">
                    Quais são as melhores formas de se comunicar com a criança?
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
                    mudança na rotina?
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
                    Existe algum objeto, brinquedo ou atividade que funciona
                    como "porto seguro" para a criança?
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
                    regular?
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
                    A criança tem alguma preferência em relação a toque ou
                    espaço pessoal?
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
                    Há algo mais que você gostaria de adicionar?
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
            </form>
          )
        ))}
    </AvaliacaoContainer>
  );
}

export default AvaliacaoInteressesPage;
