import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authentication, identityOf } from '../../http/authentication.ts';
import { InvalidTokenError } from '../../identity/token-verifier.ts';
import { FakeTokenVerifier, tokenOf } from '../support/fake-token-verifier.ts';

/** An app with one route behind the authentication that answers with the identity, or with the error. */
function appBehindAuthentication() {
  const app = express();
  app.use(authentication(new FakeTokenVerifier()));
  app.get('/whoami', (_req, res) => {
    res.json({ identity: identityOf(res) });
  });
  app.use(((error, _req, res, next) => {
    if (!(error instanceof InvalidTokenError)) {
      next(error);
      return;
    }
    res.status(401).json({ invalidToken: true });
  }) as express.ErrorRequestHandler);
  return app;
}

describe('authentication', () => {
  it('should leave the identity behind a valid bearer token for the route', async () => {
    // Act
    const response = await request(appBehindAuthentication())
      .get('/whoami')
      .set('Authorization', `Bearer ${tokenOf('ana')}`);

    // Assert
    expect(response.body).toEqual({ identity: 'ana' });
  });

  it.each([
    ['no Authorization header', undefined],
    ['a header that is not a bearer token', tokenOf('ana')],
    ['an invalid token', 'Bearer forged'],
  ])('should fail the request with %s', async (_case, header) => {
    // Arrange
    const call = request(appBehindAuthentication()).get('/whoami');

    // Act
    const response = await (header ? call.set('Authorization', header) : call);

    // Assert
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ invalidToken: true });
  });
});
