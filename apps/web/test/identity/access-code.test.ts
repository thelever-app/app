import { describe, expect, it } from 'vitest';
import { deviceAccessCode } from '../../src/identity/access-code.ts';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const BROKEN = {
  getItem: (): string | null => {
    throw new Error('blocked');
  },
  setItem: (): void => {
    throw new Error('blocked');
  },
  removeItem: (): void => {
    throw new Error('blocked');
  },
};

describe('deviceAccessCode', () => {
  it('should have no code on a device where the player never wrote one', () => {
    // Act & Assert
    expect(deviceAccessCode(() => memoryStorage()).current()).toBeUndefined();
  });

  it('should keep the code on the device, without spaces around, for the next visit', () => {
    // Arrange
    const storage = memoryStorage();
    deviceAccessCode(() => storage).remember('  palanca ');

    // Act
    const nextVisit = deviceAccessCode(() => storage);

    // Assert
    expect(nextVisit.current()).toBe('palanca');
  });

  it('should forget the code on the device too', () => {
    // Arrange
    const storage = memoryStorage();
    const code = deviceAccessCode(() => storage);
    code.remember('palanca');

    // Act
    code.forget();

    // Assert
    expect(code.current()).toBeUndefined();
    expect(deviceAccessCode(() => storage).current()).toBeUndefined();
  });

  it('should keep the code until the page closes where the browser keeps nothing', () => {
    // Arrange
    const code = deviceAccessCode(() => BROKEN);

    // Act
    code.remember('palanca');

    // Assert
    expect(code.current()).toBe('palanca');
    expect(() => code.forget()).not.toThrow();
  });
});
