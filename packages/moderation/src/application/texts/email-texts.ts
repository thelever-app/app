import type { Email } from '../ports/mailer.port.ts';
import type { IllegalContentNoticeSnapshot } from '../../domain/entities/illegal-content-notice.ts';
import type { Decision } from '../../domain/vos/decision.vo.ts';
import type { Language } from '../../domain/vos/language.vo.ts';

/** Where people write to TheLever: also to appeal a decision. */
export const CONTACT_EMAIL = 'privacidad@thelever.app';

interface EmailTexts {
  readonly locale: string;
  readonly hello: string;
  readonly receivedSubject: (number: number) => string;
  readonly received: (date: string) => string;
  readonly review: string;
  readonly authorities: string;
  readonly decidedSubject: (number: number) => string;
  readonly decided: (date: string) => string;
  readonly decision: string;
  readonly withdrawn: string;
  readonly kept: string;
  /** Kept, as said of a notice that points to nothing the team could find. */
  readonly notFound: string;
  readonly reason: string;
  readonly ruleLabel: string;
  readonly rule: (rule: string) => string;
  readonly who: string;
  readonly person: string;
  readonly appeal: (email: string) => string;
  readonly why: string;
}

// The texts of the two emails of a notice (artboards I and J of CU-08), in every language of the
// app: drafts of Claude, waiting for the lawyer like the rest of the texts of notices.
// Nothing the sender wrote goes in them, only the number and the date of the notice: the form
// would otherwise send any text, from the domain, to any address.
const TEXTS: Readonly<Record<Language, EmailTexts>> = {
  es: {
    locale: 'es-ES',
    hello: 'Hola:',
    receivedSubject: (number) => `Hemos recibido tu denuncia n.º ${number}`,
    received: (date) => `Hemos recibido tu denuncia del ${date}.`,
    review:
      'Una persona del equipo la revisará. Cuando decidamos, te escribiremos a este email con la decisión, el motivo y cómo reclamar si no estás de acuerdo.',
    authorities:
      'Si ves una amenaza grave o urgente para alguien, avisa también a las autoridades.',
    decidedSubject: (number) => `Decisión sobre tu denuncia n.º ${number}`,
    decided: (date) => `Hemos revisado tu denuncia del ${date}.`,
    decision: 'Decisión',
    withdrawn: 'lo hemos retirado.',
    kept: 'lo mantenemos, porque no incumple las condiciones de uso ni la ley.',
    notFound: 'no hemos encontrado ese contenido en TheLever, así que no hay nada que retirar.',
    reason: 'Motivo',
    ruleLabel: 'Regla',
    rule: (rule) => `apartado ${rule} de las condiciones de uso.`,
    who: 'Quién lo decidió',
    person: 'una persona del equipo.',
    appeal: (email) =>
      `Si no estás de acuerdo, responde a este email o escribe a ${email} y lo revisaremos de nuevo.`,
    why: 'Te escribimos porque dejaste este email en el formulario de denuncias. Solo lo usamos para esta denuncia. Más información en nuestra política de privacidad.',
  },
  en: {
    locale: 'en-GB',
    hello: 'Hello,',
    receivedSubject: (number) => `We have received your notice no. ${number}`,
    received: (date) => `We have received your notice of ${date}.`,
    review:
      'A person on the team will review it. When we decide, we will write to this email with the decision, the reason and how to appeal if you disagree.',
    authorities: 'If you see a serious or urgent threat to someone, tell the authorities too.',
    decidedSubject: (number) => `Decision on your notice no. ${number}`,
    decided: (date) => `We have reviewed your notice of ${date}.`,
    decision: 'Decision',
    withdrawn: 'we have withdrawn it.',
    kept: 'we are keeping it, because it breaks neither the terms of use nor the law.',
    notFound: 'we have not found that content on TheLever, so there is nothing to withdraw.',
    reason: 'Reason',
    ruleLabel: 'Rule',
    rule: (rule) => `section ${rule} of the terms of use.`,
    who: 'Who decided',
    person: 'a person on the team.',
    appeal: (email) =>
      `If you disagree, reply to this email or write to ${email} and we will review it again.`,
    why: 'We are writing because you left this email in the notice form. We only use it for this notice. More in our privacy policy.',
  },
  fr: {
    locale: 'fr-FR',
    hello: 'Bonjour,',
    receivedSubject: (number) => `Nous avons reçu votre signalement n° ${number}`,
    received: (date) => `Nous avons reçu votre signalement du ${date}.`,
    review:
      'Une personne de l’équipe l’examinera. Une fois la décision prise, nous vous écrirons à cette adresse avec la décision, le motif et la façon de la contester si vous n’êtes pas d’accord.',
    authorities:
      'Si vous voyez une menace grave ou urgente pour quelqu’un, prévenez aussi les autorités.',
    decidedSubject: (number) => `Décision sur votre signalement n° ${number}`,
    decided: (date) => `Nous avons examiné votre signalement du ${date}.`,
    decision: 'Décision',
    withdrawn: 'nous l’avons retiré.',
    kept: 'nous le maintenons, car il n’enfreint ni les conditions d’utilisation ni la loi.',
    notFound: 'nous n’avons pas trouvé ce contenu sur TheLever, il n’y a donc rien à retirer.',
    reason: 'Motif',
    ruleLabel: 'Règle',
    rule: (rule) => `article ${rule} des conditions d’utilisation.`,
    who: 'Qui a décidé',
    person: 'une personne de l’équipe.',
    appeal: (email) =>
      `Si vous n’êtes pas d’accord, répondez à cet e-mail ou écrivez à ${email} et nous l’examinerons à nouveau.`,
    why: 'Nous vous écrivons parce que vous avez laissé cette adresse dans le formulaire de signalement. Nous ne l’utilisons que pour ce signalement. Plus d’informations dans notre politique de confidentialité.',
  },
  de: {
    locale: 'de-DE',
    hello: 'Hallo,',
    receivedSubject: (number) => `Wir haben deine Meldung Nr. ${number} erhalten`,
    received: (date) => `Wir haben deine Meldung vom ${date} erhalten.`,
    review:
      'Eine Person aus dem Team prüft sie. Sobald wir entschieden haben, schreiben wir dir an diese Adresse mit der Entscheidung, dem Grund und wie du widersprechen kannst.',
    authorities:
      'Wenn du eine ernste oder dringende Gefahr für jemanden siehst, informiere auch die Behörden.',
    decidedSubject: (number) => `Entscheidung zu deiner Meldung Nr. ${number}`,
    decided: (date) => `Wir haben deine Meldung vom ${date} geprüft.`,
    decision: 'Entscheidung',
    withdrawn: 'wir haben ihn entfernt.',
    kept: 'wir behalten ihn, weil er weder gegen die Nutzungsbedingungen noch gegen das Gesetz verstößt.',
    notFound:
      'wir haben diesen Inhalt auf TheLever nicht gefunden, es gibt also nichts zu entfernen.',
    reason: 'Grund',
    ruleLabel: 'Regel',
    rule: (rule) => `Abschnitt ${rule} der Nutzungsbedingungen.`,
    who: 'Wer entschieden hat',
    person: 'eine Person aus dem Team.',
    appeal: (email) =>
      `Wenn du nicht einverstanden bist, antworte auf diese E-Mail oder schreib an ${email}, und wir prüfen es erneut.`,
    why: 'Wir schreiben dir, weil du diese Adresse im Meldeformular angegeben hast. Wir nutzen sie nur für diese Meldung. Mehr dazu in unserer Datenschutzerklärung.',
  },
  it: {
    locale: 'it-IT',
    hello: 'Ciao,',
    receivedSubject: (number) => `Abbiamo ricevuto la tua segnalazione n. ${number}`,
    received: (date) => `Abbiamo ricevuto la tua segnalazione del ${date}.`,
    review:
      'Una persona del team la esaminerà. Quando avremo deciso, ti scriveremo a questo indirizzo con la decisione, il motivo e come presentare reclamo se non sei d’accordo.',
    authorities: 'Se vedi una minaccia grave o urgente per qualcuno, avvisa anche le autorità.',
    decidedSubject: (number) => `Decisione sulla tua segnalazione n. ${number}`,
    decided: (date) => `Abbiamo esaminato la tua segnalazione del ${date}.`,
    decision: 'Decisione',
    withdrawn: 'l’abbiamo rimosso.',
    kept: 'lo manteniamo, perché non viola né le condizioni d’uso né la legge.',
    notFound:
      'non abbiamo trovato questo contenuto su TheLever, quindi non c’è nulla da rimuovere.',
    reason: 'Motivo',
    ruleLabel: 'Regola',
    rule: (rule) => `sezione ${rule} delle condizioni d’uso.`,
    who: 'Chi ha deciso',
    person: 'una persona del team.',
    appeal: (email) =>
      `Se non sei d’accordo, rispondi a questa email o scrivi a ${email} e lo esamineremo di nuovo.`,
    why: 'Ti scriviamo perché hai lasciato questo indirizzo nel modulo di segnalazione. Lo usiamo solo per questa segnalazione. Maggiori informazioni nella nostra informativa sulla privacy.',
  },
  pt: {
    locale: 'pt-PT',
    hello: 'Olá,',
    receivedSubject: (number) => `Recebemos a tua denúncia n.º ${number}`,
    received: (date) => `Recebemos a tua denúncia de ${date}.`,
    review:
      'Uma pessoa da equipa vai analisá-la. Quando decidirmos, escrevemos-te para este email com a decisão, o motivo e como reclamar se não concordares.',
    authorities: 'Se vires uma ameaça grave ou urgente para alguém, avisa também as autoridades.',
    decidedSubject: (number) => `Decisão sobre a tua denúncia n.º ${number}`,
    decided: (date) => `Analisámos a tua denúncia de ${date}.`,
    decision: 'Decisão',
    withdrawn: 'retirámo-lo.',
    kept: 'mantemo-lo, porque não viola as condições de utilização nem a lei.',
    notFound: 'não encontrámos esse conteúdo no TheLever, por isso não há nada a retirar.',
    reason: 'Motivo',
    ruleLabel: 'Regra',
    rule: (rule) => `secção ${rule} das condições de utilização.`,
    who: 'Quem decidiu',
    person: 'uma pessoa da equipa.',
    appeal: (email) =>
      `Se não concordares, responde a este email ou escreve para ${email} e voltaremos a analisá-lo.`,
    why: 'Escrevemos-te porque deixaste este email no formulário de denúncias. Só o usamos para esta denúncia. Mais informações na nossa política de privacidade.',
  },
  ca: {
    locale: 'ca-ES',
    hello: 'Hola:',
    receivedSubject: (number) => `Hem rebut la teva denúncia núm. ${number}`,
    received: (date) => `Hem rebut la teva denúncia del ${date}.`,
    review:
      'Una persona de l’equip la revisarà. Quan decidim, t’escriurem a aquest correu amb la decisió, el motiu i com reclamar si no hi estàs d’acord.',
    authorities: 'Si veus una amenaça greu o urgent per a algú, avisa també les autoritats.',
    decidedSubject: (number) => `Decisió sobre la teva denúncia núm. ${number}`,
    decided: (date) => `Hem revisat la teva denúncia del ${date}.`,
    decision: 'Decisió',
    withdrawn: 'l’hem retirat.',
    kept: 'el mantenim, perquè no incompleix les condicions d’ús ni la llei.',
    notFound: 'no hem trobat aquest contingut a TheLever, així que no hi ha res a retirar.',
    reason: 'Motiu',
    ruleLabel: 'Regla',
    rule: (rule) => `apartat ${rule} de les condicions d’ús.`,
    who: 'Qui ho ha decidit',
    person: 'una persona de l’equip.',
    appeal: (email) =>
      `Si no hi estàs d’acord, respon aquest correu o escriu a ${email} i ho revisarem de nou.`,
    why: 'T’escrivim perquè vas deixar aquest correu al formulari de denúncies. Només el fem servir per a aquesta denúncia. Més informació a la nostra política de privacitat.',
  },
};

