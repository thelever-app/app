import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { hasFinished, usePlayerName } from '../../src/components/players.ts';
import { providersFor } from '../support/render.tsx';

const ANA = { playerId: 'test-ana-id', nickname: 'Ana', progress: 2 };
const LUIS = { playerId: 'test-luis-id', nickname: 'Luis', progress: 3 };

describe('hasFinished', () => {
  it('should be true once the progress reaches every dilemma, and false before', () => {
    // Act & Assert
    expect(hasFinished(LUIS, 3)).toBe(true);
    expect(hasFinished(ANA, 3)).toBe(false);
  });
});

describe('usePlayerName', () => {
  it('should call the player using the screen by the word for "you" and the rest by their nickname', async () => {
    // Arrange
    const { Providers, t } = await providersFor();

    // Act
    const { result } = renderHook(() => usePlayerName('test-ana-id'), { wrapper: Providers });

    // Assert
    expect(result.current(ANA)).toBe(t('playerList.you'));
    expect(result.current(LUIS)).toBe('Luis');
  });
});
