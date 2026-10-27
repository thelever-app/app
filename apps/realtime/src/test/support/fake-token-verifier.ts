import { InvalidTokenError, type TokenVerifier } from '../../identity/token-verifier.ts';

/** Test data: the token of an identity, as the fake verifier understands it. */
export function tokenOf(identity: string): string {
  return `token-of-${identity}`;
}

/** Accepts the tokens made with tokenOf and rejects anything else, as Firebase would. */
export class FakeTokenVerifier implements TokenVerifier {
  async verify(token: string): Promise<string> {
    if (!token.startsWith('token-of-')) throw new InvalidTokenError();
    return token.slice('token-of-'.length);
  }
}
