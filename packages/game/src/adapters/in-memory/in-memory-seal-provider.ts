import type { SealProvider } from '../../application/ports/seal-provider.port.ts';
import type { Seal } from '../../domain/vos/answer.vo.ts';

/**
 * The seal of anyone while the first access does not exist: no text of the game consent yet
 * (version '0'), no optional consent, and under 18, which is the choice that protects them.
 */
export const SEAL_BEFORE_FIRST_ACCESS: Seal = {
  gameConsentVersion: '0',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: true,
};

/** Gives the seals it is given, by identity, and the one of before the first access to anyone else. */
export class InMemorySealProvider implements SealProvider {
  readonly #seals: ReadonlyMap<string, Seal>;

  constructor(seals: ReadonlyMap<string, Seal> = new Map()) {
    this.#seals = seals;
  }

  async sealFor(identity: string): Promise<Seal> {
    return this.#seals.get(identity) ?? SEAL_BEFORE_FIRST_ACCESS;
  }
}
