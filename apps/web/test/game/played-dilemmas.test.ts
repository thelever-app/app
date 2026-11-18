import { describe, expect, it } from 'vitest';
import { playedDilemmas, playedIn, rememberPlayed } from '../../src/game/played-dilemmas.ts';
import { aGame } from '../support/game.ts';

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

describe('playedDilemmas', () => {
  it('should keep each dilemma of the games that ended once, the latest last', () => {
    // Arrange
    const storage = memoryStorage();
    rememberPlayed(['test-dilemma-1', 'test-dilemma-2'], () => storage);

    // Act
    rememberPlayed(['test-dilemma-3', 'test-dilemma-1'], () => storage);

    // Assert
    expect(playedDilemmas(() => storage)).toEqual([
      'test-dilemma-2',
      'test-dilemma-3',
      'test-dilemma-1',
    ]);
  });

  it('should keep no more than a room takes, forgetting the oldest', () => {
    // Arrange
    const storage = memoryStorage();
    rememberPlayed(
      Array.from({ length: 2000 }, (_, index) => `test-dilemma-${index}`),
      () => storage,
    );

    // Act
    rememberPlayed(['test-dilemma-new'], () => storage);

    // Assert
    const kept = playedDilemmas(() => storage);
    expect(kept).toHaveLength(2000);
    expect(kept[0]).toBe('test-dilemma-1');
    expect(kept.at(-1)).toBe('test-dilemma-new');
  });

  it('should be empty, not fail, where the browser keeps nothing or something else', () => {
    // Arrange
    const storage = memoryStorage();
    storage.setItem('thelever.playedDilemmas', '{"not":"a list"}');

    // Act & Assert
    expect(() => rememberPlayed(['test-dilemma-1'], () => BROKEN)).not.toThrow();
    expect(playedDilemmas(() => BROKEN)).toEqual([]);
    expect(playedDilemmas(() => storage)).toEqual([]);
  });
});

describe('playedIn', () => {
  it('should give the dilemmas of the game but those revealed before the player joined', () => {
    // Act
    const played = playedIn(
      aGame({
        didNotVote: [
          { dilemmaId: 'test-dilemma-1', reason: 'joined-late' },
          { dilemmaId: 'test-dilemma-2', reason: 'not-answered' },
        ],
      }),
    );

    // Assert
    expect(played).toEqual(['test-dilemma-2', 'test-dilemma-3']);
  });
});
