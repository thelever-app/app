import { describe, expect, it, vi } from 'vitest';
import type { PlayerIdentity } from '../../src/identity/anonymous-player.ts';
import { lazyPlayer } from '../../src/identity/lazy-player.ts';

const SIGNED_IN: PlayerIdentity = {
  getToken: async () => 'test-token',
  getAppCheckToken: async () => 'test-app-check',
};

describe('lazyPlayer', () => {
  it('should not sign in until a call needs the token', () => {
    // Arrange
    const signIn = vi.fn(async () => SIGNED_IN);

    // Act
    lazyPlayer(signIn);

    // Assert
    expect(signIn).not.toHaveBeenCalled();
  });

  it('should sign in once, however many calls need it', async () => {
    // Arrange
    const signIn = vi.fn(async () => SIGNED_IN);
    const player = lazyPlayer(signIn);

    // Act
    const tokens = await Promise.all([
      player.getToken(false),
      player.getToken(false),
      player.getAppCheckToken(false),
    ]);

    // Assert
    expect(tokens).toEqual(['test-token', 'test-token', 'test-app-check']);
    expect(signIn).toHaveBeenCalledOnce();
  });

  it('should try to sign in again after a sign-in that failed', async () => {
    // Arrange
    const signIn = vi
      .fn<() => Promise<PlayerIdentity>>()
      .mockRejectedValueOnce(new Error('test offline'))
      .mockResolvedValue(SIGNED_IN);
    const player = lazyPlayer(signIn);
    await expect(player.getToken(false)).rejects.toThrow('test offline');

    // Act
    const token = await player.getToken(false);

    // Assert
    expect(token).toBe('test-token');
    expect(signIn).toHaveBeenCalledTimes(2);
  });
});
