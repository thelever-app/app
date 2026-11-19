import { Room } from '../../../domain/entities/room.ts';
import { describe, expect, it, vi } from 'vitest';
import { ChangeRoomSettingsUseCase } from '../../use-cases/change-room-settings.use-case.ts';
import { ChooseRoundDilemmaUseCase } from '../../use-cases/choose-round-dilemma.use-case.ts';
import { StartGameUseCase } from '../../use-cases/start-game.use-case.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { DilemmasMissingError } from '../../../domain/errors/dilemmas-missing.error.ts';
import { GameInProgressError } from '../../../domain/errors/game-in-progress.error.ts';
import { NotEnoughPlayersError } from '../../../domain/errors/not-enough-players.error.ts';
import { NotHostError } from '../../../domain/errors/not-host.error.ts';
import type { RoundChange } from '../../../domain/entities/room.ts';
import type { Category } from '../../../domain/vos/category.vo.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { lobbyOfThree } from '../support/game-in-decision-phase.ts';
import { CANDIDATES_PER_ROUND, EXPLORATION_SLOTS, lobbyCatalog } from '../support/test-catalog.ts';

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
      clock: lobby.clock,
    },
    EXPLORATION_SLOTS,
    CANDIDATES_PER_ROUND,
  );
  const changeSettings = new ChangeRoomSettingsUseCase(
    lobby.roomRepository,
    lobby.catalog,
    notifier,
  );
  return { ...lobby, notifier, startGame, changeSettings };
}

