import { describe, expect, it } from 'vitest';
import {
  AddDilemmaDto,
  ChangeAvatarDto,
  ChangeSettingsDto,
  ClientMessageDto,
  ExpelPlayerDto,
  PickDilemmasDto,
  RemoveAddedDilemmaDto,
  StartGameDto,
} from '../client-messages.ts';
import { ExpelledDto, RoomStateDto, ServerMessageDto } from '../server-messages.ts';

const settings = {
  variant: 'nominal',
  adultsOnly: false,
  dilemmaLanguage: 'es',
  categories: ['life-and-death', 'honesty'],
  dilemmaCount: 8,
  totalTimeInMinutes: 6,
  newDilemmas: true,
  dilemmasPerPlayer: 2,
};

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
  minimumPlayers: 2,
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
  addedDilemmas: [{ dilemmaId: 'dilemma-1', text: 'Text of the first dilemma' }],
  ownAddedDilemmaIds: ['dilemma-1'],
  pickedDilemmas: [],
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

  it('should reject who added a dilemma, as an extra key', () => {
    // Arrange
    const withAuthor = {
      ...roomState,
      addedDilemmas: [{ dilemmaId: 'dilemma-1', text: 'Text', playerId: 'player-2' }],
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

  it('should reject an avatar or a configuration outside the closed lists', () => {
    // Arrange
    const [ana, luis] = roomState.players;
    const badFace = {
      ...roomState,
      players: [{ ...ana, avatar: { face: 'face-13', color: 'khaki' } }, luis],
    };
    const badCount = { ...roomState, settings: { ...settings, dilemmaCount: 7 } };
    const tooManyPerPlayer = { ...roomState, settings: { ...settings, dilemmasPerPlayer: 4 } };
    const blankCategory = { ...roomState, settings: { ...settings, categories: [''] } };

    // Act & Assert
    expect(RoomStateDto.safeParse(badFace).success).toBe(false);
    expect(RoomStateDto.safeParse(badCount).success).toBe(false);
    expect(RoomStateDto.safeParse(tooManyPerPlayer).success).toBe(false);
    expect(RoomStateDto.safeParse(blankCategory).success).toBe(false);
  });

  it('should tell every category, as null, from none, as an empty list', () => {
    // Arrange
    const every = { ...roomState, settings: { ...settings, categories: null } };
    const none = { ...roomState, settings: { ...settings, categories: [] } };

    // Act & Assert
    expect(RoomStateDto.parse(every).settings.categories).toBeNull();
    expect(RoomStateDto.parse(none).settings.categories).toEqual([]);
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
      { type: 'change-settings', changes: { variant: 'anonymous', dilemmaCount: 12 } },
      { type: 'pick-dilemmas', dilemmaIds: ['dilemma-1', 'dilemma-2'] },
      { type: 'add-dilemma', dilemmaId: 'dilemma-1' },
      { type: 'remove-added-dilemma', dilemmaId: 'dilemma-1' },
      { type: 'expel-player', playerId: 'player-3' },
      { type: 'start-game' },
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
      ChangeSettingsDto.safeParse({ type: 'change-settings', changes: { totalTimeInMinutes: 5 } })
        .success,
    ).toBe(false);
  });

  it('should accept picking no dilemma, to go back to a game by category', () => {
    // Act & Assert
    expect(PickDilemmasDto.safeParse({ type: 'pick-dilemmas', dilemmaIds: [] }).success).toBe(true);
  });

  it('should reject an empty dilemma or player', () => {
    // Act & Assert
    expect(AddDilemmaDto.safeParse({ type: 'add-dilemma', dilemmaId: '' }).success).toBe(false);
    expect(
      RemoveAddedDilemmaDto.safeParse({ type: 'remove-added-dilemma', dilemmaId: '' }).success,
    ).toBe(false);
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
