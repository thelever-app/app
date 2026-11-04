import type { RequestHandler, Response } from 'express';
import type { AppCheckVerifier } from '../identity/app-check-verifier.ts';
import type { TokenVerifier } from '../identity/token-verifier.ts';

/**
 * Checks that the call comes from the app, with the App Check token in X-Firebase-AppCheck, and
 * takes the identity of whoever calls from the token in the Authorization header. Either one
 * missing or invalid fails the request with its error (InvalidAppCheckError, InvalidTokenError),
 * for the module to answer.
 */
export function authentication(
  tokenVerifier: TokenVerifier,
  appCheckVerifier: AppCheckVerifier,
): RequestHandler {
  return async (req, res, next) => {
    await appCheckVerifier.verify(req.get('X-Firebase-AppCheck'));
    const token = /^Bearer (.+)$/.exec(req.get('Authorization') ?? '')?.[1] ?? '';
    res.locals.identity = await tokenVerifier.verify(token);
    next();
  };
}

/** The identity the authentication middleware left on the response. */
export function identityOf(res: Response): string {
  const { identity } = res.locals;
  if (typeof identity !== 'string') throw new Error('The route is not behind the authentication');
  return identity;
}
