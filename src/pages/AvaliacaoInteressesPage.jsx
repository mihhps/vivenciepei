import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/AvaliacaoInteressesPage.css";

import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { useAlunos } from "../hooks/useAlunos";
import SelecaoAluno from "../components/SelecaoAluno";
import { useAuth } from "../context/AuthContext";
import { fetchAvaliacaoInteresses as fetchAvaliacaoInteressesGlobal } from "../utils/firebaseUtils";

// Importa as constantes do novo arquivo
import {
  ATIVIDADES_FAVORITAS_LIST,
  SINAIS_DESREGULACAO_LIST,
  SITUACOES_DESREGULACAO_LIST,
  NIVEIS_AVALIACAO,
} from "../constants/avaliacaoConstants";

// Função helper para gerar o estado inicial do formulário
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
  const { userId, isAuthReady } = useAuth();

  const [aluno, setAluno] = useState(null);
  const [alunoSelecionadoDropdown, setAlunoSelecionadoDropdown] =
    useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [showViewButton, setShowViewButton] = useState(false);

  const {
    alunos: alunosListFromHook,
    carregando: carregandoAlunosFromHook,
    erro: erroAlunosFromHook,
  } = useAlunos();

  const [formData, setFormData] = useState(getInitialFormData());
  const [originalData, setOriginalData] = useState(getInitialFormData());

  // Efeito para sincronizar o dropdown com o parâmetro da URL
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

  // Efeito principal para carregar os dados do aluno e da avaliação
  useEffect(() => {
    const fetchAlunoAndInteresses = async () => {
      const currentAlunoIdToFetch =
        alunoSelecionadoDropdown?.id || alunoIdFromParams;

      if (!isAuthReady || !currentAlunoIdToFetch || !userId) {
        setCarregando(false);
        return;
      }

      setCarregando(true);
      setErro(null);
      setSucesso(null);
      setShowViewButton(false);

      try {
        const alunoDocRef = doc(db, "alunos", currentAlunoIdToFetch);
        const alunoDocSnap = await getDoc(alunoDocRef);

        if (alunoDocSnap.exists()) {
          const fetchedAluno = { id: alunoDocSnap.id, ...alunoDocSnap.data() };
          setAluno(fetchedAluno);

          const loadedInteressesData = await fetchAvaliacaoInteressesGlobal(
            fetchedAluno.id,
            userId
          );
          const formDataFromDb = loadedInteressesData?.data;

          if (formDataFromDb && Object.keys(formDataFromDb).length > 0) {
            const fullFormData = { ...getInitialFormData(), ...formDataFromDb };
            setFormData(fullFormData);
            setOriginalData(fullFormData); // Salva o estado original para comparação
            setSucesso("Avaliação de interesses anterior carregada.");
            setShowViewButton(true);
          } else {
            const initialData = getInitialFormData();
            setFormData(initialData);
            setOriginalData(initialData); // Garante que o estado original está limpo
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
      } finally {
        setCarregando(false);
      }
    };

    if (
      isAuthReady &&
      userId &&
      (alunoSelecionadoDropdown || alunoIdFromParams)
    ) {
      fetchAlunoAndInteresses();
    } else if (isAuthReady) {
      setCarregando(false);
    }
  }, [userId, isAuthReady, alunoIdFromParams, alunoSelecionadoDropdown]);

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
        navigate(`/avaliacao-interesses/${foundAluno.id}`);
        setAlunoSelecionadoDropdown(foundAluno);
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
        const docPath = `artifacts/${appId}/users/${userId}/avaliacoesInteresses`;
        const avaliacaoDocRef = doc(db, docPath, alunoSelecionadoDropdown.id);

        await setDoc(avaliacaoDocRef, {
          alunoId: alunoSelecionadoDropdown.id,
          data: formData,
          dataAvaliacao: new Date().toISOString(),
          salvoPor: userId,
        });

        setOriginalData(formData); // Atualiza o estado original após salvar
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

  if (!isAuthReady) {
    return (
      <div className="avaliacao-container loading">
        Carregando autenticação...
      </div>
    );
  }

  // O restante do seu JSX (a estrutura do formulário) estava excelente e não precisa de alterações.
  // Cole o JSX do seu arquivo original aqui, desde o <div className="avaliacao-container"> de abertura.
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
        <h1>Avaliação de Interesses e Gatilhos</h1>
        <div className="header-buttons-group right-aligned-buttons">
          <button
            onClick={() => navigate("/visualizar-interesses")}
            className="view-all-button"
            disabled={salvando}
          >
            Ver Avaliações de Interesses
          </button>
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

      {erroAlunosFromHook && (
        <div className="mensagem-erro">{erroAlunosFromHook}</div>
      )}
      {erro && <div className="mensagem-erro">{erro}</div>}
      {sucesso && (
        <div className="mensagem-sucesso success-message">{sucesso}</div>
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

      {carregando && !carregandoAlunosFromHook && (
        <div className="loading-message">Carregando avaliação do aluno...</div>
      )}

      {alunoSelecionadoDropdown && !carregando && (
        <form onSubmit={handleSubmit} className="avaliacao-form">
          <h2 className="aluno-nome-header">
            Aluno: {alunoSelecionadoDropdown.nome || "Nome Indisponível"}
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
                atenção da criança?
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
                A criança demonstra interesse em interagir com outras pessoas?
                Se sim, de que forma?
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
                chateada?
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
            <p className="section-description">
              Esta seção busca entender quais estratégias funcionam melhor para
              a criança.
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
                Existe algum objeto, brinquedo ou atividade que funciona como
                "porto seguro" para a criança?
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
                A criança tem alguma preferência em relação a toque ou espaço
                pessoal?
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
      )}
    </div>
  );
}

export default AvaliacaoInteressesPage;
