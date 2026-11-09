/** How the summary names the players the predictions missed: up to three by name, then a count. */
export type Missed =
  | { readonly key: 'none' }
  | { readonly key: 'one'; readonly name: string }
  | { readonly key: 'some'; readonly names: readonly string[] }
  | { readonly key: 'many'; readonly names: readonly string[]; readonly more: number };

const NAMED = 3;

export function missedOf(names: readonly string[]): Missed {
  const [first] = names;
  if (first === undefined) return { key: 'none' };
  if (names.length === 1) return { key: 'one', name: first };
  if (names.length <= NAMED) return { key: 'some', names };
  return { key: 'many', names: names.slice(0, 2), more: names.length - 2 };
}