function dateOf(at: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Europe/Madrid' }).format(
    at,
  );
}

/** The acknowledgement of receipt of a notice, to the email its sender left. */
export function acknowledgementEmail(
  notice: IllegalContentNoticeSnapshot & { readonly email: string },
  number: number,
): Email {
  const texts = TEXTS[notice.language];
  return {
    to: notice.email,
    subject: texts.receivedSubject(number),
    text: [
      texts.hello,
      texts.received(dateOf(notice.sentAt, texts.locale)),
      texts.review,
      texts.authorities,
      texts.why,
    ].join('\n\n'),
  };
}

function outcomeText(texts: EmailTexts, decision: Decision, located: boolean): string {
  if (decision.outcome === 'withdrawn') return texts.withdrawn;
  return located ? texts.kept : texts.notFound;
}

/**
 * The decision on a notice, with its reason, the rule and how to appeal. `located`: whether the
 * notice points to a content of TheLever; if not, keeping it says the team did not find it, never
 * that it breaks no rule.
 */
export function decisionEmail(
  notice: IllegalContentNoticeSnapshot & { readonly email: string },
  number: number,
  decision: Decision,
  located: boolean,
): Email {
  const texts = TEXTS[notice.language];
  return {
    to: notice.email,
    subject: texts.decidedSubject(number),
    text: [
      texts.hello,
      texts.decided(dateOf(notice.sentAt, texts.locale)),
      [
        `${texts.decision}: ${outcomeText(texts, decision, located)}`,
        `${texts.reason}: ${decision.translatedFacts[notice.language]}`,
        `${texts.ruleLabel}: ${texts.rule(decision.rule)}`,
        `${texts.who}: ${texts.person}`,
      ].join('\n'),
      texts.appeal(CONTACT_EMAIL),
      texts.why,
    ].join('\n\n'),
  };
}
