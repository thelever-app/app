/**
 * Lets into the rooms only who has the access code of the environment, while the environment is
 * closed to the public: dev always, prod until it opens to real players.
 */
export interface AccessGate {
  /** Throws InvalidAccessCodeError if the code is missing or not the one of the environment. */
  verify(code: string | undefined): Promise<void>;
}

export class InvalidAccessCodeError extends Error {
  constructor() {
    super('the access code is missing or not valid');
    this.name = 'InvalidAccessCodeError';
  }
}

/** Where the environment is open: locally, in the tests and once prod opens to real players. */
export class OpenAccess implements AccessGate {
  async verify(): Promise<void> {}
}
