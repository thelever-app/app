import type { AnswerDilemmaUseCase } from '@thelever-app/game';
import type { AnswerDilemmaDto } from '@thelever-app/protocol';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { GameStateSender } from './game-state-sender.ts';
import { Rejection } from './rejection.ts';
import type { RoomConnection } from './room-connection.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';

/** `answer-dilemma`: the player answers a dilemma, or changes an answer they already gave. */
export class AnswerDilemmaHandler implements SocketMessageHandler<'answer-dilemma'> {
  readonly type = 'answer-dilemma';
  readonly #answerDilemma: AnswerDilemmaUseCase;
  /** One holder per game at a time, so its commands never interleave in this instance. */
  readonly #gameLock: KeyedLock;
  readonly #stateSender: GameStateSender;

  constructor(
    answerDilemma: AnswerDilemmaUseCase,
    gameLock: KeyedLock,
    stateSender: GameStateSender,
  ) {
    this.#answerDilemma = answerDilemma;
    this.#gameLock = gameLock;
    this.#stateSender = stateSender;
  }

  async handle({ dilemmaId, vote }: AnswerDilemmaDto, connection: RoomConnection): Promise<void> {
    const session = connection.session;
    if (!session) throw new Rejection('not-connected');

    const release = await this.#gameLock.acquire(session.gameId);
    try {
      await this.#answerDilemma.execute({
        gameId: session.gameId,
        playerId: session.playerId,
        dilemmaId,
        vote,
      });
      // The use case only tells the others: the player learns their own progress from a fresh state.
      await this.#stateSender.send(connection, session);
    } finally {
      release();
    }
  }
}
