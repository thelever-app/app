import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SecretFileAccessGate } from '../../identity/secret-file-access-gate.ts';
import {
  bearer,
  JOIN_AVATAR,
  ROOM_CHOICES,
  startRoomServer,
  WEB_ORIGIN,
} from '../support/room-server.ts';

/** Test data: the code of the environment the server reads from its secret. */
const ACCESS_CODE = 'k7m2x9q4w1zp';

const servers: Awaited<ReturnType<typeof startRoomServer>>[] = [];
let folder: string;
let secret: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'access-code-'));
  secret = join(folder, 'value');
  await writeFile(secret, ACCESS_CODE);
});

afterEach(async () => {
  for (const server of servers.splice(0)) await server.stop();
  await rm(folder, { recursive: true, force: true });
});

/**
 * The room server as dev and prod run it: only who has the access code may enter a room. It
 * reads the secret again on every call, so a test can change it.
 */
async function closedServer() {
  const accessGate = await SecretFileAccessGate.open(secret, { readAgainAfterMs: 0 });
  const server = await startRoomServer({ accessGate });
  servers.push(server);
  return server;
}

function withCode(code: string | undefined): Record<string, string> {
  return code === undefined ? {} : { 'X-Access-Code': encodeURIComponent(code) };
}

function createRoom(http: string, code?: string) {
  return fetch(`${http}/rooms`, {
    method: 'POST',
    headers: {
      Authorization: bearer('ana'),
      'Content-Type': 'application/json',
      ...withCode(code),
    },
    body: JSON.stringify({ nickname: 'Ana', ...ROOM_CHOICES }),
  });
}

describe('the access gate', () => {
  it.each([
    ['without a code', undefined],
    ['with a code that is not the one of the environment', 'another-code'],
  ])('should turn down creating a room %s, with its code', async (_case, code) => {
    // Arrange
    const { http } = await closedServer();

    // Act
    const response = await createRoom(http, code);

    // Assert
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: 'invalid-access-code' });
  });

  it('should let whoever has the code create a room', async () => {
    // Arrange
    const { http } = await closedServer();

    // Act
    const response = await createRoom(http, ACCESS_CODE);

    // Assert
    expect(response.status).toBe(201);
  });

  it('should turn down seeing a room and joining it without the code', async () => {
    // Arrange
    const { http } = await closedServer();
    const { roomId, code } = (await (await createRoom(http, ACCESS_CODE)).json()) as {
      roomId: string;
      code: string;
    };

    // Act
    const preview = await fetch(`${http}/rooms/by-code/${code}`, {
      headers: { Authorization: bearer('luis') },
    });
    const join = await fetch(`${http}/rooms/${roomId}/players`, {
      method: 'POST',
      headers: { Authorization: bearer('luis'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'Luis', avatar: JOIN_AVATAR }),
    });

    // Assert
    expect([preview.status, join.status]).toEqual([403, 403]);
    expect(await join.json()).toEqual({ code: 'invalid-access-code' });
  });

  it('should let whoever has the code see a room and join it', async () => {
    // Arrange
    const { http } = await closedServer();
    const { roomId, code } = (await (await createRoom(http, ACCESS_CODE)).json()) as {
      roomId: string;
      code: string;
    };

    // Act
    const preview = await fetch(`${http}/rooms/by-code/${code}`, {
      headers: { Authorization: bearer('luis'), ...withCode(ACCESS_CODE) },
    });
    const join = await fetch(`${http}/rooms/${roomId}/players`, {
      method: 'POST',
      headers: {
        Authorization: bearer('luis'),
        'Content-Type': 'application/json',
        ...withCode(ACCESS_CODE),
      },
      body: JSON.stringify({ nickname: 'Luis', avatar: JOIN_AVATAR }),
    });

    // Assert
    expect([preview.status, join.status]).toEqual([200, 201]);
  });

  it('should take the new code once the secret changes, without deploying again', async () => {
    // Arrange
    const { http } = await closedServer();
    await writeFile(secret, 'the-new-code');

    // Act
    const old = await createRoom(http, ACCESS_CODE);
    const fresh = await createRoom(http, 'the-new-code');

    // Assert
    expect([old.status, fresh.status]).toEqual([403, 201]);
  });

  it('should let the web send the code in its header', async () => {
    // Arrange
    const { http } = await closedServer();

    // Act
    const response = await fetch(`${http}/rooms`, {
      method: 'OPTIONS',
      headers: {
        Origin: WEB_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'x-access-code',
      },
    });

    // Assert
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Access-Code');
  });
});
