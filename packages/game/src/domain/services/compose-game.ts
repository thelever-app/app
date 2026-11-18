import type { ChosenDilemma } from '../entities/room.ts';
import type { Randomness } from '../ports/randomness.port.ts';
import type { Category } from '../vos/category.vo.ts';
import type { CandidateDilemma } from '../vos/classification.vo.ts';
import type { DilemmaOrigin, LobbyDilemma, RoundSnapshot } from '../vos/round.vo.ts';
import { shuffle } from './random-choice.ts';

export type { DilemmaOrigin } from '../vos/round.vo.ts';

export interface ComposedDilemma {
  readonly dilemmaId: string;
  /** A round of the players nobody chose a dilemma for, or whose dilemma was left out, is random. */
  readonly origin: DilemmaOrigin;
  /** The player who chose it, in a round of the players; null in the others. */
  readonly chosenBy: string | null;
}

/**
 * The exploration slots: how many dilemmas in exploration a game keeps room for, by its number of
 * random rounds. Each row applies from its `fromRandomRounds` on. The values are settings, not rules
 * of the game.
 */
export type ExplorationSlots = readonly {
  readonly fromRandomRounds: number;
  readonly slots: number;
}[];

/** The dilemmas that suit the room for a set of categories, in the general catalog and in exploration. */
export interface Candidates {
  readonly inCatalog: readonly CandidateDilemma[];
  readonly inExploration: readonly CandidateDilemma[];
}

export interface ComposeGameInput {
  readonly rounds: readonly RoundSnapshot[];
  readonly chosenDilemmas: readonly ChosenDilemma[];
  readonly newDilemmas: boolean;
  /** The candidates of each set of categories the random rounds draw from, by `categoriesKey`. */
  readonly candidates: ReadonlyMap<string, Candidates>;
  readonly explorationSlots: ExplorationSlots;
  /** Whether the room has the players a dilemma with the gap needs. */
  readonly playsTheGap: boolean;
  /** An adults-only room plays a dilemma for adults in every five rounds. */
  readonly adultsOnly: boolean;
  /** How many players of the room have each dilemma among those they played, by its id. */
  readonly playedBy: ReadonlyMap<string, number>;
}

/** The rounds within which at most one extreme dilemma is played, and an adults-only room plays one for adults. */
export const SPACING_ROUNDS = 5;

/** The same key for the same categories in any order; every category, for null. */
export function categoriesKey(categories: readonly Category[] | null): string {
  return categories === null ? '*' : [...new Set(categories)].sort().join(',');
}

/** A set of categories the system draws dilemmas from, and how many rounds draw from it. */
export interface CategoriesDraw {
  /** Null for every category. */
  readonly categories: readonly Category[] | null;
  readonly rounds: number;
}

/**
 * The categories each round the system draws a dilemma for takes it from, each set once with how
 * many rounds draw from it: a random round's own, and every category for a round of the players
 * nobody chose a dilemma for and for a round whose dilemma has the gap in a room without the
 * players it needs.
 */
export function categoriesToDraw(
  rounds: readonly RoundSnapshot[],
  chosenDilemmas: readonly ChosenDilemma[],
  playsTheGap: boolean,
): CategoriesDraw[] {
  const drawn = new Map<string, CategoriesDraw>();
  for (const round of rounds) {
    const categories = drawFrom(fixedDilemmaOf(round, chosenDilemmas, playsTheGap), round);
    if (categories === undefined) continue;
    const key = categoriesKey(categories);
    drawn.set(key, { categories, rounds: (drawn.get(key)?.rounds ?? 0) + 1 });
  }
  return [...drawn.values()];
}

/** The dilemmas the rounds play without drawing them, in the order of the rounds. */
export function fixedDilemmaIds(
  rounds: readonly RoundSnapshot[],
  chosenDilemmas: readonly ChosenDilemma[],
  playsTheGap: boolean,
): string[] {
  return rounds.flatMap((round) => {
    const fixed = fixedDilemmaOf(round, chosenDilemmas, playsTheGap);
    return fixed ? [fixed.dilemmaId] : [];
  });
}

