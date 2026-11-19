import type { OwnPage } from '../site-texts.ts';

const UPDATED = '19 de novembro de 2026';

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
        'Qualquer jogador pode denunciar um dilema a partir do jogo, e a nossa equipa revê-o. Se violares estas condições, podemos substituir a tua alcunha por uma genérica ou impedir-te o acesso, e dizemos-te o motivo, os factos, a regra aplicada e como reclamar.',
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
        'Podes deixar de usar o TheLever quando quiseres e pedir-nos que apaguemos os teus dados escrevendo para privacidad@thelever.app. Se violares estas condições de forma grave ou repetida, podemos impedir-te o acesso, com a fundamentação prevista na parte da moderação.',
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
  updated: UPDATED,
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
        '- Para jogar, com o teu consentimento explícito (art. 6.1.a e 9.2.a RGPD): a tua alcunha e o teu avatar; os teus votos, as tuas previsões do voto dos outros ou da distribuição do grupo, as tuas reações e os teus pontos; se um dilema era sobre ti; a ordem em que viste as opções e quanto tempo demoraste a responder; e os teus «Bom dilema», guardados à parte da sala.',
        '- Para votar sozinho um dilema do site, com o mesmo consentimento: o teu voto soma ao resultado mundial sem que guardemos o que votaste, e fica só uma marca de que já votaste esse dilema, para não contar duas vezes.',
        '- Para não te repetirmos dilemas, com o mesmo consentimento: o teu telemóvel guarda a lista de dilemas que jogaste, sem os teus votos, e envia-a ao entrares numa sala, que só a usa para preparar os jogos e a apaga com a sala.',
        '- Para te reconhecer, pelas condições de utilização (art. 6.1.b): um identificador anónimo do teu dispositivo e quando abriste a app pela última vez.',
        '- Para cumprir a lei sobre a idade (art. 6.1.c): o teu ano de nascimento e, se fazes 18 anos este ano ou mais tarde, o mês; e a tua região (Espaço Económico Europeu, resto do mundo ou país onde o TheLever não está disponível), que deduzimos do teu endereço IP com uma base de dados no nosso próprio servidor, IP Geolocation by DB-IP (db-ip.com, licença CC BY 4.0). O TheLever não guarda o teu IP; o nosso fornecedor de acesso, o Firebase Authentication (Google), regista-o durante algumas semanas por segurança.',
        '- Para podermos provar o que aceitaste (art. 6.1.c e 7.1): que versão das condições e do consentimento aceitaste e quando.',
        '- Para os anúncios, com o teu consentimento (art. 6.1.a RGPD e art. 22.2 LSSI): os cookies e identificadores da rede publicitária, conforme o que escolheres no gestor de cookies da Google.',
        '- Para moderar (obrigação legal do Regulamento dos Serviços Digitais e interesse legítimo num serviço seguro, art. 6.1.c e 6.1.f): o dilema que denuncias, o motivo e o teu comentário, sem dizer a ninguém do grupo que o denunciaste.',
        '- Para tratar os teus pedidos (art. 6.1.c): o teu email e o que nos pedires.',
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
        'Para jogar é preciso ter pelo menos 16 anos no Espaço Económico Europeu e 18 no resto do mundo. Os jogadores de 16 e 17 anos só jogam dilemas adequados à sua idade, não entram em salas com dilemas +18 e os seus anúncios nunca são personalizados. Se a idade que declaras não chega à mínima, só guardamos o teu ano de nascimento, o mês se o indicaste, a tua região e quando abriste a app pela última vez, para que não possas jogar nesse dispositivo, e apagamo-los após 24 meses sem abrir a app. Se soubermos por outra via que alguém não tem a idade mínima, apagamos os seus dados.',
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
        'Não vendemos os teus dados. São tratados por nossa conta, com contrato e só para prestar o serviço, pela Google Cloud e pelo Firebase (Google), que alojam a app, a sua base de dados e o acesso, e pela Hostinger, que aloja o nosso correio. O gestor de cookies é da Google, e a rede publicitária e os seus parceiros tratam os seus cookies como responsáveis por conta própria, só se o aceitares. Também podemos ter de dar dados às autoridades quando a lei o exigir.',
        'Se o TheLever mudar de titular, por exemplo ao passar a uma sociedade, os teus dados passam para o novo titular para continuar a prestar-te o mesmo serviço, com as mesmas finalidades e garantias (art. 21 da LOPDGDD). Avisamos-te na app antes da mudança e podes pedir-nos que os apaguemos antes.',
      ],
    },
    {
      heading: 'Transferências para fora do Espaço Económico Europeu',
      paragraphs: [
        'A Google pode tratar dados nos Estados Unidos, ao abrigo do Quadro de Privacidade de Dados UE-EUA e das cláusulas contratuais-tipo da Comissão Europeia.',
      ],
    },
    {
      heading: 'Durante quanto tempo guardamos os teus dados',
      paragraphs: [
        '- O que respondes num jogo: menos de 24 horas desde que a sala fecha.',
        '- Os teus «Bom dilema» e a marca de que votaste sozinho: até pedires para apagar os teus dados ou passares 24 meses sem abrir a app.',
        '- A tua idade, a tua região e o que aceitaste: enquanto usares a app e, se apagares os teus dados, um registo mínimo do que aceitaste durante 3 anos.',
        '- As tuas escolhas de cookies: o que o gestor de cookies da Google definir, no máximo 13 meses.',
        '- O que apagamos fica alguns dias nas cópias de segurança: 7 dias nas nossas e até 180 nas do Firebase. Entretanto não é usado para nada.',
      ],
    },
    {
      heading: 'Os teus direitos',
      paragraphs: [
        'Podes pedir acesso aos teus dados, retificá-los, apagá-los, limitar o seu uso, levá-los contigo e opor-te ao seu tratamento, e retirar o consentimento do jogo quando quiseres, sem afetar o que já foi tratado. Escreve para privacidad@thelever.app; como jogas sem conta, se não pudermos confirmar que o pedido é teu, pedimos-te o necessário para o fazer. Respondemos no máximo num mês.',
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
