import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast, ToastContainer } from "react-toastify";
import { FaCamera, FaUserGraduate, FaArrowLeft } from "react-icons/fa";
import Loader from "../components/Loader";

import "react-toastify/dist/ReactToastify.css";
import "../styles/CadastroAluno.css";

export default function CadastroAluno() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nome: "",
    nascimento: "",
    diagnostico: "",
    escolaId: "",
    turmaId: "",
    turno: "",
    idade: "",
  });
  const [foto, setFoto] = useState({ file: null, preview: "" });
  const [listas, setListas] = useState({ escolas: [], turmas: [] });
  const [loading, setLoading] = useState({
    escolas: true,
    turmas: false,
    salvando: false,
  });

  // Carregar Escolas
  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const snap = await getDocs(collection(db, "escolas"));
        setListas((prev) => ({
          ...prev,
          escolas: snap.docs.map((d) => ({ id: d.id, nome: d.data().nome })),
        }));
      } catch (e) {
        toast.error("Erro ao carregar escolas.");
      } finally {
        setLoading((prev) => ({ ...prev, escolas: false }));
      }
    };
    fetchEscolas();
  }, []);

  // Carregar Turmas ao selecionar Escola
  useEffect(() => {
    if (!formData.escolaId) return;
    const fetchTurmas = async () => {
      setLoading((prev) => ({ ...prev, turmas: true }));
      try {
        const snap = await getDocs(
          collection(db, "escolas", formData.escolaId, "turmas")
        );
        setListas((prev) => ({
          ...prev,
          turmas: snap.docs.map((d) => ({
            id: d.id,
            nome: d.data().nome,
            turno: d.data().turno,
          })),
        }));
      } catch (e) {
        toast.error("Erro ao carregar turmas.");
      } finally {
        setLoading((prev) => ({ ...prev, turmas: false }));
      }
    };
    fetchTurmas();
  }, [formData.escolaId]);

  const calcularIdade = (nasc) => {
    if (!nasc) return "";
    const hoje = new Date();
    const dataNasc = new Date(nasc);
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    if (
      hoje.getMonth() < dataNasc.getMonth() ||
      (hoje.getMonth() === dataNasc.getMonth() &&
        hoje.getDate() < dataNasc.getDate())
    )
      idade--;
    return `${idade} anos`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let update = { [name]: value };
    if (name === "nascimento") update.idade = calcularIdade(value);
    if (name === "turmaId") {
      const turma = listas.turmas.find((t) => t.id === value);
      update.turno = turma ? turma.turno : "";
    }
    setFormData((prev) => ({ ...prev, ...update }));
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024)
        return toast.error("A foto deve ter no máximo 2MB.");
      setFoto({ file, preview: URL.createObjectURL(file) });
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("usuarioLogado") || "{}");
    if (!user.uid) return toast.error("Sessão expirada.");

    setLoading((prev) => ({ ...prev, salvando: true }));
    try {
      let fotoUrl = "";
      if (foto.file) {
        const sRef = ref(
          storage,
          `fotos_alunos/${Date.now()}_${foto.file.name}`
        );
        const upload = await uploadBytes(sRef, foto.file);
        fotoUrl = await getDownloadURL(upload.ref);
      }

      const turmaObj = listas.turmas.find((t) => t.id === formData.turmaId);
      const alunoData = {
        nome: formData.nome.trim(),
        nascimento: formData.nascimento,
        diagnostico: formData.diagnostico.trim(),
        turma: turmaObj.nome,
        turno: formData.turno,
        escolaId: formData.escolaId,
        fotoUrl,
        dataCadastro: serverTimestamp(),
        anoLetivoAtivo: new Date().getFullYear(),
      };

      const docRef = await addDoc(collection(db, "alunos"), alunoData);

      // Criar PEI Placeholder
      await addDoc(collection(db, "peis"), {
        alunoId: docRef.id,
        escolaId: formData.escolaId,
        anoLetivo: new Date().getFullYear(),
        status: "Pendente de Criação",
        criadoEm: serverTimestamp(),
        criadorId: user.uid,
        resumoPEI: [],
      });

      toast.success("Aluno cadastrado com sucesso!");
      setFormData({
        nome: "",
        nascimento: "",
        diagnostico: "",
        escolaId: "",
        turmaId: "",
        turno: "",
        idade: "",
      });
      setFoto({ file: null, preview: "" });
    } catch (e) {
      toast.error("Erro ao cadastrar aluno.");
    } finally {
      setLoading((prev) => ({ ...prev, salvando: false }));
    }
  };

  return (
    <div className="cadastro-aluno-page">
      <ToastContainer position="bottom-right" />
      <div className="cadastro-aluno-card">
        <div className="cadastro-header">
          <button className="btn-voltar-minimal" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Voltar
          </button>
          <h1>Novo Estudante</h1>
          <p>Preencha os dados básicos para iniciar o acompanhamento.</p>
        </div>

        <form onSubmit={handleSalvar} className="cadastro-aluno-grid">
          {/* SEÇÃO DA FOTO */}
          <div className="foto-upload-section">
            <div
              className="avatar-preview-container"
              onClick={() => fileInputRef.current.click()}
            >
              {foto.preview ? (
                <img src={foto.preview} alt="Preview" className="avatar-img" />
              ) : (
                <div className="avatar-empty">
                  <FaCamera />
                </div>
              )}
              <div className="camera-badge">
                <FaCamera />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFotoChange}
              accept="image/*"
              hidden
            />
            <span>Foto de Perfil (Opcional)</span>
          </div>

          {/* DADOS PESSOAIS */}
          <div className="form-column">
            <div className="input-group">
              <label>Nome Completo</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                required
                placeholder="Nome do aluno"
              />
            </div>
            <div className="input-group-row">
              <div className="input-group">
                <label>Data de Nascimento</label>
                <input
                  type="date"
                  name="nascimento"
                  value={formData.nascimento}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Idade</label>
                <input
                  type="text"
                  value={formData.idade}
                  readOnly
                  className="readonly-input"
                />
              </div>
            </div>
            <div className="input-group">
              <label>Diagnóstico / CID</label>
              <input
                type="text"
                name="diagnostico"
                value={formData.diagnostico}
                onChange={handleInputChange}
                placeholder="Ex: TEA, TDAH, etc."
              />
            </div>
          </div>

          {/* DADOS ESCOLARES */}
          <div className="form-column">
            <div className="input-group">
              <label>Unidade Escolar</label>
              <select
                name="escolaId"
                value={formData.escolaId}
                onChange={handleInputChange}
                required
              >
                <option value="">Selecione a Escola</option>
                {listas.escolas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Turma</label>
              <select
                name="turmaId"
                value={formData.turmaId}
                onChange={handleInputChange}
                required
                disabled={!formData.escolaId}
              >
                <option value="">
                  {loading.turmas ? "Carregando..." : "Selecione a Turma"}
                </option>
                {listas.turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Turno</label>
              <input
                type="text"
                value={formData.turno}
                readOnly
                className="readonly-input"
                placeholder="Automático"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-finalizar-aluno"
            disabled={loading.salvando}
          >
            {loading.salvando ? (
              "Processando..."
            ) : (
              <>
                <FaUserGraduate /> Finalizar Cadastro
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
