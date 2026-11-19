import type { SiteTexts } from './site-texts.ts';

const UPDATED = '17. November 2026';

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
};
