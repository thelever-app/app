import { describe, expect, it } from 'vitest';
import { AddDilemmaUseCase } from '../../use-cases/add-dilemma.use-case.ts';
import { ChangeAvatarUseCase } from '../../use-cases/change-avatar.use-case.ts';
import { ChangeRoomSettingsUseCase } from '../../use-cases/change-room-settings.use-case.ts';
import { ExpelPlayerUseCase } from '../../use-cases/expel-player.use-case.ts';
import { GetRoomPreviewUseCase } from '../../use-cases/get-room-preview.use-case.ts';
import { GetRoomStateUseCase } from '../../use-cases/get-room-state.use-case.ts';
import { PickDilemmasUseCase } from '../../use-cases/pick-dilemmas.use-case.ts';
import { RemoveAddedDilemmaUseCase } from '../../use-cases/remove-added-dilemma.use-case.ts';
import { SearchDilemmasUseCase } from '../../use-cases/search-dilemmas.use-case.ts';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { RoomCodeNotFoundError } from '../../errors/room-code-not-found.error.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { IdentityNotInRoomError } from '../../errors/identity-not-in-room.error.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { AvatarTakenError } from '../../../domain/errors/avatar-taken.error.ts';
import { DilemmaNotSuitableError } from '../../../domain/errors/dilemma-not-suitable.error.ts';
import { NotHostError } from '../../../domain/errors/not-host.error.ts';
import { PlayerNotInRoomError } from '../../../domain/errors/player-not-in-room.error.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { lobbyOfThree } from '../support/game-in-decision-phase.ts';
import { lobbyCatalog } from '../support/test-catalog.ts';

/** The lobby of three, with a catalog to search and add from, and every lobby use case. */
async function arrange() {
  const notifier = new InMemoryPlayerNotifier();
  const lobby = await lobbyOfThree(new InMemoryPlayerNotifier(), lobbyCatalog());
  const { roomRepository, catalog } = lobby;
  const changeSettings = new ChangeRoomSettingsUseCase(roomRepository, notifier);
  return {
    ...lobby,
    notifier,
    changeSettings,
    allowAdding: () =>
      changeSettings.execute({
        roomId: lobby.roomId,
        playerId: lobby.anaId,
        changes: { playersCanAddDilemmas: true },
      }),
    changeAvatar: new ChangeAvatarUseCase(roomRepository, notifier),
    pickDilemmas: new PickDilemmasUseCase(roomRepository, catalog, notifier),
    addDilemma: new AddDilemmaUseCase(roomRepository, catalog, notifier),
    removeAddedDilemma: new RemoveAddedDilemmaUseCase(roomRepository, notifier),
    expelPlayer: new ExpelPlayerUseCase(roomRepository, notifier),
    searchDilemmas: new SearchDilemmasUseCase(roomRepository, catalog),
    getRoomPreview: new GetRoomPreviewUseCase(roomRepository),
    getRoomState: new GetRoomStateUseCase(roomRepository, catalog),
  };
}

describe('GetRoomPreviewUseCase', () => {
  it('should show whose room it is, its type and how many are in it, from its code', async () => {
    // Arrange
    const { getRoomPreview, roomRepository, roomId } = await arrange();
    const { code } = (await roomRepository.findById(roomId))!;

    // Act
    const preview = await getRoomPreview.execute({ code: code.toLowerCase() });

    // Assert
    expect(preview).toEqual({
      roomId,
      hostNickname: 'Ana',
      variant: 'nominal',
      adultsOnly: false,
      playerCount: 3,
    });
  });

  it('should throw an error if no open room has that code', async () => {
    // Arrange
    const { getRoomPreview } = await arrange();

    // Act & Assert
    await expect(getRoomPreview.execute({ code: 'ZZZZZ' })).rejects.toThrow(RoomCodeNotFoundError);
  });
});

describe('ChangeAvatarUseCase', () => {
  it('should save the new avatar and tell everyone in the room', async () => {
    // Arrange
    const { changeAvatar, notifier, roomRepository, roomId, luisId, martaId } = await arrange();

    // Act
    await changeAvatar.execute({ roomId, playerId: luisId, face: 'face-12', color: 'stone' });

    // Assert
    const luis = (await roomRepository.findById(roomId))?.players.find(({ id }) => id === luisId);
    expect(luis?.avatar).toMatchObject({ face: 'face-12', color: 'stone' });
    expect(notifier.receivedBy(martaId)).toEqual([
      new LobbyChangedEvent(roomId, 'avatar-changed', 3),
    ]);
  });

  it('should throw an error if another player has that avatar', async () => {
    // Arrange
    const { changeAvatar, roomRepository, roomId, luisId } = await arrange();
    const { face, color } = (await roomRepository.findById(roomId))!.host.avatar;

    // Act & Assert
    await expect(changeAvatar.execute({ roomId, playerId: luisId, face, color })).rejects.toThrow(
      AvatarTakenError,
    );
  });
});

