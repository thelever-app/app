import { appPrivacy, terms } from './legal/pt.ts';
import type { SiteTexts } from './site-texts.ts';

const UPDATED = '17 de novembro de 2026';

export const pt: SiteTexts = {
  languageName: 'Português',
  languageMenu: 'Idioma',
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
      { title: 'Cria a sala', text: 'Partilha o link ou o código e deixa entrar a tua gente.' },
      {
        title: 'Vota e prevê',
        text: 'Em cada ronda, todos votam o mesmo dilema em segredo e preveem os outros.',
      },
      {
        title: 'Descubram quem pensa o quê',
        text: 'O resultado é revelado e vocês comentam-no. No fim, os títulos da partida.',
      },
    ],
    screens: {
      roomCode: 'Código da sala',
      share: 'Partilhar link',
      round: 'Dilema 2 de 6',
      dilemma: 'Mentirias para salvar o emprego de um amigo?',
      yes: 'Sim, mentiria',
      no: 'Não, diria a verdade',
      private: 'Ninguém do grupo verá o teu voto',
      result: '3 de 5 disseram sim',
      yesCount: 'Sim · 3',
      noCount: 'Não · 2',
      right: 'Acertaste com a Ana e o Luis',
    },
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
    ad: 'Publicidade',
    moreOf: (name) => `Mais dilemas: ${name.toLowerCase()}`,
  },
  gone: {
    title: 'Este dilema já não está no TheLever',
    heading: 'Este dilema já não está no TheLever',
    body: 'Retirámo-lo do catálogo.',
    moreOf: (name) => `Ver dilemas: ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'Esta página não existe',
    heading: 'Esta página não existe',
    body: 'Talvez o endereço esteja mal escrito. A partir do início chegas a todos os dilemas.',
  },
  footer: { label: 'Informação legal', manageCookies: 'Gerir cookies' },
  support: {
    link: 'Apoia o TheLever',
    heading: 'O TheLever é grátis',
    text: 'É mantido por uma só pessoa. Se gostares, podes apoiá-lo com um donativo; não dá nenhuma vantagem no jogo.',
    line: 'Fez-te pensar? O TheLever é grátis e é mantido por uma só pessoa. Fazer um donativo não dá nenhuma vantagem no jogo.',
  },
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
          'As páginas dos dilemas mostram anúncios do Google AdSense. Antes de usar cookies, o gestor de cookies da Google pergunta-te o que aceitas, e a Google só os usa com o teu consentimento (art. 6.º, n.º 1, al. a), do RGPD e art. 22.º, n.º 2, da LSSI). Se não aceitares, só vês anúncios limitados, sem cookies.',
          'Os anúncios só são personalizados se o aceitares: neste site, que não pergunta a tua idade, depende apenas disso. Se o teu navegador enviar o sinal Global Privacy Control, os anúncios não são personalizados mesmo que o aceites. O TheLever não dá à Google nem aos seus parceiros o que votas na app.',
          'Ao carregar os anúncios, mesmo que não aceites nada, a Google recebe o teu endereço IP, os dados do teu navegador e a página que visitas. Permitimo-lo com base no nosso interesse legítimo em financiar com publicidade um jogo gratuito (art. 6.º, n.º 1, al. f), do RGPD), e por essa recolha respondemos juntamente com a Google. O que a Google e os seus parceiros fazem depois com esses dados e com os seus cookies é da responsabilidade deles, conforme o que aceitares e os termos de proteção de dados da Google Ads (business.safety.google/adscontrollerterms). Que cookies são e como alterar o que aceitas está na política de cookies; a Google explica-o em policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Com quem partilhamos os teus dados',
        paragraphs: [
          'Não vendemos os teus dados. A Google Cloud trata-os por nossa conta, com contrato, só para alojar o site. O Google AdSense e os seus parceiros recebem-nos como responsáveis por conta própria, como explica a secção sobre anúncios. Também podemos ter de os dar às autoridades quando a lei o exigir.',
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
          'O TheLever não guarda nada da tua visita. A Google conserva os seus registos técnicos o tempo de que precisa para a segurança do serviço, e cada cookie dura o tempo indicado na política de cookies.',
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
  cookies: {
    title: 'Cookies',
    description:
      'Que cookies são usados no site público do TheLever, para quê e como alterar o que aceitas.',
    updated: UPDATED,
    sections: [
      {
        heading: 'O que são',
        paragraphs: [
          'Os cookies são pequenos ficheiros que um site guarda no teu navegador e volta a ler depois. Esta política chama também «cookies» às tecnologias semelhantes, como o armazenamento local do navegador.',
        ],
      },
      {
        heading: 'Os que este site usa',
        paragraphs: [
          'O TheLever não coloca cookies próprios em nenhuma página deste site. Colocam-nos o Google AdSense, que mostra os anúncios, e o gestor de cookies da Google, que te pergunta o que aceitas. Todos são da Google, como terceiro, e só são carregados nas páginas dos dilemas: o início, as categorias e as páginas legais não têm anúncios nem cookies.',
        ],
      },
      {
        heading: 'Os que não precisam do teu consentimento',
        paragraphs: [
          'Só os que guardam a tua escolha, para a respeitar sem ta voltar a perguntar em cada página: o que respondes no gestor de cookies (FCCDCF) e, se não aceitares anúncios com cookies, que não os aceitas (__gpi_optout).',
        ],
      },
      {
        heading: 'Os que precisam do teu consentimento',
        paragraphs: [
          'Todos os outros, e a Google só os usa se o aceitares no gestor de cookies:',
          '- Para mostrar e medir os anúncios: guardar e ler informações no teu dispositivo, limitar quantas vezes vês um anúncio, medir como funciona e prevenir a fraude. Se não o aceitares, só vês anúncios limitados, sem cookies.',
          '- Para personalizar os anúncios de acordo com os teus interesses. Neste site, que não pergunta a tua idade, depende apenas de o aceitares. Se o teu navegador enviar o sinal Global Privacy Control, os anúncios não são personalizados mesmo que o aceites. Nunca são escolhidos a partir do que votas na app.',
          'A Google também pode guardar informações semelhantes no armazenamento local do navegador, para os mesmos fins e com o mesmo consentimento.',
        ],
      },
      {
        heading: 'Tabela de cookies',
        paragraphs: [
          'Os nomes, as finalidades e as durações são os que a Google publica em business.safety.google/adscookies, onde está a sua lista completa.',
        ],
        table: {
          headers: ['Cookie', 'De quem', 'Para quê', 'Duração'],
          rows: [
            [
              'FCCDCF',
              'Gestor de cookies da Google',
              'Guardar o que respondes no gestor',
              '13 meses',
            ],
            ['FCNEC', 'Gestor de cookies da Google', 'Estatísticas do gestor', '365 dias'],
            ['__gads', 'Google AdSense', 'Anúncios e segurança', '13 meses'],
            ['__gpi', 'Google AdSense', 'Anúncios e segurança', '13 meses'],
            [
              '__gpi_optout',
              'Google AdSense',
              'Lembrar que não aceitas anúncios com cookies',
              '13 meses',
            ],
            ['__eoi', 'Google AdSense', 'Segurança', '6 meses'],
            [
              'TESTCOOKIESENABLED',
              'Google AdSense',
              'Verificar se o teu navegador aceita cookies',
              '60 segundos',
            ],
            ['IDE', 'Google (doubleclick.net)', 'Anúncios e segurança', '13 meses'],
            ['id', 'Google (doubleclick.net)', 'Anúncios, segurança e funcionamento', '13 meses'],
            [
              'DSID',
              'Google (doubleclick.net)',
              'Anúncios, segurança e funcionamento',
              '2 semanas',
            ],
            [
              'test_cookie',
              'Google (doubleclick.net)',
              'Verificar se o teu navegador aceita cookies',
              '15 minutos',
            ],
          ],
        },
      },
      {
        heading: 'Como alterar o que aceitas',
        paragraphs: [
          'Em qualquer página de um dilema, com «Gerir cookies» no rodapé: volta a abrir o gestor de cookies da Google, onde podes retirar ou alterar o teu consentimento tão facilmente como o deste.',
          'Também podes apagar ou bloquear os cookies nas definições do teu navegador.',
        ],
      },
      {
        heading: 'Terceiros e transferências',
        paragraphs: [
          'A Google e os parceiros publicitários que aceitares usam os seus cookies como responsáveis por conta própria. O gestor de cookies segue o Transparency and Consent Framework da IAB Europe e mostra-te quem são esses parceiros e para que usa cada um os teus dados.',
          'A Google pode tratar dados fora do Espaço Económico Europeu, ao abrigo do Quadro de Privacidade de Dados UE-EUA e das cláusulas contratuais-tipo da Comissão Europeia. Explica-o em policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Mais informações',
        paragraphs: [
          'Como tratamos os teus dados está na política de privacidade. Para qualquer dúvida, escreve para privacidad@thelever.app.',
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
          'Como tratamos os dados neste site está na política de privacidade, e que cookies usa, na política de cookies. A app explica a sua antes de jogar, e o seu uso rege-se pelas suas condições de utilização, que se aceitam ao entrar.',
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
  terms,
  appPrivacy,
};
