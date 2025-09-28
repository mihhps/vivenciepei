import React, { useState, useEffect, useMemo } from "react";

// Componente LinhaHabilidade (sem alterações)
const LinhaHabilidade = ({
  item,
  onChange,
  onRemove,
  plano,
  showRemoveButton,
  onAbrirSugestoes,
}) => {
  const habilidadesAgrupadas = useMemo(() => {
    if (!plano?.habilidades) return {};
    return plano.habilidades.reduce((acc, hab) => {
      const area = hab.area || "Sem Área";
      if (!acc[area]) acc[area] = [];
      acc[area].push(hab);
      return acc;
    }, {});
  }, [plano]);

  const habilidadeSelecionada = useMemo(() => {
    return plano.habilidades.find((h) => h.id === item.habilidadeId);
  }, [item.habilidadeId, plano.habilidades]);

  return (
    <div className="habilidade-avaliada-card">
      {showRemoveButton && (
        <button
          type="button"
          onClick={onRemove}
          className="botao-remover-card-habilidade"
        >
          ×
        </button>
      )}
      <div className="form-group select-habilidade-wrapper">
        <label>Habilidade Trabalhada*</label>
        <select
          value={item.habilidadeId}
          onChange={(e) => onChange("habilidadeId", e.target.value)}
          required
        >
          <option value="">Selecione...</option>
          {Object.entries(habilidadesAgrupadas).map(([area, lista]) => (
            <optgroup label={area} key={area}>
              {lista.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.habilidade}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {item.habilidadeId && (
          <button
            type="button"
            className="sugestao-icon-btn-form"
            title="Sugerir atividades com IA"
            onClick={() => onAbrirSugestoes(habilidadeSelecionada)}
          >
            💡
          </button>
        )}
      </div>
    </div>
  );
};

function FormularioAtividade({
  plano,
  onSalvar,
  estado,
  dadosIniciais,
  getSugestoes,
  onAbrirSugestoes,
}) {
  // ALTERAÇÃO: Adicionado estado para a data da atividade
  const [dataAtividade, setDataAtividade] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [formData, setFormData] = useState({
    quebraGelo: "",
    atividadePrincipal: {
      descricao: "",
      habilidadesAvaliadas: [{ key: Date.now(), habilidadeId: "" }],
    },
    finalizacao: "",
  });

  // O resto do seu código (hooks, effects, etc.) permanece o mesmo até a função handleSalvarClick...
  // ... (todo o código que você já tem fica aqui) ...

  const [sugestaoCarregando, setSugestaoCarregando] = useState({
    quebraGelo: false,
    finalizacao: false,
  });
  const [sugestoesDisponiveis, setSugestoesDisponiveis] = useState({
    quebraGelo: [],
    finalizacao: [],
  });
  const [indicesAtuais, setIndicesAtuais] = useState({
    quebraGelo: 0,
    finalizacao: 0,
  });

  useEffect(() => {
    if (!dadosIniciais?.tipo) return;
    if (dadosIniciais.tipo === "habilidade") {
      const habilidadeJaExiste =
        formData.atividadePrincipal.habilidadesAvaliadas.some(
          (h) => h.habilidadeId === dadosIniciais.dados.id
        );
      if (!habilidadeJaExiste) {
        const primeiraLinhaVazia =
          formData.atividadePrincipal.habilidadesAvaliadas.findIndex(
            (h) => !h.habilidadeId
          );
        if (primeiraLinhaVazia !== -1) {
          const novasHabilidades = [
            ...formData.atividadePrincipal.habilidadesAvaliadas,
          ];
          novasHabilidades[primeiraLinhaVazia].habilidadeId =
            dadosIniciais.dados.id;
          setFormData((prev) => ({
            ...prev,
            atividadePrincipal: {
              ...prev.atividadePrincipal,
              habilidadesAvaliadas: novasHabilidades,
            },
          }));
        } else {
          adicionarLinhaHabilidade(dadosIniciais.dados.id);
        }
      }
    } else if (dadosIniciais.tipo === "sugestao") {
      setFormData((prev) => ({
        ...prev,
        atividadePrincipal: {
          ...prev.atividadePrincipal,
          descricao: dadosIniciais.dados.descricao,
        },
      }));
      const habilidadeDaSugestao = dadosIniciais.dados.habilidade;
      const habilidadeJaExiste =
        formData.atividadePrincipal.habilidadesAvaliadas.some(
          (h) => h.habilidadeId === habilidadeDaSugestao.id
        );
      if (!habilidadeJaExiste) {
        const primeiraLinhaVazia =
          formData.atividadePrincipal.habilidadesAvaliadas.findIndex(
            (h) => !h.habilidadeId
          );
        if (primeiraLinhaVazia !== -1) {
          const novasHabilidades = [
            ...formData.atividadePrincipal.habilidadesAvaliadas,
          ];
          novasHabilidades[primeiraLinhaVazia].habilidadeId =
            habilidadeDaSugestao.id;
          setFormData((prev) => ({
            ...prev,
            atividadePrincipal: {
              ...prev.atividadePrincipal,
              habilidadesAvaliadas: novasHabilidades,
            },
          }));
        } else {
          adicionarLinhaHabilidade(habilidadeDaSugestao.id);
        }
      }
    }
  }, [dadosIniciais]);

  const handleSugerir = async (tipo) => {
    setSugestaoCarregando((prev) => ({ ...prev, [tipo]: true }));
    try {
      let listaSugestoes = sugestoesDisponiveis[tipo];
      let indiceAtual = indicesAtuais[tipo];
      if (listaSugestoes.length === 0 || indiceAtual === 0) {
        listaSugestoes = await getSugestoes(tipo, null, true);
        if (!listaSugestoes || listaSugestoes.length === 0) {
          throw new Error("Nenhuma sugestão foi retornada.");
        }
        setSugestoesDisponiveis((prev) => ({
          ...prev,
          [tipo]: listaSugestoes,
        }));
        setIndicesAtuais((prev) => ({ ...prev, [tipo]: 1 }));
        const primeiraSugestao = listaSugestoes[0];
        const texto =
          typeof primeiraSugestao === "object" && primeiraSugestao.texto
            ? primeiraSugestao.texto
            : primeiraSugestao;
        setFormData((prev) => ({ ...prev, [tipo]: texto }));
      } else {
        const proximaSugestao = listaSugestoes[indiceAtual];
        const proximoIndice = (indiceAtual + 1) % listaSugestoes.length;
        setIndicesAtuais((prev) => ({ ...prev, [tipo]: proximoIndice }));
        const texto =
          typeof proximaSugestao === "object" && proximaSugestao.texto
            ? proximaSugestao.texto
            : proximaSugestao;
        setFormData((prev) => ({ ...prev, [tipo]: texto }));
      }
    } catch (e) {
      alert(e.message || "Não foi possível buscar a sugestão.");
    } finally {
      setSugestaoCarregando((prev) => ({ ...prev, [tipo]: false }));
    }
  };

  const getButtonText = (tipo) => {
    if (sugestaoCarregando[tipo]) return "Gerando...";
    if (sugestoesDisponiveis[tipo].length > 0) {
      return indicesAtuais[tipo] === 0
        ? "💡 Buscar Novas Ideias"
        : `💡 Próxima Sugestão`;
    }
    return "💡 Sugerir";
  };

  const handlePrincipalChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      atividadePrincipal: { ...prev.atividadePrincipal, [field]: value },
    }));
  };

  const handleHabilidadeChange = (index, field, value) => {
    const novasHabilidades = [
      ...formData.atividadePrincipal.habilidadesAvaliadas,
    ];
    novasHabilidades[index][field] = value;
    handlePrincipalChange("habilidadesAvaliadas", novasHabilidades);
  };

  const adicionarLinhaHabilidade = (habilidadeId = "") => {
    handlePrincipalChange("habilidadesAvaliadas", [
      ...formData.atividadePrincipal.habilidadesAvaliadas,
      { key: Date.now(), habilidadeId },
    ]);
  };

  const removerLinhaHabilidade = (index) => {
    handlePrincipalChange(
      "habilidadesAvaliadas",
      formData.atividadePrincipal.habilidadesAvaliadas.filter(
        (_, i) => i !== index
      )
    );
  };

  const limparFormulario = () => {
    setDataAtividade(new Date().toISOString().split("T")[0]); // Reseta a data também
    setFormData({
      quebraGelo: "",
      atividadePrincipal: {
        descricao: "",
        habilidadesAvaliadas: [{ key: Date.now(), habilidadeId: "" }],
      },
      finalizacao: "",
    });
    setSugestoesDisponiveis({ quebraGelo: [], finalizacao: [] });
    setIndicesAtuais({ quebraGelo: 0, finalizacao: 0 });
  };

  const handleSalvarClick = () => {
    const { atividadePrincipal } = formData;
    if (!atividadePrincipal.descricao.trim()) {
      alert("A descrição da atividade principal é obrigatória.");
      return;
    }
    const validas = atividadePrincipal.habilidadesAvaliadas.filter(
      (h) => h.habilidadeId
    );
    if (validas.length === 0) {
      alert(
        "Adicione pelo menos uma habilidade trabalhada na atividade principal."
      );
      return;
    }

    const dadosParaSalvar = {
      ...formData,
      dataAtividade, // ALTERAÇÃO: Incluindo a data no objeto a ser salvo
      atividadePrincipal: {
        ...atividadePrincipal,
        habilidadesAvaliadas: validas.map(({ key, ...h }) => ({
          ...h,
          habilidadeTexto:
            plano.habilidades.find((ph) => ph.id === h.habilidadeId)
              ?.habilidade || "N/A",
          resultado: "",
          observacoes: "",
        })),
      },
    };
    onSalvar(dadosParaSalvar);
    limparFormulario();
  };

  const podeSalvar =
    formData.atividadePrincipal.descricao.trim() &&
    formData.atividadePrincipal.habilidadesAvaliadas.some(
      (h) => h.habilidadeId
    ) &&
    !estado.carregando;

  return (
    <div className="form-atividade-content">
      {/* ALTERAÇÃO: Adicionado o campo de data no topo do formulário */}
      <div className="form-group" style={{ marginBottom: "20px" }}>
        <label htmlFor="data-atividade" style={{ fontWeight: "bold" }}>
          Data da Atividade*
        </label>
        <input
          type="date"
          id="data-atividade"
          value={dataAtividade}
          onChange={(e) => setDataAtividade(e.target.value)}
          className="input-data-atividade" // Adicione uma classe se precisar de estilo específico
        />
      </div>

      <div className="form-section quebra-gelo-section">
        {/* ... (resto do seu JSX quebra-gelo) ... */}
        <div className="form-section-header">
          <label htmlFor="quebra-gelo">Quebra-Gelo (Opcional)</label>
          <button
            type="button"
            className="botao-sugerir-mini"
            onClick={() => handleSugerir("quebraGelo")}
            disabled={sugestaoCarregando.quebraGelo}
          >
            {getButtonText("quebraGelo")}
          </button>
        </div>
        <div className="form-group">
          <textarea
            id="quebra-gelo"
            rows="3"
            value={formData.quebraGelo}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, quebraGelo: e.target.value }))
            }
            placeholder="Descreva a atividade inicial..."
          />
        </div>
      </div>

      <div className="form-section">
        {/* ... (resto do seu JSX atividade principal) ... */}
        <div className="form-section-header">
          <label>Atividade Principal*</label>
        </div>
        <div className="form-group">
          <label htmlFor="descricao-principal">Descrição da Atividade</label>
          <textarea
            id="descricao-principal"
            rows="12"
            value={formData.atividadePrincipal.descricao}
            onChange={(e) => handlePrincipalChange("descricao", e.target.value)}
            placeholder="Descreva a atividade central do atendimento..."
            required
          />
        </div>
        <label className="label-habilidades-avaliadas">
          Habilidades Trabalhadas*
        </label>
        {formData.atividadePrincipal.habilidadesAvaliadas.map((item, index) => (
          <LinhaHabilidade
            key={item.key}
            item={item}
            onChange={(field, value) =>
              handleHabilidadeChange(index, field, value)
            }
            onRemove={() => removerLinhaHabilidade(index)}
            plano={plano}
            showRemoveButton={
              formData.atividadePrincipal.habilidadesAvaliadas.length > 1
            }
            onAbrirSugestoes={onAbrirSugestoes}
          />
        ))}
        <button
          type="button"
          onClick={() => adicionarLinhaHabilidade()}
          className="botao-adicionar-card-habilidade"
        >
          + Adicionar Habilidade
        </button>
      </div>

      <div className="form-section finalizacao-section">
        {/* ... (resto do seu JSX finalização) ... */}
        <div className="form-section-header">
          <label htmlFor="finalizacao">Finalização (Opcional)</label>
          <button
            type="button"
            className="botao-sugerir-mini"
            onClick={() => handleSugerir("finalizacao")}
            disabled={sugestaoCarregando.finalizacao}
          >
            {getButtonText("finalizacao")}
          </button>
        </div>
        <div className="form-group">
          <textarea
            id="finalizacao"
            rows="3"
            value={formData.finalizacao}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, finalizacao: e.target.value }))
            }
            placeholder="Descreva a atividade de encerramento..."
          />
        </div>
      </div>

      <button
        className="botao-salvar-atividade"
        onClick={handleSalvarClick}
        disabled={!podeSalvar}
      >
        {estado.carregando ? "Salvando..." : "Salvar Registro Completo"}
      </button>
    </div>
  );
}

export default FormularioAtividade;
