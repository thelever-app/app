import type { OwnPage } from '../site-texts.ts';

const UPDATED = '23 de novembro de 2026';
const PRIVACY_UPDATED = '27 de novembro de 2026';

/** The terms of use of the app, version 1, which the first access asks to accept. */
export const terms: OwnPage = {
  title: 'Condições de utilização',
  description:
    'As condições para jogar o TheLever: quem pode jogar, como funciona e que regras há.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Quem presta o serviço',
      paragraphs: [
        'O TheLever é um serviço de {owner}. Os dados completos estão no aviso legal. Para qualquer coisa, escreve para privacidad@thelever.app: respondemos em espanhol e em inglês.',
      ],
    },
    {
      heading: 'O que é o TheLever',
      paragraphs: [
        'O TheLever é um jogo gratuito para jogar em grupo dilemas morais a partir do navegador. É pago com anúncios. Ao aceitares estas condições aceitas um acordo connosco; a forma como tratamos os teus dados é explicada na política de privacidade da app.',
      ],
    },
    {
      heading: 'Quem pode jogar',
      paragraphs: [
        'Tens de ter pelo menos 16 anos se estiveres no Espaço Económico Europeu e 18 se estiveres noutro sítio. Declarar uma idade falsa viola estas condições.',
        'O TheLever não está disponível em alguns países: os sujeitos a sanções da União Europeia que abrangem todo o país, a Rússia, a China, o Brasil e, por agora, o Reino Unido.',
        'Jogas sem conta, com um identificador anónimo do teu dispositivo. És responsável pelo que se fizer a partir dele.',
      ],
    },
    {
      heading: 'Como funciona o jogo',
      paragraphs: [
        'Em cada sala, o grupo responde aos mesmos dilemas ao mesmo tempo e descobre o resultado de cada um. Numa sala nominal, todos veem o que cada um votou; numa sala anónima, só quantos escolheram cada opção. O que respondes num jogo é apagado em menos de 24 horas desde que a sala fecha.',
        'Os dilemas podem tratar temas duros. Os dilemas +18 só se jogam em salas com dilemas +18, onde só podem entrar maiores de 18 anos. Os dilemas comprometedores, cuja resposta sincera te pode expor perante alguém da sala, só se jogam em salas anónimas e se quem a organiza os ativar.',
      ],
    },
    {
      heading: 'Regras',
      paragraphs: [
        'Ao usares o TheLever comprometes-te a não usar alcunhas com conteúdo ilegal, de ódio, de assédio, que humilhem alguém ou com dados de outras pessoas; a não tentar descobrir o que cada um votou numa sala anónima; e a não usar programas automáticos, sobrecarregar o serviço, contornar as restrições de idade ou de país, nem aceder a dados ou partes do sistema que não são para ti.',
      ],
    },
    {
      heading: 'Moderação e denúncias',
      paragraphs: [
        'Qualquer jogador pode denunciar um dilema ou uma alcunha a partir do jogo, e a nossa equipa revê a denúncia. Se violares estas condições, podemos substituir a tua alcunha por uma genérica ou impedir-te o acesso, e dizemos-te o motivo, os factos, a regra aplicada e como reclamar.',
        'Qualquer pessoa, jogue ou não, pode denunciar conteúdo ilegal escrevendo para privacidad@thelever.app, que é também o ponto de contacto para as autoridades.',
      ],
    },
    {
      heading: 'Anúncios',
      paragraphs: [
        'O TheLever mostra anúncios, nunca enquanto votas, e os anúncios nunca recebem nada do que votas. Só são personalizados para maiores de 18 anos que o aceitem no gestor de cookies e cujo navegador não envie o sinal Global Privacy Control. Não respondemos pelo conteúdo dos anúncios nem pelos sites para onde levam, mas podes avisar-nos de qualquer anúncio inadequado.',
      ],
    },
    {
      heading: 'O que é nosso',
      paragraphs: [
        'O nome e a marca TheLever, o seu design e os dilemas que a nossa equipa escreve são nossos, salvo indicação de outra licença. O código da app é aberto, com licença AGPL-3.0, em github.com/thelever-app. Os avatares são gerados com o DiceBear.',
      ],
    },
    {
      heading: 'Disponibilidade e responsabilidade',
      paragraphs: [
        'O TheLever é gratuito e oferece-se tal como é. Tentamos que funcione bem, mas pode ter falhas ou interrupções, e podemos mudar, pausar ou encerrar o serviço, avisando-te com antecedência razoável se for um encerramento.',
        'Não respondemos pelos danos que não se devam a dolo ou culpa grave nossos, na medida em que a lei o permita. Nada disto limita os direitos que a lei de defesa do consumidor te reconhece. És responsável pelas alcunhas que usares.',
      ],
    },
    {
      heading: 'Deixar de jogar',
      paragraphs: [
        'Podes deixar de usar o TheLever quando quiseres e apagar os teus dados em Definições → Privacidade e dados → Apagar os meus dados. Se violares estas condições de forma grave ou repetida, podemos impedir-te o acesso, com a fundamentação prevista na parte da moderação.',
      ],
    },
    {
      heading: 'Alterações a estas condições',
      paragraphs: [
        'Se as alterarmos de forma importante, dizemos-te na app e terás de as aceitar de novo antes de continuares a jogar. Se não as aceitares, podes pedir-nos que apaguemos os teus dados.',
      ],
    },
    {
      heading: 'Lei aplicável',
      paragraphs: [
        'Estas condições regem-se pela lei espanhola. Se fores consumidor, podes reclamar nos tribunais do teu domicílio e manténs a proteção das normas de consumo do teu país. Versão 1.',
      ],
    },
  ],
};

