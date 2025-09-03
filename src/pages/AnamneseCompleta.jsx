import React, { useState, useEffect } from "react";
import BotaoVoltar from "../components/BotaoVoltar";
import Loader from "../components/Loader";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { isAuthorized } from "../utils/authUtils";
import { useNavigate } from "react-router-dom";

// ✅ NOVO: Função para calcular a idade a partir da data de nascimento (timestamp do Firebase)
const calcularIdade = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== "function") return "";
  try {
    const dataNasc = timestamp.toDate();
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const mes = hoje.getMonth() - dataNasc.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNasc.getDate())) {
      idade--;
    }
    return idade.toString();
  } catch (e) {
    return "";
  }
};

// ✅ NOVO: Função para formatar a data do Firebase para o formato do input (AAAA-MM-DD)
const formatarDataParaInput = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== "function") return "";
  try {
    const data = timestamp.toDate();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  } catch (e) {
    return "";
  }
};

// Estado inicial completo do formulário
const initialFormState = {
  nome: "",
  sexo: "",
  idade: "",
  dataNascimento: "",
  naturalidade: "",
  nacionalidade: "",
  maeNome: "",
  maeIdade: "",
  maeProfissao: "",
  paiNome: "",
  paiIdade: "",
  paiProfissao: "",
  irmaos: "",
  queixaPrincipal: "",
  queriaEngravidar: "",
  comoFoiGestacao: "",
  fezPreNatal: "",
  periodoGestacao: "",
  apgar: "",
  fezIngestaoToxicos: "",
  quaisToxicos: "",
  tipoParto: "",
  cordaoUmbilical: "",
  chorouAoNascer: "",
  mamouPeito: "",
  mamouPeitoAteIdade: "",
  hojeTemHoraParaComer: "",
  comeComIndependencia: "",
  comeComIndependenciaDesdeIdade: "",
  fazUsoTalher: "",
  derramaAlimentos: "",
  comemJuntos: "",
  comemJuntosPorque: "",
  recursosParaManterSentado: "",
  quaisRecursos: "",
  restricaoAlimentar: "",
  quaisRestricoes: "",
  engatinhou: "",
  fixouCabeca: "",
  sorriu: "",
  sentouSozinho: "",
  andouSozinho: "",
  caiaMuito: "",
  possuiControleEsfincteres: "",
  idadeParouFraldas: "",
  controlaFezesDiurnas: "",
  controlaFezesNoturnas: "",
  controlaUrinaDiurnas: "",
  controlaUrinaNoturnas: "",
  pedeParaIrOuVaiSozinho: "",
  tomaBanhoSozinho: "",
  vesteSeSozinho: "",
  usaFraldas: "",
  jaTentouTirarFraldas: "",
  dificuldadesEncontradasEsfincteres: "",
  possuiFalaFuncional: "",
  primeirasPalavrasIdade: "",
  falaFrasesCompletas: "",
  frasesCompletasIdade: "",
  usaFalaSignificativa: "",
  voceEntendeOQueElaConta: "",
  temComecoMeioEFim: "",
  consegueDarRecado: "",
  consegueManterDialogo: "",
  possuiQuestionamentosExcessivos: "",
  possuiLinguagemIncompreensivel: "",
  emiteGritos: "",
  apresentaEcolalia: "",
  usoPersistentePalavrasFrases: "",
  quaisPalavrasFrases: "",
  gagueira: "",
  trocaDeLetras: "",
  indicaApontando: "",
  expressaNaoVerbalmente: "",
  compreendeGestos: "",
  usouComoFerramenta: "",
  dormeSoOuAcompanhado: "",
  dormeComQuantasPessoas: "",
  idadeFoiSeparado: "",
  temCamaIndividual: "",
  acordaVaiParaCamaPais: "",
  temMedoDeDormirSozinho: "",
  vaiSozinhoParaCama: "",
  condicoesParaAdormecer: "",
  temInsonia: "",
  temSonoInterrompido: "",
  choraANoite: "",
  gritaDuranteSono: "",
  falaDormindo: "",
  rangeDentes: "",
  movimentaMuitoSono: "",
  usaChupeta: "",
  usaChupetaAteQuando: "",
  chupaDedo: "",
  chupaDedoAteQuando: "",
  consegueImitar: "",
  apresentaMudancasExpressaoFacial: "",
  moveComMesmaAgilidade: "",
  demonstraInteresseBrinquedos: "",
  usaExploraFuncionalmenteBrinquedos: "",
  carregaObjetoEspecifico: "",
  quaisObjetos: "",
  ondeGostaBrincar: "",
  temCuidadoComBrinquedos: "",
  gostaTelevisao: "",
  gostaHistorias: "",
  praticaEsportes: "",
  quaisEsportes: "",
  aceitaMudancasRotina: "",
  possuiContatoVisualPessoas: "",
  possuiContatoVisualObjetos: "",
  possuiRespostaAuditivaAdequada: "",
  apresentaMedoNervosismoAdequados: "",
  nivelAtividade: "",
  expressaDores: "",
  bateCabeca: "",
  batePes: "",
  arrancaCabelos: "",
  comportamentoEstereotipado: "",
  quaisEstereotipias: "",
  agrideSe: "",
  qualAgressao: "",
  comoReageAOrdens: "",
  atendeComDoceOuSeveridade: "",
  eAgressivo: "",
  descricaoAgressividade: "",
  eTeimoso: "",
  eCarinhoso: "",
  eAutoritario: "",
  eDependente: "",
  quaisSituacoesDependencia: "",
  apresentaTimidezAdequada: "",
  demonstraIndiferenca: "",
  necessarioTentativasParaAtencao: "",
  possuiAmigos: "",
  prefereColegasIdadeSexo: "",
  fazAmizadeFacilmente: "",
  brincaCooperativamente: "",
  relacionamentoMaeFilho: "",
  relacionamentoPaiFilho: "",
  relacionamentoIrmaos: "",
  relacionamentoColegasEscola: "",
  tratadoDiferenteDosOutros: "",
  posicaoPaisDificuldade: "",
  demonstrouCuriosidadeSexual: "",
  atitudePaisCuriosidade: "",
  idadeCuriosidade: "",
  atitudeFamilia: "",
  atividadesAbertamenteOculta: "",
  foiFeitaEducacaoSexual: "",
  saudeAtualmente: "",
  doencasInfantis: "",
  acompanhamentoMedico: "",
  dataUltimaConsulta: "",
  tomaMedicamento: "",
  quaisMedicamentos: "",
  houveInternacoes: "",
  motivoInternacao: "",
  cirurgias: "",
  motivoCirurgias: "",
  tratamentosRealizados: "",
  qualTratamento: "",
  problemasVisao: "",
  problemasAudicao: "",
  doencasDeficienciasFamiliares: "",
  qualEscolaFrequenta: "",
  anoEscolar: "",
  periodoEscolar: "",
  gostaDeEscola: "",
  fezPreEscola: "",
  turmaApoioSegundoProfessor: "",
  rendimentoEscolar: "",
  comportamentoSalaAula: "",
  examesAvaliacoes: "",
  anexos: [],
};

