import React, { useState, useEffect, useMemo } from "react";

// Função para interpretar o texto da IA. Agora ela vive aqui.
function parseAndFormatDescription(textData) {
  if (typeof textData !== "string" || !textData.trim()) {
    return null;
  }
  // Remove qualquer prefixo comum que a IA possa adicionar
  const cleanText = textData
    .replace(/```(json)?\s*/, "")
    .replace(/```\s*$/, "")
    .trim();

  const titleMatch = cleanText.match(/Título:\s*([\s\S]*?)(?=\nObjetivos:|$)/);
  const objectivesMatch = cleanText.match(
    /Objetivos:\s*([\s\S]*?)(?=\nRecursos:|$)/
  );
  const resourcesMatch = cleanText.match(
    /Recursos:\s*([\s\S]*?)(?=\nMetodologia:|$)/
  );
  const methodologyMatch = cleanText.match(
    /Metodologia:\s*([\s\S]*?)(?=\nDuração:|$)/
  );
  const durationMatch = cleanText.match(
    /(Duração|Duração Estimada):\s*([\s\S]*?)$/
  );

  const titulo = titleMatch ? titleMatch[1].trim() : "";
  const objetivos = objectivesMatch
    ? objectivesMatch[1]
        .trim()
        .split("\n")
        .map((o) => o.replace(/^- /, "").trim())
        .filter(Boolean)
    : [];
  const recursos = resourcesMatch ? resourcesMatch[1].trim() : "";
  const metodologia = methodologyMatch ? methodologyMatch[1].trim() : "";
  const duracao = durationMatch ? durationMatch[2].trim() : "";

  if (!titulo) return null; // Se não conseguir nem extrair o título, a formatação está errada.

  return `Título: ${titulo}\n\nObjetivos:\n${objetivos
    .map((o) => `- ${o}`)
    .join(
      "\n"
    )}\n\nRecursos: ${recursos}\n\nMetodologia: ${metodologia}\n\nDuração: ${duracao}`;
}

