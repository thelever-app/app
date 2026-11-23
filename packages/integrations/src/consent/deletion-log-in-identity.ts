import type { DeletionLog } from '@thelever-app/consent';
import type { LogGameConsentWithdrawal } from '@thelever-app/identity/published';

/** The deletion log is Identity's. */
export class DeletionLogInIdentity implements DeletionLog {
  readonly #log: LogGameConsentWithdrawal;

  constructor(log: LogGameConsentWithdrawal) {
    this.#log = log;
  }

  async gameConsentWithdrawn(identity: string): Promise<void> {
    await this.#log.execute(identity);
  }
}
