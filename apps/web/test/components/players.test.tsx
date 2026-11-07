import { renderHook } from '@testing-library/react';
import type { GameStateDto } from '@thelever-app/protocol';
import { describe, expect, it } from 'vitest';
import { hasFinished, usePlayerName } from '../../src/components/players.ts';
import { aGame } from '../support/game.ts';
import { providersFor } from '../support/render.tsx';

const ANA: GameStateDto['players'][number] = {
  playerId: 'test-ana-id',
  nickname: 'Ana',
  avatar: { face: 'face-01', color: 'teal' },
  progress: 2,
  connected: true,
};
const LUIS: GameStateDto['players'][number] = {
  playerId: 'test-luis-id',
  nickname: 'Luis',
  avatar: { face: 'face-02', color: 'rust' },
  progress: 3,
  connected: true,
};

describe('hasFinished', () => {
  it('should be true once the progress reaches every dilemma, and false before', () => {
    // Act & Assert
    expect(hasFinished(LUIS, 3)).toBe(true);
    expect(hasFinished(ANA, 3)).toBe(false);
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
