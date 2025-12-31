import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Importamos suas constantes de perfil
const PERFIS = {
  GESTAO: "gestão",
  DIRETOR: "diretor",
  DIRETOR_ADJUNTO: "diretor_adjunto",
  ORIENTADOR_PEDAGOGICO: "orientador_pedagogico",
  SEME: "seme",
  AEE: "aee",
  PROFESSOR: "professor",
  DESENVOLVEDOR: "desenvolvedor",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Limpeza de segurança ao montar a tela
  useEffect(() => {
    localStorage.clear();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !senha) {
      toast.warn("Preencha todos os campos.");
      return;
    }

    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);
      const user = cred.user;

      // Busca na coleção 'usuarios' (alinhado com o que corrigimos antes)
      const usuarioRef = doc(db, "usuarios", user.uid);
      const usuarioSnap = await getDoc(usuarioRef);

      if (!usuarioSnap.exists()) {
        toast.error("Usuário não registrado no banco de dados.");
        setLoading(false);
        return;
      }

      const usuarioData = usuarioSnap.data();
      const usuarioCompleto = {
        ...usuarioData,
        uid: user.uid,
        id: usuarioSnap.id,
        escolas: usuarioData.escolas || {},
      };

      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioCompleto));

      // --- LÓGICA DE REDIRECIONAMENTO PREMIUM ---
      const perfil = usuarioCompleto.perfil;

      switch (perfil) {
        case PERFIS.GESTAO:
        case PERFIS.DIRETOR:
        case PERFIS.DIRETOR_ADJUNTO:
        case PERFIS.ORIENTADOR_PEDAGOGICO:
          navigate("/painel-gestao");
          break;
        case PERFIS.SEME:
          navigate("/painel-seme");
          break;
        case PERFIS.AEE:
          navigate("/painel-aee");
          break;
        case PERFIS.PROFESSOR: {
          const escolaIds = Object.keys(usuarioCompleto.escolas);

          if (escolaIds.length === 0) {
            toast.error("Vínculo escolar não encontrado.");
          } else if (escolaIds.length === 1) {
            // Se tem só uma escola, já aloca e entra
            const escolaSnap = await getDoc(doc(db, "escolas", escolaIds[0]));
            if (escolaSnap.exists()) {
              localStorage.setItem(
                "escolaAtiva",
                JSON.stringify({ id: escolaSnap.id, ...escolaSnap.data() })
              );
              localStorage.setItem("escolaId", escolaSnap.id);
            }
            navigate("/painel-professor");
          } else {
            // Se tem várias, vai para a tela genial de seleção que fizemos
            navigate("/selecionar-escola");
          }
          break;
        }
        case PERFIS.DESENVOLVEDOR:
          navigate("/painel-dev");
          break;
        default:
          toast.error("Perfil de acesso não identificado.");
      }
    } catch (error) {
      toast.error("E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <ToastContainer theme="dark" />

      {/* Background Decorativo */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md z-10"
      >
        {/* Logo & Título */}
        <div className="text-center mb-10">
          <motion.img
            whileHover={{ rotate: 5, scale: 1.05 }}
            src="/logo-vivencie.png"
            className="h-28 mx-auto mb-6 drop-shadow-[0_0_35px_rgba(59,130,246,0.4)]"
            alt="Logo"
          />
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
            Vivencie <span className="text-blue-500">PEI</span>
          </h1>
          <p className="text-slate-500 mt-3 text-sm font-medium tracking-wide">
            Gestão Pedagógica Especializada
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white/[0.02] border border-white/10 backdrop-blur-3xl rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
          {/* Brilho interno do card */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">
                Identificação
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail profissional"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                  Senha de Acesso
                </label>
              </div>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "#3b82f6" }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all uppercase tracking-widest text-xs"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Autenticando...
                </div>
              ) : (
                "Entrar na Plataforma"
              )}
            </motion.button>
          </form>

          {/* Links de Apoio */}
          <div className="mt-10 flex flex-col items-center gap-4 border-t border-white/5 pt-8">
            <button
              onClick={() => navigate("/recuperar-senha")}
              className="text-[10px] font-bold text-slate-500 hover:text-blue-400 uppercase tracking-widest transition-colors"
            >
              Esqueceu sua senha?
            </button>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">
              Novo por aqui?
              <Link
                to="/cadastro-professor"
                className="ml-2 text-blue-500 font-black hover:text-blue-400 transition-colors"
              >
                Criar Conta
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-10 text-[10px] font-bold text-slate-700 uppercase tracking-[0.5em]">
          Vivencie © 2025
        </p>
      </motion.div>
    </div>
  );
}
