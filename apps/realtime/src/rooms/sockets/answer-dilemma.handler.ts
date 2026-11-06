import type { AnswerDilemmaUseCase } from '@thelever-app/game';
import type { AnswerDilemmaDto } from '@thelever-app/protocol';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RunCommand } from '../run-command.ts';
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
  readonly #runCommand: RunCommand;

  constructor(
    answerDilemma: AnswerDilemmaUseCase,
    gameLock: KeyedLock,
    stateSender: GameStateSender,
    runCommand: RunCommand,
  ) {
    this.#answerDilemma = answerDilemma;
    this.#gameLock = gameLock;
    this.#stateSender = stateSender;
    this.#runCommand = runCommand;
  }

  async handle({ dilemmaId, vote }: AnswerDilemmaDto, connection: RoomConnection): Promise<void> {
    const session = connection.session;
    if (!session) throw new Rejection('not-connected');

    const release = await this.#gameLock.acquire(session.gameId);
    try {
      await this.#runCommand(() =>
        this.#answerDilemma.execute({
          gameId: session.gameId,
          playerId: session.playerId,
          dilemmaId,
          vote,
        }),
      );
      // Once committed, and still in the lock. The use case only tells the others: the player learns
      // their own progress from this state, and the screen applies a later change only on top of a
      // state that has it, so nothing newer may reach them first.
      await this.#stateSender.send(connection, session);
    } finally {
      release();
    }
  }
}
