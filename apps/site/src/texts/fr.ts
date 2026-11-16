import type { SiteTexts } from './site-texts.ts';

const UPDATED = '16 novembre 2026';

export const fr: SiteTexts = {
  languageName: 'Français',
  languageMenu: 'Langue',
  languageMenuNote:
    'T’emmène vers cette même page dans la langue choisie. Si tu ouvres l’app d’ici, elle s’ouvrira dans cette langue.',
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
    createRoom: 'Créer une salle',
    howToPlay: 'Comment jouer',
    steps: [
      'Crée une salle et partage le lien ou le code.',
      'À chaque manche, vous votez tous le même dilemme en secret et vous prédisez les autres.',
      'Le résultat est révélé et vous en discutez. À la fin, les titres de la partie.',
    ],
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
    moreOf: (name) => `Plus de dilemmes : ${name.toLowerCase()}`,
  },
  gone: {
    title: 'Ce dilemme n’est plus sur TheLever',
    heading: 'Ce dilemme n’est plus sur TheLever',
    body: 'Nous l’avons retiré du catalogue. Si quelqu’un t’a envoyé ce lien, beaucoup d’autres t’attendent.',
    moreOf: (name) => `Voir les dilemmes : ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'Cette page n’existe pas',
    heading: 'Cette page n’existe pas',
    body: 'L’adresse est peut-être mal écrite. Depuis l’accueil, tu accèdes à tous les dilemmes.',
  },
  footer: { label: 'Informations légales' },
  privacy: {
    title: 'Confidentialité',
    description:
      'Quelles données traite le site public de TheLever, pourquoi, et quels sont tes droits.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Qui est responsable',
        paragraphs: [
          'TheLever est un projet de Mario Villacorta García, NIF [REDACTED], domicilié [REDACTED], Espagne. Pour toute question sur tes données, écris à privacidad@thelever.app. Nous répondons en espagnol et en anglais.',
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
        heading: 'Publicités et cookies',
        paragraphs: [
          'Ce site est financé par des publicités Google AdSense. Google et ses partenaires n’utilisent des cookies pour les afficher ou les personnaliser que si tu l’acceptes dans le gestionnaire de cookies, qui apparaît avant toute publicité ; sinon, tu ne vois que des publicités limitées, sans cookies. Aucune publicité ne reçoit ce que tu votes dans l’app.',
          'Google est responsable pour son propre compte de ce qu’il fait de ces cookies. Pour en savoir plus : policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Avec qui nous partageons tes données',
        paragraphs: [
          'Nous ne vendons pas tes données. Google Cloud les traite pour notre compte, sous contrat, uniquement pour héberger le site. Nous pouvons aussi devoir les communiquer aux autorités lorsque la loi l’exige.',
        ],
      },
      {
        heading: 'Transferts hors de l’Espace économique européen',
        paragraphs: [
          'Google peut traiter des données hors de l’Espace économique européen, dans le cadre du Data Privacy Framework UE-États-Unis et des clauses contractuelles types de la Commission européenne.',
        ],
      },
      {
        heading: 'Combien de temps nous les conservons',
        paragraphs: [
          'TheLever ne conserve rien de ta visite. Google conserve ses journaux techniques le temps nécessaire à la sécurité du service.',
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
  legalNotice: {
    title: 'Mentions légales',
    description: 'Qui est derrière TheLever et les conditions de ce site.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Titulaire',
        paragraphs: [
          '- Titulaire : Mario Villacorta García.',
          '- NIF : [REDACTED].',
          '- Adresse : [REDACTED], Espagne.',
          '- E-mail : privacidad@thelever.app.',
          '- Site et app : thelever.app.',
          '- Activité : jeu en ligne gratuit financé par la publicité.',
        ],
      },
      {
        heading: 'Confidentialité',
        paragraphs: [
          'La façon dont nous traitons les données sur ce site figure dans la politique de confidentialité. L’app explique la sienne avant de jouer, et son usage est régi par ses conditions d’utilisation, acceptées à l’entrée.',
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
};
