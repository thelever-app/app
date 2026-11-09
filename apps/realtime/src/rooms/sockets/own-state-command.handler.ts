import type { ClientMessageDto } from '@thelever-app/protocol';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RunCommand } from '../run-command.ts';
import { Rejection } from './rejection.ts';
import type { RoomCommand } from './room-command.handler.ts';
import type { RoomConnection } from './room-connection.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';
import type { StateSender } from './state-sender.ts';

/**
 * A command whose use case only tells the other players, such as reporting or skipping a
 * dilemma: who sent it gets their fresh state once it commits, still in the lock of the room, so
 * nothing newer reaches them first.
 */
export class OwnStateCommandHandler<
  T extends ClientMessageDto['type'],
> implements SocketMessageHandler<T> {
  readonly type: T;
  readonly #run: RoomCommand<T>;
  /** One holder per room at a time, so its commands never interleave in this instance. */
  readonly #roomLock: KeyedLock;
  readonly #stateSender: StateSender;
  readonly #runCommand: RunCommand;

  constructor(
    type: T,
    run: RoomCommand<T>,
    roomLock: KeyedLock,
    stateSender: StateSender,
    runCommand: RunCommand,
  ) {
    this.type = type;
    this.#run = run;
    this.#roomLock = roomLock;
    this.#stateSender = stateSender;
    this.#runCommand = runCommand;
  }

  async handle(
    message: Extract<ClientMessageDto, { type: T }>,
    connection: RoomConnection,
  ): Promise<void> {
    const { session } = connection;
    if (!session) throw new Rejection('not-connected');

    const release = await this.#roomLock.acquire(session.roomId);
    try {
      await this.#runCommand(() => this.#run(message, session));
      await this.#stateSender.send(connection, session);
    } finally {
      release();
    }
  }
}
