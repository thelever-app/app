import type { OwnPage } from '../site-texts.ts';

const UPDATED = '23 novembre 2026';
const PRIVACY_UPDATED = '27 novembre 2026';

/** The terms of use of the app, version 1, which the first access asks to accept. */
export const terms: OwnPage = {
  title: 'Conditions d’utilisation',
  description:
    'Les conditions pour jouer à TheLever : qui peut jouer, comment ça marche et quelles sont les règles.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Qui fournit le service',
      paragraphs: [
        'TheLever est un service de {owner}. Ses coordonnées complètes figurent dans les mentions légales. Pour toute question, écris à privacidad@thelever.app : nous répondons en espagnol et en anglais.',
      ],
    },
    {
      heading: 'Ce qu’est TheLever',
      paragraphs: [
        'TheLever est un jeu gratuit pour jouer en groupe à des dilemmes moraux depuis le navigateur. Il est financé par la publicité. En acceptant ces conditions, tu acceptes un accord avec nous ; la façon dont nous traitons tes données est expliquée dans la politique de confidentialité de l’app.',
      ],
    },
    {
      heading: 'Qui peut jouer',
      paragraphs: [
        'Tu dois avoir au moins 16 ans si tu es dans l’Espace économique européen et 18 ans ailleurs. Déclarer un faux âge enfreint ces conditions.',
        'TheLever n’est pas disponible dans certains pays : ceux soumis à des sanctions de l’Union européenne visant tout le pays, la Russie, la Chine, le Brésil et, pour l’instant, le Royaume-Uni.',
        'Tu joues sans compte, avec un identifiant anonyme de ton appareil. Tu es responsable de ce qui est fait depuis celui-ci.',
      ],
    },
    {
      heading: 'Comment fonctionne le jeu',
      paragraphs: [
        'Dans chaque salle, le groupe répond aux mêmes dilemmes en même temps et découvre le résultat de chacun. Dans une salle nominative, tout le monde voit ce que chacun a voté ; dans une salle anonyme, seulement combien ont choisi chaque option. Ce que tu réponds dans une partie est supprimé dans les 24 heures après la fermeture de la salle.',
        'Les dilemmes peuvent aborder des sujets difficiles. Les dilemmes +18 ne se jouent que dans des salles avec des dilemmes +18, où seules les personnes de 18 ans ou plus peuvent entrer. Les dilemmes compromettants, dont la réponse sincère peut te mettre en porte-à-faux devant quelqu’un de la salle, ne se jouent que dans des salles anonymes et si la personne qui l’organise les active.',
      ],
    },
    {
      heading: 'Règles',
      paragraphs: [
        'En utilisant TheLever, tu t’engages à ne pas utiliser de pseudos au contenu illégal, haineux ou harcelant, qui humilient quelqu’un ou qui contiennent des données d’autres personnes ; à ne pas essayer de découvrir ce que chacun a voté dans une salle anonyme ; et à ne pas utiliser de programmes automatiques, saturer le service, contourner les restrictions d’âge ou de pays, ni accéder à des données ou à des parties du système qui ne te sont pas destinées.',
      ],
    },
    {
      heading: 'Modération et signalements',
      paragraphs: [
        'Tout joueur peut signaler un dilemme ou un pseudo depuis la partie, et notre équipe l’examine. Si tu enfreins ces conditions, nous pouvons remplacer ton pseudo par un pseudo générique ou t’empêcher d’accéder au service, et nous te dirons le motif, les faits, la règle appliquée et comment contester.',
        'Toute personne, qu’elle joue ou non, peut signaler un contenu illégal en écrivant à privacidad@thelever.app, qui est aussi le point de contact pour les autorités.',
      ],
    },
    {
      heading: 'Publicité',
      paragraphs: [
        'TheLever affiche des publicités, jamais pendant que tu votes, et elles ne reçoivent jamais rien de ce que tu votes. Elles ne sont personnalisées que pour les personnes de 18 ans ou plus qui l’acceptent dans le gestionnaire de cookies et dont le navigateur n’envoie pas le signal Global Privacy Control. Nous ne répondons pas du contenu des publicités ni des sites vers lesquels elles mènent, mais tu peux nous signaler toute publicité inappropriée.',
      ],
    },
    {
      heading: 'Ce qui nous appartient',
      paragraphs: [
        'Le nom et la marque TheLever, son design et les dilemmes écrits par notre équipe nous appartiennent, sauf indication d’une autre licence. Le code de l’app est ouvert, sous licence AGPL-3.0, sur github.com/thelever-app. Les avatars sont créés avec DiceBear.',
      ],
    },
    {
      heading: 'Disponibilité et responsabilité',
      paragraphs: [
        'TheLever est gratuit et proposé tel quel. Nous faisons en sorte qu’il fonctionne bien, mais il peut connaître des erreurs ou des interruptions, et nous pouvons modifier, suspendre ou fermer le service, en te prévenant dans un délai raisonnable en cas de fermeture.',
        'Nous ne répondons pas des dommages qui ne sont pas dus à notre dol ou à notre faute lourde, dans la mesure permise par la loi. Rien de cela ne limite les droits que te reconnaît le droit de la consommation. Tu es responsable des pseudos que tu utilises.',
      ],
    },
    {
      heading: 'Arrêter de jouer',
      paragraphs: [
        'Tu peux arrêter d’utiliser TheLever quand tu veux et supprimer tes données dans Réglages → Confidentialité et données → Supprimer mes données. Si tu enfreins ces conditions de façon grave ou répétée, nous pouvons t’empêcher d’accéder au service, avec la motivation prévue dans la partie sur la modération.',
      ],
    },
    {
      heading: 'Modifications de ces conditions',
      paragraphs: [
        'Si nous les modifions de façon importante, nous te le dirons dans l’app et tu devras les accepter à nouveau avant de continuer à jouer. Si tu ne les acceptes pas, tu peux nous demander de supprimer tes données.',
      ],
    },
    {
      heading: 'Droit applicable',
      paragraphs: [
        'Ces conditions sont régies par le droit espagnol. Si tu es consommateur, tu peux saisir les tribunaux de ton domicile et tu conserves la protection du droit de la consommation de ton pays. Version 1.',
      ],
    },
  ],
};

