import { InvalidTokenError, type TokenVerifier } from './token-verifier.ts';

/**
 * The codes Firebase Admin gives a token it does not accept. It also gives argument-error when it
 * cannot download Google's public keys, so that failure reaches the client as an invalid token too.
 */
const REJECTED_TOKEN_CODES = new Set([
  'auth/argument-error',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/invalid-id-token',
  'auth/user-disabled',
  'auth/user-not-found',
]);

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
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      if (typeof code === 'string' && REJECTED_TOKEN_CODES.has(code)) throw new InvalidTokenError();
      throw error;
    }
  }
}
