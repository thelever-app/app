import { appCookies, appPrivacy, terms } from './legal/fr.ts';
import type { SiteTexts } from './site-texts.ts';

const UPDATED = '23 novembre 2026';

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
    },
    honesty: {
      name: 'Honnêteté',
      description:
        'Quand dire la vérité, quand se taire, et ce que tu cacherais, à qui et pourquoi.',
    },
    loyalty: {
      name: 'Loyauté',
      description:
        'Amis, famille et collègues : jusqu’où va ce que tu leur dois quand cela heurte ce que tu crois juste.',
    },
    justice: {
      name: 'Justice',
      description:
        'Punitions, récompenses et règles : qu’est-ce qui est juste quand la loi, l’intention et le résultat ne coïncident pas.',
    },
    'love-and-relationships': {
      name: 'Amour et relations',
      description:
        'Couple, jalousie, secrets et ruptures : des dilemmes sur ce que tu ferais pour quelqu’un que tu aimes.',
    },
    'work-and-money': {
      name: 'Travail et argent',
      description:
        'Promotions, salaires, faveurs et raccourcis : ce que tu ferais quand l’argent ou ta carrière sont en jeu.',
    },
    'technology-and-the-future': {
      name: 'Technologie et avenir',
      description:
        'Intelligence artificielle, vie privée, robots et génétique : des dilemmes qui relevaient de la science-fiction il y a peu.',
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
    options: (count) => `${count} options`,
    withArguments: 'arguments pour chacune',
  },
  dilemma: {
    vote: 'Voter et voir ce qu’a fait le monde',
    play: 'Le jouer avec mon groupe',
    worldResultLater:
      'Le résultat mondial s’affiche après le vote, pour qu’il n’influence pas ta réponse.',
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
