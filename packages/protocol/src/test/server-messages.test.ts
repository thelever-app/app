import { describe, expect, it } from 'vitest';
import {
  ConnectionChangedDto,
  ErrorDto,
  GameStateDto,
  AnsweredCountDto,
  PlayerAnsweredDto,
  ServerMessageDto,
} from '../server-messages.ts';

const gameState = {
  type: 'game-state',
  gameId: 'game-1',
  gameVersion: 4,
  roomVersion: 2,
  playerId: 'player-2',
  round: {
    position: 0,
    phase: 'reveal',
    endsAt: '2026-11-09T10:01:00.000Z',
    revealedBy: 'everyone',
    movedOnBy: null,
  },
  hostId: 'player-1',
  serverTime: '2026-11-09T10:01:12.345Z',
  answeredCount: 2,
  reveal: {
    position: 0,
    dilemmaId: 'dilemma-1',
    distribution: [
      { optionId: 'option-1', count: 1 },
      { optionId: 'option-2', count: 1 },
    ],
    tooFewVotes: false,
    didNotVoteCount: 0,
    votes: [
      { playerId: 'player-1', vote: 'option-2' },
      { playerId: 'player-2', vote: 'option-1' },
    ],
    votePredictions: [{ playerId: 'player-2', aboutId: 'player-1', vote: 'option-2', right: true }],
    personInTheGap: null,
    addedBy: null,
  },
  dilemmas: [
    {
      dilemmaId: 'dilemma-1',
      text: 'Text of the first dilemma',
      options: [
        { optionId: 'option-1', text: 'Pull the lever' },
        { optionId: 'option-2', text: 'Do nothing' },
      ],
      personInTheGap: null,
    },
    {
      dilemmaId: 'dilemma-2',
      text: 'Text of the second dilemma about {gap}',
      options: [
        { optionId: 'option-3', text: 'Save the child' },
        { optionId: 'option-4', text: 'Save the doctor' },
        { optionId: 'option-5', text: 'Save the athlete' },
      ],
      personInTheGap: 'player-1',
    },
  ],
  playersToPredict: ['player-1'],
  players: [
    {
      playerId: 'player-1',
      nickname: 'Ana',
      avatar: { face: 'face-01', color: 'khaki' },
      answered: true,
      connected: false,
      left: false,
    },
    {
      playerId: 'player-2',
      nickname: 'Luis',
      avatar: { face: 'face-12', color: 'teal' },
      answered: true,
      connected: true,
      left: false,
    },
  ],
  answers: [
    {
      dilemmaId: 'dilemma-1',
      vote: 'option-1',
      votePredictions: [{ playerId: 'player-1', vote: 'option-2' }],
    },
  ],
  reports: [],
  didNotVote: [],
};

const playerAnswered = {
  type: 'player-answered',
  gameVersion: 5,
  playerId: 'player-1',
};

const answeredCount = {
  type: 'answered-count',
  gameVersion: 5,
  answeredCount: 3,
};

const connectionChanged = {
  type: 'connection-changed',
  roomVersion: 3,
  playerId: 'player-1',
  connected: false,
};

const error = { type: 'error', command: 'answer-dilemma', code: 'dilemma-not-in-round' };

/** The same message without one of its keys. */
function without(message: object, key: string): object {
  return Object.fromEntries(Object.entries(message).filter(([name]) => name !== key));
}

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

  it('should reject a negative or fractional position of the round', () => {
    // Arrange
    const at = (position: number) => ({ ...gameState, round: { ...gameState.round, position } });

    // Act & Assert
    expect(GameStateDto.safeParse(at(-1)).success).toBe(false);
    expect(GameStateDto.safeParse(at(1.5)).success).toBe(false);
  });

  it('should accept no reveal in the decision phase, and only how many answered in an anonymous room', () => {
    // Arrange
    const deciding = {
      ...gameState,
      round: { ...gameState.round, phase: 'decision', revealedBy: null },
      reveal: null,
      players: gameState.players.map((player) => ({ ...player, answered: null })),
    };

    // Act & Assert
    expect(GameStateDto.safeParse(deciding).success).toBe(true);
  });

  it('should reject an empty nickname or vote', () => {
    // Arrange
    const emptyNickname = {
      ...gameState,
      players: [{ playerId: 'player-1', nickname: '', answered: null, connected: true }],
    };
    const emptyVote = {
      ...gameState,
      answers: [{ dilemmaId: 'dilemma-1', vote: '', votePredictions: [] }],
    };

    // Act & Assert
    expect(GameStateDto.safeParse(emptyNickname).success).toBe(false);
    expect(GameStateDto.safeParse(emptyVote).success).toBe(false);
  });

  it('should reject extra keys, at the top level and inside a player', () => {
    // Arrange
    const withRoomId = { ...gameState, roomId: 'room-1' };
    const withOthersAnswers = {
      ...gameState,
      players: [
        { playerId: 'player-1', nickname: 'Ana', answered: true, connected: true, answers: [] },
      ],
    };

    // Act & Assert
    expect(GameStateDto.safeParse(withRoomId).success).toBe(false);
    expect(GameStateDto.safeParse(withOthersAnswers).success).toBe(false);
  });
});

