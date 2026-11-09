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
};

/** Ana hosts a room with Luis and Marta, and the game is in the decision phase. */
async function gameInDecisionPhase(notifier: PlayerNotifier = new InMemoryPlayerNotifier()) {
  const game = await sharedGameInDecisionPhase();
  return {
    ...game,
    notifier: notifier as InMemoryPlayerNotifier,
    answerDilemma: new AnswerDilemmaUseCase({
      roomRepository: game.roomRepository,
      gameRepository: game.gameRepository,
      notifier,
      sealProvider: new InMemorySealProvider(new Map([['TestLuisIdentity', LUIS_SEAL]])),
      clock: game.clock,
    }),
  };
}

describe('AnswerDilemmaUseCase', () => {
  describe('execute', () => {
    it('should save the answer', async () => {
      // Arrange
      const { gameRepository, answerDilemma, roomId, gameId, luisId } = await gameInDecisionPhase();

      // Act
      await answerDilemma.execute({
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
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
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
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
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
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
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
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
          roomId,
          playerId: 'TestStrangerId',
          dilemmaId: 'TestDilemma1',
          vote: 'TestOption',
        }),
      ).rejects.toThrow(PlayerNotInRoomError);
    });

    it('should throw an error if the room does not exist', async () => {
      // Arrange
      const { answerDilemma, luisId } = await gameInDecisionPhase();

      // Act & Assert
      await expect(
        answerDilemma.execute({
          roomId: 'TestUnknownRoomId',
          playerId: luisId,
          dilemmaId: 'TestDilemma1',
          vote: 'TestOption',
        }),
      ).rejects.toThrow(RoomNotFoundError);
    });

    it('should throw an error if the room has no game in progress', async () => {
      // Arrange
      const lobby = await lobbyOfThree();
      const answerDilemma = new AnswerDilemmaUseCase({
        roomRepository: lobby.roomRepository,
        gameRepository: lobby.gameRepository,
        notifier: lobby.notifier,
        sealProvider: new InMemorySealProvider(),
        clock: lobby.clock,
      });

      // Act & Assert
      await expect(
        answerDilemma.execute({
          roomId: lobby.roomId,
          playerId: lobby.luisId,
          dilemmaId: 'TestDilemma1',
          vote: 'TestOption',
        }),
      ).rejects.toThrow(GameNotInProgressError);
    });
  });
});
