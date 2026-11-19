import type { SiteTexts } from './site-texts.ts';

const UPDATED = '17 novembre 2026';

export const it: SiteTexts = {
  languageName: 'Italiano',
  languageMenu: 'Lingua',
  homeLink: 'Home',
  someoneInYourGroup: 'qualcuno del tuo gruppo',
  categories: {
    'life-and-death': {
      name: 'Vita e morte',
      description:
        'Dilemmi in cui sono in gioco delle vite: il tram, la scialuppa di salvataggio e altre scelte senza una via d’uscita buona.',
    },
    honesty: {
      name: 'Onestà',
      description: 'Quando dire la verità, quando tacere e cosa nasconderesti, a chi e perché.',
    },
    loyalty: {
      name: 'Lealtà',
      description:
        'Amici, famiglia e colleghi: fin dove arriva ciò che devi loro quando si scontra con ciò che ritieni giusto.',
    },
    justice: {
      name: 'Giustizia',
      description:
        'Punizioni, premi e regole: cosa è giusto quando la legge, l’intenzione e il risultato non coincidono.',
    },
    'love-and-relationships': {
      name: 'Amore e relazioni',
      description:
        'Coppia, gelosia, segreti e rotture: dilemmi su ciò che faresti per qualcuno che ami.',
    },
    'work-and-money': {
      name: 'Lavoro e denaro',
      description:
        'Promozioni, stipendi, favori e scorciatoie: cosa faresti quando sono in gioco i soldi o la tua carriera.',
    },
    'technology-and-the-future': {
      name: 'Tecnologia e futuro',
      description:
        'Intelligenza artificiale, privacy, robot e genetica: dilemmi che fino a poco fa erano fantascienza.',
    },
  },
  home: {
    title: 'TheLever: dilemmi morali da giocare con il tuo gruppo',
    description:
      'Dilemmi morali da giocare con la tua gente: ognuno vota in segreto, prevede cosa voteranno gli altri e poi scoprite insieme chi pensa cosa.',
    heading: 'Dilemmi morali da giocare con la tua gente',
    intro:
      'Ognuno vota in segreto dal proprio telefono, prevede cosa voteranno gli altri e poi scoprite insieme chi pensa cosa. Gratis, senza installare nulla.',
    play: 'Gioca ora',
    scene: 'La Palanca che saluta accanto a uno scambio ferroviario',
    howToPlay: 'Come si gioca',
    steps: [
      {
        title: 'Crea la stanza',
        text: 'Condividi il link o il codice e fai entrare la tua gente.',
      },
      {
        title: 'Vota e prevedi',
        text: 'A ogni turno votate tutti lo stesso dilemma in segreto e prevedete gli altri.',
      },
      {
        title: 'Scoprite chi pensa cosa',
        text: 'Si svela il risultato e ne parlate. Alla fine, i titoli della partita.',
      },
    ],
    screens: {
      roomCode: 'Codice della stanza',
      share: 'Condividi il link',
      round: 'Dilemma 2 di 6',
      dilemma: 'Mentiresti per salvare il lavoro di un amico?',
      yes: 'Sì, mentirei',
      no: 'No, direi la verità',
      private: 'Nessuno del gruppo vedrà il tuo voto',
      result: '3 su 5 hanno detto sì',
      yesCount: 'Sì · 3',
      noCount: 'No · 2',
      right: 'Hai indovinato Ana e Luis',
    },
    categories: 'Categorie',
  },
  category: {
    heading: (name) => `Dilemmi morali: ${name.toLowerCase()}`,
    description: (name) =>
      `Dilemmi morali su ${name.toLowerCase()} da giocare con il tuo gruppo su TheLever.`,
    options: (count) => `${count} opzioni`,
    withArguments: 'argomenti per ciascuna',
  },
  dilemma: {
    vote: 'Vota e scopri cosa ha fatto il mondo',
    play: 'Giocalo con il mio gruppo',
    worldResultLater:
      'Il risultato mondiale si vede dopo aver votato, perché non influenzi la tua risposta.',
    arguments: 'Argomenti di ogni opzione',
    for: 'A favore:',
    against: 'Contro:',
    byTheTeam: 'Testo del team di TheLever.',
    ad: 'Pubblicità',
    moreOf: (name) => `Altri dilemmi: ${name.toLowerCase()}`,
  },
  gone: {
    title: 'Questo dilemma non è più su TheLever',
    heading: 'Questo dilemma non è più su TheLever',
    body: 'Lo abbiamo tolto dal catalogo.',
    moreOf: (name) => `Vedi i dilemmi: ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'Questa pagina non esiste',
    heading: 'Questa pagina non esiste',
    body: 'Forse l’indirizzo è scritto male. Dalla home arrivi a tutti i dilemmi.',
  },
  footer: { label: 'Informazioni legali', manageCookies: 'Gestisci cookie' },
  privacy: {
    title: 'Privacy',
    description:
      'Quali dati tratta il sito pubblico di TheLever, per cosa e quali sono i tuoi diritti.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Chi è il titolare',
        paragraphs: [
          'TheLever è un progetto di {owner}. Per qualsiasi questione sui tuoi dati, scrivi a privacidad@thelever.app. Rispondiamo in spagnolo e in inglese.',
        ],
      },
      {
        heading: 'Quali dati trattiamo su questo sito',
        paragraphs: [
          'Questo sito mostra soltanto dilemmi: non ha account, moduli né cookie propri, e non ti chiede alcun dato.',
          'Per inviarti ogni pagina, il nostro fornitore di hosting, Google Cloud (Firebase Hosting e Cloud Run), riceve ciò che il tuo browser invia a ogni visita: il tuo indirizzo IP, il tuo browser e la pagina richiesta. Lo usa solo per consegnarti la pagina e proteggerla da abusi, per il nostro legittimo interesse ad avere un servizio sicuro (art. 6.1.f GDPR). TheLever non conserva il tuo indirizzo IP nei propri registri.',
        ],
      },
      {
        heading: 'L’app',
        paragraphs: [
          'Se scegli di votare un dilemma o di giocarlo con il tuo gruppo, passi all’app di TheLever, che prima di giocare ti spiega come tratta i tuoi dati e ti chiede il consenso.',
        ],
      },
      {
        heading: 'Pubblicità e cookie',
        paragraphs: [
          'Le pagine dei dilemmi mostrano annunci di Google AdSense. Prima di usare i cookie, il gestore dei cookie di Google ti chiede cosa accetti, e Google li usa solo con il tuo consenso (art. 6.1.a GDPR e art. 22.2 LSSI). Se non accetti, vedi solo annunci limitati, senza cookie.',
          'Gli annunci vengono personalizzati solo se lo accetti: su questo sito, che non chiede la tua età, dipende solo da questo. Se il tuo browser invia il segnale Global Privacy Control, gli annunci non vengono personalizzati anche se lo accetti. TheLever non dà né a Google né ai suoi partner ciò che voti nell’app.',
          'Quando si caricano gli annunci, anche se non accetti nulla, Google riceve il tuo indirizzo IP, i dati del tuo browser e la pagina che visiti. Lo consentiamo sulla base del nostro legittimo interesse a finanziare con la pubblicità un gioco gratuito (art. 6.1.f GDPR), e di questa raccolta rispondiamo insieme a Google. Ciò che Google e i suoi partner fanno poi con quei dati e con i loro cookie è responsabilità loro, come titolari autonomi del trattamento, in base a ciò che accetti e ai termini sulla protezione dei dati di Google Ads (business.safety.google/adscontrollerterms). Quali sono i cookie e come cambiare ciò che accetti è spiegato nell’informativa sui cookie; Google lo spiega su policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Con chi condividiamo i tuoi dati',
        paragraphs: [
          'Non vendiamo i tuoi dati. Google Cloud li tratta per nostro conto, con contratto, solo per ospitare il sito. Google AdSense e i suoi partner li ricevono come titolari autonomi del trattamento, come spiega la sezione sulla pubblicità. Possiamo anche doverli fornire alle autorità quando la legge lo impone.',
        ],
      },
      {
        heading: 'Trasferimenti fuori dallo Spazio economico europeo',
        paragraphs: [
          'Google può trattare dati fuori dallo Spazio economico europeo, sulla base del quadro UE-USA per la protezione dei dati personali e delle clausole contrattuali tipo della Commissione europea.',
        ],
      },
      {
        heading: 'Per quanto tempo li conserviamo',
        paragraphs: [
          'TheLever non conserva nulla della tua visita. Google conserva i suoi registri tecnici per il tempo necessario alla sicurezza del servizio, e ogni cookie dura quanto indicato nell’informativa sui cookie.',
        ],
      },
      {
        heading: 'I tuoi diritti',
        paragraphs: [
          'Puoi chiedere di accedere ai tuoi dati, rettificarli, cancellarli, limitarne l’uso, portarli con te od opporti al loro trattamento scrivendo a privacidad@thelever.app. Rispondiamo entro un mese al massimo.',
          'Se ritieni che non abbiamo trattato bene i tuoi dati, puoi presentare reclamo all’Agenzia spagnola per la protezione dei dati (aepd.es) o all’autorità del tuo paese.',
        ],
      },
      {
        heading: 'Modifiche a questa informativa',
        paragraphs: [
          'Se la cambiamo in modo importante, lo diremo in questa pagina prima che ti riguardi.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookie',
    description:
      'Quali cookie si usano sul sito pubblico di TheLever, per cosa e come cambiare ciò che accetti.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Cosa sono',
        paragraphs: [
          'I cookie sono piccoli file che un sito salva nel tuo browser e poi rilegge. Questa informativa chiama «cookie» anche le tecnologie simili, come l’archiviazione locale del browser.',
        ],
      },
      {
        heading: 'Quelli che usa questo sito',
        paragraphs: [
          'TheLever non installa cookie propri in nessuna pagina di questo sito. Li installano Google AdSense, che mostra gli annunci, e il gestore dei cookie di Google, che ti chiede cosa accetti. Sono tutti di Google, come terza parte, e vengono caricati solo nelle pagine dei dilemmi: la home, le categorie e le pagine legali non hanno annunci né cookie.',
        ],
      },
      {
        heading: 'Quelli che non richiedono il tuo consenso',
        paragraphs: [
          'Solo quelli che salvano la tua scelta, per rispettarla senza chiedertela di nuovo a ogni pagina: ciò che rispondi nel gestore dei cookie (FCCDCF) e, se non accetti la pubblicità con cookie, che non la accetti (__gpi_optout).',
        ],
      },
      {
        heading: 'Quelli che richiedono il tuo consenso',
        paragraphs: [
          'Tutti gli altri, e Google li usa solo se lo accetti nel gestore dei cookie:',
          '- Per mostrare e misurare gli annunci: salvare e leggere informazioni sul tuo dispositivo, limitare quante volte vedi un annuncio, misurare come funziona e prevenire le frodi. Se non lo accetti, vedi solo annunci limitati, senza cookie.',
          '- Per personalizzare gli annunci in base ai tuoi interessi. Su questo sito, che non chiede la tua età, dipende solo dal fatto che tu lo accetti. Se il tuo browser invia il segnale Global Privacy Control, gli annunci non vengono personalizzati anche se lo accetti. Non vengono mai scelti in base a ciò che voti nell’app.',
          'Google può anche salvare informazioni simili nell’archiviazione locale del browser, per le stesse finalità e con lo stesso consenso.',
        ],
      },
      {
        heading: 'Tabella dei cookie',
        paragraphs: [
          'I nomi, le finalità e le durate sono quelli pubblicati da Google su business.safety.google/adscookies, dove si trova il suo elenco completo.',
        ],
        table: {
          headers: ['Cookie', 'Di chi', 'A cosa serve', 'Durata'],
          rows: [
            [
              'FCCDCF',
              'Gestore dei cookie di Google',
              'Salvare ciò che rispondi nel gestore',
              '13 mesi',
            ],
            ['FCNEC', 'Gestore dei cookie di Google', 'Statistiche del gestore', '365 giorni'],
            ['__gads', 'Google AdSense', 'Annunci e sicurezza', '13 mesi'],
            ['__gpi', 'Google AdSense', 'Annunci e sicurezza', '13 mesi'],
            [
              '__gpi_optout',
              'Google AdSense',
              'Ricordare che non accetti annunci con cookie',
              '13 mesi',
            ],
            ['__eoi', 'Google AdSense', 'Sicurezza', '6 mesi'],
            [
              'TESTCOOKIESENABLED',
              'Google AdSense',
              'Verificare se il tuo browser accetta i cookie',
              '60 secondi',
            ],
            ['IDE', 'Google (doubleclick.net)', 'Annunci e sicurezza', '13 mesi'],
            ['id', 'Google (doubleclick.net)', 'Annunci, sicurezza e funzionamento', '13 mesi'],
            [
              'DSID',
              'Google (doubleclick.net)',
              'Annunci, sicurezza e funzionamento',
              '2 settimane',
            ],
            [
              'test_cookie',
              'Google (doubleclick.net)',
              'Verificare se il tuo browser accetta i cookie',
              '15 minuti',
            ],
          ],
        },
      },
      {
        heading: 'Come cambiare ciò che accetti',
        paragraphs: [
          'In qualsiasi pagina di un dilemma, con «Gestisci cookie» in fondo alla pagina: riapre il gestore dei cookie di Google, dove puoi revocare o cambiare il tuo consenso con la stessa facilità con cui lo hai dato.',
          'Puoi anche cancellare o bloccare i cookie nelle impostazioni del tuo browser.',
        ],
      },
      {
        heading: 'Terze parti e trasferimenti',
        paragraphs: [
          'Google e i partner pubblicitari che accetti usano i loro cookie come titolari autonomi del trattamento. Il gestore dei cookie segue il Transparency and Consent Framework di IAB Europe e ti mostra chi sono questi partner e per cosa ciascuno usa i tuoi dati.',
          'Google può trattare dati fuori dallo Spazio economico europeo, sulla base del quadro UE-USA per la protezione dei dati personali e delle clausole contrattuali tipo della Commissione europea. Lo spiega su policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Maggiori informazioni',
        paragraphs: [
          'Come trattiamo i tuoi dati è spiegato nell’informativa sulla privacy. Per qualsiasi domanda, scrivi a privacidad@thelever.app.',
        ],
      },
    ],
  },
  legalNotice: {
    title: 'Note legali',
    description: 'Chi c’è dietro TheLever e le condizioni di questo sito.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Titolare',
        paragraphs: [
          '- Titolare: {owner}.',
          '- NIF: {taxId}.',
          '- Domicilio: {address}, Spagna.',
          '- Email: privacidad@thelever.app.',
          '- Sito e app: thelever.app.',
          '- Attività: gioco online gratuito finanziato dalla pubblicità.',
        ],
      },
      {
        heading: 'Privacy',
        paragraphs: [
          'Come trattiamo i dati su questo sito è spiegato nell’informativa sulla privacy, e quali cookie usa, nell’informativa sui cookie. L’app spiega la propria prima di giocare, e il suo uso è regolato dalle sue condizioni d’uso, che si accettano all’ingresso.',
        ],
      },
      {
        heading: 'Proprietà intellettuale',
        paragraphs: [
          'Il marchio TheLever, il suo design e i dilemmi e gli argomenti del nostro team appartengono al loro titolare, salvo che sia indicata un’altra licenza. Il codice dell’app e di questo sito è software libero con licenza AGPL-3.0.',
        ],
      },
      {
        heading: 'Link e pubblicità',
        paragraphs: [
          'Non controlliamo gli annunci né i siti a cui rimandano. Se qualcuno è illecito o inappropriato, avvisaci e lo rimuoveremo appena lo sapremo.',
        ],
      },
      {
        heading: 'Contenuti illeciti',
        paragraphs: [
          'Puoi segnalare contenuti illeciti scrivendo a privacidad@thelever.app. È anche il punto di contatto per autorità e utenti ai sensi del regolamento sui servizi digitali (artt. 11 e 12), in spagnolo e in inglese.',
        ],
      },
      {
        heading: 'Legge applicabile',
        paragraphs: [
          'Legge spagnola. Se sei un consumatore, conservi i diritti che ti danno le norme del tuo paese.',
        ],
      },
    ],
  },
};