describe('GameStateDto versions and connections', () => {
  it('should reject a game or room version that is negative or fractional', () => {
    // Act & Assert
    expect(GameStateDto.safeParse({ ...gameState, gameVersion: -1 }).success).toBe(false);
    expect(GameStateDto.safeParse({ ...gameState, gameVersion: 1.5 }).success).toBe(false);
    expect(GameStateDto.safeParse({ ...gameState, roomVersion: -1 }).success).toBe(false);
  });

  it('should reject a state without versions', () => {
    // Act & Assert
    expect(GameStateDto.safeParse(without(gameState, 'gameVersion')).success).toBe(false);
    expect(GameStateDto.safeParse(without(gameState, 'roomVersion')).success).toBe(false);
  });

  it('should reject a player without their connection status', () => {
    // Arrange
    const withoutConnection = {
      ...gameState,
      players: [{ playerId: 'player-1', nickname: 'Ana', answered: null }],
    };

    // Act & Assert
    expect(GameStateDto.safeParse(withoutConnection).success).toBe(false);
  });
});

describe('PlayerAnsweredDto and AnsweredCountDto', () => {
  it('should accept well-formed messages from the network', () => {
    // Act & Assert
    expect(PlayerAnsweredDto.parse(JSON.parse(JSON.stringify(playerAnswered)))).toEqual(
      playerAnswered,
    );
    expect(AnsweredCountDto.parse(JSON.parse(JSON.stringify(answeredCount)))).toEqual(
      answeredCount,
    );
  });

  it('should reject the vote as an extra key, and who answered in the count', () => {
    // Act & Assert
    expect(PlayerAnsweredDto.safeParse({ ...playerAnswered, vote: 'option-1' }).success).toBe(
      false,
    );
    expect(AnsweredCountDto.safeParse({ ...answeredCount, playerId: 'player-1' }).success).toBe(
      false,
    );
  });

  it('should reject them without the game version', () => {
    // Act & Assert
    expect(PlayerAnsweredDto.safeParse(without(playerAnswered, 'gameVersion')).success).toBe(false);
    expect(AnsweredCountDto.safeParse(without(answeredCount, 'gameVersion')).success).toBe(false);
  });
});

describe('ConnectionChangedDto', () => {
  it('should accept a well-formed message from the network', () => {
    // Arrange
    const raw = JSON.parse(JSON.stringify(connectionChanged)) as unknown;

    // Act
    const result = ConnectionChangedDto.safeParse(raw);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(connectionChanged);
  });

  it('should reject a change without the room version or the connection status', () => {
    // Act & Assert
    expect(ConnectionChangedDto.safeParse(without(connectionChanged, 'roomVersion')).success).toBe(
      false,
    );
    expect(ConnectionChangedDto.safeParse(without(connectionChanged, 'connected')).success).toBe(
      false,
    );
  });

  it('should reject a game version instead of the room version', () => {
    // Act & Assert
    expect(ConnectionChangedDto.safeParse({ ...connectionChanged, gameVersion: 3 }).success).toBe(
      false,
    );
  });
});

describe('ErrorDto', () => {
  it('should accept a well-formed message from the network', () => {
    // Arrange
    const raw = JSON.parse(JSON.stringify(error)) as unknown;

    // Act
    const result = ErrorDto.safeParse(raw);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(error);
  });

  it('should tell a connect turned down because the device did not prove it is the app', () => {
    // Act
    const result = ErrorDto.safeParse({
      type: 'error',
      command: 'connect',
      code: 'invalid-app-check',
    });

    // Assert
    expect(result.success).toBe(true);
  });

  it('should accept no command when the message could not be read', () => {
    // Act & Assert
    expect(
      ErrorDto.safeParse({ type: 'error', command: null, code: 'invalid-message' }).success,
    ).toBe(true);
  });

  it('should reject a code or a command no schema knows', () => {
    // Act & Assert
    expect(ErrorDto.safeParse({ ...error, code: 'DilemmaNotReachedError' }).success).toBe(false);
    expect(ErrorDto.safeParse({ ...error, command: 'move-reveal' }).success).toBe(false);
  });

  it('should reject a text for the screen', () => {
    // Act & Assert
    expect(ErrorDto.safeParse({ ...error, message: 'You cannot skip dilemmas' }).success).toBe(
      false,
    );
  });
});

describe('ServerMessageDto', () => {
  it('should tell the messages apart by their type', () => {
    // Act
    const state = ServerMessageDto.parse(gameState);
    const update = ServerMessageDto.parse(answeredCount);
    const change = ServerMessageDto.parse(connectionChanged);
    const rejection = ServerMessageDto.parse(error);

    // Assert
    expect(state.type).toBe('game-state');
    expect(update.type === 'answered-count' && update.answeredCount).toBe(3);
    expect(change.type === 'connection-changed' && change.connected).toBe(false);
    expect(rejection.type === 'error' && rejection.code).toBe('dilemma-not-in-round');
  });

  it('should reject a message no schema knows', () => {
    // Act & Assert
    expect(ServerMessageDto.safeParse({ type: 'reveal-started' }).success).toBe(false);
  });
});
