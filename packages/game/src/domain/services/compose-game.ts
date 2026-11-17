import type { ChosenDilemma } from '../entities/room.ts';
import type { Randomness } from '../ports/randomness.port.ts';
import type { Category } from '../vos/category.vo.ts';
import type { DilemmaOrigin, RoundSnapshot } from '../vos/round.vo.ts';
import { shuffle } from './random-choice.ts';

export type { DilemmaOrigin } from '../vos/round.vo.ts';

export interface ComposedDilemma {
  readonly dilemmaId: string;
  /** A round of the players nobody chose a dilemma for is random. */
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
  readonly inCatalog: readonly string[];
  readonly inExploration: readonly string[];
}

export interface ComposeGameInput {
  readonly rounds: readonly RoundSnapshot[];
  readonly chosenDilemmas: readonly ChosenDilemma[];
  readonly newDilemmas: boolean;
  /** The candidates of each set of categories the random rounds draw from, by `categoriesKey`. */
  readonly candidates: ReadonlyMap<string, Candidates>;
  readonly explorationSlots: ExplorationSlots;
}

/** The same key for the same categories in any order; every category, for null. */
export function categoriesKey(categories: readonly Category[] | null): string {
  return categories === null ? '*' : [...new Set(categories)].sort().join(',');
}

/**
 * The categories each round the system draws a dilemma for takes it from, each set once: a random
 * round's own, and every category for a round of the players nobody chose a dilemma for.
 */
export function categoriesToDraw(
  rounds: readonly RoundSnapshot[],
  chosenDilemmas: readonly ChosenDilemma[],
): (readonly Category[] | null)[] {
  const drawn = new Map<string, readonly Category[] | null>();
  for (const categories of rounds.flatMap((round) => drawFrom(round, chosenDilemmas))) {
    drawn.set(categoriesKey(categories), categories);
  }
  return [...drawn.values()];
}

/**
 * Puts the dilemmas of a game together, one per round and in their order. A specific round plays
 * its dilemma, and a round of the players the one a player chose. For the others the system draws
 * from their categories at random: if the room includes new dilemmas, the exploration slots go to
 * random rounds at random, then the rest come from the catalog and, when it runs short, from
 * exploration. A dilemma is never in two rounds, and a round nothing is left for is not played.
 */
export function composeGame(input: ComposeGameInput, randomness: Randomness): ComposedDilemma[] {
  const composed: (ComposedDilemma | null)[] = input.rounds.map((round) => {
    if (round.origin === 'specific') {
      return { dilemmaId: round.dilemma.dilemmaId, origin: 'specific', chosenBy: null };
    }
    const chosen = input.chosenDilemmas.find(({ roundId }) => roundId === round.id);
    return chosen
      ? { dilemmaId: chosen.dilemmaId, origin: 'players', chosenBy: chosen.playerId }
      : null;
  });
  const used = new Set(composed.flatMap((dilemma) => (dilemma ? [dilemma.dilemmaId] : [])));

  // Each pool is shuffled once, the first time a round needs it.
  const pools = new Map<string, { inCatalog: string[]; inExploration: string[] }>();
  const poolOf = (key: string): { inCatalog: string[]; inExploration: string[] } => {
    let pool = pools.get(key);
    if (!pool) {
      const candidates = input.candidates.get(key) ?? { inCatalog: [], inExploration: [] };
      pool = {
        inCatalog: shuffle(candidates.inCatalog, randomness),
        inExploration: shuffle(candidates.inExploration, randomness),
      };
      pools.set(key, pool);
    }
    return pool;
  };
  const draw = (position: number, from: 'inCatalog' | 'inExploration'): void => {
    const [categories] = drawFrom(input.rounds[position]!, input.chosenDilemmas);
    const dilemmaId = poolOf(categoriesKey(categories ?? null))[from].find((id) => !used.has(id));
    if (dilemmaId === undefined) return;
    used.add(dilemmaId);
    composed[position] = { dilemmaId, origin: 'random', chosenBy: null };
  };

  const toDraw = composed.flatMap((dilemma, position) => (dilemma ? [] : [position]));
  if (input.newDilemmas) {
    const reserved = explorationSlotsFor(toDraw.length, input.explorationSlots);
    for (const position of shuffle(toDraw, randomness).slice(0, reserved)) {
      draw(position, 'inExploration');
    }
  }
  for (const position of toDraw) if (!composed[position]) draw(position, 'inCatalog');
  if (input.newDilemmas) {
    for (const position of toDraw) if (!composed[position]) draw(position, 'inExploration');
  }
  return composed.filter((dilemma): dilemma is ComposedDilemma => dilemma !== null);
}

/** The categories the system draws the dilemma of the round from; none if it is not drawn. */
function drawFrom(
  round: RoundSnapshot,
  chosenDilemmas: readonly ChosenDilemma[],
): (readonly Category[] | null)[] {
  if (round.origin === 'random') return [round.categories];
  if (round.origin === 'players' && !chosenDilemmas.some(({ roundId }) => roundId === round.id)) {
    return [null];
  }
  return [];
}

function explorationSlotsFor(randomRounds: number, table: ExplorationSlots): number {
  const rows = table.filter(({ fromRandomRounds }) => fromRandomRounds <= randomRounds);
  return rows.reduce(
    (found, row) => (row.fromRandomRounds > found.fromRandomRounds ? row : found),
    { fromRandomRounds: 0, slots: 0 },
  ).slots;
}
