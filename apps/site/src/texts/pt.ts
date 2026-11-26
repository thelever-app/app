import { appCookies, appPrivacy, terms } from './legal/pt.ts';
import type { SiteTexts } from './site-texts.ts';

const UPDATED = '23 de novembro de 2026';
const GUIDES_UPDATED = '26 de novembro de 2026';

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
      about: [
        'São os dilemas mais antigos da filosofia moral. Um elétrico sem travões, um bote salva-vidas com poucos lugares, um médico com cinco doentes à espera de um órgão. Obrigam a escolher entre vidas e não deixam nenhuma saída limpa.',
        'Quase todos põem frente a frente duas formas de pensar. Uma olha para o resultado e procura salvar o maior número possível de pessoas. A outra olha para o que fazes com as tuas próprias mãos e defende que há coisas que não se fazem a ninguém, mesmo que as contas finais compensem.',
        'Jogados em grupo, mostram algo que um teste individual não mostra. Quem puxa a alavanca sem hesitar descobre que o seu melhor amigo ou a sua melhor amiga nunca o faria, e a conversa que se segue costuma durar mais do que a partida.',
      ],
    },
    honesty: {
      name: 'Honestidade',
      description:
        'Quando dizer a verdade, quando calar e o que estarias disposto a esconder, a quem e porquê.',
      about: [
        'Mentir está mal, mas quase ninguém diz sempre a verdade. Estes dilemas exploram esse terreno intermédio, o da mentira piedosa, do silêncio que protege alguém e da verdade que magoa sem necessidade.',
        'Por trás de cada um há uma pergunta de fundo. Importa mais o que a outra pessoa sabe ou como se sente? Há quem ache que a verdade é um dever que não admite exceções e quem a veja como uma ferramenta que se usa com cuidado.',
        'São ideais para descobrir em que ponto exato cada pessoa do teu grupo de amigos traça a linha, e para perceberes que essa linha muda consoante a pessoa a quem é preciso mentir.',
      ],
    },
    loyalty: {
      name: 'Lealdade',
      description:
        'Amigos, família e colegas: até onde vai o que lhes deves quando chocam com o que achas justo.',
      about: [
        'A lealdade é o que nos une à família, aos amigos e à equipa. O problema surge quando o que deves a alguém choca com o que achas justo, com o que deves a alguém que não conheces ou com o que deves a ti.',
        'Encobririas um amigo que fez algo grave? Denunciarias o teu irmão? Estes dilemas põem à prova até onde vão esses laços e o que serias capaz de sacrificar por eles.',
        'Num grupo de amigos, têm um efeito curioso. Votas em privado o que farias por eles e depois vês, com eles à tua frente, o que fariam eles por ti.',
      ],
    },
    justice: {
      name: 'Justiça',
      description:
        'Castigos, prémios e regras: o que é justo quando a lei, a intenção e o resultado não coincidem.',
      about: [
        'A justiça parece simples até a lei, a intenção e o resultado deixarem de coincidir. Alguém rouba para dar de comer à família, uma regra justa produz um castigo absurdo, quem tem culpa escapa por uma tecnicalidade.',
        'Estes dilemas confrontam ideias diferentes do que é justo. Para uns, cumprir as regras por igual; para outros, dar a cada um o que merece; e para outros ainda, reparar o dano antes de castigar quem o causou.',
        'São os que geram mais debate na revelação, porque quase toda a gente acha que sabe bem o que é justo até ouvir a razão de quem votou o contrário.',
      ],
    },
    'love-and-relationships': {
      name: 'Amor e relações',
      description:
        'Casal, ciúmes, segredos e ruturas: dilemas sobre o que farias por alguém de quem gostas.',
      about: [
        'Casal, ciúmes, segredos, ruturas e amizades que se complicam. São dilemas pequenos comparados com um elétrico sem travões, mas são os que realmente encontramos na vida.',
        'Põem frente a frente a sinceridade e o cuidado, a liberdade de cada pessoa e o compromisso com a outra, e o que sentes e o que achas que devias sentir.',
        'Jogá-los com a tua malta tem algo de arriscado, e é aí que está a graça. Votas em privado, mas todos tentam adivinhar o que cada um escolheu.',
      ],
    },
    'work-and-money': {
      name: 'Trabalho e dinheiro',
      description:
        'Promoções, salários, favores e atalhos: o que farias quando o dinheiro ou a tua carreira estão em jogo.',
      about: [
        'Promoções, salários, favores, erros da empresa a teu favor e colegas que se aproveitam. O dinheiro e a carreira põem à prova princípios que, em abstrato, parecem firmes.',
        'Alguns destes dilemas têm uma estrutura conhecida da teoria dos jogos. Se todos cooperarem, todos ganham, mas quem se aproveita ganha ainda mais. Confias nos outros ou proteges-te?',
        'Servem para descobrir quem do grupo devolveria o dinheiro a mais, quem negociaria sem piedade e quem sairia de uma empresa por uma questão de princípio.',
      ],
    },
    'technology-and-the-future': {
      name: 'Tecnologia e futuro',
      description:
        'Inteligência artificial, privacidade, robôs e genética: dilemas que há pouco eram ficção científica.',
      about: [
        'Inteligência artificial, privacidade, carros autónomos, edição genética e vidas cada vez mais longas. Até há pouco eram ficção científica e hoje são decisões que alguém está a tomar.',
        'Estes dilemas fazem perguntas novas com ferramentas velhas. Deve um carro autónomo proteger quem vai lá dentro ou os peões? Contarias os teus segredos a uma máquina que te entende melhor do que ninguém?',
        'Muitos ainda não têm uma resposta aceite pela maioria, por isso o resultado do teu grupo pode ser tão interessante como o de qualquer sondagem.',
      ],
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
  },
  dilemma: {
    vote: 'Votar e ver o que fez o mundo',
    play: 'Jogá-lo com o meu grupo',
    worldResultLater:
      'O resultado mundial vê-se depois de votar, para não influenciar a tua resposta.',
    atStake: 'O que está em jogo',
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
  guidesHeading: 'Para saber mais',
  guides: {
    trolleyProblem: {
      title: 'O que é o dilema do elétrico',
      description:
        'O dilema do elétrico, de onde vem, as suas variantes mais conhecidas e o que a filosofia e a psicologia aprenderam com ele.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'O dilema',
          paragraphs: [
            'Um elétrico sem travões avança em direção a cinco pessoas atadas à linha. Estás junto a uma alavanca que o desvia para outra linha, onde há uma só pessoa. Se não fizeres nada, morrem cinco. Se puxares a alavanca, morre uma. O que fazes?',
            'Posto assim, a maioria das pessoas diz que puxaria a alavanca. Salvar cinco à custa de uma parece o mais razoável. O interesse do dilema começa quando se mudam os pormenores e essas mesmas pessoas mudam de opinião.',
          ],
        },
        {
          heading: 'De onde vem',
          paragraphs: [
            'A filósofa britânica Philippa Foot apresentou-o em 1967 num artigo sobre a doutrina do duplo efeito. Na sua versão, quem decide é o guarda-freio do elétrico, que pode virar para uma linha ou para a outra. Foot usava-o para perguntar se há diferença moral entre causar um dano e permitir que aconteça.',
            'A filósofa norte-americana Judith Jarvis Thomson deu-lhe o nome pelo qual é conhecido, «the trolley problem», num artigo de 1976. Foi ela quem pôs a alavanca nas mãos de uma testemunha e quem propôs a variante mais famosa, a da ponte.',
          ],
        },
        {
          heading: 'A variante da ponte',
          paragraphs: [
            'Desta vez não há alavanca. Estás numa ponte sobre a linha, ao lado de uma pessoa muito corpulenta. Se a empurrares, o corpo dela vai travar o elétrico e salvar as cinco pessoas. Ela morrerá.',
            'Os números são os mesmos de antes, uma por cinco. No entanto, a maioria das pessoas diz que não empurraria. Explicar porque é que dois casos com o mesmo resultado nos parecem tão diferentes é, há décadas, um dos grandes problemas da ética.',
          ],
        },
        {
          heading: 'As duas grandes respostas',
          paragraphs: [
            '- O consequencialismo, e em especial o utilitarismo, julga uma ação pelos seus resultados. Se morrerem menos pessoas, a decisão é melhor, tanto com a alavanca como na ponte.',
            '- A ética do dever, cujo representante mais conhecido é Immanuel Kant, defende que há coisas que não se podem fazer a uma pessoa mesmo que o resultado seja melhor, como usá-la apenas como um meio. Desviar o elétrico pode ser aceitável, mas empurrar alguém para o travar não.',
            'A doutrina do duplo efeito, que remonta a Tomás de Aquino, oferece uma via intermédia. Na alavanca, a morte da pessoa da outra linha é um efeito previsto, mas não procurado. Na ponte, a morte da pessoa empurrada é o meio para salvar as outras.',
          ],
        },
        {
          heading: 'O que diz a psicologia',
          paragraphs: [
            'Em 2001, o psicólogo Joshua Greene e a sua equipa publicaram na revista Science um estudo com ressonância magnética. Os dilemas em que é preciso fazer mal a alguém com as próprias mãos, como o da ponte, ativavam mais as zonas do cérebro ligadas à emoção do que os dilemas impessoais, como o da alavanca.',
            'Em 2018, o projeto Moral Machine do MIT publicou na Nature os resultados de uma experiência online sobre carros autónomos, com milhões de decisões de pessoas de mais de duzentos países e territórios. Encontrou preferências partilhadas em quase todo o mundo, como salvar mais pessoas, e diferenças claras entre culturas noutras.',
          ],
        },
        {
          heading: 'Porque continua a importar',
          paragraphs: [
            'O dilema do elétrico é uma experiência mental. Ninguém espera encontrar uma alavanca junto a uma linha, mas as perguntas que levanta aparecem em decisões reais, como distribuir recursos escassos num hospital ou programar como um carro autónomo reage perante um acidente inevitável.',
            'No TheLever podes jogar versões do dilema do elétrico e centenas de outros dilemas com o teu grupo, votar em privado e descobrir depois quem pensa o quê. A categoria Vida e morte reúne os mais próximos do dilema original.',
          ],
        },
      ],
    },
    playingInAGroup: {
      title: 'Como jogar dilemas morais em grupo',
      description:
        'Como funciona uma partida do TheLever, quantas pessoas são precisas, que ambiente escolher e como tirar partido do debate.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'O que é preciso',
          paragraphs: [
            'Um telemóvel por pessoa e mais nada. O TheLever funciona no navegador, por isso não é preciso instalar nada nem criar conta. Basta que alguém crie a sala e partilhe o link ou o código.',
            'Podem jogar desde duas até cinquenta pessoas. Com quatro ou cinco, o debate é mais íntimo, e num grupo grande o resultado de cada ronda surpreende mais.',
          ],
        },
        {
          heading: 'Como é uma partida',
          paragraphs: [
            '- Quem cria a sala escolhe o ambiente e o número de rondas, de uma a doze. Por defeito, são oito.',
            '- Em cada ronda aparece o mesmo dilema em todos os telemóveis. Cada pessoa vota em privado.',
            '- Além de votar, cada pessoa prevê o que votou o resto do grupo.',
            '- Quando todos tiverem votado, chega a revelação. Vê-se o que o grupo escolheu e quem acertou nas previsões, e começa o debate.',
            '- No fim da partida, cada pessoa recebe um título consoante a forma como votou e como previu os outros.',
          ],
        },
        {
          heading: 'Que ambiente escolher',
          paragraphs: [
            '- Clássica, com dilemas para qualquer grupo. É a melhor opção para começar ou para jogar com pessoas que não conheces bem.',
            '- Picante, que acrescenta temas para adultos. Só para maiores de 18 anos.',
            '- Sem filtro, que junta perguntas comprometedoras. Nesta sala ninguém vê o que cada pessoa vota.',
          ],
        },
        {
          heading: 'Como tirar partido do debate',
          paragraphs: [
            'O melhor do jogo não é o voto, mas o que vem depois. Quando o grupo se divide, pede a uma pessoa de cada lado que explique a sua razão numa frase. Quase sempre aparece um pormenor do dilema em que o outro lado não tinha reparado.',
            'Não há respostas certas. Cada dilema tem na sua página os melhores argumentos a favor e contra cada opção, caso o debate encalhe ou queiram saber o que diz a filosofia.',
            'As previsões acrescentam uma segunda camada. Acertar no que vai votar o teu melhor amigo ou a tua melhor amiga é mais difícil do que parece, e falhar costuma dar origem à melhor conversa da noite.',
          ],
        },
        {
          heading: 'Para quem é',
          paragraphs: [
            'O TheLever é para maiores de 16 anos. Funciona num jantar com amigos, numa aula de filosofia ou de ética, numa atividade de equipa ou numa videochamada com pessoas que vivem longe.',
          ],
        },
      ],
    },
    about: {
      title: 'Quem faz o TheLever',
      description:
        'Quem está por trás do TheLever, como se escrevem os seus dilemas, como se financia e como nos podes escrever.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Uma só pessoa',
          paragraphs: [
            'O TheLever é feito por uma só pessoa, que o desenha, o programa e seleciona os seus dilemas. É um projeto independente, sem investidores nem empresa por trás.',
            'Nasceu de uma ideia simples. Os dilemas morais são muito mais interessantes quando os discutes com a tua malta do que quando lhes respondes a sós num teste.',
          ],
        },
        {
          heading: 'Como se fazem os dilemas',
          paragraphs: [
            'Cada dilema do catálogo é revisto à mão antes de ser publicado. Alguns são versões de clássicos da filosofia, como o elétrico ou o anel de Giges; a maioria são situações do dia a dia escritas para o TheLever.',
            'Os argumentos a favor e contra cada opção são redigidos com a ajuda de inteligência artificial e revistos um a um em espanhol. As traduções para os outros idiomas são feitas com inteligência artificial.',
            'Os argumentos nunca dizem qual é a opção certa. O objetivo é que percebas a melhor razão de cada posição, incluindo a da opção que não escolherias.',
          ],
        },
        {
          heading: 'Como se financia',
          paragraphs: [
            'O TheLever é grátis e vai continuar a sê-lo. Mantém-se com donativos voluntários e, mais tarde, também com publicidade. Fazer um donativo não dá nenhuma vantagem no jogo.',
          ],
        },
        {
          heading: 'Como nos escrever',
          paragraphs: [
            'Para qualquer dúvida sobre os teus dados, escreve para privacidad@thelever.app. Nas páginas de privacidade e de aviso legal, com ligação no rodapé de cada página, estão todos os dados do responsável.',
          ],
        },
      ],
    },
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
        heading: 'Donativos',
        paragraphs: [
          'Se nos apoiares com um donativo no Ko-fi (Ko-fi Labs Limited, Reino Unido), o Ko-fi dá-nos o teu nome ou nome de utilizador, o teu email, o montante e a mensagem que escreveres. Usamo-los para gerir e agradecer o teu donativo, com base no interesse legítimo (art. 6.1.f RGPD), e para cumprir as nossas obrigações fiscais (art. 6.1.c), e guardamo-los o tempo que a lei fiscal exige, em geral 4 anos. Nunca os ligamos a nada do que fazes na app. O Ko-fi e quem processa o pagamento (PayPal ou Stripe) tratam os teus dados por conta própria, segundo as suas políticas.',
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
  appCookies,
};
