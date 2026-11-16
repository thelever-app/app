import type { SiteTexts } from './site-texts.ts';

const UPDATED = '16 de novembro de 2026';

export const pt: SiteTexts = {
  languageName: 'Português',
  languageMenu: 'Idioma',
  languageMenuNote:
    'Leva-te a esta mesma página no idioma que escolheres. Se abrires a app a partir daqui, ela abre nesse idioma.',
  homeLink: 'Início',
  someoneInYourGroup: 'alguém do teu grupo',
  categories: {
    'life-and-death': {
      name: 'Vida e morte',
      description:
        'Dilemas em que há vidas em jogo: o elétrico, o bote salva-vidas e outras decisões sem uma saída boa.',
    },
    honesty: {
      name: 'Honestidade',
      description:
        'Quando dizer a verdade, quando calar e o que estarias disposto a esconder, a quem e porquê.',
    },
    loyalty: {
      name: 'Lealdade',
      description:
        'Amigos, família e colegas: até onde vai o que lhes deves quando chocam com o que achas justo.',
    },
    justice: {
      name: 'Justiça',
      description:
        'Castigos, prémios e regras: o que é justo quando a lei, a intenção e o resultado não coincidem.',
    },
    'love-and-relationships': {
      name: 'Amor e relações',
      description:
        'Casal, ciúmes, segredos e ruturas: dilemas sobre o que farias por alguém de quem gostas.',
    },
    'work-and-money': {
      name: 'Trabalho e dinheiro',
      description:
        'Promoções, salários, favores e atalhos: o que farias quando o dinheiro ou a tua carreira estão em jogo.',
    },
    'technology-and-the-future': {
      name: 'Tecnologia e futuro',
      description:
        'Inteligência artificial, privacidade, robôs e genética: dilemas que há pouco eram ficção científica.',
    },
  },
  home: {
    title: 'TheLever: dilemas morais para jogar com o teu grupo',
    description:
      'Dilemas morais para jogar com a tua malta: cada um vota em segredo, prevê o que os outros vão votar e depois descobrem juntos quem pensa o quê.',
    heading: 'Dilemas morais para jogar com a tua malta',
    intro:
      'Cada um vota em segredo no telemóvel, prevê o que os outros vão votar e depois descobrem juntos quem pensa o quê. Grátis, sem instalar nada.',
    play: 'Jogar agora',
    scene: 'La Palanca, a acenar junto a uma agulha da linha',
    howToPlay: 'Como se joga',
    steps: [
      'Cria uma sala e partilha o link ou o código.',
      'Em cada ronda, todos votam o mesmo dilema em segredo e preveem os outros.',
      'O resultado é revelado e vocês comentam-no. No fim, os títulos da partida.',
    ],
    categories: 'Categorias',
  },
  category: {
    heading: (name) => `Dilemas morais: ${name.toLowerCase()}`,
    description: (name) =>
      `Dilemas morais sobre ${name.toLowerCase()} para jogar com o teu grupo no TheLever.`,
    options: (count) => `${count} opções`,
    withArguments: 'argumentos de cada uma',
  },
  dilemma: {
    vote: 'Votar e ver o que fez o mundo',
    play: 'Jogá-lo com o meu grupo',
    worldResultLater:
      'O resultado mundial vê-se depois de votar, para não influenciar a tua resposta.',
    arguments: 'Argumentos de cada opção',
    for: 'A favor:',
    against: 'Contra:',
    byTheTeam: 'Texto da equipa do TheLever.',
    moreOf: (name) => `Mais dilemas: ${name.toLowerCase()}`,
  },
  gone: {
    title: 'Este dilema já não está no TheLever',
    heading: 'Este dilema já não está no TheLever',
    body: 'Retirámo-lo do catálogo. Se alguém te enviou este link, há muitos outros à tua espera.',
    moreOf: (name) => `Ver dilemas: ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'Esta página não existe',
    heading: 'Esta página não existe',
    body: 'Talvez o endereço esteja mal escrito. A partir do início chegas a todos os dilemas.',
  },
  footer: { label: 'Informação legal' },
  privacy: {
    title: 'Privacidade',
    description:
      'Que dados trata o site público do TheLever, para quê e quais são os teus direitos.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Quem é o responsável',
        paragraphs: [
          'O TheLever é um projeto de {owner}. Para qualquer assunto sobre os teus dados, escreve para privacidad@thelever.app. Respondemos em espanhol e em inglês.',
        ],
      },
      {
        heading: 'Que dados tratamos neste site',
        paragraphs: [
          'Este site só mostra dilemas: não tem contas, formulários nem cookies próprios, e não te pede nenhum dado.',
          'Para te enviar cada página, o nosso fornecedor de alojamento, a Google Cloud (Firebase Hosting e Cloud Run), recebe o que o teu navegador envia em qualquer visita: o teu endereço IP, o teu navegador e a página que pedes. Usa-o só para te entregar a página e protegê-la de abusos, pelo nosso interesse legítimo num serviço seguro (art. 6.º, n.º 1, al. f), do RGPD). O TheLever não guarda o teu endereço IP nos seus registos.',
        ],
      },
      {
        heading: 'A app',
        paragraphs: [
          'Se escolheres votar um dilema ou jogá-lo com o teu grupo, passas para a app do TheLever, que antes de jogar te explica como trata os teus dados e te pede o teu consentimento.',
        ],
      },
      {
        heading: 'Anúncios e cookies',
        paragraphs: [
          'Por agora, este site não mostra anúncios nem usa cookies. Quando os mostrar, serão anúncios do Google AdSense: a Google e os seus parceiros só usarão cookies para os mostrar ou personalizar se o aceitares no gestor de cookies, que aparecerá antes de qualquer anúncio; se não aceitares, só verás anúncios limitados, sem cookies. Nenhum anúncio receberá o que votas na app.',
          'A Google é responsável por conta própria pelo que faz com esses cookies. Sabe mais em policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Com quem partilhamos os teus dados',
        paragraphs: [
          'Não vendemos os teus dados. A Google Cloud trata-os por nossa conta, com contrato, só para alojar o site. Também podemos ter de os dar às autoridades quando a lei o exigir.',
        ],
      },
      {
        heading: 'Transferências para fora do Espaço Económico Europeu',
        paragraphs: [
          'A Google pode tratar dados fora do Espaço Económico Europeu, ao abrigo do Quadro de Privacidade de Dados UE-EUA e das cláusulas contratuais-tipo da Comissão Europeia.',
        ],
      },
      {
        heading: 'Durante quanto tempo os guardamos',
        paragraphs: [
          'O TheLever não guarda nada da tua visita. A Google conserva os seus registos técnicos o tempo de que precisa para a segurança do serviço.',
        ],
      },
      {
        heading: 'Os teus direitos',
        paragraphs: [
          'Podes pedir acesso aos teus dados, retificá-los, apagá-los, limitar o seu uso, levá-los contigo ou opor-te ao seu tratamento escrevendo para privacidad@thelever.app. Respondemos no prazo máximo de um mês.',
          'Se achares que não tratámos bem os teus dados, podes reclamar junto da Agência Espanhola de Proteção de Dados (aepd.es) ou da autoridade do teu país.',
        ],
      },
      {
        heading: 'Alterações a esta política',
        paragraphs: [
          'Se a alterarmos de forma importante, diremos nesta página antes de te afetar.',
        ],
      },
    ],
  },
  legalNotice: {
    title: 'Aviso legal',
    description: 'Quem está por trás do TheLever e as condições deste site.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Titular',
        paragraphs: [
          '- Titular: {owner}.',
          '- NIF: {taxId}.',
          '- Domicílio: {address}, Espanha.',
          '- Email: privacidad@thelever.app.',
          '- Site e app: thelever.app.',
          '- Atividade: jogo online gratuito financiado por publicidade.',
        ],
      },
      {
        heading: 'Privacidade',
        paragraphs: [
          'Como tratamos os dados neste site está na política de privacidade. A app explica a sua antes de jogar, e o seu uso rege-se pelas suas condições de utilização, que se aceitam ao entrar.',
        ],
      },
      {
        heading: 'Propriedade intelectual',
        paragraphs: [
          'A marca TheLever, o seu design e os dilemas e argumentos da nossa equipa pertencem ao seu titular, salvo indicação de outra licença. O código da app e deste site é software livre com licença AGPL-3.0.',
        ],
      },
      {
        heading: 'Links e anúncios',
        paragraphs: [
          'Não controlamos os anúncios nem os sites para onde ligam. Se algum for ilícito ou inadequado, avisa-nos e retirá-lo-emos logo que soubermos.',
        ],
      },
      {
        heading: 'Conteúdo ilegal',
        paragraphs: [
          'Podes denunciar conteúdo ilegal escrevendo para privacidad@thelever.app. É também o ponto de contacto para autoridades e utilizadores ao abrigo do Regulamento dos Serviços Digitais (arts. 11.º e 12.º), em espanhol e em inglês.',
        ],
      },
      {
        heading: 'Lei aplicável',
        paragraphs: [
          'Lei espanhola. Se fores consumidor, manténs os direitos que te dão as normas do teu país.',
        ],
      },
    ],
  },
};