describe('ChangeRoomSettingsUseCase', () => {
  it('should save the settings the host changes and tell everyone in the room', async () => {
    // Arrange
    const { changeSettings, notifier, roomRepository, roomId, anaId, luisId } = await arrange();

    // Act
    await changeSettings.execute({
      roomId,
      playerId: anaId,
      changes: {
        dilemmaLanguage: 'en',
        category: 'honesty',
        dilemmaCount: 6,
        totalTimeInMinutes: 4,
      },
    });

    // Assert
    const { settings } = (await roomRepository.findById(roomId))!;
    expect(settings.toSnapshot()).toMatchObject({
      dilemmaLanguage: 'en',
      category: 'honesty',
      dilemmaCount: 6,
      totalTimeInMinutes: 4,
    });
    expect(notifier.receivedBy(luisId)).toEqual([
      new LobbyChangedEvent(roomId, 'settings-changed', 3),
    ]);
  });

  it('should throw an error if a player who is not the host tries', async () => {
    // Arrange
    const { changeSettings, roomId, luisId } = await arrange();

    // Act & Assert
    await expect(
      changeSettings.execute({ roomId, playerId: luisId, changes: { variant: 'anonymous' } }),
    ).rejects.toThrow(NotHostError);
  });

  it('should throw an error if the room does not exist', async () => {
    // Arrange
    const { changeSettings, anaId } = await arrange();

    // Act & Assert
    await expect(
      changeSettings.execute({ roomId: 'TestUnknownId', playerId: anaId, changes: {} }),
    ).rejects.toThrow(RoomNotFoundError);
  });
});

describe('PickDilemmasUseCase', () => {
  it('should keep the dilemmas of the catalog the host picks', async () => {
    // Arrange
    const { pickDilemmas, roomRepository, roomId, anaId } = await arrange();

    // Act
    await pickDilemmas.execute({
      roomId,
      playerId: anaId,
      dilemmaIds: ['TestCatalog4', 'TestCatalog3'],
    });

    // Assert
    const room = await roomRepository.findById(roomId);
    expect(room?.pickedDilemmas).toEqual([
      { dilemmaId: 'TestCatalog4', minimumAge: 16 },
      { dilemmaId: 'TestCatalog3', minimumAge: 16 },
    ]);
  });

  it('should go back to a game by category when the host picks none', async () => {
    // Arrange
    const { pickDilemmas, roomRepository, roomId, anaId } = await arrange();
    await pickDilemmas.execute({ roomId, playerId: anaId, dilemmaIds: ['TestCatalog4'] });

    // Act
    await pickDilemmas.execute({ roomId, playerId: anaId, dilemmaIds: [] });

    // Assert
    expect((await roomRepository.findById(roomId))?.pickedDilemmas).toEqual([]);
  });

  it('should throw an error for a dilemma for adults in a room for everyone', async () => {
    // Arrange
    const { pickDilemmas, roomId, anaId } = await arrange();

    // Act & Assert
    await expect(
      pickDilemmas.execute({ roomId, playerId: anaId, dilemmaIds: ['TestCatalog1'] }),
    ).rejects.toThrow(DilemmaNotSuitableError);
  });

  it('should throw an error for a dilemma that is not in the general catalog', async () => {
    // Arrange
    const { pickDilemmas, roomId, anaId } = await arrange();

    // Act & Assert
    await expect(
      pickDilemmas.execute({ roomId, playerId: anaId, dilemmaIds: ['TestNew1'] }),
    ).rejects.toThrow(DilemmaNotFoundError);
  });
});

describe('AddDilemmaUseCase and RemoveAddedDilemmaUseCase', () => {
  it('should add a dilemma of the catalog a player chooses, and let the host remove it', async () => {
    // Arrange
    const { allowAdding, addDilemma, removeAddedDilemma, roomRepository, roomId, anaId, luisId } =
      await arrange();
    await allowAdding();

    // Act
    await addDilemma.execute({ roomId, playerId: luisId, dilemmaId: 'TestCatalog5' });
    const added = (await roomRepository.findById(roomId))?.addedDilemmas;
    await removeAddedDilemma.execute({ roomId, playerId: anaId, dilemmaId: 'TestCatalog5' });

    // Assert
    expect(added).toEqual([{ dilemmaId: 'TestCatalog5', minimumAge: 16, playerId: luisId }]);
    expect((await roomRepository.findById(roomId))?.addedDilemmas).toEqual([]);
  });

  it('should throw an error for a dilemma that does not suit the room', async () => {
    // Arrange
    const { allowAdding, addDilemma, roomId, luisId } = await arrange();
    await allowAdding();

    // Act & Assert
    await expect(
      addDilemma.execute({ roomId, playerId: luisId, dilemmaId: 'TestCatalog2' }),
    ).rejects.toThrow(DilemmaNotSuitableError);
  });
});

