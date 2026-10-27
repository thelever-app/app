import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { bearer, composedHttpServer } from '../../support/room-server.ts';

describe('POST /rooms', () => {
  it('should create a room hosted by whoever calls', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .post('/rooms')
      .set('Authorization', bearer('ana'))
      .send({ nickname: 'Ana' });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ roomId: expect.any(String), playerId: expect.any(String) });
  });

  it('should reject a request without a token or with an invalid one', async () => {
    // Arrange
    const server = await composedHttpServer();

    // Act
    const withoutToken = await request(server).post('/rooms').send({ nickname: 'Ana' });
    const withInvalidToken = await request(server)
      .post('/rooms')
      .set('Authorization', 'Bearer forged')
      .send({ nickname: 'Ana' });

    // Assert
    for (const response of [withoutToken, withInvalidToken]) {
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ code: 'invalid-token' });
    }
  });

  it('should reject a body that does not follow the contract', async () => {
    // Act
    const response = await request(await composedHttpServer())
      .post('/rooms')
      .set('Authorization', bearer('ana'))
      .send({ nickname: '' });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'invalid-message' });
  });
});