/**
 * Puts the dilemmas of a game together, one per round and in their order. A specific round plays
 * its dilemma, and a round of the players the one a player chose, unless it has the gap and the
 * room has not the players it needs: then the round is random from every category. For the others
 * the system draws from their categories: if the room includes new dilemmas, the exploration slots
 * go to random rounds at random, then the rest come from the catalog and, when it runs short, from
 * exploration, the rounds with fewest candidates first. Each round takes, of what it can draw, the
 * dilemma that breaks fewest spacing rules with the rounds around it, then the one fewest players
 * of the room have played, then any at random. A dilemma is never in two rounds, a dilemma with the
 * gap is not drawn for a room without the players it needs, and a round nothing is left for is not
 * played.
 */
export function composeGame(input: ComposeGameInput, randomness: Randomness): ComposedDilemma[] {
  const { rounds, chosenDilemmas, playsTheGap } = input;
  const fixed = rounds.map((round) => fixedDilemmaOf(round, chosenDilemmas, playsTheGap));
  const composed: (ComposedDilemma | null)[] = fixed.map((dilemma) =>
    dilemma
      ? { dilemmaId: dilemma.dilemmaId, origin: dilemma.origin, chosenBy: dilemma.chosenBy }
      : null,
  );
  const placed: (CandidateDilemma | null)[] = fixed.map((dilemma) => dilemma?.dilemma ?? null);
  const used = new Set(composed.flatMap((dilemma) => (dilemma ? [dilemma.dilemmaId] : [])));

  // Each pool is shuffled once, the first time a round needs it, which orders the dilemmas that tie.
  const pools = new Map<string, Record<Pool, CandidateDilemma[]>>();
  const poolAt = (position: number): Record<Pool, CandidateDilemma[]> => {
    const categories = drawFrom(fixed[position] ?? null, rounds[position]!);
    const key = categoriesKey(categories ?? null);
    let pool = pools.get(key);
    if (!pool) {
      const candidates = input.candidates.get(key) ?? { inCatalog: [], inExploration: [] };
      const playable = (dilemmas: readonly CandidateDilemma[]) =>
        shuffle(
          dilemmas.filter(({ hasGap }) => playsTheGap || !hasGap),
          randomness,
        );
      pool = {
        inCatalog: playable(candidates.inCatalog),
        inExploration: playable(candidates.inExploration),
      };
      pools.set(key, pool);
    }
    return pool;
  };
  const draw = (position: number, from: Pool): void => {
    let best: { readonly dilemma: CandidateDilemma; readonly rank: readonly number[] } | undefined;
    for (const dilemma of poolAt(position)[from]) {
      if (used.has(dilemma.dilemmaId)) continue;
      const rank = [
        brokenSpacingRules(placed, position, dilemma, input.adultsOnly),
        input.playedBy.get(dilemma.dilemmaId) ?? 0,
      ];
      if (!best || isLower(rank, best.rank)) best = { dilemma, rank };
    }
    if (!best) return;
    used.add(best.dilemma.dilemmaId);
    placed[position] = best.dilemma;
    composed[position] = { dilemmaId: best.dilemma.dilemmaId, origin: 'random', chosenBy: null };
  };

  const toDraw = composed.flatMap((dilemma, position) => (dilemma ? [] : [position]));
  if (input.newDilemmas) {
    const reserved = explorationSlotsFor(toDraw.length, input.explorationSlots);
    for (const position of shuffle(toDraw, randomness).slice(0, reserved)) {
      draw(position, 'inExploration');
    }
  }
  // The rounds with fewest candidates first, so a round of a narrow category is not left without
  // the only dilemma it could play because a wider round took it; in their order if they tie.
  const fewestFirst = (from: Pool): number[] =>
    [...toDraw].sort((one, other) => poolAt(one)[from].length - poolAt(other)[from].length);
  for (const position of fewestFirst('inCatalog')) {
    if (!composed[position]) draw(position, 'inCatalog');
  }
  if (input.newDilemmas) {
    for (const position of fewestFirst('inExploration')) {
      if (!composed[position]) draw(position, 'inExploration');
    }
  }
  return composed.filter((dilemma): dilemma is ComposedDilemma => dilemma !== null);
}

