import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { httpErrorHandler } from '../../http/error-handler.ts';
import { InvalidBodyError } from '../../http/parse-body.ts';

class KnownError extends Error {}
class ConflictError extends Error {}

/** An app whose only route throws `error`, behind the handler under test. */
function failingWith(error: Error) {
  const app = express();
  app.get('/', () => {
    throw error;
  });
  app.use(
    httpErrorHandler((candidate) => {
      if (candidate instanceof KnownError) return 'room-not-found';
      if (candidate instanceof ConflictError) return 'dilemma-not-reached';
      return undefined;
    }),
  );
  return app;
}

describe('httpErrorHandler', () => {
  it('should answer a body that does not follow the contract with invalid-message', async () => {
    // Act
    const response = await request(failingWith(new InvalidBodyError())).get('/');

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'invalid-message' });
  });

  it('should answer an error a client causes with its code and status', async () => {
    // Act
    const response = await request(failingWith(new KnownError())).get('/');

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'room-not-found' });
  });

  it('should answer a broken rule of the game as a conflict', async () => {
    // Act
    const response = await request(failingWith(new ConflictError())).get('/');

    // Assert
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ code: 'dilemma-not-reached' });
  });

  it('should leave any other error to Express, as a fault of the server', async () => {
    // Act
    const response = await request(failingWith(new Error('unexpected'))).get('/');

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).not.toHaveProperty('code');
  });
});
