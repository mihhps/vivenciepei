import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { PERFIS } from "../config/constants";
import { perfilRedirectMap } from "../config/routesConfig";
import { FaUserPlus, FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";

import "react-toastify/dist/ReactToastify.css";
import "../styles/CadastrarUsuario.css";

export default function CadastrarUsuario() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: "",
    cargo: "",
    email: "",
    senha: "",
    perfil: "",
    disciplina: "",
  });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [listaEscolas, setListaEscolas] = useState([]);
  const [escolasSelecionadas, setEscolasSelecionadas] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const snap = await getDocs(collection(db, "escolas"));
        setListaEscolas(
          snap.docs.map((d) => ({ id: d.id, nome: d.data().nome }))
        );
      } catch (err) {
        toast.error("Erro ao carregar escolas.");
      }
    };
    fetchEscolas();
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleToggleEscola = (id) => {
    setEscolasSelecionadas((prev) => {
      const novo = { ...prev };
      if (novo[id]) delete novo[id];
      else novo[id] = true;
      return novo;
    });
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    const { nome, email, senha, perfil, cargo, disciplina } = formData;

    if (!nome || !email || !senha || !perfil) {
      return toast.warn("Preencha os campos obrigatórios.");
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );
      const user = cred.user;

      const dadosFirestore = {
        uid: user.uid,
        nome: nome.trim(),
        email: email.trim(),
        cargo: cargo.trim(),
        perfil: perfil,
        disciplina:
          perfil === PERFIS.PROFESSOR || perfil === PERFIS.AEE
            ? disciplina
            : "",
        escolas: escolasSelecionadas,
        turmas: {},
      };

      await setDoc(doc(db, "usuarios", user.uid), dadosFirestore);
      toast.success("Usuário criado! Configurando permissões...");

      setTimeout(async () => {
        await user.getIdToken(true);
        const rota = perfilRedirectMap[perfil] || "/";
        navigate(rota);
      }, 3000);
    } catch (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const precisaEscola = [
    PERFIS.GESTAO,
    PERFIS.AEE,
    PERFIS.PROFESSOR,
    PERFIS.DIRETOR,
    PERFIS.DIRETOR_ADJUNTO,
    PERFIS.ORIENTADOR_PEDAGOGICO,
  ].includes(formData.perfil);

  return (
    <div className="cadastro-page-container">
      <ToastContainer position="bottom-right" />

      <div className="cadastro-card">
        <div className="cadastro-header">
          <button className="btn-back-minimal" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Voltar
          </button>
          <img
            src="/logo-vivencie.png"
            alt="Logo"
            className="cadastro-logo-small"
          />
          <h1>Novo Usuário</h1>
          <p>Crie uma conta e defina as permissões de acesso.</p>
        </div>

        <form onSubmit={handleCadastro} className="cadastro-grid-form">
          {/* INFORMAÇÕES PESSOAIS */}
          <div className="form-section">
            <h3 className="section-title">Dados Pessoais</h3>
            <input
              type="text"
              name="nome"
              placeholder="Nome Completo"
              onChange={handleChange}
              value={formData.nome}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="E-mail Institucional"
              onChange={handleChange}
              value={formData.email}
              required
            />
            <div className="password-wrapper">
              <input
                type={mostrarSenha ? "text" : "password"}
                name="senha"
                placeholder="Senha (mín. 6 caracteres)"
                onChange={handleChange}
                value={formData.senha}
                required
              />
              <button
                type="button"
                className="toggle-pass"
                onClick={() => setMostrarSenha(!mostrarSenha)}
              >
                {mostrarSenha ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* PERFIL PROFISSIONAL */}
          <div className="form-section">
            <h3 className="section-title">Perfil Profissional</h3>
            <select
              name="perfil"
              value={formData.perfil}
              onChange={handleChange}
              required
            >
              <option value="">Selecione o Perfil</option>
              {Object.keys(PERFIS).map((key) => (
                <option key={key} value={PERFIS[key]}>
                  {PERFIS[key]}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="cargo"
              placeholder="Cargo (Ex: Diretor, Pedagoga)"
              onChange={handleChange}
              value={formData.cargo}
            />

            {(formData.perfil === PERFIS.PROFESSOR ||
              formData.perfil === PERFIS.AEE) && (
              <select
                name="disciplina"
                value={formData.disciplina}
                onChange={handleChange}
              >
                <option value="">Selecione a Disciplina</option>
                <option value="PROFESSOR REGENTE">PROFESSOR REGENTE</option>
                <option value="AEE">AEE</option>
                <option value="EDUCAÇÃO FÍSICA">EDUCAÇÃO FÍSICA</option>
                <option value="PORTUGUÊS">PORTUGUÊS</option>
                <option value="MATEMÁTICA">MATEMÁTICA</option>
              </select>
            )}
          </div>

          {/* VÍNCULO ESCOLAR */}
          {precisaEscola && (
            <div className="form-section full-width">
              <h3 className="section-title">Vínculo com Unidades Escolares</h3>
              <div className="escolas-chips-container">
                {listaEscolas.map((esc) => (
                  <div
                    key={esc.id}
                    className={`escola-chip ${
                      escolasSelecionadas[esc.id] ? "active" : ""
                    }`}
                    onClick={() => handleToggleEscola(esc.id)}
                  >
                    {esc.nome}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-finalizar-cadastro"
            disabled={loading}
          >
            {loading ? (
              "Processando..."
            ) : (
              <>
                <FaUserPlus /> Cadastrar Usuário
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
