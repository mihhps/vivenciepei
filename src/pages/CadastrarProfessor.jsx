import React, { useState, useMemo } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  query,
  where,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import BotaoVoltar from "../components/BotaoVoltar";
import { PERFIS } from "../config/constants";

import "../styles/CadastroJakarta.css";

export default function CadastrarProfessor() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState("");
  const [codigoConvite, setCodigoConvite] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const navigate = useNavigate();

  // Pega o ano do exercício ativo para vincular ao cadastro
  const anoAtivo = useMemo(
    () => Number(localStorage.getItem("anoExercicio")) || 2025,
    []
  );

  const handleCadastro = async (e) => {
    e.preventDefault();
    setErro("");

    if (!nome || !email || !senha || !cargo || !codigoConvite) {
      setErro("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);

    try {
      // 1. Validar Código de Convite
      const convitesRef = collection(db, "convites");
      const q = query(
        convitesRef,
        where("codigo", "==", codigoConvite.trim().toUpperCase()),
        where("expirado", "==", false)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErro("Código de Acesso inválido ou já utilizado.");
        setLoading(false);
        return;
      }

      const conviteDoc = querySnapshot.docs[0];

      // 2. Criar usuário no Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );
      const uid = userCredential.user.uid;

      // 3. Gravação Atômica (Batch)
      const batch = writeBatch(db);

      // Marcar convite como usado
      batch.update(doc(db, "convites", conviteDoc.id), {
        expirado: true,
        dataUso: new Date().toISOString(),
        utilizadoPor: uid,
      });

      // Criar documento do usuário
      const dadosProfessor = {
        uid: uid,
        nome: nome.trim(),
        email: email.trim(),
        cargo: cargo,
        perfil: PERFIS.PROFESSOR,
        anoCadastro: anoAtivo, // Vínculo com o exercício atual
        escolas: {},
        turmas: {},
        dataCadastro: new Date().toISOString(),
      };

      batch.set(doc(db, "usuarios", uid), dadosProfessor);
      await batch.commit();

      alert("Cadastro realizado com sucesso!");
      navigate("/login");
    } catch (error) {
      console.error("Erro no cadastro:", error);
      if (error.code === "auth/email-already-in-use") {
        setErro("Este e-mail já está em uso.");
      } else {
        setErro("Ocorreu um erro ao realizar o cadastro.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cadastro-container">
      <div className="cadastro-card">
        <div style={{ position: "absolute", top: "25px", left: "25px" }}>
          <BotaoVoltar />
        </div>

        <img src="/logo-vivencie.png" alt="Logo" className="cadastro-logo" />

        <h2 className="cadastro-titulo">Novo Professor</h2>
        <p className="cadastro-subtitulo">
          Crie sua conta para acessar o sistema
        </p>

        {erro && <div className="alerta-erro">{erro}</div>}

        <form onSubmit={handleCadastro} className="form-grid">
          <input
            type="text"
            placeholder="Código de Acesso"
            value={codigoConvite}
            onChange={(e) => setCodigoConvite(e.target.value)}
            className="cadastro-input"
            disabled={loading}
          />

          <input
            type="text"
            placeholder="Nome Completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="cadastro-input"
            disabled={loading}
          />

          <input
            type="email"
            placeholder="E-mail profissional"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="cadastro-input"
            disabled={loading}
          />

          <select
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            className="cadastro-select"
            disabled={loading}
          >
            <option value="">Selecione o Cargo/Disciplina</option>
            <option value="Professor Regente">Professor Regente</option>
            <option value="Professor de Suporte">Professor de Suporte</option>
            <option value="Aee">AEE</option>
            <option value="Língua Portuguesa">Língua Portuguesa</option>
            <option value="Matemática">Matemática</option>
            <option value="História">História</option>
            <option value="Arte">Arte</option>
            <option value="Geografia">Geografia</option>
            <option value="Educação Física">Educação Física</option>
            <option value="Ciências">Ciências</option>
            <option value="Inglês">Inglês</option>
            <option value="Ensino Religioso">Ensino Religioso</option>
            <option value="Contação de Histórias">Contação de Histórias</option>
            <option value="Comunicação e Linguagem">
              Comunicação e Linguagem
            </option>
          </select>

          <div className="senha-field-wrapper">
            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Senha (mínimo 6 dígitos)"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="cadastro-input"
              disabled={loading}
            />
            <button
              type="button"
              className="btn-toggle-senha"
              onClick={() => setMostrarSenha(!mostrarSenha)}
            >
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          <button type="submit" className="btn-cadastrar" disabled={loading}>
            {loading ? "Processando..." : "Finalizar Cadastro"}
          </button>
        </form>
      </div>
    </div>
  );
}
