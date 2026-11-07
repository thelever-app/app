import type { ClientMessageDto } from '@thelever-app/protocol';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RunCommand } from '../run-command.ts';
import { Rejection } from './rejection.ts';
import type { RoomConnection, Session } from './room-connection.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';

/** What a command of the lobby does with its message, for the player and room of the connection. */
export type RoomCommand<T extends ClientMessageDto['type']> = (
  message: Extract<ClientMessageDto, { type: T }>,
  session: Session,
) => Promise<void>;

/**
 * A command of the lobby: configuring, changing the avatar, adding, removing or picking dilemmas,
 * expelling and starting the game. Every player of the room, the one who sent it too, learns what
 * changed through the event of the room, so the handler answers nothing itself.
 */
export class RoomCommandHandler<
  T extends ClientMessageDto['type'],
> implements SocketMessageHandler<T> {
  readonly type: T;
  readonly #run: RoomCommand<T>;
  /** One holder per room at a time, so its commands never interleave in this instance. */
  readonly #roomLock: KeyedLock;
  readonly #runCommand: RunCommand;

  constructor(type: T, run: RoomCommand<T>, roomLock: KeyedLock, runCommand: RunCommand) {
    this.type = type;
    this.#run = run;
    this.#roomLock = roomLock;
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
    } finally {
      release();
    }
  }
}
