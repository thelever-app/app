import { describe, expect, it } from 'vitest';
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
    rememberNickname('  Ana ', storage);

    // Act & Assert
    expect(lastNickname(storage)).toBe('Ana');
  });

  it('should be empty on a device that never played', () => {
    // Act & Assert
    expect(lastNickname(memoryStorage())).toBe('');
  });

  it('should be empty, not fail, where the browser keeps nothing', () => {
    // Act & Assert
    expect(() => rememberNickname('Ana', BROKEN)).not.toThrow();
    expect(lastNickname(BROKEN)).toBe('');
  });
});
