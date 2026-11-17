import { describe, expect, it } from 'vitest';
import { ChangeAvatarUseCase } from '../../use-cases/change-avatar.use-case.ts';
import { ChangeRoomSettingsUseCase } from '../../use-cases/change-room-settings.use-case.ts';
import { ExpelPlayerUseCase } from '../../use-cases/expel-player.use-case.ts';
import { GetRoomPreviewUseCase } from '../../use-cases/get-room-preview.use-case.ts';
import { GetRoomStateUseCase } from '../../use-cases/get-room-state.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { ChooseRoundDilemmaUseCase } from '../../use-cases/choose-round-dilemma.use-case.ts';
import { ClearRoundDilemmaUseCase } from '../../use-cases/clear-round-dilemma.use-case.ts';
import {
  SEARCH_PAGE_SIZE,
  SearchDilemmasUseCase,
} from '../../use-cases/search-dilemmas.use-case.ts';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { RoomCodeNotFoundError } from '../../errors/room-code-not-found.error.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { IdentityNotInRoomError } from '../../errors/identity-not-in-room.error.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { NicknameAndAvatarTakenError } from '../../../domain/errors/nickname-and-avatar-taken.error.ts';
import { DilemmaNotSuitableError } from '../../../domain/errors/dilemma-not-suitable.error.ts';
import { NotChooserError } from '../../../domain/errors/not-chooser.error.ts';
import { NotHostError } from '../../../domain/errors/not-host.error.ts';
import { PlayerNotInRoomError } from '../../../domain/errors/player-not-in-room.error.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { FixedRandomness } from '../../../domain/test/support/fixed-randomness.ts';
import { AvatarVO } from '../../../domain/vos/avatar.vo.ts';
import { lobbyOfThree } from '../support/game-in-decision-phase.ts';
import { lobbyCatalog } from '../support/test-catalog.ts';
import { InMemoryDilemmaCatalog } from '../../../adapters/in-memory/in-memory-dilemma-catalog.ts';

/** The lobby of three, with a catalog to search and add from, and every lobby use case. */
async function arrange() {
  const notifier = new InMemoryPlayerNotifier();
  const lobby = await lobbyOfThree(new InMemoryPlayerNotifier(), lobbyCatalog());
  const { roomRepository, catalog } = lobby;
  const changeSettings = new ChangeRoomSettingsUseCase(roomRepository, catalog, notifier);
  return {
    ...lobby,
    notifier,
    changeSettings,
    /** Round 1 random and round 2 for the players. */
    leaveARoundToThePlayers: () =>
      changeSettings.execute({
        roomId: lobby.roomId,
        playerId: lobby.anaId,
        changes: {
          rounds: [
            { id: 1, origin: 'random', categories: null },
            { id: 2, origin: 'players' },
          ],
        },
      }),
    changeAvatar: new ChangeAvatarUseCase(roomRepository, notifier),
    chooseRoundDilemma: new ChooseRoundDilemmaUseCase(roomRepository, catalog, notifier),
    clearRoundDilemma: new ClearRoundDilemmaUseCase(roomRepository, notifier),
    expelPlayer: new ExpelPlayerUseCase(roomRepository, notifier),
    searchDilemmas: new SearchDilemmasUseCase(roomRepository, catalog),
    getRoomPreview: new GetRoomPreviewUseCase(roomRepository, new FixedRandomness(), lobby.clock),
    joinRoom: new JoinRoomUseCase({ ...lobby, notifier }),
    getRoomState: new GetRoomStateUseCase(roomRepository, catalog),
  };
}

