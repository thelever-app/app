import { type AppCheckVerifier, InvalidAppCheckError } from './app-check-verifier.ts';

/** The codes Firebase Admin gives an App Check token it does not accept. */
const REJECTED_TOKEN_CODES = new Set([
  'app-check/invalid-argument',
  'app-check/app-check-token-expired',
]);

/** The part of Firebase Admin's App Check this verifier uses. */
export interface FirebaseAppCheckTokens {
  verifyToken(token: string): Promise<unknown>;
}

/**
 * Checks the App Check token of a device: the proof, from reCAPTCHA in the browser, that the call
 * comes from the app and not from a script. A token may be used more than once, until it expires:
 * consuming it would cost an assessment per call.
 */
export class FirebaseAppCheckVerifier implements AppCheckVerifier {
  readonly #tokens: FirebaseAppCheckTokens;

  constructor(tokens: FirebaseAppCheckTokens) {
    this.#tokens = tokens;
  }

  async verify(token: string | undefined): Promise<void> {
    if (!token) throw new InvalidAppCheckError();
    try {
      await this.#tokens.verifyToken(token);
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      if (typeof code === 'string' && REJECTED_TOKEN_CODES.has(code)) {
        throw new InvalidAppCheckError();
      }
      throw error;
    }
  }
}
