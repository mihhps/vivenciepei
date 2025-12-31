import React, { useState, useEffect, useMemo } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  setDoc,
  doc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUserPlus,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaLock,
  FaBriefcase,
  FaGraduationCap,
  FaSchool,
} from "react-icons/fa";

import { PERFIS } from "../config/constants";
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

  // ✅ Recupera o ano ativo para carimbar o novo usuário
  const anoAtivo = useMemo(
    () => Number(localStorage.getItem("anoExercicio")) || 2025,
    []
  );

  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const snap = await getDocs(collection(db, "escolas"));
        setListaEscolas(
          snap.docs.map((d) => ({ id: d.id, nome: d.data().nome }))
        );
      } catch (err) {
        toast.error("Erro ao carregar lista de unidades.");
      }
    };
    fetchEscolas();
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleToggleEscola = (id) => {
    setEscolasSelecionadas((prev) => {
      const novo = { ...prev };
      novo[id] ? delete novo[id] : (novo[id] = true);
      return novo;
    });
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    const { nome, email, senha, perfil, cargo, disciplina } = formData;

    if (!nome || !email || !senha || !perfil) {
      return toast.warn("Preencha todos os campos obrigatórios.");
    }

    setLoading(true);
    try {
      // 1. Criação no Firebase Auth
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );
      const user = cred.user;

      // 2. Objeto de dados (Carimbando o anoAtivo)
      const dadosFirestore = {
        uid: user.uid,
        nome: nome.trim(),
        email: email.trim(),
        cargo: cargo.trim() || perfil,
        perfil: perfil,
        disciplina: ["professor", "aee"].includes(perfil.toLowerCase())
          ? disciplina
          : "",
        escolas: escolasSelecionadas,
        anoAtivo: anoAtivo, // ✅ Define o ano em que o usuário inicia
        criadoEm: serverTimestamp(),
        [`turmas_${anoAtivo}`]: {}, // Inicializa o objeto de turmas do ano atual
      };

      await setDoc(doc(db, "usuarios", user.uid), dadosFirestore);

      toast.success(
        `Usuário ${nome} provisionado para o exercício ${anoAtivo}!`
      );

      setTimeout(() => navigate(-1), 2000);
    } catch (error) {
      toast.error("Erro no cadastro: " + error.message);
    } finally {
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
    <div className="cad-user-wrapper">
      <ToastContainer theme="dark" position="bottom-right" />

      {/* BACKGROUND DECORATIVO */}
      <div className="cad-bg-glow" />

      <header className="cad-header">
        <button className="cad-btn-back" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <div className="cad-branding">
          <img src="/logo-vivencie.png" alt="Logo" className="cad-logo-img" />
          <div>
            <h1 className="brand-main">
              VIVENCIE <span className="brand-accent">PEI</span>
            </h1>
            <p className="cad-subtitle">
              Provisionamento de Novo Usuário — {anoAtivo}
            </p>
          </div>
        </div>
      </header>

      <main className="cad-main-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cad-card-glass"
        >
          <form onSubmit={handleCadastro} className="cad-form-grid">
            {/* SEÇÃO 01: CREDENCIAIS */}
            <div className="cad-section">
              <h3 className="section-label">
                <FaUser /> Dados de Acesso
              </h3>
              <div className="input-group-elite">
                <FaUser className="input-icon" />
                <input
                  type="text"
                  name="nome"
                  placeholder="Nome Completo"
                  onChange={handleChange}
                  value={formData.nome}
                  required
                />
              </div>
              <div className="input-group-elite">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="E-mail Institucional"
                  onChange={handleChange}
                  value={formData.email}
                  required
                />
              </div>
              <div className="input-group-elite">
                <FaLock className="input-icon" />
                <input
                  type={mostrarSenha ? "text" : "password"}
                  name="senha"
                  placeholder="Senha de Acesso"
                  onChange={handleChange}
                  value={formData.senha}
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-pass"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* SEÇÃO 02: ATUAÇÃO */}
            <div className="cad-section">
              <h3 className="section-label">
                <FaBriefcase /> Perfil e Função
              </h3>
              <div className="input-group-elite">
                <FaGraduationCap className="input-icon" />
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
              </div>

              <div className="input-group-elite">
                <FaIdCard className="input-icon" />
                <input
                  type="text"
                  name="cargo"
                  placeholder="Cargo/Função (Ex: Pedagoga)"
                  onChange={handleChange}
                  value={formData.cargo}
                />
              </div>

              {["professor", "aee"].includes(
                formData.perfil?.toLowerCase()
              ) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="input-group-elite"
                >
                  <FaBook className="input-icon" />
                  <select
                    name="disciplina"
                    value={formData.disciplina}
                    onChange={handleChange}
                  >
                    <option value="">Disciplina Base</option>
                    <option value="PROFESSOR REGENTE">PROFESSOR REGENTE</option>
                    <option value="AEE">AEE</option>
                    <option value="EDUCAÇÃO FÍSICA">EDUCAÇÃO FÍSICA</option>
                    <option value="PORTUGUÊS">PORTUGUÊS</option>
                    <option value="MATEMÁTICA">MATEMÁTICA</option>
                  </select>
                </motion.div>
              )}
            </div>

            {/* SEÇÃO 03: VÍNCULOS (ESCOLAS) */}
            {precisaEscola && (
              <div className="cad-section full-width">
                <h3 className="section-label">
                  <FaSchool /> Lotação em Unidades Escolares
                </h3>
                <div className="escola-chip-grid">
                  {listaEscolas.map((esc) => (
                    <button
                      key={esc.id}
                      type="button"
                      className={`cad-chip ${
                        escolasSelecionadas[esc.id] ? "active" : ""
                      }`}
                      onClick={() => handleToggleEscola(esc.id)}
                    >
                      {esc.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className="btn-cad-submit" disabled={loading}>
              {loading ? (
                "Processando..."
              ) : (
                <>
                  <FaUserPlus /> Finalizar Cadastro
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}

// Ícones extras não importados no topo
const FaIdCard = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V6c0-1.11-.89-2-2-2zm0 14H4V6h16v12zM8.5 15c-.28 0-.5-.22-.5-.5V14h-1v.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5V11c0-.55.45-1 1-1h1c.55 0 1 .45 1 1v3.5c0 .28-.22.5-.5.5zM14 15h-2c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1zm-1-4h-1v2h1v-2zm5 4h-2c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1zm-1-4h-1v2h1v-2z" />
  </svg>
);
const FaBook = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
  </svg>
);
