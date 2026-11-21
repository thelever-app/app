import type {
  LikeDilemmaUseCase,
  UnlikeDilemmaUseCase,
  MoveOnUseCase,
  GetReadyToMoveOnUseCase,
  ReactUseCase,
  RevealEarlyUseCase,
  StartRematchUseCase,
  RestartGameUseCase,
} from '@thelever-app/game';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RunCommand } from '../run-command.ts';
import { RoomCommandHandler } from './room-command.handler.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';

/** The use cases behind the commands of the rounds that every player learns of by an event. */
export interface RoundUseCases {
  readonly revealEarly: RevealEarlyUseCase;
  readonly moveOn: MoveOnUseCase;
  readonly getReadyToMoveOn: GetReadyToMoveOnUseCase;
  readonly react: ReactUseCase;
  readonly likeDilemma: LikeDilemmaUseCase;
  readonly unlikeDilemma: UnlikeDilemmaUseCase;
  readonly startRematch: StartRematchUseCase;
  readonly restartGame: RestartGameUseCase;
}

/**
 * Revealing early, moving on, being ready to move on, reacting, liking, the rematch and restarting:
 * every screen, the one who sent it too, changes through its event; a like, only that of who gave it.
 */
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
    new RoomCommandHandler(
      'ready-to-move-on',
      ({ fromPosition }, { roomId, playerId }) =>
        useCases.getReadyToMoveOn.execute({ roomId, playerId, fromPosition }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'react',
      ({ position, target, emoji }, { roomId, playerId }) =>
        useCases.react.execute({ roomId, playerId, position, target, emoji }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'like-dilemma',
      ({ position }, { roomId, playerId }) =>
        useCases.likeDilemma.execute({ roomId, playerId, position }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'unlike-dilemma',
      ({ position }, { roomId, playerId }) =>
        useCases.unlikeDilemma.execute({ roomId, playerId, position }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'start-rematch',
      (_message, { roomId, playerId }) => useCases.startRematch.execute({ roomId, playerId }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'restart-game',
      (_message, { roomId, playerId }) => useCases.restartGame.execute({ roomId, playerId }),
      roomLock,
      runCommand,
    ),
  ];
}
