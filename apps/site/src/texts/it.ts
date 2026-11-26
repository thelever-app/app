import { appCookies, appPrivacy, terms } from './legal/it.ts';
import type { SiteTexts } from './site-texts.ts';

const UPDATED = '23 novembre 2026';
const GUIDES_UPDATED = '26 novembre 2026';

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
      about: [
        'Sono i dilemmi più antichi della filosofia morale. Un tram senza freni, una scialuppa di salvataggio con pochi posti, un medico con cinque pazienti in attesa di un organo. Costringono a scegliere tra vite e non lasciano nessuna via d’uscita pulita.',
        'Quasi tutti mettono a confronto due modi di pensare. Uno guarda al risultato e cerca di salvare quante più persone possibile. L’altro guarda a ciò che fai con le tue mani e sostiene che ci sono cose che non si fanno a nessuno, anche se alla fine il bilancio torna.',
        'Giocati in gruppo, mostrano qualcosa che un test individuale non fa vedere. Chi tira la leva senza esitare scopre che il suo migliore amico non lo farebbe mai, e la conversazione che segue spesso dura più della partita.',
      ],
    },
    honesty: {
      name: 'Onestà',
      description: 'Quando dire la verità, quando tacere e cosa nasconderesti, a chi e perché.',
      about: [
        'Mentire è sbagliato, ma quasi nessuno dice sempre la verità. Questi dilemmi esplorano quella zona di mezzo, quella della bugia a fin di bene, del silenzio che protegge qualcuno e della verità che fa male senza bisogno.',
        'Dietro ognuno c’è una domanda di fondo. Conta di più ciò che l’altra persona sa o come si sente? C’è chi crede che la verità sia un dovere che non ammette eccezioni e chi la vede come uno strumento da usare con cura.',
        'Sono perfetti per scoprire dove mette esattamente il limite ciascuno dei tuoi amici, e per accorgerti che quel limite cambia a seconda di a chi bisogna mentire.',
      ],
    },
    loyalty: {
      name: 'Lealtà',
      description:
        'Amici, famiglia e colleghi: fin dove arriva ciò che devi loro quando si scontra con ciò che ritieni giusto.',
      about: [
        'La lealtà è ciò che ci lega alla famiglia, agli amici e alla squadra. Il problema arriva quando ciò che devi a qualcuno si scontra con ciò che ritieni giusto, con ciò che devi a uno sconosciuto o con ciò che devi a te.',
        'Copriresti un amico che ha fatto qualcosa di grave? Denunceresti tuo fratello? Questi dilemmi mettono alla prova fin dove arrivano quei legami e cosa sacrificheresti per loro.',
        'In un gruppo di amici hanno un effetto curioso. Voti in segreto cosa faresti per loro e poi vedi, con loro davanti, cosa farebbero loro per te.',
      ],
    },
    justice: {
      name: 'Giustizia',
      description:
        'Punizioni, premi e regole: cosa è giusto quando la legge, l’intenzione e il risultato non coincidono.',
      about: [
        'La giustizia sembra semplice finché la legge, l’intenzione e il risultato smettono di coincidere. Qualcuno ruba per sfamare la famiglia, una regola giusta produce una punizione assurda, un colpevole se la cava per un cavillo.',
        'Questi dilemmi mettono a confronto idee diverse di ciò che è giusto. Per alcuni, applicare le regole allo stesso modo per tutti; per altri, dare a ciascuno ciò che merita; e per altri ancora, riparare il danno anziché punire chi lo ha causato.',
        'Sono quelli che fanno discutere di più quando arriva il Risultato, perché quasi tutti credono di sapere bene cosa sia giusto finché non sentono la ragione di chi ha votato il contrario.',
      ],
    },
    'love-and-relationships': {
      name: 'Amore e relazioni',
      description:
        'Coppia, gelosia, segreti e rotture: dilemmi su ciò che faresti per qualcuno che ami.',
      about: [
        'Coppia, gelosia, segreti, rotture e amicizie che si complicano. Sono dilemmi piccoli rispetto a un tram senza freni, ma sono quelli che incontriamo davvero nella vita.',
        'Mettono a confronto la sincerità e la cura, la libertà di ciascuno e l’impegno verso l’altro, ciò che senti e ciò che credi di dover sentire.',
        'Giocarli con la tua gente ha qualcosa di rischioso, ed è proprio questo il bello. Voti in segreto, ma tutti cercate di indovinare cosa ha scelto ciascuno.',
      ],
    },
    'work-and-money': {
      name: 'Lavoro e denaro',
      description:
        'Promozioni, stipendi, favori e scorciatoie: cosa faresti quando sono in gioco i soldi o la tua carriera.',
      about: [
        'Promozioni, stipendi, favori, errori dell’azienda a tuo favore e colleghi che se ne approfittano. Il denaro e la carriera mettono alla prova principi che in astratto sembrano solidi.',
        'Alcuni di questi dilemmi hanno una struttura nota nella teoria dei giochi. Se tutti collaborano, tutti vincono, ma chi se ne approfitta vince ancora di più. Ti fidi degli altri o ti proteggi?',
        'Servono a scoprire chi nel gruppo restituirebbe i soldi in più, chi negozierebbe senza pietà e chi lascerebbe un’azienda per una questione di principio.',
      ],
    },
    'technology-and-the-future': {
      name: 'Tecnologia e futuro',
      description:
        'Intelligenza artificiale, privacy, robot e genetica: dilemmi che fino a poco fa erano fantascienza.',
      about: [
        'Intelligenza artificiale, privacy, auto a guida autonoma, editing genetico e vite sempre più lunghe. Fino a poco fa erano fantascienza, oggi sono decisioni che qualcuno sta prendendo.',
        'Questi dilemmi pongono domande nuove con strumenti vecchi. Un’auto a guida autonoma deve proteggere il passeggero o i pedoni? Racconteresti i tuoi segreti a una macchina che ti capisce meglio di chiunque altro?',
        'Molti non hanno ancora una risposta condivisa dalla maggioranza, quindi il risultato del tuo gruppo può essere interessante quanto quello di qualsiasi sondaggio.',
      ],
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
  },
  dilemma: {
    vote: 'Vota e scopri cosa ha fatto il mondo',
    play: 'Giocalo con il mio gruppo',
    worldResultLater:
      'Il risultato mondiale si vede dopo aver votato, perché non influenzi la tua risposta.',
    atStake: 'Cosa c’è in gioco',
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
  support: {
    link: 'Sostieni TheLever',
    heading: 'TheLever è gratis',
    text: 'Lo porta avanti una sola persona. Se ti piace, puoi sostenerlo con una donazione; non dà nessun vantaggio nel gioco.',
    line: 'Ti ha fatto pensare? TheLever è gratis e lo porta avanti una sola persona. Donare non dà nessun vantaggio nel gioco.',
  },
  guidesHeading: 'Per saperne di più',
  guides: {
    trolleyProblem: {
      title: 'Che cos’è il dilemma del carrello',
      description:
        'Il dilemma del carrello, da dove viene, le sue varianti più note e cosa ne hanno imparato la filosofia e la psicologia.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Il dilemma',
          paragraphs: [
            'Un carrello ferroviario senza freni corre verso cinque persone legate ai binari. Tu sei accanto a una leva che lo devia su un altro binario, dove c’è una sola persona. Se non fai nulla, ne muoiono cinque. Se tiri la leva, ne muore una. Cosa fai?',
            'Messa così, la maggior parte delle persone dice che tirerebbe la leva. Salvarne cinque al prezzo di una sembra la cosa più ragionevole. Il dilemma si fa interessante quando si cambiano i dettagli e quelle stesse persone cambiano idea.',
          ],
        },
        {
          heading: 'Da dove viene',
          paragraphs: [
            'La filosofa britannica Philippa Foot lo propose nel 1967 in un articolo sulla dottrina del doppio effetto. Nella sua versione a decidere è chi guida il carrello, che può deviarlo su un binario o sull’altro. Foot lo usava per chiedersi se ci sia una differenza morale tra causare un danno e permettere che accada.',
            'La filosofa statunitense Judith Jarvis Thomson gli diede il nome con cui è conosciuto, «the trolley problem», in un articolo del 1976. Fu lei a mettere la leva in mano a un testimone e a proporre la variante più famosa, quella del ponte.',
          ],
        },
        {
          heading: 'La variante del ponte',
          paragraphs: [
            'Questa volta non c’è nessuna leva. Sei su un ponte sopra i binari, accanto a una persona molto corpulenta. Se la spingi, il suo corpo fermerà il carrello e salverà le cinque persone. Lei morirà.',
            'I numeri sono gli stessi di prima, uno contro cinque. Eppure la maggior parte delle persone dice che non la spingerebbe. Spiegare perché due casi con lo stesso risultato ci sembrino così diversi è, da decenni, uno dei grandi problemi dell’etica.',
          ],
        },
        {
          heading: 'Le due grandi risposte',
          paragraphs: [
            '- Il consequenzialismo, e in particolare l’utilitarismo, giudica un’azione dai suoi risultati. Se muoiono meno persone, la decisione è migliore, sia con la leva sia sul ponte.',
            '- L’etica del dovere, il cui rappresentante più noto è Immanuel Kant, sostiene che ci sono cose che non si possono fare a una persona anche se il risultato è migliore, come usarla solo come un mezzo. Deviare il carrello può essere accettabile, spingere qualcuno per fermarlo no.',
            'La dottrina del doppio effetto, che risale a Tommaso d’Aquino, offre una via di mezzo. Con la leva, la morte della persona sull’altro binario è un effetto previsto ma non voluto. Sul ponte, la morte della persona spinta è il mezzo per salvare le altre.',
          ],
        },
        {
          heading: 'Cosa dice la psicologia',
          paragraphs: [
            'Nel 2001 lo psicologo Joshua Greene e il suo gruppo di ricerca pubblicarono sulla rivista Science uno studio con la risonanza magnetica. I dilemmi in cui bisogna fare del male a qualcuno con le proprie mani, come quello del ponte, attivavano le aree del cervello legate alle emozioni più dei dilemmi impersonali, come quello della leva.',
            'Nel 2018 il progetto Moral Machine del MIT pubblicò su Nature i risultati di un esperimento online sulle auto a guida autonoma, con milioni di decisioni di persone di oltre duecento paesi e territori. Trovò preferenze condivise quasi in tutto il mondo, come salvare più persone, e chiare differenze tra culture su altre.',
          ],
        },
        {
          heading: 'Perché conta ancora',
          paragraphs: [
            'Il dilemma del carrello è un esperimento mentale. Nessuno si aspetta di trovare una leva accanto ai binari, ma le domande che pone emergono in decisioni reali, come distribuire risorse scarse in un ospedale o programmare come reagisce un’auto a guida autonoma davanti a un incidente inevitabile.',
            'Su TheLever puoi giocare con il tuo gruppo a versioni del dilemma del carrello e a centinaia di altri dilemmi, votare in segreto e scoprire poi chi pensa cosa. La categoria Vita e morte raccoglie quelli più vicini al dilemma originale.',
          ],
        },
      ],
    },
    playingInAGroup: {
      title: 'Come giocare ai dilemmi morali in gruppo',
      description:
        'Come funziona una partita di TheLever, quante persone servono, che atmosfera scegliere e come sfruttare al meglio il dibattito.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Cosa serve',
          paragraphs: [
            'Un telefono a testa e nient’altro. TheLever funziona nel browser, quindi non c’è niente da installare né account da creare. Basta che qualcuno crei la stanza e condivida il link o il codice.',
            'Si può giocare da due a cinquanta persone. In quattro o cinque il dibattito è più intimo, e con un gruppo grande il risultato di ogni turno sorprende di più.',
          ],
        },
        {
          heading: 'Com’è una partita',
          paragraphs: [
            '- Chi crea la stanza sceglie l’atmosfera e il numero di turni, da uno a dodici. Di default sono otto.',
            '- A ogni turno compare lo stesso dilemma su tutti i telefoni. Ognuno vota in segreto.',
            '- Oltre a votare, ognuno prevede cosa ha votato il resto del gruppo.',
            '- Quando tutti hanno votato, arriva il Risultato. Si vede cosa ha scelto il gruppo e chi ha indovinato le proprie previsioni, e comincia il dibattito.',
            '- Alla fine della partita, ognuno riceve un titolo in base a come ha votato e a come ha previsto gli altri.',
          ],
        },
        {
          heading: 'Che atmosfera scegliere',
          paragraphs: [
            '- Classica, con dilemmi per qualsiasi gruppo. È l’opzione migliore per iniziare o per giocare con persone che non conosci bene.',
            '- Piccante, che aggiunge temi per adulti. Solo per maggiori di 18 anni.',
            '- Senza filtri, che aggiunge domande compromettenti. In questa stanza nessuno vede cosa vota ciascuno.',
          ],
        },
        {
          heading: 'Come sfruttare al meglio il dibattito',
          paragraphs: [
            'Il bello del gioco non è il voto ma quello che viene dopo. Quando il gruppo si divide, chiedi a qualcuno di ogni schieramento di spiegare la sua ragione in una frase. Quasi sempre salta fuori un dettaglio del dilemma che l’altra parte non aveva notato.',
            'Non ci sono risposte giuste. Ogni dilemma ha nella sua pagina i migliori argomenti a favore e contro ogni opzione, nel caso il dibattito si blocchi o vogliate sapere cosa dice la filosofia.',
            'Le previsioni aggiungono un secondo livello. Indovinare cosa voterà il tuo migliore amico è più difficile di quanto sembri, e sbagliare spesso porta alla conversazione migliore della serata.',
          ],
        },
        {
          heading: 'Per chi è',
          paragraphs: [
            'TheLever è per chi ha più di 16 anni. Funziona a una cena tra amici, in una lezione di filosofia o di etica, in un’attività di team building o in una videochiamata con persone che vivono lontano.',
          ],
        },
      ],
    },
    about: {
      title: 'Chi c’è dietro TheLever',
      description:
        'Chi crea TheLever, come vengono scritti i suoi dilemmi, come si finanzia e come scriverci.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Una sola persona',
          paragraphs: [
            'TheLever lo fa una sola persona, che lo progetta, lo programma e ne seleziona i dilemmi. È un progetto indipendente, senza investitori né aziende alle spalle.',
            'Nasce da un’idea semplice. I dilemmi morali sono molto più interessanti quando ne discuti con la tua gente che quando rispondi per conto tuo a un test.',
          ],
        },
        {
          heading: 'Come nascono i dilemmi',
          paragraphs: [
            'Ogni dilemma del catalogo viene revisionato a mano prima di essere pubblicato. Alcuni sono versioni di classici della filosofia, come il tram o l’anello di Gige; la maggior parte sono situazioni quotidiane scritte per TheLever.',
            'Gli argomenti a favore e contro ogni opzione vengono scritti con l’aiuto dell’intelligenza artificiale e revisionati uno per uno in spagnolo. Le traduzioni nelle altre lingue sono fatte con l’intelligenza artificiale.',
            'Gli argomenti non dicono mai qual è l’opzione giusta. Il loro scopo è farti capire la ragione migliore di ogni posizione, anche quella dell’opzione che non sceglieresti.',
          ],
        },
        {
          heading: 'Come si finanzia',
          paragraphs: [
            'TheLever è gratis e lo resterà. Si sostiene con donazioni volontarie e, più avanti, anche con la pubblicità. Donare non dà nessun vantaggio nel gioco.',
          ],
        },
        {
          heading: 'Come scriverci',
          paragraphs: [
            'Per qualsiasi questione sui tuoi dati, scrivi a privacidad@thelever.app. Nelle pagine della privacy e delle note legali, linkate in fondo a ogni pagina, ci sono tutti i dati del titolare.',
          ],
        },
      ],
    },
  },
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
        heading: 'Donazioni',
        paragraphs: [
          'Se ci sostieni con una donazione su Ko-fi (Ko-fi Labs Limited, Regno Unito), Ko-fi ci dà il tuo nome o nome utente, la tua email, l’importo e il messaggio che scrivi. Li usiamo per gestire la tua donazione e ringraziarti, in base al legittimo interesse (art. 6.1.f GDPR), e per rispettare i nostri obblighi fiscali (art. 6.1.c), e li conserviamo per il tempo richiesto dalla legge fiscale, in genere 4 anni. Non li colleghiamo mai a niente di ciò che fai nell’app. Ko-fi e chi elabora il pagamento (PayPal o Stripe) trattano i tuoi dati per conto proprio, secondo le loro politiche.',
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
  terms,
  appPrivacy,
  appCookies,
};
