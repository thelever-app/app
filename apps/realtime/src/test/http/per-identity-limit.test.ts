import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.ts';
import type { HttpEndpoint } from '../../http/http-endpoint.ts';
import { httpErrorHandler } from '../../http/error-handler.ts';

/** A route each identity may call twice a minute. */
const LIMITED: HttpEndpoint = {
  method: 'get',
  path: '/limited',
  authenticated: true,
  perIdentityPerMinute: 2,
  async handle(_req, res) {
    res.json({ ok: true });
  },
};

function app() {
  return createApp([LIMITED], {
    // The identity of the call is the one the test sends.
    authenticate: (req, res, next) => {
      res.locals.identity = req.get('X-Test-Identity');
      next();
    },
    errorHandler: httpErrorHandler(() => undefined),
    webOrigins: [],
  });
}

describe('the limit of calls of each identity', () => {
  it('should answer too-many-requests to an identity past its calls of the minute', async () => {
    // Arrange
    const server = app();
    const call = () => request(server).get('/limited').set('X-Test-Identity', 'ana');

    // Act
    const answers = [await call(), await call(), await call()];

    // Assert
    expect(answers.map(({ status }) => status)).toEqual([200, 200, 429]);
    expect(answers[2]?.body).toEqual({ code: 'too-many-requests' });
  });

  it('should count each identity apart', async () => {
    // Arrange
    const server = app();
    await request(server).get('/limited').set('X-Test-Identity', 'ana');
    await request(server).get('/limited').set('X-Test-Identity', 'ana');

    // Act
    const luis = await request(server).get('/limited').set('X-Test-Identity', 'luis');

    // Assert
    expect(luis.status).toBe(200);
  });
});
