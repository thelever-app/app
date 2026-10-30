import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.ts';
import type { HttpEndpoint, HttpMethod } from '../http/http-endpoint.ts';

/** An endpoint that answers with its body, or fails with `failure` if given one. */
function echo(
  method: HttpMethod,
  path: string,
  authenticated: boolean,
  failure?: Error,
): HttpEndpoint {
  return {
    method,
    path,
    authenticated,
    async handle(req: Request, res: Response) {
      if (failure) throw failure;
      res.json({ body: req.body, guarded: res.locals.guarded === true });
    },
  };
}

const guard: RequestHandler = (_req, res, next) => {
  res.locals.guarded = true;
  next();
};

const errorHandler: ErrorRequestHandler = (error: Error, _req, res, next) => {
  if (error.message !== 'expected') {
    next(error);
    return;
  }
  res.status(418).json({ handled: true });
};

describe('createApp', () => {
  it('should mount every endpoint it is given, whatever it does', async () => {
    // Arrange
    const app = createApp([echo('post', '/anything', false)], {
      authenticate: guard,
      errorHandler,
    });

    // Act
    const response = await request(app).post('/anything').send({ value: 1 });

    // Assert
    expect(response.body).toEqual({ body: { value: 1 }, guarded: false });
  });

  it('should put the authentication only in front of the endpoints that ask for it', async () => {
    // Arrange
    const app = createApp([echo('get', '/open', false), echo('get', '/closed', true)], {
      authenticate: guard,
      errorHandler,
    });

    // Act
    const open = await request(app).get('/open');
    const closed = await request(app).get('/closed');

    // Assert
    expect(open.body.guarded).toBe(false);
    expect(closed.body.guarded).toBe(true);
  });

  it('should hand whatever an endpoint throws to the error handler', async () => {
    // Arrange
    const app = createApp([echo('get', '/failing', false, new Error('expected'))], {
      authenticate: guard,
      errorHandler,
    });

    // Act
    const response = await request(app).get('/failing');

    // Assert
    expect(response.status).toBe(418);
    expect(response.body).toEqual({ handled: true });
  });
});
