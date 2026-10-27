import { describe, expect, it } from 'vitest';
import { loadWebConfig } from '../../src/config/web-config.ts';

/** A fetch that answers every request with that body and status. */
function answering(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

describe('loadWebConfig', () => {
  it('should read the URL of the room server of this environment', async () => {
    // Act
    const config = await loadWebConfig(answering({ realtimeUrl: 'wss://realtime.thelever.app' }));

    // Assert
    expect(config).toEqual({ realtimeUrl: 'wss://realtime.thelever.app' });
  });

  it.each([
    ['a missing file', answering({}, 404)],
    ['a config without the URL', answering({})],
    [
      'a URL that is not a WebSocket one',
      answering({ realtimeUrl: 'https://realtime.thelever.app' }),
    ],
    ['a URL that is not a URL', answering({ realtimeUrl: 'realtime' })],
  ])('should reject %s', async (_case, fetchConfig) => {
    // Act & Assert
    await expect(loadWebConfig(fetchConfig)).rejects.toThrow();
  });
});
