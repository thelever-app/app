import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Html } from '../html.ts';

/** The rounded and filled symbols of the app, by the name the artboards give them. */
const SOURCES = {
  'add-circle': '@material-symbols/svg-500/rounded/add_circle-fill.svg',
  translate: '@material-symbols/svg-500/rounded/translate-fill.svg',
} as const;

export type IconName = keyof typeof SOURCES;

/**
 * Each symbol as markup to write inside the page: it takes the colour of its text, as the app's
 * icons do, and screen readers skip it, as the text next to it says what it means.
 */
const ICONS = new Map(
  Object.entries(SOURCES).map(([name, specifier]) => [
    name,
    readFileSync(fileURLToPath(import.meta.resolve(specifier)), 'utf8')
      .trim()
      .replace(/ width="48" height="48"/, '')
      .replace(
        '<svg ',
        '<svg class="icon" aria-hidden="true" focusable="false" fill="currentColor" ',
      ),
  ]),
);

export function icon(name: IconName): Html {
  return new Html(ICONS.get(name)!);
}
