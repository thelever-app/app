/**
 * @thelever-app/game
 *
 * The Game bounded context: rooms, games, the decision phase and their use cases (ADR 0001).
 * Pure: no I/O. Adapters implement its ports; in-memory ones live in `@thelever-app/game/in-memory`.
 * It knows nothing about research data.
 */

// Domain
export { Player, type PlayerSnapshot } from './domain/entities/player.ts';
export {
  Room,
  MAXIMUM_PLAYERS,
  type RoomSnapshot,
  type LobbyDilemma,
  type AddedDilemma,
} from './domain/entities/room.ts';
export {
  Game,
  type GameDilemma,
  type PlayedDilemma,
  type GameSettings,
  type GameSnapshot,
} from './domain/entities/game.ts';
export {
  AvatarVO,
  AVATAR_FACES,
  PLAYER_COLORS,
  type AvatarFace,
  type PlayerColor,
} from './domain/vos/avatar.vo.ts';
export { RoomCodeVO } from './domain/vos/room-code.vo.ts';
export {
  RoomSettingsVO,
  DILEMMA_LANGUAGES,
  DILEMMA_COUNTS,
  TOTAL_TIMES_IN_MINUTES,
  DEFAULT_CATEGORY,
  type RoomSettingsSnapshot,
  type RoomVariant,
  type DilemmaLanguage,
  type DilemmaCount,
  type TotalTimeInMinutes,
} from './domain/vos/room-settings.vo.ts';
export { GROUP_NATURES, PLACES, type GroupNature, type Place } from './domain/vos/group.vo.ts';
export {
  composeGame,
  type DilemmaOrigin,
  type ExplorationSlots,
} from './domain/services/compose-game.ts';
export type { Seal } from './domain/vos/answer.vo.ts';
export type { DomainEvent } from './domain/events/domain-event.ts';
export { ProgressUpdatedEvent } from './domain/events/progress-updated.event.ts';
export { ConnectionChangedEvent } from './domain/events/connection-changed.event.ts';
export { LobbyChangedEvent, type LobbyChange } from './domain/events/lobby-changed.event.ts';
export type { IdGenerator } from './domain/ports/id-generator.port.ts';
export type { Randomness } from './domain/ports/randomness.port.ts';
export { MissingArgumentError } from './domain/errors/missing-argument.error.ts';
export { IdMissingError } from './domain/errors/id-missing.error.ts';
export { NicknameMissingError } from './domain/errors/nickname-missing.error.ts';
export { HostMissingError } from './domain/errors/host-missing.error.ts';
export { DilemmasMissingError } from './domain/errors/dilemmas-missing.error.ts';
export { VoteMissingError } from './domain/errors/vote-missing.error.ts';
export { DecisionPhaseNotStartedError } from './domain/errors/decision-phase-not-started.error.ts';
export { PlayerNotInGameError } from './domain/errors/player-not-in-game.error.ts';
export { PlayerNotInRoomError } from './domain/errors/player-not-in-room.error.ts';
export { DilemmaNotInGameError } from './domain/errors/dilemma-not-in-game.error.ts';
export { DuplicateDilemmaError } from './domain/errors/duplicate-dilemma.error.ts';
export { PlayersMissingError } from './domain/errors/players-missing.error.ts';
export { DecisionPhaseAlreadyStartedError } from './domain/errors/decision-phase-already-started.error.ts';
export { OptionsMissingError } from './domain/errors/options-missing.error.ts';
export { InvalidDilemmaVersionError } from './domain/errors/invalid-dilemma-version.error.ts';
export { OptionNotInDilemmaError } from './domain/errors/option-not-in-dilemma.error.ts';
export { DilemmaNotReachedError } from './domain/errors/dilemma-not-reached.error.ts';
export { InvalidAvatarError } from './domain/errors/invalid-avatar.error.ts';
export { InvalidRoomCodeError } from './domain/errors/invalid-room-code.error.ts';
export { InvalidRoomSettingError } from './domain/errors/invalid-room-setting.error.ts';
export { NotHostError } from './domain/errors/not-host.error.ts';
export { GameInProgressError } from './domain/errors/game-in-progress.error.ts';
export { RoomFullError } from './domain/errors/room-full.error.ts';
export { PlayerExpelledError } from './domain/errors/player-expelled.error.ts';
export { AvatarTakenError } from './domain/errors/avatar-taken.error.ts';
export { NotEnoughPlayersError } from './domain/errors/not-enough-players.error.ts';
export { AddingDilemmasNotAllowedError } from './domain/errors/adding-dilemmas-not-allowed.error.ts';
export { DilemmaAlreadyAddedError } from './domain/errors/dilemma-already-added.error.ts';
export { DilemmaNotSuitableError } from './domain/errors/dilemma-not-suitable.error.ts';
export { HostCannotBeExpelledError } from './domain/errors/host-cannot-be-expelled.error.ts';

