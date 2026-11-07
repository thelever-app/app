import type {
  AddDilemmaUseCase,
  ChangeAvatarUseCase,
  ChangeRoomSettingsUseCase,
  ExpelPlayerUseCase,
  PickDilemmasUseCase,
  RemoveAddedDilemmaUseCase,
  RoomSettingsSnapshot,
  StartGameUseCase,
} from '@thelever-app/game';
import type { ChangeSettingsDto } from '@thelever-app/protocol';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RunCommand } from '../run-command.ts';
import { RoomCommandHandler } from './room-command.handler.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';

/** The use cases behind the commands of the lobby. */
export interface LobbyUseCases {
  readonly changeAvatar: ChangeAvatarUseCase;
  readonly changeSettings: ChangeRoomSettingsUseCase;
  readonly pickDilemmas: PickDilemmasUseCase;
  readonly addDilemma: AddDilemmaUseCase;
  readonly removeAddedDilemma: RemoveAddedDilemmaUseCase;
  readonly expelPlayer: ExpelPlayerUseCase;
  readonly startGame: StartGameUseCase;
}

/** One handler per command of the lobby: each turns its message into the input of its use case. */
export function lobbyCommandHandlers(
  useCases: LobbyUseCases,
  roomLock: KeyedLock,
  runCommand: RunCommand,
): SocketMessageHandler[] {
  return [
    new RoomCommandHandler(
      'change-avatar',
      ({ face, color }, { roomId, playerId }) =>
        useCases.changeAvatar.execute({ roomId, playerId, face, color }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'change-settings',
      ({ changes }, { roomId, playerId }) =>
        useCases.changeSettings.execute({ roomId, playerId, changes: onlyGiven(changes) }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'pick-dilemmas',
      ({ dilemmaIds }, { roomId, playerId }) =>
        useCases.pickDilemmas.execute({ roomId, playerId, dilemmaIds }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'add-dilemma',
      ({ dilemmaId }, { roomId, playerId }) =>
        useCases.addDilemma.execute({ roomId, playerId, dilemmaId }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'remove-added-dilemma',
      ({ dilemmaId }, { roomId, playerId }) =>
        useCases.removeAddedDilemma.execute({ roomId, playerId, dilemmaId }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'expel-player',
      ({ playerId: expelledPlayerId }, { roomId, playerId }) =>
        useCases.expelPlayer.execute({ roomId, playerId, expelledPlayerId }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'start-game',
      async (_message, { roomId, playerId }) => {
        await useCases.startGame.execute({ roomId, playerId });
      },
      roomLock,
      runCommand,
    ),
  ];
}

/** The parts of the configuration a message changes: those it carries, none left undefined. */
function onlyGiven(changes: ChangeSettingsDto['changes']): Partial<RoomSettingsSnapshot> {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as Partial<RoomSettingsSnapshot>;
}
