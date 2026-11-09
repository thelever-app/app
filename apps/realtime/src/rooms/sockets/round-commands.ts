import type { MoveOnUseCase, RevealEarlyUseCase } from '@thelever-app/game';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RunCommand } from '../run-command.ts';
import { RoomCommandHandler } from './room-command.handler.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';

/** The use cases behind the commands of the rounds that every player learns of by an event. */
export interface RoundUseCases {
  readonly revealEarly: RevealEarlyUseCase;
  readonly moveOn: MoveOnUseCase;
}

/** Revealing early and moving on: every screen, the one who sent it too, changes through its event. */
export function roundCommandHandlers(
  useCases: RoundUseCases,
  roomLock: KeyedLock,
  runCommand: RunCommand,
): SocketMessageHandler[] {
  return [
    new RoomCommandHandler(
      'reveal-early',
      (_message, { roomId, playerId }) => useCases.revealEarly.execute({ roomId, playerId }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'move-on',
      ({ fromPosition }, { roomId, playerId }) =>
        useCases.moveOn.execute({ roomId, playerId, fromPosition }),
      roomLock,
      runCommand,
    ),
  ];
}
