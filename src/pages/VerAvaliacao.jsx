import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
// Importações do Firestore (mantidas)
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
// Presume-se que 'db' esteja sendo importado de um arquivo 'firebase.js'
// Como não temos o arquivo, faremos a importação do `db` vir do contexto
// Se este componente usa o hook useAuth, db será obtido de lá.
// Por enquanto, mantenho a importação local de `db` (se for o caso)
// import { db } from "../firebase"; // COMENTADO: O CONTEXTO DEVE FORNECER db

import { avaliacaoInicial } from "../data/avaliacaoInicialData";
import { useAuth } from "../context/AuthContext"; // Importação do useAuth

// ÍCONES SVG INLINE (sem alterações, mantidos como no original)
const ArrowLeftIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);
const HistoryIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-3.374 1.25" />
    <path d="M12 7v5l2.5 2.5" />
  </svg>
);
const ClockIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const CalendarIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const CheckCircleIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.05-8.62" />
    <path d="M16 6l-6 6-4-4" />
  </svg>
);
const CaretDownIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const SwapRightIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M17 8L21 12L17 16" />
    <path d="M3 12H21" />
  </svg>
);
const ArrowUpIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);
const ArrowDownIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);
const EqualIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="5" y1="9" x2="19" y2="9" />
    <line x1="5" y1="15" x2="19" y2="15" />
  </svg>
);

// Componente BotaoVoltar (sem alterações)
const BotaoVoltar = ({ destino = "/" }) => {
  const navigate = useNavigate();
  const bgColor = "#457b9d";
  const hoverBgColor = "#1d3557";
  return (
    <button
      onClick={() => navigate(destino)}
      className={`flex items-center space-x-2 px-4 py-2 text-white font-semibold rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50`}
      style={{
        backgroundColor: bgColor,
        "--hover-bg": hoverBgColor,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = hoverBgColor)
      }
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = bgColor)}
      onTouchStart={(e) =>
        (e.currentTarget.style.backgroundColor = hoverBgColor)
      }
      onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = bgColor)}
    >
      <ArrowLeftIcon className="w-5 h-5" />
      <span>Voltar</span>
    </button>
  );
};

// Configurações e Funções Helper (sem alterações)
const NIVEL_CONFIG = {
  NR: {
    cor: "#f8d0d9",
    descricao: "Necessita de recursos e apoio total",
    corTexto: "#9b1c3c",
  },
  AF: {
    cor: "#ffecc6",
    descricao: "Apoio frequente",
    corTexto: "#a35f00",
  },
  AG: {
    cor: "#fff5cc",
    descricao: "Apoio gestual",
    corTexto: "#7a6300",
  },
  AV: {
    cor: "#d7f4ef",
    descricao: "Apoio eventual",
    corTexto: "#1a7c72",
  },
  AVi: {
    cor: "#e0f2ff",
    descricao: "Apoio visual ou lembrete",
    corTexto: "#0062a3",
  },
  I: {
    cor: "#e6ffed",
    descricao: "Independente",
    corTexto: "#2f855a",
  },
  NA: {
    cor: "#e9ecef",
    descricao: "Não aplicável",
    corTexto: "#495057",
  },
};
const MAPA_NIVEIS_NUMERICO = {
  NR: 1,
  AF: 2,
  AG: 3,
  AV: 4,
  AVi: 5,
  I: 6,
  NA: 0,
};
const MUDANCA_CONFIG = {
  MELHORA: {
    color: "#2f855a",
    bgColor: "#e6ffed",
    icon: ArrowUpIcon,
    label: "Melhora",
  },
  PIORA: {
    color: "#9b1c3c",
    bgColor: "#f8d0d9",
    icon: ArrowDownIcon,
    label: "Piora",
  },
  ESTABILIDADE: {
    color: "#457b9d",
    bgColor: "#e0f2ff",
    icon: EqualIcon,
    label: "Estável",
  },
};
const limparString = (str) => {
  if (typeof str !== "string") return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};
