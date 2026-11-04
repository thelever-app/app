/** Checks that a request comes from the app itself, with the Firebase App Check token of the device. */
export interface AppCheckVerifier {
  /** Throws InvalidAppCheckError if the token is missing or not valid. */
  verify(token: string | undefined): Promise<void>;
}

export class InvalidAppCheckError extends Error {
  constructor() {
    super('the App Check token is missing or not valid');
    this.name = 'InvalidAppCheckError';
  }
}

/** Where the environment asks for no App Check: locally, in the e2e and in the tests. */
export class UncheckedAppCheck implements AppCheckVerifier {
  async verify(): Promise<void> {}
}
