import type { GetConsent } from '@thelever-app/consent/published';
import type { GetFirstAccess } from '@thelever-app/identity/published';
import { FirstAccessRequiredError } from './first-access-required.error.ts';
import { type FirstAccessStatus, statusOf } from './first-access-status.ts';

/**
 * Reads where the first access of an identity is, from Identity and Consent, and stops who has
 * not finished it: in a blocked country, under the minimum age, without the age or without the
 * current terms and game consent.
 */
export class FirstAccessGate {
  readonly #getFirstAccess: GetFirstAccess;
  readonly #getConsent: GetConsent;

  constructor(getFirstAccess: GetFirstAccess, getConsent: GetConsent) {
    this.#getFirstAccess = getFirstAccess;
    this.#getConsent = getConsent;
  }

  /** None if the identity never opened the app. */
  async statusOf(identity: string): Promise<FirstAccessStatus | undefined> {
    const firstAccess = await this.#getFirstAccess.execute(identity);
    return firstAccess && statusOf(firstAccess, await this.#getConsent.execute(identity));
  }

  /** Throws FirstAccessRequiredError unless the first access is done. */
  async ensureDone(identity: string): Promise<void> {
    const status = await this.statusOf(identity);
    if (status?.step === 'done') return;
    throw new FirstAccessRequiredError(identity, status?.step ?? 'not-begun');
  }
}