const AnamneseCompleta = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [alunosList, setAlunosList] = useState([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [secaoAtiva, setSecaoAtiva] = useState("dadosPessoais");

  const { user, isAuthReady, isLoadingProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthReady || isLoadingProfile) return;
    const perfisAutorizados = ["desenvolvedor", "gestao", "aee", "professor"];
    if (!user || !isAuthorized(user.perfil, perfisAutorizados)) {
      alert("Você não tem permissão para acessar esta página.");
      navigate("/");
    }
  }, [isAuthReady, isLoadingProfile, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchAlunos = async () => {
      setLoading(true);
      try {
        const alunosRef = collection(db, "alunos");
        let qAlunos = query(alunosRef, orderBy("nome"));
        if (
          user.perfil === "professor" &&
          user.escolas &&
          Object.keys(user.escolas).length > 0
        ) {
          const escolasIds = Object.keys(user.escolas).slice(0, 10);
          qAlunos = query(qAlunos, where("escolaId", "in", escolasIds));
        }
        const alunosSnap = await getDocs(qAlunos);
        const alunos = alunosSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAlunosList(alunos);
      } catch (err) {
        setFetchError("Não foi possível carregar a lista de alunos.");
      } finally {
        setLoading(false);
      }
    };
    fetchAlunos();
  }, [user]);

  // ✅ ALTERADO: Função de carregar agora usa os helpers de data e idade
  const loadAnamnese = async (alunoId) => {
    setLoading(true);
    setFetchError(null);
    try {
      const alunoSelecionado = alunosList.find((a) => a.id === alunoId);
      let dadosIniciais = { ...initialFormState };
      if (alunoSelecionado) {
        dadosIniciais = {
          ...dadosIniciais,
          nome: alunoSelecionado.nome || "",
          // Usa as novas funções para formatar a data e calcular a idade
          dataNascimento: formatarDataParaInput(
            alunoSelecionado.dataNascimento
          ),
          idade: calcularIdade(alunoSelecionado.dataNascimento),
          sexo: alunoSelecionado.sexo || "",
          queixaPrincipal: alunoSelecionado.diagnostico || "",
        };
      }
      setFormData(dadosIniciais);

      const qAnamnese = query(
        collection(db, `alunos/${alunoId}/anamneses`),
        orderBy("criadoEm", "desc"),
        limit(1)
      );
      const anamneseSnap = await getDocs(qAnamnese);

      if (!anamneseSnap.empty) {
        const anamneseData = anamneseSnap.docs[0].data();
        setFormData((prevData) => ({ ...prevData, ...anamneseData }));
      }
    } catch (err) {
      setFetchError("Erro ao carregar os dados do aluno ou da anamnese.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectAluno = (e) => {
    const id = e.target.value;
    setSelectedAlunoId(id);
    if (id) {
      loadAnamnese(id);
    } else {
      setFormData(initialFormState);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlunoId) {
      alert("Por favor, selecione um aluno para salvar a anamnese.");
      return;
    }
    setLoading(true);
    try {
      const anamneseRef = doc(
        collection(db, `alunos/${selectedAlunoId}/anamneses`)
      );
      await setDoc(anamneseRef, {
        ...formData,
        alunoId: selectedAlunoId,
        professorId: user.uid,
        criadoEm: serverTimestamp(),
      });
      alert("Anamnese salva com sucesso!");
    } catch (err) {
      setFetchError("Erro ao salvar a anamnese. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÕES DE RENDERIZAÇÃO ---
  // (O restante do código permanece o mesmo)

  const renderRadioGroup = (name, options, label) => (
    <div style={questionContainerStyle}>
      <label style={labelStyle}>{label}</label>
      <div style={radioGroupStyle}>
        {options.map((option) => (
          <label key={option} style={radioLabelStyle}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={formData[name] === option}
              onChange={handleChange}
              style={radioInputStyle}
            />
            <span style={radioCustomStyle(formData[name] === option)}>
              {option}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderInput = (name, placeholder, type = "text") => (
    <div style={questionContainerStyle}>
      <label style={labelStyle}>{placeholder}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={formData[name] || ""}
        onChange={handleChange}
        style={inputStyle}
      />
    </div>
  );

  const renderTextArea = (name, placeholder) => (
    <div style={questionContainerStyle}>
      <label style={labelStyle}>{placeholder}</label>
      <textarea
        name={name}
        placeholder={placeholder}
        value={formData[name] || ""}
        onChange={handleChange}
        style={textAreaStyle}
      />
    </div>
  );

  const renderSecao = (id, titulo, conteudo) => (
    <div style={sectionStyle}>
      <h3
        style={sectionTitleStyle}
        onClick={() => setSecaoAtiva(id === secaoAtiva ? null : id)}
      >
        {titulo}
        <span
          style={{
            transform: secaoAtiva === id ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s",
          }}
        >
          ▼
        </span>
      </h3>
      {secaoAtiva === id && <div style={sectionContentStyle}>{conteudo}</div>}
    </div>
  );

  if (!isAuthReady || isLoadingProfile) return <Loader />;

  return (
    <div style={pageContainerStyle}>
      <div style={formContainerStyle}>
        <BotaoVoltar />
        <h2 style={titleStyle}>Anamnese Completa - AEE</h2>
        {fetchError && (
          <div
            style={{ color: "red", textAlign: "center", marginBottom: "15px" }}
          >
            {fetchError}
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Selecione o Aluno:</label>
          <select
            name="aluno"
            value={selectedAlunoId}
            onChange={handleSelectAluno}
            style={inputStyle}
            required
          >
            <option value="">Selecione um aluno...</option>
            {alunosList.map((aluno) => (
              <option key={aluno.id} value={aluno.id}>
                {aluno.nome}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <form onSubmit={handleSubmit}>
            {renderSecao(
              "dadosPessoais",
              "1) Informações de Dados Pessoais",
              <>
                {renderInput("nome", "Nome completo")}
                <div style={inlineInputGroup}>
                  {renderInput("dataNascimento", "Data de Nascimento", "date")}
                  {renderInput("idade", "Idade", "number")}
                </div>
                {renderRadioGroup("sexo", ["F", "M"], "Sexo")}
                {renderInput("naturalidade", "Naturalidade")}
                {renderInput("nacionalidade", "Nacionalidade")}
                {renderInput("maeNome", "Nome da Mãe")}
                {renderInput("maeIdade", "Idade da Mãe", "number")}
                {renderInput("maeProfissao", "Profissão da Mãe")}
                {renderInput("paiNome", "Nome do Pai")}
                {renderInput("paiIdade", "Idade do Pai", "number")}
                {renderInput("paiProfissao", "Profissão do Pai")}
                {renderTextArea("irmaos", "Irmãos (nome e idade)")}
              </>
            )}

            {/* AQUI VÃO TODAS AS OUTRAS 16 SEÇÕES, EXATAMENTE COMO NO CÓDIGO ANTERIOR */}
            {/* ... */}
            {renderSecao(
              "queixaPrincipal",
              "2) Queixa Principal",
              <>
                {renderTextArea(
                  "queixaPrincipal",
                  "Descreva a queixa principal"
                )}
              </>
            )}

            {renderSecao(
              "gestacao",
              "3) Gestação e Concepção",
              <>
                {renderRadioGroup(
                  "queriaEngravidar",
                  ["Sim", "Não"],
                  "Queria engravidar?"
                )}
                {renderTextArea(
                  "comoFoiGestacao",
                  "Como foi a gestação? (Ameaça de aborto, doenças, etc.)"
                )}
                {renderRadioGroup(
                  "fezPreNatal",
                  ["Sim", "Não"],
                  "Fez tratamento pré-natal?"
                )}
                {renderInput("periodoGestacao", "Período de Gestação")}
                {renderInput("apgar", "APGAR")}
                {renderRadioGroup(
                  "fezIngestaoToxicos",
                  ["Sim", "Não"],
                  "Fez ingestão de tóxicos?"
                )}
                {formData.fezIngestaoToxicos === "Sim" &&
                  renderInput("quaisToxicos", "Quais?")}
                {renderRadioGroup(
                  "tipoParto",
                  ["Normal", "Cesariana", "Induzido", "Fórceps"],
                  "Tipo de parto"
                )}
                {renderRadioGroup(
                  "cordaoUmbilical",
                  ["Sim", "Não"],
                  "Cordão umbilical enrolado no pescoço?"
                )}
                {renderRadioGroup(
                  "chorouAoNascer",
                  ["Sim", "Não"],
                  "Chorou ao nascer?"
                )}
              </>
            )}

            {renderSecao(
              "alimentacao",
              "4) Amamentação e Alimentação",
              <>
                {renderRadioGroup(
                  "mamouPeito",
                  ["Sim", "Não"],
                  "Mamou no peito?"
                )}
                {formData.mamouPeito === "Sim" &&
                  renderInput("mamouPeitoAteIdade", "Até que idade?")}
                {renderRadioGroup(
                  "hojeTemHoraParaComer",
                  ["Sim", "Não"],
                  "Hoje tem hora para comer?"
                )}
                {renderRadioGroup(
                  "comeComIndependencia",
                  ["Sim", "Não"],
                  "Come com independência?"
                )}
                {formData.comeComIndependencia === "Sim" &&
                  renderInput(
                    "comeComIndependenciaDesdeIdade",
                    "Desde que idade?"
                  )}
                {renderRadioGroup(
                  "fazUsoTalher",
                  ["Sim", "Não"],
                  "Faz uso de talher?"
                )}
                {renderRadioGroup(
                  "derramaAlimentos",
                  ["Sim", "Não"],
                  "Derrama alimentos ou suco?"
                )}
                {renderRadioGroup(
                  "comemJuntos",
                  ["Sim", "Não"],
                  "Comem juntos?"
                )}
                {formData.comemJuntos === "Não" &&
                  renderInput("comemJuntosPorque", "Por quê?")}
                {renderRadioGroup(
                  "recursosParaManterSentado",
                  ["Sim", "Não"],
                  "Usa recursos para se manter sentado à mesa?"
                )}
                {formData.recursosParaManterSentado === "Sim" &&
                  renderInput("quaisRecursos", "Quais?")}
                {renderRadioGroup(
                  "restricaoAlimentar",
                  ["Sim", "Não"],
                  "Possui restrição alimentar?"
                )}
                {formData.restricaoAlimentar === "Sim" &&
                  renderInput("quaisRestricoes", "Quais?")}
              </>
            )}

            {renderSecao(
              "psicomotor",
              "5) Desenvolvimento Psicomotor",
              <>
                <p style={{ ...labelStyle, marginBottom: "15px" }}>
                  Com que idade?
                </p>
                {renderInput("engatinhou", "Engatinhou?")}
                {renderInput("fixouCabeca", "Fixou a cabeça?")}
                {renderInput("sorriu", "Sorriu?")}
                {renderInput("sentouSozinho", "Sentou sozinho?")}
                {renderInput("andouSozinho", "Andou sozinho?")}
                {renderRadioGroup("caiaMuito", ["Sim", "Não"], "Caía muito?")}
              </>
            )}

            {renderSecao(
              "esfincteres",
              "6) Controle de Esfíncteres",
              <>
                {renderRadioGroup(
                  "possuiControleEsfincteres",
                  ["Sim", "Não"],
                  "Possui controle de esfíncteres?"
                )}
                {formData.possuiControleEsfincteres === "Sim" && (
                  <>
                    {renderInput(
                      "idadeParouFraldas",
                      "Com qual idade parou de usar fraldas?"
                    )}
                    {renderRadioGroup(
                      "controlaFezesDiurnas",
                      ["Sim", "Não"],
                      "Controla fezes diurnas?"
                    )}
                    {renderRadioGroup(
                      "controlaFezesNoturnas",
                      ["Sim", "Não"],
                      "Controla fezes noturnas?"
                    )}
                    {renderRadioGroup(
                      "controlaUrinaDiurnas",
                      ["Sim", "Não"],
                      "Controla urina diurna?"
                    )}
                    {renderRadioGroup(
                      "controlaUrinaNoturnas",
                      ["Sim", "Não"],
                      "Controla urina noturna?"
                    )}
                    {renderRadioGroup(
                      "pedeParaIrOuVaiSozinho",
                      ["Pede para ir", "Vai sozinho"],
                      "Pede para ir ao banheiro ou vai sozinho?"
                    )}
                  </>
                )}
                {formData.possuiControleEsfincteres === "Não" && (
                  <>
                    {renderRadioGroup(
                      "usaFraldas",
                      ["Sim", "Não"],
                      "Usa fraldas?"
                    )}
                    {renderRadioGroup(
                      "jaTentouTirarFraldas",
                      ["Sim", "Não"],
                      "Já tentou tirar as fraldas?"
                    )}
                  </>
                )}
                {renderRadioGroup(
                  "tomaBanhoSozinho",
                  ["Sim", "Não"],
                  "Toma banho sozinho?"
                )}
                {renderRadioGroup(
                  "vesteSeSozinho",
                  ["Sim", "Não"],
                  "Veste-se e despe-se sozinho?"
                )}
                {renderTextArea(
                  "dificuldadesEncontradasEsfincteres",
                  "Quais dificuldades foram encontradas?"
                )}
              </>
            )}

            {renderSecao(
              "comunicacaoVerbal",
              "7) Comunicação Verbal",
              <>
                {renderRadioGroup(
                  "possuiFalaFuncional",
                  ["Sim", "Não"],
                  "Possui fala funcional?"
                )}
                {renderInput(
                  "primeirasPalavrasIdade",
                  "Com que idade falou as primeiras palavras?"
                )}
                {renderRadioGroup(
                  "falaFrasesCompletas",
                  ["Sim", "Não"],
                  "Fala frases completas?"
                )}
                {renderInput(
                  "frasesCompletasIdade",
                  "Com que idade começou a usar frases?"
                )}
                {renderRadioGroup(
                  "usaFalaSignificativa",
                  ["Sim", "Não"],
                  "Usa fala significativa?"
                )}
                {renderRadioGroup(
                  "voceEntendeOQueElaConta",
                  ["Sim", "Não"],
                  "Você entende o que ele(a) conta?"
                )}
                {renderRadioGroup(
                  "temComecoMeioEFim",
                  ["Sim", "Não"],
                  "A fala tem começo, meio e fim?"
                )}
                {renderRadioGroup(
                  "consegueDarRecado",
                  ["Sim", "Não"],
                  "Consegue dar um recado?"
                )}
                {renderRadioGroup(
                  "consegueManterDialogo",
                  ["Sim", "Não"],
                  "Consegue manter um diálogo?"
                )}
                {renderRadioGroup(
                  "possuiQuestionamentosExcessivos",
                  ["Sim", "Não"],
                  "Possui questionamentos ou preocupações excessivas?"
                )}
                {renderRadioGroup(
                  "possuiLinguagemIncompreensivel",
                  ["Sim", "Não"],
                  "Possui linguagem incompreensível?"
                )}
                {renderRadioGroup(
                  "emiteGritos",
                  ["Sim", "Não"],
                  "Emite gritos ou barulhos complexos?"
                )}
                {renderRadioGroup(
                  "apresentaEcolalia",
                  ["Sim", "Não"],
                  "Apresenta ecolalia?"
                )}
                {renderRadioGroup(
                  "usoPersistentePalavrasFrases",
                  ["Sim", "Não"],
                  "Usa persistentemente algumas palavras ou frases?"
                )}
                {formData.usoPersistentePalavrasFrases === "Sim" &&
                  renderInput("quaisPalavrasFrases", "Quais?")}
                {renderRadioGroup(
                  "gagueira",
                  ["Sim", "Não"],
                  "Apresenta gagueira?"
                )}
                {renderRadioGroup(
                  "trocaDeLetras",
                  ["Sim", "Não"],
                  "Apresenta troca de letras?"
                )}
              </>
            )}

            {renderSecao(
              "comunicacaoNaoVerbal",
              "8) Comunicação Não-Verbal",
              <>
                {renderRadioGroup(
                  "indicaApontando",
                  ["Sim", "Não"],
                  "Indica apontando com os dedos as suas vontades?"
                )}
                {renderRadioGroup(
                  "expressaNaoVerbalmente",
                  ["Sim", "Não"],
                  "Expressa suas necessidades de forma não verbal?"
                )}
                {renderRadioGroup(
                  "compreendeGestos",
                  ["Sim", "Não"],
                  "Compreende quando você se comunica por gestos?"
                )}
                {renderRadioGroup(
                  "usouComoFerramenta",
                  ["Sim", "Não"],
                  "Já te usou como 'ferramenta' para indicar o que queria?"
                )}
              </>
            )}

            {renderSecao(
              "sono",
              "9) Sono",
              <>
                {renderInput(
                  "dormeSoOuAcompanhado",
                  "Dorme só ou acompanhado?"
                )}
                {formData.dormeSoOuAcompanhado
                  ?.toLowerCase()
                  .includes("acompanhado") &&
                  renderInput("dormeComQuantasPessoas", "Com quantas pessoas?")}
                {renderInput(
                  "idadeFoiSeparado",
                  "Com que idade foi separado(a)?"
                )}
                {renderRadioGroup(
                  "temCamaIndividual",
                  ["Sim", "Não"],
                  "Tem cama individual?"
                )}
                {renderRadioGroup(
                  "acordaVaiParaCamaPais",
                  ["Sim", "Não"],
                  "Quando acorda vai para a cama dos pais?"
                )}
                {renderRadioGroup(
                  "temMedoDeDormirSozinho",
                  ["Sim", "Não"],
                  "Tem medo de dormir sozinho?"
                )}
                {renderRadioGroup(
                  "vaiSozinhoParaCama",
                  ["Sim", "Não"],
                  "Vai sozinho para a cama?"
                )}
                {renderTextArea(
                  "condicoesParaAdormecer",
                  "Condições para adormecer"
                )}
                {renderRadioGroup("temInsonia", ["Sim", "Não"], "Tem insônia?")}
                {renderRadioGroup(
                  "temSonoInterrompido",
                  ["Sim", "Não"],
                  "Tem sono interrompido?"
                )}
                {renderRadioGroup(
                  "choraANoite",
                  ["Sim", "Não"],
                  "Chora à noite?"
                )}
                {renderRadioGroup(
                  "gritaDuranteSono",
                  ["Sim", "Não"],
                  "Grita durante o sono?"
                )}
                {renderRadioGroup(
                  "falaDormindo",
                  ["Sim", "Não"],
                  "Fala dormindo?"
                )}
                {renderRadioGroup(
                  "rangeDentes",
                  ["Sim", "Não"],
                  "Range os dentes?"
                )}
                {renderRadioGroup(
                  "movimentaMuitoSono",
                  ["Sim", "Não"],
                  "Movimenta-se muito durante o sono?"
                )}
              </>
            )}

            {renderSecao(
              "comportamento",
              "10) Conduta e Comportamento",
              <>
                {renderRadioGroup("usaChupeta", ["Sim", "Não"], "Usa chupeta?")}
                {formData.usaChupeta === "Sim" &&
                  renderInput("usaChupetaAteQuando", "Até quando usou?")}
                {renderRadioGroup("chupaDedo", ["Sim", "Não"], "Chupa o dedo?")}
                {formData.chupaDedo === "Sim" &&
                  renderInput("chupaDedoAteQuando", "Até quando chupou?")}
                {renderRadioGroup(
                  "consegueImitar",
                  ["Sim", "Não"],
                  "Consegue imitar sons, palavras e movimentos?"
                )}
                {renderRadioGroup(
                  "apresentaMudancasExpressaoFacial",
                  ["Sim", "Não"],
                  "Apresenta mudanças na expressão facial e postura?"
                )}
                {renderRadioGroup(
                  "moveComMesmaAgilidade",
                  ["Sim", "Não"],
                  "Move-se com a mesma agilidade de uma criança da mesma idade?"
                )}
                {renderRadioGroup(
                  "demonstraInteresseBrinquedos",
                  ["Sim", "Não"],
                  "Demonstra interesse por brinquedos e objetos?"
                )}
                {renderRadioGroup(
                  "usaExploraFuncionalmenteBrinquedos",
                  ["Sim", "Não"],
                  "Explora funcionalmente os brinquedos e objetos?"
                )}
                {renderRadioGroup(
                  "carregaObjetoEspecifico",
                  ["Sim", "Não"],
                  "Carrega sempre algum objeto específico?"
                )}
                {formData.carregaObjetoEspecifico === "Sim" &&
                  renderInput("quaisObjetos", "Quais?")}
                {renderInput("ondeGostaBrincar", "Onde gosta de brincar?")}
                {renderRadioGroup(
                  "temCuidadoComBrinquedos",
                  ["Sim", "Não"],
                  "Tem cuidado com os brinquedos?"
                )}
                {renderRadioGroup(
                  "gostaTelevisao",
                  ["Sim", "Não"],
                  "Gosta de televisão?"
                )}
                {renderRadioGroup(
                  "gostaHistorias",
                  ["Sim", "Não"],
                  "Gosta de histórias?"
                )}
                {renderRadioGroup(
                  "praticaEsportes",
                  ["Sim", "Não"],
                  "Pratica esportes?"
                )}
                {formData.praticaEsportes === "Sim" &&
                  renderInput("quaisEsportes", "Quais?")}
                {renderRadioGroup(
                  "aceitaMudancasRotina",
                  ["Sim", "Não"],
                  "Aceita mudanças na rotina?"
                )}
                {renderRadioGroup(
                  "possuiContatoVisualPessoas",
                  ["Sim", "Não"],
                  "Possui contato visual com as pessoas?"
                )}
                {renderRadioGroup(
                  "possuiContatoVisualObjetos",
                  ["Sim", "Não"],
                  "Possui contato visual com objetos?"
                )}
                {renderRadioGroup(
                  "possuiRespostaAuditivaAdequada",
                  ["Sim", "Não"],
                  "Possui resposta auditiva adequada?"
                )}
                {renderRadioGroup(
                  "apresentaMedoNervosismoAdequados",
                  ["Sim", "Não"],
                  "Apresenta medo e nervosismo adequados para a situação?"
                )}
                {renderRadioGroup(
                  "nivelAtividade",
                  [
                    "Normal",
                    "Preguiçosa",
                    "É bastante ativa",
                    "Extremos de atividade e inatividade",
                  ],
                  "Qual o nível de atividade?"
                )}
                {renderRadioGroup(
                  "expressaDores",
                  ["Sim", "Não"],
                  "Expressa dores ou desconforto?"
                )}
                {renderRadioGroup(
                  "bateCabeca",
                  ["Sim", "Não"],
                  "Bate a cabeça?"
                )}
                {renderRadioGroup("batePes", ["Sim", "Não"], "Bate os pés?")}
                {renderRadioGroup(
                  "arrancaCabelos",
                  ["Sim", "Não"],
                  "Arranca os cabelos?"
                )}
                {renderRadioGroup(
                  "comportamentoEstereotipado",
                  ["Sim", "Não"],
                  "Possui algum comportamento estereotipado?"
                )}
                {formData.comportamentoEstereotipado === "Sim" &&
                  renderInput("quaisEstereotipias", "Quais?")}
                {renderRadioGroup(
                  "agrideSe",
                  ["Sim", "Não"],
                  "Agride-se de alguma forma?"
                )}
                {formData.agrideSe === "Sim" &&
                  renderInput("qualAgressao", "Como?")}
                {renderTextArea("comoReageAOrdens", "Como reage a ordens?")}
                {renderRadioGroup(
                  "atendeComDoceOuSeveridade",
                  ["Doçura", "Severidade", "Indiferente"],
                  "Atende melhor com doçura ou severidade?"
                )}
                {renderRadioGroup("eAgressivo", ["Sim", "Não"], "É agressivo?")}
                {formData.eAgressivo === "Sim" &&
                  renderTextArea(
                    "descricaoAgressividade",
                    "Descreva a agressividade"
                  )}
                {renderRadioGroup("eTeimoso", ["Sim", "Não"], "É teimoso?")}
                {renderRadioGroup("eCarinhoso", ["Sim", "Não"], "É carinhoso?")}
                {renderRadioGroup(
                  "eAutoritario",
                  ["Sim", "Não"],
                  "É autoritário?"
                )}
                {renderRadioGroup(
                  "eDependente",
                  ["Sim", "Não"],
                  "É dependente?"
                )}
                {formData.eDependente === "Sim" &&
                  renderTextArea(
                    "quaisSituacoesDependencia",
                    "Em quais situações?"
                  )}
              </>
            )}

            {renderSecao(
              "repertorioSocial",
              "11) Repertório Social",
              <>
                {renderRadioGroup(
                  "apresentaTimidezAdequada",
                  ["Sim", "Não"],
                  "Apresenta timidez adequada para sua idade?"
                )}
                {renderRadioGroup(
                  "demonstraIndiferenca",
                  ["Sim", "Não"],
                  "Demonstra indiferença diante de outras pessoas?"
                )}
                {renderRadioGroup(
                  "necessarioTentativasParaAtencao",
                  ["Sim", "Não"],
                  "São necessárias tentativas persistentes para conseguir sua atenção?"
                )}
                {renderRadioGroup(
                  "possuiAmigos",
                  ["Sim", "Não"],
                  "Possui amigos?"
                )}
                {renderInput(
                  "prefereColegasIdadeSexo",
                  "Prefere colegas de que idade e sexo?"
                )}
                {renderRadioGroup(
                  "fazAmizadeFacilmente",
                  ["Sim", "Não"],
                  "Faz amizade facilmente?"
                )}
                {renderRadioGroup(
                  "brincaCooperativamente",
                  ["Sim", "Não"],
                  "Brinca cooperativamente?"
                )}
              </>
            )}

            {renderSecao(
              "relacionamento",
              "12) Como é o Relacionamento",
              <>
                {renderTextArea("relacionamentoMaeFilho", "Mãe e filho(a)")}
                {renderTextArea("relacionamentoPaiFilho", "Pai e Filho(a)")}
                {renderTextArea("relacionamentoIrmaos", "Com os irmãos")}
                {renderTextArea(
                  "relacionamentoColegasEscola",
                  "Com os colegas da escola"
                )}
                {renderRadioGroup(
                  "tratadoDiferenteDosOutros",
                  ["Sim", "Não"],
                  "É tratado de forma diferente dos outros?"
                )}
                {renderTextArea(
                  "posicaoPaisDificuldade",
                  "Qual a posição dos pais diante da dificuldade da criança?"
                )}
              </>
            )}

            {renderSecao(
              "sexualidade",
              "13) Sexualidade",
              <>
                {renderRadioGroup(
                  "demonstrouCuriosidadeSexual",
                  ["Sim", "Não"],
                  "Já demonstrou algum tipo de curiosidade sexual?"
                )}
                {formData.demonstrouCuriosidadeSexual === "Sim" && (
                  <>
                    {renderInput("idadeCuriosidade", "Com que idade?")}
                    {renderTextArea(
                      "atitudePaisCuriosidade",
                      "Qual foi a atitude dos pais?"
                    )}
                    {renderTextArea(
                      "atitudeFamilia",
                      "Qual foi a atitude da família?"
                    )}
                  </>
                )}
                {renderRadioGroup(
                  "atividadesAbertamenteOculta",
                  ["Abertamente", "Oculta"],
                  "Executa tais atividades abertamente ou as oculta?"
                )}
                {renderRadioGroup(
                  "foiFeitaEducacaoSexual",
                  ["Sim", "Não"],
                  "Foi feita educação sexual?"
                )}
              </>
            )}

            {renderSecao(
              "saude",
              "14) Saúde",
              <>
                {renderTextArea(
                  "saudeAtualmente",
                  "Como está a saúde atualmente?"
                )}
                {renderTextArea(
                  "doencasInfantis",
                  "Doenças infantis (e idades)"
                )}
                {renderRadioGroup(
                  "acompanhamentoMedico",
                  ["Neurologista", "Psiquiatra", "Não faz"],
                  "Faz acompanhamento médico?"
                )}
                {renderInput(
                  "dataUltimaConsulta",
                  "Data da última consulta",
                  "date"
                )}
                {renderRadioGroup(
                  "tomaMedicamento",
                  ["Sim", "Não"],
                  "Toma algum medicamento?"
                )}
                {formData.tomaMedicamento === "Sim" &&
                  renderTextArea("quaisMedicamentos", "Quais?")}
                {renderRadioGroup(
                  "houveInternacoes",
                  ["Sim", "Não"],
                  "Já houveram internações?"
                )}
                {formData.houveInternacoes === "Sim" &&
                  renderTextArea("motivoInternacao", "Motivo")}
                {renderRadioGroup(
                  "cirurgias",
                  ["Sim", "Não"],
                  "Já fez cirurgias?"
                )}
                {formData.cirurgias === "Sim" &&
                  renderTextArea("motivoCirurgias", "Motivo")}
                {renderRadioGroup(
                  "tratamentosRealizados",
                  ["Sim", "Não"],
                  "Já realizou tratamentos (fono, psico, etc)?"
                )}
                {formData.tratamentosRealizados === "Sim" &&
                  renderTextArea("qualTratamento", "Quais?")}
                {renderRadioGroup(
                  "problemasVisao",
                  ["Sim", "Não"],
                  "Problemas de visão?"
                )}
                {renderRadioGroup(
                  "problemasAudicao",
                  ["Sim", "Não"],
                  "Problemas de audição?"
                )}
              </>
            )}

            {renderSecao(
              "antecedentesFamiliares",
              "15) Antecedentes Familiares",
              <>
                {renderTextArea(
                  "doencasDeficienciasFamiliares",
                  "Doenças, deficiências, epilepsia, alcoolismo/drogas na família?"
                )}
              </>
            )}

            {renderSecao(
              "escolaridade",
              "16) Escolaridade",
              <>
                {renderInput("qualEscolaFrequenta", "Qual escola frequenta?")}
                {renderInput("anoEscolar", "Ano/Série")}
                {renderInput("periodoEscolar", "Período")}
                {renderRadioGroup(
                  "gostaDeEscola",
                  ["Sim", "Não"],
                  "Gosta da escola?"
                )}
                {renderRadioGroup(
                  "fezPreEscola",
                  ["Sim", "Não"],
                  "Fez Pré-Escola?"
                )}
                {renderRadioGroup(
                  "turmaApoioSegundoProfessor",
                  ["Sim", "Não"],
                  "A turma tem apoio de segundo professor?"
                )}
                {renderTextArea(
                  "rendimentoEscolar",
                  "Qual seu rendimento escolar?"
                )}
                {renderTextArea(
                  "comportamentoSalaAula",
                  "Comportamento em sala de aula"
                )}
              </>
            )}

            {renderSecao(
              "exames",
              "17) Exames e Avaliações",
              <>
                {renderTextArea(
                  "examesAvaliacoes",
                  "Detalhe os exames e avaliações..."
                )}
              </>
            )}
          </form>
        )}
      </div>

      <div
        style={{
          ...formContainerStyle,
          textAlign: "center",
          marginTop: "20px",
          padding: "20px",
        }}
      >
        <button type="submit" onClick={handleSubmit} style={buttonStyle}>
          Salvar Anamnese Completa
        </button>
      </div>
    </div>
  );
};

// --- ESTILOS ---
const pageContainerStyle = {
  minHeight: "100vh",
  backgroundColor: "#f0f8ff",
  padding: "20px",
};
const formContainerStyle = {
  backgroundColor: "#ffffff",
  padding: "30px",
  borderRadius: "8px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
  maxWidth: "900px",
  margin: "0 auto",
};
const titleStyle = {
  textAlign: "center",
  marginBottom: "30px",
  color: "#1d3557",
  fontSize: "28px",
};
const questionContainerStyle = { marginBottom: "22px" };
const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "600",
  color: "#333",
  fontSize: "15px",
};
const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
  fontSize: "15px",
};
const textAreaStyle = {
  width: "100%",
  minHeight: "100px",
  padding: "12px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
  fontSize: "15px",
  resize: "vertical",
};
const buttonStyle = {
  width: "100%",
  padding: "15px",
  backgroundColor: "#2a9d8f",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "18px",
  cursor: "pointer",
  fontWeight: "bold",
};
const inlineInputGroup = { display: "flex", gap: "15px", alignItems: "center" };
const sectionStyle = {
  borderBottom: "1px solid #e0e0e0",
  marginBottom: "10px",
};
const sectionTitleStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  padding: "18px 15px",
  margin: 0,
  backgroundColor: "#f8f9fa",
  color: "#1d3557",
  fontWeight: "bold",
  borderRadius: "6px 6px 0 0",
  fontSize: "18px",
};
const sectionContentStyle = {
  padding: "25px",
  border: "1px solid #e0e0e0",
  borderTop: "none",
  borderRadius: "0 0 6px 6px",
};
const radioGroupStyle = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
};
const radioLabelStyle = {
  display: "inline-flex",
  cursor: "pointer",
  alignItems: "center",
};
const radioInputStyle = { display: "none" };
const radioCustomStyle = (isActive) => ({
  padding: "10px 20px",
  border: `2px solid ${isActive ? "#457b9d" : "#ced4da"}`,
  borderRadius: "25px",
  backgroundColor: isActive ? "#457b9d" : "#f8f9fa",
  color: isActive ? "white" : "#495057",
  transition: "all 0.2s ease-in-out",
  fontWeight: "500",
  fontSize: "15px",
});

export default AnamneseCompleta;
