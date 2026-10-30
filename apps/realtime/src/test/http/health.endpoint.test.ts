import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { composedHttpServer } from '../support/room-server.ts';

describe('GET /health', () => {
  it('should report the service is up, without a token', async () => {
    // Act
    const response = await request(await composedHttpServer()).get('/health');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
