import React, { useState, useEffect, useCallback, useMemo } from "react"; // Adicione useMemo
import { getDocs, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import "./VincularEscolas.css"; // Certifique-se de que o caminho está correto

// --- Componente Auxiliar para renderizar os checkboxes de escolas ---
const EscolaCheckboxes = ({
  prof,
  escolas, // Recebe a lista completa de escolas
  edicoesPendentes,
  toggleEscola,
  salvarEscolas,
}) => {
  return (
    <>
      <div className="checkbox-container-list">
        {escolas.map((escola) => (
          <label key={escola.id} className="checkbox-label">
            <input
              type="checkbox"
              checked={
                edicoesPendentes[prof.id]?.[escola.id] ??
                !!prof.escolas?.[escola.id]
              }
              onChange={() => toggleEscola(prof.id, escola.id)}
              // style={{ marginTop: 2 }} // Remover: mover para o CSS se necessário
            />
            <span /* style={{ marginLeft: 8 }} */>{escola.nome}</span>{" "}
            {/* Remover: o gap no .checkbox-label já cuida disso */}
          </label>
        ))}
      </div>
      {/* Exibir o botão salvar apenas se houver edições pendentes para este professor */}
      {edicoesPendentes[prof.id] &&
        Object.keys(edicoesPendentes[prof.id]).length > 0 && (
          <button
            onClick={() =>
              salvarEscolas(
                prof.id,
                edicoesPendentes[prof.id] || {} // Passa as edições pendentes para a função de salvar
              )
            }
            className="vinculacao-botao-base vinculacao-botao-salvar"
          >
            Salvar alterações
          </button>
        )}
    </>
  );
};

// --- Componente Principal: VincularEscolas ---
export default function VincularEscolas() {
  const [professores, setProfessores] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [modoEdicaoGeral, setModoEdicaoGeral] = useState(false);
  const [edicoesPendentes, setEdicoesPendentes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Efeito para verificação de autorização do usuário
  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (
      !usuario ||
      !(usuario.perfil === "gestao" || usuario.perfil === "desenvolvedor")
    ) {
      alert("Apenas perfis autorizados podem acessar esta página.");
      navigate("/");
    }
  }, [navigate]);

  // Função para carregar dados de usuários e escolas do Firebase
  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usuariosSnap = await getDocs(collection(db, "usuarios"));
      const escolasSnap = await getDocs(collection(db, "escolas"));

      const professoresFiltrados = usuariosSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((u) =>
          [
            "professor",
            "diretor",
            "diretor adjunto",
            "orientador pedagógico",
            "aee",
          ].includes(u.perfil?.toLowerCase())
        );

      const escolasListadas = escolasSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProfessores(professoresFiltrados);
      setEscolas(escolasListadas);

      // Define a escola selecionada inicial se ainda não estiver definida
      if (!escolaSelecionada) {
        if (escolasListadas.length > 0) {
          setEscolaSelecionada(escolasListadas[0]);
        } else {
          setEscolaSelecionada("semVinculo");
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [escolaSelecionada]);

  // Efeito para carregar dados na montagem do componente
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Lógica para alternar o vínculo de uma escola para um professor nas edições pendentes
  const toggleEscola = useCallback(
    (profId, escolaId) => {
      setEdicoesPendentes((prev) => {
        const professorEdicoes = { ...(prev[profId] || {}) };
        const isCurrentlyLinked = professores.find((p) => p.id === profId)
          ?.escolas?.[escolaId];

        if (professorEdicoes[escolaId] === undefined) {
          professorEdicoes[escolaId] = !isCurrentlyLinked;
        } else {
          professorEdicoes[escolaId] = !professorEdicoes[escolaId];
        }

        if (professorEdicoes[escolaId] === isCurrentlyLinked) {
          delete professorEdicoes[escolaId];
        }

        if (Object.keys(professorEdicoes).length === 0) {
          const novo = { ...prev };
          delete novo[profId];
          return novo;
        }

        return { ...prev, [profId]: professorEdicoes };
      });
    },
    [professores]
  );

  // Função para salvar as escolas vinculadas de um professor no Firebase
  const salvarEscolas = useCallback(
    async (profId, edicoesDoProfessor) => {
      setIsLoading(true);
      setError(null);
      try {
        const professorAtual = professores.find((p) => p.id === profId);
        if (!professorAtual)
          throw new Error("Professor não encontrado para salvar.");

        const escolasFinais = { ...(professorAtual.escolas || {}) };
        for (const escolaId in edicoesDoProfessor) {
          if (edicoesDoProfessor[escolaId] === true) {
            escolasFinais[escolaId] = true;
          } else if (edicoesDoProfessor[escolaId] === false) {
            delete escolasFinais[escolaId];
          }
        }
        console.log("🔍 Salvando escolas para", profId, escolasFinais);

        await updateDoc(doc(db, "usuarios", profId), {
          escolas: escolasFinais,
        });

        setEdicoesPendentes((prev) => {
          const novo = { ...prev };
          delete novo[profId];
          return novo;
        });

        await carregarDados();
        alert("Vínculos atualizados com sucesso!");
      } catch (err) {
        console.error("Erro ao salvar:", err);
        setError("Erro ao salvar vínculos. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    },
    [carregarDados, professores]
  );

  // Filtra professores com base na escola selecionada ou se estão sem vínculo
  const professoresFiltradosParaExibicao = useMemo(() => {
    if (escolaSelecionada === "semVinculo") {
      return professores.filter(
        (prof) => !prof.escolas || Object.keys(prof.escolas).length === 0
      );
    } else if (escolaSelecionada && typeof escolaSelecionada === "object") {
      return professores.filter((prof) =>
        Object.keys(prof.escolas || {}).includes(escolaSelecionada.id)
      );
    }
    return [];
  }, [professores, escolaSelecionada]);

  return (
    <div className="vinculacao-container">
      <div className="vinculacao-card">
        <BotaoVoltar className="vinculacao-botao-base vinculacao-botao-voltar" />
        <h2 className="vinculacao-titulo">Vincular Escolas a Professores</h2>
        <div className="vinculacao-abas-container">
          {escolas.map((escola) => (
            <button
              key={escola.id}
              className={`vinculacao-aba ${
                escolaSelecionada?.id === escola.id ? "active" : ""
              }`}
              onClick={() => {
                setEscolaSelecionada(escola);
                setModoEdicaoGeral(false);
                setEdicoesPendentes({});
              }}
            >
              {escola.nome}
            </button>
          ))}
          <button
            className={`vinculacao-aba ${
              escolaSelecionada === "semVinculo" ? "active" : ""
            }`}
            onClick={() => {
              setEscolaSelecionada("semVinculo");
              setModoEdicaoGeral(false);
              setEdicoesPendentes({});
            }}
          >
            Professores sem vínculo
          </button>
        </div>
        {isLoading && <p>Carregando dados...</p>}
        {error && <p className="error-message">{error}</p>}
        {!isLoading && !error && escolaSelecionada && (
          <>
            <h3 className="vinculacao-subtitulo">
              {escolaSelecionada === "semVinculo"
                ? "Professores sem vínculo"
                : `Professores vinculados à ${escolaSelecionada.nome}`}
            </h3>

            <ul className="vinculacao-lista">
              {escolaSelecionada === "semVinculo" || modoEdicaoGeral ? (
                professoresFiltradosParaExibicao.length === 0 ? (
                  <p>
                    Nenhum professor encontrado{" "}
                    {escolaSelecionada === "semVinculo"
                      ? "sem vínculo."
                      : `vinculado a ${escolaSelecionada?.nome}`}
                    .
                  </p>
                ) : (
                  professoresFiltradosParaExibicao.map((prof) => (
                    <div key={prof.id} className="vinculacao-professor-card">
                      <h4>{`${prof.nome} (${
                        prof.email
                      }) - ${prof.perfil?.toUpperCase()}`}</h4>
                      <EscolaCheckboxes
                        prof={prof}
                        // PASSE A LISTA COMPLETA DE ESCOLAS AQUI
                        escolas={escolas} // <-- CORREÇÃO: Removida a filtragem desnecessária
                        edicoesPendentes={edicoesPendentes}
                        toggleEscola={toggleEscola}
                        salvarEscolas={salvarEscolas}
                      />
                    </div>
                  ))
                )
              ) : professoresFiltradosParaExibicao.length === 0 ? (
                <p>
                  Nenhum professor encontrado vinculado a{" "}
                  {escolaSelecionada?.nome}.
                </p>
              ) : (
                professoresFiltradosParaExibicao.map((prof) => (
                  <div key={prof.id} className="vinculacao-professor-card">
                    <h4>
                      {prof.nome} ({prof.email})
                    </h4>
                    {/* Aqui você pode exibir as escolas já vinculadas de forma não editável se quiser */}
                  </div>
                ))
              )}
            </ul>

            {escolaSelecionada !== "semVinculo" && !modoEdicaoGeral && (
              <button
                className="vinculacao-botao-base vinculacao-botao"
                onClick={() => setModoEdicaoGeral(true)}
              >
                Editar vínculos de professores desta escola
              </button>
            )}

            {modoEdicaoGeral && escolaSelecionada !== "semVinculo" && (
              <button
                className="vinculacao-botao-base vinculacao-botao-cancelar"
                onClick={() => {
                  setModoEdicaoGeral(false);
                  setEdicoesPendentes({});
                  carregarDados();
                }}
              >
                Cancelar edição
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
