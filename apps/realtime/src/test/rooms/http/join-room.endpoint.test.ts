import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  bearer,
  composedHttpServer,
  JOIN_AVATAR,
  ROOM_CHOICES,
} from '../../support/room-server.ts';

async function roomOfAna() {
  const server = await composedHttpServer();
  const { body: room } = await request(server)
    .post('/rooms')
    .set('Authorization', bearer('ana'))
    .send({ nickname: 'Ana', ...ROOM_CHOICES });
  return { server, room };
}

describe('POST /rooms/:roomId/players', () => {
  it('should add whoever calls to the room, and give them the same player if they join again', async () => {
    // Arrange
    const { server, room } = await roomOfAna();

    // Act
    const first = await request(server)
      .post(`/rooms/${room.roomId}/players`)
      .set('Authorization', bearer('luis'))
      .send({ nickname: 'Luis', avatar: JOIN_AVATAR });
    const again = await request(server)
      .post(`/rooms/${room.roomId}/players`)
      .set('Authorization', bearer('luis'))
      .send({ nickname: 'Luis', avatar: JOIN_AVATAR });

    // Assert
    expect(first.status).toBe(201);
    expect(first.body.playerId).not.toBe(room.playerId);
    expect(first.body.joinedLate).toBe(false);
    expect(again.body.playerId).toBe(first.body.playerId);
  });

  it('should answer nickname-and-avatar-taken to someone called like the host with her avatar', async () => {
    // Arrange
    const { server, room } = await roomOfAna();

    // Act
    const response = await request(server)
      .post(`/rooms/${room.roomId}/players`)
      .set('Authorization', bearer('another-ana'))
      .send({ nickname: 'ana', avatar: ROOM_CHOICES.avatar });

    // Assert
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ code: 'nickname-and-avatar-taken' });
  });

  it('should answer invalid-message to a join without an avatar', async () => {
    // Arrange
    const { server, room } = await roomOfAna();

    // Act
    const response = await request(server)
      .post(`/rooms/${room.roomId}/players`)
      .set('Authorization', bearer('luis'))
      .send({ nickname: 'Luis' });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'invalid-message' });
  });

  it('should answer room-not-found for a room that does not exist', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .post('/rooms/unknown-room/players')
      .set('Authorization', bearer('luis'))
      .send({ nickname: 'Luis', avatar: JOIN_AVATAR });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'room-not-found' });
  });
});