/** That many random rounds from those categories; every one, for null. */
function randomRounds(count: number, categories: readonly Category[] | null = null): RoundChange[] {
  return Array.from({ length: count }, () => ({ origin: 'random', categories }));
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

    it('should put the game together from the rounds of the room', async () => {
      // Arrange: life-and-death has eight dilemmas for everyone in the catalog and three new ones.
      const { startGame, changeSettings, gameRepository, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { rounds: randomRounds(8, ['life-and-death']) },
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
      expect(game?.dilemmas.every(({ origin }) => origin === 'random')).toBe(true);
    });

    it('should take the dilemma of a random round from any of its categories, and leave out a round with nothing left', async () => {
      // Arrange: honesty has two dilemmas in the catalog, and justice none.
      const { startGame, changeSettings, gameRepository, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { rounds: randomRounds(3, ['honesty', 'justice']), newDilemmas: false },
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

    it('should play the dilemma a player chose in its round, with who chose it', async () => {
      // Arrange
      const lobby = await arrange();
      const { startGame, changeSettings, gameRepository, roomId, anaId, luisId } = lobby;
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { rounds: [...randomRounds(1), { origin: 'players' }, { origin: 'players' }] },
      });
      const [, chosen] = (await lobby.roomRepository.findById(roomId))!.settings.rounds;
      await new ChooseRoundDilemmaUseCase(
        lobby.roomRepository,
        lobby.catalog,
        lobby.notifier,
      ).execute({ roomId, playerId: luisId, roundId: chosen!.id, dilemmaId: 'TestCatalog5' });

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      const dilemmas = (await gameRepository.findById(gameId))?.dilemmas ?? [];
      expect(dilemmas).toHaveLength(3);
      expect(dilemmas[1]).toMatchObject({
        dilemmaId: 'TestCatalog5',
        origin: 'players',
        chosenBy: luisId,
      });
      expect(dilemmas[2]).toMatchObject({ origin: 'random', chosenBy: null });
    });

    it('should take the dilemmas from every category by default', async () => {
      // Arrange: eleven dilemmas for everyone in the catalog, eight of life-and-death, two of
      // honesty and one of loyalty.
      const { startGame, changeSettings, gameRepository, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { rounds: randomRounds(12), newDilemmas: false },
      });

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      const ids = (await gameRepository.findById(gameId))?.dilemmas.map(
        ({ dilemmaId }) => dilemmaId,
      );
      expect(ids).toHaveLength(11);
      expect(ids).toEqual(expect.arrayContaining(['TestHonesty1', 'TestHonesty2', 'TestGap1']));
    });

    it('should copy the settings of the room into the game, and the ambience it has', async () => {
      // Arrange
      const { startGame, changeSettings, gameRepository, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { variant: 'anonymous', timePerDilemmaSeconds: 60, dilemmaLanguage: 'ca' },
      });

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      // Anonymous, the room is no longer classic.
      expect((await gameRepository.findById(gameId))?.settings).toEqual({
        ambience: 'custom',
        variant: 'anonymous',
        groupNature: 'friends',
        place: 'together',
        dilemmaLanguage: 'ca',
        timePerDilemmaSeconds: 60,
      });
    });

    it('should play the specific dilemma of a round in its place, and leave it to this game only', async () => {
      // Arrange
      const { startGame, changeSettings, gameRepository, roomRepository, roomId, anaId } =
        await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: {
          rounds: [...randomRounds(1), { origin: 'specific', dilemmaId: 'TestCatalog5' }],
        },
      });

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.dilemmas[1]).toMatchObject({ dilemmaId: 'TestCatalog5', origin: 'specific' });
      expect((await roomRepository.findById(roomId))?.roundDilemmaIds).toEqual([]);
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

    it('should not look for candidates when every round has its dilemma', async () => {
      // Arrange
      const { startGame, changeSettings, catalog, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { rounds: [{ origin: 'specific', dilemmaId: 'TestCatalog3' }] },
      });
      const findCandidates = vi.spyOn(catalog, 'findCandidates');

      // Act
      await startGame.execute({ roomId, playerId: anaId });

      // Assert
      expect(findCandidates).not.toHaveBeenCalled();
    });

    it.each([
      ['nominal', true],
      ['anonymous', false],
    ] as const)(
      'should play a dilemma with the gap in a %s room of three only if it has the players it needs: %s',
      async (variant, played) => {
        // Arrange
        const { startGame, changeSettings, gameRepository, roomId, anaId } = await arrange();
        await changeSettings.execute({
          roomId,
          playerId: anaId,
          changes: {
            variant,
            rounds: [{ origin: 'specific', dilemmaId: 'TestGap1' }],
            newDilemmas: false,
          },
        });

        // Act
        const { gameId } = await startGame.execute({ roomId, playerId: anaId });

        // Assert
        const [first] = (await gameRepository.findById(gameId))?.dilemmas ?? [];
        expect(first?.dilemmaId === 'TestGap1').toBe(played);
        expect(first?.origin).toBe(played ? 'specific' : 'random');
      },
    );

    it('should draw first the dilemmas nobody in the room has played', async () => {
      // Arrange: Luis played four of the eight dilemmas of life-and-death for everyone.
      const lobby = await arrange();
      const { startGame, changeSettings, gameRepository, roomRepository, roomId, anaId } = lobby;
      const played = ['TestCatalog3', 'TestCatalog4', 'TestCatalog5', 'TestCatalog6'];
      const room = (await roomRepository.findById(roomId))!;
      const luis = room.playerWith('TestLuisIdentity')!;
      room.join(
        {
          underEighteen: false,
          nickname: luis.nickname,
          identity: luis.identity,
          avatar: luis.avatar,
          playedDilemmaIds: played,
        },
        lobby.idGenerator,
        lobby.clock.now(),
      );
      await roomRepository.save(room);
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { rounds: randomRounds(4, ['life-and-death']), newDilemmas: false },
      });

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      const ids = (await gameRepository.findById(gameId))?.dilemmas.map(
        ({ dilemmaId }) => dilemmaId,
      );
      expect([...(ids ?? [])].sort()).toEqual([
        'TestCatalog10',
        'TestCatalog7',
        'TestCatalog8',
        'TestCatalog9',
      ]);
    });

    it('should play from every category the rounds of a rematch beyond what their categories have left', async () => {
      // Arrange: honesty has two dilemmas, and the room played one of them in its game before.
      const { startGame, changeSettings, gameRepository, roomRepository, roomId, anaId } =
        await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { rounds: randomRounds(2, ['honesty']), newDilemmas: false },
      });
      const room = (await roomRepository.findById(roomId))!;
      await roomRepository.save(
        Room.restore({ ...room.toSnapshot(), playedDilemmaIds: ['TestHonesty1'] }),
      );

      // Act
      const { gameId } = await startGame.execute({ roomId, playerId: anaId });

      // Assert
      const ids = (await gameRepository.findById(gameId))?.dilemmas.map(
        ({ dilemmaId }) => dilemmaId,
      );
      expect(ids).toHaveLength(2);
      expect(ids).toContain('TestHonesty2');
      expect(ids).not.toContain('TestHonesty1');
    });

    it('should draw a few candidates for each round, never the dilemmas the rounds already play', async () => {
      // Arrange
      const { startGame, changeSettings, catalog, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: {
          rounds: [
            ...randomRounds(2, ['life-and-death']),
            { origin: 'specific', dilemmaId: 'TestCatalog3' },
          ],
          newDilemmas: false,
        },
      });
      const findCandidates = vi.spyOn(catalog, 'findCandidates');

      // Act
      await startGame.execute({ roomId, playerId: anaId });

      // Assert
      expect(findCandidates).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          categories: ['life-and-death'],
          count: 2 * CANDIDATES_PER_ROUND,
          excludedIds: ['TestCatalog3'],
          playedBy: [],
          includeGap: true,
          content: 'any',
        }),
      );
    });

    it('should draw the candidates of each content apart, and those of any content for them too', async () => {
      // Arrange
      const { startGame, changeSettings, catalog, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: {
          adultsOnly: true,
          rounds: [
            ...randomRounds(4, ['life-and-death']),
            { id: 5, origin: 'random', categories: ['life-and-death'], content: 'adults-only' },
            { id: 6, origin: 'random', categories: ['life-and-death'], content: 'adults-only' },
          ],
          newDilemmas: false,
        },
      });
      const findCandidates = vi.spyOn(catalog, 'findCandidates');

      // Act
      await startGame.execute({ roomId, playerId: anaId });

      // Assert
      expect(findCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ count: 6 * CANDIDATES_PER_ROUND, content: 'any' }),
      );
      expect(findCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ count: 2 * CANDIDATES_PER_ROUND, content: 'adults-only' }),
      );
    });

    it('should not draw a dilemma with the gap for a room without the players it needs', async () => {
      // Arrange: an anonymous room of three.
      const { startGame, changeSettings, catalog, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { variant: 'anonymous', rounds: randomRounds(1), newDilemmas: false },
      });
      const findCandidates = vi.spyOn(catalog, 'findCandidates');

      // Act
      await startGame.execute({ roomId, playerId: anaId });

      // Assert
      expect(findCandidates).toHaveBeenCalledWith(expect.objectContaining({ includeGap: false }));
    });

    it('should never draw a compromising dilemma', async () => {
      // Arrange: love-and-relationships has only a compromising dilemma.
      const { startGame, changeSettings, roomId, anaId } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { rounds: randomRounds(8, ['love-and-relationships']) },
      });

      // Act & Assert
      await expect(startGame.execute({ roomId, playerId: anaId })).rejects.toThrow(
        DilemmasMissingError,
      );
    });

    it('should not start a game without dilemmas, in categories that have none for the room', async () => {
      // Arrange
      const { startGame, changeSettings, roomId, anaId, roomRepository } = await arrange();
      await changeSettings.execute({
        roomId,
        playerId: anaId,
        changes: { rounds: randomRounds(8, ['justice']) },
      });

      // Act & Assert
      await expect(startGame.execute({ roomId, playerId: anaId })).rejects.toThrow(
        DilemmasMissingError,
      );
      expect((await roomRepository.findById(roomId))?.isInLobby).toBe(true);
    });
  });
});
