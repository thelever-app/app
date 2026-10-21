import { describe, expect, it } from 'vitest';
import { GameStateDto, ProgressUpdatedDto, ServerMessageDto } from '../server-messages.ts';

const gameState = {
  type: 'game-state',
  gameId: 'game-1',
  playerId: 'player-2',
  dilemmas: [
    {
      dilemmaId: 'dilemma-1',
      text: 'Text of the first dilemma',
      options: [
        { optionId: 'option-1', text: 'Pull the lever' },
        { optionId: 'option-2', text: 'Do nothing' },
      ],
    },
    {
      dilemmaId: 'dilemma-2',
      text: 'Text of the second dilemma',
      options: [
        { optionId: 'option-3', text: 'Save the child' },
        { optionId: 'option-4', text: 'Save the doctor' },
        { optionId: 'option-5', text: 'Save the athlete' },
      ],
    },
  ],
  players: [
    { playerId: 'player-1', nickname: 'Ana', progress: 0 },
    { playerId: 'player-2', nickname: 'Luis', progress: 1 },
  ],
  answers: [{ dilemmaId: 'dilemma-1', vote: 'option-1' }],
};

const progressUpdated = { type: 'progress-updated', playerId: 'player-1', progress: 3 };

describe('GameStateDto', () => {
  it('should accept a well-formed message from the network', () => {
    // Arrange
    const raw = JSON.parse(JSON.stringify(gameState)) as unknown;

    // Act
    const result = GameStateDto.safeParse(raw);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(gameState);
  });

  it('should accept a player who has not answered anything yet', () => {
    // Act
    const result = GameStateDto.safeParse({ ...gameState, answers: [] });

    // Assert
    expect(result.success).toBe(true);
  });

  it('should reject an unknown type', () => {
    // Act & Assert
    expect(GameStateDto.safeParse({ ...gameState, type: 'game-over' }).success).toBe(false);
  });

  it('should reject a game without dilemmas', () => {
    // Act & Assert
    expect(GameStateDto.safeParse({ ...gameState, dilemmas: [] }).success).toBe(false);
  });

  it('should reject a dilemma without text or without options', () => {
    // Arrange
    const [first] = gameState.dilemmas;
    const withDilemma = (dilemma: object) => ({ ...gameState, dilemmas: [dilemma] });

    // Act & Assert
    expect(GameStateDto.safeParse(withDilemma({ ...first, text: '' })).success).toBe(false);
    expect(GameStateDto.safeParse(withDilemma({ ...first, options: [] })).success).toBe(false);
  });

  it('should reject an option without text, or with extra keys', () => {
    // Arrange
    const [first] = gameState.dilemmas;
    const withOption = (option: object) => ({
      ...gameState,
      dilemmas: [{ ...first, options: [option] }],
    });

    // Act & Assert
    expect(GameStateDto.safeParse(withOption({ optionId: 'option-1', text: '' })).success).toBe(
      false,
    );
    expect(
      GameStateDto.safeParse(withOption({ optionId: 'option-1', text: 'Pull', votes: 3 })).success,
    ).toBe(false);
  });

  it('should reject a game without players', () => {
    // Act & Assert
    expect(GameStateDto.safeParse({ ...gameState, players: [] }).success).toBe(false);
  });

  it('should reject a negative or fractional progress', () => {
    // Arrange
    const withProgress = (progress: number) => ({
      ...gameState,
      players: [{ playerId: 'player-1', nickname: 'Ana', progress }],
    });

    // Act & Assert
    expect(GameStateDto.safeParse(withProgress(-1)).success).toBe(false);
    expect(GameStateDto.safeParse(withProgress(1.5)).success).toBe(false);
  });

  it('should reject an empty nickname or vote', () => {
    // Arrange
    const emptyNickname = {
      ...gameState,
      players: [{ playerId: 'player-1', nickname: '', progress: 0 }],
    };
    const emptyVote = { ...gameState, answers: [{ dilemmaId: 'dilemma-1', vote: '' }] };

    // Act & Assert
    expect(GameStateDto.safeParse(emptyNickname).success).toBe(false);
    expect(GameStateDto.safeParse(emptyVote).success).toBe(false);
  });

  it('should reject extra keys, at the top level and inside a player', () => {
    // Arrange
    const withRoomId = { ...gameState, roomId: 'room-1' };
    const withOthersAnswers = {
      ...gameState,
      players: [{ playerId: 'player-1', nickname: 'Ana', progress: 1, answers: [] }],
    };

    // Act & Assert
    expect(GameStateDto.safeParse(withRoomId).success).toBe(false);
    expect(GameStateDto.safeParse(withOthersAnswers).success).toBe(false);
  });
});

describe('ProgressUpdatedDto', () => {
  it('should accept a well-formed message from the network', () => {
    // Arrange
    const raw = JSON.parse(JSON.stringify(progressUpdated)) as unknown;

    // Act
    const result = ProgressUpdatedDto.safeParse(raw);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(progressUpdated);
  });

  it('should reject an unknown type', () => {
    // Act & Assert
    expect(
      ProgressUpdatedDto.safeParse({ ...progressUpdated, type: 'ProgressUpdated' }).success,
    ).toBe(false);
  });

  it('should reject a negative or fractional progress', () => {
    // Act & Assert
    expect(ProgressUpdatedDto.safeParse({ ...progressUpdated, progress: -1 }).success).toBe(false);
    expect(ProgressUpdatedDto.safeParse({ ...progressUpdated, progress: 1.5 }).success).toBe(false);
  });

  it('should reject the vote as an extra key', () => {
    // Act & Assert
    expect(ProgressUpdatedDto.safeParse({ ...progressUpdated, vote: 'option-1' }).success).toBe(
      false,
    );
  });
});

describe('ServerMessageDto', () => {
  it('should tell the messages apart by their type', () => {
    // Act
    const state = ServerMessageDto.parse(gameState);
    const update = ServerMessageDto.parse(progressUpdated);

    // Assert
    expect(state.type).toBe('game-state');
    expect(update.type === 'progress-updated' && update.progress).toBe(3);
  });

  it('should reject a message no schema knows', () => {
    // Act & Assert
    expect(ServerMessageDto.safeParse({ type: 'reveal-started' }).success).toBe(false);
  });
});
