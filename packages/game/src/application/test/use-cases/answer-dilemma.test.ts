import { describe, expect, it } from 'vitest';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { StartDecisionPhaseUseCase } from '../../use-cases/start-decision-phase.use-case.ts';
import { AnswerDilemmaUseCase } from '../../use-cases/answer-dilemma.use-case.ts';
import { GameNotFoundError } from '../../errors/game-not-found.error.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { PlayerNotInGameError } from '../../../domain/errors/player-not-in-game.error.ts';
import { Game } from '../../../domain/entities/game.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { InMemoryGameRepository } from '../../../adapters/in-memory/in-memory-game-repository.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { InMemorySealProvider } from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import { ProgressUpdatedEvent } from '../../../domain/events/progress-updated.event.ts';
import type { PlayerNotifier } from '../../ports/player-notifier.port.ts';
import { TEST_DILEMMA_IDS, testCatalog } from '../support/test-catalog.ts';

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
  const roomRepository = new InMemoryRoomRepository();
  const gameRepository = new InMemoryGameRepository();
  const idGenerator = new SequentialIdGenerator();
  const joinRoom = new JoinRoomUseCase(roomRepository, idGenerator);

  const { roomId, hostId: anaId } = await new CreateRoomUseCase(
    roomRepository,
    idGenerator,
  ).execute({ hostNickname: 'Ana', hostIdentity: 'TestAnaIdentity' });
  const { playerId: luisId } = await joinRoom.execute({
    roomId,
    nickname: 'Luis',
    identity: 'TestLuisIdentity',
  });
  const { playerId: martaId } = await joinRoom.execute({
    roomId,
    nickname: 'Marta',
    identity: 'TestMartaIdentity',
  });
  const { gameId } = await new StartDecisionPhaseUseCase(
    roomRepository,
    gameRepository,
    testCatalog(),
    idGenerator,
  ).execute({ roomId, dilemmaIds: TEST_DILEMMA_IDS });

  return {
    roomRepository,
    gameRepository,
    notifier: notifier as InMemoryPlayerNotifier,
    answerDilemma: new AnswerDilemmaUseCase(
      roomRepository,
      gameRepository,
      notifier,
      new InMemorySealProvider(new Map([['TestLuisIdentity', LUIS_SEAL]])),
    ),
    roomId,
    gameId,
    anaId,
    luisId,
    martaId,
  };
}

describe('AnswerDilemmaUseCase', () => {
  describe('execute', () => {
    it('should save the answer', async () => {
      // Arrange
      const { gameRepository, answerDilemma, gameId, luisId } = await gameInDecisionPhase();

      // Act
      await answerDilemma.execute({
        gameId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
      });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.progressOf(luisId)).toBe(1);
    });

    it('should notify the other players of the new progress', async () => {
      // Arrange
      const { notifier, answerDilemma, gameId, anaId, luisId, martaId } =
        await gameInDecisionPhase();

      // Act
      await answerDilemma.execute({
        gameId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
      });

      // Assert
      const expected = [new ProgressUpdatedEvent(gameId, luisId, 1, 2)];
      expect(notifier.receivedBy(anaId)).toEqual(expected);
      expect(notifier.receivedBy(martaId)).toEqual(expected);
    });

    it('should not notify the player who answered', async () => {
      // Arrange
      const { notifier, answerDilemma, gameId, luisId } = await gameInDecisionPhase();

      // Act
      await answerDilemma.execute({
        gameId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
      });

      // Assert
      expect(notifier.receivedBy(luisId)).toEqual([]);
    });

    it('should keep the answer and succeed when the notification fails', async () => {
      // Arrange
      const { answerDilemma, gameRepository, gameId, luisId } = await gameInDecisionPhase(
        new UnreachablePlayerNotifier(),
      );

      // Act
      const answering = answerDilemma.execute({
        gameId,
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
      const { gameRepository, answerDilemma, gameId, luisId } = await gameInDecisionPhase();

      // Act
      await answerDilemma.execute({
        gameId,
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

    it('should throw an error if the player is not in the room of the game', async () => {
      // Arrange
      const { answerDilemma, gameId } = await gameInDecisionPhase();

      // Act & Assert
      await expect(
        answerDilemma.execute({
          gameId,
          playerId: 'TestStrangerId',
          dilemmaId: 'TestDilemma1',
          vote: 'TestOption',
        }),
      ).rejects.toThrow(PlayerNotInGameError);
    });

    it('should throw an error if the room of the game does not exist', async () => {
      // Arrange
      const { answerDilemma, gameRepository, luisId } = await gameInDecisionPhase();
      const orphan = Game.create(
        {
          roomId: 'TestUnknownRoomId',
          dilemmas: [{ dilemmaId: 'TestDilemma1', version: 1, optionIds: ['TestOption'] }],
        },
        new FixedIdGenerator('TestOrphanGameId'),
      );
      await gameRepository.save(orphan);

      // Act & Assert
      await expect(
        answerDilemma.execute({
          gameId: orphan.id,
          playerId: luisId,
          dilemmaId: 'TestDilemma1',
          vote: 'TestOption',
        }),
      ).rejects.toThrow(RoomNotFoundError);
    });

    it('should throw an error if the game does not exist', async () => {
      // Arrange
      const { answerDilemma, luisId } = await gameInDecisionPhase();

      // Act & Assert
      await expect(
        answerDilemma.execute({
          gameId: 'TestUnknownId',
          playerId: luisId,
          dilemmaId: 'TestDilemma1',
          vote: 'TestOption',
        }),
      ).rejects.toThrow(GameNotFoundError);
    });
  });
});
