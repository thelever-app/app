import { describe, expect, it, vi } from 'vitest';
import { lastNickname, rememberNickname } from '../../src/identity/last-nickname.ts';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

const BROKEN = {
  getItem: (): string | null => {
    throw new Error('blocked');
  },
  setItem: (): void => {
    throw new Error('blocked');
  },
};

describe('lastNickname', () => {
  it('should give back the nickname the player last entered a room with, without spaces around', () => {
    // Arrange
    const storage = memoryStorage();
    rememberNickname('  Ana ', () => storage);

    // Act & Assert
    expect(lastNickname(() => storage)).toBe('Ana');
  });

  it('should be empty on a device that never played', () => {
    // Act & Assert
    expect(lastNickname(() => memoryStorage())).toBe('');
  });

  it('should be empty, not fail, where the browser keeps nothing', () => {
    // Act & Assert
    expect(() => rememberNickname('Ana', () => BROKEN)).not.toThrow();
    expect(lastNickname(() => BROKEN)).toBe('');
  });

  it('should start empty and forget nothing else where the browser blocks its storage', () => {
    // Arrange: as Safari with every cookie blocked, reading localStorage throws.
    const blocked = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    // Act
    const nickname = lastNickname();
    rememberNickname('Ana');

    // Assert
    expect(nickname).toBe('');
    blocked.mockRestore();
  });
});
