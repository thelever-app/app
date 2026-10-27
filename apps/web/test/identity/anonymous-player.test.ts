import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebConfig } from '../../src/config/web-config.ts';
import { signInAnonymousPlayer } from '../../src/identity/anonymous-player.ts';

/** The Firebase SDK, as the test drives it: a browser that may already keep a session. */
const firebase = vi.hoisted(() => ({
  keptUser: undefined as { getIdToken: () => Promise<string> } | undefined,
  newUser: { getIdToken: async () => 'token-of-new-user' },
  signInAnonymously: vi.fn(),
  connectAuthEmulator: vi.fn(),
  initializeApp: vi.fn(),
}));

vi.mock('firebase/app', () => ({ initializeApp: firebase.initializeApp }));
vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    get currentUser() {
      return firebase.keptUser;
    },
    authStateReady: async () => {},
  }),
  connectAuthEmulator: firebase.connectAuthEmulator,
  signInAnonymously: firebase.signInAnonymously,
}));

const CONFIG: WebConfig = {
  realtimeUrl: 'wss://realtime.test',
  firebase: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    appId: 'test-app-id',
  },
};

describe('signInAnonymousPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebase.keptUser = undefined;
    firebase.signInAnonymously.mockResolvedValue({ user: firebase.newUser });
  });

  it('should sign in anonymously when the browser keeps no session', async () => {
    // Act
    const player = await signInAnonymousPlayer(CONFIG);

    // Assert
    expect(firebase.initializeApp).toHaveBeenCalledWith(CONFIG.firebase);
    expect(firebase.signInAnonymously).toHaveBeenCalledOnce();
    expect(await player.getToken()).toBe('token-of-new-user');
  });

  it('should keep the session the browser already had, so the player stays the same', async () => {
    // Arrange
    firebase.keptUser = { getIdToken: async () => 'token-of-kept-user' };

    // Act
    const player = await signInAnonymousPlayer(CONFIG);

    // Assert
    expect(firebase.signInAnonymously).not.toHaveBeenCalled();
    expect(await player.getToken()).toBe('token-of-kept-user');
  });

  it('should sign in against the Auth emulator only when the config names one', async () => {
    // Act
    await signInAnonymousPlayer(CONFIG);
    await signInAnonymousPlayer({ ...CONFIG, authEmulatorUrl: 'http://127.0.0.1:9099' });

    // Assert
    expect(firebase.connectAuthEmulator).toHaveBeenCalledOnce();
    expect(firebase.connectAuthEmulator).toHaveBeenCalledWith(
      expect.anything(),
      'http://127.0.0.1:9099',
      expect.anything(),
    );
  });
});
