import { afterEach, describe, expect, it } from 'vitest';
import {
  closeOffer,
  mayOffer,
  OFFER_AGAIN_AFTER_MS,
  rememberFinishedGame,
} from '../../src/install/install-offer-state.ts';

const NOW = Date.parse('2026-11-19T10:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

afterEach(() => {
  localStorage.clear();
});

describe('mayOffer', () => {
  it('should offer to install on a device that never closed the offer', () => {
    // Act & Assert
    expect(mayOffer(NOW)).toBe(true);
  });

  it('should not offer again before 30 days, even after a finished game', () => {
    // Arrange
    closeOffer(NOW);
    rememberFinishedGame(NOW + DAY);

    // Act & Assert
    expect(mayOffer(NOW + 29 * DAY)).toBe(false);
  });

  it('should not offer again after 30 days without a finished game since it was closed', () => {
    // Arrange
    rememberFinishedGame(NOW - DAY);
    closeOffer(NOW);

    // Act & Assert
    expect(mayOffer(NOW + OFFER_AGAIN_AFTER_MS)).toBe(false);
  });

  it('should offer again after 30 days and a game finished since it was closed', () => {
    // Arrange
    closeOffer(NOW);
    rememberFinishedGame(NOW + OFFER_AGAIN_AFTER_MS);

    // Act & Assert
    expect(mayOffer(NOW + OFFER_AGAIN_AFTER_MS)).toBe(true);
  });
});
