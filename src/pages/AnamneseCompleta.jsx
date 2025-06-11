import React, { useState } from "react";
import BotaoVoltar from "../components/BotaoVoltar";

function AnamneseCompleta() {
  const [formData, setFormData] = useState({
    nome: "",
    nascimento: "",
    idade: "",
    engatinhou: "",
    caminhou: "",
    dificuldadesMotoras: "",
    descricaoDificuldadesMotoras: "",
    falouIdadeEsperada: "",
    dificuldadesFala: "",
    descricaoDificuldadesFala: "",
    usaFrases: "",
    compreendidoPorOutros: "",
    controlaXixiDia: "",
    controlaXixiNoite: "",
    precisaAuxilioBanheiro: "",
    usaFralda: "",
    demonstraEmocoesAdequadas: "",
    apresentaComportamentosAgressivos: "",
    temCrisesDeBirra: "",
    eAnsiosoTimido: "",
    descricaoAspectosEmocionais: "",
    relacaoAdultos: "",
    relacaoCriancas: "",
    dificuldadesSociais: "",
    prefereSozinho: "",
    descricaoRelacoesSociais: "",
    atencaoConcentracao: "",
    memoriaCurtoPrazo: "",
    memoriaLongoPrazo: "",
    solucaoProblemas: "",
    compreensaoConceitos: "",
    descricaoHabilidadesCognitivas: "",
    deficienciaVisual: "",
    deficienciaAuditiva: "",
    problemasSaude: "",
    medicamentosUso: "",
    descricaoMedicamentos: "",
    historicoEscolar: "",
    outrosDados: "",
    anexos: [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAnexos = (e) => {
    const arquivos = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      anexos: arquivos,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const alunos = JSON.parse(localStorage.getItem("alunos")) || [];

    const alunoIndex = alunos.findIndex(
      (aluno) => aluno.nome === formData.nome
    );

    if (alunoIndex === -1) {
      alert(
        "Aluno não encontrado! Certifique-se que o nome foi cadastrado exatamente igual."
      );
      return;
    }

    alunos[alunoIndex].anamneseCompleta = formData;

    alert("Anamnese salva com sucesso!");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#e0f7fa",
        padding: "40px",
      }}
    >
      <BotaoVoltar />

      <div style={containerStyle}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Anamnese Completa
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Identificação */}
          <h3 style={sectionTitle}>Identificação da Criança</h3>
          <input
            type="text"
            name="nome"
            placeholder="Nome completo"
            value={formData.nome}
            onChange={handleChange}
            required
            style={inputStyle}
          />
          <input
            type="date"
            name="nascimento"
            value={formData.nascimento}
            onChange={handleChange}
            required
            style={inputStyle}
          />
          <input
            type="number"
            name="idade"
            placeholder="Idade"
            value={formData.idade}
            onChange={handleChange}
            required
            style={inputStyle}
          />

          {/* Desenvolvimento Motor */}
          <h3 style={sectionTitle}>Desenvolvimento Motor</h3>
          <label style={labelStyle}>
            A criança engatinhou no tempo esperado?
          </label>
          <select
            name="engatinhou"
            value={formData.engatinhou}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="">Selecione</option>
            <option>Sim</option>
            <option>Não</option>
            <option>Não se aplica</option>
          </select>

          <label style={labelStyle}>
            A criança caminhou no tempo esperado?
          </label>
          <select
            name="caminhou"
            value={formData.caminhou}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="">Selecione</option>
            <option>Sim</option>
            <option>Não</option>
            <option>Não se aplica</option>
          </select>

          <label style={labelStyle}>Apresenta dificuldades motoras?</label>
          <select
            name="dificuldadesMotoras"
            value={formData.dificuldadesMotoras}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="">Selecione</option>
            <option>Sim</option>
            <option>Não</option>
          </select>

          {formData.dificuldadesMotoras === "Sim" && (
            <input
              type="text"
              name="descricaoDificuldadesMotoras"
              placeholder="Descreva as dificuldades motoras"
              value={formData.descricaoDificuldadesMotoras}
              onChange={handleChange}
              style={inputStyle}
            />
          )}

          {/* Desenvolvimento da Linguagem */}
          <h3 style={sectionTitle}>Desenvolvimento da Linguagem</h3>
          <label style={labelStyle}>Falou na idade esperada?</label>
          <select
            name="falouIdadeEsperada"
            value={formData.falouIdadeEsperada}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="">Selecione</option>
            <option>Sim</option>
            <option>Não</option>
          </select>

          <label style={labelStyle}>Apresenta dificuldades na fala?</label>
          <select
            name="dificuldadesFala"
            value={formData.dificuldadesFala}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="">Selecione</option>
            <option>Sim</option>
            <option>Não</option>
          </select>

          {formData.dificuldadesFala === "Sim" && (
            <input
              type="text"
              name="descricaoDificuldadesFala"
              placeholder="Descreva as dificuldades de fala"
              value={formData.descricaoDificuldadesFala}
              onChange={handleChange}
              style={inputStyle}
            />
          )}

          <label style={labelStyle}>Forma frases completas?</label>
          <select
            name="usaFrases"
            value={formData.usaFrases}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="">Selecione</option>
            <option>Sim</option>
            <option>Não</option>
          </select>

          <label style={labelStyle}>
            É compreendido por pessoas fora da família?
          </label>
          <select
            name="compreendidoPorOutros"
            value={formData.compreendidoPorOutros}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="">Selecione</option>
            <option>Sim</option>
            <option>Não</option>
          </select>

          {/* Anexos */}
          <h3 style={sectionTitle}>Anexar Documentos</h3>
          <input
            type="file"
            multiple
            accept=".pdf, .jpg, .jpeg, .png"
            onChange={handleAnexos}
            style={{ margin: "10px 0" }}
          />

          {/* Botão Finalizar */}
          <button type="submit" style={buttonStyle}>
            Salvar Anamnese Completa
          </button>
        </form>
      </div>
    </div>
  );
}

// Estilos:
const containerStyle = {
  backgroundColor: "#ffffff",
  padding: "30px",
  borderRadius: "8px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  maxWidth: "700px",
  margin: "0 auto",
};

const sectionTitle = {
  marginTop: "20px",
  marginBottom: "10px",
  fontSize: "20px",
  color: "#1d3557",
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold",
  marginTop: "10px",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "15px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  backgroundColor: "#4CAF50",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  fontSize: "16px",
  cursor: "pointer",
  marginTop: "20px",
};

export default AnamneseCompleta;
