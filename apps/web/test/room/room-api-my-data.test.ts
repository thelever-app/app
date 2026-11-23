import { describe, expect, it } from 'vitest';
import { deviceAccessCode } from '../../src/identity/access-code.ts';
import { httpRoomApi } from '../../src/room/room-api.ts';

const FIRST_ACCESS = {
  region: 'eea',
  step: 'done',
  pending: [],
  changed: [],
  current: { 'terms-of-use': 1, 'game-consent': 2 },
  underEighteen: false,
  monthOfBirthAskedFrom: 2008,
};

function apiAnswering(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (async (url: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return new Response(status === 204 ? null : JSON.stringify(body), { status });
  }) as typeof globalThis.fetch;
  const items = new Map<string, string>();
  const api = httpRoomApi({
    realtimeUrl: 'wss://realtime.example',
    player: { getToken: async () => 'id-token', getAppCheckToken: async () => undefined },
    accessCode: deviceAccessCode(() => ({
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => void items.set(key, value),
      removeItem: (key) => void items.delete(key),
    })),
    fetch,
    newTraceparent: () => '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
  });
  return { api, calls };
}

describe('httpRoomApi, my data', () => {
  it('should send where the visit came from on opening the app, and nothing else of the address', async () => {
    // Arrange
    const { api, calls } = apiAnswering(200, FIRST_ACCESS);

    // Act
    await api.openApp('?utm_source=cartel&utm_campaign=bares&utm_content=tinder&lang=en&x=1');

    // Assert
    expect(calls[0]?.url).toBe(
      'https://realtime.example/first-access?utm_source=cartel&utm_campaign=bares&utm_content=tinder',
    );
  });

  it('should open the app with no query when the address has no origin', async () => {
    // Arrange
    const { api, calls } = apiAnswering(200, FIRST_ACCESS);

    // Act
    await api.openApp('?lang=es');

    // Assert
    expect(calls[0]?.url).toBe('https://realtime.example/first-access');
  });

  it('should read the code and the permissions of the player', async () => {
    // Arrange
    const mine = { requestCode: 'K7Q4-MD2X-9PRT', gameConsent: 'given', objectsToAnalytics: false };
    const { api, calls } = apiAnswering(200, mine);

    // Act & Assert
    expect(await api.myData()).toEqual(mine);
    expect(calls[0]?.url).toBe('https://realtime.example/my-data');
  });

  it('should object to product analytics, and ask for the deletion', async () => {
    // Arrange
    const { api, calls } = apiAnswering(204, undefined);

    // Act
    await api.objectToAnalytics(true);
    await api.requestDataDeletion();

    // Assert
    expect(calls.map(({ url, init }) => [url, init.method, init.body])).toEqual([
      ['https://realtime.example/my-data/analytics-objection', 'POST', '{"objects":true}'],
      ['https://realtime.example/my-data/deletion', 'POST', '{}'],
    ]);
  });

  it('should withdraw the game consent and say where the first access is', async () => {
    // Arrange
    const { api, calls } = apiAnswering(200, {
      ...FIRST_ACCESS,
      step: 'documents',
      pending: ['game-consent'],
    });

    // Act
    const status = await api.withdrawGameConsent();

    // Assert
    expect(status.pending).toEqual(['game-consent']);
    expect(calls[0]?.url).toBe('https://realtime.example/my-data/game-consent-withdrawal');
  });
});
