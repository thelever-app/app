import type { OwnPage } from '../site-texts.ts';

const UPDATED = '19. November 2026';

/** The terms of use of the app, version 1, which the first access asks to accept. */
export const terms: OwnPage = {
  title: 'Nutzungsbedingungen',
  description:
    'Die Bedingungen, um TheLever zu spielen: wer spielen darf, wie es funktioniert und welche Regeln gelten.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Wer den Dienst anbietet',
      paragraphs: [
        'TheLever ist ein Dienst von {owner}. Die vollständigen Angaben stehen im Impressum. Für alles schreib an privacidad@thelever.app: Wir antworten auf Spanisch und Englisch.',
      ],
    },
    {
      heading: 'Was TheLever ist',
      paragraphs: [
        'TheLever ist ein kostenloses Spiel, um in der Gruppe moralische Dilemmas im Browser zu spielen. Es wird mit Werbung bezahlt. Mit diesen Bedingungen schließt du eine Vereinbarung mit uns; wie wir deine Daten verarbeiten, erklärt die Datenschutzerklärung der App.',
      ],
    },
    {
      heading: 'Wer spielen darf',
      paragraphs: [
        'Du musst mindestens 16 Jahre alt sein, wenn du im Europäischen Wirtschaftsraum bist, und 18, wenn du woanders bist. Ein falsches Alter anzugeben verstößt gegen diese Bedingungen.',
        'TheLever ist in einigen Ländern nicht verfügbar: in den Ländern, gegen die Sanktionen der Europäischen Union für das ganze Land gelten, in Russland, China, Brasilien und vorerst im Vereinigten Königreich.',
        'Du spielst ohne Konto, mit einer anonymen Kennung deines Geräts. Du bist für das verantwortlich, was darüber geschieht.',
      ],
    },
    {
      heading: 'Wie das Spiel funktioniert',
      paragraphs: [
        'In jedem Raum beantwortet die Gruppe dieselben Dilemmas gleichzeitig und erfährt das Ergebnis jedes einzelnen. In einem namentlichen Raum sehen alle, was jede Person gewählt hat; in einem anonymen Raum nur, wie viele jede Option gewählt haben. Was du in einem Spiel antwortest, wird innerhalb von 24 Stunden nach dem Schließen des Raums gelöscht.',
        'Dilemmas können harte Themen behandeln. Dilemmas ab 18 werden nur in Räumen mit Dilemmas ab 18 gespielt, die nur Personen ab 18 betreten können. Heikle Dilemmas, deren ehrliche Antwort dich vor jemandem im Raum bloßstellen kann, werden nur in anonymen Räumen gespielt und nur, wenn die Person, die den Raum leitet, sie einschaltet.',
      ],
    },
    {
      heading: 'Regeln',
      paragraphs: [
        'Wenn du TheLever nutzt, verpflichtest du dich, keine Spitznamen mit rechtswidrigen, hasserfüllten oder belästigenden Inhalten zu verwenden, die jemanden demütigen oder Daten anderer Personen enthalten; nicht zu versuchen, herauszufinden, was jede Person in einem anonymen Raum gewählt hat; und keine automatisierten Programme zu nutzen, den Dienst nicht zu überlasten, die Alters- oder Länderbeschränkungen nicht zu umgehen und nicht auf Daten oder Teile des Systems zuzugreifen, die nicht für dich bestimmt sind.',
      ],
    },
    {
      heading: 'Moderation und Meldungen',
      paragraphs: [
        'Alle Spielenden können ein Dilemma aus dem Spiel heraus melden, und unser Team prüft es. Wenn du gegen diese Bedingungen verstößt, können wir deinen Spitznamen durch einen allgemeinen ersetzen oder dir den Zugang sperren, und wir nennen dir den Grund, die Tatsachen, die angewandte Regel und wie du widersprechen kannst.',
        'Alle, ob sie spielen oder nicht, können rechtswidrige Inhalte melden, indem sie an privacidad@thelever.app schreiben; das ist auch die Kontaktstelle für Behörden.',
      ],
    },
    {
      heading: 'Werbung',
      paragraphs: [
        'TheLever zeigt Werbung, nie während du abstimmst, und die Werbung bekommt nie etwas von dem, was du wählst. Sie wird nur für Personen ab 18 personalisiert, die das im Cookie-Manager akzeptieren und deren Browser das Signal Global Privacy Control nicht sendet. Wir haften nicht für den Inhalt der Werbung oder der Websites, zu denen sie führt, aber du kannst uns jede unangemessene Werbung melden.',
      ],
    },
    {
      heading: 'Was uns gehört',
      paragraphs: [
        'Der Name und die Marke TheLever, ihr Design und die Dilemmas, die unser Team schreibt, gehören uns, sofern keine andere Lizenz angegeben ist. Der Code der App ist offen, unter der Lizenz AGPL-3.0, auf github.com/thelever-app. Die Avatare werden mit DiceBear erstellt.',
      ],
    },
    {
      heading: 'Verfügbarkeit und Haftung',
      paragraphs: [
        'TheLever ist kostenlos und wird so angeboten, wie es ist. Wir bemühen uns, dass es gut funktioniert, aber es kann Fehler oder Unterbrechungen haben, und wir können den Dienst ändern, pausieren oder einstellen; eine Einstellung kündigen wir mit angemessener Frist an.',
        'Wir haften nicht für Schäden, die nicht auf Vorsatz oder grober Fahrlässigkeit beruhen, soweit das Gesetz es erlaubt. Nichts davon schränkt deine Rechte aus dem Verbraucherrecht ein. Du bist für die Spitznamen verantwortlich, die du verwendest.',
      ],
    },
    {
      heading: 'Mit dem Spielen aufhören',
      paragraphs: [
        'Du kannst TheLever jederzeit nicht mehr nutzen und uns bitten, deine Daten zu löschen, indem du an privacidad@thelever.app schreibst. Wenn du schwer oder wiederholt gegen diese Bedingungen verstößt, können wir dir den Zugang sperren, mit der Begründung, die der Abschnitt zur Moderation vorsieht.',
      ],
    },
    {
      heading: 'Änderungen dieser Bedingungen',
      paragraphs: [
        'Wenn wir sie wesentlich ändern, sagen wir es dir in der App, und du musst sie erneut akzeptieren, bevor du weiterspielst. Wenn du sie nicht akzeptierst, kannst du uns bitten, deine Daten zu löschen.',
      ],
    },
    {
      heading: 'Anwendbares Recht',
      paragraphs: [
        'Diese Bedingungen unterliegen spanischem Recht. Als Verbraucherin oder Verbraucher kannst du vor den Gerichten deines Wohnorts klagen und behältst den Schutz des Verbraucherrechts deines Landes. Version 1.',
      ],
    },
  ],
};

