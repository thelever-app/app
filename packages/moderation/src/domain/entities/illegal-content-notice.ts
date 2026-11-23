import { InvalidEntryError } from '../errors/invalid-entry.error.ts';
import { isLanguage, type Language } from '../vos/language.vo.ts';

/** The longest the reference to the content may be: a link, a code, or a room and a nickname. */
export const MAXIMUM_REFERENCE_LENGTH = 500;
/** The longest the explanation of why the content is illegal may be. */
export const MAXIMUM_EXPLANATION_LENGTH = 2000;
export const MAXIMUM_NAME_LENGTH = 100;
const MAXIMUM_EMAIL_LENGTH = 254;
/** Enough to write back to it, not a full check: the decision email tells the rest. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IllegalContentNoticeSnapshot {
  readonly id: string;
  /** The content, as the person wrote it: the link or code of a dilemma, or a room and a nickname. */
  readonly reference: string;
  /** Why the person thinks it is illegal. */
  readonly explanation: string;
  readonly name: string | null;
  /** Where the acknowledgement and the decision go; without it, nowhere. */
  readonly email: string | null;
  /** The language of the form, which the emails are written in. */
  readonly language: Language;
  /** Who sent it, as anyone the app signs in without asking anything. */
  readonly identity: string;
  readonly sentAt: Date;
}

export interface IllegalContentNoticeInput extends IllegalContentNoticeSnapshot {
  /** The person declares in good faith that what they say is accurate and complete. */
  readonly goodFaith: boolean;
}

/**
 * A notice of illegal content anyone sends from the web form, without the app. A notice only
 * exists with the declaration of good faith, so it is not kept.
 */
export class IllegalContentNotice {
  readonly #snapshot: IllegalContentNoticeSnapshot;

  private constructor(snapshot: IllegalContentNoticeSnapshot) {
    this.#snapshot = { ...snapshot };
  }

  static receive({ goodFaith, ...notice }: IllegalContentNoticeInput): IllegalContentNotice {
    if (!goodFaith) throw new InvalidEntryError('declaration of good faith', goodFaith);
    const reference = notice.reference.trim();
    const explanation = notice.explanation.trim();
    const name = notice.name?.trim() || null;
    const email = notice.email?.trim() || null;
    if (reference === '' || reference.length > MAXIMUM_REFERENCE_LENGTH) {
      throw new InvalidEntryError('reference', reference);
    }
    if (explanation === '' || explanation.length > MAXIMUM_EXPLANATION_LENGTH) {
      throw new InvalidEntryError('explanation', `${explanation.length} characters`);
    }
    if (name !== null && name.length > MAXIMUM_NAME_LENGTH) {
      throw new InvalidEntryError('name', `${name.length} characters`);
    }
    if (email !== null && (email.length > MAXIMUM_EMAIL_LENGTH || !EMAIL.test(email))) {
      throw new InvalidEntryError('email', email);
    }
    if (!isLanguage(notice.language)) throw new InvalidEntryError('language', notice.language);
    return new IllegalContentNotice({ ...notice, reference, explanation, name, email });
  }

  static fromSnapshot(snapshot: IllegalContentNoticeSnapshot): IllegalContentNotice {
    return new IllegalContentNotice(snapshot);
  }

  get id(): string {
    return this.#snapshot.id;
  }

  get email(): string | null {
    return this.#snapshot.email;
  }

  toSnapshot(): IllegalContentNoticeSnapshot {
    return { ...this.#snapshot };
  }
}
