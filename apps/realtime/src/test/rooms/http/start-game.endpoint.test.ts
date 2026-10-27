import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { bearer, composedHttpServer } from '../../support/room-server.ts';

/** A room hosted by Ana, on that server. */
async function roomOfAna(server: Awaited<ReturnType<typeof composedHttpServer>>) {
  const { body } = await request(server)
    .post('/rooms')
    .set('Authorization', bearer('ana'))
    .send({ nickname: 'Ana' });
  return body as { roomId: string };
}

describe('POST /rooms/:roomId/games', () => {
  it('should start a game in the decision phase with the dilemmas asked for', async () => {
    // Arrange
    const server = await composedHttpServer();
    const { roomId } = await roomOfAna(server);

    // Act
    const response = await request(server)
      .post(`/rooms/${roomId}/games`)
      .set('Authorization', bearer('ana'))
      .send({ dilemmaIds: SEED_DILEMMAS.map(({ id }) => id) });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ gameId: expect.any(String) });
  });

  it('should answer dilemma-not-found for a dilemma the catalog does not have', async () => {
    // Arrange
    const server = await composedHttpServer();
    const { roomId } = await roomOfAna(server);

    // Act
    const response = await request(server)
      .post(`/rooms/${roomId}/games`)
      .set('Authorization', bearer('ana'))
      .send({ dilemmaIds: ['unknown-dilemma'] });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'dilemma-not-found' });
  });
});
