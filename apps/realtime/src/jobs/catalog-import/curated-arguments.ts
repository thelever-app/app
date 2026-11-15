import type { CuratedArguments } from '@thelever-app/dilemmas';

const CONTEXT = 'Contexto:';
const FOR = 'A favor:';
const AGAINST = 'En contra:';

/**
 * The arguments as the curation team writes them in the Catalog of dilemmas: an optional line
 * "Contexto: …", then each option by its text, followed by "A favor: …" and "En contra: …".
 * They come back in the order of `options`; any option missing, unknown or incomplete throws an
 * error that names it.
 */
export function parseArguments(text: string, options: readonly string[]): CuratedArguments {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let context: string | undefined;
  const argued = new Map<string, { for?: string; against?: string }>();
  let current: { for?: string; against?: string } | undefined;
  for (const line of lines) {
    if (line.startsWith(CONTEXT) && argued.size === 0) {
      context = line.slice(CONTEXT.length).trim();
    } else if (line.startsWith(FOR)) {
      if (!current) throw new Error(`"${line}" comes before any option`);
      current.for = line.slice(FOR.length).trim();
    } else if (line.startsWith(AGAINST)) {
      if (!current) throw new Error(`"${line}" comes before any option`);
      current.against = line.slice(AGAINST.length).trim();
    } else {
      if (!options.includes(line)) throw new Error(`"${line}" is not an option of the dilemma`);
      current = {};
      argued.set(line, current);
    }
  }

  return {
    ...(context && { context }),
    options: options.map((option) => {
      const found = argued.get(option);
      if (!found?.for || !found.against) {
        throw new Error(`the option "${option}" has no argument for it and against it`);
      }
      return { for: found.for, against: found.against };
    }),
  };
}
