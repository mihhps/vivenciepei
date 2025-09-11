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

import { NIVEIS_AVALIACAO } from "../constants/avaliacaoConstants";

import { SECOES_AVALIACAO } from "../data/avaliacaoInicial_0a3Data.js";

// Importação da função de geração do PDF
import { gerarPDFAvaliacaoInicial0a3ParaPreencher } from "../utils/pdfGenerator0a3.js";

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
  position: relative; // Adicionado para posicionar o Tooltip
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

  // Estilo do Tooltip para a label do rádio
  & .tooltiptext {
    visibility: hidden;
    width: 250px;
    background-color: #555;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 5px 0;
    position: absolute;
    z-index: 1;
    bottom: 125%; // Posição acima do elemento
    left: 50%;
    margin-left: -125px;
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 0.9em;
  }

  & .tooltiptext::after {
    content: " ";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #555 transparent transparent transparent;
  }

  &:hover .tooltiptext {
    visibility: visible;
    opacity: 1;
  }
`;

// --- FIM DOS COMPONENTES ESTILIZADOS ---

const getInitialFormData = () => {
  const initialState = {};
  SECOES_AVALIACAO.forEach((secao) => {
    // Percorre as subáreas dentro de cada seção
    if (secao.subareas) {
      secao.subareas.forEach((subarea) => {
        // Percorre as habilidades dentro de cada subárea
        if (subarea.habilidades) {
          subarea.habilidades.forEach((habilidade) => {
            // Usa a 'habilidade' como chave para criar o estado inicial
            initialState[habilidade.habilidade] = "NA"; // Define o valor inicial como "NA" (Não Aplicável)
          });
        }
      });
    }
  });
  return initialState;
};

function AvaliacaoInicial0a3Page() {
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
        setShowForm(true);
      }
    }
  }, [alunoIdFromParams, alunosListFromHook, alunoSelecionadoDropdown]);

  useEffect(() => {
    const fetchAlunoAndAvaliacao = async () => {
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

          // ✅ CORREÇÃO AQUI: Caminho simplificado para a coleção de avaliações
          const avaliacaoDocRef = doc(
            db,
            "avaliacoesIniciais0a3",
            fetchedAluno.id
          );
          const avaliacaoDocSnap = await getDoc(avaliacaoDocRef);

          const loadedAvaliacaoData = avaliacaoDocSnap.exists()
            ? avaliacaoDocSnap.data()
            : null;

          if (loadedAvaliacaoData) {
            const formDataFromDb = loadedAvaliacaoData.data;
            const fullFormData = { ...getInitialFormData(), ...formDataFromDb };
            setFormData(fullFormData);
            setOriginalData(fullFormData);
            setSucesso("Avaliação de 0 a 3 anos anterior carregada.");
            setShowViewButton(true);
          } else {
            const initialData = getInitialFormData();
            setFormData(initialData);
            setOriginalData(initialData);
            setSucesso(
              "Inicie uma nova avaliação de 0 a 3 anos para este aluno."
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
      return () => {
        // Nada a fazer no cleanup para este efeito
      };
    };
    fetchAlunoAndAvaliacao();
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
        navigate(`/nova-avaliacao-0a3/${foundAluno.id}`);
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
    const { itemId } = dataset;
    setFormData((prev) => ({
      ...prev,
      [itemId]: value,
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
        const avaliacaoDocRef = doc(
          db,
          "avaliacoesIniciais0a3",
          alunoSelecionadoDropdown.id
        );

        await setDoc(avaliacaoDocRef, {
          alunoId: alunoSelecionadoDropdown.id,
          alunoNome: alunoSelecionadoDropdown.nome, // ✅ NOVO CAMPO ADICIONADO AQUI
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
      navigate(`/visualizar-inicial-0a3/${alunoSelecionadoDropdown.id}`);
    }
  }, [alunoSelecionadoDropdown, navigate]);

  // CORREÇÃO: Função para gerar PDF sem argumentos
  const handleGerarPDFManual = useCallback(() => {
    if (alunoSelecionadoDropdown) {
      gerarPDFAvaliacaoInicial0a3ParaPreencher();
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
      <style>
        {`
        .habilidade-item-radio {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          border-bottom: 1px solid #e0e0e0;
        }

        .texto-habilidade {
          font-weight: 500;
          color: #333;
          flex-grow: 1;
        }

        .niveis-habilidade {
          display: flex;
          gap: 5px;
        }

        .circulo-nivel {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid #ccc;
          color: #666;
          font-size: 0.8em;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative; // Adicionado para o posicionamento do tooltip
        }

        .circulo-nivel:hover {
          border-color: #457b9d;
        }
        
        .circulo-nivel .tooltiptext {
          visibility: hidden;
          width: 250px;
          background-color: #555;
          color: #fff;
          text-align: center;
          border-radius: 6px;
          padding: 5px 0;
          position: absolute;
          z-index: 1;
          bottom: 125%; // Posição acima do elemento
          left: 50%;
          margin-left: -125px;
          opacity: 0;
          transition: opacity 0.3s;
          font-size: 0.9em;
        }
        
        .circulo-nivel:hover .tooltiptext {
          visibility: visible;
          opacity: 1;
        }

        .circulo-nivel.ativo {
          color: #fff;
          border-color: #1d3557;
          transform: scale(1.1);
        }

        .circulo-nivel.ativo.NA,
        .circulo-nivel.NA.ativo {
          background-color: #a8dadc;
          border-color: #a8dadc;
          color: #1d3557;
        }
        
        .circulo-nivel.ativo.NR,
        .circulo-nivel.NR.ativo {
          background-color: #e63946;
          border-color: #e63946;
        }
        
        .circulo-nivel.ativo.AF,
        .circulo-nivel.AF.ativo {
          background-color: #f4a261;
          border-color: #f4a261;
        }
        
        .circulo-nivel.ativo.AG,
        .circulo-nivel.AG.ativo {
          background-color: #e9c46a;
          border-color: #e9c46a;
        }
        
        .circulo-nivel.ativo.AV,
        .circulo-nivel.AV.ativo {
          background-color: #2a9d8f;
          border-color: #2a9d8f;
        }
        
        .circulo-nivel.ativo.AVi,
        .circulo-nivel.AVi.ativo {
          background-color: #264653;
          border-color: #264653;
        }
        
        .circulo-nivel.ativo.I,
        .circulo-nivel.I.ativo {
          background-color: #28a745;
          border-color: #28a745;
        }

        .hidden-radio-input {
          display: none;
        }
      `}
      </style>
      <AvaliacaoHeader>
        <BackButton onClick={() => navigate(-1)} disabled={salvando}>
          &larr; Voltar
        </BackButton>
        <HeaderTitle>Avaliação Inicial (0 a 3 anos)</HeaderTitle>
        <HeaderButtonsGroup>
          <HeaderButton
            onClick={() => navigate("/visualizar-inicial-0a3")}
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

              {sucesso && <SuccessMessage>{sucesso}</SuccessMessage>}

              {/* Mapeia as seções do arquivo de dados para renderizar o formulário dinamicamente */}
              {SECOES_AVALIACAO.map((secao) => (
                <FormSection key={secao.titulo}>
                  <h2>{secao.titulo}</h2>
                  {/* Itera sobre as subáreas, se existirem */}
                  {secao.subareas?.map((subarea) => (
                    <div key={subarea.nome}>
                      <h3>{subarea.nome}</h3>
                      {/* Itera sobre as habilidades dentro de cada subárea */}
                      {subarea.habilidades?.map((habilidade) => (
                        <div
                          key={habilidade.habilidade}
                          className="habilidade-item-radio"
                        >
                          <span className="texto-habilidade">
                            {habilidade.habilidade}
                          </span>
                          <div className="niveis-habilidade">
                            {Object.entries(habilidade.niveis).map(
                              ([nivelKey, nivelValue]) => (
                                <label
                                  key={nivelKey}
                                  className={`circulo-nivel ${nivelKey.replace(/\s/g, "")} ${formData[habilidade.habilidade] === nivelKey ? "ativo" : ""}`}
                                >
                                  <input
                                    type="radio"
                                    name={habilidade.habilidade}
                                    data-item-id={habilidade.habilidade}
                                    value={nivelKey}
                                    checked={
                                      formData[habilidade.habilidade] ===
                                      nivelKey
                                    }
                                    onChange={handleRadioChange}
                                    disabled={salvando}
                                    className="hidden-radio-input"
                                  />
                                  {nivelKey}
                                  {/* Tooltip com a descrição do nível */}
                                  <span className="tooltiptext">
                                    {nivelValue}
                                  </span>
                                </label>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {/* Seções com perguntas (se houver) */}
                  {secao.perguntas?.map((pergunta) => (
                    <FormGroup key={pergunta.id}>
                      <InputLabel>{pergunta.texto}</InputLabel>
                      <TextArea
                        name={pergunta.id}
                        value={formData[pergunta.id]}
                        onChange={handleChange}
                        rows="2"
                        disabled={salvando}
                      ></TextArea>
                    </FormGroup>
                  ))}
                </FormSection>
              ))}
              <SubmitButton
                type="submit"
                disabled={salvando || !alunoSelecionadoDropdown}
              >
                {salvando ? "Salvando..." : "Salvar Avaliação Inicial (0 a 3)"}
              </SubmitButton>
            </form>
          )
        ))}
    </AvaliacaoContainer>
  );
}

export default AvaliacaoInicial0a3Page;
