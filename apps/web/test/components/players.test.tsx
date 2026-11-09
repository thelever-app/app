import { renderHook } from '@testing-library/react';
import type { GameStateDto } from '@thelever-app/protocol';
import { describe, expect, it } from 'vitest';
import {
  hasAnswered,
  isAnonymous,
  pendingCountOf,
  usePlayerName,
} from '../../src/components/players.ts';
import { aGame } from '../support/game.ts';
import { providersFor } from '../support/render.tsx';

const ANA: GameStateDto['players'][number] = {
  playerId: 'test-ana-id',
  nickname: 'Ana',
  avatar: { face: 'face-01', color: 'teal' },
  answered: false,
  connected: true,
  left: false,
};
const LUIS: GameStateDto['players'][number] = {
  playerId: 'test-luis-id',
  nickname: 'Luis',
  avatar: { face: 'face-02', color: 'rust' },
  answered: true,
  connected: true,
  left: false,
};

describe('hasAnswered', () => {
  it('should be true only for whom the room says answered the dilemma of the round', () => {
    // Act & Assert
    expect(hasAnswered(LUIS)).toBe(true);
    expect(hasAnswered(ANA)).toBe(false);
    expect(hasAnswered({ ...LUIS, answered: null })).toBe(false);
  });
});

describe('isAnonymous', () => {
  it('should be true when the room never tells who answered', () => {
    // Act & Assert
    expect(isAnonymous({ players: [ANA, LUIS] })).toBe(false);
    expect(isAnonymous({ players: [ANA, LUIS].map((p) => ({ ...p, answered: null })) })).toBe(true);
  });
});

describe('pendingCountOf', () => {
  it('should count who is still in the game and has not answered', () => {
    // Arrange
    const marta = { ...ANA, playerId: 'test-marta-id', nickname: 'Marta', left: true };

    // Act & Assert
    expect(pendingCountOf({ players: [ANA, LUIS, marta], answeredCount: 1 })).toBe(1);
    expect(pendingCountOf({ players: [ANA], answeredCount: 3 })).toBe(0);
  });
});

describe('usePlayerName', () => {
  it('should call the player using the screen by their nickname with «tú», and the rest by their nickname', async () => {
    // Arrange
    const { Providers } = await providersFor({ game: aGame({ playerId: 'test-ana-id' }) });

    // Act
    const { result } = renderHook(() => usePlayerName(), { wrapper: Providers });

    // Assert
    expect(result.current(ANA)).toBe('Ana (tú)');
    expect(result.current(LUIS)).toBe('Luis');
  });
});
