import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { bearer, composedHttpServer, ROOM_CHOICES, WEB_ORIGIN } from '../../support/room-server.ts';

async function roomOfAna() {
  const server = await composedHttpServer();
  const { body } = await request(server)
    .post('/rooms')
    .set('Authorization', bearer('ana'))
    .send({ nickname: 'Ana', ...ROOM_CHOICES });
  await request(server)
    .post(`/rooms/${body.roomId}/players`)
    .set('Authorization', bearer('luis'))
    .send({ nickname: 'Luis' });
  return { server, roomId: body.roomId as string, code: body.code as string };
}

describe('GET /rooms/by-code/:code', () => {
  it('should show whose the room is, its type and how many are in, typed in any case', async () => {
    // Arrange
    const { server, roomId, code } = await roomOfAna();

    // Act
    const response = await request(server)
      .get(`/rooms/by-code/${code.toLowerCase()}`)
      .set('Authorization', bearer('marta'));

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      roomId,
      hostNickname: 'Ana',
      variant: 'nominal',
      adultsOnly: false,
      playerCount: 2,
    });
  });

  it('should answer room-code-not-found for a code no room has', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .get('/rooms/by-code/ZZZZZ')
      .set('Authorization', bearer('marta'));

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'room-code-not-found' });
  });

  it('should answer only callers with a token', async () => {
    // Arrange
    const { server, code } = await roomOfAna();

    // Act
    const response = await request(server).get(`/rooms/by-code/${code}`);

    // Assert
    expect(response.status).toBe(401);
  });
});

describe('the HTTP routes, seen from the web', () => {
  it('should let the web send its token and read the answer', async () => {
    // Arrange
    const server = await composedHttpServer();

    // Act
    const preflight = await request(server)
      .options('/rooms')
      .set('Origin', WEB_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');
    const created = await request(server)
      .post('/rooms')
      .set('Origin', WEB_ORIGIN)
      .set('Authorization', bearer('ana'))
      .send({ nickname: 'Ana', ...ROOM_CHOICES });

    // Assert
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-headers']).toContain('Authorization');
    expect(created.status).toBe(201);
    expect(created.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
  });
});