/** The privacy policy of the app, which the game consent links to. */
export const appPrivacy: OwnPage = {
  title: 'Confidentialité de l’app',
  description:
    'Les données que l’app TheLever traite pour jouer, sur quelle base, pendant combien de temps et quels sont tes droits.',
  updated: PRIVACY_UPDATED,
  sections: [
    {
      heading: 'Qui est responsable',
      paragraphs: [
        'TheLever est un projet de {owner}. Pour toute question sur tes données, écris à privacidad@thelever.app. Nous répondons en espagnol et en anglais.',
      ],
    },
    {
      heading: 'L’essentiel',
      paragraphs: [
        'Jouer exige ton consentement explicite, car ce que tu votes sur des dilemmes moraux peut révéler tes convictions et, dans certains dilemmes, quelque chose de ta vie privée. Ce que tu réponds dans une partie est supprimé dans les 24 heures après la fermeture de la salle. Nous n’utilisons pas tes données pour la recherche et ne les vendons à personne, et la publicité ne reçoit jamais ce que tu votes.',
      ],
    },
    {
      heading: 'Quelles données nous traitons, pourquoi et sur quelle base',
      paragraphs: [
        '- Pour jouer, avec ton consentement explicite (art. 6.1.a et 9.2.a RGPD) : ton pseudo et ton avatar ; tes votes, tes prédictions du vote des autres ou de la répartition du groupe, tes réactions et tes points ; si un dilemme portait sur toi ; et l’ordre dans lequel tu as vu les options.',
        '- Pour voter seul·e un dilemme du site, avec le même consentement : ton vote s’ajoute au résultat mondial sans que nous gardions ce que tu as voté.',
        '- Pour ne pas te répéter les dilemmes, avec le même consentement : ton téléphone garde la liste des dilemmes que tu as joués, sans tes votes, et l’envoie quand tu entres dans une salle, qui ne l’utilise que pour préparer les parties et la supprime avec la salle.',
        '- Pour évaluer quels dilemmes plaisent et pour que personne ne compte deux fois dans le résultat mondial, sur la base de l’intérêt légitime (art. 6.1.f) : tes « Bon dilemme », conservés à part de la salle, et la marque indiquant que tu as déjà voté seul·e un dilemme, sans ton vote. Ils ne disent pas ce que tu as choisi et ne révèlent pas tes convictions, donc ils ne dépendent pas du consentement du jeu et restent si tu le retires. Tu peux t’y opposer en nous écrivant avec ton code pour les demandes, et nous les supprimons.',
        '- Pour te reconnaître, en vertu des conditions d’utilisation (art. 6.1.b) : un identifiant anonyme de ton appareil et la date de ta dernière ouverture de l’app.',
        '- Pour protéger le service des abus et des programmes automatiques, sur la base de l’intérêt légitime (art. 6.1.f) : à chaque fois que tu entres, Firebase App Check vérifie avec reCAPTCHA Enterprise de Google que la requête vient de la vraie app ; pour cela, Google analyse des données techniques de ton navigateur et de ta façon d’utiliser la page, et y garde un jeton et un cookie, comme l’explique la politique de cookies de l’app.',
        '- Pour respecter la loi sur l’âge (art. 6.1.c) : ton année de naissance et, si tu as 18 ans cette année ou plus tard, le mois ; et ta région (Espace économique européen, reste du monde ou pays où TheLever n’est pas disponible), que nous déduisons de ton adresse IP avec une base de données sur notre propre serveur, IP Geolocation by DB-IP (db-ip.com, licence CC BY 4.0). TheLever ne garde pas ton IP ; notre fournisseur de connexion, Firebase Authentication (Google), l’enregistre quelques semaines pour la sécurité.',
        '- Pour pouvoir prouver ce que tu as accepté (art. 6.1.c et 7.1) : quelle version des conditions et du consentement tu as acceptée et quand, et quand tu l’as retiré.',
        '- Pour mesurer l’usage et améliorer le jeu, sur la base de l’intérêt légitime (art. 6.1.f) : quand tu as ouvert l’app pour la première fois et par quel lien tu es arrivé·e (par exemple, celui d’une affiche) ; quand tu crées une salle ou entres dans celle de quelqu’un d’autre ; quand une partie commence et se termine et avec combien de joueurs ; et le temps que toi et le groupe mettez à répondre à chaque dilemme, supprimé avec la partie. Jamais tes votes, tes prédictions ni tes réactions, et sans cookies : c’est notre serveur qui l’enregistre. La première visite est enregistrée avant que tu aies pu t’y opposer. Tu peux t’y opposer dans Réglages → Confidentialité et données → Tes autorisations : nous arrêtons de l’enregistrer et supprimons les événements que nous avions ; les temps des parties encore conservées sont supprimés avec elles.',
        '- Pour la publicité, avec ton consentement (art. 6.1.a RGPD et art. 22.2 LSSI) : les cookies et identifiants du réseau publicitaire, selon ce que tu choisis dans le gestionnaire de cookies de Google. Ce que l’app garde sur ton appareil, et comment le changer, se trouve dans la politique de cookies de l’app (thelever.app/fr/cookies-de-l-app).',
        '- Pour modérer (obligation légale du règlement sur les services numériques et intérêt légitime à un service sûr, art. 6.1.c et 6.1.f) : le dilemme ou le pseudo que tu signales, le motif et ton commentaire, sans dire à personne du groupe que tu l’as signalé ; si ton pseudo est signalé, le pseudo et notre décision ; si tu signales un contenu illicite depuis le site, ce que tu nous racontes et, si tu nous les donnes, ton nom et ton e-mail pour te répondre ; et les avis de chaque décision.',
        '- Pour traiter tes demandes (art. 6.1.c) : ton e-mail, ce que tu nous demandes et le code pour les demandes que nous te donnons à ta première ouverture de l’app, que tu vois dans Réglages → Confidentialité et données → Tes données.',
        '- Pour qu’une suppression ne soit pas annulée si nous restaurons une sauvegarde (art. 6.1.c et 17) : ton identifiant anonyme, le motif de la suppression, quand tu l’as demandée et quand elle s’est terminée.',
        '- Si tu nous soutiens par un don sur Ko-fi (Ko-fi Labs Limited, Royaume-Uni) : Ko-fi nous donne ton nom ou ton nom d’utilisateur, ton e-mail, le montant et le message que tu écris. Nous les utilisons pour gérer ton don et te remercier, sur la base de l’intérêt légitime (art. 6.1.f), et pour respecter nos obligations fiscales (art. 6.1.c). Nous ne les lions jamais à ton identifiant ni à rien de ce que tu fais dans l’app. Ko-fi et celui qui traite le paiement (PayPal ou Stripe) traitent tes données pour leur propre compte, selon leurs propres politiques.',
      ],
    },
    {
      heading: 'Ce que voit ton groupe',
      paragraphs: [
        'Dans une salle nominative, ton groupe voit dans la révélation ce que tu as voté, combien ont deviné ton vote et tes réactions, et à la fin ton classement et les titres de la partie, qui viennent des votes, des prédictions et des réactions. Dans une salle anonyme, personne ne voit ton vote ni ta prédiction : seulement combien ont choisi chaque option et, si moins de 3 personnes ont voté, même pas cela. Quand tu votes seul·e, personne ne voit ton vote : seulement le décompte mondial, sans noms, à partir de 20 réponses.',
        'Tout joueur peut partager hors de la salle une carte avec le résultat : la carte personnelle ne montre pas les pseudos des autres sauf si la personne qui la partage le choisit, et celle du groupe ne montre que la répartition, sans noms.',
      ],
    },
    {
      heading: 'Mineurs',
      paragraphs: [
        'Pour jouer, il faut avoir au moins 16 ans dans l’Espace économique européen et 18 ans dans le reste du monde. Les joueurs de 16 et 17 ans ne jouent qu’à des dilemmes adaptés à leur âge, n’entrent pas dans les salles avec des dilemmes +18 et leurs publicités ne sont jamais personnalisées. Si l’âge que tu déclares n’atteint pas le minimum, nous ne gardons que ton année de naissance, le mois si tu l’as donné, ta région, la date à laquelle tu as ouvert l’app pour la dernière fois, ton code pour les demandes et la trace de ta première visite, pour que tu ne puisses pas jouer sur cet appareil, et nous les supprimons après 24 mois sans ouvrir l’app. Si nous apprenons par un autre moyen qu’une personne n’a pas l’âge minimum, nous supprimons ses données.',
      ],
    },
    {
      heading: 'Décisions automatisées',
      paragraphs: [
        'L’app ne te laisse pas jouer si l’âge que tu déclares n’atteint pas le minimum de ta région ou si tu es dans un pays où elle n’est pas disponible. Si tu penses que c’est une erreur, écris-nous et une personne l’examinera. Nous ne prenons aucune autre décision automatisée à ton sujet.',
      ],
    },
    {
      heading: 'Avec qui nous partageons tes données',
      paragraphs: [
        'Nous ne vendons pas tes données. Elles sont traitées pour notre compte, sous contrat et uniquement pour fournir le service, par Google Cloud et Firebase (Google), qui hébergent l’app, sa base de données et la connexion ; Hostinger, qui héberge notre messagerie et envoie nos e-mails ; et Anthropic, qui traduit dans ta langue l’explication d’une décision de modération. Le gestionnaire de cookies est celui de Google, et le réseau publicitaire et ses partenaires traitent leurs cookies en tant que responsables pour leur propre compte, uniquement si tu l’acceptes. Nous pouvons aussi devoir communiquer des données aux autorités lorsque la loi l’exige.',
        'Si TheLever change de titulaire, par exemple en devenant une société, tes données passeront au nouveau titulaire pour continuer à te fournir le même service, avec les mêmes finalités et garanties (art. 21 de la LOPDGDD). Nous te préviendrons dans l’app avant le changement et tu pourras nous demander de les supprimer avant.',
      ],
    },
    {
      heading: 'Transferts hors de l’Espace économique européen',
      paragraphs: [
        'Google et Anthropic peuvent traiter des données aux États-Unis : Google, en vertu du cadre de protection des données UE-États-Unis et des clauses contractuelles types de la Commission européenne ; Anthropic, sur la base de ces mêmes clauses, qui font partie de son contrat. Hostinger conserve notre messagerie dans l’Union européenne.',
      ],
    },
    {
      heading: 'Combien de temps nous gardons tes données',
      paragraphs: [
        '- Ce que tu réponds dans une partie : moins de 24 heures après la fermeture de la salle.',
        '- Tes « Bon dilemme » et la marque indiquant que tu as voté seul·e : jusqu’à ce que tu demandes la suppression de tes données, t’y opposes ou passes 24 mois sans ouvrir l’app.',
        '- Ton âge, ta région, ton code pour les demandes et ce que tu as accepté : tant que tu utilises l’app et, si tu supprimes tes données, une trace minimale de ce que tu as accepté pendant 3 ans.',
        '- Les données d’usage avec ton identifiant : 13 mois ; ensuite, seulement des totaux qui ne t’identifient pas.',
        '- Les signalements, les notifications de contenu illicite, les décisions de modération et leurs avis, tes demandes avec nos réponses et le registre de tes suppressions : 3 ans. Si tu supprimes tes données, les signalements et les notifications que tu as faits n’ont plus aucun lien avec toi.',
        '- Tes choix de cookies : ce que fixe le gestionnaire de cookies de Google, 13 mois au maximum.',
        '- Les données d’un don : le temps qu’exige la loi fiscale, en général 4 ans.',
        '- Ce que nous supprimons reste quelques jours dans les sauvegardes : 7 jours dans les nôtres et jusqu’à 180 dans celles de Firebase. Entre-temps, rien n’en est fait.',
      ],
    },
    {
      heading: 'Tes droits',
      paragraphs: [
        'Tu peux demander l’accès à tes données, les rectifier, les supprimer, en limiter l’usage, les emporter et t’opposer à leur traitement. Dans Réglages → Confidentialité et données, tu peux toi-même :',
        '- Dans « Tes autorisations », retirer le consentement du jeu quand tu veux, sans effet sur ce qui a déjà été traité : tu ne pourras plus créer de salle ni entrer dans une salle jusqu’à ce que tu le redonnes, et nous supprimons ce que tu as répondu dans les parties qui n’ont pas encore été supprimées ; tes « Bon dilemme » et les marques de tes votes en solo restent. Tu peux aussi t’opposer à l’analyse d’usage.',
        '- Dans « Supprimer mes données », les supprimer : ton téléphone redevient comme neuf tout de suite et nous supprimons tout ce qui est lié à ton identifiant en quelques heures, et en un mois au maximum, sauf la trace minimale de ce que tu as accepté et celle de ta suppression.',
        'Si tu retires le consentement ou supprimes tes données, ton pseudo devient « Joueur » dans les salles encore conservées.',
        'Pour tout le reste, comme demander une copie de tes données ou corriger ton âge, écris à privacidad@thelever.app avec le code que tu vois dans Réglages → Confidentialité et données → Tes données : comme tu joues sans compte, c’est ce qui nous permet de savoir que la demande vient de toi, et sans lui nous ne pouvons pas la traiter. Si tu nous as seulement signalé quelque chose depuis le site, écris-nous depuis l’e-mail que tu nous as donné. Nous répondons en un mois au maximum.',
        'Si tu penses que nous n’avons pas bien traité tes données, tu peux saisir l’Agence espagnole de protection des données (aepd.es) ou l’autorité de ton pays.',
      ],
    },
    {
      heading: 'Si tu es hors de l’Union européenne',
      paragraphs: [
        'Pour l’instant, TheLever n’est pas disponible au Royaume-Uni. Aux États-Unis, nous ne vendons pas tes données personnelles et ne les partageons pas à des fins publicitaires sans ton consentement, et nous respectons le signal Global Privacy Control de ton navigateur comme un refus des publicités personnalisées.',
      ],
    },
    {
      heading: 'Sécurité et modifications',
      paragraphs: [
        'Nous chiffrons les données en transit et au repos, en limitons l’accès au minimum, ne gardons pas ton IP dans nos bases de données et supprimons les parties automatiquement. En cas de violation qui te concerne, nous te préviendrions et préviendrions l’AEPD lorsque la loi l’exige.',
        'Si nous modifions cette politique de façon importante, nous te le dirons dans l’app avant que cela ne te concerne, et si la modification nécessite ton consentement, nous te le redemanderons.',
      ],
    },
  ],
};

