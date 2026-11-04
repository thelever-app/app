import { type AppCheckVerifier, InvalidAppCheckError } from '../../identity/app-check-verifier.ts';

/** Test data: the only App Check token the fake verifier accepts. */
export const VALID_APP_CHECK = 'test-valid-app-check';

/** Asks for App Check, as dev and prod do, and accepts only VALID_APP_CHECK. */
export class FakeAppCheckVerifier implements AppCheckVerifier {
  async verify(token: string | undefined): Promise<void> {
    if (token !== VALID_APP_CHECK) throw new InvalidAppCheckError();
  }
}