/** The privacy policy of the app, which the game consent links to. */
export const appPrivacy: OwnPage = {
  title: 'Privacidade da app',
  description:
    'Que dados a app do TheLever trata para jogar, com que base, durante quanto tempo e quais são os teus direitos.',
  updated: PRIVACY_UPDATED,
  sections: [
    {
      heading: 'Quem é o responsável',
      paragraphs: [
        'O TheLever é um projeto de {owner}. Para qualquer coisa sobre os teus dados, escreve para privacidad@thelever.app. Respondemos em espanhol e em inglês.',
      ],
    },
    {
      heading: 'O essencial',
      paragraphs: [
        'Jogar exige o teu consentimento explícito, porque o que votas em dilemas morais pode revelar as tuas convicções e, em alguns dilemas, algo da tua vida privada. O que respondes num jogo é apagado em menos de 24 horas desde que a sala fecha. Não usamos os teus dados para investigação nem os vendemos a ninguém, e os anúncios nunca recebem o que votas.',
      ],
    },
    {
      heading: 'Que dados tratamos, para quê e com que base',
      paragraphs: [
        '- Para jogar, com o teu consentimento explícito (art. 6.1.a e 9.2.a RGPD): a tua alcunha e o teu avatar; os teus votos, as tuas previsões do voto dos outros ou da distribuição do grupo, as tuas reações e os teus pontos; se um dilema era sobre ti; e a ordem em que viste as opções.',
        '- Para votar sozinho um dilema do site, com o mesmo consentimento: o teu voto soma ao resultado mundial sem que guardemos o que votaste.',
        '- Para não te repetirmos dilemas, com o mesmo consentimento: o teu telemóvel guarda a lista de dilemas que jogaste, sem os teus votos, e envia-a ao entrares numa sala, que só a usa para preparar os jogos e a apaga com a sala.',
        '- Para avaliar que dilemas agradam e para que ninguém conte duas vezes no resultado mundial, com base no interesse legítimo (art. 6.1.f): os teus «Bom dilema», guardados à parte da sala, e a marca de que já votaste sozinho um dilema, sem o teu voto. Não dizem o que escolheste nem revelam as tuas convicções, por isso não dependem do consentimento do jogo e ficam se o retirares. Podes opor-te escrevendo-nos com o teu código para pedidos, e apagamo-los.',
        '- Para te reconhecer, pelas condições de utilização (art. 6.1.b): um identificador anónimo do teu dispositivo e quando abriste a app pela última vez.',
        '- Para proteger o serviço de abusos e de programas automáticos, com base no interesse legítimo (art. 6.1.f): sempre que entras, o Firebase App Check verifica com o reCAPTCHA Enterprise da Google que o pedido vem da app verdadeira; para isso, a Google analisa dados técnicos do teu navegador e de como usas a página, e guarda nele um token e um cookie, como explica a política de cookies da app.',
        '- Para cumprir a lei sobre a idade (art. 6.1.c): o teu ano de nascimento e, se fazes 18 anos este ano ou mais tarde, o mês; e a tua região (Espaço Económico Europeu, resto do mundo ou país onde o TheLever não está disponível), que deduzimos do teu endereço IP com uma base de dados no nosso próprio servidor, IP Geolocation by DB-IP (db-ip.com, licença CC BY 4.0). O TheLever não guarda o teu IP; o nosso fornecedor de acesso, o Firebase Authentication (Google), regista-o durante algumas semanas por segurança.',
        '- Para podermos provar o que aceitaste (art. 6.1.c e 7.1): que versão das condições e do consentimento aceitaste e quando, e quando o retiraste.',
        '- Para medir a utilização e melhorar o jogo, com base no interesse legítimo (art. 6.1.f): quando abriste a app pela primeira vez e por que link chegaste (por exemplo, o de um cartaz); quando crias uma sala ou entras na de outra pessoa; quando um jogo começa e acaba e com quantos jogadores; e quanto tempo tu e o grupo demoram a responder a cada dilema, que se apaga com o jogo. Nunca os teus votos, as tuas previsões nem as tuas reações, e sem cookies: é o nosso servidor que o regista. A primeira visita é registada antes de te poderes opor. Podes opor-te em Definições → Privacidade e dados → As tuas permissões: deixamos de o registar e apagamos os eventos que tínhamos; os tempos dos jogos que ainda se conservam apagam-se com eles.',
        '- Para os anúncios, com o teu consentimento (art. 6.1.a RGPD e art. 22.2 LSSI): os cookies e identificadores da rede publicitária, conforme o que escolheres no gestor de cookies da Google. O que a app guarda no teu dispositivo, e como o mudar, está na política de cookies da app (thelever.app/pt/cookies-da-app).',
        '- Para moderar (obrigação legal do Regulamento dos Serviços Digitais e interesse legítimo num serviço seguro, art. 6.1.c e 6.1.f): o dilema ou a alcunha que denuncias, o motivo e o teu comentário, sem dizer a ninguém do grupo que o denunciaste; se denunciarem a tua alcunha, a alcunha e a nossa decisão; se denunciares conteúdo ilegal a partir do site, o que nos contas e, se nos deres, o teu nome e o teu email para te respondermos; e os avisos de cada decisão.',
        '- Para tratar os teus pedidos (art. 6.1.c): o teu email, o que nos pedires e o código para pedidos que te damos quando abres a app pela primeira vez, que vês em Definições → Privacidade e dados → Os teus dados.',
        '- Para que um apagamento não se desfaça se restaurarmos uma cópia de segurança (art. 6.1.c e 17): o teu identificador anónimo, o motivo do apagamento e quando o pediste e quando terminou.',
        '- Se nos apoiares com um donativo no Ko-fi (Ko-fi Labs Limited, Reino Unido): o Ko-fi dá-nos o teu nome ou nome de utilizador, o teu email, o montante e a mensagem que escreveres. Usamo-los para gerir e agradecer o teu donativo, com base no interesse legítimo (art. 6.1.f), e para cumprir as nossas obrigações fiscais (art. 6.1.c). Nunca os ligamos ao teu identificador nem a nada do que fazes na app. O Ko-fi e quem processa o pagamento (PayPal ou Stripe) tratam os teus dados por conta própria, segundo as suas políticas.',
      ],
    },
    {
      heading: 'O que o teu grupo vê',
      paragraphs: [
        'Numa sala nominal, o teu grupo vê na revelação o que votaste, quantos acertaram no teu voto e as tuas reações, e no fim a tua posição e os títulos do jogo, que saem dos votos, das previsões e das reações. Numa sala anónima, ninguém vê o teu voto nem a tua previsão: só quantos escolheram cada opção e, se votaram menos de 3 pessoas, nem isso. Quando votas sozinho, ninguém vê o teu voto: só a contagem mundial, sem nomes, a partir de 20 respostas.',
        'Qualquer jogador pode partilhar fora da sala um cartão com o resultado: o pessoal não mostra as alcunhas dos outros a menos que quem o partilha o escolha, e o do grupo só mostra a distribuição, sem nomes.',
      ],
    },
    {
      heading: 'Menores',
      paragraphs: [
        'Para jogar é preciso ter pelo menos 16 anos no Espaço Económico Europeu e 18 no resto do mundo. Os jogadores de 16 e 17 anos só jogam dilemas adequados à sua idade, não entram em salas com dilemas +18 e os seus anúncios nunca são personalizados. Se a idade que declaras não chega à mínima, só guardamos o teu ano de nascimento, o mês se o indicaste, a tua região, quando abriste a app pela última vez, o teu código para pedidos e o registo da tua primeira visita, para que não possas jogar nesse dispositivo, e apagamo-los após 24 meses sem abrir a app. Se soubermos por outra via que alguém não tem a idade mínima, apagamos os seus dados.',
      ],
    },
    {
      heading: 'Decisões automatizadas',
      paragraphs: [
        'A app não te deixa jogar se a idade que declaras não chegar à mínima da tua região ou se estiveres num país onde não está disponível. Se achares que é um erro, escreve-nos e uma pessoa vai revê-lo. Não tomamos nenhuma outra decisão automatizada sobre ti.',
      ],
    },
    {
      heading: 'Com quem partilhamos os teus dados',
      paragraphs: [
        'Não vendemos os teus dados. São tratados por nossa conta, com contrato e só para prestar o serviço, pela Google Cloud e pelo Firebase (Google), que alojam a app, a sua base de dados e o acesso; pela Hostinger, que aloja o nosso correio e envia os nossos emails; e pela Anthropic, que traduz para a tua língua a explicação de uma decisão de moderação. O gestor de cookies é da Google, e a rede publicitária e os seus parceiros tratam os seus cookies como responsáveis por conta própria, só se o aceitares. Também podemos ter de dar dados às autoridades quando a lei o exigir.',
        'Se o TheLever mudar de titular, por exemplo ao passar a uma sociedade, os teus dados passam para o novo titular para continuar a prestar-te o mesmo serviço, com as mesmas finalidades e garantias (art. 21 da LOPDGDD). Avisamos-te na app antes da mudança e podes pedir-nos que os apaguemos antes.',
      ],
    },
    {
      heading: 'Transferências para fora do Espaço Económico Europeu',
      paragraphs: [
        'A Google e a Anthropic podem tratar dados nos Estados Unidos: a Google, ao abrigo do Quadro de Privacidade de Dados UE-EUA e das cláusulas contratuais-tipo da Comissão Europeia; a Anthropic, ao abrigo dessas mesmas cláusulas, que fazem parte do seu contrato. A Hostinger guarda o nosso correio na União Europeia.',
      ],
    },
    {
      heading: 'Durante quanto tempo guardamos os teus dados',
      paragraphs: [
        '- O que respondes num jogo: menos de 24 horas desde que a sala fecha.',
        '- Os teus «Bom dilema» e a marca de que votaste sozinho: até pedires para apagar os teus dados, te opores ou passares 24 meses sem abrir a app.',
        '- A tua idade, a tua região, o teu código para pedidos e o que aceitaste: enquanto usares a app e, se apagares os teus dados, um registo mínimo do que aceitaste durante 3 anos.',
        '- Os dados de utilização com o teu identificador: 13 meses; depois, só totais que não te identificam.',
        '- As denúncias, as decisões de moderação e os seus avisos, os teus pedidos com as nossas respostas e o registo dos teus apagamentos: 3 anos. Se apagares os teus dados, as denúncias que fizeste ficam sem qualquer ligação a ti.',
        '- As tuas escolhas de cookies: o que o gestor de cookies da Google definir, no máximo 13 meses.',
        '- Os dados de um donativo: o tempo que a lei fiscal exige, em geral 4 anos.',
        '- O que apagamos fica alguns dias nas cópias de segurança: 7 dias nas nossas e até 180 nas do Firebase. Entretanto não é usado para nada.',
      ],
    },
    {
      heading: 'Os teus direitos',
      paragraphs: [
        'Podes pedir acesso aos teus dados, retificá-los, apagá-los, limitar o seu uso, levá-los contigo e opor-te ao seu tratamento. Em Definições → Privacidade e dados podes, tu mesmo:',
        '- Em «As tuas permissões», retirar o consentimento do jogo quando quiseres, sem afetar o que já foi tratado: não poderás criar salas nem entrar nelas até o dares de novo, e apagamos o que respondeste nos jogos que ainda não foram apagados; os teus «Bom dilema» e as marcas dos teus votos sozinho ficam. Também te podes opor à análise de utilização.',
        '- Em «Apagar os meus dados», apagá-los: o teu telemóvel fica como novo no momento e apagamos tudo o que está ligado ao teu identificador em poucas horas, e no máximo num mês, exceto o registo mínimo do que aceitaste e o do teu apagamento.',
        'Se retirares o consentimento ou apagares os teus dados, nas salas que ainda se conservam a tua alcunha passa a «Jogador».',
        'Para tudo o resto, como pedir uma cópia dos teus dados ou corrigir a tua idade, escreve para privacidad@thelever.app com o código que vês em Definições → Privacidade e dados → Os teus dados: como jogas sem conta, é o que nos permite saber que o pedido é teu, e sem ele não o podemos tratar. Se só nos denunciaste algo a partir do site, escreve-nos a partir do email que nos deste. Respondemos no máximo num mês.',
        'Se achares que não tratámos bem os teus dados, podes reclamar junto da Agência Espanhola de Proteção de Dados (aepd.es) ou da autoridade do teu país.',
      ],
    },
    {
      heading: 'Se estiveres fora da União Europeia',
      paragraphs: [
        'Por agora o TheLever não está disponível no Reino Unido. Nos Estados Unidos, não vendemos os teus dados pessoais nem os partilhamos para publicidade sem o teu consentimento, e respeitamos o sinal Global Privacy Control do teu navegador como recusa dos anúncios personalizados.',
      ],
    },
    {
      heading: 'Segurança e alterações',
      paragraphs: [
        'Ciframos os dados em trânsito e em repouso, damos o acesso mínimo a eles, não guardamos o teu IP nas nossas bases de dados e apagamos os jogos sozinhos. Se houvesse uma violação que te afetasse, avisávamos-te a ti e à AEPD quando a lei o exigisse.',
        'Se alterarmos esta política de forma importante, dizemos-te na app antes de te afetar, e se a alteração exigir o teu consentimento, pedimos-to de novo.',
      ],
    },
  ],
};

