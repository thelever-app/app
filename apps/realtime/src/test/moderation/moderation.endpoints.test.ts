import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import {
  bearer,
  composedHttpServer,
  JOIN_AVATAR,
  post,
  ROOM_CHOICES,
  startRoomServer,
  TestClient,
} from '../support/room-server.ts';

const NOTICE = {
  reference: 'https://thelever.app/es/honestidad/el-tranvia-1',
  explanation: 'TestExplanation',
  language: 'es',
  goodFaith: true,
};

describe('POST /illegal-content-notices', () => {
  it('should take a notice from someone who never did the first access, without name or email', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .post('/illegal-content-notices')
      .set('Authorization', bearer('someone-without-the-app'))
      .send(NOTICE);

    // Assert
    expect(response.status).toBe(204);
  });

  it('should turn down a notice without the declaration of good faith', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .post('/illegal-content-notices')
      .set('Authorization', bearer('ana'))
      .send({ ...NOTICE, goodFaith: false });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'invalid-message' });
  });

  it('should turn down an email that does not work', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .post('/illegal-content-notices')
      .set('Authorization', bearer('ana'))
      .send({ ...NOTICE, email: 'not an email' });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'invalid-notice' });
  });

  it('should take no more than 5 notices a day from the same caller', async () => {
    // Arrange
    const server = await composedHttpServer();
    for (let sent = 0; sent < 5; sent++) {
      await request(server)
        .post('/illegal-content-notices')
        .set('Authorization', bearer('ana'))
        .send(NOTICE);
    }

    // Act
    const response = await request(server)
      .post('/illegal-content-notices')
      .set('Authorization', bearer('ana'))
      .send(NOTICE);

    // Assert
    expect(response.status).toBe(429);
    expect(response.body).toEqual({ code: 'too-many-notices' });
  });

  it('should reject a notice without a token', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .post('/illegal-content-notices')
      .send(NOTICE);

    // Assert
    expect(response.status).toBe(401);
  });
});

describe('GET /moderation-notices', () => {
  it('should give a player without decisions none', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .get('/moderation-notices')
      .set('Authorization', bearer('ana'));

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ notices: [] });
  });

  it('should not let a player see a notice that is not theirs', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .post('/moderation-notices/TestNotice/seen')
      .set('Authorization', bearer('ana'));

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'moderation-notice-not-found' });
  });
});

describe('report-nickname over the room sockets', () => {
  const servers: Awaited<ReturnType<typeof startRoomServer>>[] = [];

  afterEach(async () => {
    for (const server of servers.splice(0)) await server.stop();
  });

  it('should take the report of a nickname and tell nobody in the room', async () => {
    // Arrange
    const server = await startRoomServer();
    servers.push(server);
    const { roomId: room } = await post(`${server.http}/rooms`, 'ana', {
      nickname: 'Ana',
      ...ROOM_CHOICES,
    });
    const roomId = room!;
    await post(`${server.http}/rooms/${roomId}/players`, 'luis', {
      nickname: 'Luis',
      avatar: JOIN_AVATAR,
    });
    const { playerId: martaId } = await post(`${server.http}/rooms/${roomId}/players`, 'marta', {
      nickname: 'Marta',
      avatar: JOIN_AVATAR,
    });
    const luis = await TestClient.connected(server.url, 'luis', roomId, 'room-state');
    const ana = await TestClient.connected(server.url, 'ana', roomId, 'room-state');
    const before = ana.received.length;

    // Act
    luis.send({ type: 'report-nickname', playerId: martaId!, reason: 'offensive' });
    luis.send({ type: 'report-nickname', playerId: 'not-in-this-room', reason: 'offensive' });

    // Assert
    const error = await luis.next('error');
    expect(error).toMatchObject({ command: 'report-nickname', code: 'player-not-in-room' });
    expect(ana.received).toHaveLength(before);
  });
});
