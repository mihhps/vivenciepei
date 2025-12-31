import React from "react";
import { Link } from "react-router-dom";

// --- ÍCONES SVG MINIMALISTAS ---
const Icons = {
  Collaboration: () => (
    <svg
      className="w-6 h-6 text-blue-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  Time: () => (
    <svg
      className="w-6 h-6 text-blue-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Vision: () => (
    <svg
      className="w-6 h-6 text-blue-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  Document: () => (
    <svg
      className="w-6 h-6 text-blue-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  Instagram: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
};

const BENEFICIOS = [
  {
    t: "Colaboração e Coerência",
    d: "Promove a cooperação e unifica o processo da equipe.",
    i: Icons.Collaboration,
  },
  {
    t: "Otimização do Tempo",
    d: "Simplifica a elaboração e registro dos planos educacionais.",
    i: Icons.Time,
  },
  {
    t: "Visão 360º do Aluno",
    d: "Integra habilidades e interesses para compreensão profunda.",
    i: Icons.Vision,
  },
  {
    t: "Gestão de Documentos",
    d: "Geração automática de PDFs e relatórios estruturados.",
    i: Icons.Document,
  },
];

export default function LandingPage() {
  return (
    <div className="bg-[#030712] font-sans text-slate-300 antialiased selection:bg-blue-500/30">
      {/* 1. HERO */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[120px] pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <img
            src="/logo-vivencie.png"
            alt="Vivencie Logo"
            className="mx-auto h-32 sm:h-44 mb-12 opacity-90 drop-shadow-2xl"
          />
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-[1.1]">
            Vivencie o Crescimento. <br />
            <span className="text-slate-500 italic font-light">
              Vivencie o PEI.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-400 text-lg leading-relaxed mb-12">
            Uma plataforma inteligente para gestão de PEIs e apoio ao AEE, que
            qualifica a prática pedagógica e garante uma aprendizagem
            personalizada e equitativa.
          </p>
          <div className="flex justify-center">
            <Link
              to="/inicio"
              className="px-10 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-xl hover:bg-blue-500 transition-all active:scale-95"
            >
              Acessar a Plataforma
            </Link>
          </div>
        </div>
      </section>

      {/* 2. RECURSOS */}
      <section className="py-24 max-w-7xl mx-auto px-6 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          {BENEFICIOS.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#030712] p-10 hover:bg-white/[0.02] transition-colors"
            >
              <div className="mb-6">
                <item.i />
              </div>
              <h3 className="text-white font-bold text-lg mb-3 tracking-tight">
                {item.t}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. IA SECTION */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative bg-gradient-to-br from-slate-900 to-black rounded-[2.5rem] p-12 md:p-20 border border-white/10 overflow-hidden group shadow-2xl">
            <div className="relative z-10 max-w-3xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-8 bg-blue-500" />
                <span className="text-blue-500 text-xs font-bold uppercase tracking-widest">
                  Inteligência Artificial Gemini
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
                Eficiência técnica para <br />
                personalização da jornada.
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-10">
                A tecnologia Gemini atua como um assistente de alto nível,
                sugerindo estratégias adaptadas às habilidades mapeadas de cada
                aluno.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. EQUIPE - FOTOS INTERATIVAS */}
      <section className="py-24 max-w-7xl mx-auto px-6 border-t border-white/5">
        <div className="text-center mb-20">
          <h2 className="text-2xl font-bold text-white uppercase tracking-[0.2em] mb-4">
            Equipe Especialista
          </h2>
          <div className="h-1 w-12 bg-blue-600 mx-auto" />
        </div>

        <div className="grid md:grid-cols-3 gap-16">
          {[
            {
              n: "Michelle Pollheim",
              c: "Criadora e Orientadora Pedagógica",
              i: "/images/michelle-pollheim.png",
              d: "Pedagoga com pós-graduação em Gestão Escolar. Assegura o equilíbrio entre sensibilidade e eficácia prática.",
            },
            {
              n: "Shirlei Manske",
              c: "Especialista em AEE",
              i: "/images/shirlei-manske.png",
              d: "Traz a visão técnica do Atendimento Educacional Especializado, focando nas demandas da linha de frente.",
            },
            {
              n: "Késsia Janara Mafra",
              c: "Suporte e Educação Especial",
              i: "/images/kessia-mafra.png",
              d: "Psicopedagoga, com ampla vivência em Educação Especial, atuando de forma fundamental no suporte técnico às avaliações e no atendimento às especificidades pedagógicas dessa modalidade.",
            },
          ].map((m, i) => (
            <div
              key={i}
              className="group text-center flex flex-col items-center"
            >
              <div className="relative mb-8 overflow-hidden rounded-full">
                <img
                  src={m.i}
                  alt={m.n}
                  className="w-44 h-44 object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500 border-4 border-white/5 shadow-2xl"
                />
              </div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                {m.n}
              </h3>
              <p className="text-blue-500 text-xs font-bold uppercase tracking-wider mb-4">
                {m.c}
              </p>
              <p className="text-slate-500 text-xs leading-relaxed max-w-[260px] italic">
                "{m.d}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FOOTER COM LINKS DIRETOS */}
      <footer className="py-24 bg-black border-t border-white/5 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          <h2 className="text-3xl font-bold text-white mb-12">
            Vamos conversar?
          </h2>

          <div className="grid sm:grid-cols-3 gap-8 w-full py-12 border-y border-white/5 text-slate-500 text-xs tracking-widest uppercase">
            {/* EMAIL */}
            <a
              href="mailto:contato@vivenciepei.com.br"
              className="flex flex-col gap-2 group"
            >
              <span className="text-white/30 group-hover:text-blue-500 transition-colors italic">
                Email Institucional
              </span>
              <span className="text-slate-300 group-hover:text-white">
                contato@vivenciepei.com.br
              </span>
            </a>

            {/* WHATSAPP */}
            <a
              href="https://wa.me/5547989192375?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20a%20Vivencie%20PEI."
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-2 group"
            >
              <span className="text-white/30 group-hover:text-green-500 transition-colors italic">
                WhatsApp Suporte
              </span>
              <span className="text-slate-300 group-hover:text-white">
                (47) 98919-2375
              </span>
            </a>

            {/* INSTAGRAM */}
            <a
              href="https://www.instagram.com/vivenciepei/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-2 group items-center"
            >
              <span className="text-white/30 group-hover:text-pink-500 transition-colors italic uppercase">
                Instagram
              </span>
              <span className="text-slate-300 group-hover:text-white flex items-center gap-2">
                <Icons.Instagram /> @vivenciepei
              </span>
            </a>
          </div>

          <p className="text-white/20 text-[10px] tracking-[0.4em] mt-12 uppercase">
            © 2025 Vivencie PEI — Tecnologia para o ensino inclusivo
          </p>
        </div>
      </footer>
    </div>
  );
}
