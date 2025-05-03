import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";

export default function VerAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const navigate = useNavigate();

  const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
  const tipo = usuario?.perfil;

  useEffect(() => {
    const dadosSalvos = JSON.parse(localStorage.getItem("avaliacoesIniciais")) || [];
    setAvaliacoes(dadosSalvos);
  }, []);

  const estilos = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#f0f4f8",
      padding: "40px",
      fontFamily: "Arial, sans-serif",
    },
    card: {
      maxWidth: "1000px",
      margin: "0 auto",
      backgroundColor: "#fff",
      padding: "30px",
      borderRadius: "10px",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    },
    titulo: {
      fontSize: "24px",
      fontWeight: "bold",
      marginBottom: "20px",
      textAlign: "center",
    },
    tabela: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: "20px",
    },
    th: {
      backgroundColor: "#1976d2",
      color: "white",
      padding: "10px",
      textAlign: "left",
    },
    td: {
      border: "1px solid #ccc",
      padding: "10px",
    },
    botoes: {
      display: "flex",
      gap: "10px",
    },
    botao: {
      padding: "6px 12px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontWeight: "bold",
    },
    visualizar: {
      backgroundColor: "#0288d1",
      color: "white",
    },
    editar: {
      backgroundColor: "#388e3c",
      color: "white",
    },
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <BotaoVoltar />
        <h2 style={estilos.titulo}>Avaliações Iniciais</h2>

        {avaliacoes.length === 0 ? (
          <p>Nenhuma avaliação registrada.</p>
        ) : (
          <table style={estilos.tabela}>
            <thead>
              <tr>
                <th style={estilos.th}>Aluno</th>
                <th style={estilos.th}>Turma</th>
                <th style={estilos.th}>Data</th>
                <th style={estilos.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {avaliacoes.map((avaliacao, index) => (
                <tr key={index}>
                  <td style={estilos.td}>{avaliacao.aluno}</td>
                  <td style={estilos.td}>{avaliacao.turma || "-"}</td>
                  <td style={estilos.td}>
                    {avaliacao.data
                      ? new Date(avaliacao.data).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td style={{ ...estilos.td }}>
                    <div style={estilos.botoes}>
                      <button
                        style={{ ...estilos.botao, ...estilos.visualizar }}
                        onClick={() =>
                          navigate(`/avaliacao/${encodeURIComponent(avaliacao.aluno)}`)
                        }
                      >
                        Visualizar
                      </button>

                      {(tipo === "gestao" || tipo === "aee") && (
                        <button
                          style={{ ...estilos.botao, ...estilos.editar }}
                          onClick={() =>
                            navigate(`/editar-avaliacao/${encodeURIComponent(avaliacao.aluno)}`)
                          }
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}