// Application
export type { RoomRepository } from './application/ports/room-repository.port.ts';
export type { GameRepository } from './application/ports/game-repository.port.ts';
export type { PlayerNotifier } from './application/ports/player-notifier.port.ts';
export type { SealProvider } from './application/ports/seal-provider.port.ts';
export type {
  DilemmaCatalog,
  DilemmaContent,
  CatalogDilemma,
  DilemmaSearch,
} from './application/ports/dilemma-catalog.port.ts';
export { RoomNotFoundError } from './application/errors/room-not-found.error.ts';
export { GameNotFoundError } from './application/errors/game-not-found.error.ts';
export { DilemmaNotFoundError } from './application/errors/dilemma-not-found.error.ts';
export { IdentityNotInRoomError } from './application/errors/identity-not-in-room.error.ts';
export { RoomCodeNotFoundError } from './application/errors/room-code-not-found.error.ts';
export { RoomCodeUnavailableError } from './application/errors/room-code-unavailable.error.ts';
export {
  CreateRoomUseCase,
  type CreateRoomInput,
  type CreateRoomOutput,
} from './application/use-cases/create-room.use-case.ts';
export {
  JoinRoomUseCase,
  type JoinRoomInput,
  type JoinRoomOutput,
} from './application/use-cases/join-room.use-case.ts';
export {
  GetRoomPreviewUseCase,
  type GetRoomPreviewInput,
  type GetRoomPreviewOutput,
} from './application/use-cases/get-room-preview.use-case.ts';
export {
  GetRoomStateUseCase,
  type GetRoomStateInput,
  type GetRoomStateOutput,
} from './application/use-cases/get-room-state.use-case.ts';
export {
  ChangeAvatarUseCase,
  type ChangeAvatarInput,
} from './application/use-cases/change-avatar.use-case.ts';
export {
  ChangeRoomSettingsUseCase,
  type ChangeRoomSettingsInput,
} from './application/use-cases/change-room-settings.use-case.ts';
export {
  PickDilemmasUseCase,
  type PickDilemmasInput,
} from './application/use-cases/pick-dilemmas.use-case.ts';
export {
  AddDilemmaUseCase,
  type AddDilemmaInput,
} from './application/use-cases/add-dilemma.use-case.ts';
export {
  RemoveAddedDilemmaUseCase,
  type RemoveAddedDilemmaInput,
} from './application/use-cases/remove-added-dilemma.use-case.ts';
export {
  ExpelPlayerUseCase,
  type ExpelPlayerInput,
} from './application/use-cases/expel-player.use-case.ts';
export {
  SearchDilemmasUseCase,
  type SearchDilemmasInput,
} from './application/use-cases/search-dilemmas.use-case.ts';
export {
  StartGameUseCase,
  type StartGameInput,
  type StartGameOutput,
} from './application/use-cases/start-game.use-case.ts';
export {
  AnswerDilemmaUseCase,
  type AnswerDilemmaInput,
} from './application/use-cases/answer-dilemma.use-case.ts';
export {
  ConnectPlayerUseCase,
  type ConnectPlayerInput,
  type ConnectPlayerOutput,
} from './application/use-cases/connect-player.use-case.ts';
export {
  DisconnectPlayerUseCase,
  type DisconnectPlayerInput,
} from './application/use-cases/disconnect-player.use-case.ts';
export {
  DisconnectConnectionsUseCase,
  type DisconnectConnectionsInput,
} from './application/use-cases/disconnect-connections.use-case.ts';
export {
  GetGameStateUseCase,
  type GetGameStateInput,
  type GetGameStateOutput,
} from './application/use-cases/get-game-state.use-case.ts';
