export const SECOES_AVALIACAO = [
  {
    id: "motricidade-grossa",
    titulo: "Motricidade Grossa",
    subareas: [
      {
        nome: "Habilidades de Locomoção",
        habilidades: [
          {
            habilidade:
              "A criança realiza a transição da posição sentada para a em pé de forma autônoma, sem suporte manual.",
            niveis: {
              NR: "Não inicia a transição, mesmo com auxílio.",
              AF: "Requer assistência física completa para a transição.",
              AG: "Executa a transição após observar e imitar a demonstração gestual da ação.",
              AV: "Executa a transição com encorajamento ou instrução verbal.",
              AVi: "Executa a transição ao visualizar uma imagem ou vídeo da ação.",
              I: "Realiza a transição de forma autônoma e consistente, sem apoio das mãos.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança realiza marcha lateral e em ré com controle postural e equilíbrio.",
            niveis: {
              NR: "Não inicia a marcha lateral ou em ré.",
              AF: "Requer suporte físico para se deslocar lateralmente ou para trás.",
              AG: "Realiza a marcha após a demonstração gestual do examinador.",
              AV: "Realiza a marcha com instrução verbal, mas com instabilidade.",
              AVi: "Realiza a marcha seguindo um trajeto visual (ex: fita no chão).",
              I: "Executa a marcha lateral e em ré de forma autônoma e equilibrada.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança realiza subida e descida em superfícies inclinadas (como um morro), mantendo o controle da postura.",
            niveis: {
              NR: "Não tenta subir ou descer a superfície.",
              AF: "Necessita de suporte físico para subir ou descer.",
              AG: "Sobe ou desce após a demonstração gestual da ação.",
              AV: "Sobe ou desce com instruções verbais, mas com insegurança.",
              AVi: "Sobe ou desce seguindo um trajeto visual.",
              I: "Sobe e desce o plano inclinado mantendo a postura de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança executa a subida e descida de escadas com alternância de pés e sem necessidade de apoio manual.",
            niveis: {
              NR: "Não demonstra intenção de subir ou descer escadas.",
              AF: "Requer suporte físico total para se deslocar nas escadas.",
              AG: "Sobe ou desce após a demonstração gestual do examinador.",
              AV: "Sobe ou desce com instruções verbais, mas de forma insegura.",
              AVi: "Sobe ou desce seguindo um trajeto visual.",
              I: "Sobe e desce as escadas de forma autônoma e segura, alternando os pés.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança transpõe um obstáculo de pequena altura (ex: uma linha no chão) com um salto bimanual.",
            niveis: {
              NR: "Não tenta saltar sobre o obstáculo.",
              AF: "Necessita de suporte físico para saltar sobre o obstáculo.",
              AG: "Salto após a demonstração gestual da ação.",
              AV: "Salto com encorajamento verbal, mas de forma insegura.",
              AVi: "Salto após o examinador demonstrar a ação, imitando-o com pistas visuais.",
              I: "Salto o obstáculo de forma autônoma e coordenada.",
              NA: "Não aplicável.",
            },
          },
        ],
      },
      {
        nome: "Habilidades de Salto e Projeção",
        habilidades: [
          {
            habilidade:
              "A criança executa um salto horizontal com ambos os pés simultaneamente a partir de uma posição estática.",
            niveis: {
              NR: "Não inicia o salto.",
              AF: "Requer suporte físico para realizar o salto.",
              AG: "Salto para a frente após a demonstração gestual da ação.",
              AV: "Salto com encorajamento verbal, mas de forma insegura.",
              AVi: "Salto após o examinador demonstrar a ação, imitando-o com pistas visuais.",
              I: "Salto com os dois pés juntos de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança mantém o equilíbrio sobre uma única perna por um período de tempo definido.",
            niveis: {
              NR: "Não tenta a posição unipodal.",
              AF: "Requer suporte físico para se manter em um pé.",
              AG: "Mantém a posição após a demonstração gestual do examinador.",
              AV: "Tenta manter a posição com encorajamento verbal, mas apresenta queda.",
              AVi: "Mantém a posição após o examinador demonstrar a ação, imitando-o com pistas visuais.",
              I: "Mantém a posição unipodal por alguns segundos sem queda, de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança realiza a corrida em linha reta e demonstra a capacidade de parar em comando.",
            niveis: {
              NR: "Não corre ou não para em resposta ao comando.",
              AF: "Requer suporte físico para guiar a corrida.",
              AG: "Corre e para após a demonstração gestual da ação.",
              AV: "Corre e para com instruções verbais.",
              AVi: "Corre e para seguindo uma pista ou trajeto visual.",
              I: "Corre em linha reta e para rapidamente quando solicitado, de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança arremessa um objeto (bola) com projeção do braço acima do ombro, direcionando-o a um alvo específico.",
            niveis: {
              NR: "Não arremessa o objeto.",
              AF: "Requer suporte físico para guiar o movimento do braço.",
              AG: "Arremessa após a demonstração gestual da ação.",
              AV: "Arremessa com instruções verbais, mas com imprecisão.",
              AVi: "Arremessa ao visualizar um recurso visual (ex: alvo).",
              I: "Arremessa o objeto por cima do ombro em uma direção específica de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança executa o chute em um objeto (bola), demonstrando controle motor e direcional.",
            niveis: {
              NR: "Não chuta o objeto.",
              AF: "Requer suporte físico para guiar o movimento do pé.",
              AG: "Chuta após a demonstração gestual da ação.",
              AV: "Chuta com instruções verbais, mas com pouca coordenação.",
              AVi: "Chuta ao visualizar um recurso visual (ex: alvo).",
              I: "Chuta o objeto para a frente com controle e precisão de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "motricidade-fina",
    titulo: "Motricidade Fina",
    subareas: [
      {
        nome: "Habilidades de Manipulação e Precisão",
        habilidades: [
          {
            habilidade:
              "A criança utiliza a preensão em pinça (ponta do polegar e indicador) para manipular objetos de pequenas dimensões.",
            niveis: {
              NR: "Não tenta manipular objetos pequenos.",
              AF: "Requer suporte físico para guiar os dedos.",
              AG: "Manipula após a demonstração gestual da ação.",
              AV: "Manipula com instruções verbais, mas com dificuldade.",
              AVi: "Manipula após o examinador demonstrar a ação, imitando-o com pistas visuais.",
              I: "Manipula objetos pequenos usando a preensão em pinça de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança demonstra coordenação bimanual e precisão na construção de uma torre com 8 ou mais blocos.",
            niveis: {
              NR: "Não tenta empilhar os blocos.",
              AF: "Requer suporte físico para guiar as mãos.",
              AG: "Empilha após a demonstração gestual da ação.",
              AV: "Empilha com instruções verbais, mas com pouca coordenação.",
              AVi: "Empilha após o examinador demonstrar a ação, imitando-o com pistas visuais.",
              I: "Empilha 8 ou mais blocos com coordenação e precisão de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança replica graficamente formas geométricas básicas (círculo, cruz) a partir de um modelo.",
            niveis: {
              NR: "Não tenta realizar o desenho.",
              AF: "Requer suporte físico para guiar a mão.",
              AG: "Desenha após a demonstração gestual da ação.",
              AV: "Desenha com instruções verbais, mas com imprecisão.",
              AVi: "Consegue copiar traçados que o examinador faz em um papel.",
              I: "Reproduz o desenho de um círculo ou cruz com controle e precisão de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança utiliza a preensão em tripé para segurar um instrumento de escrita, produzindo rabiscos ou traços.",
            niveis: {
              NR: "Não tenta segurar o instrumento.",
              AF: "Requer suporte físico para guiar a mão.",
              AG: "Segura o instrumento após a demonstração gestual da ação.",
              AV: "Segura o instrumento com instruções verbais, mas com imprecisão.",
              AVi: "Segura o instrumento após o examinador demonstrar a ação, imitando-o com pistas visuais.",
              I: "Segura o instrumento com preensão de tripé e produz rabiscos ou traços de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança manipula elementos de vestuário como zíperes e botões de forma funcional.",
            niveis: {
              NR: "Não tenta abrir ou fechar fechos.",
              AF: "Requer suporte físico para guiar os dedos.",
              AG: "Abre e fecha fechos após a demonstração gestual da ação.",
              AV: "Abre e fecha fechos com instruções verbais, mas com pouca coordenação.",
              AVi: "Abre e fecha fechos ao visualizar uma imagem ou vídeo da ação.",
              I: "Usa os dedos para abrir e fechar fechos de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "linguagem-e-comunicacao",
    titulo: "Linguagem e Comunicação",
    subareas: [
      {
        nome: "Comunicação Expressiva",
        habilidades: [
          {
            habilidade:
              "A criança formula perguntas usando pronomes interrogativos como 'quem', 'o quê' e 'onde'?",
            niveis: {
              NR: "Não formula perguntas.",
              AF: "Requer suporte físico (gesto) para indicar a intenção de perguntar.",
              AG: "Formula a pergunta após a demonstração gestual do examinador.",
              AV: "Formula a pergunta com apoio verbal do examinador.",
              AVi: "Utiliza figuras ou imagens para formular perguntas.",
              I: "Formula perguntas usando pronomes interrogativos de forma autônoma e contextualizada.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança constrói frases compostas por três ou mais palavras.",
            niveis: {
              NR: "Não forma frases.",
              AF: "Requer suporte físico para guiar a vocalização ou fala.",
              AG: "Forma a frase após a demonstração gestual do examinador.",
              AV: "Forma frases simples com apoio verbal do examinador.",
              AVi: "Utiliza figuras ou imagens para formar frases.",
              I: "Construção de frases com três ou mais palavras de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança utiliza a linguagem verbal para expressar pedidos e necessidades de forma intencional.",
            niveis: {
              NR: "Não utiliza a fala para expressar pedidos.",
              AF: "Requer suporte físico para indicar o pedido.",
              AG: "Expressa o pedido após a demonstração gestual do examinador.",
              AV: "Expressa o pedido com apoio verbal do examinador.",
              AVi: "Utiliza figuras ou imagens para expressar pedidos.",
              I: "Utiliza a fala para expressar pedidos de forma autônoma e consistente.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança nomeia espontaneamente objetos, pessoas e ações em seu ambiente.",
            niveis: {
              NR: "Não utiliza a fala para nomear.",
              AF: "Requer suporte físico para a nomeação.",
              AG: "Nomeia após a demonstração gestual do examinador.",
              AV: "Nomeia com apoio verbal do examinador.",
              AVi: "Utiliza figuras ou imagens para a nomeação.",
              I: "Nomeia objetos, pessoas e ações de forma espontânea e autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança responde a questionamentos diretos com respostas elaboradas, que não se limitam a 'sim' ou 'não'.",
            niveis: {
              NR: "Não responde a perguntas.",
              AF: "Responde com suporte físico.",
              AG: "Responde após a demonstração gestual do examinador.",
              AV: "Responde com apoio verbal do examinador.",
              AVi: "Utiliza figuras ou imagens para responder a perguntas.",
              I: "Responde a perguntas diretas com respostas elaboradas de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
        ],
      },
      {
        nome: "Compreensão da Linguagem",
        habilidades: [
          {
            habilidade:
              "A criança segue instruções de duas etapas sem a necessidade de pistas gestuais.",
            niveis: {
              NR: "Não segue instruções.",
              AF: "Segue instruções com suporte físico.",
              AG: "Segue instruções com apoio gestual do examinador.",
              AV: "Segue instruções com apoio verbal do examinador.",
              AVi: "Segue instruções com o auxílio de um recurso visual.",
              I: "Segue instruções de duas etapas de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança compreende e executa ordens que envolvem múltiplos objetos ou conceitos, como 'pegue a boneca pequena na caixa e me dê'.",
            niveis: {
              NR: "Não compreende ordens complexas.",
              AF: "Compreende ordens complexas com suporte físico.",
              AG: "Compreende ordens complexas com apoio gestual do examinador.",
              AV: "Compreende ordens complexas com apoio verbal do examinador.",
              AVi: "Compreende ordens complexas com o auxílio de um recurso visual.",
              I: "Compreende e executa ordens complexas de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança identifica e aponta para partes do corpo humano quando nomeadas.",
            niveis: {
              NR: "Não aponta para partes do corpo.",
              AF: "Aponta com suporte físico.",
              AG: "Aponta após demonstração gestual do examinador.",
              AV: "Aponta com apoio verbal do examinador.",
              AVi: "Aponta com o auxílio de um recurso visual.",
              I: "Aponta para partes do corpo de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança reconhece e aponta para figuras em materiais impressos quando nomeadas.",
            niveis: {
              NR: "Não reconhece figuras.",
              AF: "Reconhece e aponta com suporte físico.",
              AG: "Reconhece e aponta com apoio gestual do examinador.",
              AV: "Reconhece e aponta com apoio verbal do examinador.",
              AVi: "Reconhece e aponta com o auxílio de um recurso visual.",
              I: "Reconhece e aponta para figuras de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "cognitivo",
    titulo: "Cognitivo",
    subareas: [
      {
        nome: "Resolução de Problemas e Habilidades Lógicas",
        habilidades: [
          {
            habilidade:
              "A criança demonstra capacidade de pareamento e encaixe de formas geométricas em um tabuleiro.",
            niveis: {
              NR: "Não consegue encaixar formas.",
              AF: "Encaixa formas com suporte físico.",
              AG: "Encaixa formas com apoio gestual do examinador.",
              AV: "Encaixa formas com apoio verbal do examinador.",
              AVi: "Encaixa formas com o auxílio de um recurso visual.",
              I: "Encaixa formas diferentes em um tabuleiro de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade: "A criança monta um quebra-cabeça simples (3-5 peças).",
            niveis: {
              NR: "Não consegue montar o quebra-cabeça.",
              AF: "Monta o quebra-cabeça com suporte físico.",
              AG: "Monta o quebra-cabeça com apoio gestual do examinador.",
              AV: "Monta o quebra-cabeça com apoio verbal do examinador.",
              AVi: "Monta o quebra-cabeça com o auxílio de um recurso visual.",
              I: "Monta um quebra-cabeça simples de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança segue uma sequência simples de instruções (ex: 'primeiro vamos guardar os blocos e depois vamos ler o livro').",
            niveis: {
              NR: "Não consegue seguir a sequência.",
              AF: "Segue a sequência com suporte físico.",
              AG: "Segue a sequência com apoio gestual do examinador.",
              AV: "Segue a sequência com apoio verbal do examinador.",
              AVi: "Segue a sequência com o auxílio de um recurso visual.",
              I: "Segue uma sequência simples de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança se engaja em brincadeiras simbólicas ou de faz de conta de forma elaborada e sequencial.",
            niveis: {
              NR: "Não participa de brincadeiras de faz de conta.",
              AF: "Engaja-se com suporte físico.",
              AG: "Engaja-se com apoio gestual do examinador.",
              AV: "Engaja-se com apoio verbal do examinador.",
              AVi: "Engaja-se com o auxílio de um recurso visual.",
              I: "Engaja-se em brincadeiras de faz de conta de forma elaborada e autônoma.",
              NA: "Não aplicável.",
            },
          },
        ],
      },
      {
        nome: "Discriminação e Memória",
        habilidades: [
          {
            habilidade: "A criança pareia objetos idênticos, cores e formas.",
            niveis: {
              NR: "Não consegue realizar o pareamento.",
              AF: "Pareia com suporte físico.",
              AG: "Pareia com apoio gestual do examinador.",
              AV: "Pareia com apoio verbal do examinador.",
              AVi: "Pareia com o auxílio de um recurso visual.",
              I: "Pareia objetos, cores e formas idênticos de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança demonstra memória de trabalho, lembrando-se da localização de um objeto escondido quando não viu o ato de esconder.",
            niveis: {
              NR: "Não se lembra da localização do objeto.",
              AF: "Lembra-se com suporte físico.",
              AG: "Lembra-se com apoio gestual do examinador.",
              AV: "Lembra-se com apoio verbal do examinador.",
              AVi: "Lembra-se com o auxílio de um recurso visual.",
              I: "Lembra-se da localização do objeto de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança identifica e aponta para um objeto específico dentro de um conjunto, após ser nomeado.",
            niveis: {
              NR: "Não consegue apontar para o objeto nomeado.",
              AF: "Aponta com suporte físico.",
              AG: "Aponta com apoio gestual do examinador.",
              AV: "Aponta com apoio verbal do examinador.",
              AVi: "Aponta com o auxílio de um recurso visual.",
              I: "Aponta para o objeto que foi nomeado de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "socioemocional-e-habilidades-de-vida-diaria",
    titulo: "Socioemocional e Habilidades de Vida Diária",
    subareas: [
      {
        nome: "Interação Social",
        habilidades: [
          {
            habilidade:
              "A criança inicia interações com pares (outras crianças) de forma espontânea.",
            niveis: {
              NR: "Não procura interações com outras crianças.",
              AF: "Procura interações com suporte físico.",
              AG: "Procura interações com apoio gestual do examinador.",
              AV: "Procura interações com apoio verbal do examinador.",
              AVi: "Procura interações com o auxílio de um recurso visual.",
              I: "Procura interações com outras crianças de forma autônoma e espontânea.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança demonstra empatia, respondendo a estados emocionais de outras pessoas, como tentar consolar alguém triste.",
            niveis: {
              NR: "Não demonstra empatia.",
              AF: "Demonstra empatia com suporte físico.",
              AG: "Demonstra empatia com apoio gestual do examinador.",
              AV: "Demonstra empatia com apoio verbal do examinador.",
              AVi: "Demonstra empatia com o auxílio de um recurso visual.",
              I: "Demonstra empatia de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança compartilha objetos e brinquedos com outras crianças de forma espontânea.",
            niveis: {
              NR: "Não compartilha brinquedos.",
              AF: "Compartilha com suporte físico.",
              AG: "Compartilha com apoio gestual do examinador.",
              AV: "Compartilha com apoio verbal do examinador.",
              AVi: "Compartilha com o auxílio de um recurso visual.",
              I: "Compartilha brinquedos com outras crianças de forma espontânea e autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança se envolve em brincadeiras de imitação com adultos.",
            niveis: {
              NR: "Não se envolve em brincadeiras de imitação.",
              AF: "Envolve-se com suporte físico.",
              AG: "Envolve-se com apoio gestual do examinador.",
              AV: "Envolve-se com apoio verbal do examinador.",
              AVi: "Envolve-se com o auxílio de um recurso visual.",
              I: "Envolve-se em brincadeiras de imitação com adultos de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança busca ativamente a atenção de um adulto para compartilhar um interesse comum (apontando ou olhando).",
            niveis: {
              NR: "Não tenta chamar a atenção de um adulto.",
              AF: "Tenta chamar a atenção com suporte físico.",
              AG: "Tenta chamar a atenção com apoio gestual do examinador.",
              AV: "Tenta chamar a atenção com apoio verbal do examinador.",
              AVi: "Tenta chamar a atenção com o auxílio de um recurso visual.",
              I: "Busca a atenção de um adulto para compartilhar um interesse de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança demonstra afeto por figuras familiares através de contato físico espontâneo (abraçando ou beijando).",
            niveis: {
              NR: "Não demonstra afeto.",
              AF: "Demonstra afeto com suporte físico.",
              AG: "Demonstra afeto com apoio gestual do examinador.",
              AV: "Demonstra afeto com apoio verbal do examinador.",
              AVi: "Demonstra afeto com o auxílio de um recurso visual.",
              I: "Demonstra afeto por pessoas familiares de forma espontânea e autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança se engaja em jogos de reciprocidade (vai e vem) com o adulto, como rolar uma bola ou passar um objeto.",
            niveis: {
              NR: "Não participa de jogos de reciprocidade.",
              AF: "Participa com suporte físico.",
              AG: "Participa com apoio gestual do examinador.",
              AV: "Participa com apoio verbal do examinador.",
              AVi: "Participa com o auxílio de um recurso visual.",
              I: "Participa de jogos de reciprocidade de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
        ],
      },
      {
        nome: "Autonomia e Cuidados Pessoais",
        habilidades: [
          {
            habilidade:
              "A criança participa da tarefa de se vestir, colaborando com o processo.",
            niveis: {
              NR: "Não tenta se vestir.",
              AF: "Participa com suporte físico.",
              AG: "Participa com apoio gestual do examinador.",
              AV: "Participa com apoio verbal do examinador.",
              AVi: "Participa com o auxílio de um recurso visual.",
              I: "Tenta se vestir sozinha, mesmo que com pouca ajuda, de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança utiliza talheres (colher e garfo) de forma independente durante as refeições.",
            niveis: {
              NR: "Não tenta usar os talheres.",
              AF: "Utiliza os talheres com suporte físico.",
              AG: "Utiliza os talheres com apoio gestual do examinador.",
              AV: "Utiliza os talheres com apoio verbal do examinador.",
              AVi: "Utiliza os talheres com o auxílio de um recurso visual.",
              I: "Utiliza colher e garfo de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança colabora na higiene das mãos, demonstrando capacidade de esfregar e secar.",
            niveis: {
              NR: "Não colabora na higiene das mãos.",
              AF: "Colabora com suporte físico.",
              AG: "Colabora com apoio gestual do examinador.",
              AV: "Colabora com apoio verbal do examinador.",
              AVi: "Colabora com o auxílio de um recurso visual.",
              I: "Colabora na higiene das mãos, esfregando-as e secando-as de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança demonstra interesse na autonomia de uso do banheiro, comunicando a necessidade de forma verbal ou não verbal.",
            niveis: {
              NR: "Não demonstra interesse em usar o banheiro.",
              AF: "Demonstra interesse com suporte físico.",
              AG: "Demonstra interesse com apoio gestual do examinador.",
              AV: "Demonstra interesse com apoio verbal do examinador.",
              AVi: "Demonstra interesse com o auxílio de um recurso visual.",
              I: "Demonstra interesse em usar o banheiro e comunica a necessidade de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
          {
            habilidade:
              "A criança demonstra iniciativa e colaboração em pequenas tarefas domésticas, como guardar brinquedos ou levar um objeto para o lixo.",
            niveis: {
              NR: "Não guarda os brinquedos ou não ajuda em pequenas tarefas.",
              AF: "Guarda os brinquedos ou ajuda com suporte físico.",
              AG: "Guarda os brinquedos ou ajuda com apoio gestual do examinador.",
              AV: "Guarda os brinquedos ou ajuda com apoio verbal do examinador.",
              AVi: "Guarda os brinquedos ou ajuda com o auxílio de um recurso visual.",
              I: "Guarda seus brinquedos ou ajuda em pequenas tarefas da casa de forma autônoma.",
              NA: "Não aplicável.",
            },
          },
        ],
      },
    ],
  },
];
