import type { OwnPage } from '../site-texts.ts';

const UPDATED = '19 novembre 2026';

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
        'Tout joueur peut signaler un dilemme depuis la partie, et notre équipe l’examine. Si tu enfreins ces conditions, nous pouvons remplacer ton pseudo par un pseudo générique ou t’empêcher d’accéder au service, et nous te dirons le motif, les faits, la règle appliquée et comment contester.',
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
        'Tu peux arrêter d’utiliser TheLever quand tu veux et nous demander de supprimer tes données en écrivant à privacidad@thelever.app. Si tu enfreins ces conditions de façon grave ou répétée, nous pouvons t’empêcher d’accéder au service, avec la motivation prévue dans la partie sur la modération.',
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
  updated: UPDATED,
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
        '- Pour jouer, avec ton consentement explicite (art. 6.1.a et 9.2.a RGPD) : ton pseudo et ton avatar ; tes votes, tes prédictions du vote des autres ou de la répartition du groupe, tes réactions et tes points ; si un dilemme portait sur toi ; l’ordre dans lequel tu as vu les options et le temps mis à répondre ; et tes « Bon dilemme », conservés à part de la salle.',
        '- Pour voter seul·e un dilemme du site, avec le même consentement : ton vote s’ajoute au résultat mondial sans que nous gardions ce que tu as voté, et seule reste une marque indiquant que tu as déjà voté ce dilemme, pour qu’il ne compte pas deux fois.',
        '- Pour ne pas te répéter les dilemmes, avec le même consentement : ton téléphone garde la liste des dilemmes que tu as joués, sans tes votes, et l’envoie quand tu entres dans une salle, qui ne l’utilise que pour préparer les parties et la supprime avec la salle.',
        '- Pour te reconnaître, en vertu des conditions d’utilisation (art. 6.1.b) : un identifiant anonyme de ton appareil et la date de ta dernière ouverture de l’app.',
        '- Pour respecter la loi sur l’âge (art. 6.1.c) : ton année de naissance et, dans certains cas seulement, le mois ; et ta région (Espace économique européen, reste du monde ou pays où TheLever n’est pas disponible), que nous déduisons de ton adresse IP avec une base de données sur notre propre serveur, IP Geolocation by DB-IP (db-ip.com, licence CC BY 4.0). TheLever ne garde pas ton IP ; notre fournisseur de connexion, Firebase Authentication (Google), l’enregistre quelques semaines pour la sécurité.',
        '- Pour pouvoir prouver ce que tu as accepté (art. 6.1.c et 7.1) : quelle version des conditions et du consentement tu as acceptée et quand.',
        '- Pour la publicité, avec ton consentement (art. 6.1.a RGPD et art. 22.2 LSSI) : les cookies et identifiants du réseau publicitaire, selon ce que tu choisis dans le gestionnaire de cookies de Google.',
        '- Pour modérer (obligation légale du règlement sur les services numériques et intérêt légitime à un service sûr, art. 6.1.c et 6.1.f) : le dilemme que tu signales, le motif et ton commentaire, sans dire à personne du groupe que tu l’as signalé.',
        '- Pour traiter tes demandes (art. 6.1.c) : ton e-mail et ce que tu nous demandes.',
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
        'Pour jouer, il faut avoir au moins 16 ans dans l’Espace économique européen et 18 ans dans le reste du monde. Les joueurs de 16 et 17 ans ne jouent qu’à des dilemmes adaptés à leur âge, n’entrent pas dans les salles avec des dilemmes +18 et leurs publicités ne sont jamais personnalisées. Si nous apprenons qu’une personne n’a pas l’âge minimum, nous supprimons ses données.',
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
        'Nous ne vendons pas tes données. Elles sont traitées pour notre compte, sous contrat et uniquement pour fournir le service, par Google Cloud et Firebase (Google), qui hébergent l’app, sa base de données et la connexion, et par Hostinger, qui héberge notre messagerie. Le gestionnaire de cookies est celui de Google, et le réseau publicitaire et ses partenaires traitent leurs cookies en tant que responsables pour leur propre compte, uniquement si tu l’acceptes. Nous pouvons aussi devoir communiquer des données aux autorités lorsque la loi l’exige.',
        'Si TheLever change de titulaire, par exemple en devenant une société, tes données passeront au nouveau titulaire pour continuer à te fournir le même service, avec les mêmes finalités et garanties (art. 21 de la LOPDGDD). Nous te préviendrons dans l’app avant le changement et tu pourras nous demander de les supprimer avant.',
      ],
    },
    {
      heading: 'Transferts hors de l’Espace économique européen',
      paragraphs: [
        'Google peut traiter des données aux États-Unis, dans le cadre du cadre de protection des données UE-États-Unis et des clauses contractuelles types de la Commission européenne.',
      ],
    },
    {
      heading: 'Combien de temps nous gardons tes données',
      paragraphs: [
        '- Ce que tu réponds dans une partie : moins de 24 heures après la fermeture de la salle.',
        '- Tes « Bon dilemme » et la marque indiquant que tu as voté seul·e : jusqu’à ce que tu demandes la suppression de tes données ou passes 24 mois sans ouvrir l’app.',
        '- Ton âge, ta région et ce que tu as accepté : tant que tu utilises l’app et, si tu supprimes tes données, une trace minimale de ce que tu as accepté pendant 3 ans.',
        '- Tes choix de cookies : ce que fixe le gestionnaire de cookies de Google, 13 mois au maximum.',
        '- Ce que nous supprimons reste quelques jours dans les sauvegardes : 7 jours dans les nôtres et jusqu’à 180 dans celles de Firebase. Entre-temps, rien n’en est fait.',
      ],
    },
    {
      heading: 'Tes droits',
      paragraphs: [
        'Tu peux demander l’accès à tes données, les rectifier, les supprimer, en limiter l’usage, les emporter et t’opposer à leur traitement, et retirer le consentement du jeu quand tu veux, sans effet sur ce qui a déjà été traité. Écris à privacidad@thelever.app ; comme tu joues sans compte, si nous ne pouvons pas vérifier que la demande vient de toi, nous te demanderons ce qu’il faut pour le faire. Nous répondons en un mois au maximum.',
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
