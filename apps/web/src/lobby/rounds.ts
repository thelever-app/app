import {
  ContentRequirementDto,
  type LobbyRoundDto,
  type RoundContentDto,
} from '@thelever-app/protocol';
import { CATEGORIES, type Category } from './categories.ts';

/** The rounds of the lobby that follow one another as a single row: random ones of the same categories. */
export interface RoundRow {
  /** The number of its first round, from 1. */
  readonly from: number;
  /** The number of its last round; the same as `from` for a row of one round. */
  readonly to: number;
  readonly round: LobbyRoundDto;
  /** Of its random rounds, how many only play dilemmas for adults. */
  readonly adultsOnly: number;
  /** Of its random rounds, how many only play compromising dilemmas. */
  readonly compromising: number;
}

/** The same key for the same categories in any order; every category, for null. */
function categoriesKey(categories: readonly Category[] | null): string {
  return categories === null ? '*' : [...new Set(categories)].sort().join(',');
}

/**
 * The rounds in the order they play, with each run of random rounds of the same categories in one
 * row, whatever their content, counting those that ask for adults and those that ask for compromising.
 */
export function roundRows(rounds: readonly LobbyRoundDto[]): RoundRow[] {
  const rows: RoundRow[] = [];
  rounds.forEach((round, index) => {
    const content = round.origin === 'random' ? round.content : [];
    const counts = {
      adultsOnly: content.includes('adults-only') ? 1 : 0,
      compromising: content.includes('compromising') ? 1 : 0,
    };
    const last = rows.at(-1);
    if (
      last &&
      last.round.origin === 'random' &&
      round.origin === 'random' &&
      categoriesKey(last.round.categories) === categoriesKey(round.categories)
    ) {
      rows[rows.length - 1] = {
        ...last,
        to: index + 1,
        adultsOnly: last.adultsOnly + counts.adultsOnly,
        compromising: last.compromising + counts.compromising,
      };
      return;
    }
    rows.push({ from: index + 1, to: index + 1, round, ...counts });
  });
  return rows;
}

/** The dilemma in a round, specific or chosen by a player, if it has one. */
export function dilemmaOf(
  round: LobbyRoundDto,
): { readonly dilemmaId: string; readonly text: string } | null {
  return round.origin === 'random' ? null : round.dilemma;
}

/** The dilemmas already in the rounds, with the number of the round each one is in. */
export function roundNumbersByDilemma(
  dilemmaIds: readonly (string | null | undefined)[],
): ReadonlyMap<string, number> {
  return new Map(
    dilemmaIds.flatMap((dilemmaId, index) => (dilemmaId ? [[dilemmaId, index + 1] as const] : [])),
  );
}

/**
 * The requirements of the content of a random round once the host taps one: marked or unmarked, in
 * the order the room takes them. None marked is any content.
 */
export function toggledRequirement(
  content: RoundContentDto,
  requirement: ContentRequirementDto,
): RoundContentDto {
  const marked = content.includes(requirement)
    ? content.filter((known) => known !== requirement)
    : [...content, requirement];
  return ContentRequirementDto.options.filter((known) => marked.includes(known));
}

/**
 * The categories marked, in the order the screen offers them. None marked, or every one, is the
 * same: every category, null.
 */
export function toggledCategory(
  categories: readonly Category[] | null,
  category: Category,
): Category[] | null {
  const before = categories ?? [];
  const marked = before.includes(category)
    ? before.filter((marked) => marked !== category)
    : [...before, category];
  const ordered = CATEGORIES.filter((known) => marked.includes(known));
  return ordered.length === 0 || ordered.length === CATEGORIES.length ? null : ordered;
}
