import { NotCurrentVersionError } from '../errors/not-current-version.error.ts';
import { NotWithdrawableError } from '../errors/not-withdrawable.error.ts';
import {
  currentVersionOf,
  LEGAL_DOCUMENTS,
  type LegalDocument,
  type PublishedVersions,
  versionRequiredOf,
} from '../vos/legal-document.vo.ts';

/**
 * The version of a document an identity accepted, and when, which proves it (art. 7.1 GDPR); and,
 * for the game consent, when it was withdrawn, which keeps the proof of what was given before.
 */
export interface Acceptance {
  readonly document: LegalDocument;
  readonly version: number;
  readonly acceptedAt: Date;
  /** Null while it stands. */
  readonly withdrawnAt: Date | null;
}

/** The documents that can be withdrawn: the game consent, not the terms of use. */
const WITHDRAWABLE: readonly LegalDocument[] = ['game-consent'];

export interface AcceptancesSnapshot {
  readonly identity: string;
  /** The last one of each document. */
  readonly accepted: readonly Acceptance[];
}

/** The legal documents an identity has accepted, the last version of each. */
export class Acceptances {
  readonly #identity: string;
  readonly #accepted: Map<LegalDocument, Acceptance>;

  private constructor(identity: string, accepted: readonly Acceptance[]) {
    this.#identity = identity;
    this.#accepted = new Map(accepted.map((acceptance) => [acceptance.document, acceptance]));
  }

  /** Who has accepted nothing yet. */
  static none(identity: string): Acceptances {
    return new Acceptances(identity, []);
  }

  static fromSnapshot({ identity, accepted }: AcceptancesSnapshot): Acceptances {
    return new Acceptances(identity, accepted);
  }

  get identity(): string {
    return this.#identity;
  }

  /** Accepts the version of the document that is published now, and no other. */
  accept(document: LegalDocument, version: number, published: PublishedVersions, now: Date): void {
    if (version !== currentVersionOf(document, published)) {
      throw new NotCurrentVersionError(document, version);
    }
    this.#accepted.set(document, { document, version, acceptedAt: now, withdrawnAt: null });
  }

  /**
   * Withdraws the game consent: from now on it is still to give, as easily as it was given. What
   * was given and when stays, with when it was withdrawn; withdrawing it twice keeps the first time.
   */
  withdraw(document: LegalDocument, now: Date): void {
    if (!WITHDRAWABLE.includes(document)) throw new NotWithdrawableError(document);
    const acceptance = this.#accepted.get(document);
    if (!acceptance || acceptance.withdrawnAt) return;
    this.#accepted.set(document, { ...acceptance, withdrawnAt: now });
  }

  /** The version of the document accepted last and not withdrawn, if any. */
  versionOf(document: LegalDocument): number | undefined {
    const acceptance = this.#accepted.get(document);
    return acceptance && !acceptance.withdrawnAt ? acceptance.version : undefined;
  }

  /** Whether the document was given and then withdrawn, and not given again. */
  isWithdrawn(document: LegalDocument): boolean {
    return Boolean(this.#accepted.get(document)?.withdrawnAt);
  }

  /** The documents still to accept before playing, in the order the first access asks for them. */
  pending(published: PublishedVersions): LegalDocument[] {
    return LEGAL_DOCUMENTS.filter(
      (document) => (this.versionOf(document) ?? 0) < versionRequiredOf(document, published),
    );
  }

  /** Of those still to accept, the ones accepted before in a version that is no longer enough. */
  changed(published: PublishedVersions): LegalDocument[] {
    return this.pending(published).filter((document) => this.versionOf(document) !== undefined);
  }

  toSnapshot(): AcceptancesSnapshot {
    return { identity: this.#identity, accepted: [...this.#accepted.values()] };
  }
}
