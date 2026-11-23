import { afterEach, describe, expect, it } from 'vitest';
import { bearer, lobbyOfThree, startRoomServer } from '../support/room-server.ts';

const servers: Awaited<ReturnType<typeof startRoomServer>>[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) await server.stop();
});

async function server() {
  const started = await startRoomServer();
  servers.push(started);
  return started;
}

/** A call of that player, who finished the first access. */
async function call(http: string, path: string, identity = 'ana', body?: object) {
  return fetch(`${http}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: bearer(identity), 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }),
  });
}

describe('the routes of my data', () => {
  it('should give the code for requests by email, the game consent and the objection', async () => {
    // Arrange
    const { http } = await server();

    // Act
    const response = await call(http, '/my-data');

    // Assert
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ gameConsent: 'given', objectsToAnalytics: false });
    expect(body['requestCode']).toMatch(
      /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/,
    );
  });

  it('should give each player a different code', async () => {
    // Arrange
    const { http } = await server();

    // Act
    const codes = await Promise.all(
      ['ana', 'luis', 'marta'].map(async (identity) => {
        const response = await call(http, '/my-data', identity);
        return ((await response.json()) as { requestCode: string }).requestCode;
      }),
    );

    // Assert
    expect(new Set(codes).size).toBe(3);
  });

  it('should withdraw the game consent, stop who withdrew it from joining rooms and ask for it again', async () => {
    // Arrange
    const { http } = await server();
    const { roomId } = await lobbyOfThree(http);

    // Act
    const response = await call(http, '/my-data/game-consent-withdrawal', 'pedro', {});

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ step: 'documents', pending: ['game-consent'] });
    const joining = await call(http, `/rooms/${roomId}/players`, 'pedro', {
      nickname: 'Pedro',
      avatar: { face: 'face-02', color: 'teal' },
    });
    expect(joining.status).toBe(403);
    const mine = (await (await call(http, '/my-data', 'pedro')).json()) as Record<string, unknown>;
    expect(mine['gameConsent']).toBe('withdrawn');
  });

  it('should take the objection to product analytics, and lift it', async () => {
    // Arrange
    const { http } = await server();

    // Act
    const objecting = await call(http, '/my-data/analytics-objection', 'ana', { objects: true });
    const objected = (await (await call(http, '/my-data')).json()) as Record<string, unknown>;
    await call(http, '/my-data/analytics-objection', 'ana', { objects: false });
    const lifted = (await (await call(http, '/my-data')).json()) as Record<string, unknown>;

    // Assert
    expect(objecting.status).toBe(204);
    expect(objected['objectsToAnalytics']).toBe(true);
    expect(lifted['objectsToAnalytics']).toBe(false);
  });

  it('should take the request to delete the data', async () => {
    // Arrange
    const { http } = await server();

    // Act
    const response = await call(http, '/my-data/deletion', 'ana', {});

    // Assert
    expect(response.status).toBe(202);
  });

  it('should not answer without a token', async () => {
    // Arrange
    const { http } = await server();

    // Act
    const response = await fetch(`${http}/my-data`);

    // Assert
    expect(response.status).toBe(401);
  });
});
