import {
  DecisionPhaseNotStartedError,
  DilemmaNotFoundError,
  DilemmaNotInGameError,
  DilemmaNotReachedError,
  GameNotFoundError,
  IdentityNotInGameError,
  OptionNotInDilemmaError,
  PlayerNotInGameError,
  RoomNotFoundError,
} from '@thelever-app/game';
import type { ErrorCodeDto } from '@thelever-app/protocol';
import { InvalidTokenError } from '../identity/token-verifier.ts';

/** Each error a client can cause, with its stable code. Anything else is a fault of the server. */
const CODES: readonly (readonly [new (...args: never[]) => Error, ErrorCodeDto])[] = [
  [InvalidTokenError, 'invalid-token'],
  [RoomNotFoundError, 'room-not-found'],
  [GameNotFoundError, 'game-not-found'],
  [IdentityNotInGameError, 'player-not-in-game'],
  [PlayerNotInGameError, 'player-not-in-game'],
  [DecisionPhaseNotStartedError, 'decision-phase-not-started'],
  [DilemmaNotInGameError, 'dilemma-not-in-game'],
  [DilemmaNotReachedError, 'dilemma-not-reached'],
  [OptionNotInDilemmaError, 'option-not-in-dilemma'],
  [DilemmaNotFoundError, 'dilemma-not-found'],
];

/** The code to answer with, or undefined if the error is not one a client can cause. */
export function errorCodeOf(error: unknown): ErrorCodeDto | undefined {
  return CODES.find(([type]) => error instanceof type)?.[1];
}
