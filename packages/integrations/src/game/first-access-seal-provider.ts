import type { GetConsent } from '@thelever-app/consent/published';
import type { Seal, SealProvider } from '@thelever-app/game';
import type { GetFirstAccess } from '@thelever-app/identity/published';

/**
 * The seal of a player from their first access: the version of the game consent they gave last,
 * no research nor commercial licence consent yet, and whether they are under 18 today, which
 * they are while they have not declared their age.
 */
export class FirstAccessSealProvider implements SealProvider {
  readonly #getFirstAccess: GetFirstAccess;
  readonly #getConsent: GetConsent;

  constructor(getFirstAccess: GetFirstAccess, getConsent: GetConsent) {
    this.#getFirstAccess = getFirstAccess;
    this.#getConsent = getConsent;
  }

  async sealFor(identity: string): Promise<Seal> {
    const [firstAccess, consent] = await Promise.all([
      this.#getFirstAccess.execute(identity),
      this.#getConsent.execute(identity),
    ]);
    return {
      gameConsentVersion: String(consent.gameConsentVersion ?? 0),
      researchConsentVersion: null,
      commercialLicenceConsentVersion: null,
      underEighteen: firstAccess?.underEighteen ?? true,
    };
  }
}
