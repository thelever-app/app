import type { OwnPage } from '../site-texts.ts';

const UPDATED = '23 novembre 2026';

/** The terms of use of the app, version 1, which the first access asks to accept. */
export const terms: OwnPage = {
  title: 'Condizioni d’uso',
  description:
    'Le condizioni per giocare a TheLever: chi può giocare, come funziona e quali sono le regole.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Chi fornisce il servizio',
      paragraphs: [
        'TheLever è un servizio di {owner}. I dati completi sono nelle note legali. Per qualsiasi cosa, scrivi a privacidad@thelever.app: rispondiamo in spagnolo e in inglese.',
      ],
    },
    {
      heading: 'Che cos’è TheLever',
      paragraphs: [
        'TheLever è un gioco gratuito per giocare in gruppo a dilemmi morali dal browser. Si paga con la pubblicità. Accettando queste condizioni accetti un accordo con noi; come trattiamo i tuoi dati lo spiega l’informativa sulla privacy dell’app.',
      ],
    },
    {
      heading: 'Chi può giocare',
      paragraphs: [
        'Devi avere almeno 16 anni se sei nello Spazio economico europeo e 18 se sei altrove. Dichiarare un’età falsa viola queste condizioni.',
        'TheLever non è disponibile in alcuni paesi: quelli soggetti a sanzioni dell’Unione europea che riguardano tutto il paese, la Russia, la Cina, il Brasile e, per ora, il Regno Unito.',
        'Giochi senza account, con un identificativo anonimo del tuo dispositivo. Sei responsabile di ciò che si fa da esso.',
      ],
    },
    {
      heading: 'Come funziona il gioco',
      paragraphs: [
        'In ogni stanza, il gruppo risponde agli stessi dilemmi nello stesso momento e scopre il risultato di ciascuno. In una stanza nominale tutti vedono cosa ha votato ciascuno; in una stanza anonima solo quanti hanno scelto ogni opzione. Ciò che rispondi in una partita si cancella entro 24 ore dalla chiusura della stanza.',
        'I dilemmi possono trattare temi duri. I dilemmi +18 si giocano solo nelle stanze con dilemmi +18, dove possono entrare solo i maggiori di 18 anni. I dilemmi compromettenti, la cui risposta sincera può metterti in imbarazzo davanti a qualcuno della stanza, si giocano solo nelle stanze anonime e solo se chi organizza la stanza li attiva.',
      ],
    },
    {
      heading: 'Regole',
      paragraphs: [
        'Usando TheLever ti impegni a non usare soprannomi con contenuti illegali, d’odio, molesti, che umilino qualcuno o con dati di altre persone; a non cercare di scoprire cosa ha votato ciascuno in una stanza anonima; e a non usare programmi automatici, sovraccaricare il servizio, aggirare le restrizioni di età o di paese, né accedere a dati o parti del sistema che non sono per te.',
      ],
    },
    {
      heading: 'Moderazione e segnalazioni',
      paragraphs: [
        'Qualsiasi giocatore può segnalare un dilemma o un soprannome dalla partita, e il nostro team lo esamina. Se violi queste condizioni, possiamo sostituire il tuo soprannome con uno generico o impedirti l’accesso, e ti diremo il motivo, i fatti, la regola applicata e come fare ricorso.',
        'Chiunque, che giochi o no, può segnalare contenuti illegali scrivendo a privacidad@thelever.app, che è anche il punto di contatto per le autorità.',
      ],
    },
    {
      heading: 'Pubblicità',
      paragraphs: [
        'TheLever mostra pubblicità, mai mentre voti, e la pubblicità non riceve mai nulla di ciò che voti. Viene personalizzata solo per i maggiori di 18 anni che lo accettano nel gestore dei cookie e il cui browser non invia il segnale Global Privacy Control. Non rispondiamo del contenuto della pubblicità né dei siti a cui porta, ma puoi segnalarci qualsiasi pubblicità inappropriata.',
      ],
    },
    {
      heading: 'Ciò che è nostro',
      paragraphs: [
        'Il nome e il marchio TheLever, il suo design e i dilemmi scritti dal nostro team sono nostri, salvo diversa licenza indicata. Il codice dell’app è aperto, con licenza AGPL-3.0, su github.com/thelever-app. Gli avatar sono creati con DiceBear.',
      ],
    },
    {
      heading: 'Disponibilità e responsabilità',
      paragraphs: [
        'TheLever è gratuito e viene offerto così com’è. Cerchiamo di farlo funzionare bene, ma può avere errori o interruzioni, e possiamo modificare, sospendere o chiudere il servizio, avvisandoti con un preavviso ragionevole in caso di chiusura.',
        'Non rispondiamo dei danni che non dipendano da nostro dolo o colpa grave, nei limiti consentiti dalla legge. Nulla di ciò limita i diritti che ti riconosce il diritto dei consumatori. Sei responsabile dei soprannomi che usi.',
      ],
    },
    {
      heading: 'Smettere di giocare',
      paragraphs: [
        'Puoi smettere di usare TheLever quando vuoi e cancellare i tuoi dati in Impostazioni → Privacy e dati → Elimina i miei dati. Se violi queste condizioni in modo grave o ripetuto, possiamo impedirti l’accesso, con la motivazione prevista nella parte sulla moderazione.',
      ],
    },
    {
      heading: 'Modifiche a queste condizioni',
      paragraphs: [
        'Se le modifichiamo in modo importante, te lo diremo nell’app e dovrai accettarle di nuovo prima di continuare a giocare. Se non le accetti, puoi chiederci di cancellare i tuoi dati.',
      ],
    },
    {
      heading: 'Legge applicabile',
      paragraphs: [
        'Queste condizioni sono regolate dalla legge spagnola. Se sei un consumatore, puoi agire davanti ai tribunali del tuo domicilio e conservi la tutela delle norme sui consumatori del tuo paese. Versione 1.',
      ],
    },
  ],
};