describe('ExpelPlayerUseCase', () => {
  it('should take the player out and tell the room and the expelled player', async () => {
    // Arrange
    const { expelPlayer, notifier, roomRepository, roomId, anaId, martaId } = await arrange();

    // Act
    await expelPlayer.execute({ roomId, playerId: anaId, expelledPlayerId: martaId });

    // Assert
    expect((await roomRepository.findById(roomId))?.hasPlayer(martaId)).toBe(false);
    const event = new LobbyChangedEvent(roomId, 'player-expelled', 3);
    expect(notifier.receivedBy(anaId)).toEqual([event]);
    expect(notifier.receivedBy(martaId)).toEqual([event]);
  });
});

describe('SearchDilemmasUseCase', () => {
  it('should find only dilemmas of the catalog that suit the room', async () => {
    // Arrange
    const { searchDilemmas, roomId } = await arrange();

    // Act
    const found = await searchDilemmas.execute({ roomId, identity: 'TestLuisIdentity' });

    // Assert
    const ids = found.map(({ dilemmaId }) => dilemmaId);
    expect(ids).not.toContain('TestCatalog1');
    expect(ids).not.toContain('TestNew1');
    expect(found.every(({ minimumAge }) => minimumAge === 16)).toBe(true);
  });

  it('should find the dilemmas with a tag, also those for adults in a room for adults', async () => {
    // Arrange
    const { searchDilemmas, changeSettings, roomId, anaId } = await arrange();
    await changeSettings.execute({ roomId, playerId: anaId, changes: { adultsOnly: true } });

    // Act
    const all = await searchDilemmas.execute({ roomId, identity: 'TestAnaIdentity' });
    const family = await searchDilemmas.execute({
      roomId,
      identity: 'TestAnaIdentity',
      tags: ['family'],
    });

    // Assert
    expect(all.map(({ dilemmaId }) => dilemmaId)).toContain('TestCatalog1');
    expect(family.map(({ dilemmaId }) => dilemmaId)).toEqual([
      'TestCatalog3',
      'TestCatalog4',
      'TestCatalog5',
    ]);
  });

  it('should throw an error if whoever searches is not in the room', async () => {
    // Arrange
    const { searchDilemmas, roomId } = await arrange();

    // Act & Assert
    await expect(
      searchDilemmas.execute({ roomId, identity: 'TestStrangerIdentity' }),
    ).rejects.toThrow(IdentityNotInRoomError);
  });
});

describe('GetRoomStateUseCase', () => {
  it('should give everything the lobby shows, without who added each dilemma', async () => {
    // Arrange
    const { getRoomState, allowAdding, addDilemma, roomRepository, roomId, anaId, luisId } =
      await arrange();
    await allowAdding();
    await addDilemma.execute({ roomId, playerId: luisId, dilemmaId: 'TestCatalog5' });
    const room = (await roomRepository.findById(roomId))!;

    // Act
    const forAna = await getRoomState.execute({ roomId, playerId: anaId });
    const forLuis = await getRoomState.execute({ roomId, playerId: luisId });

    // Assert
    expect(forAna).toMatchObject({
      roomId,
      roomVersion: room.version,
      code: room.code,
      playerId: anaId,
      hostId: anaId,
      groupNature: 'friends',
      place: 'together',
      settings: room.settings.toSnapshot(),
      minimumPlayers: 2,
      addedDilemmas: [{ dilemmaId: 'TestCatalog5', text: 'TextOfTestCatalog5' }],
      ownAddedDilemmaId: null,
      pickedDilemmas: [],
      currentGameId: null,
    });
    expect(forAna.players.map(({ nickname }) => nickname)).toEqual(['Ana', 'Luis', 'Marta']);
    expect(forAna.addedDilemmas[0]).not.toHaveProperty('playerId');
    expect(forLuis.ownAddedDilemmaId).toBe('TestCatalog5');
  });

  it('should throw an error if whoever asks is not in the room', async () => {
    // Arrange
    const { getRoomState, roomId } = await arrange();

    // Act & Assert
    await expect(getRoomState.execute({ roomId, playerId: 'TestStrangerId' })).rejects.toThrow(
      PlayerNotInRoomError,
    );
  });
});
