import { InvalidTokenError, type TokenVerifier } from './token-verifier.ts';

/** The part of Firebase Admin's Auth this verifier uses. */
export interface FirebaseIdTokens {
  verifyIdToken(token: string): Promise<{ readonly uid: string }>;
}

/**
 * Checks the Firebase ID token of a player and returns their uid as the identity. Revocation is
 * not checked: it would add a call to Google on every connection, and an anonymous player cannot
 * sign out elsewhere.
 */
export class FirebaseTokenVerifier implements TokenVerifier {
  readonly #idTokens: FirebaseIdTokens;

  constructor(idTokens: FirebaseIdTokens) {
    this.#idTokens = idTokens;
  }

  async verify(token: string): Promise<string> {
    try {
      const { uid } = await this.#idTokens.verifyIdToken(token);
      return uid;
    } catch {
      throw new InvalidTokenError();
    }
  }
}
