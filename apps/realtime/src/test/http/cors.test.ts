import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { cors } from '../../http/cors.ts';

const WEB = 'https://thelever.app';

function app() {
  const created = express();
  created.use(cors([WEB, 'http://localhost:5173']));
  created.get('/rooms/by-code/:code', (_req, res) => {
    res.json({ ok: true });
  });
  return created;
}

describe('cors', () => {
  it('should let the web read the answer to a request from one of its origins', async () => {
    // Act
    const response = await request(app()).get('/rooms/by-code/K7M2Q').set('Origin', WEB);

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(WEB);
    expect(response.headers.vary).toContain('Origin');
  });

  it('should answer the preflight of the web with the methods and headers it sends', async () => {
    // Act
    const response = await request(app())
      .options('/rooms')
      .set('Origin', WEB)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type,x-firebase-appcheck');

    // Assert
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(WEB);
    expect(response.headers['access-control-allow-methods']).toBe('GET, POST');
    expect(response.headers['access-control-allow-headers']).toBe(
      'Authorization, Content-Type, X-Firebase-AppCheck, traceparent',
    );
  });

  it('should not let any other origin read the answer', async () => {
    // Act
    const response = await request(app())
      .get('/rooms/by-code/K7M2Q')
      .set('Origin', 'https://evil.example');

    // Assert
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should leave alone a request that comes from no browser', async () => {
    // Act
    const response = await request(app()).get('/rooms/by-code/K7M2Q');

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
