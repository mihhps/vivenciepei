// functions/index.js (ou .ts)

const functions = require("firebase-functions");
const admin = require("firebase-admin"); // Para interagir com o Firestore e outros serviços
admin.initializeApp(); // Inicializa o Admin SDK

const db = admin.firestore(); // Referência ao seu Firestore

// --- Constantes para Status do PEI (replicar do frontend para consistência) ---
const PEI_STATUS = {
  CONCLUIDO: "concluído",
  EM_ELABORACAO: "em elaboração",
};

/**
 * Cloud Function para agregar dados de acompanhamento de PEIs por escola.
 * Acionada via HTTP.
 * @param {object} req - Objeto de requisição HTTP (espera { anoLetivo: number } no body ou query).
 * @param {object} res - Objeto de resposta HTTP.
 */
exports.getPeiAcompanhamentoBySchool = functions.https.onRequest(
  async (req, res) => {
    // Configurar CORS para permitir requisições do seu frontend
    res.set("Access-Control-Allow-Origin", "*"); // Ou o domínio específico do seu frontend: 'https://seuapp.web.app'
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Lida com requisições OPTIONS (preflight)
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Obter o ano letivo do corpo da requisição ou dos parâmetros de query
    const anoLetivo =
      req.method === "POST" ? req.body.anoLetivo : req.query.anoLetivo;

    if (!anoLetivo) {
      console.error("Ano letivo não fornecido na requisição.");
      return res.status(400).json({ error: "Ano letivo é obrigatório." });
    }

    try {
      const hoje = admin.firestore.Timestamp.now().toDate(); // Use Timestamp do Admin SDK
      hoje.setHours(0, 0, 0, 0); // Zera horas para comparação de data

      // 1. Busca todas as escolas
      const escolasSnapshot = await db.collection("escolas").get();
      const escolas = escolasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const dadosAgregados = [];

      // Para cada escola, agrega os dados de alunos e PEIs
      // Use Promise.all para executar as consultas em paralelo para cada escola
      await Promise.all(
        escolas.map(async (escola) => {
          // Total de alunos que necessitam de monitoramento na escola
          // **Ajuste esta query se sua definição de "alunos monitorados" for mais específica.**
          const alunosQuery = db
            .collection("alunos")
            .where("escolaId", "==", escola.id);
          // Se houver um campo de ano de matrícula para alunos:
          // .where("anoMatricula", "==", anoLetivo);

          const totalNecessitandoSnapshot = await alunosQuery.count().get(); // Firestore V9 count()
          const totalNecessitando = totalNecessitandoSnapshot.data().count;

          const peisQuery = db
            .collection("PEIs")
            .where("escolaId", "==", escola.id)
            .where("anoLetivo", "==", Number(anoLetivo)); // Garanta que seja number

          const peisSnapshot = await peisQuery.get();

          let peisComStatusEmElaboracao = 0;
          let peisComStatusConcluido = 0;
          let peisAtrasados = 0;

          peisSnapshot.forEach((doc) => {
            const pei = doc.data();
            const statusOriginal = pei.status;
            const statusPEI = statusOriginal
              ? statusOriginal.trim().toLowerCase()
              : "";

            if (statusPEI === PEI_STATUS.CONCLUIDO) {
              peisComStatusConcluido++;
            } else if (statusPEI === PEI_STATUS.EM_ELABORACAO) {
              peisComStatusEmElaboracao++;
              if (
                pei.dataPrevistaTermino instanceof admin.firestore.Timestamp
              ) {
                try {
                  const dataPrevista = pei.dataPrevistaTermino.toDate();
                  if (dataPrevista < hoje) {
                    // Compara apenas a data
                    peisAtrasados++;
                  }
                } catch (e) {
                  console.warn(
                    `[Cloud Function] Erro ao processar dataPrevistaTermino para PEI ${doc.id} da escola ${escola.nome}:`,
                    e.message
                  );
                }
              } else {
                console.warn(
                  `[Cloud Function] dataPrevistaTermino não é um Timestamp para PEI ${doc.id} da escola ${escola.nome}`
                );
              }
            }
          });

          const peisExistentes =
            peisComStatusEmElaboracao + peisComStatusConcluido;
          const pendenteCriacaoCalculado = Math.max(
            0,
            totalNecessitando - peisExistentes
          );

          const percentualConcluidosNum =
            totalNecessitando > 0
              ? (peisComStatusConcluido / totalNecessitando) * 100
              : 0;

          dadosAgregados.push({
            id: escola.id,
            nomeEscola: escola.nome || "Nome Indisponível",
            totalAlunosMonitorados: totalNecessitando,
            pendenteCriacao: pendenteCriacaoCalculado,
            emElaboracao: peisComStatusEmElaboracao,
            atrasados: peisAtrasados,
            concluidos: peisComStatusConcluido,
            percentualConcluidosNum: percentualConcluidosNum,
          });
        })
      );

      // Retorna os dados agregados
      return res.status(200).json(dadosAgregados);
    } catch (err) {
      console.error("[Cloud Function] Erro ao agregar dados de PEI:", err);
      return res
        .status(500)
        .json({ error: "Erro interno do servidor ao processar os dados." });
    }
  }
);