type Pool = 'inCatalog' | 'inExploration';

interface FixedDilemma {
  readonly dilemmaId: string;
  readonly dilemma: LobbyDilemma;
  readonly origin: 'specific' | 'players';
  readonly chosenBy: string | null;
}

/**
 * The dilemma a round plays without drawing it: the specific one, or the one a player chose; none
 * for a dilemma with the gap in a room without the players it needs.
 */
function fixedDilemmaOf(
  round: RoundSnapshot,
  chosenDilemmas: readonly ChosenDilemma[],
  playsTheGap: boolean,
): FixedDilemma | null {
  const found: FixedDilemma | null =
    round.origin === 'specific'
      ? {
          dilemmaId: round.dilemma.dilemmaId,
          dilemma: round.dilemma,
          origin: 'specific',
          chosenBy: null,
        }
      : round.origin === 'players'
        ? chosenFor(round.id, chosenDilemmas)
        : null;
  return found && (playsTheGap || !found.dilemma.hasGap) ? found : null;
}

function chosenFor(roundId: number, chosenDilemmas: readonly ChosenDilemma[]): FixedDilemma | null {
  const chosen = chosenDilemmas.find((dilemma) => dilemma.roundId === roundId);
  if (!chosen) return null;
  const { dilemmaId, type, scale, minimumAge, hasGap, compromising, playerId } = chosen;
  return {
    dilemmaId,
    dilemma: { dilemmaId, type, scale, minimumAge, hasGap, compromising },
    origin: 'players',
    chosenBy: playerId,
  };
}

/**
 * The categories the system draws the dilemma of the round from: its own for a random round, and
 * every category for any other round without a fixed dilemma; undefined if it is not drawn.
 */
function drawFrom(
  fixed: FixedDilemma | null,
  round: RoundSnapshot,
): readonly Category[] | null | undefined {
  if (fixed) return undefined;
  return round.origin === 'random' ? round.categories : null;
}

/**
 * How many spacing rules the dilemma breaks in that position with the rounds already placed: two
 * game theory or two would-you-rather dilemmas in a row, two extreme ones within five rounds and, in
 * an adults-only room, five rounds in a row without one for adults.
 */
function brokenSpacingRules(
  placed: readonly (CandidateDilemma | null)[],
  position: number,
  dilemma: CandidateDilemma,
  adultsOnly: boolean,
): number {
  let broken = 0;
  for (const neighbour of [placed[position - 1], placed[position + 1]]) {
    if (!neighbour) continue;
    if (dilemma.type !== 'standard' && neighbour.type === dilemma.type) broken += 1;
  }
  if (dilemma.scale === 'extreme') {
    for (let distance = 1; distance < SPACING_ROUNDS; distance += 1) {
      for (const other of [placed[position - distance], placed[position + distance]]) {
        if (other?.scale === 'extreme') broken += 1;
      }
    }
  }
  if (adultsOnly && dilemma.minimumAge < 18) {
    const last = placed.length - SPACING_ROUNDS;
    for (
      let start = Math.max(0, position - SPACING_ROUNDS + 1);
      start <= Math.min(position, last);
      start += 1
    ) {
      const others = placed
        .slice(start, start + SPACING_ROUNDS)
        .filter((_, index) => start + index !== position);
      if (others.every((other) => other !== null && other.minimumAge < 18)) broken += 1;
    }
  }
  return broken;
}

/** Whether one rank comes before the other, comparing them number by number. */
function isLower(one: readonly number[], other: readonly number[]): boolean {
  for (const [index, value] of one.entries()) {
    if (value !== other[index]) return value < (other[index] as number);
  }
  return false;
}

function explorationSlotsFor(randomRounds: number, table: ExplorationSlots): number {
  const rows = table.filter(({ fromRandomRounds }) => fromRandomRounds <= randomRounds);
  return rows.reduce(
    (found, row) => (row.fromRandomRounds > found.fromRandomRounds ? row : found),
    { fromRandomRounds: 0, slots: 0 },
  ).slots;
}