/** The privacy policy of the app, which the game consent links to. */
export const appPrivacy: OwnPage = {
  title: 'Datenschutz der App',
  description:
    'Welche Daten die App von TheLever zum Spielen verarbeitet, auf welcher Grundlage, wie lange und welche Rechte du hast.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Wer verantwortlich ist',
      paragraphs: [
        'TheLever ist ein Projekt von {owner}. Für alles rund um deine Daten schreib an privacidad@thelever.app. Wir antworten auf Spanisch und Englisch.',
      ],
    },
    {
      heading: 'Das Wichtigste',
      paragraphs: [
        'Zum Spielen brauchen wir deine ausdrückliche Einwilligung, weil das, was du bei moralischen Dilemmas wählst, deine Überzeugungen und bei manchen Dilemmas etwas aus deinem Privatleben verraten kann. Was du in einem Spiel antwortest, wird innerhalb von 24 Stunden nach dem Schließen des Raums gelöscht. Wir nutzen deine Daten nicht für die Forschung und verkaufen sie an niemanden, und die Werbung bekommt nie, was du wählst.',
      ],
    },
    {
      heading: 'Welche Daten wir verarbeiten, wofür und auf welcher Grundlage',
      paragraphs: [
        '- Zum Spielen, mit deiner ausdrücklichen Einwilligung (Art. 6 Abs. 1 lit. a und Art. 9 Abs. 2 lit. a DSGVO): dein Spitzname und dein Avatar; deine Stimmen, deine Vorhersagen der Stimmen der anderen oder der Verteilung der Gruppe, deine Reaktionen und deine Punkte; ob ein Dilemma von dir handelte; die Reihenfolge, in der du die Optionen gesehen hast, und wie lange du zum Antworten gebraucht hast; und deine „Gutes Dilemma“, die getrennt vom Raum gespeichert werden.',
        '- Um ein Dilemma der Website allein abzustimmen, mit derselben Einwilligung: Deine Stimme zählt zum weltweiten Ergebnis, ohne dass wir speichern, was du gewählt hast; es bleibt nur ein Vermerk, dass du dieses Dilemma schon abgestimmt hast, damit es nicht doppelt zählt.',
        '- Damit sich Dilemmas nicht wiederholen, mit derselben Einwilligung: Dein Handy speichert die Liste der Dilemmas, die du gespielt hast, ohne deine Stimmen, und schickt sie, wenn du einen Raum betrittst; der Raum nutzt sie nur, um die Spiele zusammenzustellen, und löscht sie mit sich.',
        '- Um dich wiederzuerkennen, aufgrund der Nutzungsbedingungen (Art. 6 Abs. 1 lit. b): eine anonyme Kennung deines Geräts und wann du die App zuletzt geöffnet hast.',
        '- Um das Gesetz zum Alter einzuhalten (Art. 6 Abs. 1 lit. c): dein Geburtsjahr und nur in manchen Fällen der Monat; und deine Region (Europäischer Wirtschaftsraum, übrige Welt oder ein Land, in dem TheLever nicht verfügbar ist), die wir mit einer Datenbank auf unserem eigenen Server aus deiner IP-Adresse ableiten, IP Geolocation by DB-IP (db-ip.com, Lizenz CC BY 4.0). TheLever speichert deine IP nicht; unser Anmeldedienst, Firebase Authentication (Google), protokolliert sie einige Wochen lang zur Sicherheit.',
        '- Um nachweisen zu können, was du akzeptiert hast (Art. 6 Abs. 1 lit. c und Art. 7 Abs. 1): welche Version der Bedingungen und der Einwilligung du wann akzeptiert hast.',
        '- Für die Werbung, mit deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO und Art. 22.2 LSSI): die Cookies und Kennungen des Werbenetzwerks, je nachdem, was du im Cookie-Manager von Google wählst.',
        '- Zur Moderation (rechtliche Pflicht aus dem Gesetz über digitale Dienste und berechtigtes Interesse an einem sicheren Dienst, Art. 6 Abs. 1 lit. c und f): das Dilemma, das du meldest, der Grund und dein Kommentar, ohne dass jemand in der Gruppe erfährt, dass du es gemeldet hast.',
        '- Um deine Anfragen zu bearbeiten (Art. 6 Abs. 1 lit. c): deine E-Mail und dein Anliegen.',
      ],
    },
    {
      heading: 'Was deine Gruppe sieht',
      paragraphs: [
        'In einem namentlichen Raum sieht deine Gruppe bei der Auflösung, was du gewählt hast, wie viele deine Stimme erraten haben und deine Reaktionen, und am Ende deinen Platz und die Titel des Spiels, die aus den Stimmen, Vorhersagen und Reaktionen entstehen. In einem anonymen Raum sieht niemand deine Stimme oder deine Vorhersage: nur, wie viele jede Option gewählt haben, und wenn weniger als 3 Personen abgestimmt haben, nicht einmal das. Wenn du allein abstimmst, sieht niemand deine Stimme: nur die weltweite Zählung, ohne Namen, ab 20 Antworten.',
        'Alle Spielenden können außerhalb des Raums eine Karte mit dem Ergebnis teilen: Die persönliche zeigt die Spitznamen der anderen nur, wenn die teilende Person das auswählt, und die der Gruppe zeigt nur die Verteilung, ohne Namen.',
      ],
    },
    {
      heading: 'Minderjährige',
      paragraphs: [
        'Zum Spielen musst du im Europäischen Wirtschaftsraum mindestens 16 und in der übrigen Welt 18 Jahre alt sein. Spielende mit 16 und 17 Jahren spielen nur Dilemmas, die zu ihrem Alter passen, betreten keine Räume mit Dilemmas ab 18, und ihre Werbung wird nie personalisiert. Wenn wir erfahren, dass jemand das Mindestalter nicht erreicht, löschen wir seine Daten.',
      ],
    },
    {
      heading: 'Automatisierte Entscheidungen',
      paragraphs: [
        'Die App lässt dich nicht spielen, wenn das Alter, das du angibst, das Mindestalter deiner Region nicht erreicht oder wenn du in einem Land bist, in dem sie nicht verfügbar ist. Wenn du glaubst, dass das ein Fehler ist, schreib uns, und ein Mensch prüft es. Wir treffen keine andere automatisierte Entscheidung über dich.',
      ],
    },
    {
      heading: 'Mit wem wir deine Daten teilen',
      paragraphs: [
        'Wir verkaufen deine Daten nicht. Sie werden in unserem Auftrag, mit Vertrag und nur zur Erbringung des Dienstes verarbeitet, von Google Cloud und Firebase (Google), die die App, ihre Datenbank und die Anmeldung hosten, und von Hostinger, das unsere E-Mails hostet. Der Cookie-Manager ist der von Google, und das Werbenetzwerk und seine Partner verarbeiten ihre Cookies als eigene Verantwortliche, nur wenn du zustimmst. Außerdem müssen wir Daten an Behörden geben, wenn das Gesetz es verlangt.',
        'Wenn TheLever den Inhaber wechselt, zum Beispiel wenn es eine Gesellschaft wird, gehen deine Daten an den neuen Inhaber über, damit er dir weiter denselben Dienst bietet, mit denselben Zwecken und Garantien (Art. 21 LOPDGDD). Wir sagen es dir vorher in der App, und du kannst uns bitten, sie vorher zu löschen.',
      ],
    },
    {
      heading: 'Übermittlungen außerhalb des Europäischen Wirtschaftsraums',
      paragraphs: [
        'Google kann Daten in den Vereinigten Staaten verarbeiten, auf Grundlage des Datenschutzrahmens EU-USA und der Standardvertragsklauseln der Europäischen Kommission.',
      ],
    },
    {
      heading: 'Wie lange wir deine Daten speichern',
      paragraphs: [
        '- Was du in einem Spiel antwortest: weniger als 24 Stunden nach dem Schließen des Raums.',
        '- Deine „Gutes Dilemma“ und der Vermerk, dass du allein abgestimmt hast: bis du die Löschung deiner Daten verlangst oder 24 Monate die App nicht öffnest.',
        '- Dein Alter, deine Region und was du akzeptiert hast: solange du die App nutzt, und wenn du deine Daten löschst, ein minimaler Nachweis dessen, was du akzeptiert hast, für 3 Jahre.',
        '- Deine Cookie-Auswahl: was der Cookie-Manager von Google festlegt, höchstens 13 Monate.',
        '- Was wir löschen, bleibt einige Tage in den Sicherungen: 7 Tage in unseren und bis zu 180 in denen von Firebase. In der Zwischenzeit wird es für nichts genutzt.',
      ],
    },
    {
      heading: 'Deine Rechte',
      paragraphs: [
        'Du kannst Auskunft über deine Daten verlangen, sie berichtigen, löschen, ihre Nutzung einschränken, sie mitnehmen und ihrer Verarbeitung widersprechen und die Einwilligung zum Spiel jederzeit widerrufen, ohne dass das die bisherige Verarbeitung berührt. Schreib an privacidad@thelever.app; da du ohne Konto spielst, bitten wir dich, wenn wir nicht prüfen können, dass die Anfrage von dir stammt, um das, was wir dafür brauchen. Wir antworten innerhalb von höchstens einem Monat.',
        'Wenn du meinst, dass wir deine Daten nicht richtig behandelt haben, kannst du dich bei der spanischen Datenschutzbehörde (aepd.es) oder bei der Behörde deines Landes beschweren.',
      ],
    },
    {
      heading: 'Wenn du außerhalb der Europäischen Union bist',
      paragraphs: [
        'Vorerst ist TheLever im Vereinigten Königreich nicht verfügbar. In den Vereinigten Staaten verkaufen wir deine personenbezogenen Daten nicht und teilen sie ohne deine Einwilligung nicht für Werbung, und wir behandeln das Signal Global Privacy Control deines Browsers als Ablehnung personalisierter Werbung.',
      ],
    },
    {
      heading: 'Sicherheit und Änderungen',
      paragraphs: [
        'Wir verschlüsseln die Daten bei der Übertragung und im Ruhezustand, gewähren nur den nötigsten Zugriff, speichern deine IP nicht in unseren Datenbanken und löschen Spiele automatisch. Bei einer Datenpanne, die dich betrifft, informieren wir dich und die AEPD, wenn das Gesetz es verlangt.',
        'Wenn wir diese Erklärung wesentlich ändern, sagen wir es dir in der App, bevor es dich betrifft, und wenn die Änderung deine Einwilligung braucht, bitten wir dich erneut darum.',
      ],
    },
  ],
};
