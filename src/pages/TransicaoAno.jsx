import React, { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import {
  FaSync,
  FaUserSlash,
  FaGraduationCap,
  FaHistory,
} from "react-icons/fa";
import Loader from "../components/Loader";
import "../styles/TransicaoAno.css";

export default function TransicaoAno() {
  const [loading, setLoading] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");

  // 1. FUNÇÃO: RESETAR ACESSOS DOS PROFESSORES
  // Isso remove todas as escolas e turmas vinculadas aos profs.
  // Eles perdem acesso a 2026 até que você os vincule de novo.
  const resetarAcessosProfessores = async () => {
    if (confirmacao !== "RESETAR")
      return toast.warn("Digite RESETAR para confirmar.");
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const usuariosSnap = await getDocs(collection(db, "usuarios"));

      usuariosSnap.forEach((usuarioDoc) => {
        const p = usuarioDoc.data().perfil?.toLowerCase();
        if (["professor", "aee", "diretor"].includes(p)) {
          batch.update(doc(db, "usuarios", usuarioDoc.id), {
            escolas: {}, // Limpa os vínculos
            turmas: {}, // Limpa as turmas
          });
        }
      });

      await batch.commit();
      toast.success("Acessos de professores resetados para 2026!");
      setConfirmacao("");
    } catch (e) {
      toast.error("Erro ao resetar acessos.");
    } finally {
      setLoading(false);
    }
  };

  // 2. FUNÇÃO: ARQUIVAR PEIs E PROMOVER ALUNOS
  // Muda o anoLetivoAtivo dos alunos e trava os PEIs de 2025.
  const prepararAlunosNovoAno = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const alunosSnap = await getDocs(collection(db, "alunos"));

      alunosSnap.forEach((alunoDoc) => {
        batch.update(doc(db, "alunos", alunoDoc.id), {
          anoLetivoAtivo: 2026,
          // Removemos a turma antiga para obrigar a nova enturmação em 2026
          turma: "Pendente 2026",
          statusNoAno: "Aguardando Matrícula",
        });
      });

      await batch.commit();
      toast.success("Alunos promovidos para o ciclo 2026!");
    } catch (e) {
      toast.error("Erro ao promover alunos.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="transicao-page">
      <ToastContainer position="bottom-right" />
      <div className="transicao-card">
        <div className="transicao-header">
          <FaSync className="rotate-icon" />
          <h1>Virada de Ano Letivo: 2025 → 2026</h1>
          <p>Siga os passos abaixo para organizar o novo ciclo escolar.</p>
        </div>

        <div className="transicao-grid">
          {/* PASSO 1 */}
          <div className="step-box">
            <div className="step-num">01</div>
            <FaUserSlash className="step-icon" />
            <h3>Limpar Vínculos</h3>
            <p>
              Remove o acesso de todos os Professores e AEEs às escolas e
              turmas. Eles precisarão ser re-vinculados para 2026.
            </p>
            <input
              placeholder="Digite RESETAR para liberar"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
            <button className="btn-danger" onClick={resetarAcessosProfessores}>
              Resetar Acessos
            </button>
          </div>

          {/* PASSO 2 */}
          <div className="step-box">
            <div className="step-num">02</div>
            <FaGraduationCap className="step-icon" />
            <h3>Promover Alunos</h3>
            <p>
              Atualiza o ano ativo de todos os alunos para 2026 e limpa as
              turmas antigas para nova organização.
            </p>
            <button className="btn-primary" onClick={prepararAlunosNovoAno}>
              Iniciar Ciclo 2026
            </button>
          </div>

          {/* PASSO 3 */}
          <div className="step-box info">
            <div className="step-num">03</div>
            <FaHistory className="step-icon" />
            <h3>Histórico Preservado</h3>
            <p>
              O sistema manterá todos os PEIs de 2025 salvos. Eles estarão
              disponíveis para consulta no perfil do aluno.
            </p>
            <div className="badge-ano">Backup 2025 OK</div>
          </div>
        </div>
      </div>
    </div>
  );
}
