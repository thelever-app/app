import type { SiteTexts } from './site-texts.ts';

const UPDATED = '16 novembre 2026';

export const it: SiteTexts = {
  languageName: 'Italiano',
  languageMenu: 'Lingua',
  languageMenuNote:
    'Ti porta a questa stessa pagina nella lingua che scegli. Se apri l’app da qui, si aprirà in quella lingua.',
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
    createRoom: 'Crea una stanza',
    howToPlay: 'Come si gioca',
    steps: [
      'Crea una stanza e condividi il link o il codice.',
      'A ogni turno votate tutti lo stesso dilemma in segreto e prevedete gli altri.',
      'Si svela il risultato e ne parlate. Alla fine, i titoli della partita.',
    ],
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
    moreOf: (name) => `Altri dilemmi: ${name.toLowerCase()}`,
  },
  gone: {
    title: 'Questo dilemma non è più su TheLever',
    heading: 'Questo dilemma non è più su TheLever',
    body: 'Lo abbiamo tolto dal catalogo. Se qualcuno ti ha mandato questo link, ce ne sono molti altri che ti aspettano.',
    moreOf: (name) => `Vedi i dilemmi: ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'Questa pagina non esiste',
    heading: 'Questa pagina non esiste',
    body: 'Forse l’indirizzo è scritto male. Dalla home arrivi a tutti i dilemmi.',
  },
  footer: { label: 'Informazioni legali' },
  privacy: {
    title: 'Privacy',
    description:
      'Quali dati tratta il sito pubblico di TheLever, per cosa e quali sono i tuoi diritti.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Chi è il titolare',
        paragraphs: [
          'TheLever è un progetto di Mario Villacorta García, NIF [REDACTED], con domicilio in [REDACTED], Spagna. Per qualsiasi questione sui tuoi dati, scrivi a privacidad@thelever.app. Rispondiamo in spagnolo e in inglese.',
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
          'Per ora questo sito non mostra pubblicità e non usa cookie. Quando la mostrerà, sarà pubblicità di Google AdSense: Google e i suoi partner useranno i cookie per mostrarla o personalizzarla solo se lo accetti nel gestore dei cookie, che comparirà prima di qualsiasi annuncio; se non accetti, vedrai solo annunci limitati, senza cookie. Nessun annuncio riceverà ciò che voti nell’app.',
          'Google è responsabile in proprio di ciò che fa con quei cookie. Per saperne di più: policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Con chi condividiamo i tuoi dati',
        paragraphs: [
          'Non vendiamo i tuoi dati. Google Cloud li tratta per nostro conto, con contratto, solo per ospitare il sito. Possiamo anche doverli fornire alle autorità quando la legge lo impone.',
        ],
      },
      {
        heading: 'Trasferimenti fuori dallo Spazio economico europeo',
        paragraphs: [
          'Google può trattare dati fuori dallo Spazio economico europeo, sulla base del Data Privacy Framework UE-USA e delle clausole contrattuali tipo della Commissione europea.',
        ],
      },
      {
        heading: 'Per quanto tempo li conserviamo',
        paragraphs: [
          'TheLever non conserva nulla della tua visita. Google conserva i suoi registri tecnici per il tempo necessario alla sicurezza del servizio.',
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
  legalNotice: {
    title: 'Note legali',
    description: 'Chi c’è dietro TheLever e le condizioni di questo sito.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Titolare',
        paragraphs: [
          '- Titolare: Mario Villacorta García.',
          '- NIF: [REDACTED].',
          '- Domicilio: [REDACTED], Spagna.',
          '- Email: privacidad@thelever.app.',
          '- Sito e app: thelever.app.',
          '- Attività: gioco online gratuito finanziato dalla pubblicità.',
        ],
      },
      {
        heading: 'Privacy',
        paragraphs: [
          'Come trattiamo i dati su questo sito è spiegato nell’informativa sulla privacy. L’app spiega la propria prima di giocare, e il suo uso è regolato dalle sue condizioni d’uso, che si accettano all’ingresso.',
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
