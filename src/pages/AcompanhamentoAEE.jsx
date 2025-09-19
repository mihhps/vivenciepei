import React, { useState, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { usePlanoAEE } from "../hooks/usePlanoAEE";
import FormularioAtividade from "../components/FormularioAtividade.jsx";
import SugestoesAtividades from "../components/SugestoesAtividades.jsx";
import GerenciarHorarios from "../components/GerenciarHorarios.jsx";
import AdicionarHabilidadeModal from "../components/AdicionarHabilidadeModal.jsx";
import { gerarPDFAEE } from "../utils/gerarPDFAEE";
import "../styles/AcompanhamentoAEE.css";

const Accordion = ({
  area,
  habilidades,
  onHabilidadeClick,
  onSugestaoClick,
  habilidadeAberta,
  getSugestoes,
  onSelectSugestao,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="accordion-item">
      <button className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
        {area}
        <span className={`accordion-icon ${isOpen ? "open" : ""}`}>▼</span>
      </button>
      {isOpen && (
        <div className="accordion-content">
          {habilidades.map((item) => (
            <div key={item.id} className="habilidade-item">
              <p onClick={() => onHabilidadeClick(item)}>{item.habilidade}</p>
              <div className="habilidade-actions">
                <span
                  className={`habilidade-status status-${item.status
                    .replace(/\s+/g, "-")
                    .toLowerCase()}`}
                >
                  {item.status}
                </span>
                <button
                  className="sugestao-icon-btn"
                  title="Sugerir atividades com IA"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSugestaoClick(item);
                  }}
                >
                  💡
                </button>
              </div>
              {habilidadeAberta?.id === item.id && (
                <SugestoesAtividades
                  habilidade={habilidadeAberta}
                  onSelectSugestao={onSelectSugestao}
                  getSugestoes={(h) => getSugestoes("atividadePrincipal", h)}
                  onClose={() => onSugestaoClick(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function AcompanhamentoAEE() {
  const { alunoId } = useParams();
  const {
    aluno,
    plano,
    atividades,
    horariosAtendimento,
    estado,
    criarPlanoEmBranco,
    importarDaAvaliacao,
    salvarAtividade,
    salvarHorariosAtendimento,
    getSugestoes,
    adicionarHabilidade,
    salvarDataPlano,
  } = usePlanoAEE(alunoId);

  const [modalHorariosAberto, setModalHorariosAberto] = useState(false);
  const [modalHabilidadeAberto, setModalHabilidadeAberto] = useState(false);
  const [habilidadeParaSugestao, setHabilidadeParaSugestao] = useState(null);
  const [dadosIniciaisForm, setDadosIniciaisForm] = useState({
    key: Date.now(),
  });

  const idadeAluno = useMemo(() => {
    if (!aluno?.nascimento) return null;
    const dataNasc = aluno.nascimento.toDate
      ? aluno.nascimento.toDate()
      : new Date(aluno.nascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const m = hoje.getMonth() - dataNasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
      idade--;
    }
    return idade;
  }, [aluno]);

  const habilidadesAgrupadas = useMemo(() => {
    if (!plano?.habilidades) return {};
    return plano.habilidades.reduce((acc, hab) => {
      const area = hab.area || "Sem Área";
      if (!acc[area]) acc[area] = [];
      acc[area].push(hab);
      return acc;
    }, {});
  }, [plano]);

  const focarNoFormulario = () => {
    document
      .getElementById("form-registro-atividade")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleHabilidadeClick = useCallback((habilidade) => {
    setDadosIniciaisForm({
      key: Date.now(),
      tipo: "habilidade",
      dados: habilidade,
    });
    focarNoFormulario();
  }, []);

  const handleSelectSugestao = useCallback((sugestaoData) => {
    setDadosIniciaisForm({
      key: Date.now(),
      tipo: "sugestao",
      dados: sugestaoData,
    });
    setHabilidadeParaSugestao(null);
    focarNoFormulario();
  }, []);

  const handleSugestaoClick = useCallback((habilidade) => {
    setHabilidadeParaSugestao((h) =>
      h?.id === habilidade?.id ? null : habilidade
    );
  }, []);

  const handleGerarPDF = () => {
    if (aluno && plano) {
      gerarPDFAEE(aluno, plano, horariosAtendimento, atividades);
    } else {
      console.error(
        "Dados do aluno ou plano não estão disponíveis para gerar PDF."
      );
    }
  };

  if (plano === null && !estado.carregando) {
    return (
      <div className="acompanhamento-container-inicial">
        <div className="tela-inicial-card">
          <h2>Plano de Acompanhamento AEE</h2>
          <p>Nenhum Plano de AEE foi criado para este aluno.</p>
          <div className="opcoes-botoes">
            <button
              onClick={() => criarPlanoEmBranco(alunoId)}
              disabled={estado.carregando}
            >
              Criar Plano em Branco
            </button>
            <button
              onClick={() => importarDaAvaliacao(alunoId)}
              disabled={estado.carregando}
              className="botao-importar"
            >
              Importar da Avaliação
            </button>
          </div>
          {estado.erro && (
            <p className="mensagem-erro-inicial">{estado.erro}</p>
          )}
        </div>
      </div>
    );
  }

  if (estado.carregando || !plano || !aluno) {
    return <div className="loading-message">Carregando Plano de AEE...</div>;
  }

  return (
    <>
      {modalHorariosAberto && (
        <GerenciarHorarios
          horariosAtuais={horariosAtendimento}
          onSalvar={salvarHorariosAtendimento}
          onClose={() => setModalHorariosAberto(false)}
        />
      )}
      {modalHabilidadeAberto && (
        <AdicionarHabilidadeModal
          areasExistentes={Object.keys(habilidadesAgrupadas)}
          onSalvar={adicionarHabilidade}
          onClose={() => setModalHabilidadeAberto(false)}
        />
      )}

      <div className="acompanhamento-page">
        <header className="page-header">
          <Link to="/acompanhamento-aee-selecao" className="back-link">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Voltar
          </Link>
          <div className="header-central">
            <h1>Plano de Acompanhamento AEE</h1>
          </div>
          <div className="data-plano-container">
            {/* O BOTÃO FOI REMOVIDO DAQUI */}
            <label>Data do Plano:</label>
            <input
              type="date"
              value={plano.dataPlano || ""}
              onChange={(e) => salvarDataPlano(e.target.value)}
              className="data-plano-input"
            />
          </div>
        </header>

        <div className="aluno-info-header">
          <span className="info-item">
            <strong>Aluno(a):</strong> {aluno.nome}
          </span>
          <span className="info-item">
            <strong>Idade:</strong>{" "}
            {idadeAluno !== null ? `${idadeAluno} anos` : "N/A"}
          </span>
          <span className="info-item">
            <strong>Turma:</strong> {aluno.turma}
          </span>
        </div>

        <main className="page-content">
          <aside className="sidebar-plano">
            <section className="card-sidebar">
              <h2>Horários</h2>
              <div className="horarios-lista">
                {horariosAtendimento?.length > 0 ? (
                  horariosAtendimento.map(({ dia, inicio, fim }) => (
                    <p key={dia}>{`${dia}: das ${inicio} às ${fim}`}</p>
                  ))
                ) : (
                  <p>Nenhum horário cadastrado.</p>
                )}
              </div>
              <button
                onClick={() => setModalHorariosAberto(true)}
                className="botao-gerenciar-sidebar"
              >
                Gerenciar
              </button>
            </section>

            <section className="card-sidebar">
              <h2>Plano de Habilidades</h2>
              <div className="habilidades-container">
                {Object.entries(habilidadesAgrupadas).map(
                  ([area, habilidades]) => (
                    <Accordion
                      key={area}
                      area={area}
                      habilidades={habilidades}
                      onHabilidadeClick={handleHabilidadeClick}
                      onSugestaoClick={handleSugestaoClick}
                      habilidadeAberta={habilidadeParaSugestao}
                      getSugestoes={getSugestoes}
                      onSelectSugestao={handleSelectSugestao}
                    />
                  )
                )}
              </div>
              <button
                onClick={() => setModalHabilidadeAberto(true)}
                className="botao-adicionar-habilidade-sidebar"
              >
                + Adicionar Habilidade
              </button>
            </section>
          </aside>

          <section className="content-principal" id="form-registro-atividade">
            <div className="card-principal">
              <h2>Registrar Atendimento</h2>
              <FormularioAtividade
                plano={plano}
                onSalvar={salvarAtividade}
                estado={estado}
                dadosIniciais={dadosIniciaisForm}
                getSugestoes={getSugestoes}
              />
            </div>

            <div className="pdf-button-container">
              <button onClick={handleGerarPDF} className="botao-pdf-principal">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 16h8v2H8v-2Zm0-4h8v2H8v-2Zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6Zm4 18H6V4h7v5h5v11Z" />
                </svg>
                Gerar Relatório em PDF
              </button>
            </div>

            <div className="card-principal">
              <h2>Histórico Recente</h2>
              <div className="historico-atividades">
                {(atividades || []).map((reg) => (
                  <div key={reg.id} className="registro-card">
                    <span className="registro-data">
                      {reg.data.toDate().toLocaleDateString()}
                    </span>
                    {reg.quebraGelo && (
                      <p className="registro-descricao">
                        <strong>Quebra-Gelo:</strong> {reg.quebraGelo}
                      </p>
                    )}
                    <div className="registro-principal">
                      <p className="registro-descricao">
                        <strong>Atividade Principal:</strong>{" "}
                        {reg.atividadePrincipal.descricao}
                      </p>
                      {(reg.atividadePrincipal.habilidadesAvaliadas || []).map(
                        (atv, index) => (
                          <div
                            key={index}
                            className="habilidade-detalhe-historico"
                          >
                            <p>
                              <strong>Habilidade:</strong> {atv.habilidadeTexto}
                            </p>
                            <p>
                              <strong>Resultado:</strong>{" "}
                              <span
                                className={`resultado-badge ${atv.resultado.replace(
                                  /\s+/g,
                                  "-"
                                )}`}
                              >
                                {atv.resultado}
                              </span>
                            </p>
                            {atv.observacoes && (
                              <p className="obs-historico">
                                <strong>Obs:</strong> {atv.observacoes}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                    {reg.finalizacao && (
                      <p className="registro-descricao">
                        <strong>Finalização:</strong> {reg.finalizacao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export default AcompanhamentoAEE;
