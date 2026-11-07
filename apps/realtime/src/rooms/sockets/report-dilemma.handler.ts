import type { ReportDilemmaUseCase } from '@thelever-app/game';
import type { ReportDilemmaDto } from '@thelever-app/protocol';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RunCommand } from '../run-command.ts';
import type { StateSender } from './state-sender.ts';
import { Rejection } from './rejection.ts';
import type { RoomConnection } from './room-connection.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';

/** `report-dilemma`: the player reports a dilemma and, if offensive, skips it. */
export class ReportDilemmaHandler implements SocketMessageHandler<'report-dilemma'> {
  readonly type = 'report-dilemma';
  readonly #reportDilemma: ReportDilemmaUseCase;
  /** One holder per room at a time, so its commands never interleave in this instance. */
  readonly #roomLock: KeyedLock;
  readonly #stateSender: StateSender;
  readonly #runCommand: RunCommand;

  constructor(
    reportDilemma: ReportDilemmaUseCase,
    roomLock: KeyedLock,
    stateSender: StateSender,
    runCommand: RunCommand,
  ) {
    this.#reportDilemma = reportDilemma;
    this.#roomLock = roomLock;
    this.#stateSender = stateSender;
    this.#runCommand = runCommand;
  }

  async handle(
    { dilemmaId, reason, comment }: ReportDilemmaDto,
    connection: RoomConnection,
  ): Promise<void> {
    const session = connection.session;
    if (!session) throw new Rejection('not-connected');

    const release = await this.#roomLock.acquire(session.roomId);
    try {
      await this.#runCommand(() =>
        this.#reportDilemma.execute({
          roomId: session.roomId,
          playerId: session.playerId,
          dilemmaId,
          reason,
          ...(comment !== undefined && { comment }),
        }),
      );
      // As with an answer: the others learn the new progress, and who reported it from this state.
      await this.#stateSender.send(connection, session);
    } finally {
      release();
    }
  }
}
