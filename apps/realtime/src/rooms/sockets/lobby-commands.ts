import type {
  ChangeAvatarUseCase,
  ChangeRoomSettingsUseCase,
  ChooseAmbienceUseCase,
  ChooseRoundDilemmaUseCase,
  ClearRoundDilemmaUseCase,
  ExpelPlayerUseCase,
  RoomSettingsChanges,
  RoundChange,
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
  readonly chooseAmbience: ChooseAmbienceUseCase;
  readonly chooseRoundDilemma: ChooseRoundDilemmaUseCase;
  readonly clearRoundDilemma: ClearRoundDilemmaUseCase;
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
      'choose-ambience',
      ({ ambience }, { roomId, playerId }) =>
        useCases.chooseAmbience.execute({ roomId, playerId, ambience }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'choose-round-dilemma',
      ({ roundId, dilemmaId }, { roomId, playerId }) =>
        useCases.chooseRoundDilemma.execute({ roomId, playerId, roundId, dilemmaId }),
      roomLock,
      runCommand,
    ),
    new RoomCommandHandler(
      'clear-round-dilemma',
      ({ roundId }, { roomId, playerId }) =>
        useCases.clearRoundDilemma.execute({ roomId, playerId, roundId }),
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

/**
 * The parts of the configuration a message changes: those it carries, none left undefined, and a
 * new round without an id.
 */
function onlyGiven(changes: ChangeSettingsDto['changes']): RoomSettingsChanges {
  const { rounds, ...rest } = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as Omit<RoomSettingsChanges, 'rounds'> & Pick<ChangeSettingsDto['changes'], 'rounds'>;
  return {
    ...rest,
    ...(rounds && {
      rounds: rounds.map(({ id, ...round }): RoundChange =>
        id === undefined ? round : { id, ...round },
      ),
    }),
  };
}