const LinhaHabilidade = ({
  item,
  onChange,
  onRemove,
  plano,
  showRemoveButton,
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
      <div className="form-group">
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
      </div>
      <div className="form-group">
        <label>Resultado*</label>
        <div className="botoes-resultado">
          <button
            type="button"
            onClick={() => onChange("resultado", "Deu Certo")}
            className={item.resultado === "Deu Certo" ? "ativo" : ""}
          >
            Deu Certo
          </button>
          <button
            type="button"
            onClick={() => onChange("resultado", "Parcial")}
            className={item.resultado === "Parcial" ? "ativo" : ""}
          >
            Parcial
          </button>
          <button
            type="button"
            onClick={() => onChange("resultado", "Com Dificuldade")}
            className={item.resultado === "Com Dificuldade" ? "ativo" : ""}
          >
            Com Dificuldade
          </button>
        </div>
      </div>
      <div className="form-group">
        <label>Observações</label>
        <textarea
          rows="2"
          value={item.observacoes}
          onChange={(e) => onChange("observacoes", e.target.value)}
          placeholder="Como o aluno respondeu?"
        />
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
}) {
  const [formData, setFormData] = useState({
    quebraGelo: "",
    atividadePrincipal: {
      descricao: "",
      habilidadesAvaliadas: [
        { key: Date.now(), habilidadeId: "", resultado: "", observacoes: "" },
      ],
    },
    finalizacao: "",
  });
  const [sugestaoCarregando, setSugestaoCarregando] = useState({
    quebraGelo: false,
    finalizacao: false,
  });

  useEffect(() => {
    if (!dadosIniciais?.tipo) return;
    const { tipo, dados } = dadosIniciais;

    if (tipo === "sugestao") {
      const { habilidade, descricao: descricaoBruta } = dados;

      const descCompleta = parseAndFormatDescription(descricaoBruta);

      if (!descCompleta) {
        console.error(
          "Falha ao formatar a descrição da sugestão.",
          descricaoBruta
        );
        alert("Erro ao carregar a sugestão. O formato do texto é inválido.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        atividadePrincipal: {
          ...prev.atividadePrincipal,
          descricao: descCompleta,
          habilidadesAvaliadas: [
            {
              key: Date.now(),
              habilidadeId: habilidade.id,
              resultado: "",
              observacoes: "",
            },
          ],
        },
      }));
    } else if (tipo === "habilidade") {
      setFormData((prev) => ({
        ...prev,
        atividadePrincipal: {
          ...prev.atividadePrincipal,
          habilidadesAvaliadas: [
            {
              key: Date.now(),
              habilidadeId: dados.id,
              resultado: "",
              observacoes: "",
            },
          ],
        },
      }));
    }
  }, [dadosIniciais]);

  const handleSugerir = async (tipo) => {
    setSugestaoCarregando((prev) => ({ ...prev, [tipo]: true }));
    try {
      const sugestao = await getSugestoes(tipo);
      setFormData((prev) => ({ ...prev, [tipo]: sugestao }));
    } catch (e) {
      alert(e.message);
    } finally {
      setSugestaoCarregando((prev) => ({ ...prev, [tipo]: false }));
    }
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

  const adicionarLinhaHabilidade = () => {
    const novasHabilidades = [
      ...formData.atividadePrincipal.habilidadesAvaliadas,
      { key: Date.now(), habilidadeId: "", resultado: "", observacoes: "" },
    ];
    handlePrincipalChange("habilidadesAvaliadas", novasHabilidades);
  };

  const removerLinhaHabilidade = (index) => {
    const novasHabilidades =
      formData.atividadePrincipal.habilidadesAvaliadas.filter(
        (_, i) => i !== index
      );
    handlePrincipalChange("habilidadesAvaliadas", novasHabilidades);
  };

  const limparFormulario = () => {
    setFormData({
      quebraGelo: "",
      atividadePrincipal: {
        descricao: "",
        habilidadesAvaliadas: [
          { key: Date.now(), habilidadeId: "", resultado: "", observacoes: "" },
        ],
      },
      finalizacao: "",
    });
  };

  const handleSalvarClick = () => {
    const { atividadePrincipal } = formData;
    if (!atividadePrincipal.descricao.trim()) {
      alert("A descrição da atividade principal é obrigatória.");
      return;
    }
    const validas = atividadePrincipal.habilidadesAvaliadas.filter(
      (h) => h.habilidadeId && h.resultado
    );
    if (validas.length === 0) {
      alert(
        "Adicione e avalie pelo menos uma habilidade na atividade principal."
      );
      return;
    }

    const dadosParaSalvar = {
      ...formData,
      atividadePrincipal: {
        ...atividadePrincipal,
        habilidadesAvaliadas: validas.map(({ key, ...h }) => ({
          ...h,
          habilidadeTexto:
            plano.habilidades.find((ph) => ph.id === h.habilidadeId)
              ?.habilidade || "N/A",
        })),
      },
    };
    onSalvar(dadosParaSalvar);
    limparFormulario();
  };

  const podeSalvar =
    formData.atividadePrincipal.descricao.trim() &&
    formData.atividadePrincipal.habilidadesAvaliadas.some(
      (h) => h.habilidadeId && h.resultado
    ) &&
    !estado.carregando;

  return (
    <div className="form-atividade-content">
      <div className="form-section quebra-gelo-section">
        <div className="form-section-header">
          <label htmlFor="quebra-gelo">Quebra-Gelo (Opcional)</label>
          <button
            type="button"
            className="botao-sugerir-mini"
            onClick={() => handleSugerir("quebraGelo")}
            disabled={sugestaoCarregando.quebraGelo}
          >
            {sugestaoCarregando.quebraGelo ? "Gerando..." : "💡 Sugerir"}
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
            placeholder="Descreva a atividade central do atendimento ou clique em 'Sugerir atividades com IA' (💡) ao lado de uma habilidade."
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
          />
        ))}
        <button
          type="button"
          onClick={adicionarLinhaHabilidade}
          className="botao-adicionar-card-habilidade"
        >
          + Adicionar Habilidade
        </button>
      </div>

      <div className="form-section finalizacao-section">
        <div className="form-section-header">
          <label htmlFor="finalizacao">Finalização (Opcional)</label>
          <button
            type="button"
            className="botao-sugerir-mini"
            onClick={() => handleSugerir("finalizacao")}
            disabled={sugestaoCarregando.finalizacao}
          >
            {sugestaoCarregando.finalizacao ? "Gerando..." : "💡 Sugerir"}
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
