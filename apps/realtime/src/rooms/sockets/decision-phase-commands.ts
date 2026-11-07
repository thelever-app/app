import type { StartRevealUseCase } from '@thelever-app/game';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RunCommand } from '../run-command.ts';
import { RoomCommandHandler } from './room-command.handler.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';

/** The use cases behind the commands of the decision phase that every player learns of by an event. */
export interface DecisionPhaseUseCases {
  readonly startReveal: StartRevealUseCase;
}

/** Starting the reveal: every screen, the one of the host too, changes through its event. */
export function decisionPhaseCommandHandlers(
  useCases: DecisionPhaseUseCases,
  roomLock: KeyedLock,
  runCommand: RunCommand,
): SocketMessageHandler[] {
  return [
    new RoomCommandHandler(
      'start-reveal',
      (_message, { roomId, playerId }) => useCases.startReveal.execute({ roomId, playerId }),
      roomLock,
      runCommand,
    ),
  ];
}
