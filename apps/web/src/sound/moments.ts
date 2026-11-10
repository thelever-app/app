import type { GameStateDto, RoomStateDto } from '@thelever-app/protocol';
import { selfAnswered, selfSkipped } from '../components/players.ts';

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
  if (!done(before) && done(after) && !selfSkipped(after)) moments.push('answer-confirmed');
  if (
    !done(after) &&
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

/** The player is done with the dilemma of the round: they answered it, or skipped it. */
function done(game: GameStateDto): boolean {
  return selfAnswered(game) || selfSkipped(game);
}

/**
 * What to remember of the room for the next comparison: `now`, but with the lowest second left
 * already seen in the same round, so a new measure of the clock of the server that puts it back a
 * second does not tick the same second twice.
 */
export function remembered(before: RoomSnapshot, now: RoomSnapshot): RoomSnapshot {
  const sameRound =
    before.game !== undefined &&
    now.game !== undefined &&
    before.game.round.position === now.game.round.position;
  if (!sameRound || before.secondsLeft === undefined || now.secondsLeft === undefined) return now;
  return { ...now, secondsLeft: Math.min(before.secondsLeft, now.secondsLeft) };
}
