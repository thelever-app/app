import type { SiteTexts } from './site-texts.ts';

const UPDATED = '16. November 2026';

export const de: SiteTexts = {
  languageName: 'Deutsch',
  languageMenu: 'Sprache',
  languageMenuNote:
    'Bringt dich zu derselben Seite in der gewählten Sprache. Öffnest du die App von hier, öffnet sie sich in dieser Sprache.',
  homeLink: 'Startseite',
  someoneInYourGroup: 'jemand aus deiner Gruppe',
  categories: {
    'life-and-death': {
      name: 'Leben und Tod',
      description:
        'Dilemmas, bei denen Leben auf dem Spiel stehen: die Straßenbahn, das Rettungsboot und andere Entscheidungen ohne guten Ausweg.',
    },
    honesty: {
      name: 'Ehrlichkeit',
      description:
        'Wann man die Wahrheit sagt, wann man schweigt und was du verheimlichen würdest, vor wem und warum.',
    },
    loyalty: {
      name: 'Loyalität',
      description:
        'Freunde, Familie und Kollegen: wie weit du ihnen etwas schuldest, wenn es mit dem kollidiert, was du für richtig hältst.',
    },
    justice: {
      name: 'Gerechtigkeit',
      description:
        'Strafen, Belohnungen und Regeln: was gerecht ist, wenn Gesetz, Absicht und Ergebnis nicht übereinstimmen.',
    },
    'love-and-relationships': {
      name: 'Liebe und Beziehungen',
      description:
        'Partnerschaft, Eifersucht, Geheimnisse und Trennungen: Dilemmas darüber, was du für einen geliebten Menschen tun würdest.',
    },
    'work-and-money': {
      name: 'Arbeit und Geld',
      description:
        'Beförderungen, Gehälter, Gefallen und Abkürzungen: was du tun würdest, wenn Geld oder deine Karriere auf dem Spiel stehen.',
    },
    'technology-and-the-future': {
      name: 'Technologie und Zukunft',
      description:
        'Künstliche Intelligenz, Privatsphäre, Roboter und Genetik: Dilemmas, die vor kurzem noch Science-Fiction waren.',
    },
  },
  home: {
    title: 'TheLever: moralische Dilemmas für deine Gruppe',
    description:
      'Moralische Dilemmas für deine Leute: Alle stimmen geheim ab, sagen voraus, wie die anderen abstimmen, und dann findet ihr gemeinsam heraus, wer was denkt.',
    heading: 'Moralische Dilemmas für deine Leute',
    intro:
      'Alle stimmen geheim auf dem Handy ab, sagen voraus, wie die anderen abstimmen, und dann findet ihr gemeinsam heraus, wer was denkt. Kostenlos, ohne Installation.',
    createRoom: 'Raum erstellen',
    howToPlay: 'So wird gespielt',
    steps: [
      'Erstelle einen Raum und teile den Link oder den Code.',
      'In jeder Runde stimmt ihr alle geheim über dasselbe Dilemma ab und sagt die anderen voraus.',
      'Das Ergebnis wird aufgedeckt und ihr sprecht darüber. Am Ende gibt es die Titel des Spiels.',
    ],
    categories: 'Kategorien',
  },
  category: {
    heading: (name) => `Moralische Dilemmas: ${name}`,
    description: (name) => `Moralische Dilemmas zum Thema ${name}, für deine Gruppe auf TheLever.`,
    options: (count) => `${count} Optionen`,
    withArguments: 'Argumente zu jeder',
  },
  dilemma: {
    vote: 'Abstimmen und sehen, was die Welt tat',
    play: 'Mit meiner Gruppe spielen',
    worldResultLater:
      'Das Weltergebnis siehst du nach der Abstimmung, damit es deine Antwort nicht beeinflusst.',
    arguments: 'Argumente zu jeder Option',
    for: 'Dafür:',
    against: 'Dagegen:',
    byTheTeam: 'Text des TheLever-Teams.',
    moreOf: (name) => `Weitere Dilemmas: ${name}`,
  },
  gone: {
    title: 'Dieses Dilemma gibt es auf TheLever nicht mehr',
    heading: 'Dieses Dilemma gibt es auf TheLever nicht mehr',
    body: 'Wir haben es aus dem Katalog genommen. Wenn dir jemand diesen Link geschickt hat: Viele andere warten auf dich.',
    moreOf: (name) => `Dilemmas ansehen: ${name}`,
  },
  notFound: {
    title: 'Diese Seite gibt es nicht',
    heading: 'Diese Seite gibt es nicht',
    body: 'Vielleicht ist die Adresse falsch geschrieben. Von der Startseite aus erreichst du alle Dilemmas.',
  },
  footer: { label: 'Rechtliche Hinweise' },
  privacy: {
    title: 'Datenschutz',
    description:
      'Welche Daten die öffentliche Website von TheLever verarbeitet, wozu und welche Rechte du hast.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Wer verantwortlich ist',
        paragraphs: [
          'TheLever ist ein Projekt von Mario Villacorta García, Steuernummer 71320322J, Anschrift Calle Arrabal 24, 47130 Simancas (Valladolid), Spanien. Für alles rund um deine Daten schreib an privacidad@thelever.app. Wir antworten auf Spanisch und auf Englisch.',
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
        heading: 'Werbung und Cookies',
        paragraphs: [
          'Diese Website finanziert sich über Werbung von Google AdSense. Google und seine Partner verwenden Cookies, um Werbung anzuzeigen oder zu personalisieren, nur wenn du im Cookie-Manager zustimmst, der vor jeder Werbung erscheint; ohne Zustimmung siehst du nur eingeschränkte Werbung ohne Cookies. Keine Werbung erhält, was du in der App abstimmst.',
          'Google ist für das, was es mit diesen Cookies tut, selbst verantwortlich. Mehr dazu unter policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Mit wem wir deine Daten teilen',
        paragraphs: [
          'Wir verkaufen deine Daten nicht. Google Cloud verarbeitet sie in unserem Auftrag, mit Vertrag, nur um die Website zu hosten. Behörden müssen wir sie geben, wenn das Gesetz es verlangt.',
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
          'TheLever speichert nichts von deinem Besuch. Google bewahrt seine technischen Protokolle so lange auf, wie es für die Sicherheit des Dienstes nötig ist.',
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
  legalNotice: {
    title: 'Impressum',
    description: 'Wer hinter TheLever steht und die Bedingungen dieser Website.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Inhaber',
        paragraphs: [
          '- Inhaber: Mario Villacorta García.',
          '- Steuernummer (NIF): 71320322J.',
          '- Anschrift: Calle Arrabal 24, 47130 Simancas (Valladolid), Spanien.',
          '- E-Mail: privacidad@thelever.app.',
          '- Website und App: thelever.app.',
          '- Tätigkeit: kostenloses Online-Spiel, finanziert durch Werbung.',
        ],
      },
      {
        heading: 'Datenschutz',
        paragraphs: [
          'Wie wir auf dieser Website Daten verarbeiten, steht in der Datenschutzerklärung. Die App erklärt ihre eigene vor dem Spielen, und für ihre Nutzung gelten ihre Nutzungsbedingungen, die beim Einstieg akzeptiert werden.',
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
};
