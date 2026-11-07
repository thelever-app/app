import { describe, expect, it, vi } from 'vitest';
import { ChangeRoomSettingsUseCase } from '../../use-cases/change-room-settings.use-case.ts';
import { PickDilemmasUseCase } from '../../use-cases/pick-dilemmas.use-case.ts';
import { StartGameUseCase } from '../../use-cases/start-game.use-case.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { DilemmasMissingError } from '../../../domain/errors/dilemmas-missing.error.ts';
import { GameInProgressError } from '../../../domain/errors/game-in-progress.error.ts';
import { NotEnoughPlayersError } from '../../../domain/errors/not-enough-players.error.ts';
import { NotHostError } from '../../../domain/errors/not-host.error.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { lobbyOfThree } from '../support/game-in-decision-phase.ts';
import { EXPLORATION_SLOTS, lobbyCatalog } from '../support/test-catalog.ts';

async function arrange() {
  const notifier = new InMemoryPlayerNotifier();
  const lobby = await lobbyOfThree(new InMemoryPlayerNotifier(), lobbyCatalog());
  const startGame = new StartGameUseCase(
    {
      roomRepository: lobby.roomRepository,
      gameRepository: lobby.gameRepository,
      dilemmaCatalog: lobby.catalog,
      notifier,
      idGenerator: lobby.idGenerator,
      randomness: lobby.randomness,
    },
    EXPLORATION_SLOTS,
  );
  const changeSettings = new ChangeRoomSettingsUseCase(lobby.roomRepository, notifier);
  return { ...lobby, notifier, startGame, changeSettings };
}

