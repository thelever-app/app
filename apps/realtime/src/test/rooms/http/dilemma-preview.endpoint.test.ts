import { Dilemma, GetDilemmaPreviewUseCase } from '@thelever-app/dilemmas';
import { InMemoryDilemmaRepository } from '@thelever-app/dilemmas/in-memory';
import { InMemorySealProvider, SEAL_BEFORE_FIRST_ACCESS } from '@thelever-app/game/in-memory';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { httpErrorHandler } from '../../../http/error-handler.ts';
import { errorCodeOf } from '../../../rooms/error-codes.ts';
import { DilemmaPreviewEndpoint } from '../../../rooms/http/dilemma-preview.endpoint.ts';
import { bearer, composedHttpServer } from '../../support/room-server.ts';

/** The endpoint over a repository with a dilemma for adults, where Ana is an adult and Luis is 17. */
async function endpointWithADilemmaForAdults() {
  const repository = new InMemoryDilemmaRepository();
  const ids = ['dlm-9', 'dlm-9-option-1', 'dlm-9-option-2', 'TestAdultsPublicId'];
  await repository.save(
    Dilemma.create(
      {
        text: 'TestText',
        language: 'es',
        options: ['TestOptionA', 'TestOptionB'],
        category: 'love-and-relationships',
        tags: [],
        minimumAge: 18,
        type: 'standard',
        compromising: false,
        scale: 'everyday',
        fixedOrder: false,
      },
      { generate: () => ids.shift()! },
    ),
  );
  const seals = new InMemorySealProvider(
    new Map([
      ['ana', { ...SEAL_BEFORE_FIRST_ACCESS, underEighteen: false }],
      ['luis', { ...SEAL_BEFORE_FIRST_ACCESS, underEighteen: true }],
    ]),
  );
  return new DilemmaPreviewEndpoint(new GetDilemmaPreviewUseCase(repository), seals);
}

/**
 * Asks for the dilemma for adults as `identity`, with that query: the endpoint behind the handler of
 * errors of the server, with whoever asks already authenticated.
 */
async function askFor(identity: string, query: string) {
  const endpoint = await endpointWithADilemmaForAdults();
  const app = express();
  app.get(endpoint.path, (req, res, next) => {
    res.locals.identity = identity;
    endpoint.handle(req, res).catch(next);
  });
  app.use(httpErrorHandler(errorCodeOf));
  return request(app).get(`/dilemmas/TestAdultsPublicId${query}`);
}

describe('GET /dilemmas/:publicId', () => {
  it('should show what a room needs to start with the dilemma of that public id', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .get('/dilemmas/seed-trolley-public')
      .set('Authorization', bearer('ana'));

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      dilemmaId: 'seed-trolley',
      category: 'life-and-death',
      optionCount: 2,
      minimumAge: 16,
      language: 'es',
      text: expect.any(String),
      options: [
        { optionId: expect.any(String), text: expect.any(String) },
        { optionId: expect.any(String), text: expect.any(String) },
      ],
      version: 1,
    });
  });

  it('should answer dilemma-not-found for the id of a dilemma, which is not its public id', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .get('/dilemmas/seed-trolley')
      .set('Authorization', bearer('ana'));

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'dilemma-not-found' });
  });

  it('should reject a request without a token', async () => {
    // Act
    const response = await request(await composedHttpServer()).get('/dilemmas/seed-trolley-public');

    // Assert
    expect(response.status).toBe(401);
  });

  it('should show what a room needs to start with a dilemma suitable from 16, also to start a room', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .get('/dilemmas/seed-trolley-public?for=room')
      .set('Authorization', bearer('ana'));

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.dilemmaId).toBe('seed-trolley');
  });

  it('should show a dilemma for adults to an adult who starts a room with it', async () => {
    // Act
    const response = await askFor('ana', '?for=room');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ dilemmaId: 'dlm-9', minimumAge: 18 }));
  });

  it('should tell someone under 18 that a dilemma for adults is only for adults, without it', async () => {
    // Act
    const response = await askFor('luis', '?for=room');

    // Assert
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ code: 'dilemma-only-for-adults' });
  });

  it('should not show a dilemma for adults to vote it alone, not even to an adult', async () => {
    // Act
    const response = await askFor('ana', '');

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'dilemma-not-found' });
  });
});