/** The cookies policy of the app: what it keeps on the device, which its privacy policy links to. */
export const appCookies: OwnPage = {
  title: 'Cookies de l’app',
  description:
    'Ce que l’app TheLever garde sur ton appareil, pourquoi et comment changer ce que tu acceptes.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Ce que c’est',
      paragraphs: [
        'Les cookies sont de petits fichiers qu’un site ou une app garde dans ton navigateur et relit ensuite. Cette politique appelle aussi « cookies » les technologies similaires, comme le stockage local du navigateur, que l’app utilise presque toujours.',
      ],
    },
    {
      heading: 'Ce qu’elle garde sans te demander',
      paragraphs: [
        'Seulement l’indispensable pour que le jeu fonctionne ou pour se souvenir de ce que tu choisis, que la loi ne soumet pas au consentement (art. 22.2 de la LSSI espagnole). Presque tout appartient à TheLever. Ce qui appartient à Firebase et à reCAPTCHA Enterprise, de Google, nous fournit la connexion et protège le service des programmes automatiques, et ce que tu réponds dans le gestionnaire de cookies est gardé par le gestionnaire de Google.',
      ],
      table: {
        headers: ['Nom', 'De qui', 'Pourquoi', 'Durée'],
        rows: [
          [
            'firebaseLocalStorageDb',
            'Firebase Authentication (Google)',
            'Ta session : l’identifiant anonyme de ton appareil',
            'Jusqu’à ce que tu supprimes tes données ou celles du navigateur',
          ],
          [
            'firebase-app-check-database',
            'Firebase App Check (Google)',
            'La preuve que les requêtes viennent de la vraie app, et non d’un programme automatique',
            'Quelques heures ; ensuite, une nouvelle est demandée',
          ],
          [
            'firebase-heartbeat-database',
            'Firebase (Google)',
            'Les jours où le SDK de Firebase a été utilisé et sa version, que Google reçoit pour maintenir son service',
            'Jusqu’à ce que tu supprimes les données du navigateur',
          ],
          [
            '_GRECAPTCHA (sur google.com)',
            'reCAPTCHA Enterprise (Google)',
            'Évaluer le risque que la personne qui utilise l’app soit un programme automatique',
            '6 mois',
          ],
          ['thelever.language', 'TheLever', 'La langue que tu as choisie', 'Idem'],
          ['thelever.muted', 'TheLever', 'Si tu as coupé le son', 'Idem'],
          [
            'thelever.cookieConsentAnswered',
            'TheLever',
            'Que tu as déjà répondu au gestionnaire de cookies',
            'Idem',
          ],
          [
            'thelever.personalisedAds',
            'TheLever',
            'Si les publicités peuvent être personnalisées, selon ce que tu as accepté',
            'Idem',
          ],
          [
            'thelever.lastNickname',
            'TheLever',
            'Le dernier pseudo avec lequel tu as joué, pour te le proposer',
            'Idem',
          ],
          [
            'thelever.playedDilemmas',
            'TheLever',
            'Les dilemmes que tu as joués, sans tes votes, pour ne pas te les répéter',
            'Idem',
          ],
          [
            'thelever.worldVote.…',
            'TheLever',
            'Ce que tu as voté et prédit seul·e, pour te montrer le résultat mondial',
            'Idem',
          ],
          [
            'thelever.installOfferClosedAt et thelever.lastFinishedGameAt',
            'TheLever',
            'Quand tu as fermé l’offre d’installer l’app et quand tu as fini ta dernière partie, pour ne pas te la reproposer trop tôt',
            'Idem',
          ],
          [
            'thelever.supportCardClosed',
            'TheLever',
            'Que tu as fermé la carte pour soutenir TheLever',
            'Idem',
          ],
          [
            'thelever.accessCode',
            'TheLever',
            'Le code d’accès, tant que l’app n’est pas ouverte à tous',
            'Jusqu’à ce que tu supprimes les données du navigateur',
          ],
          [
            'thelever.toldAnonymous',
            'TheLever',
            'Que nous t’avons déjà prévenu·e que la salle est anonyme',
            'Jusqu’à ce que tu fermes l’onglet',
          ],
          [
            'FCCDCF',
            'Gestionnaire de cookies de Google',
            'Garder ce que tu réponds dans le gestionnaire',
            '13 mois',
          ],
        ],
      },
    },
    {
      heading: 'Ce qui demande ton consentement',
      paragraphs: [
        'Tout le reste, et seulement si tu l’acceptes dans le gestionnaire de cookies de Google, qui te le demande à ta première visite :',
        '- Les statistiques du gestionnaire lui-même (FCNEC, de Google, 365 jours).',
        '- Les publicités. Aujourd’hui, l’app n’en montre aucune. Quand elle en montrera, Google AdSense et ses partenaires utiliseront des cookies pour les montrer et les mesurer et, si tu as 18 ans ou plus et que tu l’acceptes, pour les personnaliser ; si ton navigateur envoie le signal Global Privacy Control, elles ne sont pas personnalisées. Elles ne sont jamais choisies à partir de ce que tu votes, et avant qu’elles n’arrivent, cette politique ajoutera leurs cookies.',
        'Nous n’utilisons pas de cookies d’analyse : ce que nous mesurons de l’usage, c’est notre serveur qui l’enregistre, comme l’explique la politique de confidentialité de l’app. Le SDK de Firebase garde, lui, les jours où il a été utilisé et sa version, comme l’indique le tableau, sans rien de ce que tu fais dans le jeu.',
      ],
    },
    {
      heading: 'Comment changer ce que tu acceptes',
      paragraphs: [
        'Dans Réglages → Confidentialité et données → Cookies et publicités, tu rouvres le gestionnaire de cookies de Google et changes ce que tu as accepté aussi facilement que la première fois.',
        'Le reste, tu le supprimes avec Réglages → Confidentialité et données → Supprimer mes données, qui remet ton téléphone à neuf : si tu joues sans compte, l’app te traitera comme un nouvel appareil. Ce que gardent Firebase App Check, le SDK de Firebase, reCAPTCHA et le gestionnaire de cookies, ainsi que le code d’accès, reste jusqu’à son expiration ou jusqu’à ce que tu supprimes les données du navigateur dans ses réglages.',
      ],
    },
    {
      heading: 'Tiers et transferts',
      paragraphs: [
        'Firebase et reCAPTCHA Enterprise, de Google, traitent pour notre compte ta session et la vérification que tu utilises la vraie app. Google et les partenaires publicitaires que tu acceptes utilisent leurs cookies en tant que responsables pour leur propre compte ; le gestionnaire de cookies suit le cadre de transparence et de consentement d’IAB Europe et te montre qui ils sont et à quoi chacun utilise tes données.',
        'Google peut traiter des données hors de l’Espace économique européen, en vertu du cadre de protection des données UE-États-Unis et des clauses contractuelles types de la Commission européenne.',
      ],
    },
    {
      heading: 'Plus d’informations',
      paragraphs: [
        'La façon dont nous traitons tes données se trouve dans la politique de confidentialité de l’app. Pour toute question, écris à privacidad@thelever.app.',
      ],
    },
  ],
};