describe('StartGameUseCase', () => {
  describe('execute', () => {
    it('should save a game in the decision phase with everyone in the room', async () => {
      // Arrange
      const { startGame, gameRepository, roomRepository, roomId, anaId, luisId, martaId } =
        await arrange();

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.roomId).toBe(roomId);
      expect(game?.isInDecisionPhase).toBe(true);
      expect(game?.playerIds).toEqual([anaId, luisId, martaId]);
      expect((await roomRepository.findById(roomId))?.currentGameId).toBe(gameId);
    });

    it('should put the game together from the settings of the room', async () => {
      // Arrange: life-and-death has eight dilemmas for everyone in the catalog and three new ones.
      const { startGame, changeSettings, gameRepository, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { categories: ['life-and-death'] },
      });

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      const game = await gameRepository.findById(gameId);
      const ids = game?.dilemmas.map(({ dilemmaId }) => dilemmaId) ?? [];
      expect(ids).toHaveLength(8);
      expect(ids.filter((id) => id.startsWith('TestNew'))).toHaveLength(2);
      expect(ids).not.toContain('TestCatalog1');
      expect(ids.some((id) => id.startsWith('TestHonesty'))).toBe(false);
      expect(game?.dilemmas.every(({ origin }) => origin === 'picked-by-the-system')).toBe(true);
    });

    it('should take the dilemmas from any of the categories of the room', async () => {
      // Arrange: honesty has two dilemmas in the catalog, and justice none.
      const { startGame, changeSettings, gameRepository, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { categories: ['honesty', 'justice'], newDilemmas: false },
      });

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.dilemmas.map(({ dilemmaId }) => dilemmaId).sort()).toEqual([
        'TestHonesty1',
        'TestHonesty2',
      ]);
    });

    it('should play only the dilemmas the players added when the room plays no category', async () => {
      // Arrange
      const { startGame, changeSettings, gameRepository, roomRepository, roomId, anaId, luisId } =
        await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { categories: [], dilemmasPerPlayer: 1 },
      });
      const room = (await roomRepository.findById(roomId))!;
      room.addDilemma(luisId, { dilemmaId: 'TestCatalog5', minimumAge: 16 });
      await roomRepository.save(room);

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      const ids = (await gameRepository.findById(gameId))?.dilemmas.map(
        ({ dilemmaId }) => dilemmaId,
      );
      expect(ids).toEqual(['TestCatalog5']);
    });

    it('should take the dilemmas from every category by default', async () => {
      // Arrange: ten dilemmas for everyone in the catalog, eight of life-and-death and two of honesty.
      const { startGame, changeSettings, gameRepository, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { dilemmaCount: 12, newDilemmas: false },
      });

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      const ids = (await gameRepository.findById(gameId))?.dilemmas.map(
        ({ dilemmaId }) => dilemmaId,
      );
      expect(ids).toHaveLength(10);
      expect(ids).toEqual(expect.arrayContaining(['TestHonesty1', 'TestHonesty2']));
    });

    it('should copy the settings of the room into the game', async () => {
      // Arrange
      const { startGame, changeSettings, gameRepository, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { variant: 'anonymous', totalTimeInMinutes: 10, dilemmaLanguage: 'ca' },
      });

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      expect((await gameRepository.findById(gameId))?.settings).toEqual({
        variant: 'anonymous',
        groupNature: 'friends',
        place: 'together',
        dilemmaLanguage: 'ca',
        totalTimeInMinutes: 10,
      });
    });

    it('should play exactly the dilemmas the host picked', async () => {
      // Arrange
      const lobby = await arrange();
      const picked = ['TestCatalog3', 'TestCatalog4', 'TestCatalog5'];
      await new PickDilemmasUseCase(lobby.roomRepository, lobby.catalog, lobby.notifier).execute({
        roomId: lobby.roomId,
        playerId: lobby.anaId,
        dilemmaIds: picked,
      });

      // Act
      const { gameId } = await lobby.startGame.execute({
        roomId: lobby.roomId,
        playerId: lobby.anaId,
      });

      // Assert
      const game = await lobby.gameRepository.findById(gameId);
      expect(game?.dilemmas.map(({ dilemmaId }) => dilemmaId).sort()).toEqual(picked);
      expect(game?.dilemmas.every(({ origin }) => origin === 'picked-by-the-host')).toBe(true);
    });

    it('should tell everyone in the room that the game started', async () => {
      // Arrange
      const { startGame, notifier, roomId, anaId, martaId } = await arrange();

      // Act
      await startGame.execute({ roomId, playerId: anaId });

      // Assert
      expect(notifier.receivedBy(martaId)).toEqual([
        new LobbyChangedEvent(roomId, 'game-started', 3),
      ]);
    });

    it('should not start, nor save any game, if a player who is not the host tries', async () => {
      // Arrange
      const { startGame, roomId, luisId, roomRepository } = await arrange();

      // Act & Assert
      await expect(startGame.execute({ roomId, playerId: luisId })).rejects.toThrow(NotHostError);
      expect((await roomRepository.findById(roomId))?.isInLobby).toBe(true);
    });

    it('should not start a second game while one is in progress', async () => {
      // Arrange
      const { startGame, roomId, anaId } = await arrange();
      await startGame.execute({ roomId, playerId: anaId });

      // Act & Assert
      await expect(startGame.execute({ roomId, playerId: anaId })).rejects.toThrow(
        GameInProgressError,
      );
    });

    it('should not start with fewer players than the room needs', async () => {
      // Arrange: Luis and Marta were expelled, so Ana is alone in a nominal room.
      const lobby = await arrange();
      const room = (await lobby.roomRepository.findById(lobby.roomId))!;
      room.expel(lobby.anaId, lobby.luisId);
      room.expel(lobby.anaId, lobby.martaId);
      await lobby.roomRepository.save(room);

      // Act & Assert
      await expect(
        lobby.startGame.execute({ roomId: lobby.roomId, playerId: lobby.anaId }),
      ).rejects.toThrow(NotEnoughPlayersError);
    });

    it('should not look for any dilemma before knowing the game can start', async () => {
      // Arrange
      const { startGame, catalog, roomId, luisId } = await arrange();
      const search = vi.spyOn(catalog, 'search');

      // Act & Assert
      await expect(startGame.execute({ roomId, playerId: luisId })).rejects.toThrow(NotHostError);
      expect(search).not.toHaveBeenCalled();
    });

    it('should not look for candidates when the host picked the dilemmas', async () => {
      // Arrange
      const lobby = await arrange();
      await new PickDilemmasUseCase(lobby.roomRepository, lobby.catalog, lobby.notifier).execute({
        roomId: lobby.roomId,
        playerId: lobby.anaId,
        dilemmaIds: ['TestCatalog3'],
      });
      const search = vi.spyOn(lobby.catalog, 'search');

      // Act
      await lobby.startGame.execute({ roomId: lobby.roomId, playerId: lobby.anaId });

      // Assert
      expect(search).not.toHaveBeenCalled();
    });

    it('should not start a game without dilemmas, in categories that have none for the room', async () => {
      // Arrange
      const { startGame, changeSettings, roomId, anaId, roomRepository } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { categories: ['justice'] },
      });

      // Act & Assert
      await expect(startGame.execute({ roomId, playerId: anaId })).rejects.toThrow(
        DilemmasMissingError,
      );
      expect((await roomRepository.findById(roomId))?.isInLobby).toBe(true);
    });
  });
});
