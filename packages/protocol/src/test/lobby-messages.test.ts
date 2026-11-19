import { describe, expect, it } from 'vitest';
import {
  ChangeAvatarDto,
  ChangeSettingsDto,
  ChooseRoundDilemmaDto,
  ClearRoundDilemmaDto,
  ClientMessageDto,
  ExpelPlayerDto,
  StartGameDto,
} from '../client-messages.ts';
import { ExpelledDto, RoomStateDto, ServerMessageDto } from '../server-messages.ts';

const settings = {
  variant: 'nominal',
  adultsOnly: false,
  compromisingDilemmas: false,
  dilemmaLanguage: 'es',
  timePerDilemmaSeconds: 60,
  newDilemmas: true,
};

const rounds = [
  {
    roundId: 1,
    origin: 'specific',
    dilemma: { dilemmaId: 'dilemma-1', text: 'Text of the first dilemma', hasGap: false },
  },
  {
    roundId: 2,
    origin: 'random',
    categories: ['life-and-death', 'honesty'],
    content: 'adults-only',
    withoutNewDilemmas: false,
  },
  { roundId: 5, origin: 'random', categories: null, content: 'any', withoutNewDilemmas: true },
  {
    roundId: 3,
    origin: 'players',
    dilemma: { dilemmaId: 'dilemma-2', text: 'Text of the second dilemma', hasGap: true },
    chosenByYou: true,
  },
  { roundId: 4, origin: 'players', dilemma: null, chosenByYou: false },
];

const roomState = {
  type: 'room-state',
  roomId: 'room-1',
  roomVersion: 3,
  code: 'K7M2Q',
  playerId: 'player-2',
  hostId: 'player-1',
  groupNature: 'friends',
  place: 'together',
  settings,
  ambience: 'custom',
  hasPlayerUnderEighteen: false,
  rounds,
  minimumPlayers: 2,
  minimumPlayersForTheGap: 3,
  players: [
    {
      playerId: 'player-1',
      nickname: 'Ana',
      avatar: { face: 'face-01', color: 'khaki' },
      connected: true,
    },
    {
      playerId: 'player-2',
      nickname: 'Luis',
      avatar: { face: 'face-02', color: 'teal' },
      connected: true,
    },
  ],
  currentGameId: null,
};

describe('RoomStateDto', () => {
  it('should accept a well-formed message from the network', () => {
    // Arrange
    const raw = JSON.parse(JSON.stringify(roomState)) as unknown;

    // Act
    const result = RoomStateDto.safeParse(raw);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(roomState);
  });

  it('should reject who chose the dilemma of a round, as an extra key', () => {
    // Arrange
    const withAuthor = {
      ...roomState,
      rounds: [{ ...rounds[3], playerId: 'player-2' }],
    };

    // Act & Assert
    expect(RoomStateDto.safeParse(withAuthor).success).toBe(false);
  });

  it('should reject the identity of a player, as an extra key', () => {
    // Arrange
    const [ana, luis] = roomState.players;
    const withIdentity = { ...roomState, players: [{ ...ana, identity: 'uid' }, luis] };

    // Act & Assert
    expect(RoomStateDto.safeParse(withIdentity).success).toBe(false);
  });

  it('should reject an avatar, a configuration or a round outside the closed lists', () => {
    // Arrange
    const [ana, luis] = roomState.players;
    const badFace = {
      ...roomState,
      players: [{ ...ana, avatar: { face: 'face-13', color: 'khaki' } }, luis],
    };
    const badTime = { ...roomState, settings: { ...settings, timePerDilemmaSeconds: 5 } };
    const blankCategory = {
      ...roomState,
      rounds: [{ roundId: 1, origin: 'random', categories: [''] }],
    };
    const noCategory = { ...roomState, rounds: [{ roundId: 1, origin: 'random', categories: [] }] };
    const noRounds = { ...roomState, rounds: [] };
    const tooManyRounds = {
      ...roomState,
      rounds: Array.from({ length: 13 }, (_, index) => ({
        roundId: index + 1,
        origin: 'random',
        categories: null,
      })),
    };

    // Act & Assert
    for (const message of [badFace, badTime, blankCategory, noCategory, noRounds, tooManyRounds]) {
      expect(RoomStateDto.safeParse(message).success).toBe(false);
    }
  });

  it('should reject a code that is not 5 characters long', () => {
    // Act & Assert
    expect(RoomStateDto.safeParse({ ...roomState, code: 'K7M2' }).success).toBe(false);
  });
});

