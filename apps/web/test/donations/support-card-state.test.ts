import { afterEach, describe, expect, it } from 'vitest';
import { closeSupportCard, supportCardClosed } from '../../src/donations/support-card-state.ts';

afterEach(() => {
  localStorage.clear();
});

/** Test data: a browser that blocks the storage of the device, which throws on any use of it. */
const BLOCKED = () => {
  throw new DOMException('The storage of the device is blocked', 'SecurityError');
};

describe('supportCardClosed', () => {
  it('should not be closed on a device that never closed it', () => {
    // Act & Assert
    expect(supportCardClosed()).toBe(false);
  });

  it('should stay closed once the player closes it', () => {
    // Act
    closeSupportCard();

    // Assert
    expect(supportCardClosed()).toBe(true);
  });

  it('should not be closed, and close without failing, where the browser keeps nothing', () => {
    // Act
    closeSupportCard(BLOCKED);

    // Assert
    expect(supportCardClosed(BLOCKED)).toBe(false);
  });
});
