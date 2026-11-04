import { CONTRACT_VERSION } from '@thelever-app/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { FakeAppCheckVerifier, VALID_APP_CHECK } from '../support/fake-app-check-verifier.ts';
import { bearer, startRoomServer, TestClient } from '../support/room-server.ts';
import { tokenOf } from '../support/fake-token-verifier.ts';

const servers: Awaited<ReturnType<typeof startRoomServer>>[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) await server.stop();
});

/** The room server as dev and prod run it: it asks every call to prove it comes from the app. */
async function serverAskingForAppCheck() {
  const server = await startRoomServer({ appCheckVerifier: new FakeAppCheckVerifier() });
  servers.push(server);
  return server;
}

function createRoom(http: string, headers: Record<string, string>) {
  return fetch(`${http}/rooms`, {
    method: 'POST',
    headers: { Authorization: bearer('ana'), 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ nickname: 'Ana' }),
  });
}

describe('App Check', () => {
  it('should turn down a request without a valid App Check token, with its code', async () => {
    // Arrange
    const { http } = await serverAskingForAppCheck();

    // Act
    const missing = await createRoom(http, {});
    const forged = await createRoom(http, { 'X-Firebase-AppCheck': 'forged' });

    // Assert
    expect([missing.status, forged.status]).toEqual([401, 401]);
    expect(await missing.json()).toEqual({ code: 'invalid-app-check' });
  });

  it('should serve a request with a valid App Check token', async () => {
    // Arrange
    const { http } = await serverAskingForAppCheck();

    // Act
    const response = await createRoom(http, { 'X-Firebase-AppCheck': VALID_APP_CHECK });

    // Assert
    expect(response.status).toBe(201);
  });

  it('should turn down a connect without a valid App Check token, before looking at the game', async () => {
    // Arrange
    const { url } = await serverAskingForAppCheck();
    const ana = await TestClient.open(url);

    // Act
    ana.send({
      type: 'connect',
      contractVersion: CONTRACT_VERSION,
      token: tokenOf('ana'),
      gameId: 'TestGameId',
      language: 'es',
    });

    // Assert
    expect(await ana.next('error')).toEqual({
      type: 'error',
      command: 'connect',
      code: 'invalid-app-check',
    });
  });
});
