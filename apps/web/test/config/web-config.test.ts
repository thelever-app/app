import { describe, expect, it } from 'vitest';
import { loadWebConfig } from '../../src/config/web-config.ts';

/** A fetch that answers every request with that body and status. */
function answering(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

const FIREBASE = {
  apiKey: 'test-api-key',
  authDomain: 'thelever-app-dev.firebaseapp.com',
  projectId: 'thelever-app-dev',
  appId: 'test-app-id',
};

const CONFIG = { realtimeUrl: 'wss://realtime.thelever.app', firebase: FIREBASE };

describe('loadWebConfig', () => {
  it('should read the room server and the Firebase project of this environment', async () => {
    // Act
    const config = await loadWebConfig(answering(CONFIG));

    // Assert
    expect(config).toEqual(CONFIG);
  });

  it('should read the Auth emulator of local development when there is one', async () => {
    // Act
    const config = await loadWebConfig(
      answering({ ...CONFIG, authEmulatorUrl: 'http://127.0.0.1:9099' }),
    );

    // Assert
    expect(config.authEmulatorUrl).toBe('http://127.0.0.1:9099');
  });

  it.each([
    ['a missing file', answering({}, 404)],
    ['a config without the URL', answering({ firebase: FIREBASE })],
    [
      'a URL that is not a WebSocket one',
      answering({ ...CONFIG, realtimeUrl: 'https://realtime.thelever.app' }),
    ],
    ['a URL that is not a URL', answering({ ...CONFIG, realtimeUrl: 'realtime' })],
    ['a config without Firebase', answering({ realtimeUrl: CONFIG.realtimeUrl })],
    [
      'a Firebase project without its id',
      answering({ ...CONFIG, firebase: { ...FIREBASE, projectId: '' } }),
    ],
    ['an emulator that is not a URL', answering({ ...CONFIG, authEmulatorUrl: 'localhost' })],
  ])('should reject %s', async (_case, fetchConfig) => {
    // Act & Assert
    await expect(loadWebConfig(fetchConfig)).rejects.toThrow();
  });
});
