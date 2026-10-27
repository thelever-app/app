/** Turns the token a client sends into the identity behind it (the uid of Firebase Auth). */
export interface TokenVerifier {
  /** Throws InvalidTokenError if the token is not valid. */
  verify(token: string): Promise<string>;
}

export class InvalidTokenError extends Error {
  constructor() {
    super('the token is not valid');
    this.name = 'InvalidTokenError';
  }
}