describe('GetRoomPreviewUseCase', () => {
  it('should show whose room it is and its type, from its code', async () => {
    // Arrange
    const { getRoomPreview, roomRepository, roomId } = await arrange();
    const { code } = (await roomRepository.findById(roomId))!;

    // Act
    const preview = await getRoomPreview.execute({
      code: code.toLowerCase(),
      identity: 'TestPabloIdentity',
    });

    // Assert
    expect(preview).toMatchObject({
      roomId,
      hostNickname: 'Ana',
      variant: 'nominal',
      adultsOnly: false,
    });
  });

  it('should show the nickname and the avatar of everyone inside, in the order they came in', async () => {
    // Arrange
    const { getRoomPreview, roomRepository, roomId } = await arrange();
    const { code } = (await roomRepository.findById(roomId))!;

    // Act
    const { players } = await getRoomPreview.execute({ code, identity: 'TestPabloIdentity' });

    // Assert
    expect(players).toEqual([
      { nickname: 'Ana', avatar: { face: 'face-01', color: 'khaki' } },
      { nickname: 'Luis', avatar: { face: 'face-02', color: 'teal' } },
      { nickname: 'Marta', avatar: { face: 'face-03', color: 'brown' } },
    ]);
  });

  it('should leave out the player of whoever asks, who is already inside', async () => {
    // Arrange
    const { getRoomPreview, roomRepository, roomId } = await arrange();
    const { code } = (await roomRepository.findById(roomId))!;

    // Act
    const { players } = await getRoomPreview.execute({ code, identity: 'TestLuisIdentity' });

    // Assert
    expect(players.map(({ nickname }) => nickname)).toEqual(['Ana', 'Marta']);
  });

  it('should suggest, at random, an avatar nobody inside has', async () => {
    // Arrange: Ana wears the first avatar, so the free ones start at the second.
    const { roomRepository, roomId, clock } = await arrange();
    const { code } = (await roomRepository.findById(roomId))!;
    const getRoomPreview = new GetRoomPreviewUseCase(roomRepository, new FixedRandomness(0), clock);

    // Act
    const { suggestedAvatar } = await getRoomPreview.execute({
      code,
      identity: 'TestPabloIdentity',
    });

    // Assert
    const [, second] = AvatarVO.all();
    expect(suggestedAvatar).toEqual({ face: second?.face, color: second?.color });
  });

  it('should throw an error if no open room has that code', async () => {
    // Arrange
    const { getRoomPreview } = await arrange();

    // Act & Assert
    await expect(
      getRoomPreview.execute({ code: 'ZZZZZ', identity: 'TestPabloIdentity' }),
    ).rejects.toThrow(RoomCodeNotFoundError);
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

  it('should let a player take the avatar of someone with another nickname', async () => {
    // Arrange
    const { changeAvatar, roomRepository, roomId, luisId } = await arrange();

    // Act
    await changeAvatar.execute({ roomId, playerId: luisId, face: 'face-01', color: 'khaki' });

    // Assert
    const luis = (await roomRepository.findById(roomId))?.players.find(({ id }) => id === luisId);
    expect(luis?.avatar).toMatchObject({ face: 'face-01', color: 'khaki' });
  });

  it('should throw an error if someone with the same nickname has that avatar', async () => {
    // Arrange: a second Ana joins, and tries to take the avatar of the first one.
    const { changeAvatar, joinRoom, roomId } = await arrange();
    const { playerId } = await joinRoom.execute({
      roomId,
      nickname: 'ana',
      identity: 'TestOtherAnaIdentity',
      avatar: { face: 'face-04', color: 'slate' },
    });

    // Act & Assert
    await expect(
      changeAvatar.execute({ roomId, playerId, face: 'face-01', color: 'khaki' }),
    ).rejects.toThrow(NicknameAndAvatarTakenError);
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
        timePerDilemmaSeconds: 90,
        rounds: [
          { origin: 'random', categories: ['honesty', 'loyalty'] },
          { origin: 'specific', dilemmaId: 'TestCatalog4' },
        ],
      },
    });

    // Assert
    const { settings } = (await roomRepository.findById(roomId))!;
    expect(settings.timePerDilemmaSeconds).toBe(90);
    expect(settings.rounds).toEqual([
      { id: 9, origin: 'random', categories: ['honesty', 'loyalty'] },
      {
        id: 10,
        origin: 'specific',
        dilemma: { dilemmaId: 'TestCatalog4', minimumAge: 16, compromising: false },
      },
    ]);
    expect(notifier.receivedBy(luisId)).toEqual([
      new LobbyChangedEvent(roomId, 'settings-changed', 3),
    ]);
  });

  it.each([
    {
      case: 'for adults in a room for everyone',
      dilemmaId: 'TestCatalog1',
      error: DilemmaNotSuitableError,
    },
    {
      case: 'that is compromising',
      dilemmaId: 'TestCompromising1',
      error: DilemmaNotSuitableError,
    },
    {
      case: 'that is not in the general catalog',
      dilemmaId: 'TestNew1',
      error: DilemmaNotSuitableError,
    },
  ])('should throw an error for a specific dilemma $case', async ({ dilemmaId, error }) => {
    // Arrange
    const { changeSettings, roomId, anaId } = await arrange();

    // Act & Assert
    await expect(
      changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { rounds: [{ origin: 'specific', dilemmaId }] },
      }),
    ).rejects.toThrow(error);
  });

  it('should make random the rounds whose dilemmas are not in the new language', async () => {
    // Arrange
    const { changeSettings, roomRepository, roomId, anaId } = await arrange();
    await changeSettings.execute({
      roomId,
      playerId: anaId,
      changes: { rounds: [{ id: 1, origin: 'specific', dilemmaId: 'TestCatalog4' }] },
    });

    // Act
    await changeSettings.execute({ roomId, playerId: anaId, changes: { dilemmaLanguage: 'ca' } });

    // Assert
    expect((await roomRepository.findById(roomId))?.settings.rounds).toEqual([
      { id: 1, origin: 'random', categories: null },
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

describe('ChooseRoundDilemmaUseCase and ClearRoundDilemmaUseCase', () => {
  it('should keep a dilemma of the catalog a player chooses for a round, and let only them take it out', async () => {
    // Arrange
    const lobby = await arrange();
    const { leaveARoundToThePlayers, chooseRoundDilemma, clearRoundDilemma, roomRepository } =
      lobby;
    const { roomId, anaId, luisId, notifier } = lobby;
    await leaveARoundToThePlayers();

    // Act
    await chooseRoundDilemma.execute({
      roomId,
      playerId: luisId,
      roundId: 2,
      dilemmaId: 'TestCatalog5',
    });
    const chosen = (await roomRepository.findById(roomId))?.chosenDilemmas;
    const byAna = clearRoundDilemma.execute({ roomId, playerId: anaId, roundId: 2 });
    await expect(byAna).rejects.toThrow(NotChooserError);
    await clearRoundDilemma.execute({ roomId, playerId: luisId, roundId: 2 });

    // Assert
    expect(chosen).toEqual([
      {
        dilemmaId: 'TestCatalog5',
        minimumAge: 16,
        compromising: false,
        roundId: 2,
        playerId: luisId,
      },
    ]);
    expect((await roomRepository.findById(roomId))?.chosenDilemmas).toEqual([]);
    expect(notifier.receivedBy(anaId).map(({ type }) => type)).toEqual([
      'LobbyChanged',
      'LobbyChanged',
      'LobbyChanged',
    ]);
  });

  it.each([
    {
      case: 'that does not suit the room',
      dilemmaId: 'TestCatalog2',
      error: DilemmaNotSuitableError,
    },
    {
      case: 'that is compromising',
      dilemmaId: 'TestCompromising1',
      error: DilemmaNotSuitableError,
    },
    {
      case: 'that is not in the general catalog',
      dilemmaId: 'TestNew1',
      error: DilemmaNotFoundError,
    },
  ])('should throw an error for a dilemma $case', async ({ dilemmaId, error }) => {
    // Arrange
    const { leaveARoundToThePlayers, chooseRoundDilemma, roomId, luisId } = await arrange();
    await leaveARoundToThePlayers();

    // Act & Assert
    await expect(
      chooseRoundDilemma.execute({ roomId, playerId: luisId, roundId: 2, dilemmaId }),
    ).rejects.toThrow(error);
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
    const { dilemmas: found } = await searchDilemmas.execute({
      roomId,
      identity: 'TestLuisIdentity',
    });

    // Assert
    const ids = found.map(({ dilemmaId }) => dilemmaId);
    expect(ids).not.toContain('TestCatalog1');
    expect(ids).not.toContain('TestNew1');
    expect(ids).not.toContain('TestCompromising1');
    expect(found.every(({ minimumAge }) => minimumAge === 16)).toBe(true);
  });

  it('should find the dilemmas with what is searched, also those for adults in a room for adults', async () => {
    // Arrange
    const { searchDilemmas, changeSettings, roomId, anaId } = await arrange();
    await changeSettings.execute({ roomId, playerId: anaId, changes: { adultsOnly: true } });

    // Act
    const { dilemmas: all } = await searchDilemmas.execute({ roomId, identity: 'TestAnaIdentity' });
    const { dilemmas: family } = await searchDilemmas.execute({
      roomId,
      identity: 'TestAnaIdentity',
      text: 'family',
    });

    // Assert
    expect(all.map(({ dilemmaId }) => dilemmaId)).toContain('TestCatalog1');
    expect(family.map(({ dilemmaId }) => dilemmaId)).toEqual([
      'TestCatalog3',
      'TestCatalog4',
      'TestCatalog5',
    ]);
  });

  it('should find only the dilemmas of the category given', async () => {
    // Arrange
    const { searchDilemmas, roomId } = await arrange();

    // Act
    const { dilemmas: found } = await searchDilemmas.execute({
      roomId,
      identity: 'TestAnaIdentity',
      category: 'honesty',
    });

    // Assert
    expect(found.map(({ dilemmaId }) => dilemmaId)).toEqual(['TestHonesty1', 'TestHonesty2']);
  });

  it('should give the dilemmas twenty at a time, and the next twenty after them', async () => {
    // Arrange
    const twentyFive = new InMemoryDilemmaCatalog(
      Array.from({ length: 25 }, (_, index) => ({
        dilemmaId: `TestDilemma${String(index + 1).padStart(2, '0')}`,
        text: `TextOf${index + 1}`,
        options: [
          { optionId: 'TestOption', text: 'TestOptionText' },
          { optionId: 'TestOtherOption', text: 'TestOtherOptionText' },
        ],
      })),
    );
    const { roomRepository, roomId } = await lobbyOfThree(new InMemoryPlayerNotifier(), twentyFive);
    const searchDilemmas = new SearchDilemmasUseCase(roomRepository, twentyFive);

    // Act
    const first = await searchDilemmas.execute({ roomId, identity: 'TestAnaIdentity' });
    const second = await searchDilemmas.execute({
      roomId,
      identity: 'TestAnaIdentity',
      after: first.next!,
    });

    // Assert
    expect(first.dilemmas).toHaveLength(SEARCH_PAGE_SIZE);
    expect(second.dilemmas.map(({ dilemmaId }) => dilemmaId)).toEqual([
      'TestDilemma21',
      'TestDilemma22',
      'TestDilemma23',
      'TestDilemma24',
      'TestDilemma25',
    ]);
    expect(second.next).toBeUndefined();
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
  it('should give everything the lobby shows, without who chose the dilemma of each round', async () => {
    // Arrange
    const lobby = await arrange();
    const { getRoomState, changeSettings, chooseRoundDilemma, roomRepository } = lobby;
    const { roomId, anaId, luisId } = lobby;
    await changeSettings.execute({
      roomId,
      playerId: anaId,
      changes: {
        rounds: [
          { id: 1, origin: 'random', categories: ['honesty'] },
          { id: 2, origin: 'specific', dilemmaId: 'TestCatalog4' },
          { id: 3, origin: 'players' },
          { id: 4, origin: 'players' },
        ],
      },
    });
    await chooseRoundDilemma.execute({
      roomId,
      playerId: luisId,
      roundId: 3,
      dilemmaId: 'TestCatalog5',
    });
    const room = (await roomRepository.findById(roomId))!;

    // Act
    const forAna = await getRoomState.execute({ roomId, playerId: anaId });
    const forLuis = await getRoomState.execute({ roomId, playerId: luisId });

    // Assert
    const { rounds, ...settings } = room.settings.toSnapshot();
    expect(forAna).toMatchObject({
      roomId,
      roomVersion: room.version,
      code: room.code,
      playerId: anaId,
      hostId: anaId,
      groupNature: 'friends',
      place: 'together',
      settings,
      minimumPlayers: 2,
      currentGameId: null,
    });
    expect(forAna.rounds).toEqual([
      { roundId: 1, origin: 'random', categories: ['honesty'] },
      {
        roundId: 2,
        origin: 'specific',
        dilemma: { dilemmaId: 'TestCatalog4', text: 'TextOfTestCatalog4' },
      },
      {
        roundId: 3,
        origin: 'players',
        dilemma: { dilemmaId: 'TestCatalog5', text: 'TextOfTestCatalog5' },
        chosenByYou: false,
      },
      { roundId: 4, origin: 'players', dilemma: null, chosenByYou: false },
    ]);
    expect(rounds).toHaveLength(4);
    expect(forAna.players.map(({ nickname }) => nickname)).toEqual(['Ana', 'Luis', 'Marta']);
    expect(forLuis.rounds[2]).toMatchObject({ chosenByYou: true });
    expect(JSON.stringify(forAna)).not.toContain('playerId":"' + luisId + '","origin');
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
