import type { RequestHandler, Response } from 'express';
import type { AccessGate } from '../identity/access-gate.ts';
import type { AppCheckVerifier } from '../identity/app-check-verifier.ts';
import type { TokenVerifier } from '../identity/token-verifier.ts';

/** The access code, as the web sends it: encoded, since a header only carries Latin-1. */
function accessCodeOf(header: string | undefined): string | undefined {
  if (header === undefined) return undefined;
  try {
    return decodeURIComponent(header);
  } catch {
    return header;
  }
}

/**
 * Checks that the call comes from the app, with the App Check token in X-Firebase-AppCheck, takes
 * the identity of whoever calls from the token in the Authorization header and, while the
 * environment is closed, checks the access code in X-Access-Code. Any of them missing or invalid
 * fails the request with its error (InvalidAppCheckError, InvalidTokenError,
 * InvalidAccessCodeError), for the module to answer. Entering a room only goes through here: a
 * socket connects to a room its identity is already in.
 */
export function authentication(
  tokenVerifier: TokenVerifier,
  appCheckVerifier: AppCheckVerifier,
  accessGate: AccessGate,
): RequestHandler {
  return async (req, res, next) => {
    await appCheckVerifier.verify(req.get('X-Firebase-AppCheck'));
    const token = /^Bearer (.+)$/.exec(req.get('Authorization') ?? '')?.[1] ?? '';
    const identity = await tokenVerifier.verify(token);
    await accessGate.verify(accessCodeOf(req.get('X-Access-Code')));
    res.locals.identity = identity;
    next();
  };
}

/** The identity the authentication middleware left on the response. */
export function identityOf(res: Response): string {
  const { identity } = res.locals;
  if (typeof identity !== 'string') throw new Error('The route is not behind the authentication');
  return identity;
}
