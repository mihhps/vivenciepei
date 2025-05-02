// src/pages/ImportarAlunos.jsx
import React from "react";
import BotaoVoltar from "../components/BotaoVoltar";

function ImportarAlunos() {
  const listaInclusao = [
    {
 
        nome: "Benício Gomes Das Neves",
        turma: "Pré I",
        turno: "Matutino",
        diagnostico: "TEA Nível III (6A02.3)"
      },
      {
        nome: "Vitor Airoso",
        turma: "Pré I",
        turno: "Matutino",
        diagnostico: "TEA (F84.9) (F80.8)"
      },
      {
        nome: "Gael Freitas Barboza da Silva",
        turma: "Pré I",
        turno: "Vespertino",
        diagnostico: "TEA Nível II (F84.0) (6A02.Z)"
      },
      {
        nome: "Sofia Valentina Nicolodi",
        turma: "Pré I",
        turno: "Vespertino",
        diagnostico: "TEA II (F84.0)"
      },
      {
        nome: "Erick Gustavo Freitas",
        turma: "Pré II",
        turno: "Matutino",
        diagnostico: "TEA (F84.0) (6402.Y)"
      },
      {
        nome: "Cristhofer Yago Polheim",
        turma: "Pré II",
        turno: "Vespertino",
        diagnostico: "TEA (F84.0) (FR80.8) (6402.Y)"
      },
      {
        nome: "Heitor Pollheim Schirmer",
        turma: "Pré II",
        turno: "Matutino",
        diagnostico: "TEA e TDAH (6A02.2) (6A05.2)"
      },
      {
        nome: "Maria Fernanda da Silva Moraes",
        turma: "Pré II",
        turno: "Matutino",
        diagnostico: "TEA (F84.0) (6A02)"
      },
      {
        nome: "Luiz Antônio Schirmer",
        turma: "Pré II",
        turno: "Vespertino",
        diagnostico: "TEA (6A02.Z)"
      },
      {
        nome: "Ana Lara Zabel da Mota",
        turma: "1º ano",
        turno: "Matutino",
        diagnostico: "TEA"
      },
      {
        nome: "Asafe Lopes Machado",
        turma: "1º ano",
        turno: "Vespertino",
        diagnostico: "TDAH e TOD (CID 10: F90.0 + F91.3) (CID 11: 6A05.2)"
      },
      {
        nome: "Stefany Carol Ferreira Brito",
        turma: "2º ano",
        turno: "Vespertino",
        diagnostico: "TDAH (F6A05.2)"
      },
      {
        nome: "Davi Lucas Da Silva Rocha",
        turma: "2º ano",
        turno: "Vespertino",
        diagnostico: "TEA"
      },
      {
        nome: "Ezequiel Vicenzo Silva Rylander",
        turma: "3º ano",
        turno: "Matutino",
        diagnostico: "TDAH (F90)"
      },
      {
        nome: "Vicente de Matos",
        turma: "3º ano",
        turno: "Matutino",
        diagnostico: "TEA I (F84.0)"
      },
      {
        nome: "Matheus Henrique Lacerda Valentim",
        turma: "3º ano",
        turno: "Vespertino",
        diagnostico: "TEA e TDAH"
      },
      {
        nome: "Arthur Minatti",
        turma: "3º ano",
        turno: "Vespertino",
        diagnostico: "TEA II (F84.0)"
      },
      {
        nome: "Heloísa Helena Ferreira",
        turma: "3º ano",
        turno: "Vespertino",
        diagnostico: "TDAH (F90.0) (6A05.2)"
      },
      {
        nome: "Arthur Acir Schmiloski Dalpra Lima",
        turma: "4º ano",
        turno: "Matutino",
        diagnostico: "TEA I e TDAH (F84.0) (F90.0) (6A02.Z)"
      },
      {
        nome: "Maurício José da Silva Vitorino",
        turma: "4º ano",
        turno: "Matutino",
        diagnostico: "Encaminhado para neurologista e avaliado AEE"
      },
      {
        nome: "Matheus José Minatti",
        turma: "5º ano",
        turno: "Vespertino",
        diagnostico: "TEA (F84.0)"
      },
      {
        nome: "Maria Eduarda Ribeiro Santos",
        turma: "5º ano",
        turno: "Vespertino",
        diagnostico: "DI leve, dificuldade nas habilidades escolares, comunicação e tarefas diárias"
      },
      {
        nome: "Laura Ribeiro Zabel",
        turma: "5º ano",
        turno: "Vespertino",
        diagnostico: "Diabetes Tipo I"
      },
      {
        nome: "Edison Sartoti Junior",
        turma: "6º ano",
        turno: "Vespertino",
        diagnostico: "TEA II (F84.0)"
      },
      {
        nome: "Gabriel Cecílio Pereira Lopes",
        turma: "6º ano",
        turno: "Vespertino",
        diagnostico: "Parecer pedagógico"
      },
      {
        nome: "Kassiel Rescaroli Ávila",
        turma: "6º ano",
        turno: "Vespertino",
        diagnostico: "TDAH (F90.0) / TEA (F84.0) / F80.8"
      },
      {
        nome: "Murilo dos Santos Fontes",
        turma: "6º ano",
        turno: "Vespertino",
        diagnostico: "Transtorno específico da soletração (F81.1) / DI?"
      },
      {
        nome: "Miguel Roberto da Rosa Turo",
        turma: "6º ano",
        turno: "Vespertino",
        diagnostico: "F83.0 / Epilepsia (G40.0) / TDAH / DI"
      },
      {
        nome: "Wendrel Silva Nascimento",
        turma: "6º ano",
        turno: "Vespertino",
        diagnostico: "Encefalopatia crônica não evolutiva / DI / Epilepsia / Síndrome genética"
      },
      {
        nome: "Gabriel Batista dos Santos de Lima",
        turma: "7º ano",
        turno: "Matutino",
        diagnostico: "F84.9 / F70.0 / F80.8"
      },
      {
        nome: "Nicolas Pietro Rodrigues da Rosa",
        turma: "7º ano",
        turno: "Matutino",
        diagnostico: "TDAH (F81.8) (F90.0)"
      },
      {
        nome: "Jhonatan Henrique de Aguiar Pollheim",
        turma: "7º ano",
        turno: "Matutino",
        diagnostico: "DI leve / TDAH / F80"
      },
      {
        nome: "Maxwell dos Santos Rodrigues Pio",
        turma: "7º ano",
        turno: "Matutino",
        diagnostico: "Encaminhado neurologista e avaliado AEE"
      },
      {
        nome: "Israel Júlio da Silva Lemos",
        turma: "8º ano",
        turno: "Vespertino",
        diagnostico: "TDAH (6A05.2)"
      },
      {
        nome: "Victor Cecílio Pereira Lopes",
        turma: "8º ano",
        turno: "Vespertino",
        diagnostico: "Parecer pedagógico"
      },
      {
        nome: "Arthur Prim",
        turma: "9º ano",
        turno: "Matutino",
        diagnostico: "TEA (F84.0)"
      },
      {
        nome: "David Henrique Paz",
        turma: "9º ano",
        turno: "Matutino",
        diagnostico: "TDAH (F90.0) / Crises convulsivas (R56)"
      },
      {
        nome: "Kauan Hatafióio Alves de Souza",
        turma: "9º ano",
        turno: "Matutino",
        diagnostico: "Atraso no desenvolvimento / F81"
      },
      {
        nome: "Nadson Murilo da Silva Polheim",
        turma: "9º ano",
        turno: "Matutino",
        diagnostico: "F81.3 / F90.0 / Dislexia"
      },
      {
        nome: "Thabyta Clara Espíndula",
        turma: "9º ano",
        turno: "Matutino",
        diagnostico: "F81.3 / F90.0 / Dislexia"
      },
      {
        nome: "Diego Severino",
        turma: "8º ano",
        turno: "Vespertino",
        diagnostico: "F81.8 / F90.0 / R48.0 / F80.8"
      },
      {
        nome: "Eliseu da Silva Mazorca",
        turma: "9º ano",
        turno: "Matutino",
        diagnostico: "TEA e TDAH (F84.0) (F90.0)"
      },
      {
        nome: "Andrei Soares Poli",
        turma: "9º ano",
        turno: "Matutino",
        diagnostico: "TDAH (F90.0)"
     
    }
    // ... continue a lista conforme necessário ...
  ];

  const importarAlunos = () => {
    const alunosExistentes = JSON.parse(localStorage.getItem("alunos")) || [];

    const novosAlunos = listaInclusao.map((aluno) => ({
      nome: aluno.nome,
      turma: aluno.turma,
      turno: aluno.turno,
      diagnostico: aluno.diagnostico,
      cuidador: aluno.cuidador || "",
      nascimento: "",
      idade: "",
      foto: null,
      anamnese: {
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
        anexos: []
      },
      avaliacaoInicial: {
        turma: aluno.turma,
        avaliacao: {},
        anexos: []
      }
    }));

    const atualizados = [...alunosExistentes, ...novosAlunos];
    localStorage.setItem("alunos", JSON.stringify(atualizados));
    
    console.log("Alunos importados:", atualizados);

    alert(`Importação realizada! ${novosAlunos.length} alunos adicionados.`);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#e0f7fa", padding: "40px" }}>
      <BotaoVoltar />
      <div style={containerStyle}>
        <h2 style={{ textAlign: "center" }}>Importar Alunos da Inclusão 2025</h2>
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          Clique no botão abaixo para importar automaticamente todos os alunos da inclusão.
        </p>
        <button onClick={importarAlunos} style={buttonStyle}>
          Importar Lista
        </button>
      </div>
    </div>
  );
}

// Estilos
const containerStyle = {
  backgroundColor: "#ffffff",
  padding: "30px",
  borderRadius: "8px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  maxWidth: "600px",
  margin: "30px auto",
  textAlign: "center"
};

const buttonStyle = {
  marginTop: "30px",
  padding: "15px 30px",
  fontSize: "16px",
  backgroundColor: "#4CAF50",
  color: "#ffffff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer"
};

export default ImportarAlunos;