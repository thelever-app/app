import { appCookies, appPrivacy, terms } from './legal/fr.ts';
import type { SiteTexts } from './site-texts.ts';

const UPDATED = '23 novembre 2026';
const GUIDES_UPDATED = '26 novembre 2026';

export const fr: SiteTexts = {
  languageName: 'Français',
  languageMenu: 'Langue',
  homeLink: 'Accueil',
  someoneInYourGroup: 'quelqu’un de ton groupe',
  categories: {
    'life-and-death': {
      name: 'Vie et mort',
      description:
        'Des dilemmes où des vies sont en jeu : le tramway, le canot de sauvetage et d’autres choix sans bonne issue.',
      about: [
        'Ce sont les dilemmes les plus anciens de la philosophie morale. Un tramway sans freins, un canot de sauvetage avec trop peu de places, un médecin avec cinq patients qui attendent un organe. Ils obligent à choisir entre des vies et ne laissent aucune issue propre.',
        'Presque tous opposent deux façons de penser. L’une regarde le résultat et cherche à sauver le plus de personnes possible. L’autre regarde ce que tu fais de tes propres mains et soutient qu’il y a des choses qu’on ne fait à personne, même si le bilan final est favorable.',
        'Joués en groupe, ils révèlent quelque chose qu’un test individuel ne montre pas. Qui actionne le levier sans hésiter découvre que son meilleur ami ne le ferait jamais, et la conversation qui suit dure souvent plus longtemps que la partie.',
      ],
    },
    honesty: {
      name: 'Honnêteté',
      description:
        'Quand dire la vérité, quand se taire, et ce que tu cacherais, à qui et pourquoi.',
      about: [
        'Mentir, c’est mal, mais presque personne ne dit toujours la vérité. Ces dilemmes explorent cet entre-deux, celui du pieux mensonge, du silence qui protège quelqu’un et de la vérité qui blesse sans nécessité.',
        'Derrière chacun se cache une question de fond. Qu’est-ce qui compte le plus, ce que sait l’autre personne ou ce qu’elle ressent ? Certains voient la vérité comme un devoir qui n’admet aucune exception, d’autres comme un outil à manier avec soin.',
        'Ils sont parfaits pour découvrir où chacun de tes amis place exactement la limite, et pour te rendre compte que cette limite change selon la personne à qui il faut mentir.',
      ],
    },
    loyalty: {
      name: 'Loyauté',
      description:
        'Amis, famille et collègues : jusqu’où va ce que tu leur dois quand cela heurte ce que tu crois juste.',
      about: [
        'La loyauté, c’est ce qui nous lie à la famille, aux amis et à l’équipe. Le problème arrive quand ce que tu dois à quelqu’un heurte ce que tu crois juste, ce que tu dois à un inconnu ou ce que tu te dois à toi-même.',
        'Couvrirais-tu un ami qui a fait quelque chose de grave ? Dénoncerais-tu ton frère ? Ces dilemmes testent jusqu’où vont ces liens et ce que tu accepterais de sacrifier pour eux.',
        'Entre amis, ils ont un effet curieux. Tu votes en secret ce que tu ferais pour eux, puis tu découvres, face à eux, ce qu’ils feraient pour toi.',
      ],
    },
    justice: {
      name: 'Justice',
      description:
        'Punitions, récompenses et règles : qu’est-ce qui est juste quand la loi, l’intention et le résultat ne coïncident pas.',
      about: [
        'La justice semble simple jusqu’au moment où la loi, l’intention et le résultat cessent de coïncider. Quelqu’un vole pour nourrir sa famille, une règle juste produit une punition absurde, un coupable s’en sort grâce à un vice de forme.',
        'Ces dilemmes opposent des idées différentes de ce qui est juste. Pour certains, appliquer les règles de la même façon à tous ; pour d’autres, donner à chacun ce qu’il mérite ; et pour d’autres encore, réparer le tort plutôt que punir la personne qui l’a causé.',
        'Ce sont ceux qui font le plus débattre au moment de la Révélation, parce que presque tout le monde croit savoir ce qui est juste jusqu’à entendre la raison de la personne qui a voté l’inverse.',
      ],
    },
    'love-and-relationships': {
      name: 'Amour et relations',
      description:
        'Couple, jalousie, secrets et ruptures : des dilemmes sur ce que tu ferais pour quelqu’un que tu aimes.',
      about: [
        'Couple, jalousie, secrets, ruptures et amitiés qui se compliquent. Ce sont de petits dilemmes à côté d’un tramway sans freins, mais ce sont ceux qu’on rencontre vraiment dans la vie.',
        'Ils opposent la sincérité à la délicatesse, la liberté de chacun à l’engagement envers l’autre, et ce que tu ressens à ce que tu crois devoir ressentir.',
        'Les jouer avec tes proches a quelque chose de risqué, et c’est tout l’intérêt. Tu votes en secret, mais vous essayez tous de deviner ce que chacun a choisi.',
      ],
    },
    'work-and-money': {
      name: 'Travail et argent',
      description:
        'Promotions, salaires, faveurs et raccourcis : ce que tu ferais quand l’argent ou ta carrière sont en jeu.',
      about: [
        'Promotions, salaires, faveurs, erreurs de l’entreprise en ta faveur et collègues qui en profitent. L’argent et la carrière mettent à l’épreuve des principes qui, dans l’abstrait, semblent solides.',
        'Certains de ces dilemmes ont une structure bien connue en théorie des jeux. Si tout le monde coopère, tout le monde gagne, mais qui profite des autres gagne encore davantage. Fais-tu confiance aux autres ou te protèges-tu ?',
        'Ils servent à découvrir qui, dans le groupe, rendrait l’argent en trop, qui négocierait sans pitié et qui quitterait une entreprise par principe.',
      ],
    },
    'technology-and-the-future': {
      name: 'Technologie et avenir',
      description:
        'Intelligence artificielle, vie privée, robots et génétique : des dilemmes qui relevaient de la science-fiction il y a peu.',
      about: [
        'Intelligence artificielle, vie privée, voitures autonomes, édition génétique et vies de plus en plus longues. Il y a peu, c’était de la science-fiction, et aujourd’hui ce sont des décisions que quelqu’un est en train de prendre.',
        'Ces dilemmes posent des questions nouvelles avec de vieux outils. Une voiture autonome doit-elle protéger son passager ou les piétons ? Confierais-tu tes secrets à une machine qui te comprend mieux que personne ?',
        'Beaucoup n’ont pas encore de réponse acceptée par la majorité, alors le résultat de ton groupe peut être aussi intéressant que celui de n’importe quel sondage.',
      ],
    },
  },
  home: {
    title: 'TheLever : des dilemmes moraux à jouer en groupe',
    description:
      'Des dilemmes moraux à jouer avec tes proches : chacun vote en secret, prédit ce que voteront les autres, puis vous découvrez ensemble qui pense quoi.',
    heading: 'Des dilemmes moraux à jouer avec tes proches',
    intro:
      'Chacun vote en secret depuis son téléphone, prédit ce que voteront les autres, puis vous découvrez ensemble qui pense quoi. Gratuit, rien à installer.',
    play: 'Jouer maintenant',
    scene: 'La Palanca, qui fait signe à côté d’un aiguillage',
    howToPlay: 'Comment jouer',
    steps: [
      { title: 'Crée la salle', text: 'Partage le lien ou le code et fais entrer tes proches.' },
      {
        title: 'Vote et prédis',
        text: 'À chaque manche, vous votez tous le même dilemme en secret et vous prédisez les autres.',
      },
      {
        title: 'Découvrez qui pense quoi',
        text: 'Le résultat est révélé et vous en discutez. À la fin, les titres de la partie.',
      },
    ],
    screens: {
      roomCode: 'Code de la salle',
      share: 'Partager le lien',
      round: 'Dilemme 2 sur 6',
      dilemma: 'Mentirais-tu pour sauver le travail d’un ami ?',
      yes: 'Oui, je mentirais',
      no: 'Non, je dirais la vérité',
      private: 'Personne du groupe ne verra ton vote',
      result: '3 sur 5 ont dit oui',
      yesCount: 'Oui · 3',
      noCount: 'Non · 2',
      right: 'Tu as deviné Ana et Luis',
    },
    categories: 'Catégories',
  },
  category: {
    heading: (name) => `Dilemmes moraux : ${name.toLowerCase()}`,
    description: (name) =>
      `Dilemmes moraux sur le thème ${name.toLowerCase()}, à jouer en groupe sur TheLever.`,
  },
  dilemma: {
    vote: 'Voter et voir ce qu’a fait le monde',
    play: 'Le jouer avec mon groupe',
    worldResultLater:
      'Le résultat mondial s’affiche après le vote, pour qu’il n’influence pas ta réponse.',
    atStake: 'Ce qui est en jeu',
    arguments: 'Arguments de chaque option',
    for: 'Pour :',
    against: 'Contre :',
    byTheTeam: 'Texte de l’équipe de TheLever.',
    ad: 'Publicité',
    moreOf: (name) => `Plus de dilemmes : ${name.toLowerCase()}`,
  },
  gone: {
    title: 'Ce dilemme n’est plus sur TheLever',
    heading: 'Ce dilemme n’est plus sur TheLever',
    body: 'Nous l’avons retiré du catalogue.',
    moreOf: (name) => `Voir les dilemmes : ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'Cette page n’existe pas',
    heading: 'Cette page n’existe pas',
    body: 'L’adresse est peut-être mal écrite. Depuis l’accueil, tu accèdes à tous les dilemmes.',
  },
  footer: { label: 'Informations légales', manageCookies: 'Gérer les cookies' },
  support: {
    link: 'Soutenir TheLever',
    heading: 'TheLever est gratuit',
    text: 'Une seule personne le fait vivre. S’il te plaît, tu peux le soutenir par un don ; cela ne donne aucun avantage dans le jeu.',
    line: 'Ça t’a fait réfléchir ? TheLever est gratuit et une seule personne le fait vivre. Faire un don ne donne aucun avantage dans le jeu.',
  },
  guidesHeading: 'Pour en savoir plus',
  guides: {
    trolleyProblem: {
      title: 'Qu’est-ce que le dilemme du tramway ?',
      description:
        'Le dilemme du tramway, d’où il vient, ses variantes les plus connues et ce que la philosophie et la psychologie en ont appris.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Le dilemme',
          paragraphs: [
            'Un tramway sans freins fonce vers cinq personnes attachées à la voie. Tu te trouves à côté d’un levier qui le dévie sur une autre voie, où il n’y a qu’une seule personne. Si tu ne fais rien, cinq personnes meurent. Si tu actionnes le levier, une seule meurt. Que fais-tu ?',
            'Présenté ainsi, la plupart des gens disent qu’ils actionneraient le levier. Sauver cinq personnes au prix d’une seule semble le plus raisonnable. Le dilemme devient intéressant quand on change les détails et que ces mêmes personnes changent d’avis.',
          ],
        },
        {
          heading: 'D’où il vient',
          paragraphs: [
            'La philosophe britannique Philippa Foot l’a formulé en 1967 dans un article sur la doctrine du double effet. Dans sa version, c’est le conducteur du tramway qui décide, et il peut l’orienter vers une voie ou vers l’autre. Foot s’en servait pour demander s’il existe une différence morale entre causer un mal et le laisser se produire.',
            'La philosophe américaine Judith Jarvis Thomson lui a donné le nom sous lequel on le connaît, « the trolley problem », dans un article de 1976. C’est elle qui a mis le levier entre les mains d’un témoin et qui a proposé la variante la plus célèbre, celle du pont.',
          ],
        },
        {
          heading: 'La variante du pont',
          paragraphs: [
            'Cette fois, il n’y a pas de levier. Tu es sur un pont au-dessus de la voie, à côté d’une personne très corpulente. Si tu la pousses, son corps arrêtera le tramway et sauvera les cinq personnes. Elle mourra.',
            'Les chiffres sont les mêmes qu’avant, une vie contre cinq. Pourtant, la plupart des gens disent qu’ils ne la pousseraient pas. Expliquer pourquoi deux cas au résultat identique nous semblent si différents est, depuis des décennies, l’un des grands problèmes de l’éthique.',
          ],
        },
        {
          heading: 'Les deux grandes réponses',
          paragraphs: [
            '- Le conséquentialisme, et en particulier l’utilitarisme, juge une action à ses résultats. Si moins de personnes meurent, la décision est meilleure, avec le levier comme sur le pont.',
            '- L’éthique du devoir, dont le représentant le plus connu est Emmanuel Kant, soutient qu’il y a des choses qu’on ne peut pas faire à une personne même si le résultat est meilleur, comme l’utiliser seulement comme un moyen. Dévier le tramway peut être acceptable, mais pas pousser quelqu’un pour l’arrêter.',
            'La doctrine du double effet, qui remonte à Thomas d’Aquin, propose une position intermédiaire. Avec le levier, la mort de la personne sur l’autre voie est un effet prévu mais non recherché. Sur le pont, la mort de la personne poussée est le moyen de sauver les autres.',
          ],
        },
        {
          heading: 'Ce que dit la psychologie',
          paragraphs: [
            'En 2001, le psychologue Joshua Greene et son équipe ont publié dans la revue Science une étude d’imagerie par résonance magnétique. Les dilemmes où il faut faire du mal à quelqu’un de ses propres mains, comme celui du pont, activaient davantage les zones du cerveau liées à l’émotion que les dilemmes impersonnels, comme celui du levier.',
            'En 2018, le projet Moral Machine du MIT a publié dans Nature les résultats d’une expérience en ligne sur les voitures autonomes, avec des millions de décisions prises par des personnes de plus de deux cents pays et territoires. Il a trouvé des préférences partagées presque partout dans le monde, comme sauver le plus de personnes, et des différences nettes entre les cultures sur d’autres.',
          ],
        },
        {
          heading: 'Pourquoi il compte encore',
          paragraphs: [
            'Le dilemme du tramway est une expérience de pensée. Personne ne s’attend à trouver un levier au bord d’une voie, mais les questions qu’il pose surgissent dans des décisions réelles, comme répartir des ressources rares dans un hôpital ou programmer la réaction d’une voiture autonome face à un accident inévitable.',
            'Sur TheLever, tu peux jouer avec ton groupe à des versions du tramway et à des centaines d’autres dilemmes, voter en secret et découvrir ensuite qui pense quoi. La catégorie Vie et mort réunit ceux qui sont les plus proches du dilemme original.',
          ],
        },
      ],
    },
    playingInAGroup: {
      title: 'Comment jouer à des dilemmes moraux en groupe',
      description:
        'Comment se déroule une partie de TheLever, combien de personnes il faut, quelle ambiance choisir et comment tirer parti du débat.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Ce qu’il te faut',
          paragraphs: [
            'Un téléphone par personne, rien de plus. TheLever fonctionne dans le navigateur, donc il n’y a rien à installer ni aucun compte à créer. Il suffit que quelqu’un crée la salle et partage le lien ou le code.',
            'On peut jouer de deux à cinquante personnes. À quatre ou cinq, le débat est plus intime, et dans un grand groupe le résultat de chaque manche surprend davantage.',
          ],
        },
        {
          heading: 'Comment se déroule une partie',
          paragraphs: [
            '- La personne qui crée la salle choisit l’ambiance et le nombre de manches, d’une à douze. Par défaut, il y en a huit.',
            '- À chaque manche, le même dilemme apparaît sur tous les téléphones. Chacun vote en secret.',
            '- En plus de voter, chacun prédit ce qu’a voté le reste du groupe.',
            '- Quand tout le monde a voté, place à la Révélation. On voit ce qu’a choisi le groupe et qui a vu juste dans ses prédictions, et le débat commence.',
            '- À la fin de la partie, chaque personne reçoit un titre selon sa façon de voter et de prédire les autres.',
          ],
        },
        {
          heading: 'Quelle ambiance choisir',
          paragraphs: [
            '- Classique, avec des dilemmes pour tous les groupes. C’est la meilleure option pour commencer ou pour jouer avec des gens que tu connais peu.',
            '- Épicée, qui ajoute des thèmes pour adultes. Réservée aux plus de 18 ans.',
            '- Sans filtre, qui ajoute des questions compromettantes. Dans cette salle, personne ne voit ce que vote chacun.',
          ],
        },
        {
          heading: 'Comment tirer parti du débat',
          paragraphs: [
            'Le plus intéressant dans le jeu, ce n’est pas le vote mais ce qui vient après. Quand le groupe se divise, demande à quelqu’un de chaque camp d’expliquer sa raison en une phrase. Il en ressort presque toujours un détail du dilemme que l’autre camp n’avait pas remarqué.',
            'Il n’y a pas de bonnes réponses. Chaque dilemme a sur sa page les meilleurs arguments pour et contre chaque option, au cas où le débat s’enliserait ou si vous voulez savoir ce qu’en dit la philosophie.',
            'Les prédictions ajoutent une deuxième couche. Deviner ce que votera ton meilleur ami est plus difficile qu’il n’y paraît, et se tromper donne souvent lieu à la meilleure conversation de la soirée.',
          ],
        },
        {
          heading: 'Pour qui',
          paragraphs: [
            'TheLever s’adresse aux plus de 16 ans. Il fonctionne lors d’un dîner entre amis, en cours de philosophie ou d’éthique, pendant une activité d’équipe ou en visio avec des gens qui vivent loin.',
          ],
        },
      ],
    },
    about: {
      title: 'Qui fait vivre TheLever',
      description:
        'Qui est derrière TheLever, comment ses dilemmes sont écrits, comment il est financé et comment nous écrire.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Une seule personne',
          paragraphs: [
            'TheLever est fait par une seule personne, qui le conçoit, le programme et sélectionne ses dilemmes. C’est un projet indépendant, sans investisseurs ni entreprise derrière.',
            'Il est né d’une idée simple. Les dilemmes moraux sont bien plus intéressants quand tu en discutes avec tes proches que quand tu y réponds en solo dans un test.',
          ],
        },
        {
          heading: 'Comment sont faits les dilemmes',
          paragraphs: [
            'Chaque dilemme du catalogue est relu à la main avant d’être publié. Certains sont des versions de classiques de la philosophie, comme le tramway ou l’anneau de Gygès ; la plupart sont des situations du quotidien écrites pour TheLever.',
            'Les arguments pour et contre chaque option sont rédigés avec l’aide de l’intelligence artificielle et relus un par un en espagnol. Les traductions dans les autres langues sont faites avec l’intelligence artificielle.',
            'Les arguments ne disent jamais quelle est la bonne option. Leur but est que tu comprennes la meilleure raison de chaque position, y compris celle de l’option que tu ne choisirais pas.',
          ],
        },
        {
          heading: 'Comment il est financé',
          paragraphs: [
            'TheLever est gratuit et le restera. Il vit de dons volontaires et, plus tard, aussi de la publicité. Faire un don ne donne aucun avantage dans le jeu.',
          ],
        },
        {
          heading: 'Comment nous écrire',
          paragraphs: [
            'Pour toute question sur tes données, écris à privacidad@thelever.app. Les pages de confidentialité et de mentions légales, accessibles en bas de chaque page, contiennent toutes les informations sur le responsable.',
          ],
        },
      ],
    },
  },
  privacy: {
    title: 'Confidentialité',
    description:
      'Quelles données traite le site public de TheLever, pourquoi, et quels sont tes droits.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Qui est responsable',
        paragraphs: [
          'TheLever est un projet de {owner}. Pour toute question sur tes données, écris à privacidad@thelever.app. Nous répondons en espagnol et en anglais.',
        ],
      },
      {
        heading: 'Quelles données nous traitons sur ce site',
        paragraphs: [
          'Ce site ne fait que montrer des dilemmes : il n’a ni comptes, ni formulaires, ni cookies propres, et ne te demande aucune donnée.',
          'Pour t’envoyer chaque page, notre hébergeur, Google Cloud (Firebase Hosting et Cloud Run), reçoit ce que ton navigateur envoie à chaque visite : ton adresse IP, ton navigateur et la page demandée. Il ne l’utilise que pour te livrer la page et la protéger des abus, au titre de notre intérêt légitime à offrir un service sûr (art. 6.1.f RGPD). TheLever ne conserve pas ton adresse IP dans ses journaux.',
        ],
      },
      {
        heading: 'L’app',
        paragraphs: [
          'Si tu choisis de voter un dilemme ou de le jouer avec ton groupe, tu passes à l’app TheLever, qui t’explique avant de jouer comment elle traite tes données et te demande ton consentement.',
        ],
      },
      {
        heading: 'Dons',
        paragraphs: [
          'Si tu nous soutiens par un don sur Ko-fi (Ko-fi Labs Limited, Royaume-Uni), Ko-fi nous donne ton nom ou ton nom d’utilisateur, ton e-mail, le montant et le message que tu écris. Nous les utilisons pour gérer ton don et te remercier, sur la base de l’intérêt légitime (art. 6.1.f RGPD), et pour respecter nos obligations fiscales (art. 6.1.c), et nous les gardons le temps qu’exige la loi fiscale, en général 4 ans. Nous ne les lions jamais à rien de ce que tu fais dans l’app. Ko-fi et celui qui traite le paiement (PayPal ou Stripe) traitent tes données pour leur propre compte, selon leurs propres politiques.',
        ],
      },
      {
        heading: 'Publicités et cookies',
        paragraphs: [
          'Les pages des dilemmes affichent des publicités Google AdSense. Avant d’utiliser des cookies, le gestionnaire de cookies de Google te demande ce que tu acceptes, et Google ne les utilise qu’avec ton consentement (art. 6.1.a RGPD et art. 22.2 LSSI). Si tu n’acceptes pas, tu ne vois que des publicités limitées, sans cookies.',
          'Les publicités ne sont personnalisées que si tu l’acceptes : sur ce site, qui ne demande pas ton âge, cela ne dépend que de ton acceptation. Si ton navigateur envoie le signal Global Privacy Control, les publicités ne sont pas personnalisées, même si tu l’acceptes. TheLever ne donne ni à Google ni à ses partenaires ce que tu votes dans l’app.',
          'Au chargement des publicités, même si tu n’acceptes rien, Google reçoit ton adresse IP, les données de ton navigateur et la page que tu visites. Nous le permettons au titre de notre intérêt légitime à financer un jeu gratuit par la publicité (art. 6.1.f RGPD), et nous répondons de cette collecte conjointement avec Google. Ce que Google et ses partenaires font ensuite de ces données et de leurs cookies relève de leur propre responsabilité, selon ce que tu acceptes et les conditions de protection des données de Google Ads (business.safety.google/adscontrollerterms). La politique de cookies indique quels sont ces cookies et comment modifier ce que tu acceptes ; Google l’explique sur policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Avec qui nous partageons tes données',
        paragraphs: [
          'Nous ne vendons pas tes données. Google Cloud les traite pour notre compte, sous contrat, uniquement pour héberger le site. Google AdSense et ses partenaires les reçoivent en tant que responsables pour leur propre compte, comme l’explique la section sur les publicités. Nous pouvons aussi devoir les communiquer aux autorités lorsque la loi l’exige.',
        ],
      },
      {
        heading: 'Transferts hors de l’Espace économique européen',
        paragraphs: [
          'Google peut traiter des données hors de l’Espace économique européen, sur la base du cadre de protection des données UE-États-Unis et des clauses contractuelles types de la Commission européenne.',
        ],
      },
      {
        heading: 'Combien de temps nous les conservons',
        paragraphs: [
          'TheLever ne conserve rien de ta visite. Google conserve ses journaux techniques le temps nécessaire à la sécurité du service, et chaque cookie est conservé pendant la durée qu’indique la politique de cookies.',
        ],
      },
      {
        heading: 'Tes droits',
        paragraphs: [
          'Tu peux demander l’accès à tes données, leur rectification, leur effacement, la limitation de leur usage, leur portabilité ou t’opposer à leur traitement en écrivant à privacidad@thelever.app. Nous répondons dans un délai d’un mois au plus.',
          'Si tu estimes que nous n’avons pas bien traité tes données, tu peux saisir l’Agence espagnole de protection des données (aepd.es) ou l’autorité de ton pays.',
        ],
      },
      {
        heading: 'Modifications de cette politique',
        paragraphs: [
          'Si nous la modifions de façon importante, nous l’indiquerons sur cette page avant que cela ne te concerne.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookies',
    description:
      'Quels cookies sont utilisés sur le site public de TheLever, pourquoi, et comment modifier ce que tu acceptes.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Ce que c’est',
        paragraphs: [
          'Les cookies sont de petits fichiers qu’un site enregistre dans ton navigateur et relit ensuite. Cette politique appelle aussi « cookies » les technologies similaires, comme le stockage local du navigateur.',
        ],
      },
      {
        heading: 'Ceux qu’utilise ce site',
        paragraphs: [
          'TheLever ne dépose de cookies propres sur aucune page de ce site. Ils sont déposés par Google AdSense, qui affiche les publicités, et par le gestionnaire de cookies de Google, qui te demande ce que tu acceptes. Tous sont des cookies de Google, en tant que tiers, et ils ne se chargent que sur les pages des dilemmes : l’accueil, les catégories et les pages légales n’ont ni publicités ni cookies.',
        ],
      },
      {
        heading: 'Ceux qui ne nécessitent pas ton consentement',
        paragraphs: [
          'Seulement ceux qui enregistrent ton choix, pour le respecter sans te le redemander à chaque page : ce que tu réponds dans le gestionnaire de cookies (FCCDCF) et, si tu n’acceptes pas les publicités avec cookies, le fait que tu ne les acceptes pas (__gpi_optout).',
        ],
      },
      {
        heading: 'Ceux qui nécessitent ton consentement',
        paragraphs: [
          'Tous les autres, et Google ne les utilise que si tu l’acceptes dans le gestionnaire de cookies :',
          '- Pour afficher et mesurer les publicités : enregistrer et lire des informations sur ton appareil, limiter le nombre de fois où tu vois une publicité, mesurer ses performances et prévenir la fraude. Si tu ne l’acceptes pas, tu ne vois que des publicités limitées, sans cookies.',
          '- Pour personnaliser les publicités selon tes centres d’intérêt. Sur ce site, qui ne demande pas ton âge, cela ne dépend que du fait que tu l’acceptes. Si ton navigateur envoie le signal Global Privacy Control, les publicités ne sont pas personnalisées, même si tu l’acceptes. Elles ne sont jamais choisies à partir de ce que tu votes dans l’app.',
          'Google peut aussi enregistrer des informations similaires dans le stockage local du navigateur, aux mêmes fins et avec le même consentement.',
        ],
      },
      {
        heading: 'Tableau des cookies',
        paragraphs: [
          'Les noms, les finalités et les durées sont ceux que publie Google sur business.safety.google/adscookies, où figure sa liste complète.',
        ],
        table: {
          headers: ['Cookie', 'Émetteur', 'Finalité', 'Durée'],
          rows: [
            [
              'FCCDCF',
              'Gestionnaire de cookies de Google',
              'Enregistrer ce que tu réponds dans le gestionnaire',
              '13 mois',
            ],
            [
              'FCNEC',
              'Gestionnaire de cookies de Google',
              'Statistiques du gestionnaire',
              '365 jours',
            ],
            ['__gads', 'Google AdSense', 'Publicités et sécurité', '13 mois'],
            ['__gpi', 'Google AdSense', 'Publicités et sécurité', '13 mois'],
            [
              '__gpi_optout',
              'Google AdSense',
              'Mémoriser que tu n’acceptes pas les publicités avec cookies',
              '13 mois',
            ],
            ['__eoi', 'Google AdSense', 'Sécurité', '6 mois'],
            [
              'TESTCOOKIESENABLED',
              'Google AdSense',
              'Vérifier si ton navigateur accepte les cookies',
              '60 secondes',
            ],
            ['IDE', 'Google (doubleclick.net)', 'Publicités et sécurité', '13 mois'],
            ['id', 'Google (doubleclick.net)', 'Publicités, sécurité et fonctionnement', '13 mois'],
            [
              'DSID',
              'Google (doubleclick.net)',
              'Publicités, sécurité et fonctionnement',
              '2 semaines',
            ],
            [
              'test_cookie',
              'Google (doubleclick.net)',
              'Vérifier si ton navigateur accepte les cookies',
              '15 minutes',
            ],
          ],
        },
      },
      {
        heading: 'Comment modifier ce que tu acceptes',
        paragraphs: [
          'Sur n’importe quelle page d’un dilemme, avec « Gérer les cookies » en bas de page : cela rouvre le gestionnaire de cookies de Google, où tu peux retirer ou modifier ton consentement aussi facilement que tu l’as donné.',
          'Tu peux aussi supprimer ou bloquer les cookies dans les réglages de ton navigateur.',
        ],
      },
      {
        heading: 'Tiers et transferts',
        paragraphs: [
          'Google et les partenaires publicitaires que tu acceptes utilisent leurs cookies en tant que responsables pour leur propre compte. Le gestionnaire de cookies suit le Transparency and Consent Framework d’IAB Europe et te montre qui sont ces partenaires et à quelles fins chacun utilise tes données.',
          'Google peut traiter des données hors de l’Espace économique européen, sur la base du cadre de protection des données UE-États-Unis et des clauses contractuelles types de la Commission européenne. Il l’explique sur policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Plus d’informations',
        paragraphs: [
          'La façon dont nous traitons tes données figure dans la politique de confidentialité. Pour toute question, écris à privacidad@thelever.app.',
        ],
      },
    ],
  },
  legalNotice: {
    title: 'Mentions légales',
    description: 'Qui est derrière TheLever et les conditions de ce site.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Titulaire',
        paragraphs: [
          '- Titulaire : {owner}.',
          '- NIF : {taxId}.',
          '- Adresse : {address}, Espagne.',
          '- E-mail : privacidad@thelever.app.',
          '- Site et app : thelever.app.',
          '- Activité : jeu en ligne gratuit financé par la publicité.',
        ],
      },
      {
        heading: 'Confidentialité',
        paragraphs: [
          'La façon dont nous traitons les données sur ce site figure dans la politique de confidentialité, et les cookies qu’il utilise, dans la politique de cookies. L’app explique la sienne avant de jouer, et son usage est régi par ses conditions d’utilisation, acceptées à l’entrée.',
        ],
      },
      {
        heading: 'Propriété intellectuelle',
        paragraphs: [
          'La marque TheLever, son design et les dilemmes et arguments de notre équipe appartiennent à leur titulaire, sauf indication d’une autre licence. Le code de l’app et de ce site est un logiciel libre sous licence AGPL-3.0.',
        ],
      },
      {
        heading: 'Liens et publicités',
        paragraphs: [
          'Nous ne contrôlons ni les publicités ni les sites vers lesquels elles renvoient. Si l’une d’elles est illicite ou inappropriée, préviens-nous et nous la retirerons dès que nous le saurons.',
        ],
      },
      {
        heading: 'Contenu illicite',
        paragraphs: [
          'Tu peux signaler un contenu illicite en écrivant à privacidad@thelever.app. C’est aussi le point de contact pour les autorités et les utilisateurs au titre du règlement sur les services numériques (art. 11 et 12), en espagnol et en anglais.',
        ],
      },
      {
        heading: 'Droit applicable',
        paragraphs: [
          'Droit espagnol. Si tu es consommateur, tu conserves les droits que te donnent les règles de ton pays.',
        ],
      },
    ],
  },
  terms,
  appPrivacy,
  appCookies,
};
