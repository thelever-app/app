import { appCookies, appPrivacy, terms } from './legal/de.ts';
import type { SiteTexts } from './site-texts.ts';

const UPDATED = '23. November 2026';
const GUIDES_UPDATED = '26. November 2026';

export const de: SiteTexts = {
  languageName: 'Deutsch',
  languageMenu: 'Sprache',
  homeLink: 'Startseite',
  someoneInYourGroup: 'jemand aus deiner Gruppe',
  categories: {
    'life-and-death': {
      name: 'Leben und Tod',
      description:
        'Dilemmas, bei denen Leben auf dem Spiel stehen: die Straßenbahn, das Rettungsboot und andere Entscheidungen ohne guten Ausweg.',
      about: [
        'Es sind die ältesten Dilemmas der Moralphilosophie. Eine Straßenbahn ohne Bremsen, ein Rettungsboot mit zu wenigen Plätzen, ein Arzt mit fünf Patienten, die auf ein Organ warten. Sie zwingen dazu, zwischen Leben zu wählen, und lassen keinen sauberen Ausweg.',
        'Fast alle stellen zwei Denkweisen gegeneinander. Die eine schaut auf das Ergebnis und will so viele Menschen wie möglich retten. Die andere schaut darauf, was du mit deinen eigenen Händen tust, und hält daran fest, dass man manches niemandem antut, auch wenn die Bilanz am Ende aufgeht.',
        'In der Gruppe gespielt, zeigen sie etwas, das kein Einzeltest zeigt. Wer ohne zu zögern den Hebel umlegt, merkt, dass der beste Freund oder die beste Freundin das niemals tun würde, und das Gespräch danach dauert oft länger als die Partie.',
      ],
    },
    honesty: {
      name: 'Ehrlichkeit',
      description:
        'Wann man die Wahrheit sagt, wann man schweigt und was du verheimlichen würdest, vor wem und warum.',
      about: [
        'Lügen ist falsch, aber fast niemand sagt immer die Wahrheit. Diese Dilemmas erkunden die Grauzone dazwischen, die Notlüge, das Schweigen, das jemanden schützt, und die Wahrheit, die unnötig wehtut.',
        'Hinter jedem steht eine Grundfrage. Zählt mehr, was die andere Person weiß, oder wie sie sich fühlt? Manche halten die Wahrheit für eine Pflicht, die keine Ausnahmen kennt, andere für ein Werkzeug, mit dem man vorsichtig umgeht.',
        'Sie eignen sich perfekt, um herauszufinden, wo genau jede Person in deinem Freundeskreis die Grenze zieht, und um zu merken, dass sich diese Grenze verschiebt, je nachdem, wen man anlügen müsste.',
      ],
    },
    loyalty: {
      name: 'Loyalität',
      description:
        'Freunde, Familie und Kollegen: wie weit du ihnen etwas schuldest, wenn es mit dem kollidiert, was du für richtig hältst.',
      about: [
        'Loyalität verbindet uns mit der Familie, mit Freunden und mit dem Team. Schwierig wird es, wenn das, was du jemandem schuldest, mit dem kollidiert, was du für gerecht hältst, mit dem, was du einem fremden Menschen schuldest, oder mit dem, was du dir selbst schuldest.',
        'Würdest du einen Freund decken, der etwas Schlimmes getan hat? Würdest du deinen Bruder anzeigen? Diese Dilemmas testen, wie weit diese Bindungen reichen und was du für sie zu opfern bereit wärst.',
        'In einem Freundeskreis haben sie eine eigenartige Wirkung. Du stimmst geheim ab, was du für sie tun würdest, und siehst danach, mit ihnen vor dir, was sie für dich tun würden.',
      ],
    },
    justice: {
      name: 'Gerechtigkeit',
      description:
        'Strafen, Belohnungen und Regeln: was gerecht ist, wenn Gesetz, Absicht und Ergebnis nicht übereinstimmen.',
      about: [
        'Gerechtigkeit scheint einfach, bis Gesetz, Absicht und Ergebnis nicht mehr übereinstimmen. Jemand stiehlt, um die eigene Familie zu ernähren, eine gerechte Regel führt zu einer absurden Strafe, eine schuldige Person kommt wegen einer Formalität davon.',
        'Diese Dilemmas stellen verschiedene Vorstellungen von Gerechtigkeit gegeneinander. Für die einen heißt das, die Regeln für alle gleich anzuwenden; für andere, allen zu geben, was sie verdienen; und für wieder andere, den Schaden wiedergutzumachen, statt die Person zu bestrafen, die ihn verursacht hat.',
        'Sie sorgen bei der Auflösung für die meisten Diskussionen, denn fast alle glauben genau zu wissen, was gerecht ist, bis sie die Begründung von jemandem hören, der das Gegenteil gewählt hat.',
      ],
    },
    'love-and-relationships': {
      name: 'Liebe und Beziehungen',
      description:
        'Partnerschaft, Eifersucht, Geheimnisse und Trennungen: Dilemmas darüber, was du für einen geliebten Menschen tun würdest.',
      about: [
        'Partnerschaft, Eifersucht, Geheimnisse, Trennungen und Freundschaften, die kompliziert werden. Neben einer Straßenbahn ohne Bremsen wirken diese Dilemmas klein, aber genau ihnen begegnen wir wirklich im Leben.',
        'Sie stellen Ehrlichkeit gegen Rücksicht, die eigene Freiheit gegen die Verpflichtung gegenüber dem anderen Menschen und das, was du fühlst, gegen das, was du glaubst, fühlen zu müssen.',
        'Sie mit deinen Leuten zu spielen, hat etwas Riskantes, und genau das macht den Reiz aus. Du stimmst geheim ab, aber ihr versucht alle zu erraten, wer was gewählt hat.',
      ],
    },
    'work-and-money': {
      name: 'Arbeit und Geld',
      description:
        'Beförderungen, Gehälter, Gefallen und Abkürzungen: was du tun würdest, wenn Geld oder deine Karriere auf dem Spiel stehen.',
      about: [
        'Beförderungen, Gehälter, Gefallen, Fehler der Firma zu deinen Gunsten und Leute im Team, die sich auf Kosten anderer Vorteile verschaffen. Geld und Karriere stellen Prinzipien auf die Probe, die in der Theorie unerschütterlich wirken.',
        'Einige dieser Dilemmas haben eine aus der Spieltheorie bekannte Struktur. Wenn alle kooperieren, gewinnen alle, aber wer die anderen ausnutzt, gewinnt noch mehr. Vertraust du den anderen oder schützt du dich?',
        'Mit ihnen findest du heraus, wer in der Gruppe zu viel erhaltenes Geld zurückgeben würde, wer knallhart verhandeln würde und wer aus Prinzip eine Firma verlassen würde.',
      ],
    },
    'technology-and-the-future': {
      name: 'Technologie und Zukunft',
      description:
        'Künstliche Intelligenz, Privatsphäre, Roboter und Genetik: Dilemmas, die vor kurzem noch Science-Fiction waren.',
      about: [
        'Künstliche Intelligenz, Privatsphäre, autonome Autos, Genom-Editierung und ein immer längeres Leben. Bis vor kurzem war das Science-Fiction, heute sind es Entscheidungen, die jemand gerade trifft.',
        'Diese Dilemmas stellen neue Fragen mit alten Werkzeugen. Soll ein autonomes Auto die Menschen im Wagen schützen oder die auf der Straße? Würdest du deine Geheimnisse einer Maschine anvertrauen, die dich besser versteht als irgendwer sonst?',
        'Auf viele gibt es noch keine Antwort, die die Mehrheit teilt, deshalb kann das Ergebnis deiner Gruppe so spannend sein wie das jeder Umfrage.',
      ],
    },
  },
  home: {
    title: 'TheLever: moralische Dilemmas für deine Gruppe',
    description:
      'Moralische Dilemmas für deine Leute: Alle stimmen geheim ab, sagen voraus, wie die anderen abstimmen, und dann findet ihr gemeinsam heraus, wer was denkt.',
    heading: 'Moralische Dilemmas für deine Leute',
    intro:
      'Alle stimmen geheim auf dem Handy ab, sagen voraus, wie die anderen abstimmen, und dann findet ihr gemeinsam heraus, wer was denkt. Kostenlos, ohne Installation.',
    play: 'Jetzt spielen',
    scene: 'La Palanca winkt neben einer Weiche',
    howToPlay: 'So wird gespielt',
    steps: [
      {
        title: 'Erstelle den Raum',
        text: 'Teile den Link oder den Code und lass deine Leute herein.',
      },
      {
        title: 'Stimme ab und sag voraus',
        text: 'In jeder Runde stimmt ihr alle geheim über dasselbe Dilemma ab und sagt die anderen voraus.',
      },
      {
        title: 'Findet heraus, wer was denkt',
        text: 'Das Ergebnis wird aufgedeckt und ihr sprecht darüber. Am Ende gibt es die Titel des Spiels.',
      },
    ],
    screens: {
      roomCode: 'Raumcode',
      share: 'Link teilen',
      round: 'Dilemma 2 von 6',
      dilemma: 'Würdest du lügen, um den Job eines Freundes zu retten?',
      yes: 'Ja, ich würde lügen',
      no: 'Nein, ich würde die Wahrheit sagen',
      private: 'Niemand aus der Gruppe sieht deine Stimme',
      result: '3 von 5 sagten Ja',
      yesCount: 'Ja · 3',
      noCount: 'Nein · 2',
      right: 'Ana und Luis richtig erraten',
    },
    categories: 'Kategorien',
  },
  category: {
    heading: (name) => `Moralische Dilemmas: ${name}`,
    description: (name) => `Moralische Dilemmas zum Thema ${name}, für deine Gruppe auf TheLever.`,
  },
  dilemma: {
    vote: 'Abstimmen und sehen, was die Welt tat',
    play: 'Mit meiner Gruppe spielen',
    worldResultLater:
      'Das Weltergebnis siehst du nach der Abstimmung, damit es deine Antwort nicht beeinflusst.',
    atStake: 'Was auf dem Spiel steht',
    arguments: 'Argumente zu jeder Option',
    for: 'Dafür:',
    against: 'Dagegen:',
    byTheTeam: 'Text des TheLever-Teams.',
    ad: 'Anzeige',
    moreOf: (name) => `Weitere Dilemmas: ${name}`,
  },
  gone: {
    title: 'Dieses Dilemma gibt es auf TheLever nicht mehr',
    heading: 'Dieses Dilemma gibt es auf TheLever nicht mehr',
    body: 'Wir haben es aus dem Katalog genommen.',
    moreOf: (name) => `Dilemmas ansehen: ${name}`,
  },
  notFound: {
    title: 'Diese Seite gibt es nicht',
    heading: 'Diese Seite gibt es nicht',
    body: 'Vielleicht ist die Adresse falsch geschrieben. Von der Startseite aus erreichst du alle Dilemmas.',
  },
  footer: { label: 'Rechtliche Hinweise', manageCookies: 'Cookies verwalten' },
  support: {
    link: 'TheLever unterstützen',
    heading: 'TheLever ist kostenlos',
    text: 'Eine einzige Person betreibt es. Wenn es dir gefällt, kannst du es mit einer Spende unterstützen; sie bringt dir im Spiel keinen Vorteil.',
    line: 'Hat es dich zum Nachdenken gebracht? TheLever ist kostenlos und wird von einer einzigen Person betrieben. Eine Spende bringt dir im Spiel keinen Vorteil.',
  },
  guidesHeading: 'Mehr erfahren',
  guides: {
    trolleyProblem: {
      title: 'Was ist das Trolley-Problem',
      description:
        'Das Trolley-Problem, woher es kommt, seine bekanntesten Varianten und was Philosophie und Psychologie daraus gelernt haben.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Das Dilemma',
          paragraphs: [
            'Eine Straßenbahn ohne Bremsen fährt auf fünf Menschen zu, die an die Gleise gefesselt sind. Du stehst neben einem Hebel, der sie auf ein anderes Gleis umleitet, wo sich nur eine Person befindet. Wenn du nichts tust, sterben fünf. Wenn du den Hebel ziehst, stirbt eine. Was tust du?',
            'So gestellt, sagen die meisten Menschen, dass sie den Hebel ziehen würden. Fünf Menschen auf Kosten von einem zu retten, scheint das Vernünftigste zu sein. Spannend wird das Dilemma, wenn man die Details verändert und dieselben Menschen ihre Meinung ändern.',
          ],
        },
        {
          heading: 'Woher es kommt',
          paragraphs: [
            'Die britische Philosophin Philippa Foot stellte es 1967 in einem Aufsatz über die Lehre von der Doppelwirkung vor. In ihrer Version entscheidet der Fahrer der Straßenbahn, der auf das eine oder das andere Gleis lenken kann. Foot fragte damit, ob es moralisch einen Unterschied macht, einen Schaden zu verursachen oder ihn geschehen zu lassen.',
            'Die US-amerikanische Philosophin Judith Jarvis Thomson gab ihm 1976 in einem Aufsatz den Namen, unter dem es bekannt ist, „the trolley problem“. Sie war es auch, die den Hebel einer unbeteiligten Person in die Hand gab und die berühmteste Variante vorschlug, die mit der Brücke.',
          ],
        },
        {
          heading: 'Die Variante mit der Brücke',
          paragraphs: [
            'Diesmal gibt es keinen Hebel. Du stehst auf einer Brücke über den Gleisen, neben einer sehr korpulenten Person. Wenn du sie hinunterstößt, hält ihr Körper die Straßenbahn auf und rettet die fünf Menschen. Diese Person stirbt.',
            'Die Zahlen sind dieselben wie vorher, eins gegen fünf. Trotzdem sagen die meisten Menschen, dass sie nicht stoßen würden. Zu erklären, warum uns zwei Fälle mit demselben Ergebnis so verschieden vorkommen, ist seit Jahrzehnten eines der großen Probleme der Ethik.',
          ],
        },
        {
          heading: 'Die zwei großen Antworten',
          paragraphs: [
            '- Der Konsequentialismus, vor allem der Utilitarismus, beurteilt eine Handlung nach ihren Folgen. Wenn weniger Menschen sterben, ist die Entscheidung besser, beim Hebel genauso wie auf der Brücke.',
            '- Die Pflichtethik, deren bekanntester Vertreter Immanuel Kant ist, hält daran fest, dass man einem Menschen manches nicht antun darf, auch wenn das Ergebnis besser wäre, etwa ihn bloß als Mittel zu benutzen. Die Straßenbahn umzulenken, kann vertretbar sein, jemanden hinunterzustoßen, um sie aufzuhalten, dagegen nicht.',
            'Die Lehre von der Doppelwirkung, die auf Thomas von Aquin zurückgeht, bietet einen Mittelweg. Beim Hebel ist der Tod der Person auf dem anderen Gleis eine vorhergesehene, aber nicht beabsichtigte Folge. Auf der Brücke ist der Tod der gestoßenen Person das Mittel, um die anderen zu retten.',
          ],
        },
        {
          heading: 'Was die Psychologie sagt',
          paragraphs: [
            '2001 veröffentlichten der Psychologe Joshua Greene und sein Team in der Zeitschrift Science eine Studie mit Magnetresonanztomografie. Dilemmas, in denen man jemandem mit den eigenen Händen schaden muss, wie das mit der Brücke, aktivierten die mit Emotionen verbundenen Hirnregionen stärker als unpersönliche Dilemmas wie das mit dem Hebel.',
            '2018 veröffentlichte das Projekt Moral Machine des MIT in Nature die Ergebnisse eines Online-Experiments über autonome Autos, mit Millionen von Entscheidungen von Menschen aus mehr als zweihundert Ländern und Gebieten. Es fand Vorlieben, die fast überall auf der Welt geteilt werden, etwa mehr Menschen zu retten, und bei anderen deutliche Unterschiede zwischen den Kulturen.',
          ],
        },
        {
          heading: 'Warum es immer noch wichtig ist',
          paragraphs: [
            'Das Trolley-Problem ist ein Gedankenexperiment. Niemand rechnet damit, je an einem Gleis vor einem Hebel zu stehen, aber die Fragen, die es stellt, tauchen in echten Entscheidungen auf, etwa wenn knappe Mittel in einem Krankenhaus verteilt werden oder wenn programmiert wird, wie ein autonomes Auto auf einen unvermeidlichen Unfall reagiert.',
            'Auf TheLever kannst du Varianten des Trolley-Problems und Hunderte weitere Dilemmas mit deiner Gruppe spielen, geheim abstimmen und danach herausfinden, wer was denkt. Die Kategorie „Leben und Tod“ versammelt die, die dem ursprünglichen Dilemma am nächsten sind.',
          ],
        },
      ],
    },
    playingInAGroup: {
      title: 'Moralische Dilemmas in der Gruppe spielen',
      description:
        'Wie eine Partie TheLever abläuft, wie viele Leute ihr braucht, welche Stimmung ihr wählt und wie ihr das Beste aus der Diskussion herausholt.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Was ihr braucht',
          paragraphs: [
            'Ein Handy pro Person, sonst nichts. TheLever läuft im Browser, du musst also nichts installieren und kein Konto anlegen. Es reicht, wenn eine Person den Raum erstellt und den Link oder den Code teilt.',
            'Spielen können zwei bis fünfzig Personen. Zu viert oder zu fünft ist die Diskussion persönlicher, und in einer großen Gruppe überrascht das Ergebnis jeder Runde mehr.',
          ],
        },
        {
          heading: 'So läuft eine Partie ab',
          paragraphs: [
            '- Wer den Raum erstellt, wählt die Stimmung und die Zahl der Runden, von einer bis zwölf. Standardmäßig sind es acht.',
            '- In jeder Runde erscheint auf allen Handys dasselbe Dilemma. Alle stimmen geheim ab.',
            '- Außer abzustimmen, sagen alle voraus, wie der Rest der Gruppe abgestimmt hat.',
            '- Wenn alle abgestimmt haben, kommt die Auflösung. Ihr seht, was die Gruppe gewählt hat und wer richtig vorausgesagt hat, und die Diskussion beginnt.',
            '- Am Ende der Partie bekommt jede Person einen Titel, je nachdem, wie sie abgestimmt und wie sie die anderen vorausgesagt hat.',
          ],
        },
        {
          heading: 'Welche Stimmung ihr wählt',
          paragraphs: [
            '- Klassisch bietet Dilemmas für jede Gruppe. Das ist die beste Wahl für den Anfang oder wenn du mit Leuten spielst, die du nicht gut kennst.',
            '- Pikant nimmt Themen für Erwachsene dazu. Nur ab 18 Jahren.',
            '- Ohne Filter bringt zusätzlich heikle Fragen. In diesem Raum sieht niemand, wer was abstimmt.',
          ],
        },
        {
          heading: 'Das Beste aus der Diskussion herausholen',
          paragraphs: [
            'Das Beste am Spiel ist nicht die Abstimmung, sondern was danach kommt. Wenn sich die Gruppe teilt, bitte je eine Person von jeder Seite, ihre Begründung in einem Satz zu erklären. Fast immer taucht ein Detail des Dilemmas auf, das der anderen Seite nicht aufgefallen war.',
            'Es gibt keine richtigen Antworten. Jedes Dilemma hat auf seiner Seite die besten Argumente für und gegen jede Option, falls die Diskussion ins Stocken gerät oder ihr wissen wollt, was die Philosophie dazu sagt.',
            'Die Vorhersagen bringen eine zweite Ebene ins Spiel. Richtig zu erraten, was dein bester Freund oder deine beste Freundin abstimmt, ist schwieriger, als es scheint, und danebenzuliegen sorgt oft für das beste Gespräch des Abends.',
          ],
        },
        {
          heading: 'Für wen es gedacht ist',
          paragraphs: [
            'TheLever ist für Menschen ab 16 Jahren. Es funktioniert bei einem Abendessen mit Freunden, im Philosophie- oder Ethikunterricht, bei einem Teamevent oder in einem Videocall mit Leuten, die weit weg wohnen.',
          ],
        },
      ],
    },
    about: {
      title: 'Wer hinter TheLever steht',
      description:
        'Wer TheLever macht, wie seine Dilemmas entstehen, wie es finanziert wird und wie du uns schreiben kannst.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Eine einzige Person',
          paragraphs: [
            'Hinter TheLever steht eine einzige Person, die es gestaltet, programmiert und seine Dilemmas auswählt. Es ist ein unabhängiges Projekt, ohne Investoren und ohne Firma dahinter.',
            'Es entstand aus einer einfachen Idee. Moralische Dilemmas sind viel spannender, wenn du sie mit deinen Leuten diskutierst, als wenn du sie allein in einem Test beantwortest.',
          ],
        },
        {
          heading: 'Wie die Dilemmas entstehen',
          paragraphs: [
            'Jedes Dilemma im Katalog wird vor der Veröffentlichung von Hand geprüft. Einige sind Versionen von Klassikern der Philosophie, etwa die Straßenbahn oder der Ring des Gyges; die meisten sind Alltagssituationen, die für TheLever geschrieben wurden.',
            'Die Argumente für und gegen jede Option werden mit Hilfe künstlicher Intelligenz verfasst und einzeln auf Spanisch geprüft. Die Übersetzungen in die anderen Sprachen entstehen mit künstlicher Intelligenz.',
            'Die Argumente sagen nie, welche Option die richtige ist. Sie sollen dir helfen, den besten Grund für jede Position zu verstehen, auch für die Option, die du nicht wählen würdest.',
          ],
        },
        {
          heading: 'Wie es finanziert wird',
          paragraphs: [
            'TheLever ist kostenlos und bleibt es auch. Es finanziert sich durch freiwillige Spenden und später auch durch Werbung. Eine Spende bringt dir im Spiel keinen Vorteil.',
          ],
        },
        {
          heading: 'So erreichst du uns',
          paragraphs: [
            'Bei Fragen zu deinen Daten schreib an privacidad@thelever.app. Alle Angaben zum Verantwortlichen findest du auf den Seiten Datenschutz und Impressum, die in der Fußzeile jeder Seite verlinkt sind.',
          ],
        },
      ],
    },
  },
  privacy: {
    title: 'Datenschutz',
    description:
      'Welche Daten die öffentliche Website von TheLever verarbeitet, wozu und welche Rechte du hast.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Wer verantwortlich ist',
        paragraphs: [
          'TheLever ist ein Projekt von {owner}. Für alles rund um deine Daten schreib an privacidad@thelever.app. Wir antworten auf Spanisch und auf Englisch.',
        ],
      },
      {
        heading: 'Welche Daten wir auf dieser Website verarbeiten',
        paragraphs: [
          'Diese Website zeigt nur Dilemmas: Sie hat keine Konten, keine Formulare und keine eigenen Cookies und fragt dich nach keinen Daten.',
          'Um dir jede Seite zu senden, erhält unser Hosting-Anbieter Google Cloud (Firebase Hosting und Cloud Run), was dein Browser bei jedem Besuch sendet: deine IP-Adresse, deinen Browser und die angefragte Seite. Er nutzt das nur, um dir die Seite auszuliefern und sie vor Missbrauch zu schützen, auf Grundlage unseres berechtigten Interesses an einem sicheren Dienst (Art. 6 Abs. 1 lit. f DSGVO). TheLever speichert deine IP-Adresse nicht in seinen Protokollen.',
        ],
      },
      {
        heading: 'Die App',
        paragraphs: [
          'Wenn du ein Dilemma abstimmen oder mit deiner Gruppe spielen möchtest, wechselst du zur App von TheLever, die dir vor dem Spielen erklärt, wie sie deine Daten verarbeitet, und um deine Einwilligung bittet.',
        ],
      },
      {
        heading: 'Spenden',
        paragraphs: [
          'Wenn du uns mit einer Spende auf Ko-fi unterstützt (Ko-fi Labs Limited, Vereinigtes Königreich), gibt uns Ko-fi deinen Namen oder Nutzernamen, deine E-Mail, den Betrag und die Nachricht, die du schreibst. Wir nutzen sie, um deine Spende abzuwickeln und dir zu danken, aufgrund berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO), und um unsere steuerlichen Pflichten zu erfüllen (Art. 6 Abs. 1 lit. c), und speichern sie so lange, wie das Steuerrecht es verlangt, in der Regel 4 Jahre. Wir verbinden sie nie mit irgendetwas, das du in der App tust. Ko-fi und wer die Zahlung abwickelt (PayPal oder Stripe) verarbeiten deine Daten in eigener Verantwortung, nach ihren eigenen Richtlinien.',
        ],
      },
      {
        heading: 'Werbung und Cookies',
        paragraphs: [
          'Die Seiten der Dilemmas zeigen Werbung von Google AdSense. Bevor Cookies verwendet werden, fragt dich der Cookie-Manager von Google, was du akzeptierst, und Google verwendet sie nur mit deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO und Art. 22 Abs. 2 LSSI). Wenn du nicht zustimmst, siehst du nur eingeschränkte Werbung ohne Cookies.',
          'Die Werbung wird nur personalisiert, wenn du zustimmst: Auf dieser Website, die nicht nach deinem Alter fragt, hängt das nur davon ab. Wenn dein Browser das Signal Global Privacy Control sendet, wird die Werbung nicht personalisiert, auch wenn du zustimmst. TheLever gibt weder Google noch seinen Partnern weiter, was du in der App abstimmst.',
          'Beim Laden der Werbung erhält Google, auch wenn du nichts akzeptierst, deine IP-Adresse, die Daten deines Browsers und die Seite, die du besuchst. Wir erlauben das aufgrund unseres berechtigten Interesses, ein kostenloses Spiel mit Werbung zu finanzieren (Art. 6 Abs. 1 lit. f DSGVO), und für diese Erhebung sind wir gemeinsam mit Google verantwortlich. Was Google und seine Partner danach mit diesen Daten und mit ihren Cookies tun, verantworten sie selbst, je nachdem, was du akzeptierst, und nach den Datenschutzbedingungen von Google Ads (business.safety.google/adscontrollerterms). Welche Cookies das sind und wie du änderst, was du akzeptierst, steht in der Cookie-Richtlinie; Google erklärt es unter policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Mit wem wir deine Daten teilen',
        paragraphs: [
          'Wir verkaufen deine Daten nicht. Google Cloud verarbeitet sie in unserem Auftrag, mit Vertrag, nur um die Website zu hosten. Google AdSense und seine Partner erhalten sie als eigenständige Verantwortliche, wie im Abschnitt zur Werbung erklärt. Behörden müssen wir sie geben, wenn das Gesetz es verlangt.',
        ],
      },
      {
        heading: 'Übermittlungen außerhalb des Europäischen Wirtschaftsraums',
        paragraphs: [
          'Google kann Daten außerhalb des Europäischen Wirtschaftsraums verarbeiten, auf Grundlage des EU-US-Datenschutzrahmens und der Standardvertragsklauseln der Europäischen Kommission.',
        ],
      },
      {
        heading: 'Wie lange wir sie speichern',
        paragraphs: [
          'TheLever speichert nichts von deinem Besuch. Google bewahrt seine technischen Protokolle so lange auf, wie es für die Sicherheit des Dienstes nötig ist, und jedes Cookie bleibt so lange bestehen, wie es die Cookie-Richtlinie angibt.',
        ],
      },
      {
        heading: 'Deine Rechte',
        paragraphs: [
          'Du kannst Auskunft über deine Daten verlangen, sie berichtigen, löschen, ihre Nutzung einschränken, sie mitnehmen oder der Verarbeitung widersprechen, indem du an privacidad@thelever.app schreibst. Wir antworten innerhalb von höchstens einem Monat.',
          'Wenn du meinst, dass wir deine Daten nicht richtig behandelt haben, kannst du dich bei der spanischen Datenschutzbehörde (aepd.es) oder der Behörde deines Landes beschweren.',
        ],
      },
      {
        heading: 'Änderungen dieser Erklärung',
        paragraphs: [
          'Wenn wir sie wesentlich ändern, sagen wir es auf dieser Seite, bevor es dich betrifft.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookies',
    description:
      'Welche Cookies auf der öffentlichen Website von TheLever verwendet werden, wozu und wie du änderst, was du akzeptierst.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Was sie sind',
        paragraphs: [
          'Cookies sind kleine Dateien, die eine Website in deinem Browser speichert und später wieder ausliest. Diese Richtlinie nennt auch ähnliche Technologien „Cookies“, etwa den lokalen Speicher des Browsers.',
        ],
      },
      {
        heading: 'Welche diese Website verwendet',
        paragraphs: [
          'TheLever setzt auf keiner Seite dieser Website eigene Cookies. Sie werden von Google AdSense gesetzt, das die Werbung anzeigt, und vom Cookie-Manager von Google, der dich fragt, was du akzeptierst. Alle stammen von Google als Drittanbieter und werden nur auf den Seiten der Dilemmas geladen: Die Startseite, die Kategorien und die rechtlichen Seiten haben weder Werbung noch Cookies.',
        ],
      },
      {
        heading: 'Welche keine Einwilligung brauchen',
        paragraphs: [
          'Nur die, die deine Wahl speichern, um sie zu respektieren, ohne dich auf jeder Seite erneut danach zu fragen: was du im Cookie-Manager antwortest (FCCDCF) und, wenn du Werbung mit Cookies nicht akzeptierst, dass du sie nicht akzeptierst (__gpi_optout).',
        ],
      },
      {
        heading: 'Welche deine Einwilligung brauchen',
        paragraphs: [
          'Alle anderen, und Google verwendet sie nur, wenn du im Cookie-Manager zustimmst:',
          '- Um die Werbung anzuzeigen und zu messen: Informationen auf deinem Gerät speichern und auslesen, begrenzen, wie oft du eine Anzeige siehst, messen, wie sie funktioniert, und Betrug verhindern. Wenn du dem nicht zustimmst, siehst du nur eingeschränkte Werbung ohne Cookies.',
          '- Um die Werbung nach deinen Interessen zu personalisieren. Auf dieser Website, die nicht nach deinem Alter fragt, hängt das nur davon ab, dass du zustimmst. Wenn dein Browser das Signal Global Privacy Control sendet, wird die Werbung nicht personalisiert, auch wenn du zustimmst. Sie wird nie anhand dessen ausgewählt, was du in der App abstimmst.',
          'Google kann ähnliche Informationen auch im lokalen Speicher des Browsers speichern, für dieselben Zwecke und mit derselben Einwilligung.',
        ],
      },
      {
        heading: 'Cookie-Tabelle',
        paragraphs: [
          'Die Namen, die Zwecke und die Laufzeiten sind die, die Google unter business.safety.google/adscookies veröffentlicht, wo seine vollständige Liste steht.',
        ],
        table: {
          headers: ['Cookie', 'Von wem', 'Wozu', 'Laufzeit'],
          rows: [
            [
              'FCCDCF',
              'Cookie-Manager von Google',
              'Speichern, was du im Cookie-Manager antwortest',
              '13 Monate',
            ],
            ['FCNEC', 'Cookie-Manager von Google', 'Statistiken des Cookie-Managers', '365 Tage'],
            ['__gads', 'Google AdSense', 'Werbung und Sicherheit', '13 Monate'],
            ['__gpi', 'Google AdSense', 'Werbung und Sicherheit', '13 Monate'],
            [
              '__gpi_optout',
              'Google AdSense',
              'Sich merken, dass du Werbung mit Cookies nicht akzeptierst',
              '13 Monate',
            ],
            ['__eoi', 'Google AdSense', 'Sicherheit', '6 Monate'],
            [
              'TESTCOOKIESENABLED',
              'Google AdSense',
              'Prüfen, ob dein Browser Cookies akzeptiert',
              '60 Sekunden',
            ],
            ['IDE', 'Google (doubleclick.net)', 'Werbung und Sicherheit', '13 Monate'],
            [
              'id',
              'Google (doubleclick.net)',
              'Werbung, Sicherheit und Funktionsfähigkeit',
              '13 Monate',
            ],
            [
              'DSID',
              'Google (doubleclick.net)',
              'Werbung, Sicherheit und Funktionsfähigkeit',
              '2 Wochen',
            ],
            [
              'test_cookie',
              'Google (doubleclick.net)',
              'Prüfen, ob dein Browser Cookies akzeptiert',
              '15 Minuten',
            ],
          ],
        },
      },
      {
        heading: 'Wie du änderst, was du akzeptierst',
        paragraphs: [
          'Auf jeder Seite eines Dilemmas, mit „Cookies verwalten“ in der Fußzeile: Damit öffnest du erneut den Cookie-Manager von Google, wo du deine Einwilligung so einfach widerrufen oder ändern kannst, wie du sie gegeben hast.',
          'Du kannst Cookies auch in den Einstellungen deines Browsers löschen oder blockieren.',
        ],
      },
      {
        heading: 'Drittanbieter und Übermittlungen',
        paragraphs: [
          'Google und die Werbepartner, die du akzeptierst, verwenden ihre Cookies als eigenständige Verantwortliche. Der Cookie-Manager folgt dem Transparency and Consent Framework von IAB Europe und zeigt dir, wer diese Partner sind und wozu jeder von ihnen deine Daten verwendet.',
          'Google kann Daten außerhalb des Europäischen Wirtschaftsraums verarbeiten, auf Grundlage des EU-US-Datenschutzrahmens und der Standardvertragsklauseln der Europäischen Kommission. Google erklärt es unter policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Weitere Informationen',
        paragraphs: [
          'Wie wir deine Daten verarbeiten, steht in der Datenschutzerklärung. Bei Fragen schreib an privacidad@thelever.app.',
        ],
      },
    ],
  },
  legalNotice: {
    title: 'Impressum',
    description: 'Wer hinter TheLever steht und die Bedingungen dieser Website.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Inhaber',
        paragraphs: [
          '- Inhaber: {owner}.',
          '- Steuernummer (NIF): {taxId}.',
          '- Anschrift: {address}, Spanien.',
          '- E-Mail: privacidad@thelever.app.',
          '- Website und App: thelever.app.',
          '- Tätigkeit: kostenloses Online-Spiel, finanziert durch Werbung.',
        ],
      },
      {
        heading: 'Datenschutz',
        paragraphs: [
          'Wie wir auf dieser Website Daten verarbeiten, steht in der Datenschutzerklärung, und welche Cookies sie verwendet, in der Cookie-Richtlinie. Die App erklärt ihre eigene vor dem Spielen, und für ihre Nutzung gelten ihre Nutzungsbedingungen, die beim Einstieg akzeptiert werden.',
        ],
      },
      {
        heading: 'Geistiges Eigentum',
        paragraphs: [
          'Die Marke TheLever, ihr Design und die Dilemmas und Argumente unseres Teams gehören ihrem Inhaber, sofern keine andere Lizenz angegeben ist. Der Code der App und dieser Website ist freie Software unter der Lizenz AGPL-3.0.',
        ],
      },
      {
        heading: 'Links und Werbung',
        paragraphs: [
          'Wir kontrollieren weder die Werbung noch die Websites, auf die sie verlinkt. Ist etwas davon rechtswidrig oder unangemessen, sag uns Bescheid, und wir entfernen es, sobald wir davon erfahren.',
        ],
      },
      {
        heading: 'Rechtswidrige Inhalte',
        paragraphs: [
          'Rechtswidrige Inhalte kannst du per E-Mail an privacidad@thelever.app melden. Das ist auch die Kontaktstelle für Behörden und Nutzer nach dem Gesetz über digitale Dienste (Art. 11 und 12), auf Spanisch und auf Englisch.',
        ],
      },
      {
        heading: 'Anwendbares Recht',
        paragraphs: [
          'Spanisches Recht. Als Verbraucher behältst du die Rechte, die dir die Vorschriften deines Landes geben.',
        ],
      },
    ],
  },
  terms,
  appPrivacy,
  appCookies,
};
