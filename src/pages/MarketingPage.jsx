import React from "react";
import { Link } from "react-router-dom";

// O código da sua página de aterragem original, agora como um componente separado.

const styles = {
  body: {
    fontFamily: '"Inter", sans-serif',
    color: "#1a202c",
    backgroundColor: "#f3f4f6",
  },
};

const LandingPage = () => {
  return (
    <div style={styles.body}>
      <main className="min-h-screen">
        {/* Seção Principal */}
        <section className="relative bg-blue-900 text-white py-16 sm:py-20 overflow-hidden">
          {/* Padrão de fundo */}
          <div className="absolute inset-0 z-0 opacity-10">
            <svg
              className="h-full w-full"
              fill="none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern
                  id="pattern-5c1265f5-f0b5-41f2-851b-f7e52a832e8d"
                  x="0"
                  y="0"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <rect
                    x="0"
                    y="0"
                    width="1"
                    height="1"
                    className="text-white fill-current opacity-25"
                  ></rect>
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="url(#pattern-5c1265f5-f0b5-41f2-851b-f7e52a832e8d)"
              ></rect>
            </svg>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <img
              src="/logo-vivencie.png"
              alt="Logo da Vivencie PEI"
              className="mx-auto h-80 w-auto mb-12"
            />

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-gray-200">
              Vivencie o Crescimento.
              <br className="hidden sm:inline" />
              Vivencie o PEI.
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg sm:text-xl font-medium text-blue-200">
              Uma plataforma completa e intuitiva para elaboração e gestão de
              Planos Educacionais Individualizados (PEIs), com suporte ao
              Atendimento Educacional Especializado (AEE), desenvolvida para
              qualificar a prática pedagógica e promover a aprendizagem de forma
              equitativa e personalizada.
            </p>
            <div className="mt-8 flex justify-center">
              {/* O BOTÃO AGORA USA O COMPONENTE LINK PARA NAVEGAR PARA A NOVA PÁGINA */}
              <Link
                to="/inicio"
                className="inline-block px-8 py-3 font-semibold text-blue-900 bg-white rounded-full shadow-lg transition-transform transform hover:scale-105 hover:bg-gray-100"
              >
                Acessar a Plataforma
              </Link>
            </div>
          </div>
        </section>
        {/* Seção de Benefícios */}
        <section className="bg-blue-50 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-blue-900">
              Por que Vivencie PEI?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Benefício 1 */}
              <div className="bg-white p-6 rounded-2xl shadow-md space-y-2 border border-blue-100 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 p-2">
                  <img
                    src="/images/colaboracao.png"
                    alt="Ícone de colaboração"
                    className="h-full w-full object-contain"
                  />
                </div>
                <h3 className="font-bold text-lg text-blue-600">
                  Colaboração e Coerência
                </h3>
                <p className="text-sm text-gray-700">
                  Promove a cooperação, unifica o processo e assegura que toda a
                  equipe esteja alinhada a um propósito único.
                </p>
              </div>
              {/* Benefício 2 */}
              <div className="bg-white p-6 rounded-2xl shadow-md space-y-2 border border-blue-100 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 p-2">
                  <img
                    src="/images/otimizacao.png"
                    alt="Ícone de otimização de tempo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <h3 className="font-bold text-lg text-blue-600">
                  Otimização do Tempo
                </h3>
                <p className="text-sm text-gray-700">
                  Minimiza a necessidade de reuniões e simplifica o processo de
                  elaboração, edição e registro dos planos.
                </p>
              </div>
              {/* Benefício 3 */}
              <div className="bg-white p-6 rounded-2xl shadow-md space-y-2 border border-blue-100 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 p-2">
                  <img
                    src="/images/visao.png"
                    alt="Ícone de visão 360"
                    className="h-full w-full object-contain"
                  />
                </div>
                <h3 className="font-bold text-lg text-blue-600">
                  Visão 360º do Aluno
                </h3>
                <p className="text-sm text-gray-700">
                  Integra a avaliação de habilidades, interesses e gatilhos,
                  oferecendo à equipe uma compreensão ampla e aprofundada do
                  aluno.
                </p>
              </div>
              {/* Benefício 4 */}
              <div className="bg-white p-6 rounded-2xl shadow-md space-y-2 border border-blue-100 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 p-2">
                  <img
                    src="/images/documentacao.png"
                    alt="Ícone de documentação"
                    className="h-full w-full object-contain"
                  />
                </div>
                <h3 className="font-bold text-lg text-blue-600">
                  Documentação Simplificada
                </h3>
                <p className="text-sm text-gray-700">
                  Gera de forma automática um documento PDF completo, ideal para
                  organizar, arquivar e compartilhar.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* Seção de Recursos */}
        <section className="bg-white py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-900">
                Nossa Metodologia em Ação
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                A Vivencie PEI transforma a elaboração de Planos Educacionais
                Individualizados em um processo estruturado, simples e
                eficiente.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
              {/* Passo 1: Avaliação */}
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/avaliacao.png"
                    alt="Ícone de Avaliação"
                    className="w-20 h-20"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  1. Avaliação Inicial
                </h3>
                <p className="text-sm text-gray-600">
                  Nossas avaliações foram desenvolvidas com base em metodologias
                  reconhecidas (Portage, Denver e WISC), garantindo uma análise
                  completa das habilidades e interesses do aluno, em alinhamento
                  com a BNCC.
                </p>
              </div>

              {/* Passo 2: Criação */}
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/criacao.png"
                    alt="Ícone de Criação"
                    className="w-20 h-20"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  2. Criação Inteligente do PEI
                </h3>
                <p className="text-sm text-gray-600">
                  A plataforma guia a criação do PEI, puxando as habilidades
                  avaliadas e sugerindo objetivos e estratégias que podem ser
                  personalizados pelo professor.
                </p>
              </div>

              {/* Passo 3: Acompanhamento */}
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/acompanhamento.png"
                    alt="Ícone de Acompanhamento"
                    className="w-20 h-20"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  3. Acompanhamento e Registro
                </h3>
                <p className="text-sm text-gray-600">
                  Registre atividades e observações de forma detalhada e
                  centralizada, garantindo um histórico completo do
                  desenvolvimento do aluno.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Nova Seção: Visão Estratégica para a Gestão */}
        <section className="bg-white py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-900">
                Visão Estratégica para a Gestão
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                A Vivencie PEI oferece uma gestão completa de acompanhamento,
                permitindo que gestores identifem de forma fácil quem está ou
                não elaborando os PEIs. Além disso, centraliza toda a
                documentação do AEE, incluindo anamneses e relatórios, em um
                único lugar, otimizando o fluxo de trabalho e garantindo que
                nada se perca.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 sm:gap-12">
              {/* Funcionalidade 1: Acompanhamento de PEIs */}
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/gestao.png"
                    alt="Ícone de Gestão"
                    className="w-20 h-20"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  Gestão e Acompanhamento
                </h3>
                <p className="text-sm text-gray-600">
                  A plataforma oferece uma visão clara e completa, permitindo
                  que gestores identifiquem de forma rápida e eficiente quem
                  está ou não fazendo os PEIs, otimizando o fluxo de trabalho e
                  garantindo que nenhum aluno seja esquecido.
                </p>
              </div>

              {/* Funcionalidade 2: Centralização de Documentos */}
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/arquivo.png"
                    alt="Ícone de Documentação"
                    className="w-20 h-20"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  Documentação Centralizada
                </h3>
                <p className="text-sm text-gray-600">
                  Facilita a documentação do Atendimento Educacional
                  Especializado (AEE), concentrando anamneses, relatórios,
                  laudos e demais documentos importantes em um único lugar,
                  tornando o acesso e a consulta mais ágeis e organizados.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* Nova Seção: Inteligência Artificial (IA) */}
        <section className="bg-blue-50 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-900">
                Com a IA, não apenas fica mais fácil, fica melhor.
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                Com a IA Gemini integrada, a Vivencie PEI auxilia professores a
                otimizar seu tempo e a personalizar a jornada de aprendizado de
                cada aluno, tornando o processo mais eficiente e focado.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 sm:gap-12">
              {/* Funcionalidade 1: Criação de PEIs com IA */}
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/ia-pei.png" // Certifique-se de ter essa imagem no seu projeto
                    alt="Ícone de IA criando PEI"
                    className="w-20 h-20"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  Criação de PEIs com IA
                </h3>
                <p className="text-sm text-gray-600">
                  O Gemini otimiza a criação do Plano Educacional
                  Individualizado (PEI) ao sugerir estratégias e atividades
                  adaptadas às habilidades do aluno, com base em sua avaliação
                  inicial. Isso torna o processo mais rápido e eficiente,
                  permitindo que o professor personalize e refine as sugestões
                  para garantir um plano perfeitamente alinhado às necessidades
                  do estudante.
                </p>
              </div>

              {/* Funcionalidade 2: Aulas Dinâmicas e Personalizadas */}
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/ia-aula.png" // Certifique-se de ter essa imagem no seu projeto
                    alt="Ícone de IA criando aulas"
                    className="w-20 h-20"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  Aulas Dinâmicas e Personalizadas
                </h3>
                <p className="text-sm text-gray-600">
                  A IA agiliza a criação de aulas e atividades, usando a
                  Avaliação Inicial do aluno para gerar propostas
                  personalizadas. Isso otimiza o tempo do professor, que pode
                  adaptar facilmente as sugestões para a sala de aula,
                  garantindo um aprendizado mais eficaz.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* Nova Seção: Acompanhamento de PEIs para a Equipe e Gestores */}
        <section className="bg-white py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-900">
                Colaboração e Acompanhamento: Uma Visão Unificada.
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                Nossas ferramentas de acompanhamento e gestão facilitam a
                colaboração entre todos os envolvidos, garantindo alinhamento
                contínuo com o desenvolvimento individual de cada aluno.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 sm:gap-12">
              {/* Funcionalidade 1: Acompanhamento da Equipe */}
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/acompanhamento-equipe.png" // Certifique-se de ter essa imagem no seu projeto
                    alt="Ícone de Acompanhamento da Equipe"
                    className="w-20 h-20"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  Página de Acompanhamento do AEE
                </h3>
                <p className="text-sm text-gray-600">
                  A elaboração do Plano de Atendimento Educacional Especializado
                  (AEE) tornou-se mais eficiente e estratégica com o apoio da
                  inteligência artificial Gemini. A ferramenta permite a geração
                  de sugestões de atividades personalizadas, de forma ágil e
                  precisa, garantindo um planejamento pedagógico mais alinhado
                  às habilidades e necessidades específicas de cada aluno.
                </p>
              </div>

              {/* Funcionalidade 2: Acompanhamento da Gestão */}
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/acompanhamento-gestao.png" // Certifique-se de ter essa imagem no seu projeto
                    alt="Ícone de Acompanhamento da Gestão"
                    className="w-20 h-20"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  Página de Acompanhamento da Gestão
                </h3>
                <p className="text-sm text-gray-600">
                  Através da página de Acompanhamento da Gestão, os gestores têm
                  uma visão centralizada do Planejamento Individual do
                  atendimento do AEE, podendo analisar cada atendimento
                  realizado, acompanhar as habilidades desenvolvidas e registrar
                  feedbacks diretamente para o profissional do Atendimento
                  Educacional Especializado. Essa funcionalidade facilita a
                  identificação de gargalos, promove uma comunicação mais
                  eficiente e fortalece a atuação estratégica da gestão escolar.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* Seção Quem Somos */}
        <section className="bg-blue-50 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-900">
                Quem Somos
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                Idealizada e desenvolvida por uma equipe apaixonada pela
                educação, a Vivencie PEI tem como missão simplificar o caminho
                para um ensino verdadeiramente inclusivo e eficaz.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Membro 1: Michelle Pollheim */}
              <div className="bg-white p-6 rounded-2xl shadow-md space-y-4 text-center border border-blue-100">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/michelle-pollheim.png"
                    alt="Foto de Michelle Pollheim"
                    className="h-36 w-36 rounded-full object-cover"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  Michelle Pollheim
                </h3>
                <p className="text-sm text-blue-600 font-bold">
                  Criadora e Orientadora Pedagógica
                </p>
                <p className="text-sm text-gray-700">
                  Com ampla vivência nas necessidades práticas das escolas,
                  Michelle assegura que a plataforma seja desenvolvida com
                  equilíbrio entre sensibilidade e eficácia. É pedagoga e possui
                  pós-graduação em Gestão Escolar.
                </p>
              </div>
              {/* Membro 2: Shirlei Manske */}
              <div className="bg-white p-6 rounded-2xl shadow-md space-y-4 text-center border border-blue-100">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/shirlei-manske.png"
                    alt="Foto de Shirlei Manske"
                    className="h-36 w-36 rounded-full object-cover"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  Shirlei Manske
                </h3>
                <p className="text-sm text-blue-600 font-bold">
                  Especialista em AEE
                </p>
                <p className="text-sm text-gray-700">
                  Com sua experiência no Atendimento Educacional Especializado,
                  Shirlei trouxe a visão prática de quem está na linha de
                  frente, assegurando que a plataforma atenda de forma real às
                  demandas na elaboração do PEI.
                </p>
              </div>
              {/* Membro 3: Késsia Janara Mafra da Silva */}
              <div className="bg-white p-6 rounded-2xl shadow-md space-y-4 text-center border border-blue-100">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/kessia-mafra.png"
                    alt="Foto de Késsia Janara Mafra da Silva"
                    className="h-36 w-36 rounded-full object-cover"
                  />
                </div>
                <h3 className="font-extrabold text-xl text-blue-900">
                  Késsia Janara Mafra da Silva
                </h3>
                <p className="text-sm text-blue-600 font-bold">
                  Suporte em Avaliações e Educação Especial
                </p>
                <p className="text-sm text-gray-700">
                  Késsia foi fundamental no suporte às avaliações e em tudo que
                  envolve a Educação Especial, assegurando que a plataforma
                  atendesse às especificidades dessa área.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Seção Agendar Demonstração */}
        <section className="bg-white py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <img
              src="/images/calendario.png"
              alt="Ícone de Calendário"
              className="w-20 h-20 mx-auto mb-4"
            />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-900">
              Agende uma Demonstração
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Deseja transformar a forma como sua escola gerencia o PEI? Agende
              uma conversa com nossa equipe e experimente a Vivencie PEI em
              ação.
            </p>
            <div className="mt-8 flex justify-center">
              <a
                href="mailto:contato@vivenciepei.com.br?subject=Agendar%20Demonstração"
                className="inline-block px-8 py-3 font-semibold text-white bg-blue-600 rounded-full shadow-lg transition-transform transform hover:scale-105 hover:bg-blue-700"
              >
                Agendar Agora
              </a>
            </div>
          </div>
        </section>

        {/* Seção de Contato */}
        <section className="bg-blue-900 text-white py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Entre em Contato
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-blue-200">
              Gostaria de mais informações ou tem alguma dúvida sobre a Vivencie
              PEI? Entre em contato com a nossa equipe.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 mt-8">
              {/* Email */}
              <div className="flex items-center space-x-2">
                <img
                  src="/images/email.png"
                  alt="Ícone de Email"
                  className="w-6 h-6"
                />
                <a
                  href="mailto:contato@vivenciepei.com.br"
                  className="text-lg text-blue-100 hover:underline"
                >
                  contato@vivenciepei.com.br
                </a>
              </div>

              {/* WhatsApp */}
              <div className="flex items-center space-x-2">
                <img
                  src="/images/whatsapp.png"
                  alt="Ícone do WhatsApp"
                  className="w-6 h-6"
                />
                <a
                  href="https://wa.me/5547989192375?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20a%20Vivencie%20PEI."
                  className="text-lg text-blue-100 hover:underline"
                >
                  WhatsApp
                </a>
              </div>

              {/* Telefone */}
              <div className="flex items-center space-x-2">
                <img
                  src="/images/telefone.png"
                  alt="Ícone de Telefone"
                  className="w-7 h-7"
                />
                <a
                  href="tel:+5547989192375"
                  className="text-lg text-blue-100 hover:underline"
                >
                  (47) 98919-2375
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-blue-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-blue-300">
            &copy; 2025 Vivencie PEI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
