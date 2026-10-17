/**
 * @thelever-app/game
 *
 * The Game bounded context: rooms, games, the decision phase and their use cases (ADR 0001).
 * Pure: no I/O. Adapters implement its ports; in-memory ones live in `@thelever-app/game/in-memory`.
 * It knows nothing about research data.
 */

// Domain
export { Player, type PlayerSnapshot } from './domain/entities/player.ts';
export { Room, type RoomSnapshot } from './domain/entities/room.ts';
export { Game, type GameSnapshot } from './domain/entities/game.ts';
export type { DomainEvent } from './domain/events/domain-event.ts';
export { ProgressUpdatedEvent } from './domain/events/progress-updated.event.ts';
export type { IdGenerator } from './domain/ports/id-generator.port.ts';
export { MissingArgumentError } from './domain/errors/missing-argument.error.ts';
export { IdMissingError } from './domain/errors/id-missing.error.ts';
export { NicknameMissingError } from './domain/errors/nickname-missing.error.ts';
export { HostMissingError } from './domain/errors/host-missing.error.ts';
export { DilemmasMissingError } from './domain/errors/dilemmas-missing.error.ts';
export { VoteMissingError } from './domain/errors/vote-missing.error.ts';
export { DecisionPhaseNotStartedError } from './domain/errors/decision-phase-not-started.error.ts';
export { PlayerNotInGameError } from './domain/errors/player-not-in-game.error.ts';
export { DilemmaNotInGameError } from './domain/errors/dilemma-not-in-game.error.ts';
export { DuplicateDilemmaError } from './domain/errors/duplicate-dilemma.error.ts';
export { PlayersMissingError } from './domain/errors/players-missing.error.ts';
export { DecisionPhaseAlreadyStartedError } from './domain/errors/decision-phase-already-started.error.ts';

// Application
export type { RoomRepository } from './application/ports/room-repository.port.ts';
export type { GameRepository } from './application/ports/game-repository.port.ts';
export type { PlayerNotifier } from './application/ports/player-notifier.port.ts';
export { RoomNotFoundError } from './application/errors/room-not-found.error.ts';
export { GameNotFoundError } from './application/errors/game-not-found.error.ts';
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
  StartDecisionPhaseUseCase,
  type StartDecisionPhaseInput,
  type StartDecisionPhaseOutput,
} from './application/use-cases/start-decision-phase.use-case.ts';
export {
  AnswerDilemmaUseCase,
  type AnswerDilemmaInput,
} from './application/use-cases/answer-dilemma.use-case.ts';
