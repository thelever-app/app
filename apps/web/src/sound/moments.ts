import type { GameStateDto, RoomStateDto } from '@thelever-app/protocol';
import { selfAnswered } from '../components/players.ts';

/** The moments of the game that sound, and some of them vibrate, on the device of each player. */
export type Moment =
  'player-joined' | 'game-started' | 'answer-confirmed' | 'last-seconds' | 'dilemma-revealed';

/** What the room looks like on screen at one render: the lobby or the game, and the time left. */
export interface RoomSnapshot {
  readonly lobby: RoomStateDto | undefined;
  readonly game: GameStateDto | undefined;
  /** The whole seconds left for the dilemma of the round; undefined without a game. */
  readonly secondsLeft: number | undefined;
}

/** In the last seconds of the time per dilemma, whoever has not answered hears a tick every second. */
export const LAST_SECONDS = 10;

/**
 * The moments that happened between two snapshots of the room, in the order they happened. Nothing
 * happens between a snapshot and itself, so the screen can ask on every render.
 */
export function momentsBetween(before: RoomSnapshot, after: RoomSnapshot): Moment[] {
  if (before.lobby && after.lobby) return lobbyMoments(before.lobby, after.lobby);
  if (before.lobby && after.game) return ['game-started'];
  if (before.game && after.game) {
    return gameMoments(before.game, before.secondsLeft, after.game, after.secondsLeft);
  }
  return [];
}

function lobbyMoments(before: RoomStateDto, after: RoomStateDto): Moment[] {
  const known = new Set(before.players.map(({ playerId }) => playerId));
  const joined = after.players.some(
    ({ playerId }) => playerId !== after.playerId && !known.has(playerId),
  );
  return joined ? ['player-joined'] : [];
}

function gameMoments(
  before: GameStateDto,
  secondsBefore: number | undefined,
  after: GameStateDto,
  secondsLeft: number | undefined,
): Moment[] {
  const sameRound = before.round.position === after.round.position;
  if (!sameRound) return [];
  if (before.round.phase === 'decision' && after.round.phase === 'reveal') {
    return ['dilemma-revealed'];
  }
  if (after.round.phase !== 'decision') return [];

  const moments: Moment[] = [];
  if (answerConfirmed(before, after)) moments.push('answer-confirmed');
  if (
    !selfAnswered(after) &&
    secondsBefore !== undefined &&
    secondsLeft !== undefined &&
    secondsLeft < secondsBefore &&
    secondsLeft <= LAST_SECONDS &&
    secondsLeft > 0
  ) {
    moments.push('last-seconds');
  }
  return moments;
}

/** The room confirmed an answer of the player: the first one, or one that changed it. */
function answerConfirmed(before: GameStateDto, after: GameStateDto): boolean {
  if (!selfAnswered(after)) return false;
  if (!selfAnswered(before)) return true;
  return JSON.stringify(ownAnswer(before)) !== JSON.stringify(ownAnswer(after));
}

function ownAnswer(game: GameStateDto): GameStateDto['answers'][number] | undefined {
  const dilemma = game.dilemmas[game.round.position];
  return game.answers.find(({ dilemmaId }) => dilemmaId === dilemma?.dilemmaId);
}
