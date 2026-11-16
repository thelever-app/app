import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { bearer, composedHttpServer } from '../../support/room-server.ts';

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
});
