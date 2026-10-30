import type { RequestHandler, Response } from 'express';
import type { TokenVerifier } from '../identity/token-verifier.ts';

/**
 * Takes the identity of whoever calls from the token in the Authorization header.
 * A missing or invalid token fails the request with InvalidTokenError, for the module to answer.
 */
export function authentication(tokenVerifier: TokenVerifier): RequestHandler {
  return async (req, res, next) => {
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
