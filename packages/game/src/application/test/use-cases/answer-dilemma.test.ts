import { describe, expect, it } from 'vitest';
import { AnswerDilemmaUseCase } from '../../use-cases/answer-dilemma.use-case.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { PlayerNotInRoomError } from '../../../domain/errors/player-not-in-room.error.ts';
import { GameNotInProgressError } from '../../../domain/errors/game-not-in-progress.error.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { InMemorySealProvider } from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import { AnsweredCountChangedEvent } from '../../../domain/events/answered-count-changed.event.ts';
import type { PlayerNotifier } from '../../ports/player-notifier.port.ts';
import {
  gameInDecisionPhase as sharedGameInDecisionPhase,
  lobbyOfThree,
} from '../support/game-in-decision-phase.ts';
import { testCatalog, testCatalogWithEnglishFor } from '../support/test-catalog.ts';

/** Fails to deliver anything, as a notifier that lost its connection would. */
class UnreachablePlayerNotifier extends InMemoryPlayerNotifier {
  override async notify(): Promise<void> {
    throw new Error('connection lost');
  }
}

/** The seal Luis has in these tests: an adult with the research consent. */
const LUIS_SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: 'TestResearchConsentVersion',
  commercialLicenceConsentVersion: null,
  underEighteen: false,
  objectsToAnalytics: false,
};

/** Ana hosts a room with Luis and Marta, and the game is in the decision phase. */
async function gameInDecisionPhase(
  notifier: PlayerNotifier = new InMemoryPlayerNotifier(),
  catalog = testCatalog(),
) {
  // Its own notifier for the lobby: the one given only hears the answers.
  const game = await sharedGameInDecisionPhase(new InMemoryPlayerNotifier(), 'anonymous', catalog);
  return {
    ...game,
    notifier: notifier as InMemoryPlayerNotifier,
    answerDilemma: new AnswerDilemmaUseCase({
      roomRepository: game.roomRepository,
      gameRepository: game.gameRepository,
      notifier,
      sealProvider: new InMemorySealProvider(new Map([['TestLuisIdentity', LUIS_SEAL]])),
      dilemmaCatalog: catalog,
      clock: game.clock,
    }),
  };
}

describe('AnswerDilemmaUseCase', () => {
  describe('execute', () => {
    it.each([
      {
        case: 'a translation into it',
        catalog: testCatalogWithEnglishFor('TestDilemma1'),
        read: 'en',
      },
      { case: 'no translation into it', catalog: testCatalog(), read: 'es' },
    ])(
      'should keep the language the player read the dilemma in, with $case',
      async ({ catalog, read }) => {
        // Arrange
        const { gameRepository, answerDilemma, roomId, gameId, luisId } = await gameInDecisionPhase(
          new InMemoryPlayerNotifier(),
          catalog,
        );

        // Act
        await answerDilemma.execute({
          roomId,
          playerId: luisId,
          dilemmaId: 'TestDilemma1',
          vote: 'TestOption',
          ready: true,
          language: 'en',
        });

        // Assert
        const game = await gameRepository.findById(gameId);
        expect(game?.answersOf(luisId)[0]?.language).toBe(read);
      },
    );

    it('should save the answer', async () => {
      // Arrange
      const { gameRepository, answerDilemma, roomId, gameId, luisId } = await gameInDecisionPhase();

      // Act
      await answerDilemma.execute({
        language: 'es',
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
        ready: true,
      });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.progressOf(luisId)).toBe(1);
    });

    it('should tell everyone how many have answered, never who, in an anonymous room', async () => {
      // Arrange
      const { notifier, answerDilemma, roomId, gameId, anaId, luisId, martaId } =
        await gameInDecisionPhase();

      // Act
      await answerDilemma.execute({
        language: 'es',
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
        ready: true,
      });

      // Assert
      const expected = [new AnsweredCountChangedEvent(gameId, 1, 2)];
      for (const playerId of [anaId, luisId, martaId]) {
        expect(notifier.receivedBy(playerId)).toEqual(expected);
      }
    });

    it('should keep the answer and succeed when the notification fails', async () => {
      // Arrange
      const { answerDilemma, gameRepository, roomId, gameId, luisId } = await gameInDecisionPhase(
        new UnreachablePlayerNotifier(),
      );

      // Act
      const answering = answerDilemma.execute({
        language: 'es',
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
        ready: true,
      });

      // Assert
      await expect(answering).resolves.toBeUndefined();
      expect((await gameRepository.findById(gameId))?.progressOf(luisId)).toBe(1);
    });

    it('should seal the answer with the seal of the player who answers', async () => {
      // Arrange
      const { gameRepository, answerDilemma, roomId, gameId, luisId } = await gameInDecisionPhase();

      // Act
      await answerDilemma.execute({
        language: 'es',
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
        ready: true,
      });

      // Assert
      const luis = (await gameRepository.findById(gameId))
        ?.toSnapshot()
        .players.find(({ id }) => id === luisId);
      expect(luis?.answers[0]?.seal).toEqual(LUIS_SEAL);
    });

    it('should throw an error if the player is not in the room', async () => {
      // Arrange
      const { answerDilemma, roomId } = await gameInDecisionPhase();

      // Act & Assert
      await expect(
        answerDilemma.execute({
          language: 'es',
          roomId,
          playerId: 'TestStrangerId',
          dilemmaId: 'TestDilemma1',
          vote: 'TestOption',
          ready: true,
        }),
      ).rejects.toThrow(PlayerNotInRoomError);
    });

    it('should throw an error if the room does not exist', async () => {
      // Arrange
      const { answerDilemma, luisId } = await gameInDecisionPhase();

      // Act & Assert
      await expect(
        answerDilemma.execute({
          language: 'es',
          roomId: 'TestUnknownRoomId',
          playerId: luisId,
          dilemmaId: 'TestDilemma1',
          vote: 'TestOption',
          ready: true,
        }),
      ).rejects.toThrow(RoomNotFoundError);
    });

    it('should throw an error if the room has no game in progress', async () => {
      // Arrange
      const lobby = await lobbyOfThree();
      const answerDilemma = new AnswerDilemmaUseCase({
        dilemmaCatalog: lobby.catalog,
        roomRepository: lobby.roomRepository,
        gameRepository: lobby.gameRepository,
        notifier: lobby.notifier,
        sealProvider: new InMemorySealProvider(),
        clock: lobby.clock,
      });

      // Act & Assert
      await expect(
        answerDilemma.execute({
          language: 'es',
          roomId: lobby.roomId,
          playerId: lobby.luisId,
          dilemmaId: 'TestDilemma1',
          vote: 'TestOption',
          ready: true,
        }),
      ).rejects.toThrow(GameNotInProgressError);
    });
  });
});