/** The privacy policy of the app, which the game consent links to. */
export const appPrivacy: OwnPage = {
  title: 'Privacy dell’app',
  description:
    'Quali dati tratta l’app di TheLever per giocare, su quale base, per quanto tempo e quali sono i tuoi diritti.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Chi è il titolare',
      paragraphs: [
        'TheLever è un progetto di {owner}. Per qualsiasi cosa sui tuoi dati, scrivi a privacidad@thelever.app. Rispondiamo in spagnolo e in inglese.',
      ],
    },
    {
      heading: 'L’essenziale',
      paragraphs: [
        'Per giocare serve il tuo consenso esplicito, perché ciò che voti nei dilemmi morali può rivelare le tue convinzioni e, in alcuni dilemmi, qualcosa della tua vita privata. Ciò che rispondi in una partita si cancella entro 24 ore dalla chiusura della stanza. Non usiamo i tuoi dati per la ricerca né li vendiamo a nessuno, e la pubblicità non riceve mai ciò che voti.',
      ],
    },
    {
      heading: 'Quali dati trattiamo, perché e su quale base',
      paragraphs: [
        '- Per giocare, con il tuo consenso esplicito (art. 6.1.a e 9.2.a GDPR): il tuo soprannome e il tuo avatar; i tuoi voti, le tue previsioni del voto degli altri o della ripartizione del gruppo, le tue reazioni e i tuoi punti; se un dilemma parlava di te; l’ordine in cui hai visto le opzioni; e i tuoi «Bel dilemma», conservati a parte dalla stanza.',
        '- Per votare da solo un dilemma del sito, con lo stesso consenso: il tuo voto si somma al risultato mondiale senza che conserviamo cosa hai votato, e resta solo un segno che hai già votato quel dilemma, perché non conti due volte.',
        '- Per non ripeterti i dilemmi, con lo stesso consenso: il tuo telefono conserva l’elenco dei dilemmi che hai giocato, senza i tuoi voti, e lo invia quando entri in una stanza, che lo usa solo per preparare le partite e lo cancella con la stanza.',
        '- Per riconoscerti, in base alle condizioni d’uso (art. 6.1.b): un identificativo anonimo del tuo dispositivo e quando hai aperto l’app l’ultima volta.',
        '- Per rispettare la legge sull’età (art. 6.1.c): il tuo anno di nascita e, se compi 18 anni quest’anno o più avanti, il mese; e la tua regione (Spazio economico europeo, resto del mondo o paese in cui TheLever non è disponibile), che deduciamo dal tuo indirizzo IP con un database sul nostro server, IP Geolocation by DB-IP (db-ip.com, licenza CC BY 4.0). TheLever non conserva il tuo IP; il nostro fornitore di accesso, Firebase Authentication (Google), lo registra per alcune settimane per sicurezza.',
        '- Per poter dimostrare ciò che hai accettato (art. 6.1.c e 7.1): quale versione delle condizioni e del consenso hai accettato e quando, e quando l’hai revocato.',
        '- Per misurare l’uso e migliorare il gioco, in base al legittimo interesse (art. 6.1.f): quando hai aperto l’app per la prima volta e da quale link sei arrivato (per esempio, quello di un manifesto); quando crei una stanza o entri in quella di un altro; quando una partita inizia e finisce e con quanti giocatori; e quanto impiegate tu e il gruppo a rispondere a ogni dilemma, che si cancella con la partita. Mai i tuoi voti, le tue previsioni o le tue reazioni, e senza cookie: lo registra il nostro server. La prima visita si registra prima che tu abbia potuto opporti. Puoi opporti in Impostazioni → Privacy e dati → I tuoi permessi: smettiamo di registrarlo e cancelliamo ciò che avevamo.',
        '- Per la pubblicità, con il tuo consenso (art. 6.1.a GDPR e art. 22.2 LSSI): i cookie e gli identificativi della rete pubblicitaria, secondo ciò che scegli nel gestore dei cookie di Google.',
        '- Per moderare (obbligo legale del regolamento sui servizi digitali e interesse legittimo a un servizio sicuro, art. 6.1.c e 6.1.f): il dilemma o il soprannome che segnali, il motivo e il tuo commento, senza dire a nessuno del gruppo che l’hai segnalato; se viene segnalato il tuo soprannome, il soprannome e la nostra decisione; se segnali contenuti illegali dal sito, ciò che ci racconti e, se ce li dai, il tuo nome e la tua email per risponderti; e gli avvisi di ogni decisione.',
        '- Per gestire le tue richieste (art. 6.1.c): la tua email, ciò che ci chiedi e il codice per le richieste che ti diamo quando apri l’app per la prima volta, che vedi in Impostazioni → Privacy e dati → I tuoi dati.',
        '- Perché una cancellazione non venga annullata se ripristiniamo un backup (art. 6.1.c e 17): il tuo identificativo anonimo, il motivo della cancellazione e quando l’hai chiesta e quando è terminata.',
      ],
    },
    {
      heading: 'Cosa vede il tuo gruppo',
      paragraphs: [
        'In una stanza nominale, il tuo gruppo vede nel risultato cosa hai votato, quanti hanno indovinato il tuo voto e le tue reazioni, e alla fine la tua posizione e i titoli della partita, che derivano dai voti, dalle previsioni e dalle reazioni. In una stanza anonima nessuno vede il tuo voto né la tua previsione: solo quanti hanno scelto ogni opzione e, se hanno votato meno di 3 persone, nemmeno quello. Quando voti da solo, nessuno vede il tuo voto: solo il conteggio mondiale, senza nomi, da 20 risposte.',
        'Qualsiasi giocatore può condividere fuori dalla stanza una carta con il risultato: quella personale non mostra i soprannomi degli altri salvo che chi la condivide lo scelga, e quella del gruppo mostra solo la ripartizione, senza nomi.',
      ],
    },
    {
      heading: 'Minori',
      paragraphs: [
        'Per giocare bisogna avere almeno 16 anni nello Spazio economico europeo e 18 nel resto del mondo. I giocatori di 16 e 17 anni giocano solo dilemmi adatti alla loro età, non entrano nelle stanze con dilemmi +18 e la loro pubblicità non è mai personalizzata. Se l’età che dichiari non raggiunge quella minima, conserviamo solo il tuo anno di nascita, il mese se l’hai indicato, la tua regione e quando hai aperto l’app l’ultima volta, perché tu non possa giocare su quel dispositivo, e li cancelliamo dopo 24 mesi senza aprire l’app. Se veniamo a sapere in un altro modo che qualcuno non ha l’età minima, cancelliamo i suoi dati.',
      ],
    },
    {
      heading: 'Decisioni automatizzate',
      paragraphs: [
        'L’app non ti lascia giocare se l’età che dichiari non raggiunge la minima della tua regione o se sei in un paese in cui non è disponibile. Se pensi che sia un errore, scrivici e lo esaminerà una persona. Non prendiamo nessun’altra decisione automatizzata su di te.',
      ],
    },
    {
      heading: 'Con chi condividiamo i tuoi dati',
      paragraphs: [
        'Non vendiamo i tuoi dati. Li trattano per nostro conto, con contratto e solo per fornire il servizio, Google Cloud e Firebase (Google), che ospitano l’app, il suo database e l’accesso; Hostinger, che ospita la nostra posta e invia le nostre email; GitHub, dove il team tiene il registro interno della moderazione, con ciò che è stato segnalato (per esempio, un soprannome) ma senza chi l’ha segnalato, il suo commento, il suo nome o la sua email; e Anthropic, che traduce nella tua lingua la spiegazione di una decisione di moderazione. Il gestore dei cookie è di Google, e la rete pubblicitaria e i suoi partner trattano i loro cookie come titolari autonomi, solo se lo accetti. Possiamo anche dover fornire dati alle autorità quando la legge lo impone.',
        'Se TheLever cambia titolare, per esempio diventando una società, i tuoi dati passeranno al nuovo titolare per continuare a fornirti lo stesso servizio, con le stesse finalità e garanzie (art. 21 della LOPDGDD). Te lo diremo nell’app prima del cambio e potrai chiederci di cancellarli prima.',
      ],
    },
    {
      heading: 'Trasferimenti fuori dallo Spazio economico europeo',
      paragraphs: [
        'Google, GitHub e Anthropic possono trattare dati negli Stati Uniti: Google sulla base del quadro UE-USA per la protezione dei dati e delle clausole contrattuali tipo della Commissione europea; GitHub e Anthropic sulla base di queste stesse clausole, che fanno parte dei loro contratti. Hostinger conserva la nostra posta nell’Unione europea.',
      ],
    },
    {
      heading: 'Per quanto tempo conserviamo i tuoi dati',
      paragraphs: [
        '- Ciò che rispondi in una partita: meno di 24 ore dalla chiusura della stanza.',
        '- I tuoi «Bel dilemma» e il segno che hai votato da solo: finché non chiedi di cancellare i tuoi dati o passi 24 mesi senza aprire l’app.',
        '- La tua età, la tua regione, il tuo codice per le richieste e ciò che hai accettato: finché usi l’app e, se cancelli i tuoi dati, una traccia minima di ciò che hai accettato per 3 anni.',
        '- I dati d’uso con il tuo identificativo: 13 mesi; poi, solo totali che non ti identificano.',
        '- Le segnalazioni, le notifiche di contenuti illegali, le decisioni di moderazione e i loro avvisi, le tue richieste con le nostre risposte e il registro delle tue cancellazioni: 3 anni. Se cancelli i tuoi dati, le segnalazioni e le notifiche che hai fatto restano senza alcun legame con te.',
        '- Le tue scelte sui cookie: ciò che stabilisce il gestore dei cookie di Google, al massimo 13 mesi.',
        '- Ciò che cancelliamo resta alcuni giorni nei backup: 7 giorni nei nostri e fino a 180 in quelli di Firebase. Nel frattempo non viene usato per nulla.',
      ],
    },
    {
      heading: 'I tuoi diritti',
      paragraphs: [
        'Puoi chiedere l’accesso ai tuoi dati, rettificarli, cancellarli, limitarne l’uso, portarli con te e opporti al loro trattamento. In Impostazioni → Privacy e dati puoi, da solo:',
        '- In «I tuoi permessi», revocare il consenso del gioco quando vuoi, senza effetto su ciò che è già stato trattato: non potrai creare stanze né entrarci finché non lo darai di nuovo, e cancelliamo ciò che hai risposto nelle partite non ancora cancellate. Puoi anche opporti all’analisi d’uso.',
        '- In «Elimina i miei dati», cancellarli: il tuo telefono torna come nuovo subito e cancelliamo tutto ciò che è legato al tuo identificativo in pochi minuti, e al massimo entro un mese, tranne la traccia minima di ciò che hai accettato.',
        'Se revochi il consenso o cancelli i tuoi dati, nelle stanze ancora conservate il tuo soprannome diventa «Giocatore».',
        'Per tutto il resto, come chiedere una copia dei tuoi dati o correggere la tua età, scrivi a privacidad@thelever.app con il codice che vedi in Impostazioni → Privacy e dati → I tuoi dati: poiché giochi senza account, è ciò che ci permette di sapere che la richiesta è tua, e senza di esso non possiamo gestirla. Se ci hai solo segnalato qualcosa dal sito, scrivici dall’email che ci hai dato. Rispondiamo entro un mese al massimo.',
        'Se pensi che non abbiamo trattato bene i tuoi dati, puoi presentare reclamo all’Agenzia spagnola per la protezione dei dati (aepd.es) o all’autorità del tuo paese.',
      ],
    },
    {
      heading: 'Se sei fuori dall’Unione europea',
      paragraphs: [
        'Per ora TheLever non è disponibile nel Regno Unito. Negli Stati Uniti non vendiamo i tuoi dati personali né li condividiamo per la pubblicità senza il tuo consenso, e rispettiamo il segnale Global Privacy Control del tuo browser come rifiuto della pubblicità personalizzata.',
      ],
    },
    {
      heading: 'Sicurezza e modifiche',
      paragraphs: [
        'Cifriamo i dati in transito e a riposo, ne limitiamo l’accesso al minimo, non conserviamo il tuo IP nei nostri database e cancelliamo le partite da sole. In caso di violazione che ti riguardi, avviseremmo te e l’AEPD quando la legge lo richiede.',
        'Se modifichiamo questa informativa in modo importante, te lo diremo nell’app prima che ti riguardi, e se la modifica richiede il tuo consenso, te lo chiederemo di nuovo.',
      ],
    },
  ],
};