describe('ExpelledDto', () => {
  it('should be told apart from the other server messages', () => {
    // Act
    const message = ServerMessageDto.parse({ type: 'expelled' });

    // Assert
    expect(message).toEqual(ExpelledDto.parse({ type: 'expelled' }));
  });
});

describe('the commands of the lobby', () => {
  it('should accept each well-formed command and tell them apart by their type', () => {
    // Arrange
    const commands = [
      { type: 'change-avatar', face: 'face-03', color: 'rust' },
      {
        type: 'change-settings',
        changes: {
          variant: 'anonymous',
          rounds: [
            { id: 1, origin: 'specific', dilemmaId: 'dilemma-1' },
            { origin: 'random', categories: ['honesty'], content: 'compromising' },
            { id: 3, origin: 'players' },
          ],
        },
      },
      { type: 'choose-round-dilemma', roundId: 3, dilemmaId: 'dilemma-1' },
      { type: 'clear-round-dilemma', roundId: 3 },
      { type: 'expel-player', playerId: 'player-3' },
      { type: 'start-game' },
      { type: 'choose-ambience', ambience: 'no-filter' },
    ];

    // Act
    const parsed = commands.map((command) => ClientMessageDto.parse(command));

    // Assert
    expect(parsed).toEqual(commands);
  });

  it('should reject an avatar outside the closed lists', () => {
    // Act & Assert
    expect(
      ChangeAvatarDto.safeParse({ type: 'change-avatar', face: 'face-00', color: 'rust' }).success,
    ).toBe(false);
    expect(
      ChangeAvatarDto.safeParse({ type: 'change-avatar', face: 'face-01', color: 'pink' }).success,
    ).toBe(false);
  });

  it('should reject a change of nothing, or of something that is not part of the configuration', () => {
    // Act & Assert
    expect(ChangeSettingsDto.safeParse({ type: 'change-settings', changes: {} }).success).toBe(
      false,
    );
    expect(
      ChangeSettingsDto.safeParse({ type: 'change-settings', changes: { hostId: 'player-2' } })
        .success,
    ).toBe(false);
    expect(
      ChangeSettingsDto.safeParse({
        type: 'change-settings',
        changes: { timePerDilemmaSeconds: 5 },
      }).success,
    ).toBe(false);
  });

  it('should reject no rounds, more than 12, or a round without its dilemma', () => {
    // Arrange
    const withRounds = (rounds: unknown[]) => ({ type: 'change-settings', changes: { rounds } });
    const random = { origin: 'random', categories: null, content: 'any' };

    // Act & Assert
    expect(ChangeSettingsDto.safeParse(withRounds([])).success).toBe(false);
    expect(ChangeSettingsDto.safeParse(withRounds(Array(13).fill(random))).success).toBe(false);
    expect(ChangeSettingsDto.safeParse(withRounds([{ origin: 'specific' }])).success).toBe(false);
    expect(ChangeSettingsDto.safeParse(withRounds([{ id: 0, ...random }])).success).toBe(false);
  });

  it('should reject an empty dilemma, round or player', () => {
    // Act & Assert
    expect(
      ChooseRoundDilemmaDto.safeParse({ type: 'choose-round-dilemma', roundId: 1, dilemmaId: '' })
        .success,
    ).toBe(false);
    expect(
      ChooseRoundDilemmaDto.safeParse({ type: 'choose-round-dilemma', roundId: 0, dilemmaId: 'd' })
        .success,
    ).toBe(false);
    expect(ClearRoundDilemmaDto.safeParse({ type: 'clear-round-dilemma' }).success).toBe(false);
    expect(ExpelPlayerDto.safeParse({ type: 'expel-player', playerId: '' }).success).toBe(false);
  });

  it('should reject the room or the dilemmas of the game sent by the client to start it', () => {
    // Act & Assert
    expect(StartGameDto.safeParse({ type: 'start-game', roomId: 'room-1' }).success).toBe(false);
    expect(StartGameDto.safeParse({ type: 'start-game', dilemmaIds: ['dilemma-1'] }).success).toBe(
      false,
    );
  });
});
