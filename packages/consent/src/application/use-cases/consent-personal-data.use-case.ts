import type { AcceptanceRepository } from '../ports/acceptance-repository.port.ts';
import type { AnalyticsObjectionRepository } from '../ports/analytics-objection-repository.port.ts';

/** What Consent keeps of a player, as the file they download shows it. */
export interface ConsentData {
  readonly documents: readonly {
    readonly document: string;
    readonly version: number;
    readonly acceptedAt: string;
    readonly withdrawnAt: string | null;
  }[];
  /** When they objected to product analytics, if they do. */
  readonly analyticsObjectedAt: string | null;
}

/** The legal documents an identity accepted, with their versions and dates, and its objection. */
export interface ExportConsentData {
  execute(identity: string): Promise<ConsentData | undefined>;
}

export class ExportConsentDataUseCase implements ExportConsentData {
  readonly #acceptances: AcceptanceRepository;
  readonly #objections: AnalyticsObjectionRepository;

  constructor(acceptances: AcceptanceRepository, objections: AnalyticsObjectionRepository) {
    this.#acceptances = acceptances;
    this.#objections = objections;
  }

  async execute(identity: string): Promise<ConsentData | undefined> {
    const { accepted } = (await this.#acceptances.findByIdentity(identity)).toSnapshot();
    const objectedAt = await this.#objections.objectedAt(identity);
    if (accepted.length === 0 && !objectedAt) return undefined;
    return {
      documents: accepted.map(({ document, version, acceptedAt, withdrawnAt }) => ({
        document,
        version,
        acceptedAt: acceptedAt.toISOString(),
        withdrawnAt: withdrawnAt?.toISOString() ?? null,
      })),
      analyticsObjectedAt: objectedAt?.toISOString() ?? null,
    };
  }
}

/**
 * Deleting the data of an identity keeps what it accepted and when, the minimal record of the
 * consent the law asks for (art. 7.1 GDPR), which the long retention job deletes after 3 years;
 * its objection goes, since nothing of it is counted any more.
 */
export interface EraseConsentData {
  execute(identity: string): Promise<void>;
}

export class EraseConsentDataUseCase implements EraseConsentData {
  readonly #objections: AnalyticsObjectionRepository;

  constructor(objections: AnalyticsObjectionRepository) {
    this.#objections = objections;
  }

  async execute(identity: string): Promise<void> {
    await this.#objections.lift(identity);
  }
}