const encontrarDescricaoCompleta = (areaPrincipal, habilidade, nivel) => {
  const areaData = avaliacaoInicial[areaPrincipal];
  if (!areaData) return "Área não encontrada.";
  const habilidadeLimpa = limparString(habilidade);
  const habilidadeObj = areaData.find(
    (item) => limparString(item.habilidade) === habilidadeLimpa
  );
  if (habilidadeObj && habilidadeObj.niveis) {
    return habilidadeObj.niveis[nivel] || "Descrição não encontrada.";
  }
  return "Habilidade não encontrada.";
};
const getDateFromAvaliacao = (data) => {
  if (!data) return new Date(0);
  if (data.dataCriacao && typeof data.dataCriacao.toDate === "function") {
    return data.dataCriacao.toDate();
  }
  if (data.inicio && typeof data.inicio.toDate === "function") {
    return data.inicio.toDate();
  }
  if (typeof data.inicio === "string") {
    const dateObj = new Date(data.inicio);
    if (!isNaN(dateObj)) return dateObj;
  }
  return new Date(0);
};
const buscarHistoricoCompletoDoAluno = async (alunoId, db) => {
  if (!db) return [];
  let todasAvaliacoes = [];
  const colecoesAvaliacao = ["avaliacoesIniciais", "avaliacoes"];
  const idString = String(alunoId).trim();

  for (const colecaoNome of colecoesAvaliacao) {
    const q = query(
      collection(db, colecaoNome),
      where("alunoId", "==", idString)
    );
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      colecao: colecaoNome,
      ...doc.data(),
    }));
    docs.forEach((newDoc) => {
      if (
        !todasAvaliacoes.some((existingDoc) => existingDoc.id === newDoc.id)
      ) {
        if (newDoc.aluno?.nome) {
          newDoc.alunoNome = newDoc.aluno.nome;
        }
        todasAvaliacoes.push(newDoc);
      }
    });
  }

  const avaliacoesValidas = todasAvaliacoes.filter(
    (avaliacao) =>
      avaliacao.respostas && Object.keys(avaliacao.respostas).length > 0
  );

  avaliacoesValidas.sort(
    (a, b) => getDateFromAvaliacao(a) - getDateFromAvaliacao(b)
  );
  return avaliacoesValidas;
};
const formatarData = (dataInput) => {
  if (!dataInput) return "-";
  try {
    const dateObj =
      typeof dataInput.toDate === "function"
        ? dataInput.toDate()
        : new Date(dataInput);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    }
    return "Data inválida";
  } catch (e) {
    return "Data inválida";
  }
};

