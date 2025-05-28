import React, { useEffect, useState } from "react";
import { getDoc, doc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

function SelecionarEscola() {
  const [escolas, setEscolas] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const carregarEscolas = async () => {
      const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
      if (!usuario?.uid) return;

      const professorRef = doc(db, "professores", usuario.uid);
      const professorSnap = await getDoc(professorRef);

      if (professorSnap.exists()) {
        const { escolas: idsEscolas } = professorSnap.data();

        // Busca os dados completos das escolas
        const todasEscolasSnap = await getDocs(collection(db, "escolas"));
        const todasEscolas = todasEscolasSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filtra apenas as escolas vinculadas ao professor
        const escolasVinculadas = todasEscolas.filter(escola =>
          idsEscolas.includes(escola.id)
        );

        setEscolas(escolasVinculadas);
      }
    };

    carregarEscolas();
  }, []);

  const handleSelecionarEscola = (idEscola) => {
  const escolaSelecionada = escolas.find((escola) => escola.id === idEscola);
  if (escolaSelecionada) {
    localStorage.setItem("escolaAtiva", JSON.stringify(escolaSelecionada));
    navigate("/painel-professor");
  }
};

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <h2 style={estilos.titulo}>Selecione a escola</h2>
        <ul style={estilos.lista}>
          {escolas.map((escola) => (
            <li key={escola.id} style={estilos.item}>
              <button style={estilos.botao} onClick={() => handleSelecionarEscola(escola.id)}>
                {escola.nome}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default SelecionarEscola;

const estilos = {
  container: {
    height: "100vh",
    background: "linear-gradient(to bottom, #00264d, #005b96)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "15px",
    boxShadow: "0 0 30px rgba(0,0,0,0.3)",
    width: "100%",
    maxWidth: "500px",
    textAlign: "center",
  },
  titulo: {
    fontSize: "24px",
    marginBottom: "30px",
    color: "#1d3557",
  },
  lista: {
    listStyle: "none",
    padding: 0,
  },
  item: {
    marginBottom: "15px",
  },
  botao: {
    backgroundColor: "#1d3557",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    width: "100%",
  },
};