import { describe, expect, it } from 'vitest';
import { StartGameRequestDto, StartGameResponseDto } from '../../http/start-game.ts';

describe('StartGameRequestDto', () => {
  it('should accept the dilemmas of the game in order', () => {
    // Arrange
    const request = { dilemmaIds: ['dilemma-1', 'dilemma-2'] };

    // Act & Assert
    expect(StartGameRequestDto.parse(request)).toEqual(request);
  });

  it('should reject a game without dilemmas or with an empty id', () => {
    // Act & Assert
    expect(StartGameRequestDto.safeParse({ dilemmaIds: [] }).success).toBe(false);
    expect(StartGameRequestDto.safeParse({ dilemmaIds: [''] }).success).toBe(false);
  });
});

describe('StartGameResponseDto', () => {
  it('should carry the game', () => {
    // Act & Assert
    expect(StartGameResponseDto.parse({ gameId: 'game-1' })).toEqual({ gameId: 'game-1' });
  });
});
