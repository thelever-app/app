import { describe, expect, it } from 'vitest';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { StartDecisionPhaseUseCase } from '../../use-cases/start-decision-phase.use-case.ts';
import { AnswerDilemmaUseCase } from '../../use-cases/answer-dilemma.use-case.ts';
import { GameNotFoundError } from '../../errors/game-not-found.error.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { InMemoryGameRepository } from '../../../adapters/in-memory/in-memory-game-repository.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { ProgressUpdatedEvent } from '../../../domain/events/progress-updated.event.ts';
import type { DomainEvent } from '../../../domain/events/domain-event.ts';
import type { PlayerNotifier } from '../../ports/player-notifier.port.ts';

/** Fails to deliver to one player, as a closed socket would, and delivers to the rest. */
class UnreachablePlayerNotifier extends InMemoryPlayerNotifier {
  readonly #unreachablePlayerId: string;

  constructor(unreachablePlayerId: string) {
    super();
    this.#unreachablePlayerId = unreachablePlayerId;
  }

  override async notify(playerId: string, event: DomainEvent): Promise<void> {
    if (playerId === this.#unreachablePlayerId) throw new Error('socket closed');
    await super.notify(playerId, event);
  }
}

/** Ana hosts a room with Luis and Marta, and the game is in the decision phase. */
async function gameInDecisionPhase(notifier: PlayerNotifier = new InMemoryPlayerNotifier()) {
  const roomRepository = new InMemoryRoomRepository();
  const gameRepository = new InMemoryGameRepository();
  const idGenerator = new SequentialIdGenerator();
  const joinRoom = new JoinRoomUseCase(roomRepository, idGenerator);

  const { roomId, hostId: anaId } = await new CreateRoomUseCase(
    roomRepository,
    idGenerator,
  ).execute({ hostNickname: 'Ana' });
  const { playerId: luisId } = await joinRoom.execute({ roomId, nickname: 'Luis' });
  const { playerId: martaId } = await joinRoom.execute({ roomId, nickname: 'Marta' });
  const { gameId } = await new StartDecisionPhaseUseCase(
    roomRepository,
    gameRepository,
    idGenerator,
  ).execute({ roomId, dilemmaIds: ['TestDilemma1', 'TestDilemma2', 'TestDilemma3'] });

  return {
    gameRepository,
    notifier: notifier as InMemoryPlayerNotifier,
    answerDilemma: new AnswerDilemmaUseCase(gameRepository, notifier),
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
      const expected = [new ProgressUpdatedEvent(gameId, luisId, 1)];
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

    it('should still notify the other players and succeed when one notification fails', async () => {
      // Arrange
      // Sequential ids: room id-1, Ana id-2, Luis id-3, Marta id-4.
      const { notifier, answerDilemma, gameId, luisId, martaId } = await gameInDecisionPhase(
        new UnreachablePlayerNotifier('id-2'),
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
      expect(notifier.receivedBy(martaId)).toEqual([new ProgressUpdatedEvent(gameId, luisId, 1)]);
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
