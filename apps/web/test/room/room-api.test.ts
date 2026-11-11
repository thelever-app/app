import { describe, expect, it } from 'vitest';
import { type AccessCode, deviceAccessCode } from '../../src/identity/access-code.ts';
import { httpRoomApi, RoomApiError } from '../../src/room/room-api.ts';

const REALTIME_URL = 'wss://realtime.example';

/** A fetch that answers every call with that status and body, and remembers what it was asked. */
function answering(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = async (url: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

/** The access code of a device that keeps it only in memory. */
function codeInMemory(): AccessCode {
  const items = new Map<string, string>();
  return deviceAccessCode(() => ({
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  }));
}

function apiWith(
  fetch: typeof globalThis.fetch,
  appCheckToken?: string,
  accessCode: AccessCode = codeInMemory(),
) {
  return httpRoomApi({
    realtimeUrl: REALTIME_URL,
    player: {
      getToken: async () => 'id-token',
      getAppCheckToken: async () => appCheckToken,
    },
    accessCode,
    fetch,
    newTraceparent: () => '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
  });
}

describe('httpRoomApi', () => {
  describe('createRoom', () => {
    it('should create the room on the room server, as the player who signed in', async () => {
      // Arrange
      const { fetch, calls } = answering(201, {
        roomId: 'room-1',
        code: 'K7M2Q',
        playerId: 'player-1',
      });

      // Act
      const created = await apiWith(fetch, 'app-check-token').createRoom({
        nickname: 'Ana',
        avatar: { face: 'face-01', color: 'teal' },
        groupNature: 'friends',
        place: 'remote',
        dilemmaLanguage: 'es',
      });

      // Assert
      expect(created).toEqual({ roomId: 'room-1', code: 'K7M2Q', playerId: 'player-1' });
      const [call] = calls;
      expect(call?.url).toBe('https://realtime.example/rooms');
      expect(call?.init.method).toBe('POST');
      expect(new Headers(call?.init.headers).get('Authorization')).toBe('Bearer id-token');
      expect(new Headers(call?.init.headers).get('X-Firebase-AppCheck')).toBe('app-check-token');
      expect(JSON.parse(String(call?.init.body))).toEqual({
        nickname: 'Ana',
        avatar: { face: 'face-01', color: 'teal' },
        groupNature: 'friends',
        place: 'remote',
        dilemmaLanguage: 'es',
      });
    });

    it('should send no App Check header where the environment asks for none', async () => {
      // Arrange
      const { fetch, calls } = answering(201, { roomId: 'r', code: 'K7M2Q', playerId: 'p' });

      // Act
      await apiWith(fetch).createRoom({
        nickname: 'Ana',
        avatar: { face: 'face-01', color: 'teal' },
        groupNature: 'friends',
        place: 'together',
        dilemmaLanguage: 'es',
      });

      // Assert
      expect(new Headers(calls[0]?.init.headers).has('X-Firebase-AppCheck')).toBe(false);
    });

    it('should turn a refusal of the server into an error with its code', async () => {
      // Arrange
      const { fetch } = answering(400, { code: 'nickname-missing' });

      // Act
      const creating = apiWith(fetch).createRoom({
        nickname: ' ',
        avatar: { face: 'face-01', color: 'teal' },
        groupNature: 'friends',
        place: 'together',
        dilemmaLanguage: 'es',
      });

      // Assert
      await expect(creating).rejects.toEqual(new RoomApiError('nickname-missing'));
    });
  });

  describe('previewRoom', () => {
    it('should ask for the room of the code, as typed', async () => {
      // Arrange
      const preview = {
        roomId: 'room-1',
        hostNickname: 'Ana',
        variant: 'nominal',
        adultsOnly: false,
        players: [{ nickname: 'Ana', avatar: { face: 'face-01', color: 'teal' } }],
        suggestedAvatar: { face: 'face-02', color: 'teal' },
      };
      const { fetch, calls } = answering(200, preview);

      // Act
      const found = await apiWith(fetch).previewRoom('k7m2q');

      // Assert
      expect(found).toEqual(preview);
      expect(calls[0]?.url).toBe('https://realtime.example/rooms/by-code/k7m2q');
      expect(calls[0]?.init.method).toBe('GET');
    });

    it('should fail with room-code-not-found when no room has the code', async () => {
      // Arrange
      const { fetch } = answering(404, { code: 'room-code-not-found' });

      // Act & Assert
      await expect(apiWith(fetch).previewRoom('ZZZZZ')).rejects.toMatchObject({
        code: 'room-code-not-found',
      });
    });
  });

  describe('joinRoom', () => {
    it('should join the room with the nickname and the avatar, and tell whether into a game in progress', async () => {
      // Arrange
      const { fetch, calls } = answering(201, { playerId: 'player-2', joinedLate: true });
      const avatar = { face: 'face-02', color: 'khaki' } as const;

      // Act
      const joined = await apiWith(fetch).joinRoom('room-1', 'Luis', avatar);

      // Assert
      expect(joined).toEqual({ playerId: 'player-2', joinedLate: true });
      expect(calls[0]?.url).toBe('https://realtime.example/rooms/room-1/players');
      expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ nickname: 'Luis', avatar });
    });
  });

  describe('searchDilemmas', () => {
    it('should ask for the dilemmas of the category with what the player typed', async () => {
      // Arrange
      const { fetch, calls } = answering(200, { dilemmas: [] });

      // Act
      await apiWith(fetch).searchDilemmas('room-1', { category: 'honesty', q: 'tranvía rojo' });

      // Assert
      expect(calls[0]?.url).toBe(
        'https://realtime.example/rooms/room-1/dilemmas?category=honesty&q=tranv%C3%ADa+rojo',
      );
    });
  });

  describe('the access code', () => {
    it('should send no access code until the player writes one', async () => {
      // Arrange
      const { fetch, calls } = answering(200, { dilemmas: [] });

      // Act
      await apiWith(fetch).searchDilemmas('room-1', {});

      // Assert
      expect(new Headers(calls[0]?.init.headers).has('X-Access-Code')).toBe(false);
    });

    it('should send the code the player wrote with every call, encoded for a header', async () => {
      // Arrange
      const { fetch, calls } = answering(200, { dilemmas: [] });
      const api = apiWith(fetch);

      // Act
      api.enterAccessCode(' palanca ñ ');
      await api.searchDilemmas('room-1', {});
      await api.searchDilemmas('room-1', {});

      // Assert
      expect(calls.map(({ init }) => new Headers(init.headers).get('X-Access-Code'))).toEqual([
        'palanca%20%C3%B1',
        'palanca%20%C3%B1',
      ]);
    });

    it('should forget a code the server turns down, so the device asks for it again', async () => {
      // Arrange
      const { fetch } = answering(403, { code: 'invalid-access-code' });
      const accessCode = codeInMemory();
      const api = apiWith(fetch, undefined, accessCode);
      api.enterAccessCode('old-code');

      // Act
      const previewing = api.previewRoom('K7M2Q');

      // Assert
      await expect(previewing).rejects.toEqual(new RoomApiError('invalid-access-code'));
      expect(accessCode.current()).toBeUndefined();
    });

    it('should keep the code when the server turns the call down for another reason', async () => {
      // Arrange
      const { fetch } = answering(404, { code: 'room-code-not-found' });
      const accessCode = codeInMemory();
      const api = apiWith(fetch, undefined, accessCode);
      api.enterAccessCode('palanca');

      // Act
      await api.previewRoom('ZZZZZ').catch(() => undefined);

      // Assert
      expect(accessCode.current()).toBe('palanca');
    });
  });

  it('should fail with no code when the server answers something outside the contract', async () => {
    // Arrange
    const { fetch } = answering(500, 'Internal Server Error');

    // Act & Assert
    await expect(apiWith(fetch).previewRoom('K7M2Q')).rejects.toEqual(new RoomApiError(undefined));
  });
});