/** The cookies policy of the app: what it keeps on the device, which its privacy policy links to. */
export const appCookies: OwnPage = {
  title: 'Cookies da app',
  description:
    'O que a app do TheLever guarda no teu dispositivo, para quê e como mudar o que aceitas.',
  updated: UPDATED,
  sections: [
    {
      heading: 'O que são',
      paragraphs: [
        'Os cookies são pequenos ficheiros que um site ou uma app guarda no teu navegador e volta a ler depois. Esta política chama também «cookies» às tecnologias parecidas, como o armazenamento local do navegador, que é o que a app usa quase sempre.',
      ],
    },
    {
      heading: 'O que guarda sem te pedir autorização',
      paragraphs: [
        'Só o imprescindível para que o jogo funcione ou para lembrar o que escolhes, que a lei não sujeita a consentimento (art. 22.2 da LSSI espanhola). Quase tudo é do TheLever. O que é do Firebase e do reCAPTCHA Enterprise, da Google, dá-nos o acesso e protege o serviço de programas automáticos, e o que respondes no gestor de cookies é guardado pelo gestor da Google.',
      ],
      table: {
        headers: ['Nome', 'De quem', 'Para quê', 'Duração'],
        rows: [
          [
            'firebaseLocalStorageDb',
            'Firebase Authentication (Google)',
            'A tua sessão: o identificador anónimo do teu dispositivo',
            'Até apagares os teus dados ou os do navegador',
          ],
          [
            'firebase-app-check-database',
            'Firebase App Check (Google)',
            'A prova de que os pedidos vêm da app verdadeira e não de um programa automático',
            'Algumas horas; depois pede-se outra',
          ],
          [
            'firebase-heartbeat-database',
            'Firebase (Google)',
            'Em que dias se usou o SDK do Firebase e a sua versão, que a Google recebe para manter o seu serviço',
            'Até apagares os dados do navegador',
          ],
          [
            '_GRECAPTCHA (em google.com)',
            'reCAPTCHA Enterprise (Google)',
            'Avaliar o risco de quem usa a app ser um programa automático',
            '6 meses',
          ],
          ['thelever.language', 'TheLever', 'A língua que escolheste', 'Igual'],
          ['thelever.muted', 'TheLever', 'Se tiraste o som', 'Igual'],
          [
            'thelever.cookieConsentAnswered',
            'TheLever',
            'Que já respondeste ao gestor de cookies',
            'Igual',
          ],
          [
            'thelever.personalisedAds',
            'TheLever',
            'Se os anúncios podem ser personalizados, segundo o que aceitaste',
            'Igual',
          ],
          [
            'thelever.lastNickname',
            'TheLever',
            'A última alcunha com que jogaste, para ta propor',
            'Igual',
          ],
          [
            'thelever.playedDilemmas',
            'TheLever',
            'Os dilemas que jogaste, sem os teus votos, para não tos repetir',
            'Igual',
          ],
          [
            'thelever.worldVote.…',
            'TheLever',
            'O que votaste e previste sozinho, para te mostrar o resultado mundial',
            'Igual',
          ],
          [
            'thelever.installOfferClosedAt e thelever.lastFinishedGameAt',
            'TheLever',
            'Quando fechaste a oferta de instalar a app e quando acabaste o teu último jogo, para não ta repetir antes do tempo',
            'Igual',
          ],
          [
            'thelever.supportCardClosed',
            'TheLever',
            'Que fechaste o cartão para apoiar o TheLever',
            'Igual',
          ],
          [
            'thelever.accessCode',
            'TheLever',
            'O código de acesso, enquanto a app não está aberta a todos',
            'Até apagares os dados do navegador',
          ],
          [
            'thelever.toldAnonymous',
            'TheLever',
            'Que já te avisámos de que a sala é anónima',
            'Até fechares o separador',
          ],
          [
            'FCCDCF',
            'Gestor de cookies da Google',
            'Guardar o que respondes no gestor',
            '13 meses',
          ],
        ],
      },
    },
    {
      heading: 'O que precisa do teu consentimento',
      paragraphs: [
        'Tudo o resto, e só se o aceitares no gestor de cookies da Google, que te pergunta na primeira vez que entras:',
        '- As estatísticas do próprio gestor (FCNEC, da Google, 365 dias).',
        '- Os anúncios. Hoje a app não mostra nenhum. Quando os mostrar, o Google AdSense e os seus parceiros vão usar cookies para os mostrar e medir e, se tiveres 18 anos ou mais e o aceitares, para os personalizar; se o teu navegador enviar o sinal Global Privacy Control, não são personalizados. Nunca são escolhidos a partir do que votas, e antes de chegarem esta política vai acrescentar os seus cookies.',
        'Não usamos cookies de análise: o que medimos da utilização é registado pelo nosso servidor, como explica a política de privacidade da app. O SDK do Firebase guarda, sim, em que dias foi usado e a sua versão, como diz a tabela, sem nada do que fazes no jogo.',
      ],
    },
    {
      heading: 'Como mudar o que aceitas',
      paragraphs: [
        'Em Definições → Privacidade e dados → Cookies e anúncios voltas a abrir o gestor de cookies da Google e mudas o que aceitaste tão facilmente como na primeira vez.',
        'O resto apagas com Definições → Privacidade e dados → Apagar os meus dados, que deixa o teu telemóvel como novo: se jogas sem conta, a app vai tratar-te como um dispositivo novo. O que guardam o Firebase App Check, o SDK do Firebase, o reCAPTCHA e o gestor de cookies, e o código de acesso, fica até caducar ou até apagares os dados do navegador nas suas definições.',
      ],
    },
    {
      heading: 'Terceiros e transferências',
      paragraphs: [
        'O Firebase e o reCAPTCHA Enterprise, da Google, tratam por nossa conta a tua sessão e a verificação de que usas a app verdadeira. A Google e os parceiros publicitários que aceitares usam os seus cookies como responsáveis por conta própria; o gestor de cookies segue o Quadro de Transparência e Consentimento da IAB Europe e mostra-te quem são e para que usa cada um os teus dados.',
        'A Google pode tratar dados fora do Espaço Económico Europeu, ao abrigo do Quadro de Privacidade de Dados UE-EUA e das cláusulas contratuais-tipo da Comissão Europeia.',
      ],
    },
    {
      heading: 'Mais informação',
      paragraphs: [
        'Como tratamos os teus dados está na política de privacidade da app. Para qualquer dúvida, escreve para privacidad@thelever.app.',
      ],
    },
  ],
};
