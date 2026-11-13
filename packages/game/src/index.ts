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
  CLOSES_WITH_NOBODY_CONNECTED_AFTER_MS,
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
  type RoundPhase,
  type Round,
  type RevealedBy,
  type DilemmaReveal,
  MINIMUM_VOTES_TO_SHOW,
  type DidNotVoteReason,
  type AnswerDraft,
} from './domain/entities/game.ts';
export {
  AvatarVO,
  AVATAR_FACES,
  PLAYER_COLORS,
  type AvatarFace,
  type PlayerColor,
} from './domain/vos/avatar.vo.ts';
export { NicknameVO } from './domain/vos/nickname.vo.ts';
export { RoomCodeVO } from './domain/vos/room-code.vo.ts';
export {
  RoomSettingsVO,
  DILEMMA_LANGUAGES,
  DILEMMA_COUNTS,
  TIMES_PER_DILEMMA_IN_SECONDS,
  DILEMMAS_PER_PLAYER,
  type RoomSettingsSnapshot,
  type RoomVariant,
  type DilemmaLanguage,
  type DilemmaCount,
  type TimePerDilemmaSeconds,
  type DilemmasPerPlayer,
} from './domain/vos/room-settings.vo.ts';
export { GROUP_NATURES, PLACES, type GroupNature, type Place } from './domain/vos/group.vo.ts';
export {
  composeGame,
  type DilemmaOrigin,
  type ExplorationSlots,
} from './domain/services/compose-game.ts';
export type { Seal, VotePrediction, AnswerProps } from './domain/vos/answer.vo.ts';
export { MAXIMUM_POINTS } from './domain/services/score-predictions.ts';
export type { DomainEvent } from './domain/events/domain-event.ts';
export { ProgressUpdatedEvent } from './domain/events/progress-updated.event.ts';
export { ConnectionChangedEvent } from './domain/events/connection-changed.event.ts';
export { LobbyChangedEvent, type LobbyChange } from './domain/events/lobby-changed.event.ts';
export { DilemmaRevealedEvent } from './domain/events/dilemma-revealed.event.ts';
export { RoundStartedEvent } from './domain/events/round-started.event.ts';
export { AnsweredCountChangedEvent } from './domain/events/answered-count-changed.event.ts';
export { HostChangedEvent } from './domain/events/host-changed.event.ts';
export { PlayerLeftEvent } from './domain/events/player-left.event.ts';
export { PlayerJoinedLateEvent } from './domain/events/player-joined-late.event.ts';
export type { IdGenerator } from './domain/ports/id-generator.port.ts';
export type { Randomness } from './domain/ports/randomness.port.ts';
export type { Clock } from './domain/ports/clock.port.ts';
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
export { DilemmaNotInRoundError } from './domain/errors/dilemma-not-in-round.error.ts';
export { DilemmaNotRevealedError } from './domain/errors/dilemma-not-revealed.error.ts';
export { NoNextRoundError } from './domain/errors/no-next-round.error.ts';
export { PlayerLeftGameError } from './domain/errors/player-left-game.error.ts';
export { InvalidAvatarError } from './domain/errors/invalid-avatar.error.ts';
export { InvalidRoomCodeError } from './domain/errors/invalid-room-code.error.ts';
export { InvalidRoomSettingError } from './domain/errors/invalid-room-setting.error.ts';
export { NotHostError } from './domain/errors/not-host.error.ts';
export { GameInProgressError } from './domain/errors/game-in-progress.error.ts';
export { RoomFullError } from './domain/errors/room-full.error.ts';
export { PlayerExpelledError } from './domain/errors/player-expelled.error.ts';
export { NicknameAndAvatarTakenError } from './domain/errors/nickname-and-avatar-taken.error.ts';
export { NotEnoughPlayersError } from './domain/errors/not-enough-players.error.ts';
export { AddingDilemmasNotAllowedError } from './domain/errors/adding-dilemmas-not-allowed.error.ts';
export { TooManyAddedDilemmasError } from './domain/errors/too-many-added-dilemmas.error.ts';
export { DilemmaNotSuitableError } from './domain/errors/dilemma-not-suitable.error.ts';
export { HostCannotBeExpelledError } from './domain/errors/host-cannot-be-expelled.error.ts';
export { DecisionPhaseOverError } from './domain/errors/decision-phase-over.error.ts';
export { PredictionsNotAllowedError } from './domain/errors/predictions-not-allowed.error.ts';
export { PlayerNotPredictableError } from './domain/errors/player-not-predictable.error.ts';
export { DuplicateVotePredictionError } from './domain/errors/duplicate-vote-prediction.error.ts';
export { AnswerIncompleteError } from './domain/errors/answer-incomplete.error.ts';
export { DilemmaSkippedError } from './domain/errors/dilemma-skipped.error.ts';
export { DilemmaAlreadyReportedError } from './domain/errors/dilemma-already-reported.error.ts';
export { DilemmaNotReportedAsOffensiveError } from './domain/errors/dilemma-not-reported-as-offensive.error.ts';
export { GameNotInProgressError } from './domain/errors/game-not-in-progress.error.ts';

// Application
export type { RoomRepository } from './application/ports/room-repository.port.ts';
export type { GameRepository } from './application/ports/game-repository.port.ts';
export type { PlayerNotifier } from './application/ports/player-notifier.port.ts';
export type { SealProvider } from './application/ports/seal-provider.port.ts';
export {
  GAP_MARKER,
  type DilemmaCatalog,
  type DilemmaContent,
  type CatalogDilemma,
  type DilemmaSearch,
} from './application/ports/dilemma-catalog.port.ts';
export {
  REPORT_REASONS,
  type ReportReason,
  type DilemmaReport,
  type DilemmaReports,
} from './application/ports/dilemma-reports.port.ts';
export { InvalidReportReasonError } from './application/errors/invalid-report-reason.error.ts';
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
  DeleteClosedRoomsUseCase,
  type DeleteClosedRoomsOutput,
} from './application/use-cases/delete-closed-rooms.use-case.ts';
export {
  GetGameStateUseCase,
  type GetGameStateInput,
  type GetGameStateOutput,
} from './application/use-cases/get-game-state.use-case.ts';
export {
  RevealEarlyUseCase,
  type RevealEarlyInput,
} from './application/use-cases/reveal-early.use-case.ts';
export { MoveOnUseCase, type MoveOnInput } from './application/use-cases/move-on.use-case.ts';
export {
  RunOutRoundUseCase,
  type RunOutRoundInput,
} from './application/use-cases/run-out-round.use-case.ts';
export {
  LeaveRoomUseCase,
  type LeaveRoomInput,
} from './application/use-cases/leave-room.use-case.ts';
export {
  ReportDilemmaUseCase,
  type ReportDilemmaInput,
} from './application/use-cases/report-dilemma.use-case.ts';
export {
  SkipDilemmaUseCase,
  type SkipDilemmaInput,
} from './application/use-cases/skip-dilemma.use-case.ts';