// Componente DetalhesContent (sem alterações)
const DetalhesContent = ({ avaliacao, primaryColor, accentColor }) => {
  const dataFormatada = formatarData(avaliacao.inicio || avaliacao.dataCriacao);
  const tipoAvaliacao =
    avaliacao.colecao === "avaliacoesIniciais" ? "Inicial" : "Reavaliação";
  const areasOrdenadas = Object.keys(avaliacao.respostas || {}).sort();
  const NivelPonto = ({ nivel }) => {
    const config = NIVEL_CONFIG[nivel] || NIVEL_CONFIG["NA"];
    return (
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0"
        style={{ backgroundColor: config.cor, color: config.corTexto }}
        title={config.descricao}
      >
        {nivel}
      </div>
    );
  };
  return (
    <div className="p-2 sm:p-4 mt-4 space-y-6">
      <div
        className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-md flex justify-between items-center"
        style={{ borderLeftColor: primaryColor, borderLeftWidth: "8px" }}
      >
        <div>
          <p className="text-xl font-bold text-gray-800">
            {tipoAvaliacao} - {dataFormatada}
          </p>
        </div>
      </div>
      {areasOrdenadas.map((areaPrincipal) => {
        const respostasArea = avaliacao.respostas[areaPrincipal] || {};
        const habilidades = Object.keys(respostasArea).sort();
        const habilidadesValidas = habilidades.filter(
          (h) => respostasArea[h] !== "NA"
        );
        if (habilidadesValidas.length === 0) return null;
        return (
          <div
            key={areaPrincipal}
            className="area-detalhes bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          >
            <div
              className="p-4 text-white font-bold text-xl"
              style={{ backgroundColor: primaryColor }}
            >
              {areaPrincipal}
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              {habilidadesValidas.map((habilidade) => {
                const nivel = respostasArea[habilidade];
                const nivelConfig = NIVEL_CONFIG[nivel] || NIVEL_CONFIG["NA"];
                const descricaoCompleta = encontrarDescricaoCompleta(
                  areaPrincipal,
                  habilidade,
                  nivel
                );
                return (
                  <div
                    key={habilidade}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-md transition duration-150"
                  >
                    <div className="flex-1 pr-4 mb-2 sm:mb-0">
                      <span className="text-gray-900 font-semibold block">
                        {habilidade}
                      </span>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {descricaoCompleta}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <span
                        className="text-sm font-semibold p-2 rounded-lg"
                        style={{
                          backgroundColor: nivelConfig.cor,
                          color: nivelConfig.corTexto,
                        }}
                      >
                        {nivelConfig.descricao}
                      </span>
                      <NivelPonto nivel={nivel} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="p-6 mt-8 bg-gray-100 rounded-xl border border-gray-200 shadow-inner">
        <h4
          className="text-xl font-bold mb-4 border-b pb-2"
          style={{ color: primaryColor }}
        >
          Legenda de Níveis (Apoio)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(NIVEL_CONFIG)
            .filter(([key]) => key !== "NA")
            .map(([key, config]) => (
              <div
                key={key}
                className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm border border-gray-50"
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md`}
                  style={{
                    backgroundColor: config.cor,
                    color: config.corTexto,
                  }}
                  title={config.descricao}
                >
                  {key}
                </div>
                <div className="text-gray-700 text-sm">
                  <span className="font-semibold block">{key}</span>
                  <span className="text-xs">{config.descricao}</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// ========= COMPONENTE DE COMPARAÇÃO (ATUALIZADO) =========
const ComparacaoContent = ({
  historicoAvaliacoes,
  avaliacaoBase,
  setAvaliacaoBase, // <-- NOVA PROP
  avaliacaoComparacaoId,
  setAvaliacaoComparacaoId,
  primaryColor,
  accentColor,
}) => {
  const avaliacaoComparacao = historicoAvaliacoes.find(
    (a) => a.id === avaliacaoComparacaoId
  );

  if (historicoAvaliacoes.length < 2) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-inner border border-gray-200">
        Pelo menos **2 avaliações válidas** são necessárias para fazer a
        comparação.
      </div>
    );
  }

  if (!avaliacaoBase || !avaliacaoComparacao) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl shadow-inner border border-red-200">
        Selecione duas avaliações para iniciar a comparação.
      </div>
    );
  }

  // Ordenação cronológica para exibição consistente (A = mais antiga, B = mais recente)
  const baseDate = getDateFromAvaliacao(avaliacaoBase);
  const compDate = getDateFromAvaliacao(avaliacaoComparacao);

  const [avaliacaoA, avaliacaoB] =
    baseDate.getTime() < compDate.getTime()
      ? [avaliacaoBase, avaliacaoComparacao]
      : [avaliacaoComparacao, avaliacaoBase];

  const dataA = formatarData(avaliacaoA.inicio || avaliacaoA.dataCriacao);
  const dataB = formatarData(avaliacaoB.inicio || avaliacaoB.dataCriacao);

  const todasAreas = new Set([
    ...Object.keys(avaliacaoA.respostas || {}),
    ...Object.keys(avaliacaoB.respostas || {}),
  ]);
  const areasOrdenadas = Array.from(todasAreas).sort();

  const AvaliacaoPonto = ({ nivel, isChanged }) => {
    const config = NIVEL_CONFIG[nivel] || NIVEL_CONFIG["NA"];
    if (nivel === "NA") {
      return (
        <div className="flex flex-col items-center justify-center min-w-[70px] h-14">
          <span className="text-xl text-gray-400 font-bold">-</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center min-w-[70px] h-14 justify-center">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shadow-lg transition-all duration-300 ${
            isChanged ? "ring-4 ring-offset-2 ring-opacity-75" : ""
          }`}
          style={{
            backgroundColor: config.cor,
            color: config.corTexto,
            ringColor: isChanged ? config.corTexto : "transparent",
          }}
          title={config.descricao}
        >
          {nivel}
        </div>
      </div>
    );
  };

  return (
    <div className="p-2 sm:p-4 mt-4">
      {/* Seletor de Comparação (ATUALIZADO) */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 shadow-md">
        <div className="flex items-center space-x-2 mb-3 border-b pb-2">
          <SwapRightIcon className="w-6 h-6" style={{ color: primaryColor }} />
          <h3 className="text-xl font-bold text-gray-700">
            Configuração da Comparação
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* ✅ NOVO SELETOR PARA AVALIAÇÃO BASE (A) */}
          <div className="w-full sm:w-1/2">
            <p className="text-sm font-semibold text-gray-600 mb-1 text-center">
              Avaliação BASE (Antes/A):
            </p>
            <div className="relative">
              <select
                value={avaliacaoBase.id}
                onChange={(e) => {
                  const novoBase = historicoAvaliacoes.find(
                    (h) => h.id === e.target.value
                  );
                  if (novoBase) setAvaliacaoBase(novoBase);
                }}
                className="w-full px-4 py-2 border-2 rounded-lg shadow-md focus:outline-none focus:ring-2 bg-white text-gray-800 font-medium appearance-none pr-10 cursor-pointer"
                style={{
                  borderColor: primaryColor,
                  focusRingColor: primaryColor,
                }}
              >
                {historicoAvaliacoes
                  .filter((hist) => hist.id !== avaliacaoComparacaoId) // Filtra a seleção B
                  .slice()
                  .reverse()
                  .map((hist) => (
                    <option key={hist.id} value={hist.id}>
                      {formatarData(hist.inicio || hist.dataCriacao)}
                    </option>
                  ))}
              </select>
              <CaretDownIcon
                className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                style={{ color: primaryColor }}
              />
            </div>
          </div>

          {/* ✅ SELETOR ATUALIZADO PARA AVALIAÇÃO DE COMPARAÇÃO (B) */}
          <div className="w-full sm:w-1/2">
            <p className="text-sm font-semibold text-gray-600 mb-1 text-center">
              Avaliação de COMPARAÇÃO (Depois/B):
            </p>
            <div className="relative">
              <select
                value={avaliacaoComparacaoId || ""}
                onChange={(e) => setAvaliacaoComparacaoId(e.target.value)}
                className="w-full px-4 py-2 border-2 rounded-lg shadow-md focus:outline-none focus:ring-2 bg-white text-gray-800 font-medium appearance-none pr-10 cursor-pointer"
                style={{
                  borderColor: accentColor,
                  focusRingColor: accentColor,
                }}
              >
                {historicoAvaliacoes
                  .filter((hist) => hist.id !== avaliacaoBase.id) // Filtra a seleção A
                  .slice()
                  .reverse()
                  .map((hist) => (
                    <option key={hist.id} value={hist.id}>
                      {formatarData(hist.inicio || hist.dataCriacao)}
                    </option>
                  ))}
              </select>
              <CaretDownIcon
                className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                style={{ color: accentColor }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Comparação (sem alterações na lógica interna) */}
      <div className="comparacao-table space-y-6">
        <div
          className="flex justify-between items-center bg-gray-100 p-4 rounded-lg shadow-inner sticky top-0 z-10 border-b-4"
          style={{ borderColor: primaryColor }}
        >
          <div className="text-left font-bold text-gray-700 w-1/3">
            Habilidade
          </div>
          <div className="flex justify-around items-center w-2/3 max-w-2xl">
            <div className="text-center font-bold text-gray-700 min-w-[70px]">
              A ({dataA})
            </div>
            <div className="text-center font-bold text-gray-700 min-w-[100px] flex items-center justify-center">
              <SwapRightIcon
                className="w-4 h-4 mr-1"
                style={{ color: accentColor }}
              />
              Mudança
            </div>
            <div className="text-center font-bold text-gray-700 min-w-[70px]">
              B ({dataB})
            </div>
          </div>
        </div>
        {areasOrdenadas.map((areaPrincipal) => {
          const habilidadesA = avaliacaoA.respostas?.[areaPrincipal] || {};
          const habilidadesB = avaliacaoB.respostas?.[areaPrincipal] || {};
          const todasHabilidades = new Set([
            ...Object.keys(habilidadesA),
            ...Object.keys(habilidadesB),
          ]);
          const habilidadesOrdenadas = Array.from(todasHabilidades).sort();
          const habilidadesValidas = habilidadesOrdenadas.filter(
            (h) =>
              (habilidadesA[h] && habilidadesA[h] !== "NA") ||
              (habilidadesB[h] && habilidadesB[h] !== "NA")
          );

          if (habilidadesValidas.length === 0) return null;

          return (
            <div
              key={areaPrincipal}
              className="area-wrapper bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
            >
              <div
                className="p-4 text-white font-bold text-xl"
                style={{ backgroundColor: primaryColor }}
              >
                {areaPrincipal}
              </div>
              <div className="space-y-2 p-4 sm:p-6">
                {habilidadesValidas.map((habilidade) => {
                  const nivelA = habilidadesA[habilidade] || "NA";
                  const nivelB = habilidadesB[habilidade] || "NA";
                  const scoreA = MAPA_NIVEIS_NUMERICO[nivelA] || 0;
                  const scoreB = MAPA_NIVEIS_NUMERICO[nivelB] || 0;

                  let mudancaConfig = MUDANCA_CONFIG.ESTABILIDADE;
                  let isChanged = false;

                  if (scoreB > scoreA) {
                    mudancaConfig = MUDANCA_CONFIG.MELHORA;
                    isChanged = true;
                  } else if (scoreB < scoreA) {
                    mudancaConfig = MUDANCA_CONFIG.PIORA;
                    isChanged = true;
                  }

                  const MudancaIcon = mudancaConfig.icon;
                  return (
                    <div
                      key={habilidade}
                      className="flex justify-between items-center p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-md transition duration-150"
                    >
                      <span className="text-gray-900 font-medium text-sm sm:w-1/3">
                        {habilidade}
                      </span>
                      <div className="flex justify-around items-center w-2/3 max-w-2xl">
                        <div className="min-w-[70px] text-center">
                          <AvaliacaoPonto nivel={nivelA} isChanged={false} />
                        </div>
                        <div
                          className={`min-w-[100px] flex flex-col items-center justify-center p-1 rounded-lg border-2`}
                          style={{
                            backgroundColor: mudancaConfig.bgColor,
                            borderColor: mudancaConfig.color,
                          }}
                        >
                          <MudancaIcon
                            className="w-5 h-5"
                            style={{ color: mudancaConfig.color }}
                          />
                          <span
                            className="text-xs font-semibold"
                            style={{ color: mudancaConfig.color }}
                          >
                            {mudancaConfig.label}
                          </span>
                        </div>
                        <div className="min-w-[70px] text-center">
                          <AvaliacaoPonto
                            nivel={nivelB}
                            isChanged={isChanged}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda de Mudança (sem alterações) */}
      <div className="p-6 mt-8 bg-gray-100 rounded-xl border border-gray-200 shadow-inner">
        <h4
          className="text-xl font-bold mb-4 border-b pb-2"
          style={{ color: primaryColor }}
        >
          Legenda da Comparação
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(MUDANCA_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm border border-gray-50"
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md`}
                  style={{
                    backgroundColor: config.bgColor,
                    color: config.color,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: config.color }} />
                </span>
                <span className="text-gray-700 text-sm font-semibold">
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ========= COMPONENTE PRINCIPAL (ATUALIZADO) =========
function VerAvaliacao() {
  const { id } = useParams();
  const { dbInstance } = useAuth();

  const [avaliacaoBase, setAvaliacaoBase] = useState(null);
  const [historicoAvaliacoes, setHistoricoAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avaliacaoComparacaoId, setAvaliacaoComparacaoId] = useState(null);
  const [activeTab, setActiveTab] = useState("Detalhes");

  const PRIMARY_COLOR = "#1d3557";
  const ACCENT_COLOR = "#2a9d8f";

  useEffect(() => {
    if (!dbInstance) return;

    const carregarAvaliacao = async () => {
      if (!id) {
        setError("ID da avaliação não fornecido.");
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const historico = await buscarHistoricoCompletoDoAluno(id, dbInstance);

        if (historico.length > 0) {
          const avaliacaoMaisRecente = historico[historico.length - 1];
          setHistoricoAvaliacoes(historico);
          setAvaliacaoBase(avaliacaoMaisRecente);

          if (historico.length >= 2) {
            const segundaMaisRecenteId = historico[historico.length - 2].id;
            setAvaliacaoComparacaoId(segundaMaisRecenteId);
          } else {
            setAvaliacaoComparacaoId(null);
          }
        } else {
          setError(`Nenhuma avaliação válida encontrada para o ID fornecido.`);
        }
      } catch (err) {
        console.error("Erro ao carregar avaliação:", err);
        setError("Falha ao carregar os dados. Verifique o console.");
      } finally {
        setLoading(false);
      }
    };
    carregarAvaliacao();
  }, [id, dbInstance]);

  const handleAvaliacaoChange = (event) => {
    const docId = event.target.value;
    const novaAvaliacao = historicoAvaliacoes.find((a) => a.id === docId);
    if (novaAvaliacao) {
      setAvaliacaoBase(novaAvaliacao);
    }
  };

  if (loading)
    return (
      <div
        className="flex justify-center items-center h-screen text-white"
        style={{ backgroundColor: PRIMARY_COLOR }}
      >
        <div className="text-xl font-semibold">Carregando...</div>
      </div>
    );

  if (error)
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mx-auto max-w-4xl mt-8">
        {error}
      </div>
    );

  if (!avaliacaoBase)
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold text-gray-500">
          Avaliação não disponível.
        </div>
      </div>
    );

  const alunoNome =
    avaliacaoBase.alunoNome ||
    avaliacaoBase.aluno?.nome ||
    "Aluno Desconhecido";
  const avaliacaoAtualId =
    historicoAvaliacoes.length > 0
      ? historicoAvaliacoes[historicoAvaliacoes.length - 1].id
      : null;

  const TabButton = ({ name, icon: Icon, onClick }) => {
    const isActive = activeTab === name;
    const activeStyle = {
      backgroundColor: isActive ? PRIMARY_COLOR : "white",
      color: isActive ? "white" : PRIMARY_COLOR,
      borderColor: PRIMARY_COLOR,
    };
    return (
      <button
        onClick={onClick}
        className="flex items-center justify-center space-x-2 px-6 py-3 border-b-2 rounded-t-lg font-bold transition duration-200 text-sm sm:text-base flex-1 min-w-[120px]"
        style={activeStyle}
      >
        <Icon className="w-5 h-5" />
        <span>{name}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <BotaoVoltar destino="/painel-aee" />
          <h1
            className="text-3xl sm:text-4xl font-extrabold mt-4 sm:mt-0 text-gray-800"
            style={{ color: PRIMARY_COLOR }}
          >
            Evolução do Aluno
          </h1>
        </header>

        <div
          className="bg-white p-5 sm:p-6 rounded-2xl shadow-xl mb-6 border-t-8"
          style={{ borderColor: PRIMARY_COLOR }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-1">{alunoNome}</h2>
        </div>

        {/* Seletor de Avaliação Principal (influencia a aba Detalhes) */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <HistoryIcon className="w-6 h-6" style={{ color: ACCENT_COLOR }} />
            <span className="text-lg font-semibold text-gray-700">
              Visualizar Detalhes da Avaliação:
            </span>
          </div>
          <div className="relative w-full sm:w-1/2">
            <select
              id="seletor-avaliacao-base"
              value={avaliacaoBase.id}
              onChange={handleAvaliacaoChange}
              className="w-full px-4 py-3 border-2 rounded-lg shadow-md focus:outline-none focus:ring-2 bg-white text-gray-800 font-bold appearance-none pr-10 cursor-pointer"
              style={{
                borderColor: PRIMARY_COLOR,
                focusRingColor: PRIMARY_COLOR,
              }}
            >
              {historicoAvaliacoes
                .slice()
                .reverse()
                .map((hist) => {
                  const dataFormatada = formatarData(
                    hist.inicio || hist.dataCriacao
                  );
                  let label = dataFormatada;
                  if (hist.id === avaliacaoAtualId) label += " (Atual)";
                  const tipo =
                    hist.colecao === "avaliacoesIniciais"
                      ? " - Inicial"
                      : " - Reavaliação";
                  label += tipo;
                  return (
                    <option key={hist.id} value={hist.id}>
                      {label}
                    </option>
                  );
                })}
            </select>
            <CaretDownIcon
              className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
              style={{ color: PRIMARY_COLOR }}
            />
          </div>
        </div>

        <div className="flex border-b-2 border-gray-200 overflow-x-auto mb-6">
          <TabButton
            name="Detalhes"
            icon={CalendarIcon}
            onClick={() => setActiveTab("Detalhes")}
          />
          <TabButton
            name="Comparação"
            icon={SwapRightIcon}
            onClick={() => setActiveTab("Comparação")}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          {activeTab === "Detalhes" && (
            <DetalhesContent
              avaliacao={avaliacaoBase}
              primaryColor={PRIMARY_COLOR}
              accentColor={ACCENT_COLOR}
            />
          )}
          {activeTab === "Comparação" && (
            <ComparacaoContent
              historicoAvaliacoes={historicoAvaliacoes}
              avaliacaoBase={avaliacaoBase}
              setAvaliacaoBase={setAvaliacaoBase} // <-- PROP ADICIONADA
              avaliacaoComparacaoId={avaliacaoComparacaoId}
              setAvaliacaoComparacaoId={setAvaliacaoComparacaoId}
              primaryColor={PRIMARY_COLOR}
              accentColor={ACCENT_COLOR}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default VerAvaliacao;
