import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { bearer, composedHttpServer } from '../../support/room-server.ts';

describe('POST /rooms/:roomId/players', () => {
  it('should add whoever calls to the room, and give them the same player if they join again', async () => {
    // Arrange
    const server = await composedHttpServer();
    const { body: room } = await request(server)
      .post('/rooms')
      .set('Authorization', bearer('ana'))
      .send({ nickname: 'Ana' });

    // Act
    const first = await request(server)
      .post(`/rooms/${room.roomId}/players`)
      .set('Authorization', bearer('luis'))
      .send({ nickname: 'Luis' });
    const again = await request(server)
      .post(`/rooms/${room.roomId}/players`)
      .set('Authorization', bearer('luis'))
      .send({ nickname: 'Luis' });

    // Assert
    expect(first.status).toBe(201);
    expect(first.body.playerId).not.toBe(room.playerId);
    expect(again.body.playerId).toBe(first.body.playerId);
  });

  it('should answer room-not-found for a room that does not exist', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .post('/rooms/unknown-room/players')
      .set('Authorization', bearer('luis'))
      .send({ nickname: 'Luis' });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'room-not-found' });
  });
});
